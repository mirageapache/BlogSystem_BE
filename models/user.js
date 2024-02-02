const mongoose = require('mongoose');
const { v4:uuidv4 } = require('uuid');
const Schema = mongoose.Schema;

/** 文章留言 Comment Schema */
const UserSchema = new Schema({
  /** 使用者id */
  _id:{
    type: String,
    default: uuidv4,
  },
  /** 帳號 */
  account:{
    type: String,
    required: true,
  },
  /** 密碼 */
  password:{
    type: String,
    required: true,
  },
  /** 名稱(暱稱) */
  name:{
    type: String,
    required: true,
  },
  /** e-mail */
  email:{
    type: String,
    required: true,
  },
  /** 大頭照 */
  avatar:{
    type: String,
    default: '',
  },
  /** 
   * 使用者身份
   * 0-一般 / 1-進階 / 2-系統管理員
   */
  userRole:{
    type: String,
    default: '0',
  },
  /** 註冊日期 */
  createdAt:{
    type: Date,
    default: Date.now,
  },
  /** 
   * 帳號狀態
   * 0-未驗證 / 1-正常 / 2-禁止 / 3-停用
   */
  status:{
    type: String,
    default: '0'
  },
});


module.exports = mongoose.model('User', UserSchema);