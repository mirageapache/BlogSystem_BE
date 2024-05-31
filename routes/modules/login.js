const express = require("express");
const router = express.Router();
// --- functions ---
const { authorization } = require("../../middleware/auth");
const {
  validateEmail,
  validatePassword,
} = require("../../middleware/validator/userValidation");
const loginController = require("../../controllers/loginController");

/** 註冊 */
router.post("/signup", [validateEmail, validatePassword], loginController.singUp);

/** 登入 */
router.post("/signin", [validateEmail, validatePassword], loginController.signIn);

/** 身分驗證 */
router.post("/auth", authorization, loginController.checkAuth);

/** 密碼加密 */
router.post("/hashPwd", loginController.passwordEncode);

module.exports = router;
