const express = require("express");
const router = express.Router();
// --- functions ---
const { authorization } = require("../../middleware/auth");
const {
  validateEmail,
  validatePassword,
} = require("../../middleware/validator/userValidation");
const authController = require("../../controllers/authController");

/** 註冊 */
router.post("/signup", [validateEmail, validatePassword], authController.signUp);

/** 登入 */
router.post("/signin", [validateEmail, validatePassword], authController.signIn);

/** 找回密碼 */
router.post("/findpwd", [validateEmail], authController.findPassword);

/** 重設密碼 */
router.post("/resetpwd", [validatePassword], authController.resetPassword);

/** 身分驗證 */
router.post("/checkAuth", authorization, authController.checkAuth);

/** 密碼加密 */
router.post("/hashPwd", authController.passwordEncode);

module.exports = router;
