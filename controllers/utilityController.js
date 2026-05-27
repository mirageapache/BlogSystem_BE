const AES = require("crypto-js/aes");
const Article = require("../models/article");
const Post = require("../models/post");
const User = require("../models/user");
const { isEmpty } = require("lodash");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const cryptoSecret = process.env.CRYPTO_SECRET;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const utilityController = {
  /** 搜尋結果數量 */
  searchCount: async (req, res) => {
    try {
      const { searchString } = req.body;

      // 文章
      const article = await Article.countDocuments({
        $or: [
          { title: new RegExp(searchString, "i") },
          { content: new RegExp(searchString, "i") },
        ],
      });

      // 貼文
      const post = await Post.countDocuments({
        $or: [
          { content: new RegExp(searchString, "i") },
          { hashTags: new RegExp(searchString, "i") },
        ],
      });

      // 使用者
      const user = await User.countDocuments({
        $or: [
          { account: new RegExp(searchString, "i") },
          { name: new RegExp(searchString, "i") },
        ],
      });

      // 標籤
      const hashtag = await Post.countDocuments({
        hashTags: new RegExp(searchString, "i"),
      });

      return res.status(200).json({ code: "SUCCESS", article, post, user, hashtag });
    } catch (error) {
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 字串加密 */
  encode: async (req, res) => {
    const string = req.body.string;
    const encodeStr = AES.encrypt(string, cryptoSecret);
    return res.status(200).json({ code: "SUCCESS", encodeStr });
  },

  /** 字串解密 */
  decode: async (req, res) => {
    const string = req.body.string;
    const decodeStr = AES.decrypt(string, cryptoSecret);
    return res.status(200).json({ code: "SUCCESS", decodeStr });
  },

  /** 上傳圖片 */
  uploadImage: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ code: "INVALID_INPUT", message: "請上傳圖片" });
      }

      const result = await cloudinary.uploader.upload(req.file.path);
      fs.unlink(req.file.path, () => {});
      return res.json({ secure_url: result.secure_url });
    } catch (error) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(500).json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
};

module.exports = utilityController;
