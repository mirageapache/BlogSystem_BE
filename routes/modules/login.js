const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { get } = require("lodash");
// --- functions ---
const { validationResult } = require("express-validator");
const {
  validatePassword,
  validateEmail,
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

  // 驗證密碼&確認密碼
  bcrypt.compareSync(confirmPassword, password, (result) => {
    console.log(confirmPassword, password);
    console.log(result);
    if (!result) {
      return res.status(401).json({ message: "密碼與確認密碼不相符！" });
    }
  });

  try {
    // 驗證email是否重複
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(401).json({ message: "該Email已存在！" });
    }

    await User.create({
      email,
      password,
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
    bcrypt
      .compareSync(password, user.password)
      .then((isMatch) => {
        console.log(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ message: "密碼錯誤！" });
        } else {
          // 產生 JWT token
          const authToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            {
              expiresIn: "1h",
            }
          );

          return res.status(200).json({ message: "signin success", authToken });
        }
      })
      .catch((error) => {
        return console.error("Error comparing passwords:", error);
      });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;