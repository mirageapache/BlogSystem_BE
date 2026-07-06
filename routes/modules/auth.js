const express = require("express");
const router = express.Router();
// --- functions ---
const { authorization } = require("../../middleware/auth");
const {
  validateEmail,
  validatePassword,
} = require("../../middleware/validator/userValidation");
const { authLimiter, mailLimiter } = require("../../middleware/rateLimiter");
const authController = require("../../controllers/authController");

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: 身分驗證與帳號（註冊 / 登入 / 找回密碼 / 重設密碼 / 訪客 / 登出）
 */

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: 註冊
 *     description: Email + 密碼註冊；account 由 email 前綴自動產生，密碼與確認密碼須相符。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, confirmPassword]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               confirmPassword: { type: string }
 *     responses:
 *       200:
 *         description: 註冊成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: SUCCESS }
 *                 message: { type: string, example: '註冊成功' }
 *       401: { description: 驗證失敗 / 密碼與確認密碼不相符 / Email 已被註冊, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
/** 註冊 */
router.post("/signup", authLimiter, [validateEmail, validatePassword], authController.signUp);

/**
 * @openapi
 * /api/auth/signin:
 *   post:
 *     tags: [Auth]
 *     summary: 登入
 *     description: Email + 密碼登入；成功會簽發 JWT 並寫入 httpOnly cookie（authToken），回應同時帶回 userData。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: 登入成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: SUCCESS }
 *                 message: { type: string, example: '登入成功' }
 *                 userData:
 *                   type: object
 *                   description: 使用者資料與個人設定（UserSetting 欄位一併展開）
 *                   properties:
 *                     _id: { type: string }
 *                     userId: { type: string }
 *                     email: { type: string }
 *                     account: { type: string }
 *                     name: { type: string }
 *                     avatar: { type: string }
 *                     avatarId: { type: string }
 *                     role: { type: integer, description: '對應 userRole：0-一般 / 1-進階 / 2-系統管理員' }
 *                     status: { type: integer, description: '0-未驗證 / 1-正常 / 2-黑名單 / 3-停用' }
 *                     bgColor: { type: string }
 *                     bio: { type: string }
 *                     createdAt: { type: string, format: date-time }
 *                     language: { type: string, description: '個人設定：介面語系' }
 *                     theme: { type: integer, description: '個人設定：主題' }
 *                     emailPrompt: { type: boolean }
 *                     mobilePrompt: { type: boolean }
 *       401: { description: 驗證失敗 / 密碼錯誤, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Email 尚未註冊, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
/** 登入 */
router.post("/signin", authLimiter, [validateEmail, validatePassword], authController.signIn);

/**
 * @openapi
 * /api/auth/findpwd:
 *   post:
 *     tags: [Auth]
 *     summary: 找回密碼
 *     description: 寄送重設密碼連結至該 Email（連結內含 30 分鐘有效的 reset token）。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: 已發送重置密碼 Email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: SUCCESS }
 *                 message: { type: string, example: '已發送重置密碼Email' }
 *       404: { description: Email 輸入錯誤或未註冊, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
/** 找回密碼 */
router.post("/findpwd", mailLimiter, [validateEmail], authController.findPassword);

/**
 * @openapi
 * /api/auth/resetpwd:
 *   post:
 *     tags: [Auth]
 *     summary: 重設密碼
 *     description: >-
 *       以 findpwd 寄出的短效 reset token 重設密碼（放在 `Authorization: Bearer <token>`，非一般登入 JWT）。
 *       密碼與確認密碼須相符；成功後會遞增 tokenVersion 使所有舊 token 失效。
 *     security: [{ bearer: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password, confirmPassword]
 *             properties:
 *               password: { type: string }
 *               confirmPassword: { type: string }
 *     responses:
 *       200:
 *         description: 密碼重設成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: SUCCESS }
 *                 message: { type: string, example: '密碼重設成功' }
 *       401: { description: 未提供 token / 驗證錯誤 / 密碼與確認密碼不相符, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       500: { description: 重設密碼連結無效或已過期, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
/** 重設密碼 */
router.post("/resetpwd", authLimiter, [validatePassword], authController.resetPassword);

/**
 * @openapi
 * /api/auth/checkAuth:
 *   post:
 *     tags: [Auth]
 *     summary: 身分驗證
 *     description: 以 authToken (JWT) 為唯一驗證來源，確認目前 token 對應的使用者仍存在。
 *     security: [{ bearer: [] }]
 *     responses:
 *       200:
 *         description: 驗證成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: SUCCESS }
 *                 message: { type: string, example: '驗證成功' }
 *       401: { description: 驗證錯誤（token 無效或使用者不存在）, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
/** 身分驗證 */
router.post("/checkAuth", authorization, authController.checkAuth);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: 取得目前使用者資料
 *     description: 依 JWT 取得目前登入使用者資料與個人設定。
 *     security: [{ bearer: [] }]
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: SUCCESS }
 *                 userData:
 *                   type: object
 *                   description: 使用者資料與個人設定（UserSetting 欄位一併展開）
 *                   properties:
 *                     _id: { type: string }
 *                     userId: { type: string }
 *                     email: { type: string }
 *                     account: { type: string }
 *                     name: { type: string }
 *                     avatar: { type: string }
 *                     avatarId: { type: string }
 *                     role: { type: integer, description: '對應 userRole：0-一般 / 1-進階 / 2-系統管理員' }
 *                     status: { type: integer, description: '0-未驗證 / 1-正常 / 2-黑名單 / 3-停用' }
 *                     bgColor: { type: string }
 *                     bio: { type: string }
 *                     createdAt: { type: string, format: date-time }
 *                     language: { type: string, description: '個人設定：介面語系' }
 *                     theme: { type: integer, description: '個人設定：主題' }
 *                     emailPrompt: { type: boolean }
 *                     mobilePrompt: { type: boolean }
 *       404: { description: 使用者不存在, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
/** 取得目前使用者資料 */
router.get("/me", authorization, authController.getCurrentUser);

/**
 * @openapi
 * /api/auth/guest:
 *   post:
 *     tags: [Auth]
 *     summary: 訪客登入
 *     description: 免帳密簽發 1 小時有效的受限 guest token，並寫入 httpOnly cookie（authToken）。
 *     responses:
 *       200:
 *         description: 訪客登入成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: SUCCESS }
 *                 userData:
 *                   type: object
 *                   properties:
 *                     userId: { type: string, example: guest }
 *                     name: { type: string, example: '訪客' }
 *                     email: { type: string, example: 'guest@blogsystem.com' }
 *                     role: { type: string, example: guest }
 */
/** 訪客登入 */
router.post("/guest", authController.guestLogin);

/**
 * @openapi
 * /api/auth/signout:
 *   post:
 *     tags: [Auth]
 *     summary: 登出
 *     description: 清除 authToken cookie；若為會員 token 會遞增 tokenVersion 使其立即失效（訪客略過）。
 *     responses:
 *       200:
 *         description: 登出成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: SUCCESS }
 *                 message: { type: string, example: '登出成功' }
 */
/** 登出 */
router.post("/signout", authController.signOut);

module.exports = router;
