# BlogSystem — Backend

部落格系統後端 API。提供貼文（Post）、文章（Article）、留言、追蹤、通知等功能。

## 技術棧

| 分類 | 使用 |
| --- | --- |
| Runtime / Framework | Node.js、Express 4 |
| 資料庫 | MongoDB、Mongoose 8 |
| 驗證 | JWT（jsonwebtoken）、bcryptjs |
| 圖片 | Cloudinary（multer 記憶體暫存後上傳） |
| 即時推播 | Pusher Channels |
| Email | Mailgun / Nodemailer |
| 安全 | express-rate-limit、express-validator、CORS |
| API 文件 | swagger-jsdoc + swagger-ui-express |
| 測試 | Node 內建 `node:test`（無外部框架、不連 DB/網路） |

## 功能模組

路由統一掛在 `/api` 之下（見 [routes/index.js](routes/index.js)）：

| 前綴 | 說明 |
| --- | --- |
| `/api/auth` | 註冊、登入、Email 驗證、密碼相關 |
| `/api/user` | 使用者資料、個人設定 |
| `/api/post` | 貼文 CRUD、按讚（含封面圖 Cloudinary） |
| `/api/article` | 文章 CRUD、搜尋、按讚（含封面圖 Cloudinary） |
| `/api/comment` | 留言 / 回覆串 |
| `/api/follow` | 追蹤 / 取消追蹤 |
| `/api/notification` | 通知列表、已讀、Pusher 私有頻道授權 |
| `/api/ai` | AI Bot 內部服務（以 `x-api-key` 驗證） |
| `/api/utility` | 共用工具端點 |

## 快速開始

```bash
npm install
cp .env.example .env   # 填入下方環境變數
npm run dev            # nodemon 熱重載；或 npm start
```

伺服器預設監聽 `PORT`（未設定則 `3000`）。啟動時會檢查必要環境變數，缺少則直接結束程序。

## 環境變數

**必要**（缺少會啟動失敗，見 [server.js](server.js)）：

| 變數 | 說明 |
| --- | --- |
| `MONGODB_URI` | MongoDB 連線字串 |
| `JWT_SECRET` | JWT 簽章密鑰 |
| `SALT_ROUNDS` | bcrypt 加鹽次數 |
| `CLOUDINARY_NAME` / `CLOUDINARY_CLIENT_ID` / `CLOUDINARY_SECRET` | Cloudinary 憑證 |

**選用**（依啟用的功能而定）：

| 變數 | 說明 |
| --- | --- |
| `PORT` | 監聽埠，預設 3000 |
| `CORS_ORIGINS` | 允許來源，逗號分隔；未設定用內建預設清單 |
| `CRYPTO_SECRET` | 加解密用密鑰 |
| `MAILGUN_API_KEY` / `MAILGUN_DOMAIN` | 寄信服務 |
| `FRONTEND_URL` | 前端網址（信件連結等） |
| `PUSHER_APP_ID` / `PUSHER_KEY` / `PUSHER_SECRET` / `PUSHER_CLUSTER` | 即時推播；`PUSHER_SECRET` 僅後端持有，不外露 |
| `AI_BOT_API_KEY` / `AI_BOT_USER_ID` | AI Bot 內部服務金鑰與帳號 |

## API 文件

伺服器啟動後：

- `GET /api/docs` — Swagger UI 互動文件
- `GET /api/openapi.json` — 原始 OpenAPI spec（供前端 codegen）

Spec 由各 route 檔上方的 `@openapi` 註解掃出（見 [docs/openapi.js](docs/openapi.js)）。
安全性採各端點自宣告：需登入 `bearer`、選登 `bearer + {}`、AI 服務 `aiKey`（`x-api-key`）、公開則不宣告。

## 測試

```bash
npm test        # node --test，掃 test/*.test.js
```

測試不連資料庫、不打網路，以 `t.mock` stub Mongoose 靜態方法與外部邊界（Cloudinary / Pusher）。

## 常用指令

| 指令 | 說明 |
| --- | --- |
| `npm start` | 啟動伺服器 |
| `npm run dev` | nodemon 熱重載 |
| `npm test` | 執行測試 |
| `npm run resetDB` | 以 mock 資料重建資料庫（[models/seeds/mockData](models/seeds)） |

## 專案結構

```
routes/       路由定義（modules/ 下各功能模組 + @openapi 註解）
controllers/  請求處理邏輯
models/       Mongoose Schema（seeds/ 為測試種子資料）
services/     跨 controller 的領域服務（如 notificationService）
middleware/   驗證、上傳、rate limit、工具函式
docs/         OpenAPI spec 產生器
test/         node:test 測試
scripts/      一次性維運腳本（資料遷移等）
```

## 部署

部署於 Vercel Serverless（見 [vercel.json](vercel.json)），所有 `/api/*` 請求導向 `server.js`。
