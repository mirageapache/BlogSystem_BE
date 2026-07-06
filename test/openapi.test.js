// spec 由 route 檔上的 @openapi 註解自動組成；swagger-jsdoc 遇到格式錯的註解會「安靜跳過」，
// 所以這裡守住兩件事：(1) 該有的端點真的被掃進 spec、(2) bearer 安全機制存在。
// 只驗 notification 一個模組當樣板；之後全鋪時再擴充已知端點清單即可。
const { test } = require("node:test");
const assert = require("node:assert/strict");
const spec = require("../docs/openapi");

test("openapi spec exposes the notification endpoints (annotations parsed, not silently dropped)", () => {
  assert.ok(spec.paths["/api/notification/delete"], "notification delete 應被掃進 spec");
  assert.ok(spec.paths["/api/notification/delete"].delete, "應標為 DELETE 方法");
  assert.ok(spec.paths["/api/notification/list"], "notification list 應被掃進 spec");
});

test("openapi spec declares a bearer security scheme for JWT-protected routes", () => {
  assert.equal(spec.components.securitySchemes.bearer.scheme, "bearer");
});

// 全鋪回歸守衛：每個模組挑一支代表端點，任一模組之後把註解寫壞（YAML 格式錯 → swagger-jsdoc
// 安靜丟掉整條 path），這裡就會紅。改路徑時同步更新此清單即可。
test("every API module is represented in the spec (rollout not silently dropped)", () => {
  const mustExist = {
    "/api/auth/signup": "post",
    "/api/user/own": "post",
    "/api/post/partial": "post",
    "/api/article/detail": "post",
    "/api/comment/create": "post",
    "/api/follow/follow": "post",
    "/api/utility/searchCount": "post",
    "/api/ai/post/create": "post",
    "/api/notification/delete": "delete",
  };
  for (const [path, method] of Object.entries(mustExist)) {
    assert.ok(spec.paths[path], `${path} 應被掃進 spec`);
    assert.ok(spec.paths[path][method], `${path} 應有 ${method.toUpperCase()} 操作`);
  }
});

test("security is declared per-endpoint: public omits it, protected requires bearer, AI uses aiKey", () => {
  // 公開端點不得標 security（否則前端會誤以為要登入）
  assert.equal(spec.paths["/api/post/partial"].post.security, undefined, "公開端點不標 security");
  // 需登入端點必須要求 bearer
  assert.deepEqual(spec.paths["/api/post/delete"].delete.security, [{ bearer: [] }], "刪除貼文需 bearer");
  // 選登端點：登入或不登入皆可（bearer 或空物件）
  assert.deepEqual(spec.paths["/api/post/detail"].post.security, [{ bearer: [] }, {}], "detail 為選登");
  // AI 內部端點用服務金鑰而非使用者 JWT
  assert.deepEqual(spec.paths["/api/ai/post/create"].post.security, [{ aiKey: [] }], "AI 端點用 aiKey");
});
