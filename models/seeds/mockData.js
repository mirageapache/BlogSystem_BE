const mongoose = require("mongoose");
if (process.env.NODE_ENV !== "production") require("dotenv").config();
const moment = require("moment-timezone");

// --- Models ---
const User = require("../user");
const Follow = require("../follow");
const UserSetting = require("../userSetting");
const Article = require("../article");

// --- MockDatas ---
const { userMockData } = require("./userMockData");
const { articleMockData } = require("./articleMockData");

// --- functions ---
const { getRandomColor } = require("../../middleware/commonUtils");

async function initDatabase() {
  // DB connection
  mongoose.set("strictQuery", false);
  mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection;
  let userIdArray = [];

  try {
    // const articleMockData = [{}];
    db.once("open", async () => {
      try {
        // 清除 user data
        await User.deleteMany({});
        await Follow.deleteMany({});
        await UserSetting.deleteMany({});
        console.log("✅ clear user data success...");
        // 建立 user data
        for (let i = 0; i < userMockData.length; i++) {
          const username = userMockData[i].email.split("@")[0];
          const newUser = await User.create({
            email: userMockData[i].email,
            password: userMockData[i].password,
            account: username,
            name: username,
            avatar: "",
            bgColor: getRandomColor(),
            bio: `Hi, I'm ${username}`,
            userRole: 0,
            createdAt: moment.tz(new Date(), "Asia/Taipei").toDate(),
            status: 0,
          });
          userIdArray.push(newUser._id);
          // 初始化User追蹤資料
          await Follow.create({
            user: newUser._id,
            following: [],
            follower: [],
          });
          // 初始化User設定
          await UserSetting.create({
            user: newUser._id,
            language: "zh",
            theme: 0,
            emailPrompt: true,
            mobilePrompt: false,
          });
        }
        console.log("✅ user data initial success...");

        // 清除 aritcle data
        await Article.deleteMany({});
        console.log("✅ clear article data success...");
        // 建立 aritcle data
        for (let i = 0; i < articleMockData.length; i++) {
          await Article.create({
            author: userIdArray[i % 3],
            title: articleMockData[i].title,
            content: articleMockData[i].content,
            status: 0,
            subject: articleMockData[i].subject,
            tags: ["測試"],
            createdAt: moment.tz(new Date(), "Asia/Taipei").toDate(),
            likedByUsers: [],
            comments: [],
          });
        }
        console.log("✅ article data initial success...");

        process.exit(); // 結束執行
      } catch (error) {
        console.log("❌ initial failed! Error message:", error);
      }
    });
  } catch (error) {
    console.log("DB connection failed! Error message:", error);
  }
}

initDatabase();
