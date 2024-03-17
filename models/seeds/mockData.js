const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../user");
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

async function initDatabase() {
  // DB connection
  mongoose.set("strictQuery", false);
  mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection;

  try {
    const hashedPwd = await bcrypt.hash("abcd1234", bcrypt.genSaltSync(11)); // init加密密碼
    const userMockData = [
      { email: "test1@test.com", password: hashedPwd },
      { email: "test2@test.com", password: hashedPwd },
      { email: "test3@test.com", password: hashedPwd },
    ];

    // const articleMockData = [{}];

    db.once("open", async () => {
      try {
        // 清除 user data
        await User.deleteMany({});
        console.log("clear data success");
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
        console.log("✅user data initial success!");
      } catch (error) {
        console.log("❌user initial failed! Error message:", error);
      }
    });
  } catch (error) {
    console.log("DB connection failed! Error message:", error);
  }
}

initDatabase(); // 呼叫異步函式初始化資料庫
