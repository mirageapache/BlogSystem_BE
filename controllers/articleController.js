const moment = require("moment-timezone");
const { isEmpty } = require("lodash");
const Article = require("../models/article");
const { convertDraftToTiptap, convertTiptapToDraft } = require('../middleware/articleUtils');
const { isValidId, escapeRegExp, parseHashTags, USER_PUBLIC_FIELDS } = require("../middleware/commonUtils");
const notificationService = require("../services/notificationService");

/** 公開可見的文章狀態：1-發佈(公開) / 2-發佈(限閱)。草稿(0)與下架(3)僅作者本人可見 */
const PUBLIC_STATUS = [1, 2];

const articleController = {
  /** (動態)取得文章 */
  getPartialArticle: async (req, res) => {
    try {
      const page = parseInt(req.body.page) || 1; // 獲取頁碼，預設為1
      const limit = parseInt(req.body.limit) || 20; // 每頁顯示的數量，預設為20
      const skip = (page - 1) * limit; // 計算需要跳過的貼文資料數

      const publicFilter = { status: { $in: PUBLIC_STATUS } }; // 僅公開文章，排除草稿/下架

      const articles = await Article.find(publicFilter)
        .sort({ createdAt: -1 }) // 依 createdAt 做遞減排序
        .skip(skip) // 跳過前面的資料
        .limit(limit) // 限制返回的資料數
        .populate({
          path: "author",
          select: USER_PUBLIC_FIELDS,
        })
        .populate({
          path: "likedByUsers",
          select: USER_PUBLIC_FIELDS,
        })
        .populate("comments")
        .lean()
        .exec();

      // 文章總筆數，用於計算總頁數
      const total = await Article.countDocuments(publicFilter);
      const totalArticle = Math.ceil(total / limit); // 總頁數
      const nextPage = page + 1 > totalArticle ? -1 : page + 1; // 下一頁指標，如果是最後一頁則回傳-1

      return res.status(200).json({
        articles,
        nextPage: total === 0 ? -1 : nextPage,
        totalArticle: total,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 取得搜尋文章 or 特定使用者的文章
   * @param searchString 搜尋字串
   * @param authorId 作者id
   */
  getSearchArticleList: async (req, res) => {
    const { searchString, authorId } = req.body;
    const page = parseInt(req.body.page) || 1; // 獲取頁碼，預設為1
    const limit = parseInt(req.body.limit) || 20; // 每頁顯示的數量，預設為20
    const skip = (page - 1) * limit; // 計算需要跳過的資料數
    let variable = {};

    const safe = escapeRegExp(searchString);
    if (!isEmpty(searchString) && !isEmpty(authorId)) {
      variable = {
        $or: [
          { title: new RegExp(safe, "i") },
          { content: new RegExp(safe, "i") },
          { author: authorId },
        ],
      };
    } else if (!isEmpty(searchString)) {
      variable = {
        $or: [
          { title: new RegExp(safe, "i") },
          { content: new RegExp(safe, "i") },
        ],
      };
    } else if (!isEmpty(authorId)) {
      variable = { author: authorId };
    }
    variable.status = { $in: PUBLIC_STATUS }; // 公開搜尋僅回傳公開文章，作者草稿請走 /myList

    try {
      const articles = await Article.find(variable)
        .sort({ createdAt: -1 })
        .skip(skip) // 跳過前面的資料
        .limit(limit) // 限制返回的資料數
        .populate({
          path: "author",
          select: USER_PUBLIC_FIELDS,
        })
        .populate({
          path: "likedByUsers",
          select: USER_PUBLIC_FIELDS,
        })
        .populate("comments")
        .lean()
        .exec();

      // 取得搜尋資料總數，用於計算總數
      const total = await Article.countDocuments(variable);
      const totalPages = Math.ceil(total / limit); // 總頁數
      const nextPage = page + 1 > totalPages ? -1 : page + 1; // 下一頁指標，如果是最後一頁則回傳-1

      return res.status(200).json({
        articles,
        nextPage: total === 0 ? -1 : nextPage,
        totalArticle: total,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 取得文章詳細資料 */
  getArticleDetail: async (req, res) => {
    const { articleId, clientType } = req.body;

    if (!isValidId(articleId))
      return res.status(404).json({ code: "NOT_FOUND", message: "沒有文章資料" });

    try {
      const article = await Article.findOne({ _id: articleId })
        .populate({
          path: "author",
          select: USER_PUBLIC_FIELDS,
        })
        .populate({
          path: "likedByUsers",
          select: USER_PUBLIC_FIELDS,
        })
        .populate({
          path: "comments",
          select: "_id author replyTo content createdAt",
          populate: [
            // 用巢狀的方式再嵌套User的資料
            { path: "author", select: USER_PUBLIC_FIELDS },
            { path: "replyTo", select: USER_PUBLIC_FIELDS },
          ],
        })
        .lean();

      if (!article) {
        return res
          .status(404)
          .json({ code: "NOT_FOUND", message: "沒有文章資料" });
      }

      // 非公開文章(草稿/下架)僅作者本人可讀；req.user 由 optionalAuth 提供
      const isOwner =
        req.user && article.author?._id?.toString() === req.user.userId;
      if (!PUBLIC_STATUS.includes(article.status) && !isOwner) {
        return res
          .status(404)
          .json({ code: "NOT_FOUND", message: "沒有文章資料" });
      }

      // 根據前端專案轉換文章內容格式
      if (clientType === 'vue') {
        // 如果是 Vue 專案，將內容轉換為 Tiptap 格式，React 專案則保留 Draft.js 格式
        article.content = convertDraftToTiptap(article.content);
      }
      return res.status(200).json(article);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 取得「我的文章」清單（含草稿/下架等所有狀態，僅作者本人）
   * @param status 選填，指定只回傳特定狀態（例如只看草稿 0）
   */
  getMyArticles: async (req, res) => {
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { author: req.user.userId };
    const parsedStatus = parseInt(req.body.status);
    if ([0, 1, 2, 3].includes(parsedStatus)) filter.status = parsedStatus;

    try {
      const articles = await Article.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "author", select: USER_PUBLIC_FIELDS })
        .lean()
        .exec();

      const total = await Article.countDocuments(filter);
      const totalPages = Math.ceil(total / limit);
      const nextPage = page + 1 > totalPages ? -1 : page + 1;

      return res.status(200).json({
        articles,
        nextPage: total === 0 ? -1 : nextPage,
        totalArticle: total,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 新增文章 */
  createArticle: async (req, res) => {
    const { title, content, status, hashTags, clientType } = req.body;
    const hashTagArr = parseHashTags(hashTags);
    // 狀態白名單驗證；未提供或非法值時預設為 0(草稿)
    const parsedStatus = parseInt(status);
    const articleStatus = [0, 1, 2, 3].includes(parsedStatus) ? parsedStatus : 0;

    try {
      const articleContent = clientType === 'vue' ? convertTiptapToDraft(content) : content;

      const newArticle = await Article.create({
        author: req.user.userId,
        title,
        content: articleContent,
        status: articleStatus,
        hashTags: hashTagArr,
        createdAt: moment.tz(new Date(), "Asia/Taipei").toDate(),
        likedByUsers: [],
        comments: [],
      });
      return res.status(200).json(newArticle);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 編輯(更新)文章 */
  updateArticle: async (req, res) => {
    const {
      articleId,
      title,
      content,
      status,
      hashTags,
      clientType
    } = req.body;
    const hashTagArr = parseHashTags(hashTags);
    // 僅在前端有傳入合法狀態時才更新，避免編輯既有文章時誤將狀態重設為草稿
    const parsedStatus = parseInt(status);
    const articleStatus = [0, 1, 2, 3].includes(parsedStatus) ? parsedStatus : null;

    try {
      if (!isValidId(articleId))
        return res.status(404).json({ code: "NOT_FOUND", message: "文章不存在" });

      const existing = await Article.findById(articleId).select("author content").lean();
      if (!existing)
        return res.status(404).json({ code: "NOT_FOUND", message: "文章不存在" });
      if (existing.author.toString() !== req.user.userId)
        return res.status(403).json({ code: "FORBIDDEN", message: "無權限編輯此文章" });

      const articleContent = clientType === 'vue' ? convertTiptapToDraft(content) : content;

      const updateData = {
        title,
        content: articleContent,
        hashTags: hashTagArr,
      };
      if (articleStatus !== null) updateData.status = articleStatus;
      // 僅在內容真的變動時才更新 editedAt；純調整狀態(發佈/下架)不算重新編輯
      if (content !== undefined && articleContent !== existing.content)
        updateData.editedAt = moment.tz(new Date(), "Asia/Taipei").toDate();

      const updatedArticle = await Article.findByIdAndUpdate(
        articleId,
        updateData,
        { new: true }
      ).lean();
      return res.status(200).json(updatedArticle);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 刪除文章 */
  deleteArticle: async (req, res) => {
    try {
      const articleId = req.body.articleId;
      if (!isValidId(articleId))
        return res.status(404).json({ code: "NOT_FOUND", message: "文章不存在" });

      const existing = await Article.findById(articleId).select("author").lean();
      if (!existing)
        return res.status(404).json({ code: "NOT_FOUND", message: "文章不存在" });
      if (existing.author.toString() !== req.user.userId)
        return res.status(403).json({ code: "FORBIDDEN", message: "無權限刪除此文章" });

      await Article.findByIdAndDelete(articleId);
      return res.status(200).json({
        code: "DELETE_SUCCESS",
        message: "文章刪除成功",
      });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
  /** 喜歡/取消喜歡 文章
   * @param articleId 文章Id
   * @param action true / false
   */
  toggleLikeArticle: async (req, res) => {
    const { articleId, action } = req.body;
    const userId = req.user.userId;

    try {
      if (!isValidId(articleId))
        return res.status(404).json({ code: "NOT_FOUND", message: "文章不存在" });

      const visible = { status: { $in: PUBLIC_STATUS } }; // 草稿/下架不可被按讚、不觸發通知

      // 條件式 filter 偵測按讚 transition：命中(有回傳)才是狀態真的改變，可見性一併收進 filter
      const transitioned = action
        ? await Article.findOneAndUpdate(
            { _id: articleId, ...visible, likedByUsers: { $ne: userId } },
            { $addToSet: { likedByUsers: userId } },
            { new: true }
          ).select("author title")
        : await Article.findOneAndUpdate(
            { _id: articleId, ...visible, likedByUsers: userId },
            { $pull: { likedByUsers: userId } },
            { new: true }
          ).select("author");

      // no-op 時 transitioned 為 null，仍需回傳目前文章給前端，維持原回傳形狀
      const updateResult = await Article.findOne({ _id: articleId, ...visible })
        .populate({ path: "author", select: USER_PUBLIC_FIELDS })
        .populate({ path: "likedByUsers", select: USER_PUBLIC_FIELDS });

      if (!updateResult)
        return res.status(404).json({ code: "NOT_FOUND", message: "文章不存在" });

      // 只在真的 transition 時動通知；通知失敗不可讓按讚主流程失敗
      if (transitioned) {
        try {
          if (action) {
            await notificationService.createNotification({
              recipient: transitioned.author,
              sender: userId,
              type: "like_article",
              entityType: "article",
              entityId: articleId,
              preview: (transitioned.title || "").slice(0, 50),
            });
          } else {
            await notificationService.removeNotification({
              recipient: transitioned.author,
              sender: userId,
              type: "like_article",
              entityId: articleId,
            });
          }
        } catch (e) {
          console.error("[notification] like_article hook failed:", e.message);
        }
      }

      return res
        .status(200)
        .json({ code: "SUCCESS", message: "操作成功", updateResult });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
};

module.exports = articleController;
