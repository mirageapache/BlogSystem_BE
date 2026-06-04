const express = require("express");
const router = express.Router();
const commentController = require("../../controllers/commentController");
const { authorization, requireMember } = require("../../middleware/auth");

/** 取得貼文留言 */
router.post("/", commentController.getComment);

/** 新增留言 */
router.post(
  "/create",
  authorization,
  requireMember,
  commentController.createComment
);

/** 更新留言 */
router.patch(
  "/update/:id",
  authorization,
  requireMember,
  commentController.editComment
);

/** 刪除留言 */
router.delete(
  "/delete/:id",
  authorization,
  requireMember,
  commentController.deleteComment
);

module.exports = router;
