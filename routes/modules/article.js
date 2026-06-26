const express = require("express");
const router = express.Router();
const articleController = require("../../controllers/articleController");
const { uploadMulter } = require("../../middleware/fileUtils");
const { authorization, requireMember, optionalAuth } = require("../../middleware/auth");

/** (動態)取得文章 */
router.post("/partial", articleController.getPartialArticle);

/** 取得搜尋文章 */
router.post("/search", articleController.getSearchArticleList);

/** 取得「我的文章」清單（含草稿/下架，僅作者本人） */
router.post(
  "/myList",
  authorization,
  requireMember,
  articleController.getMyArticles
);

/** 取得特定文章（optionalAuth：草稿/下架僅作者本人可讀） */
router.post("/detail", optionalAuth, articleController.getArticleDetail);

/** 新增文章 */
router.post(
  "/create",
  authorization,
  requireMember,
  uploadMulter,
  articleController.createArticle
);

/** 更新文章 */
router.patch(
  "/update",
  authorization,
  requireMember,
  uploadMulter,
  articleController.updateArticle
);

/** 刪除文章 */
router.delete(
  "/delete",
  authorization,
  requireMember,
  articleController.deleteArticle
);

/** 喜歡/取消喜歡文章 */
router.patch(
  "/toggleLikeAction",
  authorization,
  requireMember,
  articleController.toggleLikeArticle
);

module.exports = router;
