const { isEmpty } = require("lodash");
const Follow = require("../models/follow");

const followController = {
  /** 取得追蹤清單(user是追蹤人的情況) */
  getfollowingList: async (req, res) => {
    const { userId } = req.body;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 20;
    const skip = (page - 1) * limit;
    try {
      const followedList = await Follow.find({ follower: userId })
        .select("followed followState")
        .skip(skip)
        .limit(limit)
        .populate({
          path: "followed",
          select: "_id account name avatar bgColor",
        })
        .lean()
        .exec();

      const followListData = followedList.map((follow) => {
        return {
          ...follow.followed,
          followState: follow.followState,
          isFollow: true,
        };
      });

      const total = await Follow.countDocuments({ follower: userId });
      const totalPages = Math.ceil(total / limit);
      const nextPage = page + 1 > totalPages ? -1 : page + 1;

      if (skip === 0 && isEmpty(followListData) && followListData.length === 0)
        return res.status(200).json({
          followList: followListData,
          code: "NOT_FOUND",
      });

      return res.status(200).json({
        followList: followListData,
        nextPage,
        totalUser: total,
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  /** 取得粉絲清單(user是被追蹤人的情況) */
  getFollowerList: async (req, res) => {
    const { userId } = req.body;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 20;
    const skip = (page - 1) * limit;
    try {
      const followerList = await Follow.find({ followed: userId })
        .select("user:follower followState")
        .skip(skip)
        .limit(limit)
        .populate({
          path: "follower",
          select: "_id account name avatar bgColor",
        })
        .lean()
        .exec();

      const followListData = followerList.map((follow) => {
        return { ...follow.follower, followState: follow.followState };
      });

      const total = await Follow.countDocuments({ follower: userId });
      const totalPages = Math.ceil(total / limit);
      const nextPage = page + 1 > totalPages ? -1 : page + 1;

      if (skip === 0 && isEmpty(followListData) && followListData.length === 0)
        return res.status(200).json({
          followList: followListData,
          code: "NOT_FOUND",
      });

      return res.status(200).json({
        followList: followListData,
        nextPage,
        totalUser: total,
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
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
      const existingFollow = await Follow.findOne({
        follower: userId,
        followed: targetId,
      });
      if (existingFollow)
        return res.status(400).json({ message: "already followed" }); // 已追蹤

      await Follow.create({ follower: userId, followed: targetId });

      return res.status(200).json({ message: "follow success" });
    } catch (err) {
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
      const existingFollow = await Follow.findOne({
        follower: userId,
        followed: targetId,
      });
      if (!existingFollow)
        return res.status(400).json({ message: "not followed" }); // 未追蹤(不須取消)

      await Follow.findOneAndDelete({ follower: userId, followed: targetId });

      return res.status(200).json({ message: "unfollow success" });
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  },
  /** 更新訂閱狀態
   * @param currentId 當前(操作)使用者id
   * @param targetId 被追縱/取消追蹤的使用者id
   * @param state 追蹤狀態
   */
  changeFollowState: async (req, res) => {
    const { userId, targetId, state } = req.body;

    try {
      const FollowData = await Follow.findOneAndUpdate(
        { follower: userId, followed: targetId },
        { followState: state },
        { new: true }
      );

      return res.status(200).json({ message: "update success", FollowData });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
};

module.exports = followController;
