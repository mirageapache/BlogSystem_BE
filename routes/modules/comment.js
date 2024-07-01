const express = require("express");
const router = express.Router();
const commentController = require("../../controllers/commentController");

/** 取得所有留言 */
router.get("/", commentController.getComment);

/** 新增留言 */
router.post("/", commentController.createComment);

/** 更新留言 */
router.put("/:id", commentController.editComment);

/** 刪除留言 */
router.delete("/:id", commentController.deleteComment);

module.exports = router;
