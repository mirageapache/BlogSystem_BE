const express = require('express');
const router = express.Router();
const postController = require('../../controllers/postController');
const { uploadFile } = require("../../middleware/fileUtils");
const { authorization } = require('../../middleware/auth');

/** 取得所有貼文 */
router.get('/all', postController.getAllPostList);

/** 取得搜尋貼文 */
router.post('/search', postController.getSearchPostList);

/** 取得貼文詳細資料 */
router.post('/detail', postController.getPostDetail);

/** 新增貼文 */
router.post('/create/:id', authorization, uploadFile.single("postImage"), postController.createPost);

/** 更新貼文 */
router.patch('/update/:id', authorization, uploadFile.single("postImage"), postController.updatePost);

/** 刪除貼文 */
router.delete('/delete/:id', authorization, postController.deletePost);

/** 喜歡/取消喜歡貼文 */
router.patch('/toggleLikeAction/:id', authorization, postController.toggleLikePost);

/** 收藏/取消收藏貼文 */
router.patch('/toggleStoreAction/:id', authorization, postController.toggleStorePost);

module.exports = router;
