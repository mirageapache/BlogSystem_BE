const moment = require("moment-timezone");
const Comment = require("../models/comment");
const Post = require("../models/post");
const Article = require("../models/article");
const { isValidId, USER_PUBLIC_FIELDS } = require("../middleware/commonUtils");
const notificationService = require("../services/notificationService");

/** 公開可見的貼文/文章狀態：1-發佈(公開) / 2-發佈(限閱)。草稿(0)與下架(3)不可留言 */
const PUBLIC_STATUS = [1, 2];

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

  /** 新增留言（可選 parentCommentId 表示回覆某則留言） */
  createComment: async (req, res) => {
    const { id, content, route, parentCommentId } = req.body;
    if (route !== "post" && route !== "article")
      return res.status(400).json({ code: "INVALID_PARAM", message: "route 參數錯誤" });
    if (!isValidId(id))
      return res.status(404).json({ code: "NOT_FOUND", message: "留言對象不存在" });

    try {
      // 取作者＋狀態：草稿/下架不可留言（可見性），並用作者當通知收件者
      const Model = route === "post" ? Post : Article;
      const target = await Model.findById(id).select("_id author status").lean();
      if (!target || !PUBLIC_STATUS.includes(target.status))
        return res.status(404).json({ code: "NOT_FOUND", message: "留言對象不存在" });

      // 回覆關聯：client 只能傳 parentCommentId，收件者一律由 DB 推導(絕不信任 client 傳 userId)。
      // 用 exists() 確認該留言確實掛在這篇母文，避免把回覆掛到別篇的留言上。
      let parent = null;
      if (parentCommentId && isValidId(parentCommentId)) {
        const belongs = await Model.exists({ _id: id, comments: parentCommentId });
        if (belongs)
          parent = await Comment.findById(parentCommentId).select("author").lean();
      }

      // 在DB建立留言資料（回覆時寫入 parentComment 留言串 + replyTo 被回覆者本人）
      const comment = await Comment.create({
        author: req.user.userId,
        content,
        createdAt: moment.tz(new Date(), "Asia/Taipei").toDate(),
        ...(parent && { parentComment: parentCommentId, replyTo: parent.author }),
      });

      // 以 atomic operator 將新留言id加入 post/article 的 comments 陣列
      const newCommentArr = await Model.findByIdAndUpdate(
        id,
        { $push: { comments: comment._id } },
        { new: true }
      );

      // 通知：留言通知母文作者；若為回覆，另通知被回覆者。通知失敗不可讓留言主流程失敗。
      try {
        await notificationService.createNotification({
          recipient: target.author,
          sender: req.user.userId,
          type: route === "post" ? "comment_post" : "comment_article",
          entityType: route,
          entityId: target._id, // 導回母貼文/文章(留言無獨立頁)
          preview: (content || "").slice(0, 50),
        });
        if (parent) {
          await notificationService.createNotification({
            recipient: parent.author, // ← DB 推導，非 client 傳入
            sender: req.user.userId,
            type: "reply_comment",
            entityType: route,
            entityId: target._id,
            preview: (content || "").slice(0, 50),
          });
        }
      } catch (e) {
        console.error("[notification] comment hook failed:", e.message);
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
