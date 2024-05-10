const express = require("express");
const router = express.Router();
const User = require("../../models/user");
const FollowShip = require("../../models/followShip");
const { authorization } = require("../../middleware/auth");

/** 取得追蹤清單 */
router.get("/", async (req, res) => {
  const { userId } = req.body;

  try {
    const followList = await FollowShip.findOne({ user: userId})
    .populate("user", {_id:1, account:1, name:1, avatar:1, bgColor:1 })
    .lean()
    .exec();

    res.status(200).json(followList);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/** 追蹤/取消追蹤其他使用者
 * @param action 追蹤(follow) / 取消追蹤(unfollow)
 * @param userId 當前(操作)使用者id
 * @param targetId 被新增追縱/取消追蹤的使用者id
 * @param followState 追蹤狀態
 */
router.patch("/followAction", authorization, async (req, res) => {
  const { action, userId, targetId } = req.body;
  const currentId = userId;

  try {
    const targetUser = await FollowShip.findOne({user: targetId}).lean();  // select 目標使用者
    const currentUser = await FollowShip.findOne({user: currentId}).lean(); // select 操作使用者
    if (!targetUser) return res.status(404).json({ message: "找不到該使用者" });
    let newFollowings = new Array(...currentUser.following); // following => 自己的追蹤名單
    let newFollowers = new Array(...targetUser.follower); // follower => 目標使用者的粉絲名單
    let followList;

    const handleSetDB = async () => {
      // 回寫至DB
      const result = await FollowShip.findOneAndUpdate(
        {user: currentId}, 
        { following: newFollowings },
        { new: true }
      );
      
      await FollowShip.findOneAndUpdate(
        {user: targetId}, 
        { follower: newFollowers }
      );
      return result;
    }

    if(action === "follow"){
      // follow action
      if(!Array.inclues(targetId)){
        newFollowings.push(targetId);
        newFollowers.push({userId: currentId, state: 0});
        followList = handleSetDB(newFollowings, newFollowers);
      }
    } else {
      // unfollow action
      const newFollowingArr = newFollowings.filter((item) => item !== targetId);
      const newFollowerArr = newFollowers.filter((item) => item !== currentId);
      followList = handleSetDB(newFollowingArr, newFollowerArr);
    }

    return res.status(200).json({ message: "success", followList });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

/** 更新訂閱狀態
 * @param currentId 當前(操作)使用者id
 * @param targetId 被追縱/取消追蹤的使用者id
 * @param followState 追蹤狀態
 */
router.patch("/changeFollowState", authorization, async (req, res) => {
  const { currentId, targetId, followState } = req.body;
  try {
    const targetUser = await FollowShip.findById(targetId).lean();  // select 目標使用者
    let newFollowers = targetUser.follower;
    newFollowers.map(item => { if(item.userId === currentId) item.state = followState; });
    const followList = await FollowShip.findOneAndUpdate(
      targetId,
      { follower: newFollowers},
    );
    return res.status(200).json({ message: "success", followList });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;