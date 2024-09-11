const express = require("express");
const router = express.Router();
const { authorization } = require("../../middleware/auth");
const { uploadFile } = require("../../middleware/fileUtils");
const userController = require("../../controllers/userController");
const {
  validateEmail,
  validateAccount,
} = require("../../middleware/validator/userValidation");

/** 取得所有使用者 */
router.get("/", userController.getAllUserList);

/** 取得搜尋使用者清單(含追蹤資料) */
router.post("/getSearchUserList", userController.getSearchUserList);

/** 取得推薦使用者清單(含追蹤資料) */
router.post("/getRecommendUserList", userController.getRecommendUserList);

/** 取得一般使用者資料 */
router.post("/:id", userController.getOtherUserData);

/** 個人-取得使用者資料 */
router.post("/own/:id", authorization, userController.getOwnUserData);

/** 個人-更新使用者資料 */
router.patch(
  "/own/:id",
  authorization,
  [validateEmail, validateAccount],
  userController.updateUserData
);

/** 個人-更新使用者資料(舊的-包含檔案上傳) */
// router.patch(
//   "/own/:id",
//   authorization,
//   [validateEmail, validateAccount],
//   uploadFile.single("avatarFile"),
//   userController.updateUserData
// );

/** 個人-修改(背景)深色模式 */
router.patch("/own/theme/:id", authorization, userController.setDarkMode);

/** 個人-刪除使用者 */
router.delete("/own/:id", authorization, userController.deleteUser);

module.exports = router;
