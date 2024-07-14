const express = require("express");
const router = express.Router();
const commentController = require("../../controllers/commentController");
const { authorization } = require("../../middleware/auth");

/** 取得所有留言(測試用) */
router.get("/all", commentController.getAllComments);

/** 取得貼文留言 */
router.post("/", commentController.getPostComment);

/** 新增留言 */
router.post("/create/:id", authorization, commentController.createComment);

/** 更新留言 */
router.patch("/update/:id", authorization, commentController.editComment);

/** 刪除留言 */
router.delete("/delete/:id", authorization, commentController.deleteComment);

module.exports = router;
