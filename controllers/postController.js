const Post = require("../models/post");
const Comment = require("../models/comment");
const moment = require("moment-timezone");
const {
  cloudinaryUpload,
  cloudinaryUpdate,
  cloudinaryRemove,
} = require("../middleware/fileUtils");
const { isEmpty } = require("lodash");
const { isValidId, escapeRegExp, parseHashTags, USER_PUBLIC_FIELDS } = require("../middleware/commonUtils");
const notificationService = require("../services/notificationService");

/** 公開可見的貼文狀態：1-發佈(公開) / 2-發佈(限閱)。草稿(0)與下架(3)僅作者本人可見 */
const PUBLIC_STATUS = [1, 2];

const postController = {
  /** (動態)取得貼文 */
  getPartialPostList: async (req, res) => {
    try {
      const page = parseInt(req.body.page) || 1; // 獲取頁碼，預設為1
      const limit = parseInt(req.body.limit) || 20; // 每頁顯示的數量，預設為20
      const skip = (page - 1) * limit; // 計算需要跳過的貼文資料數

      const publicFilter = { status: { $in: PUBLIC_STATUS } }; // 僅公開貼文，排除草稿/下架

      const posts = await Post.find(publicFilter)
        .sort({ createdAt: -1 }) // 依 createdAt 做遞減排序
        .skip(skip) // 跳過前面的資料
        .limit(limit) // 限制返回的資料數
        .populate("author", {
          _id: 1,
          account: 1,
          name: 1,
          avatar: 1,
          bgColor: 1,
        })
        .populate({
          path: "likedByUsers",
          select: USER_PUBLIC_FIELDS,
        })
        .populate("comments")
        .lean()
        .exec();

      // 貼文總筆數，用於計算頁數
      const total = await Post.countDocuments(publicFilter);
      const totalPages = Math.ceil(total / limit); // 總頁數
      const nextPage = page + 1 > totalPages ? -1 : page + 1; // 下一頁指標，如果是最後一頁則回傳-1

      return res.status(200).json({
        posts,
        nextPage: total === 0 ? -1 : nextPage,
        totalPosts: total,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 取得搜尋貼文 or 特定使用者的文章
   * @param searchString 搜尋字串
   * @param authorId 作者id
   */
  getSearchPostList: async (req, res) => {
    const { searchString, authorId } = req.body;
    const page = parseInt(req.body.page) || 1; // 獲取頁碼，預設為1
    const limit = parseInt(req.body.limit) || 20; // 每頁顯示的數量，預設為20
    const skip = (page - 1) * limit; // 計算需要跳過的資料數
    let variable = {};

    const safe = escapeRegExp(searchString);
    if (!isEmpty(searchString) && !isEmpty(authorId)) {
      variable = {
        $or: [
          { content: new RegExp(safe, "i") },
          { hashTags: new RegExp(safe, "i") },
          { author: authorId },
        ],
      };
    } else if (!isEmpty(searchString)) {
      variable = {
        $or: [
          { content: new RegExp(safe, "i") },
          { hashTags: new RegExp(safe, "i") },
        ],
      };
    } else if (!isEmpty(authorId)) {
      variable = { author: authorId };
    }
    variable.status = { $in: PUBLIC_STATUS }; // 公開搜尋僅回傳公開貼文，作者草稿請走 /myList

    try {
      const posts = await Post.find(variable)
        .sort({ createdAt: -1 })
        .skip(skip) // 跳過前面的資料
        .limit(limit) // 限制返回的資料數
        .populate("author", {
          _id: 1,
          account: 1,
          name: 1,
          avatar: 1,
          bgColor: 1,
        })
        .populate({
          path: "likedByUsers",
          select: USER_PUBLIC_FIELDS,
        })
        .populate("comments")
        .lean()
        .exec();

      // 取得搜尋資料總數，用於計算總數
      const total = await Post.countDocuments(variable);
      const totalPages = Math.ceil(total / limit); // 總頁數
      const nextPage = page + 1 > totalPages ? -1 : page + 1; // 下一頁指標，如果是最後一頁則回傳-1

      return res.status(200).json({
        posts,
        nextPage: total === 0 ? -1 : nextPage,
        totalPosts: total,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 取得貼文詳細資料 */
  getPostDetail: async (req, res) => {
    const { postId } = req.body;
    if (!isValidId(postId))
      return res.status(404).json({ code: "NOT_FOUND", message: "沒有貼文資料" });
    try {
      const post = await Post.findOne({ _id: postId })
        .populate("author", {
          _id: 1,
          account: 1,
          name: 1,
          avatar: 1,
          bgColor: 1,
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
        .lean()
        .exec();
      if (!post)
        return res
          .status(404)
          .json({ code: "NOT_FOUND", message: "沒有貼文資料" });

      // 非公開貼文(草稿/下架)僅作者本人可讀；req.user 由 optionalAuth 提供
      const isOwner =
        req.user && post.author?._id?.toString() === req.user.userId;
      if (!PUBLIC_STATUS.includes(post.status) && !isOwner) {
        return res
          .status(404)
          .json({ code: "NOT_FOUND", message: "沒有貼文資料" });
      }

      return res.status(200).json(post);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 取得「我的貼文」清單（含草稿/下架等所有狀態，僅作者本人）
   * @param status 選填，指定只回傳特定狀態（例如只看草稿 0）
   */
  getMyPosts: async (req, res) => {
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { author: req.user.userId };
    const parsedStatus = parseInt(req.body.status);
    if ([0, 1, 2, 3].includes(parsedStatus)) filter.status = parsedStatus;

    try {
      const posts = await Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", {
          _id: 1,
          account: 1,
          name: 1,
          avatar: 1,
          bgColor: 1,
        })
        .lean()
        .exec();

      const total = await Post.countDocuments(filter);
      const totalPages = Math.ceil(total / limit);
      const nextPage = page + 1 > totalPages ? -1 : page + 1;

      return res.status(200).json({
        posts,
        nextPage: total === 0 ? -1 : nextPage,
        totalPosts: total,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 新增貼文 */
  createPost: async (req, res) => {
    const { content, status, hashTags } = req.body;
    const hashTagArr = parseHashTags(hashTags);
    // 狀態白名單驗證；未提供或非法值時預設為 0(草稿)
    const parsedStatus = parseInt(status);
    const postStatus = [0, 1, 2, 3].includes(parsedStatus) ? parsedStatus : 0;
    let publicId = "";
    let imagePath = "";

    try {
      if (req.file) {
        const uploadResult = await cloudinaryUpload(req);
        publicId = uploadResult.public_id;
        imagePath = uploadResult.secure_url;
      }

      const newPost = await Post.create({
        author: req.user.userId,
        content,
        image: imagePath,
        imageId: publicId,
        status: postStatus,
        hashTags: hashTagArr,
        createdAt: moment.tz(new Date(), "Asia/Taipei").toDate(),
      });
      return res.status(200).json(newPost);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 編輯(更新)貼文 */
  updatePost: async (req, res) => {
    const { postId, content, status, removeImage, hashTags } = req.body;
    const hashTagArr = parseHashTags(hashTags);
    // 僅在前端有傳入合法狀態時才更新，避免編輯既有貼文時誤將狀態重設為草稿
    const parsedStatus = parseInt(status);
    const postStatus = [0, 1, 2, 3].includes(parsedStatus) ? parsedStatus : null;

    try {
      if (!isValidId(postId))
        return res.status(404).json({ code: "NOT_FOUND", message: "貼文不存在" });

      const existing = await Post.findById(postId)
        .select("author image imageId content")
        .lean();
      if (!existing)
        return res.status(404).json({ code: "NOT_FOUND", message: "貼文不存在" });
      if (existing.author.toString() !== req.user.userId)
        return res.status(403).json({ code: "FORBIDDEN", message: "無權限編輯此貼文" });

      // 圖片一律以 DB 既有值為基礎，只允許透過 req.file / removeImage 變更，不採信前端傳入的 image / imageId
      let publicId = existing.imageId;
      let imagePath = existing.image;

      if (req.file) {
        if (isEmpty(publicId)) {
          const uploadResult = await cloudinaryUpload(req);
          publicId = uploadResult.public_id;
          imagePath = uploadResult.secure_url;
        } else {
          const uploadResult = await cloudinaryUpdate(req, publicId);
          imagePath = uploadResult.secure_url;
        }
      }

      if (removeImage === "true") {
        await cloudinaryRemove(publicId);
        imagePath = "";
        publicId = "";
      }

      const updateData = {
        content,
        image: imagePath,
        imageId: publicId,
        hashTags: hashTagArr,
      };
      if (postStatus !== null) updateData.status = postStatus;
      // 僅在內容真的變動時才更新 editedAt；純調整狀態(發佈/下架)不算重新編輯
      if (content !== undefined && content !== existing.content)
        updateData.editedAt = moment.tz(new Date(), "Asia/Taipei").toDate();

      const updatedPost = await Post.findByIdAndUpdate(postId, updateData, {
        new: true,
      }).lean();

      return res.status(200).json(updatedPost);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 刪除貼文 */
  deletePost: async (req, res) => {
    try {
      const postId = req.body.postId;
      const existing = await Post.findById(postId).select("author comments").lean();
      if (!existing)
        return res.status(404).json({ code: "NOT_FOUND", message: "貼文不存在" });
      if (existing.author.toString() !== req.user.userId)
        return res.status(403).json({ code: "FORBIDDEN", message: "無權限刪除此貼文" });

      await Post.findByIdAndDelete(postId); // 主操作先落地(權威)，連帶清理視為 best-effort
      // 連帶清除掛在此貼文的留言，與所有指向本貼文的通知；清理失敗不可讓已完成的刪除變 500
      try {
        await Comment.deleteMany({ _id: { $in: existing.comments || [] } });
        await notificationService.removeEntityNotifications("post", postId);
      } catch (e) {
        console.error("[deletePost] cascade cleanup failed:", e.message);
      }
      return res
        .status(200)
        .json({ code: "DELETE_SUCCESS", message: "刪除成功" });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 喜歡/取消喜歡 貼文
   * @param postId 貼文Id
   * @param action true / false
   */
  toggleLikePost: async (req, res) => {
    const { postId, action } = req.body;
    const userId = req.user.userId;

    try {
      if (!isValidId(postId))
        return res.status(404).json({ code: "NOT_FOUND", message: "貼文不存在" });

      const visible = { status: { $in: PUBLIC_STATUS } }; // 草稿/下架不可被按讚、不觸發通知

      // 條件式 filter 偵測按讚 transition：命中(有回傳)才是狀態真的改變，
      // 避免重送 action:true 把已讀通知洗回未讀。可見性一併收進 filter。
      const transitioned = action
        ? await Post.findOneAndUpdate(
            { _id: postId, ...visible, likedByUsers: { $ne: userId } },
            { $addToSet: { likedByUsers: userId } },
            { new: true }
          ).select("author content")
        : await Post.findOneAndUpdate(
            { _id: postId, ...visible, likedByUsers: userId },
            { $pull: { likedByUsers: userId } },
            { new: true }
          ).select("author");

      // no-op(已讚過/未讚過)時 transitioned 為 null，仍需回傳目前貼文給前端，維持原回傳形狀
      const updateResult = await Post.findOne({ _id: postId, ...visible })
        .populate("author", { _id: 1, account: 1, name: 1, avatar: 1, bgColor: 1 })
        .populate({ path: "likedByUsers", select: USER_PUBLIC_FIELDS });

      if (!updateResult)
        return res.status(404).json({ code: "NOT_FOUND", message: "貼文不存在" });

      // 只在真的 transition 時動通知；通知失敗不可讓按讚主流程失敗
      if (transitioned) {
        try {
          if (action) {
            await notificationService.createNotification({
              recipient: transitioned.author,
              sender: userId,
              type: "like_post",
              entityType: "post",
              entityId: postId,
              preview: (transitioned.content || "").slice(0, 50),
            });
          } else {
            await notificationService.removeNotification({
              recipient: transitioned.author,
              sender: userId,
              type: "like_post",
              entityId: postId,
            });
          }
        } catch (e) {
          console.error("[notification] like_post hook failed:", e.message);
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

  /** 取得(搜尋)hashTag資料 */
  getHashTag: async (req, res) => {
    const { searchString } = req.body;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 20;
    const skip = (page - 1) * limit;

    if (isEmpty(searchString))
      return res.status(200).json({ posts: [], code: "NO_SEARCH_STRING" });

    const safe = escapeRegExp(searchString);
    const hashTagFilter = {
      hashTags: new RegExp(safe, "i"),
      status: { $in: PUBLIC_STATUS },
    }; // 公開 hashTag 搜尋僅回傳公開貼文
    try {
      const posts = await Post.find(hashTagFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", {
          _id: 1,
          account: 1,
          name: 1,
          avatar: 1,
          bgColor: 1,
        })
        .populate({
          path: "likedByUsers",
          select: USER_PUBLIC_FIELDS,
        })
        .populate("comments")
        .lean()
        .exec();

      if (!posts)
        return res.status(404).json({ code: "NOT_FOUND", message: "沒有貼文" });

      // 取得搜尋資料總數，用於計算總數
      const total = await Post.countDocuments(hashTagFilter);
      const totalPages = Math.ceil(total / limit); // 總頁數
      const nextPage = page + 1 > totalPages ? -1 : page + 1; // 下一頁指標，如果是最後一頁則回傳-1

      return res.status(200).json({
        posts,
        nextPage: nextPage,
        totalPost: total,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },
};

module.exports = postController;
