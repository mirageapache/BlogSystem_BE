const express = require("express");
const router = express.Router();
const articleController = require("../../controllers/articleController");
const { uploadMulter } = require("../../middleware/fileUtils");
const { authorization, requireMember, optionalAuth } = require("../../middleware/auth");

/**
 * @openapi
 * tags:
 *   - name: Article
 *     description: 文章（公開列表/搜尋免登入；我的文章/建立/更新/刪除/按讚需登入；文章詳情選登）
 */

/**
 * @openapi
 * /api/article/partial:
 *   post:
 *     tags: [Article]
 *     summary: (動態)取得文章
 *     description: 偏移式分頁，僅回傳公開文章（狀態 1/2），排除草稿(0)與下架(3)。
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
 *                 articles:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Article' }
 *                 nextPage: { type: integer, description: '下一頁頁碼，最後一頁或無資料時為 -1' }
 *                 totalArticle: { type: integer }
 */
/** (動態)取得文章 */
router.post("/partial", articleController.getPartialArticle);

/**
 * @openapi
 * /api/article/search:
 *   post:
 *     tags: [Article]
 *     summary: 取得搜尋文章
 *     description: 依 searchString 比對標題/內容，或依 authorId 篩選作者；僅回傳公開文章（狀態 1/2）。
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               searchString: { type: string, description: 搜尋關鍵字（比對 title / content） }
 *               authorId: { type: string, description: 指定作者 id }
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
 *                 articles:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Article' }
 *                 nextPage: { type: integer, description: '下一頁頁碼，最後一頁或無資料時為 -1' }
 *                 totalArticle: { type: integer }
 */
/** 取得搜尋文章 */
router.post("/search", articleController.getSearchArticleList);

/**
 * @openapi
 * /api/article/myList:
 *   post:
 *     tags: [Article]
 *     summary: 取得「我的文章」清單（含草稿/下架，僅作者本人）
 *     security: [{ bearer: [] }]
 *     description: 回傳登入者自己的所有文章（含草稿/下架）；可用 status 篩選單一狀態。
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page: { type: integer, default: 1, minimum: 1 }
 *               limit: { type: integer, default: 20, minimum: 1 }
 *               status:
 *                 type: integer
 *                 enum: [0, 1, 2, 3]
 *                 description: '選填，只回傳特定狀態（0-草稿 / 1-發佈(公開) / 2-發佈(限閱) / 3-下架）'
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 articles:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Article' }
 *                 nextPage: { type: integer, description: '下一頁頁碼，最後一頁或無資料時為 -1' }
 *                 totalArticle: { type: integer }
 */
/** 取得「我的文章」清單（含草稿/下架，僅作者本人） */
router.post(
  "/myList",
  authorization,
  requireMember,
  articleController.getMyArticles
);

/**
 * @openapi
 * /api/article/detail:
 *   post:
 *     tags: [Article]
 *     summary: 取得特定文章（optionalAuth：草稿/下架僅作者本人可讀）
 *     security: [{ bearer: [] }, {}]
 *     description: >-
 *       公開文章（狀態 1/2）任何人可讀；草稿(0)與下架(3)僅作者本人（帶有效 JWT）可讀，否則回 404。
 *       回傳的文章已 populate author / likedByUsers / comments。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [articleId]
 *             properties:
 *               articleId: { type: string }
 *               clientType:
 *                 type: string
 *                 description: "傳 'vue' 時將內容轉為 Tiptap 格式，否則保留 Draft.js 格式"
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Article' }
 *       404: { description: 沒有文章資料（不存在或無權讀取非公開文章）, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
/** 取得特定文章（optionalAuth：草稿/下架僅作者本人可讀） */
router.post("/detail", optionalAuth, articleController.getArticleDetail);

