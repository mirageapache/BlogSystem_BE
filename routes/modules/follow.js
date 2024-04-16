const express = require("express");
const router = express.Router();
const FollowShip = require("../../models/followShip");
const { authorization } = require("../../middleware/auth");


/** 追蹤/取消追蹤使用者
 * @param action 追蹤(follow) / 取消追蹤(unfollow)
 * @param currentId 當前(操作)使用者id
 * @param targetId 被追縱/取消追蹤的使用者id
 * @param followState 追蹤狀態
 */
router.patch("/followAction", authorization, async (req, res) => {
  const { action, currentId, targetId } = req.body;
  try {
    // select target user
    const targetUser = await FollowShip.findById(targetId).lean();  // select 目標使用者
    const currentUser = await FollowShip.findById(currentId).lean(); // select 操作使用者
    if (!targetUser) return res.status(404).json({ message: "找不到該使用者" });
    //  select current user
    let newFollowings = currentUser.following;
    let newFollowers = targetUser.follower;

    if(action === "follow"){
      // follow action
      newFollowings.push(targetId);
      newFollowers.push({userId: currentId, state: 0});
    } else {
      // unfollow action
      newFollowings = newFollowings.filter(item => item !== targetId);
      newFollowers = newFollowers.filter(item => item.userId !== currentId);
    }

    // 回寫至DB
    await FollowShip.findByIdAndUpdate(
      currentId, 
      { following: newFollowings }, 
    );
    
    await FollowShip.findByIdAndUpdate(
      targetId, 
      { follower: newFollowers }, 
      { new: true }
    );

    return res.status(200).json({ message: "success" });
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
    await FollowShip.findByIdAndUpdate(
      targetId,
      { follower: newFollowers},
    );
    return res.status(200).json({ message: "success" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});