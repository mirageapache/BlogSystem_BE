const express = require("express");
const router = express.Router();
const User = require("../../models/user");
const { authenticate } = require("../../middleware/auth");

/** 取得所有使用者 */
router.get("/", authenticate, async (req, res) => {
  try {
    const users = await User.find().lean();
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

/** 取得特定使用者 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password").lean(); // 排除 password 欄位
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

/** 更新使用者資料 */
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).lean();
    return res.json(updatedUser);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

/** 刪除使用者 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.json({ message: "User deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
