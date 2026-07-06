const express = require("express");
const router = express.Router();
const utilityController = require("../../controllers/utilityController");

/**
 * @openapi
 * tags:
 *   - name: Utility
 *     description: 工具類端點（公開，無需登入）
 */

/**
 * @openapi
 * /api/utility/searchCount:
 *   post:
 *     tags: [Utility]
 *     summary: 搜尋結果數量
 *     description: 依關鍵字統計文章、貼文、使用者、標籤各分類的符合筆數。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [searchString]
 *             properties:
 *               searchString: { type: string, description: 搜尋關鍵字 }
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: SUCCESS }
 *                 article: { type: integer, description: 符合的文章數量 }
 *                 post: { type: integer, description: 符合的貼文數量 }
 *                 user: { type: integer, description: 符合的使用者數量 }
 *                 hashtag: { type: integer, description: 符合的標籤數量 }
 *       500: { description: 系統錯誤, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
/** 搜尋結果數量 */
router.post('/searchCount', utilityController.searchCount);

module.exports = router;
