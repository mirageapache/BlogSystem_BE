const AES = require('crypto-js/aes');
const Article = require('../models/article');
const Post = require('../models/post');
const User = require('../models/user');
const { isEmpty } = require('lodash');
const cryptoSecret = process.env.CRYPTO_SECRET;

const utilityController = {
  /** 搜尋結果數量 */
  searchCount: async (req, res) => {
    try {
      const { searchString } = req.body;
      if (isEmpty(searchString)) return res.status(200).json({ code: 'NULL' });

      // 文章
      const article = await Article.countDocuments({
        title: new RegExp(searchString, 'i'),
        content: new RegExp(searchString, 'i'),
      });

      // 貼文
      const post = await Post.countDocuments({
        content: new RegExp(searchString, 'i'),
        hashTags: new RegExp(searchString, 'i'),
      });

      // 使用者
      const user = await User.countDocuments({
        email: new RegExp(searchString, 'i'),
        account: new RegExp(searchString, 'i'),
        name: new RegExp(searchString, 'i'),
      });

      // 標籤
      const hashtag = await Post.countDocuments({
        hashTags: new RegExp(searchString, 'i'),
      });

      return res.status(200).json({ article, post, user, hashtag });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  /** 字串加密 */
  encode: async (req, res) => {
    const string = req.body.string;
    const encodeStr = AES.encrypt(string, cryptoSecret);
    return res.status(200).json({ encodeStr });
  },

  /** 字串解密 */
  decode: async (req, res) => {
    const string = req.body.string;
    const decodeStr = AES.decrypt(string, cryptoSecret);
    return res.status(200).json({ decodeStr });
  },
};

module.exports = utilityController;
