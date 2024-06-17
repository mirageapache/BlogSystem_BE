const Follow = require("../models/follow");

const followController = {
  /** 取得追蹤清單(user是追蹤人的情況) */
  getfollowingList: async (req, res) => {
    const { userId } = req.body;
    try {
      const followedList = await Follow.find({ follower: userId })
      .select("followed followState")
      .populate({
        path: 'followed',
        select: '_id account name avatar bgColor',
      })
      .lean()
      .exec();
      res.status(200).json(followedList);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
  /** 取得粉絲清單(user是被追蹤人的情況) */
  getFollowerList: async (req, res) => {
    const { userId } = req.body;
    try {
      const followList = await Follow.find({ followed: userId })
      .select("follower followState")
      .populate({
        path: "follower",
        select: "_id account name avatar bgColor",
      })
      .lean()
      .exec();
      res.status(200).json(followList);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
  /** 追蹤 
   * @param userId 當前(操作)使用者id
   * @param targetId 被新增追縱/取消追蹤的使用者id
   */
  followUser: async (req, res) => {
    const { userId, targetId } = req.body;
    try {
      // 檢查是否已經存在追蹤關係
      const existingFollow = await Follow.findOne({ follower: userId, followed: targetId });
      if (existingFollow) return res.status(400).json({ message: "already followed" }); // 已追蹤
      
      await Follow.create({ follower: userId, followed: targetId });

      return res.status(200).json({ message: "follow success" });
    } catch (err) {
      console.error("追蹤失敗:", err.message);
      return res.status(400).json({ message: err.message });
    }
  },
  /** 取消追蹤
   * @param userId 當前(操作)使用者id
   * @param targetId 被新增追縱/取消追蹤的使用者id
   */
  unfollowUser: async (req, res) => {
    const { userId, targetId } = req.body;
    try {
      // 檢查是否存在追蹤關係
      const existingFollow = await Follow.findOne({ follower: userId, followed: targetId });
      if (!existingFollow) return res.status(400).json({ message: "not followed" }); // 未追蹤(不須取消)

      await Follow.findOneAndDelete({ follower: userId, followed: targetId });

      return res.status(200).json({ message: "unfollow success" });
    } catch (err) {
      console.error("取消追蹤失敗:", err.message);
      return res.status(400).json({ message: err.message });
    } 
  },
  /** 更新訂閱狀態
   * @param currentId 當前(操作)使用者id
   * @param targetId 被追縱/取消追蹤的使用者id
   * @param followState 追蹤狀態
   */
  changeFollowState: async (req, res) => {
    const { userId, targetId, followState } = req.body;

    try {
      const FollowData = await Follow.findOneAndUpdate(
        { follower: userId, followed: targetId },
        { followState: followState },
        { new: true }
      );

      return res.status(200).json({ message: "update success", FollowData });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
};

module.exports = followController;
