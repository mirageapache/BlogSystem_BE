
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_CLIENT_ID,
  api_secret: process.env.CLOUDINARY_SECRET,
});
const folderPath = 'blogSystem/images'; // 指定cloudinary資料夾

/** 上傳前置處理 */
const uploadMulter = multer({
  storage: multer.memoryStorage(), // 使用記憶體存儲
  limits: {
    fileSize: 10485760, // 最大 10mb
  },
  fileFilter: function (req, file, cb) {
    const allowedExt = [".jpg", ".jpeg", ".png", ".gif"];
    const allowedMime = ["image/jpeg", "image/png", "image/gif"];
    const ext = path.extname(file.originalname).toLowerCase();
    // 同時檢查副檔名與 mimetype，避免偽造副檔名繞過
    if (!allowedExt.includes(ext) || !allowedMime.includes(file.mimetype)) {
      const error = new Error(
        "圖片檔案格式不符，請上傳 jpg / jpeg / png / gif 檔案"
      );
      error.statusCode = 400;
      error.isOperational = true;
      return cb(error);
    }
    cb(null, true);
  },
}).single("imageFile"); // 只接收 formdata 爲 'imageFile' 的欄位

/** 上傳圖檔 (cloudinary) */
const cloudinaryUpload = async (req) => {
  return new Promise((resolve, reject) => {
    if (!req.file) return reject(new Error("檔案未提供"));

    const stream = cloudinary.uploader.upload_stream({ folder: folderPath }, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });
    streamifier.createReadStream(req.file.buffer).pipe(stream);
  });
};

/** 更新圖片 (cloudinary) */
const cloudinaryUpdate = async (req, publicId) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: true,
        folder: folderPath,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(stream);
  });
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
        // 真正的錯誤才 reject；result.result 可能為 'ok' 或 'not found'，
        // 兩者皆視為清理完成（best-effort，圖片本就不在也算成功）
        if (error) {
          return reject(error);
        }
        resolve(result);
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
