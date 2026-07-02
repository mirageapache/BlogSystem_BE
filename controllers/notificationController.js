const Notification = require("../models/Notification");
const { isValidId, USER_PUBLIC_FIELDS } = require("../middleware/commonUtils");
const {
  pusher,
  classifyChannelAuth,
  toClientShape,
  clampLimit,
  clampPage,
  nextPageFor,
  pushRemoved,
  pushUnreadCount,
} = require("../services/notificationService");

// recipient 一律由 JWT 推導，永不信任 body（見 NOTIFICATION_PLAN §6）。
// Pusher 推播失敗不可讓已成功的 DB 操作變 500 —— 一律 try/catch 記 log，DB 為唯一真相，前端重連補拉。

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
      try { await pushUnreadCount(recipient); } catch (e) { console.error("[notification] push unreadCount failed:", e.message); }
      return res.status(200).json({ success: true, unreadCount });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 全部標已讀（只動未讀那批，避免重寫已讀的 readAt） */
  markAllRead: async (req, res) => {
    try {
      const recipient = req.user.userId;
      await Notification.updateMany(
        { recipient, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );
      try { await pushUnreadCount(recipient); } catch (e) { console.error("[notification] push unreadCount failed:", e.message); }
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
      const recipient = req.user.userId;
      const result = await Notification.deleteOne({ _id: notificationId, recipient });
      if (result.deletedCount === 0)
        return res.status(404).json({ code: "NOT_FOUND", message: "通知不存在" });
      // 推 removed + unreadCount 讓其他分頁移除該列並更新徽章
      try { await pushRemoved(recipient, String(notificationId)); } catch (e) { console.error("[notification] push removed failed:", e.message); }
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 清除已讀（未讀保留，別讓使用者一鍵清掉還沒看的） */
  clearNotifications: async (req, res) => {
    try {
      const recipient = req.user.userId;
      await Notification.deleteMany({ recipient, isRead: true });
      // 只清已讀，未讀數不變；仍推一次確保各分頁徽章一致（清完成本極低）
      try { await pushUnreadCount(recipient); } catch (e) { console.error("[notification] push unreadCount failed:", e.message); }
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** Pusher 私有頻道授權：登入(authorization)後只能授權自己的頻道，否則 BOLA。 */
  pusherAuth: (req, res) => {
    const { socket_id, channel_name } = req.body;
    if (typeof socket_id !== "string")
      return res.status(400).json({ code: "INVALID_PARAM", message: "參數錯誤" });

    const verdict = classifyChannelAuth(channel_name, req.user.userId);
    if (verdict === "invalid")
      return res.status(400).json({ code: "INVALID_PARAM", message: "參數錯誤" });
    if (verdict === "forbidden")
      return res.status(403).json({ code: "FORBIDDEN", message: "無權訂閱此頻道" });

    const authResponse = pusher.authorizeChannel(socket_id, channel_name); // 用 secret 簽章
    return res.status(200).json(authResponse); // { auth: '<key>:<signature>' }
  },
};

module.exports = notificationController;
