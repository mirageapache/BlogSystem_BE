const { test } = require("node:test");
const assert = require("node:assert/strict");
const service = require("../services/notificationService");

test("toClientShape exposes the public sender subset", () => {
  const shaped = service.toClientShape({
    _id: "n1",
    type: "comment_post",
    entityType: "post",
    entityId: "p1",
    preview: "hi",
    isRead: false,
    createdAt: "2026-06-29T08:00:00.000Z",
    sender: { _id: "u1", account: "alice", name: "Alice", avatar: "a.png", bgColor: "#abc", password: "secret" },
  });
  assert.deepEqual(shaped.sender, { _id: "u1", account: "alice", name: "Alice", avatar: "a.png", bgColor: "#abc" });
  assert.equal(shaped.type, "comment_post");
  assert.equal(shaped.entityId, "p1");
  assert.equal(shaped.password, undefined, "must not leak non-public sender fields onto the notification");
});

test("toClientShape tolerates a system notification with no sender", () => {
  const shaped = service.toClientShape({
    _id: "n2",
    type: "system",
    entityType: "system",
    title: "公告",
    preview: "內容",
    link: "/rules",
    isRead: false,
    createdAt: "2026-06-29T08:00:00.000Z",
    sender: null,
  });
  assert.equal(shaped.sender, null);
  assert.equal(shaped.title, "公告");
});

test("isSafeLink accepts in-site paths, https URLs and empty", () => {
  assert.equal(service.isSafeLink(""), true);
  assert.equal(service.isSafeLink("/rules"), true);
  assert.equal(service.isSafeLink("https://example.com/x"), true);
  assert.equal(service.isSafeLink("http://example.com"), true);
});

test("isSafeLink rejects dangerous schemes and protocol-relative urls", () => {
  assert.equal(service.isSafeLink("javascript:alert(1)"), false);
  assert.equal(service.isSafeLink("data:text/html,<script>"), false);
  assert.equal(service.isSafeLink("//evil.com"), false);
});

test("createNotification skips self-actions before touching the DB", async () => {
  const id = "65f000000000000000000001";
  const result = await service.createNotification({
    recipient: id,
    sender: id,
    type: "like_post",
    entityType: "post",
    entityId: "65f0000000000000000000aa",
  });
  assert.equal(result, null, "acting on your own content should not create a notification");
});

test("createSystemNotification rejects an unsafe link before writing", async () => {
  await assert.rejects(
    () => service.createSystemNotification({
      recipient: "65f000000000000000000001",
      title: "x",
      link: "javascript:alert(1)",
    }),
    /INVALID_LINK/
  );
});
