const Notification = require("../models/Notification");
const Pusher = require("pusher");

// Pusher 私有頻道：每位使用者一條 private-user-<id>。secret 只在後端，client 訂閱前先打 pusher-auth 授權。
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});
const userChannel = (uid) => `private-user-${uid}`;
const CHANNEL_RE = /^private-user-[0-9a-f]{24}$/;

/** pusher-auth 判定：格式合法且必須是自己的頻道，否則即 BOLA。回 'ok' | 'forbidden' | 'invalid'。 */
function classifyChannelAuth(channelName, userId) {
  if (typeof channelName !== "string" || !CHANNEL_RE.test(channelName)) return "invalid";
  return channelName === userChannel(userId) ? "ok" : "forbidden";
}

/** 系統通知 link 白名單：空值、站內路徑（單一 / 開頭、擋 //protocol-relative）、或 https?:// URL */
function isSafeLink(link) {
  return !link || (link.startsWith("/") && !link.startsWith("//")) || /^https?:\/\//.test(link);
}

/** limit 夾在 1..50，非法/缺省回 15，避免 client 拉爆查詢 */
function clampLimit(raw) {
  return Math.min(Math.max(Number(raw) || 15, 1), 50);
}

/** page 至少為 1，非法/缺省回 1 */
function clampPage(raw) {
  return Math.max(Number(raw) || 1, 1);
}

/** 偏移式分頁：還有後續資料才回下一頁碼，否則回 0（前端以 >0 判斷是否續抓） */
function nextPageFor(page, limit, total) {
  return page * limit < total ? page + 1 : 0;
}

/** 將通知文件轉成前端形狀；sender 只露出公開欄位 */
function toClientShape(n) {
  return {
    _id: n._id,
    type: n.type,
    entityType: n.entityType,
    entityId: n.entityId,
    title: n.title,
    link: n.link,
    preview: n.preview,
    isRead: n.isRead,
    createdAt: n.createdAt,
    sender: n.sender
      ? {
          _id: n.sender._id,
          account: n.sender.account,
          name: n.sender.name,
          avatar: n.sender.avatar,
          bgColor: n.sender.bgColor,
        }
      : null,
  };
}

const { USER_PUBLIC_FIELDS } = require("../middleware/commonUtils");

const unreadCountFor = (recipient) => Notification.countDocuments({ recipient, isRead: false });

/** 推「新通知 + 最新未讀數」到使用者私有頻道（無狀態 HTTP，serverless 友善）。 */
async function pushNew(recipient, payload) {
  const count = await unreadCountFor(recipient);
  await pusher.triggerBatch([
    { channel: userChannel(recipient), name: "notification:new", data: payload },
    { channel: userChannel(recipient), name: "notification:unreadCount", data: { count } },
  ]);
}

/** 推「移除某列 + 最新未讀數」（取消讚/取消追蹤、REST 刪除共用）。 */
async function pushRemoved(recipient, notificationId) {
  const count = await unreadCountFor(recipient);
  await pusher.triggerBatch([
    { channel: userChannel(recipient), name: "notification:removed", data: { notificationId } },
    { channel: userChannel(recipient), name: "notification:unreadCount", data: { count } },
  ]);
}

/** 只推未讀數（REST 標已讀/清除後跨分頁/裝置同步徽章）。 */
async function pushUnreadCount(recipient) {
  const count = await unreadCountFor(recipient);
  await pusher.trigger(userChannel(recipient), "notification:unreadCount", { count });
}

/** 批次刪除的即時同步：先獨立刷新未讀徽章（最重要、必達），再逐列推 notification:removed
 *  （沿用單筆刪除的事件形狀，前端免改）。
 *  ponytail: Pusher triggerBatch 單次上限約 10 事件，故每 9 筆切一塊；controller 已把批量壓在 100。
 *  量再放大就改推單一「整批 refetch」信號取代逐列。 */
async function pushRemovedMany(recipient, notificationIds) {
  await pushUnreadCount(recipient); // 徽章獨立推送：即使下面切塊失敗，未讀數仍正確
  const channel = userChannel(recipient);
  for (let i = 0; i < notificationIds.length; i += 9) {
    await pusher.triggerBatch(
      notificationIds.slice(i, i + 9).map((id) => ({
        channel,
        name: "notification:removed",
        data: { notificationId: String(id) },
      }))
    );
  }
}

const DEDUP_TYPES = ["like_post", "like_article", "follow"]; // 同一人對同一目標只留一筆

/** 互動通知統一進入點：跳過自己 → 去重/新增 → populate sender → 推播。 */
async function createNotification({ recipient, sender, type, entityType, entityId, preview = "" }) {
  if (String(recipient) === String(sender)) return null; // 自己操作不通知

  let notification;
  if (DEDUP_TYPES.includes(type)) {
    // 首次插入才寫 entityType（filter 沒有它），否則第一筆會缺 entityType、前端無法導向
    notification = await Notification.findOneAndUpdate(
      { recipient, sender, type, entityId },
      {
        $set: { preview, isRead: false, readAt: null },
        $setOnInsert: { recipient, sender, type, entityType, entityId },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
  } else {
    notification = await Notification.create({ recipient, sender, type, entityType, entityId, preview });
  }

  await notification.populate("sender", USER_PUBLIC_FIELDS);
  await pushNew(recipient, toClientShape(notification));
  return notification;
}

/** 母文(post/article)被刪 → 收回所有指向它的互動通知（like/comment/reply 都以 entityId=母文id 記錄），
 *  並刷新每位受影響收件者的未讀徽章。回傳刪除筆數；推播非致命(DB 為單一真相)，自行吞掉推播錯誤。 */
async function removeEntityNotifications(entityType, entityId) {
  const recipients = await Notification.distinct("recipient", { entityType, entityId });
  const { deletedCount } = await Notification.deleteMany({ entityType, entityId });
  for (const recipient of recipients) {
    try {
      await pushUnreadCount(recipient);
    } catch (e) {
      console.error("[notification] cascade push failed:", e.message);
    }
  }
  return deletedCount;
}

/** 取消愛心 / 取消追蹤時移除對應通知（兩者共用，type 不同而已）。 */
async function removeNotification({ recipient, sender, type, entityId }) {
  const removed = await Notification.findOneAndDelete({ recipient, sender, type, entityId });
  if (!removed) return null; // 本來就沒有，不必推播
  await pushRemoved(recipient, String(removed._id));
  return removed;
}

/** 系統通知：無 sender、無去重、用 title/preview/link；由後端內部事件呼叫（非公開 API）。 */
async function createSystemNotification({ recipient, title = "", preview = "", link = "" }) {
  if (!isSafeLink(link)) throw new Error("INVALID_LINK"); // 寫入時就過白名單（前端導向時再驗一次）
  const notification = await Notification.create({
    recipient,
    type: "system",
    entityType: "system",
    title,
    preview,
    link,
  });
  await pushNew(recipient, toClientShape(notification));
  return notification;
}

module.exports = {
  pusher,
  classifyChannelAuth,
  toClientShape,
  isSafeLink,
  clampLimit,
  clampPage,
  nextPageFor,
  createNotification,
  removeNotification,
  removeEntityNotifications,
  createSystemNotification,
  pushRemoved,
  pushRemovedMany,
  pushUnreadCount,
};
