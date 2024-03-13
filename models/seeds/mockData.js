const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");
const user = requrire('../user');
if(process.env.NODE_ENV !== 'production'){require('dotenv').config()}

// DB connection
mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
const db = mongoose.connection

const hashedPwd = bcrypt.hash('abcd1234', bcrypt.genSaltSync(11)); // init加密密碼
const userMockData = [
  {email:'test1@test.com', password:hashedPwd},
  {email:'test2@test.com', password:hashedPwd},
  {email:'test3@test.com', password:hashedPwd},
]

const articleMockData = [
  {},
]

db.once('open', () => {
  try {
    // 清除 user data
    user.deleteMany({}, (err) => {
      if (err) {
        console.error('clear data faild：', err);
      } else {
        console.log('clear data success');
      }
    });
    // 建立 user data
    for(let i=0; i < userMockData.length; i++) {
      user.create({
        email,
        password,
        name: email.split("@")[0],
        avatar: "",
        userRole: 0,
        createdAt: new Date(),
        status: 0,
      });
    }
    console.log('✅user data initial success!');
  } catch (error) {
    console.l0g('❌user initial faild！Error message:', error);
  }
  


})