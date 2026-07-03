# BlogSystem 後端架構分析報告

> 產出日期：2026-06-04
> 範圍：整個 `BlogSystem_BE` code base（`server.js`、`controllers/`、`middleware/`、`models/`、`routes/`、`models/seeds/`、相依套件、部署設定）
> 目的：以「部落格網站後端」的角度，盤點**功能優化**、**套件升級**、**測試補強**、**CI/CD 建置**四大主題，提供可落地的行動方案。
>
> 註：先前已有一份 `CODE_REVIEW.md`（2026-05-29 ~ 05-30）處理多數安全/正確性問題，且大多已修正。本報告**不重複**那些已修項目，聚焦在「架構優化、可維護性、工程化」層面。

---

## 0. 專案現況速覽

| 項目 | 現況 |
|------|------|
| 技術棧 | Node.js (v24) + Express 4 + Mongoose 8 + MongoDB |
| 部署 | Vercel serverless（`vercel.json` + `@vercel/node`） |
| 架構分層 | Routes → Controllers（**無 Service / Repository 層**） |
| 認證 | JWT（httpOnly cookie）+ tokenVersion 失效機制，三段式 middleware |
| 檔案上傳 | Multer（memoryStorage）→ Cloudinary |
| 寄信 | Mailgun（密碼找回） |
| 日誌 | 自製輕量 logger（零依賴） |
| 限流 | express-rate-limit（記憶體型，僅 auth 路由） |
| 測試 | **無**（`npm test` 為佔位字串） |
| CI/CD | **無** |
| 資料模型 | User / Article / Post / Comment / Follow / UserSetting |

**整體評價**：安全性與正確性在前次 review 後已達相當水準（env 檢查、全域 error handler、atomic like、unique index、tokenVersion 等都已到位）。目前的主要缺口集中在**工程化成熟度**：沒有任何自動化測試、沒有 CI/CD、缺少結構化分層、部分套件有已知 CVE。這正是本報告的重點。

---

## 1. 套件升級與安全性（Dependencies）

### 1.1 `npm audit` 結果：⚠️ 20 個漏洞（2 critical / 12 high）

執行 `npm audit` 的摘要：

```
20 vulnerabilities (3 low, 3 moderate, 12 high, 2 critical)
```

主要來源：

| 套件 | 嚴重度 | 問題摘要 | 處理建議 |
|------|--------|----------|----------|
| **cloudinary** `2.4.0` | High | Arbitrary Argument Injection（含 `&` 參數）— `< 2.7.0` | **升級至 `2.10.0`**（同 major，低風險） |
| **axios**（cloudinary 的傳遞依賴） | High/Critical | 一連串 SSRF / Prototype Pollution / DoS | 隨 cloudinary 升級後連帶修復 |
| **express** `4.18.2` | High | 傳遞依賴 `body-parser` / `qs` / `path-to-regexp` / `send` / `serve-static` 多項 DoS / ReDoS | 升 `4.22.2`（`npm audit fix`，不破壞）或評估 Express 5 |
| **validator**（express-validator 依賴） | High | `isURL` 驗證繞過 | `npm audit fix` |
| **brace-expansion / braces** | High/Mod | ReDoS / 資源耗盡 | `npm audit fix` |

> **大部分可用 `npm audit fix` 無痛修復**（同 major 內），建議第一步就執行並驗證 server 仍正常啟動。

### 1.2 過時套件清單（`npm outdated`）

| 套件 | 現用 | 最新 | 升級風險 | 建議 |
|------|------|------|----------|------|
| `mongoose` | 8.1.1 | 9.6.3 | **Major**（9.x 有 breaking change） | 先升至 8.x 最新（8.24.0）吃安全修補；9.x 排入評估 |
| `express` | 4.18.2 | 5.2.1 | **Major** | 先升 4.22.2；Express 5 另立 spike |
| `multer` | 1.4.5-lts.1 | 2.1.1 | **Major**（1.x 已多個 CVE） | **建議升 2.x**，API 變動小但需測試上傳流程 |
| `bcryptjs` | 2.4.3 | 3.0.3 | Major | 評估升級；或改用原生 `bcrypt`/`argon2` |
| `cloudinary` | 2.4.0 | 2.10.0 | Minor | **立即升**（修 CVE） |
| `express-rate-limit` | 7.5.1 | 8.5.2 | Major | 評估（8.x store API 有變） |
| `express-validator` | 7.0.1 | 7.3.2 | Patch | 直接升 |
| `dotenv` | 16.4.5 | 17.4.2 | Major | 低風險，可升 |
| `nodemailer` | 6.9.15 | 8.0.10 | Major | 評估（目前主要用 Mailgun，nodemailer 用途待確認） |
| `jsonwebtoken` | 9.0.2 | 9.0.3 | Patch | 直接升 |
| `lodash` | 4.17.21 | 4.18.1 | Minor | 直接升 |

