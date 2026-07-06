const express = require("express");
const router = express.Router();
const commentController = require("../../controllers/commentController");
const { authorization, requireMember } = require("../../middleware/auth");

/**
 * @openapi
 * tags:
 *   - name: Comment
 *     description: 留言（讀取公開；新增/編輯/刪除需登入）
 */

/** 取得貼文留言 */
/**
 * @openapi
 * /api/comment:
 *   post:
 *     tags: [Comment]
 *     summary: 取得貼文留言
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id]
 *             properties:
 *               id: { type: string, description: 貼文 id }
 *     responses:
 *       200:
 *         description: 成功（回傳該貼文，comments 已展開為留言物件）
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Post'
 *                 - type: object
 *                   properties:
 *                     comments:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Comment' }
 *       404: { description: 留言對象不存在或無留言, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post("/", commentController.getComment);

/** 新增留言 */
/**
 * @openapi
 * /api/comment/create:
 *   post:
 *     tags: [Comment]
 *     summary: 新增留言
 *     security: [{ bearer: [] }]
 *     description: 於貼文或文章新增留言；可帶 parentCommentId 表示回覆某則留言。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, content, route]
 *             properties:
 *               id: { type: string, description: 留言對象（貼文/文章）id }
 *               content: { type: string, maxLength: 500 }
 *               route: { type: string, enum: [post, article], description: 留言對象類型 }
 *               parentCommentId: { type: string, description: 母留言 id（回覆某則留言時帶入） }
 *     responses:
 *       200:
 *         description: 成功（回傳更新後的貼文或文章）
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Post'
 *                 - $ref: '#/components/schemas/Article'
 *       400: { description: route 參數錯誤, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: 未登入, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: 留言對象不存在, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post(
  "/create",
  authorization,
  requireMember,
  commentController.createComment
);

/** 更新留言 */
/**
 * @openapi
 * /api/comment/update/{id}:
 *   patch:
 *     tags: [Comment]
 *     summary: 更新留言
 *     security: [{ bearer: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: 留言 id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, maxLength: 500 }
 *     responses:
 *       200:
 *         description: 成功（回傳更新後的留言）
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Comment' }
 *       401: { description: 未登入, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: 無權限編輯此留言, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: 留言不存在, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.patch(
  "/update/:id",
  authorization,
  requireMember,
  commentController.editComment
);

/** 刪除留言 */
/**
 * @openapi
 * /api/comment/delete/{id}:
 *   delete:
 *     tags: [Comment]
 *     summary: 刪除留言
 *     security: [{ bearer: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: 留言 id
 *     responses:
 *       200:
 *         description: 刪除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: DELETE_SUCCESS }
 *                 message: { type: string }
 *       401: { description: 未登入, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: 無權限刪除此留言, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: 留言不存在, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.delete(
  "/delete/:id",
  authorization,
  requireMember,
  commentController.deleteComment
);

module.exports = router;
