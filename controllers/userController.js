const User = require("../../models/user");
const { imgurFileHandler } = require("../../middleware/fileUtils");
const UserSetting = require("../../models/userSetting");
const { isEmpty } = require("lodash");
const {
  emailExisting,
  accountExisting,
} = require("../../middleware/validator/userValidation");

const userController = {
  /** 取得所有使用者 */
  getAllUserData: async (req, res) => {
    try {
      const users = await User.find().select("-password").lean();
      return res.json(users);
    } catch (error) {
      return res.status(400).json({ message: error.message });
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
      const userSetting = await UserSetting.findOne({
        user: req.params.id,
      }).lean();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.json({
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
    const { email, name, account, bio, language, emailPrompt, mobilePrompt } =
      req.body;
    const avatarFile = req.file || {};
    const filePaths = !isEmpty(avatarFile)
      ? await imgurFileHandler(avatarFile)
      : null; // imgur圖片檔網址(路徑)

    try {
      if (email) emailExisting(email);
      if (account) accountExisting(account);

      const updateUser = await User.findByIdAndUpdate(
        req.params.id,
        { email, name, account, bio, avatar: filePaths },
        { new: true } // true 代表會回傳更新後的資料
      )
        .select({ password: 0 })
        .lean();

      const updateUserSetting = await UserSetting.findOneAndUpdate(
        { user: req.params.id },
        {
          language,
          emailPrompt: Boolean(emailPrompt),
          mobilePrompt: Boolean(mobilePrompt),
        },
        { new: true }
      ).lean();

      const userData = { ...updateUser, ...updateUserSetting };
      return res.status(200).json(userData);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
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
