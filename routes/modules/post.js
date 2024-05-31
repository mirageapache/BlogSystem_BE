const express = require('express');
const router = express.Router();
const postController = require('../../controllers/postController');

/** 取得所有貼文 */
router.get('/all', postController.getAllPost);

/** 取得特定貼文 */
router.post('/detail', postController.getPostDetail);

/** 新增貼文 */
router.post('/create', postController.createPost);

/** 更新貼文 */
router.patch('/update', postController.updatePost);

/** 刪除貼文 */
router.delete('/delete', postController.deletePost);

module.exports = router;
