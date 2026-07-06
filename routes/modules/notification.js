const express = require("express");
const router = express.Router();
const notificationController = require("../../controllers/notificationController");
const { authorization, requireMember } = require("../../middleware/auth");

/**
 * @openapi
 * tags:
 *   - name: Notification
 *     description: 通知（全部端點需登入，recipient 由 JWT 推導）
 */

// 全部端點都需登入（recipient 由 JWT 推導）；訪客無個人通知，故一律 requireMember
router.use(authorization, requireMember);

/**
 * @openapi
 * /api/notification/list:
 *   post:
 *     tags: [Notification]
 *     summary: 通知列表（偏移式分頁）
 *     security: [{ bearer: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page: { type: integer, default: 1, minimum: 1 }
 *               limit: { type: integer, default: 15, minimum: 1, maximum: 50 }
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Notification' }
 *                 nextPage: { type: integer, description: '>0 表示還有下一頁，0 表示到底' }
 *                 total: { type: integer }
 */
router.post("/list", notificationController.getNotificationList);

/**
 * @openapi
 * /api/notification/unreadCount:
 *   get:
 *     tags: [Notification]
 *     summary: 未讀通知數
 *     security: [{ bearer: [] }]
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: integer }
 */
router.get("/unreadCount", notificationController.getUnreadCount);

/**
 * @openapi
 * /api/notification/read:
 *   patch:
 *     tags: [Notification]
 *     summary: 單筆標為已讀
 *     security: [{ bearer: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [notificationId]
 *             properties:
 *               notificationId: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 unreadCount: { type: integer }
 *       400: { description: 參數錯誤, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: 通知不存在, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.patch("/read", notificationController.markRead);

/**
 * @openapi
 * /api/notification/readAll:
 *   patch:
 *     tags: [Notification]
 *     summary: 全部標為已讀
 *     security: [{ bearer: [] }]
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 unreadCount: { type: integer, example: 0 }
 */
router.patch("/readAll", notificationController.markAllRead);

/**
 * @openapi
 * /api/notification/delete:
 *   delete:
 *     tags: [Notification]
 *     summary: 批次刪除通知（相容單筆）
 *     security: [{ bearer: [] }]
 *     description: >-
 *       傳 `notificationIds` 陣列批次刪除；亦相容舊的單筆 `notificationId`。
 *       上限 100 筆、每筆須為合法 ObjectId，只會刪除呼叫者自己的通知。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items: { type: string }
 *                 maxItems: 100
 *                 description: 批次刪除的通知 id 陣列
 *               notificationId:
 *                 type: string
 *                 description: （相容舊版）單筆刪除
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 deletedCount: { type: integer }
 *       400: { description: 參數錯誤（空陣列 / 超過 100 / 含非法 id）, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: 通知不存在（無任何一筆命中）, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.delete("/delete", notificationController.deleteNotification);

/**
 * @openapi
 * /api/notification/clear:
 *   delete:
 *     tags: [Notification]
 *     summary: 清除所有「已讀」通知（未讀保留）
 *     security: [{ bearer: [] }]
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 */
router.delete("/clear", notificationController.clearNotifications);

/**
 * @openapi
 * /api/notification/pusher-auth:
 *   post:
 *     tags: [Notification]
 *     summary: Pusher 私有頻道授權
 *     security: [{ bearer: [] }]
 *     description: pusher-js 訂閱私有頻道前呼叫；只能授權自己的 `private-user-<自己的id>` 頻道。
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required: [socket_id, channel_name]
 *             properties:
 *               socket_id: { type: string }
 *               channel_name: { type: string, example: 'private-user-65f000000000000000000001' }
 *     responses:
 *       200:
 *         description: 授權成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 auth: { type: string, example: 'app-key:signature' }
 *       400: { description: 參數錯誤, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: 無權訂閱他人頻道, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post("/pusher-auth", notificationController.pusherAuth);

module.exports = router;
