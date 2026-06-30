const Notification = require("../models/Notification");
const { isValidId, USER_PUBLIC_FIELDS } = require("../middleware/commonUtils");
const {
  toClientShape,
  clampLimit,
  clampPage,
  nextPageFor,
} = require("../services/notificationService");

// recipient 一律由 JWT 推導，永不信任 body（見 NOTIFICATION_PLAN §6）。
// ponytail: 本階段不推 Pusher；read/readAll/delete/clear 的跨分頁同步留待階段 4 加 pushUnreadCount。

const notificationController = {
  /** 通知列表（偏移式分頁） */
  getNotificationList: async (req, res) => {
    const recipient = req.user.userId;
    const page = clampPage(req.body.page);
    const limit = clampLimit(req.body.limit);
    try {
      const [total, docs] = await Promise.all([
        Notification.countDocuments({ recipient }),
        Notification.find({ recipient })
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("sender", USER_PUBLIC_FIELDS)
          .lean(),
      ]);
      return res.status(200).json({
        notifications: docs.map(toClientShape),
        nextPage: nextPageFor(page, limit, total),
        total,
      });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 未讀數 */
  getUnreadCount: async (req, res) => {
    try {
      const count = await Notification.countDocuments({
        recipient: req.user.userId,
        isRead: false,
      });
      return res.status(200).json({ count });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 單筆標已讀（原子越權 filter，0 命中即 404） */
  markRead: async (req, res) => {
    const { notificationId } = req.body;
    if (!isValidId(notificationId))
      return res.status(400).json({ code: "INVALID_PARAM", message: "參數錯誤" });
    try {
      const recipient = req.user.userId;
      const result = await Notification.updateOne(
        { _id: notificationId, recipient },
        { $set: { isRead: true, readAt: new Date() } }
      );
      if (result.matchedCount === 0)
        return res.status(404).json({ code: "NOT_FOUND", message: "通知不存在" });

      const unreadCount = await Notification.countDocuments({ recipient, isRead: false });
      return res.status(200).json({ success: true, unreadCount });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 全部標已讀（只動未讀那批，避免重寫已讀的 readAt） */
  markAllRead: async (req, res) => {
    try {
      await Notification.updateMany(
        { recipient: req.user.userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );
      return res.status(200).json({ success: true, unreadCount: 0 });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 刪除單筆（原子越權 filter，0 命中即 404） */
  deleteNotification: async (req, res) => {
    const { notificationId } = req.body;
    if (!isValidId(notificationId))
      return res.status(400).json({ code: "INVALID_PARAM", message: "參數錯誤" });
    try {
      const result = await Notification.deleteOne({
        _id: notificationId,
        recipient: req.user.userId,
      });
      if (result.deletedCount === 0)
        return res.status(404).json({ code: "NOT_FOUND", message: "通知不存在" });
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 清除已讀（未讀保留，別讓使用者一鍵清掉還沒看的） */
  clearNotifications: async (req, res) => {
    try {
      await Notification.deleteMany({ recipient: req.user.userId, isRead: true });
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
};

module.exports = notificationController;
