const { isEmpty } = require("lodash");
const FollowShip = require("../models/followShip");

const followController = {
  /** 取得追蹤清單 */
  getFollowingList: async (req, res) => {
    const { userId } = req.body;
    try {
      const followList = await FollowShip.findOne({ user: userId })
        .select("following")
        .populate("following", {
          _id: 1,
          account: 1,
          name: 1,
          avatar: 1,
          bgColor: 1,
        })
        .lean()
        .exec();
      res.status(200).json(followList);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
  /** 取得粉絲清單 */
  getFollowerList: async (req, res) => {
    const { userId } = req.body;
    try {
      const followList = await FollowShip.findOne({ user: userId })
        .select("follower")
        .populate({
          path: "follower",
          populate: {
            path: "user",
            select: "_id account name avatar bgColor",
          },
        })
        .lean()
        .exec();
      res.status(200).json(followList);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
  /** 追蹤/取消追蹤其他使用者
   * @param action 追蹤(follow) / 取消追蹤(unfollow)
   * @param userId 當前(操作)使用者id
   * @param targetId 被新增追縱/取消追蹤的使用者id
   * @param followState 追蹤狀態
   */
  handleFollowAction: async (req, res) => {
    const { action, userId, targetId } = req.body;
    const currentId = userId;

    try {
      const targetUser = await FollowShip.findOne({ user: targetId }).lean(); // select 目標使用者
      const currentUser = await FollowShip.findOne({ user: currentId }).lean(); // select 操作使用者
      if (!targetUser)
        return res.status(404).json({ message: "找不到該使用者" });
      let newFollowings = currentUser.following.map((obj) => obj.toString()); // following => 自己的追蹤名單
      let newFollowers = targetUser.follower.map((obj) => {
        if (!isEmpty(obj))
          action === "follow" ? obj.toString() : obj._id.toString();
      }); // follower => 目標使用者的粉絲名單

      if (action === "follow") {
        // follow action
        if (!newFollowings.includes(targetId)) {
          newFollowings.push(targetId);
          newFollowers.push({ userId: currentId, state: 0 });
        }
      } else {
        // unfollow action
        const rmFollowingIndex = newFollowings.indexOf(targetId);
        if (rmFollowingIndex !== -1) newFollowings.splice(rmFollowingIndex, 1);
        const rmFollowerIndex = newFollowers.indexOf(currentId);
        if (rmFollowerIndex !== -1) newFollowers.splice(rmFollowerIndex, 1);
      }

      // 回寫至DB
      const followingRes = await FollowShip.findOneAndUpdate(
        { user: currentId },
        { following: newFollowings },
        { new: true }
      );
      const followerRes = await FollowShip.findOneAndUpdate(
        { user: targetId },
        { follower: newFollowers },
        { new: true }
      );

      return res.status(200).json({
        message: "success",
        following: followingRes,
        follower: followerRes,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: error.message });
    }
  },
  /** 更新訂閱狀態
   * @param currentId 當前(操作)使用者id
   * @param targetId 被追縱/取消追蹤的使用者id
   * @param followState 追蹤狀態
   */
  changeFollowState: async (req, res) => {
    const { userId, targetId, followState } = req.body;
    const currentId = userId;

    try {
      const targetUser = await FollowShip.findOne({ user: targetId }).lean(); // select 目標使用者
      let newFollowers = targetUser.follower;
      newFollowers.map((item) => {
        if (item._id === currentId) item.state = followState;
      });
      const followList = await FollowShip.findOneAndUpdate(
        { user: targetId },
        { follower: newFollowers },
        { new: true }
      );
      return res.status(200).json({ message: "success", followList });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
};

module.exports = followController;
