const express = require("express");
const router = express.Router();
const { authorization, requireMember } = require("../../middleware/auth");
const followController = require("../../controllers/followController");

/**
 * @openapi
 * tags:
 *   - name: Follow
 *     description: 追蹤關係（清單為公開；追蹤/取消/改狀態需登入，操作者由 JWT 推導）
 */

/** 取得追蹤清單 */
/**
 * @openapi
 * /api/follow/getfollowing:
 *   post:
 *     tags: [Follow]
 *     summary: 取得追蹤清單
 *     description: 取得指定使用者所追蹤的對象清單（該使用者為追蹤人）。公開端點。
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string, description: 追蹤人的使用者 id }
 *               page: { type: integer, default: 1, minimum: 1 }
 *               limit: { type: integer, default: 20, minimum: 1 }
 *     responses:
 *       200:
 *         description: 成功（userId 非法時回傳空清單、nextPage=-1）
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 followList:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/User'
 *                       - type: object
 *                         properties:
 *                           followState: { type: integer, enum: [0, 1], description: '0-追蹤(不推播) / 1-主動推播' }
 *                           isFollow: { type: boolean, example: true }
 *                 nextPage: { type: integer, description: '下一頁頁碼，-1 表示到底' }
 *                 totalUser: { type: integer }
 */
router.post("/getfollowing", followController.getfollowingList);

/** 取得粉絲清單 */
/**
 * @openapi
 * /api/follow/getfollower:
 *   post:
 *     tags: [Follow]
 *     summary: 取得粉絲清單
 *     description: 取得追蹤指定使用者的粉絲清單（該使用者為被追蹤人）。公開端點。
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string, description: 被追蹤人的使用者 id }
 *               page: { type: integer, default: 1, minimum: 1 }
 *               limit: { type: integer, default: 20, minimum: 1 }
 *     responses:
 *       200:
 *         description: 成功（userId 非法時回傳空清單、nextPage=-1）
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 followList:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/User'
 *                       - type: object
 *                         properties:
 *                           followState: { type: integer, enum: [0, 1], description: '0-追蹤(不推播) / 1-主動推播' }
 *                 nextPage: { type: integer, description: '下一頁頁碼，-1 表示到底' }
 *                 totalUser: { type: integer }
 */
router.post("/getfollower", followController.getFollowerList);

/** 追蹤 */
/**
 * @openapi
 * /api/follow/follow:
 *   post:
 *     tags: [Follow]
 *     summary: 追蹤
 *     security: [{ bearer: [] }]
 *     description: 追蹤指定使用者，操作者由 JWT 推導；追蹤成功會通知被追蹤者。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetId]
 *             properties:
 *               targetId: { type: string, description: 被追蹤的使用者 id }
 *     responses:
 *       200:
 *         description: 追蹤成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: SUCCESS }
 *                 message: { type: string, example: 追蹤成功 }
 *       400: { description: 目標使用者不存在 / 無法追蹤自己, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: 已追蹤（重複追蹤）, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post("/follow", authorization, requireMember, followController.followUser);

/** 取消追蹤 */
/**
 * @openapi
 * /api/follow/unfollow:
 *   post:
 *     tags: [Follow]
 *     summary: 取消追蹤
 *     security: [{ bearer: [] }]
 *     description: 取消追蹤指定使用者，操作者由 JWT 推導；會一併移除對應的追蹤通知。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetId]
 *             properties:
 *               targetId: { type: string, description: 被取消追蹤的使用者 id }
 *     responses:
 *       200:
 *         description: 取消追蹤成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: SUCCESS }
 *                 message: { type: string, example: 取消追蹤成功 }
 *       400: { description: 目標使用者不存在, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: 已取消追蹤（原本未追蹤）, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post("/unfollow", authorization, requireMember, followController.unfollowUser);

/** 更新訂閱狀態 */
/**
 * @openapi
 * /api/follow/changeState:
 *   patch:
 *     tags: [Follow]
 *     summary: 更新訂閱狀態
 *     security: [{ bearer: [] }]
 *     description: 更新對指定使用者的追蹤（訂閱）狀態，操作者由 JWT 推導。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetId, state]
 *             properties:
 *               targetId: { type: string, description: 被追蹤的使用者 id }
 *               state: { type: integer, enum: [0, 1], description: '追蹤狀態：0-追蹤(不推播) / 1-主動推播' }
 *     responses:
 *       200:
 *         description: 已更新狀態
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: UPDATE_SUCCESS }
 *                 message: { type: string, example: 已更新狀態 }
 *                 FollowData:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Follow'
 *                   nullable: true
 *                   description: 更新後的追蹤資料；若無對應追蹤關係則為 null
 *       400: { description: 目標使用者不存在, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.patch("/changeState", authorization, requireMember, followController.changeFollowState);

module.exports = router;
