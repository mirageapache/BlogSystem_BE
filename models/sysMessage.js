const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const UserSchema = require('./user');

/** 系統通知訊息 System Message Schema */
export const SysMessageSchema = new Schema({
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
  messageStatus:{
    type: Number,
    default: 0,
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
