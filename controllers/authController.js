const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const moment = require("moment-timezone");
const { get } = require("lodash");
const { validationResult } = require("express-validator");
// --- modals ---
const User = require("../models/user");
const Follow = require("../models/follow");
const UserSetting = require("../models/userSetting");
// --- functions ---
const { getRandomColor } = require("../middleware/commonUtils");
const {
  checkAccountExist,
  emailExisting,
} = require("../middleware/validator/userValidation");

const loginController = {
  /** 註冊 */
  signUp: async (req, res) => {
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
      return res.status(401).json({ type: 'confrimPassword', message: "密碼與確認密碼不相符！" });
    }

    try {
      // 檢查email是否已存在
      if(emailExisting(email)) return res.status(401).json({ type: 'email', message: "Email已存在!" });

      const salt = Number.parseInt(process.env.SALT_ROUNDS);
      const hashedPwd = bcrypt.hashSync(password, salt);
      const localTime = moment.tz(new Date(), "Asia/Taipei").toDate(); // 轉換時區時間

      // 建立User資料
      const user = await User.create({
        email,
        password: hashedPwd,
        account: account,
        name: email.split("@")[0],
        avatar: "",
        bgColor: getRandomColor(),
        userRole: 0,
        createdAt: localTime,
        status: 0,
      });
      // 初始化User追蹤資料
      await Follow.create({
        user: user._id.toString(),
        following: [],
        follower: [],
      });
      // 初始化User設定
      await UserSetting.create({
        user: user._id.toString(),
        language: "zh",
        theme: 0,
        emailPrompt: true,
        mobilePrompt: false,
      });
      return res.status(200).json({ message: "success" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
  /** 登入 */
  signIn: async (req, res) => {
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
        expiresIn: "7d", // 設定token有效時間
      });

      return res.status(200).json({
        message: "signin success",
        authToken,
        userData: {
          userId: user._id,
          account: user.account,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          status: user.status,
          ...userSetting,
        },
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
  /** 身分驗證
   * 使用userId及authToken進行驗證
   */
  checkAuth: async (req, res) => {
    try {
      const user = await User.findById(req.body.id).lean();
      if (!user) {
        return res.status(404).json({ message: "authorization failed" });
      }
      return res.status(200).json({ message: "authorization confrimed" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
  /** 密碼加密(測試用) */
  passwordEncode: async (req, res) => {
    const password = req.body.password;
    const hashedPwd = bcrypt.hashSync(password, process.env.SALT_ROUNDS);
    return res.status(200).json({ hashedPwd });
  },
};

module.exports = loginController;
