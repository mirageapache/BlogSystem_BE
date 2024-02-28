const express = require("express");
const router = express.Router();
const User = require("../../models/user");
const { signupValidation } = require("../../middleware/validator");

/** 取得所有使用者 */
router.get("/", async (req, res) => {
  try {
    const users = await User.find().lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** 取得特定使用者 */
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** 新增使用者(註冊) */
router.post("/signup", async (req, res) => {
  signupValidation();
  try {
    const { account, password, name, email, avatar, userRole, status } =
      req.body;
    const newUser = await User.create({
      account,
      password,
      name,
      email,
      avatar: avatar || "",
      userRole: userRole || 0,
      status: status || 0,
    });
    res.status(200).json(newUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/** 更新使用者資料 */
router.patch("/:id", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).lean();
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/** 刪除使用者 */
router.delete("/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
