const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// const { v4: uuidv4 } = require("uuid");
const User = require("./user");
const Comment = require("./comment");

/** 文章 Article Schema */
const ArticleSchema = new Schema({
  /** 作者 */
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
    required: true,
  },
  /** 標題 */
  title: {
    type: String,
    requried: true,
  },
  /** 內容 */
  content: {
    type: String,
    required: true,
  },
  /** 狀態
   * [0-未發佈(未儲存) / 1-已儲存(草稿) / 2-發佈(公開) / 3-發佈(限閱) / 4-下架]
   * 註：公開-所有使用者均可閱讀；限閱-進階使用者可完整閱讀，一般使用者僅可閱讀部分內容
   */
  status: {
    type: Number,
    default: 0,
  },
  /** 主題類型 */
  subject: {
    type: String,
  },
  /** 分類標籤 */
  tags: {
    type: [String],
  },
  /** 建立日期時間 */
  createdAt: {
    type: Date,
    default: Date.now,
  },
  /** 喜歡的讀者id */
  likedByUsers: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: User,
  },
  /** 留言串 */
  comments: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: Comment,
  },
});

module.exports = mongoose.model("articles", ArticleSchema);
