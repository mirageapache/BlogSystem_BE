const express = require("express");
const router = express.Router();
const notificationController = require("../../controllers/notificationController");
const { authorization, requireMember } = require("../../middleware/auth");

// 全部端點都需登入（recipient 由 JWT 推導）；訪客無個人通知，故一律 requireMember
router.use(authorization, requireMember);

/** 通知列表（分頁） */
router.post("/list", notificationController.getNotificationList);

/** 未讀數 */
router.get("/unreadCount", notificationController.getUnreadCount);

/** 單筆標已讀 */
router.patch("/read", notificationController.markRead);

/** 全部標已讀 */
router.patch("/readAll", notificationController.markAllRead);

/** 刪除單筆 */
router.delete("/delete", notificationController.deleteNotification);

/** 清除已讀 */
router.delete("/clear", notificationController.clearNotifications);

module.exports = router;
