const express = require("express");
const router = express.Router();
const { aiAuth } = require('../../middleware/aiAuth');
const postController = require('../../controllers/postController');
const articleController = require('../../controllers/articleController');

/** AI 建立貼文 */
router.post("/post/create", aiAuth, postController.createPost);

/** AI 建立文章 */
router.post("/article/create", aiAuth, articleController.createArticle);

module.exports = router;