const express = require("express");
const router = express.Router();
const { get } = require("lodash");
const { validationResult } = require("express-validator");
const User = require("../../models/user");
const { validatePassword, validateEmail } = require("../../middleware/validator/userValidation");

/** 註冊 */
router.post("/signup", [validateEmail, validatePassword ], async (req, res) => {
  // 資料驗證
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const param = get(req, "body", {});
  const { email, password } = param;

  try {    
    // 確認email是否重複
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ errors: 'duplicate email' });
    }

    const newUser = await User.create({
      email,
      password,
      name: email.split('@')[0],
      avatar: "",
      userRole: 0,
      createdAt: new Date(),
      status: 0,
    });
    res.status(200).json(newUser);
  } catch (error) {
    res.status(400).json({ errors: error.message });
  }
});

/** 登入 */
router.post("/signin", async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const param = get(req, 'body', {});
  const { email, password } = param;
  try {
    // 確認使用者是否註冊    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'can not find the user' });
    }

    // 比對密碼
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'wrong password' });
    }

    res.status(200).json({ message: 'signin success', user });
  } catch (error) {
    res.status(400).json({ errors: error.message });
  }
});

module.exports = router;
