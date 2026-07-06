const express = require("express");
const router = express.Router();
const { authorization, requireMember, optionalAuth } = require("../../middleware/auth");
const { uploadMulter } = require("../../middleware/fileUtils");
const userController = require("../../controllers/userController");
const {
  validateEmail,
  validateAccount,
} = require("../../middleware/validator/userValidation");

/**
 * @openapi
 * tags:
 *   - name: User
 *     description: 使用者（搜尋 / 推薦 / 個人資料 CRUD；部分端點選登，登入後回傳追蹤狀態）
 */

/** 取得搜尋使用者清單(含追蹤資料) */
/**
 * @openapi
 * /api/user/getSearchUserList:
 *   post:
 *     tags: [User]
 *     summary: 取得搜尋使用者清單(含追蹤資料)
 *     description: '選擇性登入；登入後每筆使用者會額外回傳 isFollow / followState。'
 *     security: [{ bearer: [] }, {}]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               searchString: { type: string, description: '以 account 或 name 模糊搜尋；空字串則回傳全部' }
 *               page: { type: integer, default: 1, minimum: 1 }
 *               limit: { type: integer, default: 20, minimum: 1 }
 *     responses:
 *       200:
 *         description: 成功（僅回傳公開欄位子集）
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userList:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/User'
 *                       - type: object
 *                         properties:
 *                           isFollow: { type: boolean, description: '登入後才有' }
 *                           followState: { type: integer, nullable: true, enum: [0, 1], description: '登入後才有' }
 *                 nextPage: { type: integer, description: '下一頁頁碼；-1 表示已到底' }
 *                 totalUser: { type: integer }
 */
router.post("/getSearchUserList", optionalAuth, userController.getSearchUserList);

/** 取得推薦使用者清單(含追蹤資料) */
/**
 * @openapi
 * /api/user/getRecommendUserList:
 *   post:
 *     tags: [User]
 *     summary: 取得推薦使用者清單(含追蹤資料)
 *     description: '依追蹤者數排序的前 10 位使用者；登入後每筆會額外回傳 isFollow / followState。'
 *     security: [{ bearer: [] }, {}]
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId: { type: string }
 *                   account: { type: string }
 *                   name: { type: string }
 *                   avatar: { type: string }
 *                   bgColor: { type: string }
 *                   followerCount: { type: integer }
 *                   isFollow: { type: boolean, description: '登入後才有' }
 *                   followState: { type: integer, nullable: true, enum: [0, 1], description: '登入後才有' }
 */
router.post("/getRecommendUserList", optionalAuth, userController.getRecommendUserList);

/** 個人-取得使用者資料 */
/**
 * @openapi
 * /api/user/own:
 *   post:
 *     tags: [User]
 *     summary: 個人-取得使用者資料
 *     security: [{ bearer: [] }]
 *     responses:
 *       200:
 *         description: 成功（使用者資料 + 個人設定）
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/User'
 *                 - type: object
 *                   properties:
 *                     userId: { type: string }
 *                     language: { type: string }
 *                     theme: { type: integer, enum: [0, 1], description: '0-明亮 / 1-深色' }
 *                     emailPrompt: { type: boolean }
 *                     mobilePrompt: { type: boolean }
 *                     articleCollect: { type: array, items: { type: string } }
 *                     postCollect: { type: array, items: { type: string } }
 *       404: { description: 沒使用者資料, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post("/own", authorization, requireMember, userController.getOwnUserData);

/** 個人-更新使用者資料 */
/**
 * @openapi
 * /api/user/own:
 *   patch:
 *     tags: [User]
 *     summary: 個人-更新使用者資料
 *     security: [{ bearer: [] }]
 *     description: '以 multipart/form-data 上傳；大頭照圖檔欄位名為 imageFile。removeAvatar=true 可移除大頭照（不可與上傳圖檔同時）。僅更新有傳入的欄位。'
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               imageFile: { type: string, format: binary, description: '大頭照圖檔（選填）' }
 *               email: { type: string }
 *               name: { type: string }
 *               account: { type: string }
 *               bio: { type: string }
 *               avatar: { type: string, description: '大頭照 URL（未上傳新檔時沿用）' }
 *               avatarId: { type: string, description: 'Cloudinary public_id' }
 *               removeAvatar: { type: string, enum: ['true', 'false'], description: 'true 表示移除大頭照' }
 *               language: { type: string, enum: [zh, en] }
 *               emailPrompt: { type: boolean }
 *               mobilePrompt: { type: boolean }
 *     responses:
 *       200:
 *         description: 更新成功（回傳更新後資料 + 個人設定）
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/User'
 *                 - type: object
 *                   properties:
 *                     userId: { type: string }
 *                     language: { type: string }
 *                     theme: { type: integer, enum: [0, 1] }
 *                     emailPrompt: { type: boolean }
 *                     mobilePrompt: { type: boolean }
 *                     articleCollect: { type: array, items: { type: string } }
 *                     postCollect: { type: array, items: { type: string } }
 *       400: { description: 'language 不合法，或同時上傳圖片與移除大頭照', content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: 'Email 或帳號名稱已存在', content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: 沒使用者, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.patch(
  "/own",
  authorization,
  requireMember,
  [validateEmail, validateAccount],
  uploadMulter,
  userController.updateUserData
);

/** 個人-修改(背景)深色模式 */
/**
 * @openapi
 * /api/user/own/theme:
 *   patch:
 *     tags: [User]
 *     summary: 個人-修改(背景)深色模式
 *     security: [{ bearer: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [theme]
 *             properties:
 *               theme: { type: integer, enum: [0, 1], description: '0-明亮 / 1-深色' }
 *     responses:
 *       200:
 *         description: 成功（回傳更新後的個人設定）
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id: { type: string }
 *                 language: { type: string }
 *                 theme: { type: integer, enum: [0, 1] }
 *                 emailPrompt: { type: boolean }
 *                 mobilePrompt: { type: boolean }
 *                 articleCollect: { type: array, items: { type: string } }
 *                 postCollect: { type: array, items: { type: string } }
 */
router.patch("/own/theme", authorization, requireMember, userController.setDarkMode);

/** 個人-刪除使用者 */
/**
 * @openapi
 * /api/user/own:
 *   delete:
 *     tags: [User]
 *     summary: 個人-刪除使用者
 *     security: [{ bearer: [] }]
 *     description: '連動清理 UserSetting、Follow（雙向）、Article、Post、Comment 及 Cloudinary 圖片，並清除登入 cookie。'
 *     responses:
 *       200:
 *         description: 刪除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: DELETE_SUCCESS }
 *                 message: { type: string, example: 刪除成功 }
 *       404: { description: 沒使用者, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.delete("/own", authorization, requireMember, userController.deleteUser);

/** 取得一般使用者資料 */
/**
 * @openapi
 * /api/user/{id}:
 *   post:
 *     tags: [User]
 *     summary: 取得一般使用者資料
 *     description: '選擇性登入；登入且已追蹤該使用者時會額外回傳 isFollow / followState。'
 *     security: [{ bearer: [] }, {}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: 要查詢的使用者 id
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/User'
 *                 - type: object
 *                   properties:
 *                     userId: { type: string }
 *                     isFollow: { type: boolean, description: '登入且已追蹤才有' }
 *                     followState: { type: integer, nullable: true, enum: [0, 1], description: '登入且已追蹤才有' }
 *       404: { description: '沒使用者資料（id 不合法或查無此人）', content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post("/:id", optionalAuth, userController.getOtherUserData);

module.exports = router;
