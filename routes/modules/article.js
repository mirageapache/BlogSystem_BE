const express = require('express');
const router = express.Router();
const articleController = require('../../controllers/articleController');


/** 取得所有文章 */
router.get('/', articleController.getAllArticle);

/** 取得特定文章 */
router.get('/:id', articleController.getArticleDetail);

/** 新增文章 */
router.post('/create', articleController.createArticle);

/** 更新文章 */
router.patch('/:id', articleController.updateArticle);

/** 刪除文章 */
router.delete('/:id', articleController.deleteArticle);

module.exports = router;
