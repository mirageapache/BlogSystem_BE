const moment = require("moment-timezone");
const Comment = require("../models/comment");
const Post = require("../models/post");
const Article = require("../models/article");
const { isValidId, USER_PUBLIC_FIELDS } = require("../middleware/commonUtils");

const commentController = {
  /** 取得貼文留言 */
  getComment: async (req, res) => {
    const { id } = req.body;
    if (!isValidId(id))
      return res.status(404).json({ code: "NO_COMMENT", message: "沒有留言" });
    try {
      const comments = await Post.findOne({ _id: id })
        .populate({
          path: "comments",
          select: "_id author replyTo content createdAt",
          populate: [
            // 用巢狀的方式再嵌套User的資料
            { path: "author", select: USER_PUBLIC_FIELDS },
            { path: "replyTo", select: USER_PUBLIC_FIELDS },
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
    if (route !== "post" && route !== "article")
      return res.status(400).json({ code: "INVALID_PARAM", message: "route 參數錯誤" });
    if (!isValidId(id))
      return res.status(404).json({ code: "NOT_FOUND", message: "留言對象不存在" });

    try {
      // 先確認留言對象存在，避免建立 orphan 留言
      const Model = route === "post" ? Post : Article;
      const target = await Model.findById(id).select("_id").lean();
      if (!target)
        return res.status(404).json({ code: "NOT_FOUND", message: "留言對象不存在" });

      // 在DB建立留言資料
      const comment = await Comment.create({
        author: req.user.userId,
        content,
        createdAt: moment.tz(new Date(), "Asia/Taipei").toDate(),
      });

      // 以 atomic operator 將新留言id加入 post/article 的 comments 陣列
      const newCommentArr = await Model.findByIdAndUpdate(
        id,
        { $push: { comments: comment._id } },
        { new: true }
      );

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
    if (!isValidId(req.params.id))
      return res.status(404).json({ code: "NOT_FOUND", message: "留言不存在" });
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
      if (!isValidId(commentId))
        return res.status(404).json({ code: "NOT_FOUND", message: "留言不存在" });

      const existing = await Comment.findById(commentId).select("author").lean();
      if (!existing)
        return res.status(404).json({ code: "NOT_FOUND", message: "留言不存在" });
      if (existing.author.toString() !== req.user.userId)
        return res.status(403).json({ code: "FORBIDDEN", message: "無權限刪除此留言" });

      await Comment.findByIdAndDelete(commentId);

      // 清除 Post/Article comments 陣列中對此留言的引用，避免 dangling reference
      await Promise.all([
        Post.updateMany(
          { comments: commentId },
          { $pull: { comments: commentId } }
        ),
        Article.updateMany(
          { comments: commentId },
          { $pull: { comments: commentId } }
        ),
      ]);

      return res.status(200).json({ code: "DELETE_SUCCESS", message: "刪除成功" });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
};

module.exports = commentController;
