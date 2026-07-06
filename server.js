require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const logger = require("./middleware/logger");
const port = process.env.PORT || 3000;

// 啟動時檢查必要環境變數，缺少則直接結束程序，避免執行期才爆出隱晦錯誤
const REQUIRED_ENV = [
  "MONGODB_URI",
  "JWT_SECRET",
  "SALT_ROUNDS",
  "CLOUDINARY_NAME",
  "CLOUDINARY_CLIENT_ID",
  "CLOUDINARY_SECRET",
];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  logger.error(`缺少必要環境變數：${missingEnv.join(", ")}`);
  process.exit(1);
}

const routes = require("./routes");

const app = express();

// 部署在 Vercel/反向代理之後，信任第一層 proxy 以正確取得 client IP（供 rate limit 使用）
app.set("trust proxy", 1);

// 允許的來源：優先讀環境變數 CORS_ORIGINS（逗號分隔），未設定則用預設清單
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  : [
      "http://localhost:3001", // 本地開發的URL
      "http://172.31.4.24:3001", // 本地開發的URL
      "https://blog-system-fe.vercel.app", // 前端部署的URL
    ];

app.use(
  cors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false })); // pusher-js 授權請求預設送 form-urlencoded
app.use(cookieParser());

// 資料庫連線設定
mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;

db.once("open", () => {
  logger.info("mongodb is connected!");
});

db.on("error", (err) => {
  logger.error(err);
});

// API 文件：/api/docs 開互動 UI，/api/openapi.json 供前端 codegen 取原始 spec
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("./docs/openapi");
app.get("/api/openapi.json", (req, res) => res.json(openapiSpec));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

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
  logger.error(err);
  return res
    .status(500)
    .json({ code: "SYSTEM_ERR", message: "伺服器發生錯誤" });
});

// 伺服器監聽
app.listen(port, () => {
  logger.info(`Express is running on port ${port}`);
});
