const moment = require("moment-timezone");
const Comment = require("../models/comment");
const Post = require("../models/post");
const Article = require("../models/article");

const commentController = {
  /** 取得所有留言(測試用) */
  getAllComments: async (req, res) => {
    try {
      const comments = await Comment.find().lean();
      return res.status(200).json(comments);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 取得貼文留言 */
  getComment: async (req, res) => {
    const { id } = req.body;
    try {
      const comments = await Post.findOne({ _id: id })
        .populate({
          path: "comments",
          select: "_id author replyto content createdAt",
          populate: [
            // 用巢狀的方式再嵌套User的資料
            { path: "author", select: "_id account name avatar bgColor" },
            { path: "replyTo", select: "_id account name avatar bgColor" },
          ],
        })
        .lean()
        .exec();
      if (!comments) return res.status(404).json({ code: "NO_COMMENT", message: "沒有留言" });

      return res.status(200).json(comments);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 新增留言 */
  createComment: async (req, res) => {
    const { id, content, route } = req.body;
    try {
      // 在DB建立留言資料
      const comment = await Comment.create({
        author: req.user.userId,
        content,
        createdAt: moment.tz(new Date(), "Asia/Taipei").toDate(),
      });

      // 將新建留言的id更新到 post/article -> comment陣列
      let newCommentArr;
      if (route === "post") {
        const postData = await Post.findOne({ _id: id })
          .select("comments")
          .lean(); // 取得post原本的comment
        const originCommentArr = postData.comments;
        originCommentArr.push(comment._id);

        newCommentArr = await Post.findByIdAndUpdate(
          id,
          { comments: originCommentArr },
          { new: true }
        );
      } else if (route === "article") {
        const articleData = await Article.findOne({ _id: id })
          .select("comments")
          .lean(); // 取得article原本的comment
        const originCommentArr = articleData.comments;
        originCommentArr.push(comment._id);

        newCommentArr = await Article.findByIdAndUpdate(
          id,
          { comments: originCommentArr },
          { new: true }
        );
      }
      return res.status(200).json(newCommentArr);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 更新留言 */
  editComment: async (req, res) => {
    const { content } = req.body;
    try {
      const existing = await Comment.findById(req.params.id).select("author").lean();
      if (!existing)
        return res.status(404).json({ code: "NOT_FOUND", message: "留言不存在" });
      if (existing.author.toString() !== req.user.userId)
        return res.status(403).json({ code: "FORBIDDEN", message: "無權限編輯此留言" });

      const updatedComment = await Comment.findByIdAndUpdate(
        req.params.id,
        { content },
        { new: true }
      );
      return res.status(200).json(updatedComment);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 刪除留言 */
  deleteComment: async (req, res) => {
    try {
      const commentId = req.params.id;
      const existing = await Comment.findById(commentId).select("author").lean();
      if (!existing)
        return res.status(404).json({ code: "NOT_FOUND", message: "留言不存在" });
      if (existing.author.toString() !== req.user.userId)
        return res.status(403).json({ code: "FORBIDDEN", message: "無權限刪除此留言" });

      await Comment.findByIdAndDelete(commentId);
      return res.status(200).json({ code: "DELETE_SUCCESS", message: "刪除成功" });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
};

module.exports = commentController;