### 1.3 可移除 / 可整併的依賴

- **`moment` + `moment-timezone`**：moment 已進入維護模式（官方建議不要用於新專案）。專案僅做時區轉換，可改用更輕量的 `dayjs`（+timezone plugin）或原生 `Intl.DateTimeFormat`。
- **`mailgun` (0.5.0)** 與 **`mailgun.js` (10.x)** 同時存在：`mailgun` 舊套件疑似冗餘，確認後移除其一。
- **`imgur` (devDependency)**：程式碼中已無 imgur 使用（先前 review C-5 已移除相關 import），可從 devDependencies 刪除。
- **`streamifier`**：確認是否仍用於 Cloudinary streaming upload，若否則移除。
- **`crypto-js`**：先前 review 已移除 encode/decode oracle endpoint，確認是否還有使用點，否則移除。

### 1.4 行動建議（依序）

1. `npm audit fix`（修同 major 內漏洞）→ 啟動驗證。
2. `cloudinary` 升 2.10.0、`express` 升 4.22.2、`express-validator`/`jsonwebtoken`/`lodash` 升 patch。
3. 評估 `multer` 1→2（**優先**，1.x 已不維護且有 CVE）。
4. 移除冗餘依賴（imgur、mailgun 舊版、確認 crypto-js/streamifier）。
5. 將 mongoose 9 / express 5 / 移除 moment 各自開 issue 排程處理。
6. 在 `package.json` 加入 `"engines": { "node": ">=20" }` 鎖定執行環境。

---

## 2. 功能與架構優化（Code / Architecture）

### 2.1 引入分層架構（Service / Repository）— 高優先

**現況**：所有業務邏輯與 DB 操作直接寫在 controller，例如 `userController.deleteUser` 的級聯刪除、`postController` 的圖片處理 + like 邏輯全擠在路由處理函式裡。

**問題**：
- 邏輯無法複用（tokenVersion 檢查、Cloudinary 處理、分頁邏輯散落各處重複）。
- **難以單元測試**（controller 綁死 `req`/`res`，無法獨立測純邏輯）。
- 維護成本高。

**建議分層**：
```
routes/        →  只做路由 + middleware 掛載
controllers/   →  只做 req 解析、呼叫 service、組 response
services/      →  業務邏輯（可被測試、可被複用）
repositories/  →  封裝 Mongoose 查詢（分頁、populate、aggregation）
```

### 2.2 統一 `asyncHandler`，消除重複 try/catch — 高優先、低成本

**現況**：controllers 中有 **約 31 處** 幾乎相同的 `try { ... } catch (error) { return res.status(500).json({ code: "SYSTEM_ERR", ... }) }`。

`server.js` 已有完善的全域 error handler（`server.js:74-90`），但因每個 method 自己 try/catch 而**形同虛設**。

**建議**：
```js
// middleware/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// 路由使用
router.post("/create", authorization, requireMember, asyncHandler(postController.createPost));
```
controller 內 `throw` 自訂的 operational error（帶 `isOperational`/`statusCode`），交由全域 handler 統一回應。**可一次砍掉約 30% 的樣板碼**，並讓錯誤回應格式真正統一。

### 2.3 抽出共用工具 — 中優先、低成本

下列邏輯在 4~8 個地方重複，應收斂到 `middleware/commonUtils.js`：

| 重複邏輯 | 出現位置 | 建議 |
|----------|----------|------|
| 分頁解析 `parseInt(page) / limit / skip` | article/post/follow/user controller（≥5 處） | `parsePagination(page, limit, maxLimit=100)`，**並補上 limit 上限**（目前無上限 → DoS 風險） |
| `nextPage = page+1 > total ? -1 : page+1` | ≥6 處 | `getNextPage(page, totalPages)` |
| 所有權檢查 `item.author.toString() !== req.user.userId` | article/post/comment（≥6 處） | `requireOwnership(modelGetter)` middleware |
| Cloudinary upload/update/remove 分支 | userController、postController | 收斂成單一 helper |
| `populate` select 風格混用（字串 vs 物件） | ≥15 處 | 統一用 `USER_PUBLIC_FIELDS` 字串風格 |

