const express = require("express");
const router = express.Router();

const article = require("./modules/article");
const comment = require("./modules/comment");
const follow = require("./modules/follow");
const auth = require("./modules/auth");
const post = require("./modules/post");
const user = require("./modules/user");
const utility = require("./modules/utility");

router.use("/article", article);
router.use("/comment", comment);
router.use("/follow", follow);
router.use("/auth", auth);
router.use("/post", post);
router.use("/user", user);
router.use("/utility", utility);

module.exports = router;