/**
 * @openapi
 * /api/article/create:
 *   post:
 *     tags: [Article]
 *     summary: 新增文章
 *     security: [{ bearer: [] }]
 *     description: multipart/form-data 上傳；author 由 JWT 推導。status 非法或未提供時預設為 0(草稿)。
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               imageFile:
 *                 type: string
 *                 format: binary
 *                 description: 封面圖檔（jpg/jpeg/png/gif，上限 10MB；multer 欄位名為 imageFile）
 *               title: { type: string }
 *               content: { type: string }
 *               status:
 *                 type: integer
 *                 enum: [0, 1, 2, 3]
 *                 description: '0-草稿 / 1-發佈(公開) / 2-發佈(限閱) / 3-下架，預設 0'
 *               hashTags: { type: string, description: 標籤（字串，後端以 parseHashTags 解析為陣列） }
 *               clientType: { type: string, description: "傳 'vue' 時內容以 Tiptap 轉為 Draft.js 儲存" }
 *     responses:
 *       200:
 *         description: 建立成功，回傳新文章
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Article' }
 */
/** 新增文章 */
router.post(
  "/create",
  authorization,
  requireMember,
  uploadMulter,
  articleController.createArticle
);

/**
 * @openapi
 * /api/article/update:
 *   patch:
 *     tags: [Article]
 *     summary: 更新文章
 *     security: [{ bearer: [] }]
 *     description: >-
 *       multipart/form-data 上傳；僅作者本人可更新。status 未帶或非法時不更動既有狀態，
 *       僅在內容實際變動時才更新 editedAt。
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [articleId]
 *             properties:
 *               articleId: { type: string }
 *               imageFile:
 *                 type: string
 *                 format: binary
 *                 description: 封面圖檔（jpg/jpeg/png/gif，上限 10MB；multer 欄位名為 imageFile）
 *               title: { type: string }
 *               content: { type: string }
 *               status:
 *                 type: integer
 *                 enum: [0, 1, 2, 3]
 *                 description: '選填，未帶或非法值時維持原狀態'
 *               hashTags: { type: string, description: 標籤（字串，後端以 parseHashTags 解析為陣列） }
 *               clientType: { type: string, description: "傳 'vue' 時內容以 Tiptap 轉為 Draft.js 儲存" }
 *     responses:
 *       200:
 *         description: 更新成功，回傳更新後文章
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Article' }
 *       403: { description: 無權限編輯此文章, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: 文章不存在, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
/** 更新文章 */
router.patch(
  "/update",
  authorization,
  requireMember,
  uploadMulter,
  articleController.updateArticle
);

/**
 * @openapi
 * /api/article/delete:
 *   delete:
 *     tags: [Article]
 *     summary: 刪除文章
 *     security: [{ bearer: [] }]
 *     description: 僅作者本人可刪除；連帶清除留言與指向本文章的通知（best-effort，清理失敗不影響刪除結果）。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [articleId]
 *             properties:
 *               articleId: { type: string }
 *     responses:
 *       200:
 *         description: 刪除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: DELETE_SUCCESS }
 *                 message: { type: string, example: 文章刪除成功 }
 *       403: { description: 無權限刪除此文章, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: 文章不存在, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
/** 刪除文章 */
router.delete(
  "/delete",
  authorization,
  requireMember,
  articleController.deleteArticle
);

/**
 * @openapi
 * /api/article/toggleLikeAction:
 *   patch:
 *     tags: [Article]
 *     summary: 喜歡/取消喜歡文章
 *     security: [{ bearer: [] }]
 *     description: >-
 *       action 為 true 表示按讚、false 表示取消；只對公開文章（狀態 1/2）生效並觸發通知。
 *       無論是否真的改變，皆回傳目前文章（updateResult，已 populate author / likedByUsers）。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [articleId, action]
 *             properties:
 *               articleId: { type: string }
 *               action: { type: boolean, description: true-按讚 / false-取消按讚 }
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
 *                 updateResult: { $ref: '#/components/schemas/Article' }
 *       404: { description: 文章不存在, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
/** 喜歡/取消喜歡文章 */
router.patch(
  "/toggleLikeAction",
  authorization,
  requireMember,
  articleController.toggleLikeArticle
);

module.exports = router;
