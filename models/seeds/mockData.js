const mongoose = require("mongoose");

if (process.env.NODE_ENV !== "production") require("dotenv").config();
// --- Models ---
const User = require("../user");
const Article = require("../article");

// --- MockDatas ---
const { userMockData } = require("userMockData");
const { articleMockData } = require("articleMockData");

async function initDatabase() {
  // DB connection
  mongoose.set("strictQuery", false);
  mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection;

  try {
    // const articleMockData = [{}];
    db.once("open", async () => {
      try {
        // 清除 user data
        await User.deleteMany({});
        console.log("✅ clear user data success...");
        // 建立 user data
        for (let i = 0; i < userMockData.length; i++) {
          await User.create({
            email: userMockData[i].email,
            password: userMockData[i].password,
            name: userMockData[i].email.split("@")[0],
            avatar: "",
            userRole: 0,
            createdAt: new Date(),
            status: 0,
          });
        }
        console.log("✅ user data initial success...");
        
        // 清除 aritcle data
        await Article.deleteMany({});
        console.log("✅ clear article data success...");
        // 建立 aritcle data
        for (let i = 0; i < articleMockData.length; i++) {
          await Article.create({
            author: articleMockData[i].author,
            title: articleMockData[i].title,
            content: articleMockData[i].content,
            status: 0,
            subject: articleMockData[i].subject,
            tags: [],
            createdAt: new Date(),
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
