const express = require("express");
const router = express.Router();
const { authorization } = require("../../middleware/auth");
const followController = require("../../controllers/followController");

/** 取得追蹤清單 */
router.post("/getfollowing", authorization, followController.getfollowingList);

/** 取得粉絲清單 */
router.post("/getfollower", authorization, followController.getFollowerList);

/** 追蹤 */
router.post("/follow", authorization, followController.followUser);

/** 取消追蹤 */
router.post("/unfollow", authorization, followController.unfollowUser);

/** 更新訂閱狀態 */
router.patch("/changeState", authorization, followController.changeFollowState);

module.exports = router;
