/**
 * 一次性資料遷移：將既有草稿(status:0)文章改為公開(status:1)。
 *
 * 背景：status 功能上線後，公開列表/搜尋只回傳 status 1/2。既有文章因舊邏輯
 *      一律寫死 status:0，過濾後會從公開列表消失；本腳本把它們改為公開以維持顯示。
 *
 * 執行：node scripts/migrateArticleStatus.js
 * ponytail: 一次性腳本，只改 status:0 → 1，具冪等性，重跑無副作用；可保留備查。
 */
const mongoose = require("mongoose");
require("dotenv").config();
const Article = require("../models/article");

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error("❌ 缺少 MONGODB_URI（請確認 .env）");
    process.exit(1);
  }

  mongoose.set("strictQuery", false);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ MongoDB connected");

  try {
    const before = await Article.countDocuments({ status: 0 });
    console.log(`📋 待遷移（status:0）文章數：${before}`);

    const result = await Article.updateMany(
      { status: 0 },
      { $set: { status: 1 } }
    );
    console.log(
      `✅ 已更新：matched=${result.matchedCount}, modified=${result.modifiedCount}`
    );

    const after = await Article.countDocuments({ status: 0 });
    console.log(`🔎 遷移後仍為 status:0 的文章數：${after}`);
  } catch (err) {
    console.error("❌ 遷移失敗：", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("👋 連線已關閉");
  }
})();