### 2.4 資料模型優化 — 中/高優先

#### (a) Article 與 Post 高度重複
兩個 schema 的 `author / content / status / hashTags / collectionCount / shareCount / likedByUsers[] / comments[] / createdAt / editedAt` 幾乎完全相同，差別僅在 Article 有 `title`+`coverImage`、Post 有 `image`+`imageId`。

- **建議**：評估合併為單一 `Content` model（以 `contentType: 'article' | 'post'` 區分），或抽出共用 schema mixin。可大幅減少重複的 like / comment / 查詢邏輯。
- 若維持分離，至少把 like/comment 操作抽成共用 service。

#### (b) `likedByUsers[]` 內嵌陣列的擴展性風險
讚數以 `[ObjectId]` 內嵌在文件中。熱門內容讚數成長會撐大 document（MongoDB 單文件 16MB 上限），且無法記錄按讚時間。
- **建議**：規模化前改為獨立 `Like` collection（`{ user, targetId, targetType }` + unique compound index）。短期可接受，列為技術債。

#### (c) Comment 缺少 `targetId` / `targetType`
Comment 目前只能透過父文件的 `comments[]` 反查，無法直接查詢「某使用者的所有留言」或「最新留言」。
- **建議**：加 `targetId` + `targetType('Article'|'Post')` 並建索引。

#### (d) `Comment.replyTo` 語意待確認
`models/comment.js:13-15` 的 `replyTo` 註解為「回覆給」但 `ref: "User"`。
- 若設計意圖是「@某使用者」→ 現況正確。
- 若意圖是「回覆某一則留言」形成回覆鏈 → 應改 `ref: "Comment"`。
- **行動**：與前端確認需求後定案，避免誤改。

#### (e) 缺少查詢索引
主要查詢欄位（`author`、`status`、`createdAt` 排序）目前**無索引**。資料量上升後 `sort + skip` 會全表掃描。
- **建議**新增複合索引：
  ```js
  ArticleSchema.index({ author: 1, createdAt: -1 });
  ArticleSchema.index({ status: 1, createdAt: -1 });
  PostSchema.index({ author: 1, createdAt: -1 });
  CommentSchema.index({ author: 1, createdAt: -1 });
  ```

#### (f) Timestamps 不一致
部分 model 手動塞 `createdAt`（用 moment-timezone），部分用 `default: Date.now`，UserSetting 完全沒有。
- **建議**：統一改用 Mongoose `{ timestamps: true }`（自動 `createdAt`/`updatedAt`，UTC 儲存，呈現時再轉時區）。

#### (g) `UserSetting.articleCollect/postCollect` 用 `[String]`
存的是 ID 字串卻非 `ObjectId`，無法 populate、無收藏時間。建議改 `ObjectId` 或獨立 `Collection` model。

### 2.5 查詢效能優化 — 中優先

- **`find` + `countDocuments` 兩次查詢**：改用 `Promise.all([find, countDocuments])` 併發，減少串行等待。
- **`.populate("comments")` 無 select**：拉回整個 comment 文件，應限定欄位。
- **skip-based 分頁**：大 offset 時效能差，未來可評估 cursor-based（以 `_id`/`createdAt` 為游標）。
- **手動 `map/reduce` 組裝追蹤狀態**（userController 搜尋）：可下推為 aggregation `$lookup`。

### 2.6 RESTful 路由一致性 — 低優先（破壞性，需與前端協調）

目前大量以 `POST /xxx/detail`、`POST /search`、`POST /getfollowing` 做**讀取查詢**，不符 REST 慣例。先前 review 的 M-19 已將此列為「破壞性變更、暫緩」。
- **建議**：列為前端遷移時一併處理的長期項目，非當務之急。短期維持相容。

### 2.7 可觀測性 — 中優先

