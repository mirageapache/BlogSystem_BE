const moment = require("moment-timezone");
const Article = require("../models/article");

const articleController = {
  /** 取得所有文章 */
  getAllArticle: async (req, res) => {
    try {
      const articles = await Article.find()
        .populate("author")
        .populate("comments.author")
        .lean();
      res.status(200).json(articles);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  /** 取得特定文章 */
  getArticleDetail: async (req, res) => {
    try {
      const article = await Article.findById(req.params.id)
        .populate("author")
        .populate("comments.author")
        .lean();
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.status(200).json(article);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  /** 新增文章 */
  createArticle: async (req, res) => {
    const { author, title, content, subject, tags } = req.body;
    try {
      const newArticle = await Article.create({
        author,
        title,
        content,
        status: 0,
        subject,
        tags,
        createdAt: moment.tz(new Date(), "Asia/Taipei").toDate(),
        likedByUsers: [],
        comments: [],
      });
      res.status(200).json(newArticle);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  /** 更新文章 */
  updateArticle: async (req, res) => {
    try {
      const updatedArticle = await Article.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      ).lean();
      res.status(200).json(updatedArticle);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  /** 刪除文章 */
  deleteArticle: async (req, res) => {
    try {
      await Article.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: "Article deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

module.exports = articleController;
