const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { v4:uuidv4 } = require('uuid');
const User = require('user');

/** 文章留言 Comment Schema */
const CommentSchema = new Schema({
  /** 留言使用者 */
  author:{
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
    required: true,
  },
  /** 留言內容 */
  content:{
    type: String,
    required: true,
  },
  /** 留言日期 */
  createdAt:{
    type: Date,
    default: Date.now,
  }
});

/** 文章 Article Schema */
const ArticleSchema = new Schema({
  /** 文章id[*] */
  _id:{
    type: String,
    default: uuidv4,
  },
  /** 文章作者 */
  author:{
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
    required: true,
  },
  /** 文章標題 */
  title:{
    Type: String,
    requried: true,
  },
  /** 文章內容 */
  content:{
    Type: String,
    required: true,
  },
  /** 建立日期時間 */
  createdAt:{
    Type: Date,
    default: Date.now,
  },
  /** 讀者喜歡數 */
  likeAmount:{
    Type: Number,
    default: 0,
  },
  /** 喜歡的讀者id */
  likedByUsers: [User],
  /** 留言數 */
  commentAmount:{
    Type: Number,
    default: 0,
  },
  /** 留言串 */
  comments: [CommentSchema],

});

module.exports = mongoose.model('Article', ArticleSchema);