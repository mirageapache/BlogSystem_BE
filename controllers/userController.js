const { isEmpty } = require("lodash");
const User = require("../models/user");
const { escapeRegExp, isValidId, getCookieOptions, USER_PUBLIC_FIELDS } = require("../middleware/commonUtils");
const UserSetting = require("../models/userSetting");
const {
  cloudinaryUpload,
  cloudinaryUpdate,
  cloudinaryRemove,
} = require("../middleware/fileUtils");
const {
  emailExisted,
  accountExisting,
} = require("../middleware/validator/userValidation");
const Follow = require("../models/follow");
const Article = require("../models/article");
const Post = require("../models/post");
const Comment = require("../models/comment");

const userController = {
  /** 取得搜尋使用者清單(含追蹤資料) */
  getSearchUserList: async (req, res) => {
    const { searchString } = req.body;
    const userId = req.user?.userId && req.user.userId !== "guest" ? req.user.userId : null;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 20;
    const skip = (page - 1) * limit;
    let variable = {};

    if (!isEmpty(searchString)) {
      const safe = escapeRegExp(searchString);
      // $or 是mongoose的搜尋條件語法
      variable = {
        $or: [
          { account: new RegExp(safe, "i") },
          { name: new RegExp(safe, "i") },
        ],
      };
    }

    try {
      // 取得搜尋結果的使用者清單
      const users = await User.find(variable)
        .skip(skip)
        .limit(limit)
        .select(USER_PUBLIC_FIELDS)
        .lean();

      const total = await User.countDocuments(variable);
      const totalPages = Math.ceil(total / limit);
      const nextPage = page + 1 > totalPages ? -1 : page + 1;

      if (total === 0)
        return res.status(200).json({
          userList: [],
          nextPage: -1,
          totalUser: 0,
        });

      // 未登入則不判斷追蹤狀態，直接回傳搜尋結果
      if (isEmpty(userId))
        return res.status(200).json({
          userList: users,
          nextPage,
          totalUser: total,
        });

      // 取得追蹤清單
      const follows = await Follow.find({ follower: userId })
        .select("followed followState")
        .populate({
          path: "follower",
          select: "_id",
        })
        .lean()
        .exec();
      if (isEmpty(follows))
        return res.status(200).json({
          userList: users,
          nextPage,
          totalUser: total,
        }); // 沒有followList(表示未追縱任何人)，則直接回傳userList

      // 將追蹤清單轉換為哈希表(Object)
      const followsMap = follows.reduce((acc, follow) => {
        acc[follow.followed.toString()] = follow;
        return acc;
      }, {});

      // 執行 mapping，新增是否已追蹤、通知狀態欄位
      const userFollowList = users.map((user) => {
        const followData = followsMap[user._id.toString()];
        if (!followData) {
          return { ...user, isFollow: false, followState: null };
        } else {
          return {
            ...user,
            isFollow: true,
            followState: followData.followState,
          };
        }
      });

      return res.status(200).json({
        userList: userFollowList,
        nextPage,
        totalUser: total,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 取得推薦使用者清單(含追蹤資料)
   * @param userId 當前使用者userId(用來判斷是否已追蹤)
   */
  getRecommendUserList: async (req, res) => {
    const userId = req.user?.userId && req.user.userId !== "guest" ? req.user.userId : null;

    try {
      // 用aggregate()進行資料集合和排序，查詢出(前10位)推薦使用者清單
      const topUser = await Follow.aggregate([
        {
          $group: {
            _id: "$followed",
            followerCount: { $sum: 1 },
          },
        },
        { $sort: { followerCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users", // 關聯的集合名稱
            localField: "_id",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        { $unwind: "$userInfo" },
        {
          $project: {
            _id: 0,
            userId: "$userInfo._id",
            account: "$userInfo.account",
            name: "$userInfo.name",
            avatar: "$userInfo.avatar",
            bgColor: "$userInfo.bgColor",
            followerCount: 1,
          },
        },
      ]);

      if (isEmpty(userId)) return res.status(200).json(topUser);

      // 查詢使用者的追蹤資料
      const userFollowList = await Follow.find({ follower: userId })
        .select("followed followState")
        .lean();

      const followListMap = userFollowList.reduce((acc, follow) => {
        acc[follow.followed.toString()] = follow;
        return acc;
      }, {});

      // 合併資料，新增 isFollow和 followState欄位
      const recommendUserList = topUser.map((user) => {
        const followData = followListMap[user.userId.toString()];
        if (followData) {
          return {
            ...user,
            isFollow: true,
            followState: followData.followState,
          };
        } else {
          return { ...user, isFollow: false, followState: null };
        }
      });

      return res.status(200).json(recommendUserList);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 取得一般使用者資料 */
  getOtherUserData: async (req, res) => {
    const userId = req.params.id // 要查詢的使用者id
    // 登入的使用者id 一律從 JWT 取，未登入則為 undefined（不顯示追蹤狀態）
    const currentUserId = req.user?.userId && req.user.userId !== "guest" ? req.user.userId : null;

    if (!isValidId(userId))
      return res.status(404).json({ code: "NOT_FOUND", message: "沒使用者資料" });

    try {
      const user = await User.findById(userId)
        .select({ password: 0 })
        .lean();
      if (!user) {
        return res.status(404).json({ code: "NOT_FOUND", message: "沒使用者資料" });
      }

      if (!currentUserId) {
        return res.status(200).json({
          userId: user._id,
          ...user,
        });
      }

      const follow = await Follow.findOne({ followed: userId, follower: currentUserId })
      .select("followState")
      .populate({
        path: "follower",
        select: "_id",
      })
      .lean();

      if (follow) {
        return res.status(200).json({
          userId: user._id,
          ...user,
          isFollow: true,
          followState: follow.followState,
        });
      }

      return res.status(200).json({
        userId: user._id,
        ...user,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 個人-取得使用者資料 */
  getOwnUserData: async (req, res) => {
    try {
      const userId = req.user.userId;
      const user = await User.findById(userId)
        .select({ password: 0 })
        .lean();
      if (!user) {
        return res.status(404).json({ code: "NOT_FOUND", message: "沒使用者資料" });
      }

      const userSetting = await UserSetting.findOne({ user: userId }).lean();
      const { _id: _sid, user: _suser, __v: _sv, ...userSettingData } = userSetting ?? {};

      return res.status(200).json({
        userId: user._id,
        ...userSettingData,
        ...user,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 個人-更新使用者資料 */
  updateUserData: async (req, res) => {
    const userId = req.user.userId;
    const {
      email,
      name,
      account,
      bio,
      avatar,
      avatarId, // public_id
      removeAvatar, // true 表示要移除avatar
      language,
      emailPrompt,
      mobilePrompt,
    } = req.body;
    let avatarPath = avatar; // 大頭照url
    let publicId = avatarId; // 大頭照id
    try {
      if (email) {
        const checkResult = await emailExisted(email, userId);
        if (checkResult)
          return res.status(401).json({ code: "EMAIL_EXISTED", message: "該Email已存在" });
      }
      if (account) {
        const checkResult = await accountExisting(account, userId);
        if (checkResult)
          return res.status(401).json({ code: "ACCOUNT_EXISTED", message: "該帳號名稱已存在" });
      }

      // 驗證 language（僅在前端有傳入時檢查）
      const ALLOWED_LANGUAGES = ["zh", "en"];
      if (language !== undefined && !ALLOWED_LANGUAGES.includes(language)) {
        return res
          .status(400)
          .json({ code: "INVALID_PARAM", message: "language 參數不合法" });
      }

      if (req.file && removeAvatar === "true") {
        return res
          .status(400)
          .json({ code: "INVALID_PARAM", message: "不可同時上傳圖片與移除大頭照" });
      }

      if (req.file) {
        if (isEmpty(publicId)) {
          const uploadResult = await cloudinaryUpload(req);
          publicId = uploadResult.public_id;
          avatarPath = uploadResult.secure_url;
        } else {
          const updateResult = await cloudinaryUpdate(req, publicId);
          avatarPath = updateResult.secure_url;
        }
      }

      if (removeAvatar === "true") {
        await cloudinaryRemove(publicId);
        avatarPath = "";
        publicId = "";
      }

      // 更新User Info
      const updateUser = await User.findByIdAndUpdate(
        userId,
        {
          email,
          name,
          account,
          bio,
          avatar: avatarPath,
          avatarId: publicId,
        },
        { new: true } // true 代表會回傳更新後的資料
      )
        .select({ password: 0 })
        .lean();

      if (isEmpty(updateUser))
        return res.status(404).json({ code: "NOT_FOUND", message: "沒使用者" });

      // 更新User Setting — 僅更新前端有傳入的欄位，避免未傳值被覆蓋
      const settingUpdate = {};
      if (language !== undefined) settingUpdate.language = language;
      if (emailPrompt !== undefined)
        settingUpdate.emailPrompt = emailPrompt === true || emailPrompt === "true";
      if (mobilePrompt !== undefined)
        settingUpdate.mobilePrompt = mobilePrompt === true || mobilePrompt === "true";

      const updateUserSetting = await UserSetting.findOneAndUpdate(
        { user: userId },
        settingUpdate,
        { new: true }
      ).lean();

      const { _id: _sid, user: _suser, __v: _sv, ...updateSettingData } = updateUserSetting ?? {};
      const userData = { userId: updateUser._id, ...updateSettingData, ...updateUser };
      return res.status(200).json(userData);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 個人-(修改)深色模式 */
  setDarkMode: async (req, res) => {
    const { theme } = req.body;
    try {
      const result = await UserSetting.findOneAndUpdate(
        { user: req.user.userId },
        { theme },
        { new: true }
      ).lean();
      return res.status(200).json(result);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 個人-刪除使用者
   * 連動清理：UserSetting、Follow(雙向)、Article、Post、Comment、Cloudinary 圖片
   */
  deleteUser: async (req, res) => {
    const userId = req.user.userId;
    try {
      const user = await User.findById(userId).lean();
      if (!user)
        return res
          .status(404)
          .json({ code: "NOT_FOUND", message: "沒使用者" });

      // 蒐集所有要從 Cloudinary 移除的 publicId
      const cloudinaryIds = [];
      if (user.avatarId) cloudinaryIds.push(user.avatarId);
      const userPosts = await Post.find({ author: userId })
        .select("imageId")
        .lean();
      userPosts.forEach((p) => {
        if (p.imageId) cloudinaryIds.push(p.imageId);
      });

      // 蒐集要刪除的 comment ids（用於後續從 Post/Article.comments 移除引用）
      const userComments = await Comment.find({ author: userId })
        .select("_id")
        .lean();
      const commentIds = userComments.map((c) => c._id);

      // 平行刪除各 collection 資料
      await Promise.all([
        UserSetting.deleteOne({ user: userId }),
        Follow.deleteMany({
          $or: [{ follower: userId }, { followed: userId }],
        }),
        Article.deleteMany({ author: userId }),
        Post.deleteMany({ author: userId }),
        Comment.deleteMany({ author: userId }),
        // 把使用者留言從其他 post/article 的 comments 引用中移除
        commentIds.length
          ? Post.updateMany(
              { comments: { $in: commentIds } },
              { $pull: { comments: { $in: commentIds } } }
            )
          : Promise.resolve(),
        commentIds.length
          ? Article.updateMany(
              { comments: { $in: commentIds } },
              { $pull: { comments: { $in: commentIds } } }
            )
          : Promise.resolve(),
        // 將使用者按讚紀錄從文章/貼文中移除
        Article.updateMany(
          { likedByUsers: userId },
          { $pull: { likedByUsers: userId } }
        ),
        Post.updateMany(
          { likedByUsers: userId },
          { $pull: { likedByUsers: userId } }
        ),
      ]);

      await User.findByIdAndDelete(userId);

      // Cloudinary 圖片清理（best-effort，失敗不阻擋）
      await Promise.allSettled(
        cloudinaryIds.map((id) => cloudinaryRemove(id))
      );

      // 清除 cookie
      res.clearCookie("authToken", getCookieOptions());

      return res.json({ code: "DELETE_SUCCESS", message: "刪除成功" });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
};

module.exports = userController;
