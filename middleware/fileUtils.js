
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const path = require("path");
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_CLIENT_ID,
  api_secret: process.env.CLOUDINARY_SECRET,
});
const folderPath = 'blogSystem/images'; // 指定cloudinary資料夾

/** 上傳前置處理 */
const uploadMulter = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const dir = 'temp/';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true }); // 自動創建 temp 資料夾
      }
      cb(null, dir);// 檔案將暫時儲存到 temp 資料夾
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
    .upload(req.file.path, {
      folder: folderPath,
    })
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
      folder: folderPath,
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
        folder: folderPath,
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
  uploadMulter,
  cloudinaryUpload,
  cloudinaryUpdate,
  cloudinaryRemove,
};
