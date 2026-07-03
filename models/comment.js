const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/** 文章留言 Comment Schema */
const CommentSchema = new Schema({
  /** 留言使用者 */
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  /** 回覆給（被回覆者本人，供顯示「回覆給誰」） */
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  /** 母留言（回覆留言串結構；指向被回覆的那則留言） */
  parentComment: {
    type: Schema.Types.ObjectId,
    ref: "Comment",
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
