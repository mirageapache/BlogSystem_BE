const moment = require("moment-timezone");
const { isEmpty } = require("lodash");
const { imgurFileHandler } = require("../middleware/fileUtils");
const Article = require("../models/article");

const articleController = {
  /** 取得所有文章 */
  getAllArticle: async (req, res) => {
    try {
      const articles = await Article.find()
      .sort({ createdAt: -1 }) // 依 createdAt 做遞減排序
      .populate({
        path: "author",
        select: "_id account name avatar bgColor",
      })
      .populate({
        path: "likedByUsers",
        select: "_id account name avatar bgColor",
      })
      .populate("comments")
      .lean()
      .exec();

      return res.status(200).json(articles);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
  /** 取得搜尋文章 or 特定使用者的文章
   * @param searchString 搜尋字串
   * @param authorId 作者id
   */
  getSearchArticleList: async (req, res) => {
    const { searchString, authorId } = req.body;
    let variable = {};

    if (!isEmpty(searchString) && !isEmpty(authorId)) {
      variable = {
        $or: [
          { title: new RegExp(searchString, "i") },
          { content: new RegExp(searchString, "i") },
          { hashTags: new RegExp(searchString, "i") },
          { author: authorId },
        ],
      };
    } else if (!isEmpty(searchString)) {
      variable = {
        $or: [
          { title: new RegExp(searchString, "i") },
          { content: new RegExp(searchString, "i") },
          { hashTags: new RegExp(searchString, "i") },
        ],
      };
    } else if (!isEmpty(authorId)) {
      variable = { author: authorId };
    }

    try {
      const articles = await Article.find(variable)
        .sort({ createdAt: -1 })
        .populate({
          path: "author",
          select: "_id account name avatar bgColor",
        })
        .populate({
          path: "likedByUsers",
          select: "_id account name avatar bgColor",
        })
        .populate("comments")
        .lean()
        .exec();

      if (isEmpty(articles)) return res.status(404).json({ message: "找不到相關文章`!"});

      return res.status(200).json(articles);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
  /** 取得文章詳細資料 */
  getArticleDetail: async (req, res) => {
    const { articleId } = req.body;
    try {
      const article = await Article.findOne({ _id: articleId })
      .populate({
        path: "author",
        select: "_id account name avatar bgColor",
      })
      .populate({
        path: "likedByUsers",
        select: "_id account name avatar bgColor",
      })
      .populate({
        path: "comments",
        select: "_id author replyto content createdAt",
        populate: [
          // 用巢狀的方式再嵌套User的資料
          { path: "author", select: "_id account name avatar bgColor" },
          { path: "replyTo", select: "_id account name avatar bgColor" },
        ],
      })
      .lean();
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      return res.status(200).json(article);
    } catch (error) {``
      return res.status(500).json({ message: error.message });
    }
  },
  /** 新增文章 */
  createArticle: async (req, res) => {
    const { userId, title, content, subject = '', hashTags } = req.body;
    const hashTagArr = !isEmpty(hashTags) ? JSON.parse(hashTags) : [];
    const articleImage = req.file || {};
    const filePath = !isEmpty(articleImage)
      ? await imgurFileHandler(articleImage)
      : null; // imgur圖片檔網址(路徑)

    try {
      const newArticle = await Article.create({
        author: userId,
        title,
        content,
        status: 0,
        subject,
        hashTags: hashTagArr,
        createdAt: moment.tz(new Date(), "Asia/Taipei").toDate(),
        likedByUsers: [],
        comments: [],
      });
      return res.status(200).json(newArticle);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  /** 編輯(更新)文章 */
  updateArticle: async (req, res) => {
    const { articleId, userId, title, content, subject = '', hashTags } = req.body;
    const hashTagArr = !isEmpty(hashTags) ? JSON.parse(hashTags) : [];
    const articleImage = req.file || {};
    const filePath = !isEmpty(articleImage)
      ? await imgurFileHandler(articleImage)
      : null; // imgur圖片檔網址(路徑)

    try {
      const updatedArticle = await Article.findByIdAndUpdate(
        articleId,
        {
          author: userId,
          title,
          content,
          status: 0,
          subject,
          hashTags: hashTagArr,
          editedAt: moment.tz(new Date(), "Asia/Taipei").toDate(),
        },
        { new: true }
      ).lean();
      return res.status(200).json(updatedArticle);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  /** 刪除文章 */
  deleteArticle: async (req, res) => {
    try {
      await Article.findByIdAndDelete(req.params.id);
      return res.status(200).json({ message: "Article deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
  /** 喜歡/取消喜歡 文章
   * @param articleId 文章Id
   * @param userId 使用者Id
   * @param action true / false
   */
  toggleLikeArticle: async (req, res) => {
    const { articleId, userId, action } = req.body;

    try {
      const articleData = await Article.findById(articleId);
      const likeList = articleData.likedByUsers;
      let newLikeList = likeList.map((obj) => obj.toString());

      if (action) {
        // like action
        if (!newLikeList.includes(userId)) newLikeList.push(userId);
      } else {
        // unlike action
        const rmIndex = newLikeList.indexOf(userId);
        if (rmIndex !== -1) newLikeList.splice(rmIndex, 1);
      }

      // 回寫至DB
      const updateResult = await Article.findByIdAndUpdate(
        articleId,
        { likedByUsers: newLikeList },
        { new: true }
      ).populate({
        path: "likedByUsers",
        select: "_id account name avatar bgColor",
      });

      return res.status(200).json({ message: "succeess", updateResult });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

};

module.exports = articleController;
