const mongoose = require("mongoose");
// const { v4:uuidv4 } = require('uuid');
const Schema = mongoose.Schema;

/** 使用者 User Schema */
const UserSchema = new Schema({
  /** Email */
  email: {
    type: String,
    required: true,
  },
  /** 密碼 */
  password: {
    type: String,
    required: true,
  },
  /** 帳號() */
  account: {
    type: String,
    required: true,
  },
  /** 名稱(暱稱) */
  name: {
    type: String,
    required: true,
  },
  /** 大頭照 */
  avatar: {
    type: String,
    default: "",
  },
  /** 使用者身份 [0-一般 / 1-進階 / 2-系統管理員] */
  userRole: {
    type: Number,
    default: 0,
  },
  /** 註冊日期 */
  createdAt: {
    type: Date,
    default: Date.now,
  },
  /** 帳號狀態 [0-未驗證 / 1-正常 / 2-黑名單 / 3-停用] */
  status: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("User", UserSchema);
