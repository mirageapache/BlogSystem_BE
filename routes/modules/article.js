const express = require('express');
const router = express.Router();
const articleController = require('../../controllers/articleController');
const { uploadFile } = require("../../middleware/fileUtils");
const { authorization } = require('../../middleware/auth');

/** 取得所有文章 */
router.get('/', articleController.getAllArticle);

/** (動態)取得文章 */
router.post('/partial', articleController.getPartialArticle);

/** 取得搜尋文章 */
router.post('/search', articleController.getSearchArticleList);

/** 取得特定文章 */
router.post('/detail', articleController.getArticleDetail);

/** 新增文章 */
router.post('/create/:id', authorization, uploadFile.single("articleImage"), articleController.createArticle);

/** 更新文章 */
router.patch('/update/:id', authorization, uploadFile.single("articleImage"), articleController.updateArticle);

/** 刪除文章 */
router.delete('/delete/:id', authorization, articleController.deleteArticle);

/** 喜歡/取消喜歡文章 */
router.patch('/toggleLikeAction/:id', authorization, articleController.toggleLikeArticle);

/** 收藏/取消收藏文章 */
// router.patch('/toggleStoreAction/:id', authorization, articleController.toggleStorePost);


module.exports = router;
