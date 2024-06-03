const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/** 貼文 Post Schema */
const PostSchema = new Schema({
  /** 作者 */
  author: {
    type: String,
    required: true,
  },
  /** 標題 */
  title: {
    type: String,
    required: true,
  },
  /** 內容 */
  content: {
    type: String,
    required: true,
  },
  /** 圖片 */
  image: {
    type: String,
  },
  /** 狀態
   * [0-草稿(已儲存) / 1-發佈(公開) / 2-發佈(限閱) / 3-下架(隱藏)]
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
  hashTags: {
    type: [String],
  },
  /** 收藏數 */
  collectionCount: {
    type: Number,
    default: 0,
  },
  /** 分享數 */
  shareCount: {
    type: Number,
    default: 0,
  },
  /** 建立日期時間 */
  createdAt: {
    type: Date,
  },
  /** 修改日期時間 */
  editedAt: {
    type: Date,
  },
  /** 喜歡的讀者 */
  likedByUsers: {
    type: [String],
    default: [],
  },
  /** 留言串 */
  comments: {
    type: [String],
    default: [],
  }
})

module.exports = mongoose.model("Post", PostSchema);