- 自製 logger 僅在 `server.js` 用到，**controllers 完全沒有請求/錯誤日誌**。
- **建議**：
  - 加入 HTTP access log（`morgan` 或自製 middleware）。
  - 全域 error handler 內已 `logger.error`，可再補上 requestId 串接。
  - 規模化後評估 `pino`（結構化 JSON log，效能佳）取代自製 logger（logger.js 註解已預留此升級路徑）。
  - Cloudinary 失敗目前 best-effort，建議補 `logger.error` 避免圖片遺失無感知。

### 2.8 已發現的實際 Bug（seed 腳本）— 低優先但應修

`models/seeds/mockData.js` 與目前 schema **欄位不符，執行會報錯/資料不正確**：
- `mockData.js:51-55`：`Follow.create({ user, following, follower })`，但 `Follow` schema 實際欄位是 `followed / follower / followState`（`user`、`following` 不存在）。
- `mockData.js:77-78`：Article 用 `subject` / `tags`，但 schema 是 `subjects` / `hashTags`。
> 這支腳本目前等於壞的。修正欄位對應，並考慮加互動式確認（已有 `NODE_ENV==='production'` 護欄，良好）。

---

## 3. 測試補強（Testing）

### 3.1 現況：零測試

`package.json` 的 `test` script 仍是 `echo "Error: no test specified" && exit 1`。整個專案**沒有任何單元測試或整合測試**，這是目前最大的工程化缺口——任何重構（如 §2 的分層、套件升級）都缺乏安全網。

值得注意的是 `middleware/logger.js` 已預留 `NODE_ENV === "test"` 時靜音的設計，顯示已有導入測試的意圖。

### 3.2 建議測試技術棧

| 層級 | 工具 | 用途 |
|------|------|------|
| Test runner | **Jest**（或更輕量的 `vitest` / 內建 `node:test`） | 斷言、mock、coverage |
| HTTP 整合測試 | **supertest** | 對 Express app 發請求測 endpoint |
| DB 隔離 | **mongodb-memory-server** | 跑記憶體 MongoDB，免連真實 DB，測試可重現 |
| Mock | jest mock | mock Cloudinary、Mailgun 等外部服務 |

### 3.3 建議測試分層與優先順序

**第一波 — 純函式單元測試（最高 CP 值，最易寫）**
這些是無副作用的純邏輯，立即可測：
- `middleware/commonUtils.js`：`escapeRegExp`、`isValidId`、`parseHashTags`、`getRandomColor`、`getCookieOptions`
- `middleware/mathUtils.js`：數值工具
- `middleware/validator/userValidation.js`：email / password / account / name 規則
- 未來抽出的 `parsePagination` / `getNextPage`

**第二波 — Middleware 測試**
- `auth.js`：`authorization`（無 token / 過期 / tokenVersion 不符 / 訪客）、`requireMember`、`optionalAuth`
- `rateLimiter.js`：超過上限回 429

**第三波 — 整合測試（supertest + mongodb-memory-server）**
覆蓋關鍵流程（黑箱）：
- Auth：註冊 → 登入 → 取得 me → 登出（驗證 tokenVersion 遞增使舊 token 失效）
- 密碼找回 → 重設（驗證 token 單次有效）
- 文章/貼文：建立 → 列表分頁 → 詳情 → 更新（所有權檢查）→ 刪除
- Like：併發 toggle 的 atomic 行為（`$addToSet`/`$pull`）
- 權限：訪客被 `requireMember` 擋下回 403
- 刪除使用者的級聯清理

### 3.4 目標與門檻

- 起步目標：**核心邏輯與 auth 流程覆蓋率 ≥ 60%**，逐步提升。
- 在 CI 設 coverage 門檻（如 lines 50% 起跳），避免回退。
- `package.json` scripts 範例：
  ```json
  {
    "scripts": {
      "test": "cross-env NODE_ENV=test jest --runInBand",
      "test:watch": "jest --watch",
      "test:cov": "jest --coverage"
    }
  }
  ```
  （`--runInBand` 配合 mongodb-memory-server 避免並行衝突）

---

## 4. CI/CD 流程建置

### 4.1 現況：無任何自動化

無 `.github/workflows`、無 lint、無 format、無 pre-commit hook、無自動部署 pipeline（Vercel 應為手動或 Git 連動）。

### 4.2 建議：GitHub Actions CI

新增 `.github/workflows/ci.yml`，於 PR 與 push 觸發：

