const express = require("express");
const router = express.Router();

const article = require("./modules/article");
const comment = require("./modules/comment");
const follow = require("./modules/follow");
const login = require("./modules/login");
const post = require("./modules/post");
const user = require("./modules/user");
const utility = require("./modules/utility");

router.use("/article", article);
router.use("/comment", comment);
router.use("/follow", follow);
router.use("/login", login);
router.use("/post", post);
router.use("/user", user);
router.use("/utility", utility);

module.exports = router;
