const imgur = require("imgur");
const multer = require("multer");
const sharp = require("sharp");

imgur.setClientId(process.env.IMGUR_CLIENT_ID);

/** 處理檔案上傳 */
const uploadFile = multer({
  dest: "temp/",
  fileFilter: function (req, file, cb) {
    // 檢查檔案類型
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("image only"));
    }
    cb(null, true); // 如果檔案符合標準，則接受上傳
  }
});

/** 處理imgur圖片檔 */
const imgurFileHandler = async (file) => {
  if (!file) return null;
  const resizeOptions = {
    width: 240,
    height: 240,
    fit: "cover",
    position: sharp.strategy.attention,
  }
  const buffer = await sharp(file.path).resize(resizeOptions).toBuffer();
  const base64 = buffer.toString("base64");
  const img = await imgur.uploadBase64(base64);
  return img?.link || null;
};

module.exports = { uploadFile, imgurFileHandler };
