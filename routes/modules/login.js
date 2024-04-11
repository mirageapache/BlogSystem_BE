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
// --- models ---
const User = require("../../models/user");
const FollowShip = require("../../models/followShip");
const UserSetting = require("../../models/userSetting");

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
  // 驗證密碼&確認密碼
  if (password !== confirmPassword) {
    return res.status(401).json({ message: "密碼與確認密碼不相符！" });
  }

  try {
    // 驗證email是否重複
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(401).json({ message: "該Email已存在！" });

    const salt = Number.parseInt(process.env.SALT_ROUNDS);
    const hashedPwd = bcrypt.hashSync(password, salt);

    // 建立User資料
    const user = await User.create({
      email,
      password: hashedPwd,
      account: account,
      name: email.split("@")[0],
      avatar: "",
      userRole: 0,
      createdAt: new Date(),
      status: 0,
    });
    // 初始化User追蹤資料
    await FollowShip.create({
      user: user._id,
      following: [],
      follower: [],
    });
    // 初始化User設定
    await UserSetting.create({
      user: user._id,
      language: "zh",
      theme: 0,
      tags: [],
      emailPrompt: true,
      mobilePrompt: true,
    });

    return res.status(200).json({ message: "success" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

/** 登入 */
router.post("/signin", [validateEmail, validatePassword], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(401).json({ message: errors.array() });
  }
  const param = get(req, "body", {});
  const { email, password } = param;
  try {
    // 確認使用者是否註冊
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(404).json({ message: "Email尚未註冊！" });
    }

    // 比對密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "密碼錯誤！" });
    }

    const userSetting = await UserSetting.findOne({ user: user._id }).lean();

    // 產生並回傳 JWT token
    const authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(200).json({
      message: "signin success",
      authToken,
      userData: {
        uid: user._id,
        account: user.account,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        theme: userSetting.theme,
      },
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

/** 密碼加密(測試用) */
router.get("/hashPwd", async (req, res) => {
  const password = req.body.password;
  const hashedPwd = hashSync(password, process.env.SALT_ROUNDS);
  res.status(200).json({ hashedPwd });
});

module.exports = router;
