// 文章封面圖：create/update/delete 的 cloudinary 分支。只 stub 外部邊界
// (Mongoose statics 與 fileUtils 的 cloudinary 函式)，controller 邏輯跑真的。無 DB、無網路。
const { test } = require("node:test");
const assert = require("node:assert/strict");

const articleController = require("../controllers/articleController");
const Article = require("../models/article");
const Comment = require("../models/comment");
const fileUtils = require("../middleware/fileUtils");
const notificationService = require("../services/notificationService");

const ME = "65f000000000000000000001";
const ART_ID = "65f0000000000000000000c0";
const URL = "https://res.cloudinary.com/x/new.jpg";
const PID = "blogSystem/images/abc";

function mockReq({ userId = ME, body = {}, file } = {}) {
  return { user: { userId }, body, file };
}
function mockRes() {
  return {
    statusCode: 0,
    payload: undefined,
    status(c) { this.statusCode = c; return this; },
    json(p) { this.payload = p; return this; },
  };
}
// Article.findById(id).select(...).lean()
function findByIdReturning(doc) {
  return () => ({ select: () => ({ lean: async () => doc }) });
}
// Article.findByIdAndUpdate(id, data, opts).lean()：擷取寫入的 data
function captureUpdate(sink) {
  return (id, data) => { sink.data = data; return { lean: async () => data }; };
}

