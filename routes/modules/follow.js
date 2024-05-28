const express = require("express");
const router = express.Router();
const FollowShip = require("../../models/followShip");
const { authorization } = require("../../middleware/auth");
const followController = require("../../controllers/followController");

/** 取得追蹤清單 */
router.get("/", followController.getFollowList);

/** 追蹤/取消追蹤其他使用者 */
router.patch("/followAction", authorization, followController.handleFollowAction);

/** 更新訂閱狀態 */
router.patch("/changeFollowState", authorization, followController.changeFollowState);

module.exports = router;
