const express = require("express");
const router = express.Router();
const User = require("../../models/user");
const { authorization } = require("../../middleware/auth");
const { imgurFileHandler, uploadFile } = require('../../middleware/fileUtils')

/** 取得所有使用者 */
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password").lean();
    return res.json(users);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

/** 取得一般使用者資料 */
router.post("/:id", async (req, res) => {
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
    console.log("error", error);
    return res.status(400).json({ message: error.message });
  }
});

/** 個人-取得使用者資料 */
router.post("/own/:id", authorization, async (req, res) => {
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
    console.log("error", error);
    return res.status(400).json({ message: error.message });
  }
});

/** 個人-更新使用者資料 */
router.patch("/own/:id", authorization, uploadFile, async (req, res) => {

  console.log(req.files);
  const { email, name, account, bio } = req.body;
  const { avatar = null } = req.files || {}

  const filePaths = {
    updatedAvatar: avatar ? await imgurFileHandler(avatar[0], 'avatar') : null
  }
  console.log(filePaths);

  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, {
      email,
      name,
      account,
      bio,
      avatar: filePaths.updatedAvatar,
    }, {
      new: true, // true 代表會回傳更新後的資料
    })
      .select({ password: 0 })
      .lean();
    console.log(updatedUser);
    return res.json(updatedUser);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// const testfunction = () => {
//   putUser: async (req, res, next) => {
//     const id = Number(req.params?.id)
//     const { name, introduction, resetCover } = req.body
//     const { avatar = null, cover = null } = req.files || {}
//     try {
//       const user = await User.findByPk(id)
//       if (!user) return res.status(404).json({ status: 'error', message: 'User not found' })
//       const filePaths = {
//         updatedAvatar: avatar ? await imgurFileHandler(avatar[0], 'avatar') : null,
//         updatedCover: cover ? await imgurFileHandler(cover[0], 'cover') : null
//       }
//       const updatedUser = await user.update({
//         name,
//         avatar: filePaths.updatedAvatar || user.avatar,
//         cover: resetCover ? 'https://raw.githubusercontent.com/mirageapache/simple_twitter_frontend/main/src/assets/images/default_user_cover.jpg' : filePaths.updatedCover || user.cover,
//         introduction
//       })
//       delete updatedUser.password
//       delete updatedUser.role
//       return res.status(200).json({
//         status: 'success',
//         message: 'Successfully updated the user',
//         data: { user: updatedUser }
//       })
//     } catch (err) { next(err) }
//   }
// }

/** 個人-刪除使用者 */
router.delete("/own/:id", authorization, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.json({ message: "User deleted" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
