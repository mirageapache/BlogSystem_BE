const express = require("express");
const router = express.Router();
const Comment = require("../../models/comment");

/** 取得所有留言 */
router.get("/", async (req, res) => {
  try {
    const comments = await Comment.find()
      .populate("author")
      .populate("replyTo")
      .lean();
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** 新增留言 */
router.post("/", async (req, res) => {
  const { author, replyTo, content } = req.body;
  try {
    const comment = await Comment.create({ author, replyTo, content });
    res.status(201).json(comment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/** 更新留言 */
router.put("/:id", async (req, res) => {
  const { content } = req.body;
  try {
    const updatedComment = await Comment.findByIdAndUpdate(
      req.params.id,
      { content },
      { new: true }
    );
    res.json(updatedComment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/** 刪除留言 */
router.delete("/:id", async (req, res) => {
  try {
    await Comment.findByIdAndDelete(req.params.id);
    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