```yaml
name: CI
on:
  push:
    branches: [main, CodeReview]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x, 22.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm audit --audit-level=high --omit=dev || true   # 先觀察，穩定後改為阻擋
      - run: npm test
        env:
          NODE_ENV: test
          JWT_SECRET: test_secret
          # mongodb-memory-server 不需真實 MONGODB_URI
```

### 4.3 建議補上的工程化工具

| 工具 | 用途 | 落地方式 |
|------|------|----------|
| **ESLint** | 靜態檢查（抓 unused、未處理 promise、潛在 bug） | `eslint` + `eslint-config-airbnb-base`/`standard`；`npm run lint` |
| **Prettier** | 格式統一 | `.prettierrc` + CI 檢查 |
| **Husky + lint-staged** | pre-commit 自動 lint/format/test | commit 前把關，降低 CI 失敗率 |
| **commitlint** | 規範 commit message（專案已有 `[refactor]` 慣例） | 可選 |
| **Dependabot / Renovate** | 自動偵測過時 / 有漏洞的依賴並開 PR | `.github/dependabot.yml`，直接解決 §1 持續性問題 |

`.github/dependabot.yml` 範例：
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule: { interval: "weekly" }
    open-pull-requests-limit: 5
```

### 4.4 CD（部署）

- 目前用 Vercel，建議**綁定 Git 自動部署**：`main` → production，PR → preview deployment。
- 在 Vercel 專案設定中配置所有環境變數（對應 `.env.example`：`MONGODB_URI`、`JWT_SECRET`、`SALT_ROUNDS`、`CLOUDINARY_*`、`MAILGUN_*`、`FRONTEND_URL`、`CORS_ORIGINS`）。
- **建議流程**：CI 綠燈（lint + test）→ 才允許 merge 到 main → Vercel 自動部署 production。可在 GitHub 設 branch protection rule 要求 CI 通過。
- 注意 serverless 限制：rate-limiter 為記憶體型不跨實例（`rateLimiter.js` 已註明）。若要嚴格限流，未來導入 Redis store（如 `rate-limit-redis` + Upstash）。

---

## 5. 行動藍圖（建議優先序）

### 🔴 第一階段（本週，低風險高回報）
1. `npm audit fix` + 升級 cloudinary/express/express-validator 等安全修補（§1.4）。
2. 建立 GitHub Actions CI 骨架（先跑 `npm ci` + `npm audit`）（§4.2）。
3. 導入 ESLint + Prettier + Husky（§4.3）。
4. 修正 `mockData.js` seed 欄位不符的 bug（§2.8）。

### 🟠 第二階段（2~3 週，建立安全網）
5. 導入 Jest + supertest + mongodb-memory-server，補第一波純函式 + auth 流程測試（§3）。
6. 把 coverage 門檻接進 CI。
7. 實作 `asyncHandler`、抽出 `parsePagination`/`getNextPage`/`requireOwnership`（§2.2、§2.3）。
8. 補上 model 索引、統一 timestamps（§2.4e、§2.4f）。

### 🟡 第三階段（1 個月+，結構性改善）
9. 引入 Service / Repository 分層，逐 controller 遷移（§2.1）。
10. 評估 Article/Post 合併、Like/Comment 模型重構（§2.4a~c）。
11. multer 2.x / mongoose 9 / express 5 升級評估與遷移（§1.2）。
12. 導入結構化日誌（pino）+ access log + Dependabot（§2.7、§4.3）。

### 🟢 長期 / 需跨團隊協調
13. RESTful 路由重構（與前端協調遷移，§2.6）。
14. cursor-based 分頁、Redis 限流（規模化時，§2.5、§4.4）。

---

## 6. 總結

BlogSystem 後端在**安全性與正確性**上經過前次 code review 已相當扎實（tokenVersion、atomic 操作、unique index、env 檢查、全域 error handler 都到位）。目前真正的短板是**工程化成熟度**：

- **沒有測試** → 是所有後續重構的最大阻力，應優先建立。
- **沒有 CI/CD** → 缺乏自動把關，依賴漏洞與回歸難以察覺。
- **依賴有已知 CVE** → 多數可無痛 `npm audit fix`。
- **缺少分層、樣板碼重複** → 影響可維護性，但可漸進改善。

建議以「**先補安全網（CI + 測試 + 修漏洞），再做結構性重構**」的順序推進——這樣每一步重構都有測試保護，風險最低、回報最高。
