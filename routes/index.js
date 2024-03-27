const express = require("express");
const router = express.Router();

const article = require("./modules/article");
const comment = require("./modules/comment");
const login = require("./modules/login");
const user = require("./modules/user");
const utility = require("./modules/utility");

router.use("/article", article);
router.use("/comment", comment);
router.use("/login", login);
router.use("/user", user);
router.use("/utility", utility);

module.exports = router;
