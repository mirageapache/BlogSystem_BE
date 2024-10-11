const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const moment = require("moment-timezone");
const { get, isEmpty, isEqual } = require("lodash");
const { validationResult } = require("express-validator");
const formData = require("form-data");
const Mailgun = require("mailgun.js");
// --- modals ---
const User = require("../models/user");
const Follow = require("../models/follow");
const UserSetting = require("../models/userSetting");
// --- functions ---
const { getRandomColor } = require("../middleware/commonUtils");
const {
  checkAccountExist,
  emailExisted,
} = require("../middleware/validator/userValidation");

// mailgun setting
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "ReactBlog",
  key: process.env.MAILGUN_API_KEY,
});

const loginController = {
  /** 註冊 */
  signUp: async (req, res) => {
    // 資料驗證
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(401).json({ code: "VALIDATION_ERR", message: errors.array() });

    const param = get(req, "body", {});
    const { email, password, confirmPassword } = param;
    let account = await checkAccountExist(email.split("@")[0]);
    // 驗證密碼&確認密碼
    if (password !== confirmPassword) {
      return res
        .status(401)
        .json({ code: "PWD_UNMATCH", message: "密碼與確認密碼不相符" });
    }

    try {
      // 檢查email是否已存在
      const checkEmail = await User.findOne({ email }).lean();
      if (checkEmail) return res.status(401).json({ code: "EMAIL_EXISTED", message: "Email已被註冊" });

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

      await UserSetting.create({
        user: user._id,
        language: "zh",
        theme: 0,
        emailPrompt: true,
        mobilePrompt: false,
      });

      return res.status(200).json({ code: "SUCCESS", message: "註冊成功" });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 登入 */
  signIn: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(401).json({ code: "VALIDATION_ERR", message: errors.array() });

    const param = get(req, "body", {});
    const { email, password } = param;
    try {
      // 確認使用者是否註冊
      const user = await User.findOne({ email }).lean();
      if (!user) return res.status(404).json({ code: "EMAIL_NOT_EXIST", message: "Email尚未註冊" });

      // 比對密碼
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ code: "WRONG_PWD", message: "密碼錯誤" });
      }

      const userSetting = await UserSetting.findOne({ user: user._id }).lean();
      // 產生並回傳 JWT token
      const authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d", // 設定token有效時間
      });

      return res.status(200).json({
        code: "SUCCESS",
        message: "登入成功",
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
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 找回密碼 */
  findPassword: async (req, res) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ email }).lean();
      if (!user) return res.status(404).json({ code: "EMAIL_NOT_EXIST", message: "Email輸入錯誤或未註冊" });
      const urlToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "10m",
      });
      const resetPasswordLink = `${process.env.FRONTEND_URL}/reset_password/${urlToken}`;

      // Mailgun 郵件內容
      mg.messages
        .create(process.env.MAILGUN_DOMAIN, {
          from: `ReactBlog <noreply@${process.env.MAILGUN_DOMAIN}>`,
          to: user.email,
          subject: "ReactBlog - 重設您的密碼",
          html: `
            <p>你已提出重設密碼的需求，請點擊下方連結來重設密碼</p>
            <p>提醒你，連結僅10分鐘有效！</p>
            <a href="${resetPasswordLink}">${resetPasswordLink}</a>
            <br>
            <br>
            <hr>
            <p>-若你未提出重設密碼要求，請忽略本信件-</p>
          `,
          // 啟用追蹤功能（選用）
          "o:tracking": "yes",
          "o:tracking-clicks": "yes",
          "o:tracking-opens": "yes",
        })
        .then(() => {
          return res.status(200).json({ code: "SUCCESS", message: "已發送重置密碼Email" });
        })
        .catch((err) => {
          console.log(err);
          return res.status(500).json({ code: "SEND_EMAIL_ERR", message: err.message });
        });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 重設密碼 */
  resetPassword: async (req, res) => {
    const token = req.header("Authorization").split(" ")[1];
    if (!token) return res.status(401).json({ code: "NO_TOKEN", message: "未提供驗證資訊" });

    try {
      // 驗證 token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) return res.status(401).json({ code: "TOKEN_ERR", message: "驗證錯誤" });

      const { password, confirmPassword } = req.body;
      if (!isEqual(password, confirmPassword)) {
        return res
        .status(401)
        .json({ code: "PWD_UNMATCH", message: "新密碼與確認密碼不相符" });
      }

      // 更新用戶密碼
      const salt = Number.parseInt(process.env.SALT_ROUNDS);
      const hashedPwd = bcrypt.hashSync(password, salt);
      await User.findByIdAndUpdate(user.id, { password: hashedPwd });

      return res.status(200).json({ code: "SUCCESS", message: "密碼重設成功" });
    } catch (error) {
      return res.status(500).json({ code: "EXPIRE", message: "重設密碼連接無效或已過期" });
    }
  },
  /** 身分驗證
   * 使用userId及authToken進行驗證
   */
  checkAuth: async (req, res) => {
    try {
      const user = await User.findById(req.body.id).lean();
      if (!user) {
        return res.status(401).json({ code: "TOKEN_ERR", message: "驗證錯誤" });
      }
      return res.status(200).json({ code: "SUCCESS", message: "驗證成功" });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 密碼加密(測試用) */
  passwordEncode: async (req, res) => {
    const password = req.body.password;
    const hashedPwd = bcrypt.hashSync(password, process.env.SALT_ROUNDS);
    return res.status(200).json({ code: "SUCCESS", hashedPwd });
  },
};

module.exports = loginController;
