
const crypto = require("crypto");

/**
 * 驗證 AI Auth (header x-api-key)
 * n8n 執行時應帶入 header x-api-key，若不符合則回傳 401
 */
const aiAuth = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  const aiBotApiKey = process.env.AI_BOT_API_KEY;

  // 檢查request是否帶 API Key
  if (!apiKey) {
    return res.status(401).json({ code: "AI_UN_AUTH", message: "未提供 AI Auth 驗證資訊" });
  }

  // 檢查伺服器端是否設定 AI Bot API Key
  if (!aiBotApiKey) {
    return res.status(503).json({ code: "SYSTEM_ERR", message: "AI Auth 配置未設定" });
  }

  const a = Buffer.from(apiKey);
  const b = Buffer.from(aiBotApiKey);

  // 使用 timingSafeEqual 進行安全的比對，防止時序攻擊
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ code: "AI_UN_AUTH", message: "AI Auth 驗證失敗" });
  }

  // 驗證成功，繼續處理請求
  req.user = { userId: process.env.AI_BOT_USER_ID };
  next();
}

module.exports = { aiAuth };