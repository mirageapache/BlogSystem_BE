// 刪除貼文/文章的連帶清理（cascade）測試：只 stub 真正的外部邊界（Mongoose statics 與 pusher client），
// controller 的授權/連帶清理流程與 service 的 removeEntityNotifications 全部跑真的。無 DB、無網路、可重複。
process.env.PUSHER_APP_ID = process.env.PUSHER_APP_ID || "test-app";
process.env.PUSHER_KEY = process.env.PUSHER_KEY || "test-key";
process.env.PUSHER_SECRET = process.env.PUSHER_SECRET || "test-secret";
process.env.PUSHER_CLUSTER = process.env.PUSHER_CLUSTER || "ap3";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const postController = require("../controllers/postController");
const articleController = require("../controllers/articleController");
const Post = require("../models/post");
const Article = require("../models/article");
const Comment = require("../models/comment");
const Notification = require("../models/Notification");
const notificationService = require("../services/notificationService");
const { pusher } = notificationService;

const ME = "65f000000000000000000001"; // 呼叫者（JWT 推導）＝母文作者
const OTHER = "65f0000000000000000000ff"; // 另一位使用者（非作者）
const POST_ID = "65f0000000000000000000b0";
const ART_ID = "65f0000000000000000000c0";
const C1 = "65f0000000000000000000d1";
const C2 = "65f0000000000000000000d2";

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
// Post.findById(id).select(...).lean() 的鏈式回傳
function findByIdReturning(doc) {
  return () => ({ select: () => ({ lean: async () => doc }) });
}

// ---- service: removeEntityNotifications ----

test("removeEntityNotifications deletes every notification for the entity and refreshes each recipient's badge", async (t) => {
  t.mock.method(Notification, "distinct", async () => [ME, OTHER]);
  const deleteMany = t.mock.method(Notification, "deleteMany", async () => ({ deletedCount: 3 }));
  t.mock.method(Notification, "countDocuments", async () => 0);
  const trigger = t.mock.method(pusher, "trigger", async () => ({}));

  const n = await notificationService.removeEntityNotifications("post", POST_ID);

  assert.equal(n, 3);
  const [filter] = deleteMany.mock.calls[0].arguments;
  assert.deepEqual(filter, { entityType: "post", entityId: POST_ID }, "刪除範圍＝指向該母文的所有通知（不分收件者）");
  assert.equal(trigger.mock.callCount(), 2, "每位受影響的收件者各刷新一次徽章");
});

test("removeEntityNotifications still reports the delete count when a badge push throws", async (t) => {
  t.mock.method(Notification, "distinct", async () => [ME]);
  t.mock.method(Notification, "deleteMany", async () => ({ deletedCount: 1 }));
  t.mock.method(Notification, "countDocuments", async () => 0);
  t.mock.method(pusher, "trigger", async () => { throw new Error("pusher down"); });
  t.mock.method(console, "error", () => {}); // 吞掉預期的錯誤 log

  const n = await notificationService.removeEntityNotifications("post", POST_ID);
  assert.equal(n, 1, "推播失敗不可影響已完成的 DB 清理");
});

// ---- controller: deletePost cascade ----

test("deletePost cascades: removes the post's comments, the post, and all its notifications", async (t) => {
  t.mock.method(Post, "findById", findByIdReturning({ author: ME, comments: [C1, C2] }));
  const findByIdAndDelete = t.mock.method(Post, "findByIdAndDelete", async () => ({}));
  const commentDeleteMany = t.mock.method(Comment, "deleteMany", async () => ({ deletedCount: 2 }));
  const removeEntity = t.mock.method(notificationService, "removeEntityNotifications", async () => 2);
  const res = mockRes();

  await postController.deletePost(mockReq({ body: { postId: POST_ID } }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(findByIdAndDelete.mock.callCount(), 1, "貼文本身仍要刪");
  const [commentFilter] = commentDeleteMany.mock.calls[0].arguments;
  assert.deepEqual(commentFilter, { _id: { $in: [C1, C2] } }, "清掉掛在此貼文的所有留言");
  const [etype, eid] = removeEntity.mock.calls[0].arguments;
  assert.equal(etype, "post");
  assert.equal(eid, POST_ID);
});

test("deletePost still 403s for a non-owner and cascades nothing", async (t) => {
  t.mock.method(Post, "findById", findByIdReturning({ author: OTHER, comments: [C1] }));
  const findByIdAndDelete = t.mock.method(Post, "findByIdAndDelete", async () => ({}));
  const commentDeleteMany = t.mock.method(Comment, "deleteMany", async () => ({}));
  const removeEntity = t.mock.method(notificationService, "removeEntityNotifications", async () => 0);
  const res = mockRes();

  await postController.deletePost(mockReq({ body: { postId: POST_ID } }), res);

  assert.equal(res.statusCode, 403);
  assert.equal(findByIdAndDelete.mock.callCount(), 0);
  assert.equal(commentDeleteMany.mock.callCount(), 0);
  assert.equal(removeEntity.mock.callCount(), 0, "沒權限刪就不該動任何連帶資料");
});

test("deletePost returns 200 even when cascade cleanup throws (delete already committed)", async (t) => {
  t.mock.method(Post, "findById", findByIdReturning({ author: ME, comments: [C1] }));
  t.mock.method(Post, "findByIdAndDelete", async () => ({}));
  t.mock.method(Comment, "deleteMany", async () => { throw new Error("db blip"); });
  t.mock.method(notificationService, "removeEntityNotifications", async () => 0);
  t.mock.method(console, "error", () => {});
  const res = mockRes();

  await postController.deletePost(mockReq({ body: { postId: POST_ID } }), res);
  assert.equal(res.statusCode, 200, "連帶清理失敗不可把已成功的刪除變 500");
});

// ---- controller: deleteArticle cascade ----

test("deleteArticle cascades: removes the article's comments, the article, and all its notifications", async (t) => {
  t.mock.method(Article, "findById", findByIdReturning({ author: ME, comments: [C1, C2] }));
  const findByIdAndDelete = t.mock.method(Article, "findByIdAndDelete", async () => ({}));
  const commentDeleteMany = t.mock.method(Comment, "deleteMany", async () => ({ deletedCount: 2 }));
  const removeEntity = t.mock.method(notificationService, "removeEntityNotifications", async () => 2);
  const res = mockRes();

  await articleController.deleteArticle(mockReq({ body: { articleId: ART_ID } }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(findByIdAndDelete.mock.callCount(), 1);
  const [commentFilter] = commentDeleteMany.mock.calls[0].arguments;
  assert.deepEqual(commentFilter, { _id: { $in: [C1, C2] } });
  const [etype, eid] = removeEntity.mock.calls[0].arguments;
  assert.equal(etype, "article");
  assert.equal(eid, ART_ID);
});

test("deleteArticle still 403s for a non-owner and cascades nothing", async (t) => {
  t.mock.method(Article, "findById", findByIdReturning({ author: OTHER, comments: [C1] }));
  const findByIdAndDelete = t.mock.method(Article, "findByIdAndDelete", async () => ({}));
  const commentDeleteMany = t.mock.method(Comment, "deleteMany", async () => ({}));
  const removeEntity = t.mock.method(notificationService, "removeEntityNotifications", async () => 0);
  const res = mockRes();

  await articleController.deleteArticle(mockReq({ body: { articleId: ART_ID } }), res);

  assert.equal(res.statusCode, 403);
  assert.equal(findByIdAndDelete.mock.callCount(), 0);
  assert.equal(commentDeleteMany.mock.callCount(), 0);
  assert.equal(removeEntity.mock.callCount(), 0);
});
