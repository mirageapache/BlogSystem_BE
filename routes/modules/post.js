const express = require("express");
const router = express.Router();
const postController = require("../../controllers/postController");
const { uploadMulter } = require("../../middleware/fileUtils");
const { authorization, requireMember, optionalAuth } = require("../../middleware/auth");

/** (動態)取得貼文 */
router.post("/partial", postController.getPartialPostList);

/** 取得搜尋貼文 */
router.post("/search", postController.getSearchPostList);

/** 取得「我的貼文」清單（含草稿/下架，僅作者本人） */
router.post("/myList", authorization, requireMember, postController.getMyPosts);

/** 取得貼文詳細資料（optionalAuth：草稿/下架僅作者本人可讀） */
router.post("/detail", optionalAuth, postController.getPostDetail);

/** 新增貼文 */
router.post(
  "/create",
  authorization,
  requireMember,
  uploadMulter,
  postController.createPost
);

/** 更新貼文 */
router.patch(
  "/update",
  authorization,
  requireMember,
  uploadMulter,
  postController.updatePost
);

/** 刪除貼文 */
router.delete(
  "/delete",
  authorization,
  requireMember,
  postController.deletePost
);

/** 喜歡/取消喜歡貼文 */
router.patch(
  "/toggleLikeAction",
  authorization,
  requireMember,
  postController.toggleLikePost
);

/** 取得(搜尋)hashTag資料 */
router.post("/hashTag", postController.getHashTag);

module.exports = router;