// ---- create ----
test("createArticle uploads the file and stores the cloudinary url + public_id", async (t) => {
  const upload = t.mock.method(fileUtils, "cloudinaryUpload", async () => ({ secure_url: URL, public_id: PID }));
  let created;
  t.mock.method(Article, "create", async (doc) => { created = doc; return doc; });
  const res = mockRes();
  await articleController.createArticle(mockReq({ file: { buffer: Buffer.from("x") }, body: { title: "t", content: "c" } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(upload.mock.callCount(), 1);
  assert.equal(created.coverImage, URL);
  assert.equal(created.coverImageId, PID);
});

test("createArticle without a file stores empty cover fields and never calls cloudinary", async (t) => {
  const upload = t.mock.method(fileUtils, "cloudinaryUpload", async () => ({}));
  let created;
  t.mock.method(Article, "create", async (doc) => { created = doc; return doc; });
  const res = mockRes();
  await articleController.createArticle(mockReq({ body: { title: "t", content: "c" } }), res);
  assert.equal(upload.mock.callCount(), 0);
  assert.equal(created.coverImage, "");
  assert.equal(created.coverImageId, "");
});

test("createArticle ignores coverImage/coverImageId injected in the body (not trusted)", async (t) => {
  t.mock.method(fileUtils, "cloudinaryUpload", async () => ({}));
  let created;
  t.mock.method(Article, "create", async (doc) => { created = doc; return doc; });
  const res = mockRes();
  await articleController.createArticle(mockReq({ body: { title: "t", content: "c", coverImage: "evil", coverImageId: "evil" } }), res);
  assert.equal(created.coverImage, "");
  assert.equal(created.coverImageId, "");
});

// ---- update ----
test("updateArticle replaces the cover via cloudinaryUpdate when one already exists", async (t) => {
  t.mock.method(Article, "findById", findByIdReturning({ author: ME, content: "c", coverImage: "old", coverImageId: PID }));
  const update = t.mock.method(fileUtils, "cloudinaryUpdate", async () => ({ secure_url: URL, public_id: PID }));
  const upload = t.mock.method(fileUtils, "cloudinaryUpload", async () => ({}));
  const sink = {};
  t.mock.method(Article, "findByIdAndUpdate", captureUpdate(sink));
  const res = mockRes();
  await articleController.updateArticle(mockReq({ file: { buffer: Buffer.from("x") }, body: { articleId: ART_ID, content: "c" } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(update.mock.callCount(), 1);
  assert.equal(upload.mock.callCount(), 0, "已有圖用 update overwrite，不重新 upload");
  assert.equal(sink.data.coverImage, URL);
  assert.equal(sink.data.coverImageId, PID);
});

test("updateArticle uploads a fresh cover when none exists yet", async (t) => {
  t.mock.method(Article, "findById", findByIdReturning({ author: ME, content: "c", coverImage: "", coverImageId: "" }));
  const upload = t.mock.method(fileUtils, "cloudinaryUpload", async () => ({ secure_url: URL, public_id: PID }));
  const update = t.mock.method(fileUtils, "cloudinaryUpdate", async () => ({}));
  const sink = {};
  t.mock.method(Article, "findByIdAndUpdate", captureUpdate(sink));
  const res = mockRes();
  await articleController.updateArticle(mockReq({ file: { buffer: Buffer.from("x") }, body: { articleId: ART_ID, content: "c" } }), res);
  assert.equal(upload.mock.callCount(), 1);
  assert.equal(update.mock.callCount(), 0, "沒有既有圖時走 upload 而非 overwrite");
  assert.equal(sink.data.coverImage, URL);
  assert.equal(sink.data.coverImageId, PID);
});

test("updateArticle removeImage 'true' clears the cover and calls cloudinaryRemove", async (t) => {
  t.mock.method(Article, "findById", findByIdReturning({ author: ME, content: "c", coverImage: "old", coverImageId: PID }));
  const remove = t.mock.method(fileUtils, "cloudinaryRemove", async () => ({ result: "ok" }));
  const sink = {};
  t.mock.method(Article, "findByIdAndUpdate", captureUpdate(sink));
  const res = mockRes();
  await articleController.updateArticle(mockReq({ body: { articleId: ART_ID, content: "c", removeImage: "true" } }), res);
  assert.equal(remove.mock.callCount(), 1);
  assert.equal(remove.mock.calls[0].arguments[0], PID, "用既有 public_id 刪 cloudinary");
  assert.equal(sink.data.coverImage, "");
  assert.equal(sink.data.coverImageId, "");
});

test("updateArticle keeps the existing cover when no file and no removeImage", async (t) => {
  t.mock.method(Article, "findById", findByIdReturning({ author: ME, content: "c", coverImage: "keep", coverImageId: PID }));
  const upload = t.mock.method(fileUtils, "cloudinaryUpload", async () => ({}));
  const update = t.mock.method(fileUtils, "cloudinaryUpdate", async () => ({}));
  const remove = t.mock.method(fileUtils, "cloudinaryRemove", async () => ({}));
  const sink = {};
  t.mock.method(Article, "findByIdAndUpdate", captureUpdate(sink));
  const res = mockRes();
  await articleController.updateArticle(mockReq({ body: { articleId: ART_ID, content: "c" } }), res);
  assert.equal(upload.mock.callCount() + update.mock.callCount() + remove.mock.callCount(), 0);
  assert.equal(sink.data.coverImage, "keep");
  assert.equal(sink.data.coverImageId, PID);
});

test("updateArticle ignores coverImage/coverImageId injected in the body", async (t) => {
  t.mock.method(Article, "findById", findByIdReturning({ author: ME, content: "c", coverImage: "keep", coverImageId: PID }));
  const sink = {};
  t.mock.method(Article, "findByIdAndUpdate", captureUpdate(sink));
  const res = mockRes();
  await articleController.updateArticle(mockReq({ body: { articleId: ART_ID, content: "c", coverImage: "evil", coverImageId: "evil" } }), res);
  assert.equal(sink.data.coverImage, "keep", "封面以 DB 既有值為基礎，不採信 body");
  assert.equal(sink.data.coverImageId, PID);
});

// ---- delete ----
test("deleteArticle removes the cover image from cloudinary (best-effort)", async (t) => {
  t.mock.method(Article, "findById", findByIdReturning({ author: ME, comments: [], coverImageId: PID }));
  t.mock.method(Article, "findByIdAndDelete", async () => ({}));
  t.mock.method(Comment, "deleteMany", async () => ({}));
  t.mock.method(notificationService, "removeEntityNotifications", async () => 0);
  const remove = t.mock.method(fileUtils, "cloudinaryRemove", async () => ({ result: "ok" }));
  const res = mockRes();
  await articleController.deleteArticle(mockReq({ body: { articleId: ART_ID } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(remove.mock.callCount(), 1);
  assert.equal(remove.mock.calls[0].arguments[0], PID);
});
