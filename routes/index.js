const express = require("express");
const router = express.Router();

const article = require("./modules/article");
const comment = require("./modules/comment");
const follow = require("./modules/follow");
const auth = require("./modules/auth");
const post = require("./modules/post");
const user = require("./modules/user");
const utility = require("./modules/utility");

router.use("/api/article", article);
router.use("/api/comment", comment);
router.use("/api/follow", follow);
router.use("/api/auth", auth);
router.use("/api/post", post);
router.use("/api/user", user);
router.use("/api/utility", utility);

module.exports = router;
