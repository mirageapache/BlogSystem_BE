const mongoose = require('mongoose');
const { v4:uuidv4 } = require('uuid');
const Schema = mongoose.Schema;

/** 使用者設定 User Setting Schema */
export const UserSettingSchema = new Schema({
  /** 使用者id */
  user:{
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
  },
  /** 語言 */
  language:{
    type: String,
  },
  /** 深色模式 */
  theme:{
    type: Number,
    default: 0,
  },
  /** 標籤 */
  tags:{
    type: [String],
    defaulte: [],
  }
});