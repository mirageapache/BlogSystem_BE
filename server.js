require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const port = process.env.PORT || 3000;
const routes = require("./routes");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3001", // 本地開發的URL
      "http://172.31.4.24:3001", // 本地開發的URL
      "https://blog-system-fe.vercel.app", // 前端部署的URL
    ], // 或者指定允許的源
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(cookieParser());

// 資料庫連線設定
mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;

db.once("once", () => {
  console.log("mongodb is connected!");
});

db.on("error", (err) => {
  console.log(err);
});

// 路由設定
app.use(routes);

// 404 fallback
app.use((req, res) => {
  return res.status(404).json({ code: "NOT_FOUND", message: "找不到路由" });
});

// 全域錯誤處理
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res
      .status(400)
      .json({ code: "UPLOAD_ERR", message: err.message });
  }
  if (err && err.isOperational) {
    return res
      .status(err.statusCode || 400)
      .json({ code: "VALIDATION_ERR", message: err.message });
  }
  console.error(err);
  return res
    .status(500)
    .json({ code: "SYSTEM_ERR", message: "伺服器發生錯誤" });
});

// 伺服器監聽
app.listen(port, () => {
  console.log(`Express is running`);
});
