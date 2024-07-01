const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/** 文章留言 Comment Schema */
const CommentSchema = new Schema({
  /** 留言使用者 */
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  /** 回覆給 */
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  /** 留言內容 */
  content: {
    type: String,
    required: true,
    maxlength: 500,
  },
  /** 留言日期 */
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Comment", CommentSchema);
