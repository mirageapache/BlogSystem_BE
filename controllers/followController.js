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

      if (!followListData) {
        return res.status(404).json({ code: "NO_FOUND", message: "沒有追蹤" });
      }

      const total = await Follow.countDocuments({ follower: userId });
      const totalPages = Math.ceil(total / limit);
      const nextPage = page + 1 > totalPages ? -1 : page + 1;

      return res.status(200).json({
        followList: followListData,
        nextPage,
        totalUser: total,
      });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
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

      if (!followListData) {
        return res.status(404).json({ code: "NO_FOUND", message: "沒有粉絲" });
      }

      const total = await Follow.countDocuments({ follower: userId });
      const totalPages = Math.ceil(total / limit);
      const nextPage = page + 1 > totalPages ? -1 : page + 1;

      return res.status(200).json({
        followList: followListData,
        nextPage,
        totalUser: total,
      });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
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
        return res.status(401).json({ code: "FOLLOWED", message: "已追蹤" });

      await Follow.create({ follower: userId, followed: targetId });

      return res.status(200).json({ code: "SUCCESS", message: "追蹤成功" });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
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
        return res.status(401).json({ code: "UNFOLLOWED", message: "已取消追蹤" });

      await Follow.findOneAndDelete({ follower: userId, followed: targetId });

      return res.status(200).json({ code: "SUCCESS", message: "取消追蹤成功" });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
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

      return res.status(200).json({ code: "UPDATE_SUCCESS", message: "已更新狀態", FollowData });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
};

module.exports = followController;
