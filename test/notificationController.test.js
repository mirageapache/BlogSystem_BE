// 控制器層整合測試：只 stub 真正的外部邊界（Mongoose model statics 與 pusher client），
// controller / service push 函式 / classifyChannelAuth 全部跑真的。無 DB、無網路、可重複。
// pusher-auth 用下面這組 dummy 金鑰做「真實」HMAC 簽章（authorizeChannel 是純運算、不連網）。
process.env.PUSHER_APP_ID = process.env.PUSHER_APP_ID || "test-app";
process.env.PUSHER_KEY = process.env.PUSHER_KEY || "test-key";
process.env.PUSHER_SECRET = process.env.PUSHER_SECRET || "test-secret";
process.env.PUSHER_CLUSTER = process.env.PUSHER_CLUSTER || "ap3";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const controller = require("../controllers/notificationController");
const Notification = require("../models/Notification");
const { pusher } = require("../services/notificationService");

const ME = "65f000000000000000000001"; // 呼叫者（JWT 推導）
const OTHER = "65f0000000000000000000ff"; // 另一位使用者
const NID = "65f0000000000000000000aa"; // 一筆通知 id

// req 永遠帶 JWT 推導的 userId；body 可被攻擊者塞任意欄位（測試要證明 controller 不信 body）
function mockReq({ userId = ME, body = {} } = {}) {
  return { user: { userId }, body };
}
function mockRes() {
  return {
    statusCode: 0,
    payload: undefined,
    status(code) { this.statusCode = code; return this; },
    json(p) { this.payload = p; return this; },
  };
}

