const Post = require('../models/post');

const postController = {
   /** 取得所有貼文 */
   getAllPost: async (req, res) => {
    try {
      const posts = await Post.find()
        .populate("author")
        .populate("comments.author")
        .lean();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  /** 取得特定貼文 */
  getPostDetail: async (req, res) => {
    try {
      const post = await Post.findById(req.params.id)
        .populate("author")
        .populate("comments.author")
        .lean();
      if (!post) 
        return res.status(404).json({ message: "Post not found" });

      res.json(post);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  /** 新增貼文 */
  createPost: async (req, res) => {
    const { author, title, content, image, status, subject, hashTags } = req.body;
    
    try {
      const newPost = await Post.create({
        author,
        title,
        content,
        image,
        status,
        subject,
        hashTags,
        createdAt: new Date(),
        likedByUsers: [],
        comments: [],
      });
      res.status(201).json(newPost);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  /** 更新貼文 */
  updatePost: async (req, res) => {
    try {
      const upadtedPost = await Post.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      ).lean();
      res.json(upadtedPost);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  /** 刪除貼文 */
  deletePost: async (req, res) => {
    try {
      await Post.findByIdAndDelete(req.params.id);
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

}

module.exports = postController;