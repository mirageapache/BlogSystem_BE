const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { get } = require("lodash");
// --- functions ---
const { validationResult } = require("express-validator");
const {
  validateEmail,
  validatePassword,
  checkAccountExist,
} = require("../../middleware/validator/userValidation");
const User = require("../../models/user");

/** 註冊 */
router.post("/signup", [validateEmail, validatePassword], async (req, res) => {
  // 資料驗證
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(401).json({ message: errors.array() });
  }

  const param = get(req, "body", {});
  const { email, password, confirmPassword } = param;
  let account = await checkAccountExist(email.split("@")[0]);
  console.log(account);
  // 驗證密碼&確認密碼
  if (password !== confirmPassword) {
    return res.status(401).json({ message: "密碼與確認密碼不相符！" });
  }

  try {
    // 驗證email是否重複
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(401).json({ message: "該Email已存在！" });

    await User.create({
      email,
      password,
      account: account,
      name: email.split("@")[0],
      avatar: "",
      userRole: 0,
      createdAt: new Date(),
      status: 0,
    });
    return res.status(200).json({ message: "success" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

/** 登入 */
router.post("/signin", async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(401).json({ message: errors.array() });
  }
  const param = get(req, "body", {});
  const { email, password } = param;
  try {
    // 確認使用者是否註冊
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email尚未註冊！" });
    }

    // 比對密碼
    if (password !== user.password) {
      return res.status(401).json({ message: "密碼錯誤！" });
    }

    // 產生並回傳 JWT token
    const authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    return res.status(200).json({ message: "signin success", authToken });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
