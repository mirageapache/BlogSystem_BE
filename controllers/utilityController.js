const Article = require("../models/article");
const Post = require("../models/post");
const User = require("../models/user");
const { escapeRegExp } = require("../middleware/commonUtils");

const utilityController = {
  /** 搜尋結果數量 */
  searchCount: async (req, res) => {
    try {
      const { searchString } = req.body;
      const safe = escapeRegExp(searchString);

      // 文章
      const article = await Article.countDocuments({
        $or: [
          { title: new RegExp(safe, "i") },
          { content: new RegExp(safe, "i") },
        ],
      });

      // 貼文
      const post = await Post.countDocuments({
        $or: [
          { content: new RegExp(safe, "i") },
          { hashTags: new RegExp(safe, "i") },
        ],
      });

      // 使用者
      const user = await User.countDocuments({
        $or: [
          { account: new RegExp(safe, "i") },
          { name: new RegExp(safe, "i") },
        ],
      });

      // 標籤
      const hashtag = await Post.countDocuments({
        hashTags: new RegExp(safe, "i"),
      });

      return res.status(200).json({ code: "SUCCESS", article, post, user, hashtag });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
};

module.exports = utilityController;
