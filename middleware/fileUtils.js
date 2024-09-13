const imgur = require("imgur");
const multer = require("multer");
const sharp = require("sharp");
const cloudinary = require("cloudinary");
const streamifier = require("streamifier");
const path = require('path');

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
  limits: {
    fileSize: 83886080, //最大 10mb
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
  return new Promise((resolve, reject) => {
    let cld_upload_stream = cloudinary.uploader.upload_stream(
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(cld_upload_stream);
  });
};

/** 更新圖片 (cloudinary) */
const cloudinaryUpdate = async (req, publicId) => {
  return new Promise((resolve, reject) => {
    let update_stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: true,
        invalidate: true
      },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(update_stream);
  });
};

/** 刪除圖片 (cloudinary) */
const cloudinaryRemove = async (req) => {
  const { public_id } = req.body;
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(public_id, 
      {
        type: 'upload',
        invalidate: true
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
