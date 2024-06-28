const express = require('express');
const router = express.Router();
const postController = require('../../controllers/postController');
const { uploadFile } = require("../../middleware/fileUtils");
const { authorization } = require('../../middleware/auth');

/** 取得所有貼文 */
router.get('/all', postController.getAllPost);

/** 取得特定貼文 */
router.post('/detail', postController.getPostDetail);

/** 新增貼文 */
router.post('/create/:id', authorization, uploadFile.single("postImage"), postController.createPost);

/** 更新貼文 */
router.patch('/update', authorization, uploadFile.single("postImage"), postController.updatePost);

/** 刪除貼文 */
router.delete('/delete', authorization, postController.deletePost);

/** 喜歡/取消喜歡貼文 */
router.patch('/like', postController.handleLikePost);

module.exports = router;
