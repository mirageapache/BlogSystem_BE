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
      return res
        .status(401)
        .json({ code: "VALIDATION_ERR", message: errors.array() });

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
      if (checkEmail)
        return res
          .status(401)
          .json({ code: "EMAIL_EXISTED", message: "Email已被註冊" });

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
      if (error.code === 11000) {
        return res
          .status(401)
          .json({ code: "EMAIL_EXISTED", message: "Email已被註冊" });
      }
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 登入 */
  signIn: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res
        .status(401)
        .json({ code: "VALIDATION_ERR", message: errors.array() });

    const param = get(req, "body", {});
    const { email, password } = param;
    try {
      // 確認使用者是否註冊
      const user = await User.findOne({ email }).lean();
      if (!user)
        return res
          .status(404)
          .json({ code: "EMAIL_NOT_EXIST", message: "Email尚未註冊" });

      // 比對密碼
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ code: "WRONG_PWD", message: "密碼錯誤" });
      }

      const userSetting = await UserSetting.findOne({ user: user._id }).lean();
      const { _id: _sid, user: _suser, __v: _sv, ...userSettingData } = userSetting ?? {};
      // 產生 JWT token 並寫入 httpOnly cookie（帶入 tokenVersion 供失效機制比對）
      const authToken = jwt.sign(
        { userId: user._id, tokenVersion: user.tokenVersion ?? 0 },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      const isProd = process.env.NODE_ENV === "production";
      res.cookie("authToken", authToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "None" : "Lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      });

      return res.status(200).json({
        code: "SUCCESS",
        message: "登入成功",
        userData: {
          _id: user._id,
          userId: user._id,
          email: user.email,
          account: user.account,
          name: user.name,
          avatar: user.avatar,
          avatarId: user.avatarId,
          role: user.userRole,
          status: user.status,
          bgColor: user.bgColor,
          bio: user.bio,
          createdAt: user.createdAt,
          ...userSettingData,
        },
      });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 找回密碼 */
  findPassword: async (req, res) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ email }).lean();
      if (!user)
        return res
          .status(404)
          .json({ code: "EMAIL_NOT_EXIST", message: "Email輸入錯誤或未註冊" });
      const urlToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "30m",
      });
      const resetPasswordLink = `${process.env.FRONTEND_URL}/reset_password/${urlToken}`;

      await mg.messages.create(process.env.MAILGUN_DOMAIN, {
        from: `ReactBlog <noreply@${process.env.MAILGUN_DOMAIN}>`,
        to: user.email,
        subject: "ReactBlog - 重設您的密碼",
        html: `
            <p>你已提出重設密碼的需求，請點擊下方連結來重設密碼</p>
            <p>提醒你，連結僅30分鐘有效！</p>
            <a href="${resetPasswordLink}">${resetPasswordLink}</a>
            <br>
            <br>
            <hr>
            <p>-若你未提出重設密碼要求，請忽略本信件-</p>
          `,
        "o:tracking": "yes",
        "o:tracking-clicks": "yes",
        "o:tracking-opens": "yes",
      });

      return res
        .status(200)
        .json({ code: "SUCCESS", message: "已發送重置密碼Email" });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 重設密碼 */
  resetPassword: async (req, res) => {
    const token = req.header("Authorization").split(" ")[1];
    if (!token)
      return res
        .status(401)
        .json({ code: "NO_TOKEN", message: "未提供驗證資訊" });

    try {
      // 驗證 token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user)
        return res.status(401).json({ code: "TOKEN_ERR", message: "驗證錯誤" });

      const { password, confirmPassword } = req.body;
      if (!isEqual(password, confirmPassword)) {
        return res
          .status(401)
          .json({ code: "PWD_UNMATCH", message: "新密碼與確認密碼不相符" });
      }

      // 更新用戶密碼，並遞增 tokenVersion 使所有舊 token 失效
      const salt = Number.parseInt(process.env.SALT_ROUNDS);
      const hashedPwd = bcrypt.hashSync(password, salt);
      await User.findByIdAndUpdate(user.id, {
        password: hashedPwd,
        $inc: { tokenVersion: 1 },
      });

      return res.status(200).json({ code: "SUCCESS", message: "密碼重設成功" });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "EXPIRE", message: "重設密碼連接無效或已過期" });
    }
  },
  /** 身分驗證
   * 僅以 authToken (JWT) 為驗證來源，不採信 body 傳入的 id
   */
  checkAuth: async (req, res) => {
    try {
      const user = await User.findById(req.user.userId).lean();
      if (!user) {
        return res.status(401).json({ code: "TOKEN_ERR", message: "驗證錯誤" });
      }
      return res.status(200).json({ code: "SUCCESS", message: "驗證成功" });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 取得目前登入使用者資料 */
  getCurrentUser: async (req, res) => {
    try {
      const { userId } = req.user;
      const user = await User.findById(userId).lean();
      if (!user)
        return res.status(404).json({ code: "USER_NOT_FOUND", message: "使用者不存在" });

      const userSetting = await UserSetting.findOne({ user: userId }).lean();
      const { _id: _sid, user: _suser, __v: _sv, ...userSettingData } = userSetting ?? {};
      return res.status(200).json({
        code: "SUCCESS",
        userData: {
          _id: user._id,
          userId: user._id,
          email: user.email,
          account: user.account,
          name: user.name,
          avatar: user.avatar,
          avatarId: user.avatarId,
          role: user.userRole,
          status: user.status,
          bgColor: user.bgColor,
          bio: user.bio,
          createdAt: user.createdAt,
          ...userSettingData,
        },
      });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 訪客登入 */
  guestLogin: async (req, res) => {
    try {
      // 不需要帳密，直接簽發一個受限 token
      const guestToken = jwt.sign(
        { role: 'guest', userId: 'guest' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      const isProd = process.env.NODE_ENV === "production";
      res.cookie("authToken", guestToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "None" : "Lax",
        maxAge: 60 * 60 * 1000, // 1小時
      });

      return res.status(200).json({
        code: "SUCCESS",
        userData: {
          userId: 'guest',
          name: '訪客',
          email: 'guest@blogsystem.com',
          role: 'guest',
        }
      });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 登出 */
  signOut: async (req, res) => {
    // 嘗試從 cookie 解析出使用者並遞增 tokenVersion，使該 token 立即失效（訪客略過）
    const token = req.cookies?.authToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.userId && decoded.userId !== "guest" && decoded.role !== "guest") {
          await User.findByIdAndUpdate(decoded.userId, { $inc: { tokenVersion: 1 } });
        }
      } catch (e) {
        // token 無效或過期，無須遞增，直接清除 cookie 即可
      }
    }

    const isProd = process.env.NODE_ENV === "production";
    res.clearCookie("authToken", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "Lax",
    });
    return res.status(200).json({ code: "SUCCESS", message: "登出成功" });
  },
};

module.exports = loginController;