test("markRead rejects an invalid id with 400 and never touches the DB", async (t) => {
  const updateOne = t.mock.method(Notification, "updateOne", async () => ({ matchedCount: 1 }));
  const res = mockRes();
  await controller.markRead(mockReq({ body: { notificationId: "not-an-id" } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, "INVALID_PARAM");
  assert.equal(updateOne.mock.callCount(), 0, "invalid id 不該打 DB");
});

test("markRead scopes to req.user.userId and 404s on 0 match (BOLA guard)", async (t) => {
  const updateOne = t.mock.method(Notification, "updateOne", async () => ({ matchedCount: 0 }));
  const res = mockRes();
  // 攻擊者在 body 偷塞 recipient，controller 必須無視
  await controller.markRead(mockReq({ body: { notificationId: NID, recipient: "hacker" } }), res);
  assert.equal(res.statusCode, 404);
  const [filter] = updateOne.mock.calls[0].arguments;
  assert.equal(filter._id, NID);
  assert.equal(filter.recipient, ME, "recipient 必須來自 JWT，永不信任 body");
});

test("markRead marks read, returns fresh unreadCount, and pushes the badge", async (t) => {
  t.mock.method(Notification, "updateOne", async () => ({ matchedCount: 1 }));
  t.mock.method(Notification, "countDocuments", async () => 3);
  const trigger = t.mock.method(pusher, "trigger", async () => ({}));
  const res = mockRes();
  await controller.markRead(mockReq({ body: { notificationId: NID } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.unreadCount, 3);
  assert.equal(trigger.mock.callCount(), 1);
  const [channel, event, data] = trigger.mock.calls[0].arguments;
  assert.equal(channel, `private-user-${ME}`);
  assert.equal(event, "notification:unreadCount");
  assert.equal(data.count, 3);
});

test("markRead still returns 200 when the Pusher push throws (DB is source of truth)", async (t) => {
  t.mock.method(Notification, "updateOne", async () => ({ matchedCount: 1 }));
  t.mock.method(Notification, "countDocuments", async () => 0);
  t.mock.method(pusher, "trigger", async () => { throw new Error("pusher down"); });
  t.mock.method(console, "error", () => {}); // 吞掉預期的錯誤 log
  const res = mockRes();
  await controller.markRead(mockReq({ body: { notificationId: NID } }), res);
  assert.equal(res.statusCode, 200, "推播失敗不可把已成功的 DB 操作變 500");
});

test("markAllRead updates only the caller's unread notifications", async (t) => {
  const updateMany = t.mock.method(Notification, "updateMany", async () => ({}));
  t.mock.method(Notification, "countDocuments", async () => 0);
  t.mock.method(pusher, "trigger", async () => ({}));
  const res = mockRes();
  await controller.markAllRead(mockReq(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.unreadCount, 0);
  const [filter] = updateMany.mock.calls[0].arguments;
  assert.deepEqual(filter, { recipient: ME, isRead: false });
});

test("deleteNotification scopes to JWT recipient and 404s on 0 match", async (t) => {
  const deleteOne = t.mock.method(Notification, "deleteOne", async () => ({ deletedCount: 0 }));
  const res = mockRes();
  await controller.deleteNotification(mockReq({ body: { notificationId: NID } }), res);
  assert.equal(res.statusCode, 404);
  const [filter] = deleteOne.mock.calls[0].arguments;
  assert.equal(filter._id, NID);
  assert.equal(filter.recipient, ME, "刪除 filter 必須綁 JWT recipient，擋越權");
});

test("deleteNotification deletes then pushes removed + unreadCount via triggerBatch", async (t) => {
  t.mock.method(Notification, "deleteOne", async () => ({ deletedCount: 1 }));
  t.mock.method(Notification, "countDocuments", async () => 2);
  const triggerBatch = t.mock.method(pusher, "triggerBatch", async () => ({}));
  const res = mockRes();
  await controller.deleteNotification(mockReq({ body: { notificationId: NID } }), res);
  assert.equal(res.statusCode, 200);
  const [events] = triggerBatch.mock.calls[0].arguments;
  assert.equal(events.length, 2);
  assert.equal(events[0].name, "notification:removed");
  assert.equal(events[0].data.notificationId, NID);
  assert.equal(events[0].channel, `private-user-${ME}`);
  assert.equal(events[1].name, "notification:unreadCount");
  assert.equal(events[1].data.count, 2);
});

test("clearNotifications deletes only READ notifications for the caller", async (t) => {
  const deleteMany = t.mock.method(Notification, "deleteMany", async () => ({}));
  t.mock.method(Notification, "countDocuments", async () => 4);
  t.mock.method(pusher, "trigger", async () => ({}));
  const res = mockRes();
  await controller.clearNotifications(mockReq(), res);
  assert.equal(res.statusCode, 200);
  const [filter] = deleteMany.mock.calls[0].arguments;
  assert.deepEqual(filter, { recipient: ME, isRead: true }, "未讀不可被一鍵清掉");
});

test("getUnreadCount counts only the caller's unread notifications", async (t) => {
  const countDocuments = t.mock.method(Notification, "countDocuments", async () => 7);
  const res = mockRes();
  await controller.getUnreadCount(mockReq(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.count, 7);
  const [filter] = countDocuments.mock.calls[0].arguments;
  assert.deepEqual(filter, { recipient: ME, isRead: false });
});

test("pusherAuth rejects a missing socket_id with 400", async () => {
  const res = mockRes();
  await controller.pusherAuth(mockReq({ body: { channel_name: `private-user-${ME}` } }), res);
  assert.equal(res.statusCode, 400);
});

test("pusherAuth authorizes the caller's own channel with a signed token", async () => {
  const res = mockRes();
  await controller.pusherAuth(
    mockReq({ body: { socket_id: "123.456", channel_name: `private-user-${ME}` } }),
    res
  );
  assert.equal(res.statusCode, 200);
  assert.ok(res.payload.auth.startsWith("test-key:"), "auth 必須用 app key 簽章");
});

test("pusherAuth blocks someone else's channel with 403 (BOLA)", async () => {
  const res = mockRes();
  await controller.pusherAuth(
    mockReq({ body: { socket_id: "1.2", channel_name: `private-user-${OTHER}` } }),
    res
  );
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.code, "FORBIDDEN");
});

test("pusherAuth rejects a malformed channel with 400", async () => {
  const res = mockRes();
  await controller.pusherAuth(
    mockReq({ body: { socket_id: "1.2", channel_name: "private-user-NOThex" } }),
    res
  );
  assert.equal(res.statusCode, 400);
});
