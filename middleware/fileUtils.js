const imgur = require("imgur");
const multer = require("multer");
const sharp = require("sharp");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const path = require("path");

imgur.setClientId(process.env.IMGUR_CLIENT_ID);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_CLIENT_ID,
  api_secret: process.env.CLOUDINARY_SECRET,
});

/** 處理檔案上傳 */
const uploadFile = multer({
  dest: "temp/",
  fileFilter: function (req, file, cb) {
    // 檢查檔案類型
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("image only"));
    }
    cb(null, true); // 如果檔案符合標準，則接受上傳
  },
});

/** 處理圖檔上傳至imgur */
const imgurFileHandler = async (file) => {
  if (!file) return null;
  const resizeOptions = {
    width: 240,
    height: 240,
    fit: "cover",
    position: sharp.strategy.attention,
  };
  const buffer = await sharp(file.path).resize(resizeOptions).toBuffer();
  const base64 = buffer.toString("base64");
  const img = await imgur.uploadBase64(base64);
  return img?.link || null;
};

/** 上傳前置處理 */
const uploadMulter = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "temp/"); // 檔案將暫時儲存到 temp 資料夾
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname)); // 設定檔案名稱
    },
  }),
  limits: {
    fileSize: 10485760, //最大 10mb
  },
  fileFilter: function (req, file, cb) {
    let ext = path.extname(file.originalname);
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png" && ext !== ".gif") {
      const error = new Error(
        "圖片檔案格式不符，請上傳 jpg / jpeg / png / gif 檔案"
      );
      error.statusCode = 400;
      error.isOperational = true;
      return cb(error);
    }
    cb(null, true);
  },
}).single("imageFile"); //只接收 formdata 爲 'imageFile' 的欄位

/** 上傳圖檔 (cloudinary) */
const cloudinaryUpload = async (req) => {
  const uploadResult = await cloudinary.uploader
    .upload(req.file.path)
    .catch((error) => {
      return error;
    });
  return uploadResult;
};

/** 更新圖片 (cloudinary) */
const cloudinaryUpdate = async (req, publicId) => {
  const imagePath = req.file.path;
  const uploadResult = await cloudinary.uploader
    .upload(imagePath, {
      public_id: publicId,
      overwrite: true,
    })
    .catch((error) => {
      return error;
    });
  return uploadResult;
};

/** 刪除圖片 (cloudinary) */
const cloudinaryRemove = async (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      {
        type: "upload",
        invalidate: true,
      },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );
  });
};

module.exports = {
  uploadFile,
  imgurFileHandler,
  uploadMulter,
  cloudinaryUpload,
  cloudinaryUpdate,
  cloudinaryRemove,
};
