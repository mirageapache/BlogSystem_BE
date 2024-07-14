const moment = require("moment-timezone");
const Comment = require("../models/comment");
const Post = require("../models/post");

const commentController = {
  /** 取得所有貼文(測試用) */
  getAllComments: async (req, res) => {
    try {
      const comments = await Comment.find().lean();
      res.status(200).json(comments);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },
  /** 取得貼文留言 */
  getPostComment: async (req, res) => {
    const { postId } = req.body;
    try {
      const comments = await Post.findOne({ _id: postId })
        .populate({
          path: "comments",
          select: "_id author replyto content createdAt",
          populate: [ // 用巢狀的方式再嵌套User的資料
            { path: "author", select: "_id account name avatar bgColor" },
            { path: "replyTo", select: "_id account name avatar bgColor" },
          ],
        })
        .lean()
        .exec();
      if (!comments) return res.status(404).json({ message: "no comments" });

      res.status(200).json(comments);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  /** 新增留言 */
  createComment: async (req, res) => {
    const { postId, userId, content } = req.body;
    try {
      // 在DB建立留言資料
      const comment = await Comment.create({ 
        author: userId,
        content,
        createdAt: moment.tz(new Date(), "Asia/Taipei").toDate(),
      });

      const postData = await Post.findOne({ _id: postId }).select("comments").lean(); // 取得post原本的comment
      const originCommentArr = postData.comments;
      originCommentArr.push(comment._id); // 新增新的comment

      // 將新建留言的id更新到post -> comment陣列
      const newCommentArr = await Post.findByIdAndUpdate(
        postId,
        { comments: originCommentArr },
        { new: true }
      );

      res.status(200).json(newCommentArr);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },
  /** 更新留言 */
  editComment: async (req, res) => {
    const { content } = req.body;
    try {
      const updatedComment = await Comment.findByIdAndUpdate(
        req.params.id,
        { content },
        { new: true }
      );
      res.json(updatedComment);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  /** 刪除留言 */
  deleteComment: async (req, res) => {
    try {
      await Comment.findByIdAndDelete(req.body.postId);
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },
};

module.exports = commentController;
