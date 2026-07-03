const { test } = require("node:test");
const assert = require("node:assert/strict");
const Comment = require("../models/comment");

test("retains parentComment for reply threads", () => {
  const parentId = "65f000000000000000000abc";
  const comment = new Comment({
    author: "65f000000000000000000001",
    content: "回覆內容",
    parentComment: parentId,
  });
  assert.equal(String(comment.parentComment), parentId, "parentComment should be a schema path");
});
