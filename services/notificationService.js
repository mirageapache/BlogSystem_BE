const Notification = require("../models/Notification");

/** 系統通知 link 白名單：空值、站內路徑（單一 / 開頭、擋 //protocol-relative）、或 https?:// URL */
function isSafeLink(link) {
  return !link || (link.startsWith("/") && !link.startsWith("//")) || /^https?:\/\//.test(link);
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

// ponytail: 推播此階段是 no-op 接縫；階段 4 換成 pusher.triggerBatch（new/removed/unreadCount）。
async function pushNew() {}
async function pushRemoved() {}

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
  toClientShape,
  isSafeLink,
  createNotification,
  removeNotification,
  createSystemNotification,
};
