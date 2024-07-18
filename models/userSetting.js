const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/** 使用者設定 User Setting Schema */
const UserSettingSchema = new Schema({
  /** 使用者id */
  user: {
    type: mongoose.Schema.Types.ObjectId,
    select: false,
    ref: "User",
  },
  /** 語言 */
  language: {
    type: String,
  },
  /** 深色模式 [0-明亮 / 1-深色]*/
  theme: {
    type: Number,
    default: 0,
  },
  /**
   * 標籤 - 使用者自訂義的文章分類標籤
   * (該欄位暫時保留，目前僅使用article的"hashTag")
   */
  tags: {
    type: [String],
    select: false,
    defaulte: [],
  },
  /** email通知推播 */
  emailPrompt: {
    type: Boolean,
    default: true,
  },
  /** 手機通知推播(app) */
  mobilePrompt: {
    type: Boolean,
    default: true,
  },
  /** 文章收藏列表 */
  articleCollect: {
    type: [String],
    default: [],
  },
  /** 貼文收藏列表 */
  postCollect: {
    type: [String],
    default: [],
  }
});

module.exports = mongoose.model("UserSetting", UserSettingSchema);
