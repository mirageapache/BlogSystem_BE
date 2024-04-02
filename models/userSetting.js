const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/** 使用者設定 User Setting Schema */
const UserSettingSchema = new Schema({
  /** 使用者id */
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
  },
  /** 語言 */
  language: {
    type: String,
  },
  /** 深色模式 */
  theme: {
    type: Number,
    default: 0,
  },
  /**
   * 標籤 - 使用者自訂義的文章分類標籤
   */
  tags: {
    type: [String],
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
});

module.exports = mongoose.model("UserSetting", UserSettingSchema);
