const express = require("express");
const router = express.Router();
const { aiAuth } = require('../../middleware/aiAuth');
const postController = require('../../controllers/postController');
const articleController = require('../../controllers/articleController');

/**
 * @openapi
 * tags:
 *   - name: AI
 *     description: AI 內部服務端點（由 aiAuth 內部服務金鑰驗證，非使用者 JWT；author 由伺服器端 AI_BOT_USER_ID 推導）
 */

/**
 * @openapi
 * /api/ai/post/create:
 *   post:
 *     tags: [AI]
 *     summary: AI 建立貼文
 *     description: >-
 *       AI 內部服務端點；以 `aiAuth`（header `x-api-key` 內部服務金鑰）驗證，非使用者 JWT。
 *       作者不由 request body 指定，而是由 aiAuth 依伺服器端環境變數 `AI_BOT_USER_ID` 推導。
 *     security: [{ aiKey: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string, description: 貼文內容 }
 *               status:
 *                 type: integer
 *                 enum: [0, 1, 2, 3]
 *                 default: 0
 *                 description: 0-草稿 / 1-發佈(公開) / 2-發佈(限閱) / 3-下架；未提供或非法值時預設 0(草稿)
 *               hashTags:
 *                 type: array
 *                 items: { type: string }
 *                 description: 主題標籤；亦接受可解析為陣列的 JSON 字串
 *     responses:
 *       200:
 *         description: 建立成功，回傳新貼文
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Post' }
 *       401: { description: AI Auth 驗證失敗（未提供或金鑰不符）, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
/** AI 建立貼文 */
router.post("/post/create", aiAuth, postController.createPost);

/**
 * @openapi
 * /api/ai/article/create:
 *   post:
 *     tags: [AI]
 *     summary: AI 建立文章
 *     description: >-
 *       AI 內部服務端點；以 `aiAuth`（header `x-api-key` 內部服務金鑰）驗證，非使用者 JWT。
 *       作者不由 request body 指定，而是由 aiAuth 依伺服器端環境變數 `AI_BOT_USER_ID` 推導。
 *     security: [{ aiKey: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, description: 文章標題 }
 *               content: { type: string, description: 文章內容（clientType 為 vue 時會由 Tiptap 轉為 Draft.js 格式後儲存） }
 *               status:
 *                 type: integer
 *                 enum: [0, 1, 2, 3]
 *                 default: 0
 *                 description: 0-草稿 / 1-發佈(公開) / 2-發佈(限閱) / 3-下架；未提供或非法值時預設 0(草稿)
 *               hashTags:
 *                 type: array
 *                 items: { type: string }
 *                 description: 主題標籤；亦接受可解析為陣列的 JSON 字串
 *               clientType:
 *                 type: string
 *                 enum: [vue, react]
 *                 description: 前端類型；為 vue 時 content 會由 Tiptap 轉為 Draft.js 格式儲存
 *     responses:
 *       200:
 *         description: 建立成功，回傳新文章
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Article' }
 *       401: { description: AI Auth 驗證失敗（未提供或金鑰不符）, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
/** AI 建立文章 */
router.post("/article/create", aiAuth, articleController.createArticle);

module.exports = router;