const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const moment = require("moment-timezone");
const { get, isEmpty } = require("lodash");
const { validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
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

const loginController = {
  /** 註冊 */
  signUp: async (req, res) => {
    // 資料驗證
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(401).json({ message: errors.array() });

    const param = get(req, "body", {});
    const { email, password, confirmPassword } = param;
    let account = await checkAccountExist(email.split("@")[0]);
    // 驗證密碼&確認密碼
    if (password !== confirmPassword) {
      return res
        .status(401)
        .json({ type: "confrimPassword", message: "密碼與確認密碼不相符！" });
    }

    try {
      // 檢查email是否已存在
      if (emailExisted(email))
        return res.status(401).json({ type: "email", message: "Email已存在!" });

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
    if (!errors.isEmpty())
      return res.status(401).json({ message: errors.array() });

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
  /** 找回密碼 */
  findPassword: async (req, res) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ email }).lean();
      if (!user) return res.status(404).json({ message: "Email輸入錯誤!" });

      const urlToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "10m",
      });

      const transporter = nodemailer.createTransport({
        service: "hotmail",
        // host: "smtp-mail.outlook.com",
        // port: 587,
        // secure: false, // 使用TLS
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PWD,
        },
      });

      const resetPasswordLink = `${process.env.FRONTEND_URL}/reset_password/${urlToken}`;
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email, // 使用者的電子郵件
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
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
  /** 重設密碼 */
  resetPassword: async (req, res) => {
    const { token, password, confirmPassword } = req.body;

    if (!isEqual(password, confirmPassword)) {
      return res
        .status(401)
        .json({ type: "confrimPassword", message: "密碼與確認密碼不相符！" });
    }

    try {
      // 驗證 token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) return res.status(400).json({ message: "用戶不存在" });

      // 更新用戶密碼
      user.password = password;
      await user.save();

      return res.status(200).json({ message: "密碼重設成功" });
    } catch (error) {
      return res.status(400).json({ message: "重設密碼鏈接無效或已過期" });
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
