const express = require('express');
const router = express.Router();
const Article = require('../../models/article');

/** 取得所有文章 */
router.get('/', async (req, res) => {
  try {
    const articles = await Article.find().populate('author').populate('comments.author').lean();
    res.json(articles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** 取得特定文章 */
router.get('/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id).populate('author').populate('comments.author').lean();
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** 新增文章 */
router.post('/create', async (req, res) => {
  const {author, title, content, subject, tags} = req.body;
  try {
    const newArticle = await Article.create({
      author,
      title,
      content,
      status: 0,
      subject,
      tags,
      createdAt: new Date(),
      likedByUsers: [],
      comments: [],
    });
    res.status(201).json(newArticle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/** 更新文章 */
router.patch('/:id', async (req, res) => {
  try {
    const updatedArticle = await Article.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    res.json(updatedArticle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/** 刪除文章 */
router.delete('/:id', async (req, res) => {
  try {
    await Article.findByIdAndDelete(req.params.id);
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
