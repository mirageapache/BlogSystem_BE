const Post = require("../models/post");
const moment = require("moment-timezone");
const {
  cloudinaryUpload,
  cloudinaryUpdate,
  cloudinaryRemove,
} = require("../middleware/fileUtils");
const { isEmpty } = require("lodash");
const UserSetting = require("../models/userSetting");

const postController = {
  /** 取得所有貼文 */
  getAllPostList: async (req, res) => {
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
        .populate({
          path: "likedByUsers",
          select: "_id account name avatar bgColor",
        })
        .populate("comments")
        .lean()
        .exec();
      return res.status(200).json(posts);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** (動態)取得貼文 */
  getPartialPostList: async (req, res) => {
    try {
      const page = parseInt(req.body.page) || 1; // 獲取頁碼，預設為1
      const limit = parseInt(req.body.limit) || 20; // 每頁顯示的數量，預設為20
      const skip = (page - 1) * limit; // 計算需要跳過的貼文資料數

      const posts = await Post.find()
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
          select: "_id account name avatar bgColor",
        })
        .populate("comments")
        .lean()
        .exec();

      // 貼文總筆數，用於計算頁數
      const total = await Post.countDocuments();
      const totalPages = Math.ceil(total / limit); // 總頁數
      const nextPage = page + 1 > totalPages ? -1 : page + 1; // 下一頁指標，如果是最後一頁則回傳-1

      return res.status(200).json({
        posts,
        nextPage: nextPage,
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

    if (!isEmpty(searchString) && !isEmpty(authorId)) {
      variable = {
        $or: [
          { content: new RegExp(searchString, "i") },
          { hashTags: new RegExp(searchString, "i") },
          { author: authorId },
        ],
      };
    } else if (!isEmpty(searchString)) {
      variable = {
        $or: [
          { content: new RegExp(searchString, "i") },
          { hashTags: new RegExp(searchString, "i") },
        ],
      };
    } else if (!isEmpty(authorId)) {
      variable = { author: authorId };
    }

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
          select: "_id account name avatar bgColor",
        })
        .populate("comments")
        .lean()
        .exec();
      if (!posts)
        return res.status(404).json({ code: "NOT_FOUND", message: "沒有貼文" });

      // 取得搜尋資料總數，用於計算總數
      const total = await Post.countDocuments(variable);
      const totalPages = Math.ceil(total / limit); // 總頁數
      const nextPage = page + 1 > totalPages ? -1 : page + 1; // 下一頁指標，如果是最後一頁則回傳-1

      return res.status(200).json({
        posts,
        nextPage: nextPage,
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
        .lean()
        .exec();
      if (!post) return res.status(404).json({ code: "NOT_FOUND", message: "沒有貼文資料" });

      return res.status(200).json(post);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 新增貼文 */
  createPost: async (req, res) => {
    const { author, content, status, hashTags } = req.body;
    const hashTagArr = !isEmpty(hashTags) ? JSON.parse(hashTags) : [];
    let publicId = ""; // cloudinary的 public_id 後續再做圖片編輯或刪除時用的
    let imagePath = "";

    try {
      if (req.file) {
        const uploadResult = await cloudinaryUpload(req); // upload image to cloudinary
        publicId = uploadResult.public_id;
        imagePath = uploadResult.secure_url;
      }

      const newPost = await Post.create({
        author,
        content,
        image: imagePath,
        imageId: publicId,
        status: parseInt(status),
        hashTags: hashTagArr,
        createdAt: moment.tz(new Date(), "Asia/Taipei").toDate(), // 轉換時區時間
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
    const { postId, content, status, image, imageId, removeImage, hashTags } =
      req.body;
    const hashTagArr = !isEmpty(hashTags) ? JSON.parse(hashTags) : [];
    let publicId = imageId;
    let imagePath = image;

    try {
      if (req.file) {
        if (isEmpty(publicId)) {
          const uploadResult = await cloudinaryUpload(req); // upload image to cloudinary
          publicId = uploadResult.public_id;
          imagePath = uploadResult.secure_url;
        } else {
          const uploadResult = await cloudinaryUpdate(req, publicId); // update avatar to cloudinary
          avatarPath = uploadResult.secure_url;
        }
      }

      if (removeImage === "true") {
        await cloudinaryRemove(publicId);
        imagePath = "";
        publicId = "";
      }

      const upadtedPost = await Post.findByIdAndUpdate(
        postId,
        {
          content,
          image: imagePath,
          imageId: publicId,
          status: parseInt(status),
          hashTags: hashTagArr,
          editedAt: moment.tz(new Date(), "Asia/Taipei").toDate(),
        },
        {
          new: true,
        }
      ).lean();

      return res.status(200).json(upadtedPost);
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 刪除貼文 */
  deletePost: async (req, res) => {
    try {
      await Post.findByIdAndDelete(req.body.id);
      return res.status(200).json({ code: "DELETE_SUCCESS", message: "刪除成功" });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 喜歡/取消喜歡 貼文
   * @param postId 貼文Id
   * @param userId 使用者Id
   * @param action true / false
   */
  toggleLikePost: async (req, res) => {
    const { postId, userId, action } = req.body;

    try {
      const postData = await Post.findById(postId);
      const likeList = postData.likedByUsers;
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
      const updateResult = await Post.findByIdAndUpdate(
        postId,
        { likedByUsers: newLikeList },
        { new: true }
      ).populate({
        path: "likedByUsers",
        select: "_id account name avatar bgColor",
      });

      return res.status(200).json({ code: "SUCCESS", message: "操作成功", updateResult });
    } catch (error) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: error.message });
    }
  },

  /** 收藏/取消收藏 貼文
   * === 該功能目前不使用 ===
   * @param postId 貼文Id
   * @param userId 使用者Id
   * @param action true / false
   */
  toggleStorePost: async (req, res) => {
    const { postId, userId, action } = req.body;
    // 1.更新post 收藏數
    // 2.更新user 的post收藏清單
    try {
      let collectionCount = await Post.findById(postId)
        .select("collectionCount")
        .lean(); // 取得貼文的收藏數
      let postCollect = await UserSetting.findOne({ user: userId })
        .select("postCollect")
        .lean(); // 取得user的貼文收藏清單

      if (action) {
        // store action
        if (!postCollect.includes(postId)) {
          postCollect.push(postId);
          collectionCount++;
        }
      } else {
        // unsotre action
        const rmIndex = postCollect.indexOf(postId);
        if (rmIndex !== -1) {
          postCollect.splice(rmIndex, 1);
          collectionCount--;
          if (collectionCount < 0) collectionCount = 0;
        }
      }

      // 回寫至DB
      UserSetting.findByIdAndUpdate({ user: userId }, { postCollect });

      const newPostData = await Post.findByIdAndUpdate(
        postId,
        { collectionCount },
        { new: true }
      );

      return res.status(200).json({ message: "succeess", newPostData });
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

    try {
      const posts = await Post.find({ hashTags: new RegExp(searchString, "i") })
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
          select: "_id account name avatar bgColor",
        })
        .populate("comments")
        .lean()
        .exec();

      if (!posts)
        return res.status(404).json({ code: "NOT_FOUND", message: "沒有貼文" });

      // 取得搜尋資料總數，用於計算總數
      const total = await Post.countDocuments({
        hashTags: new RegExp(searchString, "i"),
      });
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
