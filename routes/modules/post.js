const express = require("express");
const router = express.Router();
const postController = require("../../controllers/postController");
const { uploadMulter } = require("../../middleware/fileUtils");
const { authorization, requireMember, optionalAuth } = require("../../middleware/auth");

/**
 * @openapi
 * tags:
 *   - name: Post
 *     description: 貼文（公開/選登/需登入混雜；草稿與下架僅作者本人可見）
 */

/**
 * @openapi
 * /api/post/partial:
 *   post:
 *     tags: [Post]
 *     summary: (動態)取得貼文
 *     description: 僅回傳公開貼文（status 1/2），依 createdAt 遞減分頁。
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page: { type: integer, default: 1, minimum: 1 }
 *               limit: { type: integer, default: 20, minimum: 1 }
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Post' }
 *                 nextPage: { type: integer, description: '下一頁頁碼，-1 表示已到底' }
 *                 totalPosts: { type: integer }
 */
router.post("/partial", postController.getPartialPostList);

/**
 * @openapi
 * /api/post/search:
 *   post:
 *     tags: [Post]
 *     summary: 取得搜尋貼文 or 特定使用者的貼文
 *     description: >-
 *       searchString 比對 content 與 hashTags；authorId 篩選特定作者。
 *       僅回傳公開貼文（status 1/2），作者的草稿請走 /api/post/myList。
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               searchString: { type: string, description: 搜尋字串（比對 content 與 hashTags） }
 *               authorId: { type: string, description: 作者 id }
 *               page: { type: integer, default: 1, minimum: 1 }
 *               limit: { type: integer, default: 20, minimum: 1 }
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Post' }
 *                 nextPage: { type: integer, description: '下一頁頁碼，-1 表示已到底' }
 *                 totalPosts: { type: integer }
 */
router.post("/search", postController.getSearchPostList);

/**
 * @openapi
 * /api/post/myList:
 *   post:
 *     tags: [Post]
 *     summary: 取得「我的貼文」清單（含草稿/下架，僅作者本人）
 *     security: [{ bearer: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page: { type: integer, default: 1, minimum: 1 }
 *               limit: { type: integer, default: 20, minimum: 1 }
 *               status: { type: integer, enum: [0, 1, 2, 3], description: '選填，只回傳特定狀態（如 0 草稿）' }
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Post' }
 *                 nextPage: { type: integer, description: '下一頁頁碼，-1 表示已到底' }
 *                 totalPosts: { type: integer }
 */
router.post("/myList", authorization, requireMember, postController.getMyPosts);

/**
 * @openapi
 * /api/post/detail:
 *   post:
 *     tags: [Post]
 *     summary: 取得貼文詳細資料
 *     description: >-
 *       optionalAuth：草稿/下架貼文（status 0/3）僅作者本人可讀，其他人一律回 404。
 *       author / likedByUsers / comments 會 populate 展開。
 *     security: [{ bearer: [] }, {}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [postId]
 *             properties:
 *               postId: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Post' }
 *       404: { description: 貼文不存在或無權讀取, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post("/detail", optionalAuth, postController.getPostDetail);

/**
 * @openapi
 * /api/post/create:
 *   post:
 *     tags: [Post]
 *     summary: 新增貼文
 *     security: [{ bearer: [] }]
 *     description: 以 multipart/form-data 送出；imageFile 為選填圖檔。未提供或非法 status 時預設為 0（草稿）。
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               imageFile: { type: string, format: binary, description: '貼文圖檔（選填，上限 10MB）' }
 *               content: { type: string }
 *               status: { type: integer, enum: [0, 1, 2, 3], default: 0, description: '0-草稿 / 1-發佈(公開) / 2-發佈(限閱) / 3-下架' }
 *               hashTags: { type: string, description: 'JSON 字串陣列，如 ["tag1","tag2"]' }
 *     responses:
 *       200:
 *         description: 建立成功
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Post' }
 */
router.post(
  "/create",
  authorization,
  requireMember,
  uploadMulter,
  postController.createPost
);

/**
 * @openapi
 * /api/post/update:
 *   patch:
 *     tags: [Post]
 *     summary: 更新貼文
 *     security: [{ bearer: [] }]
 *     description: >-
 *       以 multipart/form-data 送出，僅作者本人可編輯。圖片以 DB 既有值為基礎，
 *       上傳 imageFile 可替換、removeImage 設為字串 "true" 可移除；不採信前端傳入的 image/imageId。
 *       status 僅在傳入合法值時才更新。
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [postId]
 *             properties:
 *               postId: { type: string }
 *               imageFile: { type: string, format: binary, description: '新圖檔（選填，上限 10MB）' }
 *               content: { type: string }
 *               status: { type: integer, enum: [0, 1, 2, 3], description: '選填，未傳則維持原狀態' }
 *               removeImage: { type: string, enum: ['true', 'false'], description: '傳字串 "true" 移除現有圖片' }
 *               hashTags: { type: string, description: 'JSON 字串陣列，如 ["tag1","tag2"]' }
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Post' }
 *       403: { description: 無權限編輯此貼文, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: 貼文不存在, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.patch(
  "/update",
  authorization,
  requireMember,
  uploadMulter,
  postController.updatePost
);

/**
 * @openapi
 * /api/post/delete:
 *   delete:
 *     tags: [Post]
 *     summary: 刪除貼文
 *     security: [{ bearer: [] }]
 *     description: 僅作者本人可刪除；會連帶清除底下留言與指向本貼文的通知（best-effort）。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [postId]
 *             properties:
 *               postId: { type: string }
 *     responses:
 *       200:
 *         description: 刪除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: DELETE_SUCCESS }
 *                 message: { type: string, example: 刪除成功 }
 *       403: { description: 無權限刪除此貼文, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: 貼文不存在, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.delete(
  "/delete",
  authorization,
  requireMember,
  postController.deletePost
);

/**
 * @openapi
 * /api/post/toggleLikeAction:
 *   patch:
 *     tags: [Post]
 *     summary: 喜歡/取消喜歡貼文
 *     security: [{ bearer: [] }]
 *     description: action 為 true 表示按讚、false 表示取消；僅公開貼文（status 1/2）可被按讚並觸發通知。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [postId, action]
 *             properties:
 *               postId: { type: string }
 *               action: { type: boolean, description: 'true-按讚 / false-取消按讚' }
 *     responses:
 *       200:
 *         description: 操作成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: SUCCESS }
 *                 message: { type: string, example: 操作成功 }
 *                 updateResult: { $ref: '#/components/schemas/Post' }
 *       404: { description: 貼文不存在, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.patch(
  "/toggleLikeAction",
  authorization,
  requireMember,
  postController.toggleLikePost
);

/**
 * @openapi
 * /api/post/hashTag:
 *   post:
 *     tags: [Post]
 *     summary: 取得(搜尋)hashTag資料
 *     description: 以 searchString 比對 hashTags，僅回傳公開貼文（status 1/2）。未帶 searchString 時回傳空陣列與 code NO_SEARCH_STRING。
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               searchString: { type: string }
 *               page: { type: integer, default: 1, minimum: 1 }
 *               limit: { type: integer, default: 20, minimum: 1 }
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Post' }
 *                 nextPage: { type: integer, description: '下一頁頁碼，-1 表示已到底' }
 *                 totalPost: { type: integer }
 *                 code: { type: string, description: '未帶 searchString 時回傳 NO_SEARCH_STRING' }
 */
router.post("/hashTag", postController.getHashTag);

module.exports = router;
