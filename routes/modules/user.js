const express = require("express");
const router = express.Router();
const { authorization, requireMember, optionalAuth } = require("../../middleware/auth");
const { uploadMulter } = require("../../middleware/fileUtils");
const userController = require("../../controllers/userController");
const {
  validateEmail,
  validateAccount,
} = require("../../middleware/validator/userValidation");

/** 取得所有使用者 */
router.get("/", userController.getAllUserList);

/** 取得搜尋使用者清單(含追蹤資料) */
router.post("/getSearchUserList", optionalAuth, userController.getSearchUserList);

/** 取得推薦使用者清單(含追蹤資料) */
router.post("/getRecommendUserList", optionalAuth, userController.getRecommendUserList);

/** 個人-取得使用者資料 */
router.post("/own", authorization, requireMember, userController.getOwnUserData);

/** 個人-更新使用者資料 */
router.patch(
  "/own",
  authorization,
  requireMember,
  [validateEmail, validateAccount],
  uploadMulter,
  userController.updateUserData
);

/** 個人-修改(背景)深色模式 */
router.patch("/own/theme", authorization, requireMember, userController.setDarkMode);

/** 個人-刪除使用者 */
router.delete("/own", authorization, requireMember, userController.deleteUser);

/** 取得一般使用者資料 */
router.post("/:id", optionalAuth, userController.getOtherUserData);

module.exports = router;
