const Post = require("../models/post");
const moment = require("moment-timezone");

const localTime = moment.tz(new Date(), "Asia/Taipei").toDate(); // 轉換時區時間

const postController = {
  /** 取得所有貼文 */
  getAllPost: async (req, res) => {
    try {
      const posts = await Post.find()
        .sort({ createdAt: -1 }) // 依 createdAt 做遞減排序
        .populate("author", {
          _id: 1,
          account: 1,
          name: 1,
          avatar: 1,
          bgColor: 1,
        })
        .populate("comments.author")
        .lean()
        .exec();
      res.status(200).json(posts);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /** 取得特定貼文 */
  getPostDetail: async (req, res) => {
    const { postId } = req.body;
    try {
      const post = await Post.findById(postId)
        .populate("author", {
          _id: 1,
          account: 1,
          name: 1,
          avatar: 1,
          bgColor: 1,
        })
        .populate("comments.author")
        .lean()
        .exec();
      if (!post) return res.status(404).json({ message: "Post not found" });

      res.status(200).json(post);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /** 新增貼文 */
  createPost: async (req, res) => {
    const { userId, content, image, status, hashTags } = req.body;
    try {
      const newPost = await Post.create({
        author: userId,
        content,
        image,
        status,
        hashTags,
        createdAt: localTime,
      });
      res.status(200).json(newPost);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  /** 更新貼文 */
  updatePost: async (req, res) => {
    const { postId, content, image, status, hashTags } = req.body;

    try {
      const upadtedPost = await Post.findByIdAndUpdate(
        postId,
        {
          content,
          image,
          status,
          hashTags,
          editedAt: localTime,
        },
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

  /** 喜歡/取消喜歡貼文
   * @param postId 貼文Id
   * @param userId 使用者Id
   * @param action 'like' / 'unlike'
   */
  handleLikePost: async (req, res) => {
    const { postId, userId, action } = req.body;

    try {
      const postData = await Post.findById(postId);
      const likeList = postData.likedByUsers;
      let newLikeList = likeList.map((obj) => obj.toString());

      if (action === "like") {
        // like action
        if (!newLikeList.includes(userId)) newLikeList.push(userId);
      } else {
        // unlike action
        const rmIndex = newLikeList.indexOf(userId);
        if (rmIndex !== -1) newLikeList.splice(rmIndex, 1);
      }

      // 回寫至DB
      const updateResult = await Post.findByIdAndUpdate(
        postId,
        { likedByUsers: newLikeList },
        { new: true }
      );

      return res.status(200).json({ message: "succeess", updateResult });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
};

module.exports = postController;
