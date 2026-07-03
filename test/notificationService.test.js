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

test("clampLimit defaults to 15 and clamps to 1..50", () => {
  assert.equal(service.clampLimit(undefined), 15, "missing → default 15");
  assert.equal(service.clampLimit(0), 15, "0 is falsy → default 15");
  assert.equal(service.clampLimit("abc"), 15, "non-numeric → default 15");
  assert.equal(service.clampLimit(-5), 1, "negative clamps up to 1");
  assert.equal(service.clampLimit(100), 50, "huge clamps down to 50");
  assert.equal(service.clampLimit("20"), 20, "numeric string passes through");
  assert.equal(service.clampLimit(30), 30);
});

test("clampPage defaults to 1 and never goes below 1", () => {
  assert.equal(service.clampPage(undefined), 1);
  assert.equal(service.clampPage(0), 1);
  assert.equal(service.clampPage(-3), 1);
  assert.equal(service.clampPage("4"), 4);
  assert.equal(service.clampPage(5), 5);
});

test("nextPageFor returns next page only when more rows remain", () => {
  assert.equal(service.nextPageFor(1, 15, 20), 2, "page 1 of 20 → has page 2");
  assert.equal(service.nextPageFor(2, 15, 20), 0, "page 2 covers all 20 → no next");
  assert.equal(service.nextPageFor(1, 15, 15), 0, "exactly one full page → no next");
  assert.equal(service.nextPageFor(1, 15, 0), 0, "empty → no next");
});

test("classifyChannelAuth only authorizes a member's own well-formed channel", () => {
  const me = "65f000000000000000000001";
  const other = "65f0000000000000000000ff";
  assert.equal(service.classifyChannelAuth(`private-user-${me}`, me), "ok", "own channel → ok");
  assert.equal(service.classifyChannelAuth(`private-user-${other}`, me), "forbidden", "someone else's channel → BOLA, forbidden");
  assert.equal(service.classifyChannelAuth("private-user-not-an-objectid", me), "invalid", "malformed id → invalid");
  assert.equal(service.classifyChannelAuth("presence-user-" + me, me), "invalid", "wrong channel prefix → invalid");
  assert.equal(service.classifyChannelAuth(`private-user-${me.toUpperCase()}`, me), "invalid", "uppercase hex isn't a valid ObjectId form → invalid");
  assert.equal(service.classifyChannelAuth(undefined, me), "invalid", "non-string → invalid");
});
