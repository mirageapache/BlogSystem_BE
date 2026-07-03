const { test } = require("node:test");
const assert = require("node:assert/strict");
const Notification = require("../models/Notification");

test("requires type", () => {
  const err = new Notification({ recipient: "65f000000000000000000001" }).validateSync();
  assert.ok(err?.errors?.type, "missing type should be a validation error");
});

test("requires recipient", () => {
  const err = new Notification({ type: "follow" }).validateSync();
  assert.ok(err?.errors?.recipient, "missing recipient should be a validation error");
});

test("rejects unknown type", () => {
  const err = new Notification({
    recipient: "65f000000000000000000001",
    type: "bogus",
  }).validateSync();
  assert.ok(err?.errors?.type, "type outside enum should be a validation error");
});

test("system notification is valid without a sender", () => {
  const err = new Notification({
    recipient: "65f000000000000000000001",
    type: "system",
  }).validateSync();
  assert.equal(err, undefined, "system type with no sender should validate");
});

test("caps title length", () => {
  const err = new Notification({
    recipient: "65f000000000000000000001",
    type: "system",
    title: "x".repeat(101),
  }).validateSync();
  assert.ok(err?.errors?.title, "over-long title should be a validation error");
});

test("caps preview length", () => {
  const err = new Notification({
    recipient: "65f000000000000000000001",
    type: "comment_post",
    preview: "x".repeat(201),
  }).validateSync();
  assert.ok(err?.errors?.preview, "over-long preview should be a validation error");
});

test("caps link length", () => {
  const err = new Notification({
    recipient: "65f000000000000000000001",
    type: "system",
    link: "/" + "x".repeat(500),
  }).validateSync();
  assert.ok(err?.errors?.link, "over-long link should be a validation error");
});
