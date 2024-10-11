const { isEmpty } = require("lodash");
const User = require("../models/user");
const UserSetting = require("../models/userSetting");
const {
  imgurFileHandler,
  cloudinaryUpload,
  cloudinaryUpdate,
  cloudinaryRemove,
} = require("../middleware/fileUtils");
const {
  emailExisted,
  accountExisting,
} = require("../middleware/validator/userValidation");
const Follow = require("../models/follow");

const userController = {
  /** 取得所有使用者 */
  getAllUserList: async (req, res) => {
    try {
      const users = await User.find().select("-password").lean();
      return res.status(200).json(users);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
  /** 取得搜尋使用者清單(含追蹤資料) */
  getSearchUserList: async (req, res) => {
    const { searchString, userId } = req.body;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 20;
    const skip = (page - 1) * limit;
    let variable = {};

    if (!isEmpty(searchString)) {
      // $or 是mongoose的搜尋條件語法
      variable = {
        $or: [
          { account: new RegExp(searchString, "i") },
          { name: new RegExp(searchString, "i") },
        ],
      };
    }

    try {
      // 取得搜尋結果的使用者清單
      const users = await User.find(variable)
        .skip(skip)
        .limit(limit)
        .select("_id account name avatar bgColor")
        .lean();

      // 搜尋不到相關使用者
      if (isEmpty(users) || users.length === 0)
        return res.status(200).send({ userList: users, code: "NOT_FOUND" });

      const total = await User.countDocuments(variable);
      const totalPages = Math.ceil(total / limit);
      const nextPage = page + 1 > totalPages ? -1 : page + 1;
      // 未登入則不判斷追蹤狀態，直接回傳搜尋結果
      if (!isEmpty(users) && isEmpty(userId))
        return res.status(200).send({
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
      return res.status(400).json({ error: error.message });
    }
  },
  /** 取得推薦使用者清單(含追蹤資料)
   * @param userId 當前使用者userId(用來判斷是否已追蹤)
   */
  getRecommendUserList: async (req, res) => {
    const { userId } = req.body;

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
      return res.status(400).json({ error: error.message });
    }
  },
  /** 取得一般使用者資料 */
  getOtherUserData: async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
        .select({ password: 0 }) // 排除 password
        .lean();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.json({
        userId: user._id,
        ...user,
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
  /** 個人-取得使用者資料 */
  getOwnUserData: async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
        .select({ password: 0 }) // 排除 password
        .lean();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let userSetting = await UserSetting.findOne({
        user: req.params.id,
      }).lean();
      
      return res.status(200).json({
        userId: user._id,
        ...userSetting,
        ...user,
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
  /** 個人-更新使用者資料 */
  updateUserData: async (req, res) => {
    const userId = req.params.id;
    const {
      email,
      name,
      account,
      bio,
      avatar,
      avatarId, // pulibic_id
      removeAvatar, // true 表示要移除avatar
      language,
      emailPrompt,
      mobilePrompt,
    } = req.body;
    let avatarPath = avatar; // 大頭照url
    let publicId = avatarId; // 大頭照id
    try {
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

      if (email) {
        const checkResult = await emailExisted(email, userId);
        if (checkResult)
          return res.status(401).json({ message: "該Email已存在！" });
      }
      if (account) {
        const checkResult = await accountExisting(account, userId);
        if (checkResult)
          return res.status(401).json({ message: "該帳號名稱已存在！" });
      }

      // 更新User Info
      const updateUser = await User.findByIdAndUpdate(
        req.params.id,
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
        return res.status(404).json({ message: "user not found" });

      // 更新User Setting
      const updateUserSetting = await UserSetting.findOneAndUpdate(
        { user: req.params.id },
        {
          language,
          emailPrompt: emailPrompt === "true",
          mobilePrompt: mobilePrompt === "true",
        },
        { new: true }
      ).lean();

      const userData = { ...updateUser, ...updateUserSetting };
      return res.status(200).json(userData);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
  /** 個人-更新使用者資料(舊的-包含檔案上傳) */
  // updateUserData: async (req, res) => {
  //   const userId = req.params.id;
  //   const {
  //     email,
  //     name,
  //     account,
  //     bio,
  //     language,
  //     emailPrompt,
  //     mobilePrompt,
  //     removeAvatar,
  //   } = req.body;
  //   const avatarFile = req.file || {};
  //   const filePaths =
  //     isEmpty(avatarFile) || removeAvatar === "true"
  //       ? null
  //       : await imgurFileHandler(avatarFile); // imgur圖片檔網址(路徑)

  //   let variables = { email, name, account, bio };
  //   if (removeAvatar === "true" || !isEmpty(filePaths)) {
  //     // 有更新或移除頭貼再加入filePaths
  //     variables = {
  //       ...variables,
  //       avatar: filePaths,
  //     };
  //   }

  //   try {
  //     if (email) {
  //       const checkResult = await emailExisted(email, userId);
  //       if (checkResult)
  //         return res.status(401).json({ message: "該Email已存在！" });
  //     }
  //     if (account) {
  //       const checkResult = await accountExisting(account, userId);
  //       if (checkResult)
  //         return res.status(401).json({ message: "該帳號名稱已存在！" });
  //     }

  //     // 更新User Info
  //     const updateUser = await User.findByIdAndUpdate(
  //       req.params.id,
  //       variables,
  //       { new: true } // true 代表會回傳更新後的資料
  //     )
  //       .select({ password: 0 })
  //       .lean();

  //     if (isEmpty(updateUser))
  //       return res.status(404).json({ message: "user not found" });

  //     // 更新User Setting
  //     const updateUserSetting = await UserSetting.findOneAndUpdate(
  //       { user: req.params.id },
  //       {
  //         language,
  //         emailPrompt: emailPrompt === "true",
  //         mobilePrompt: mobilePrompt === "true",
  //       },
  //       { new: true }
  //     ).lean();

  //     const userData = { ...updateUser, ...updateUserSetting };
  //     return res.status(200).json(userData);
  //   } catch (error) {
  //     return res.status(400).json({ message: error.message });
  //   }
  // },
  /** 個人-(修改)深色模式 */
  setDarkMode: async (req, res) => {
    const { theme } = req.body;
    try {
      const result = await UserSetting.findOneAndUpdate(
        { user: req.params.id },
        { theme },
        { new: true }
      ).lean();
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
  /** 個人-刪除使用者 */
  deleteUser: async (req, res) => {
    try {
      await User.findByIdAndDelete(req.params.id);
      return res.json({ message: "User deleted" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
};

module.exports = userController;
