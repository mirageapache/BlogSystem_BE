const express = require('express');
const router = express.Router();
const articleController = require('../../controllers/articleController');
const { uploadFile } = require("../../middleware/fileUtils");
const { authorization } = require('../../middleware/auth');

/** 取得所有文章 */
router.get('/', articleController.getAllArticle);

/** 取得特定文章 */
router.post('/:id', articleController.getArticleDetail);

/** 新增文章 */
router.post('/create', authorization, uploadFile.single("articleImage"), articleController.createArticle);

/** 更新文章 */
router.patch('/:id', authorization, uploadFile.single("articleImage"), articleController.updateArticle);

/** 刪除文章 */
router.delete('/:id', authorization, articleController.deleteArticle);

/** 喜歡/取消喜歡文章 */
router.patch('/toggleLikeAction/:id', authorization, articleController.toggleLikeArticle);

/** 收藏/取消收藏文章 */
// router.patch('/toggleStoreAction/:id', authorization, articleController.toggleStorePost);


module.exports = router;
