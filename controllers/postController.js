const Post = require('../models/post');

const postController = {
   /** 取得所有貼文 */
   getAllPost: async (req, res) => {
    try {
      const posts = await Post.find()
        .populate("author")
        .populate("comments.author")
        .lean();
      res.status(200).json(posts);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  /** 取得特定貼文 */
  getPostDetail: async (req, res) => {
    console.log(req.body);
    try {
      const post = await Post.findById(req.body.id)
        .populate("author")
        .populate("comments.author")
        .lean();
      if (!post)
        return res.status(404).json({ message: "Post not found" });

      res.status(200).json(post);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  /** 新增貼文 */
  createPost: async (req, res) => {
    const { author, title, content, image, status, subject, hashTags } = req.body;
    console.log(req.body);
    
    try {
      const newPost = await Post.create({
        author,
        title,
        content,
        image,
        status,
        subject,
        hashTags,
      });
      console.log(newPost);
      res.status(200).json(newPost);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  /** 更新貼文 */
  updatePost: async (req, res) => {
    try {
      const upadtedPost = await Post.findByIdAndUpdate(
        req.body,
        { new: true }
      ).lean();
      res.status(200).json(upadtedPost);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  /** 刪除貼文 */
  deletePost: async (req, res) => {
    try {
      await Post.findByIdAndDelete(req.body.id);
      res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

}

module.exports = postController;