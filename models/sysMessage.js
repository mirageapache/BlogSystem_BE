const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const UserSchema = require('./user');

/** 系統通知訊息 System Message Schema */
const SysMessageSchema = new Schema({
  /** 發送人 */
  sender:{
    type: mongoose.Schema.Types.ObjectId,
    ref: UserSchema,
    required: true,
  },
  /** 接收人 */
  receiver:{
    type: mongoose.Schema.Types.ObjectId,
    ref: UserSchema,
    required: true,
  },
  /** 訊息內容 */
  content:{
    type: String,
    required: true,
  },
  /** 訊息狀態 [0-未發送(未儲存) / 1-已儲存(草稿) / 2-已發送 / 3-刪除(在垃圾桶)] */
  status:{
    type: Number,
    default: 0,
  },
  /** 訊息類別 [0-重要 / 1-一般 / 2-使用者 / 3-備用] */
  category:{
    type: Number,
  },
  /** 發送日期 */
  createdAt:{
    type: Date,
    default: Date.now,
  },
  /** 讀取狀態 */
  readStatus:{
    type: Boolean,
    default: false,
  }
});

module.exports = mongoose.model("sysMessage", SysMessageSchema);