# Blog System API 文檔

> 最後更新：2026-06-04
> 本文件依實際程式碼（`routes/`、`controllers/`、`models/`）校正，與目前實作一致。

## 目錄
1. [通用說明](#通用說明)
2. [認證相關 API](#認證相關-api)（`/api/auth`）
3. [文章相關 API](#文章相關-api)（`/api/article`）
4. [貼文相關 API](#貼文相關-api)（`/api/post`）
5. [留言相關 API](#留言相關-api)（`/api/comment`）
6. [追蹤相關 API](#追蹤相關-api)（`/api/follow`）
7. [使用者相關 API](#使用者相關-api)（`/api/user`）
8. [工具相關 API](#工具相關-api)（`/api/utility`）
9. [錯誤代碼說明](#錯誤代碼說明)

---

## 通用說明

### Base URL
所有路由皆掛載於 `/api` 之下，模組路徑為**單數**：
`/api/auth`、`/api/article`、`/api/post`、`/api/comment`、`/api/follow`、`/api/user`、`/api/utility`。

### 認證機制（重要）
- 登入 / 訪客登入成功後，後端會以 **httpOnly Cookie**（名稱 `authToken`）下發 JWT，**不會**在回應 body 回傳 token。
- 需要登入的 API 透過 cookie 驗證身分，前端請求必須帶上 `credentials: 'include'`（fetch）或 `withCredentials: true`（axios）。
- 後端僅信任 JWT 解析出的身分（`req.user.userId`），**不採信** body / params / query 傳入的 userId。
- **例外**：重設密碼 `POST /api/auth/resetpwd` 是讀取 `Authorization: Bearer <token>` 標頭（token 來自找回密碼 email 連結），而非 cookie。
- JWT 具備 `tokenVersion` 失效機制：登出、重設密碼會遞增版本，使先前發出的 token 立即失效。

### 權限層級
| Middleware | 說明 |
|------------|------|
| （無） | 公開，免登入 |
| `authorization` | 需有效登入（含訪客 token） |
| `requireMember` | 需正式會員，**拒絕訪客**（回 `403 GUEST_FORBIDDEN`） |
| `optionalAuth` | 免登入可用；若已登入則附加個人化欄位（如追蹤狀態） |

### CORS
僅允許白名單來源（環境變數 `CORS_ORIGINS`，逗號分隔；預設含 localhost 與前端部署網址），`credentials: true`，允許方法 `GET / POST / PATCH / DELETE / OPTIONS`。

### 限流（Rate Limit）
| 套用範圍 | 視窗 | 上限 |
|----------|------|------|
| `authLimiter`（signup / signin / resetpwd） | 15 分鐘 | 20 次 |
| `mailLimiter`（findpwd） | 60 分鐘 | 5 次 |

超過上限回 `429`。（Vercel serverless 為記憶體型，跨實例不共享，屬 best-effort）

### 檔案上傳
- 新增 / 更新「貼文、文章、使用者頭像」使用 `multipart/form-data`。
- 圖片欄位名稱固定為 **`imageFile`**。
- 限制：jpg / jpeg / png / gif，單檔最大 **10MB**；圖片由後端上傳至 Cloudinary。

### 共用慣例
- `hashTags`：以 **JSON 字串**傳入（例：`"[\"旅遊\",\"美食\"]"`），後端會安全解析，格式錯誤則視為空陣列。
- 列表查詢回應的 `nextPage`：若已是最後一頁（或無資料）回 `-1`，否則回下一頁頁碼。
- 請求 body 預設為 JSON（`Content-Type: application/json`，上限 2MB）；上傳類則為 `multipart/form-data`。
- 多數「查詢」採用 `POST`（非 RESTful，屬現況設計），請依本文件實際 method 為準。

### 使用者公開欄位（`USER_PUBLIC_FIELDS`）
被 populate 的作者 / 使用者物件，公開欄位固定為：
```json
{ "_id": "string", "account": "string", "name": "string", "avatar": "string", "bgColor": "string" }
```

---

## 認證相關 API

### 註冊
- **URL**: `/api/auth/signup`
- **Method**: `POST` ・ 限流：`authLimiter` ・ 驗證：email、password
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string",
    "confirmPassword": "string"
  }
  ```
- **Response**:
  - 成功 `200`：`{ "code": "SUCCESS", "message": "註冊成功" }`
  - `401 VALIDATION_ERR`：欄位驗證未通過
  - `401 PWD_UNMATCH`：密碼與確認密碼不相符
  - `401 EMAIL_EXISTED`：Email 已被註冊

> 帳號（account）會由 email 的 `@` 前段自動產生並去重。

### 登入
- **URL**: `/api/auth/signin`
- **Method**: `POST` ・ 限流：`authLimiter` ・ 驗證：email、password
- **Request Body**:
  ```json
  { "email": "string", "password": "string" }
  ```
- **Response**:
  - 成功 `200`：下發 httpOnly cookie `authToken`（7 天），並回傳：
    ```json
    {
      "code": "SUCCESS",
      "message": "登入成功",
      "userData": {
        "_id": "string",
        "userId": "string",
        "email": "string",
        "account": "string",
        "name": "string",
        "avatar": "string",
        "avatarId": "string",
        "role": "number",
        "status": "number",
        "bgColor": "string",
        "bio": "string",
        "createdAt": "date",
        "language": "string",
        "theme": "number",
        "emailPrompt": "boolean",
        "mobilePrompt": "boolean",
        "articleCollect": ["string"],
        "postCollect": ["string"]
      }
    }
    ```
  - `404 EMAIL_NOT_EXIST`：Email 尚未註冊
  - `401 WRONG_PWD`：密碼錯誤

### 找回密碼
- **URL**: `/api/auth/findpwd`
- **Method**: `POST` ・ 限流：`mailLimiter` ・ 驗證：email
- **Request Body**:
  ```json
  { "email": "string" }
  ```
- **Response**:
  - 成功 `200`：`{ "code": "SUCCESS", "message": "已發送重置密碼Email" }`
  - `404 EMAIL_NOT_EXIST`：Email 輸入錯誤或未註冊

> 後端寄出含重設連結的信件（Mailgun），連結內 token **30 分鐘**有效。

### 重設密碼
- **URL**: `/api/auth/resetpwd`
- **Method**: `POST` ・ 限流：`authLimiter` ・ 驗證：password
- **Headers**: `Authorization: Bearer <urlToken>`（token 來自找回密碼信件連結）
- **Request Body**:
  ```json
  { "password": "string", "confirmPassword": "string" }
  ```
- **Response**:
  - 成功 `200`：`{ "code": "SUCCESS", "message": "密碼重設成功" }`（並遞增 tokenVersion 使舊登入失效）
  - `401 NO_TOKEN`：未提供驗證資訊
  - `401 TOKEN_ERR`：使用者不存在
  - `401 PWD_UNMATCH`：新密碼與確認密碼不相符
  - `500 EXPIRE`：重設密碼連結無效或已過期

### 身分驗證
- **URL**: `/api/auth/checkAuth`
- **Method**: `POST` ・ 權限：`authorization`
- **Request Body**: （無，身分取自 cookie）
- **Response**:
  - 成功 `200`：`{ "code": "SUCCESS", "message": "驗證成功" }`
  - `401 TOKEN_ERR`：驗證錯誤

### 取得目前登入使用者資料
- **URL**: `/api/auth/me`
- **Method**: `GET` ・ 權限：`authorization`
- **Response**:
  - 成功 `200`：`{ "code": "SUCCESS", "userData": { ...同登入的 userData } }`
  - `404 USER_NOT_FOUND`：使用者不存在

### 訪客登入
- **URL**: `/api/auth/guest`
- **Method**: `POST` ・ 權限：公開
- **Response**:
  - 成功 `200`：下發受限 cookie `authToken`（1 小時），並回傳：
    ```json
    {
      "code": "SUCCESS",
      "userData": {
        "userId": "guest",
        "name": "訪客",
        "email": "guest@blogsystem.com",
        "role": "guest"
      }
    }
    ```

> 訪客 token 無法存取需 `requireMember` 的寫入類 API。

### 登出
- **URL**: `/api/auth/signout`
- **Method**: `POST` ・ 權限：公開（讀取現有 cookie）
- **Response**:
  - 成功 `200`：清除 `authToken` cookie，並遞增 tokenVersion 使該 token 失效。
    `{ "code": "SUCCESS", "message": "登出成功" }`

---

## 文章相關 API

> 文章基底路徑 `/api/article`。`hashTags` 以 JSON 字串傳入。
> `clientType` 為 `"vue"` 時，後端會在內容的 Tiptap ↔ Draft.js 格式間轉換（React 端可省略）。

### (動態)取得文章分頁
- **URL**: `/api/article/partial`
- **Method**: `POST` ・ 權限：公開
- **Request Body**:
  ```json
  { "page": "number", "limit": "number" }
  ```
- **Response** 成功 `200`：
  ```json
  {
    "articles": [
      {
        "_id": "string",
        "author": { "_id": "string", "account": "string", "name": "string", "avatar": "string", "bgColor": "string" },
        "title": "string",
        "content": "string",
        "status": "number",
        "subjects": "string",
        "hashTags": ["string"],
        "collectionCount": "number",
        "shareCount": "number",
        "createdAt": "date",
        "editedAt": "date",
        "likedByUsers": [ { "_id": "string", "account": "string", "name": "string", "avatar": "string", "bgColor": "string" } ],
        "comments": ["string"]
      }
    ],
    "nextPage": "number",
    "totalArticle": "number"
  }
  ```

### 搜尋文章 / 取得特定作者文章
- **URL**: `/api/article/search`
- **Method**: `POST` ・ 權限：公開
- **Request Body**:
  ```json
  {
    "searchString": "string",
    "authorId": "string",
    "page": "number",
    "limit": "number"
  }
  ```
- **Response**: 同「取得文章分頁」（`{ articles, nextPage, totalArticle }`）

> `searchString` 比對 `title` / `content`；可單獨用 `authorId` 取特定作者文章。

### 取得文章詳細資料
- **URL**: `/api/article/detail`
- **Method**: `POST` ・ 權限：公開
- **Request Body**:
  ```json
  { "articleId": "string", "clientType": "string" }
  ```
- **Response**:
  - 成功 `200`：單篇文章物件（`author`、`likedByUsers` 已 populate；`comments` 含巢狀 `author`、`replyTo`）
    ```json
    {
      "_id": "string",
      "author": { "_id": "string", "account": "string", "name": "string", "avatar": "string", "bgColor": "string" },
      "title": "string",
      "content": "string",
      "status": "number",
      "subjects": "string",
      "hashTags": ["string"],
      "createdAt": "date",
      "editedAt": "date",
      "likedByUsers": [ { "_id": "string", "account": "string", "name": "string", "avatar": "string", "bgColor": "string" } ],
      "comments": [
        {
          "_id": "string",
          "author": { "_id": "string", "account": "string", "name": "string", "avatar": "string", "bgColor": "string" },
          "replyTo": { "_id": "string", "account": "string", "name": "string", "avatar": "string", "bgColor": "string" },
          "content": "string",
          "createdAt": "date"
        }
      ]
    }
    ```
  - `404 NOT_FOUND`：沒有文章資料

### 新增文章
- **URL**: `/api/article/create`
- **Method**: `POST` ・ 權限：`authorization` + `requireMember` ・ `multipart/form-data`
- **Request Body**（form-data）:
  ```json
  {
    "title": "string",
    "content": "string",
    "subject": "string",
    "hashTags": "string (JSON 陣列字串)",
    "clientType": "string"
  }
  ```
- **Response**:
  - 成功 `200`：回傳新建立的文章物件（`status` 預設 0 草稿）
  - `500 SYSTEM_ERR`

> 作者一律取自登入身分（`req.user.userId`），無需也不採信 body 的 author。

### 更新文章
- **URL**: `/api/article/update`
- **Method**: `PATCH` ・ 權限：`authorization` + `requireMember` ・ `multipart/form-data`
- **Request Body**（form-data）:
  ```json
  {
    "articleId": "string",
    "title": "string",
    "content": "string",
    "subject": "string",
    "hashTags": "string (JSON 陣列字串)",
    "clientType": "string"
  }
  ```
- **Response**:
  - 成功 `200`：更新後的文章物件（含 `editedAt`）
  - `403 FORBIDDEN`：非作者本人
  - `404 NOT_FOUND`：文章不存在

### 刪除文章
- **URL**: `/api/article/delete`
- **Method**: `DELETE` ・ 權限：`authorization` + `requireMember`
- **Request Body**:
  ```json
  { "articleId": "string" }
  ```
- **Response**:
  - 成功 `200`：`{ "code": "DELETE_SUCCESS", "message": "文章刪除成功" }`
  - `403 FORBIDDEN` / `404 NOT_FOUND`

### 喜歡 / 取消喜歡文章
- **URL**: `/api/article/toggleLikeAction`
- **Method**: `PATCH` ・ 權限：`authorization` + `requireMember`
- **Request Body**:
  ```json
  { "articleId": "string", "action": "boolean" }
  ```
  （`action: true` 按讚、`false` 取消）
- **Response**:
  - 成功 `200`：`{ "code": "SUCCESS", "message": "操作成功", "updateResult": { ...更新後文章，含 author、likedByUsers } }`
  - `404 NOT_FOUND`

---

## 貼文相關 API

> 貼文基底路徑 `/api/post`。`hashTags` 以 JSON 字串傳入。圖片欄位 `imageFile`。

### (動態)取得貼文分頁
- **URL**: `/api/post/partial`
- **Method**: `POST` ・ 權限：公開
- **Request Body**:
  ```json
  { "page": "number", "limit": "number" }
  ```
- **Response** 成功 `200`：
  ```json
  {
    "posts": [
      {
        "_id": "string",
        "author": { "_id": "string", "account": "string", "name": "string", "avatar": "string", "bgColor": "string" },
        "content": "string",
        "image": "string",
        "imageId": "string",
        "status": "number",
        "hashTags": ["string"],
        "collectionCount": "number",
        "shareCount": "number",
        "createdAt": "date",
        "editedAt": "date",
        "likedByUsers": [ { "_id": "string", "account": "string", "name": "string", "avatar": "string", "bgColor": "string" } ],
        "comments": ["string"]
      }
    ],
    "nextPage": "number",
    "totalPosts": "number"
  }
  ```

### 搜尋貼文 / 取得特定作者貼文
- **URL**: `/api/post/search`
- **Method**: `POST` ・ 權限：公開
- **Request Body**:
  ```json
  {
    "searchString": "string",
    "authorId": "string",
    "page": "number",
    "limit": "number"
  }
  ```
- **Response**: 同「取得貼文分頁」（`{ posts, nextPage, totalPosts }`）

> `searchString` 比對 `content` / `hashTags`。

### 取得貼文詳細資料
- **URL**: `/api/post/detail`
- **Method**: `POST` ・ 權限：公開
- **Request Body**:
  ```json
  { "postId": "string" }
  ```
- **Response**:
  - 成功 `200`：單篇貼文物件（`author`、`likedByUsers` 已 populate；`comments` 含巢狀 `author`、`replyTo`）
  - `404 NOT_FOUND`：沒有貼文資料

### 新增貼文
- **URL**: `/api/post/create`
- **Method**: `POST` ・ 權限：`authorization` + `requireMember` ・ `multipart/form-data`
- **Request Body**（form-data）:
  ```json
  {
    "content": "string",
    "status": "number",
    "hashTags": "string (JSON 陣列字串)"
  }
  ```
  - 檔案欄位：`imageFile`（選填）
- **Response**:
  - 成功 `200`：回傳新建立的貼文物件
  - `500 SYSTEM_ERR`

### 更新貼文
- **URL**: `/api/post/update`
- **Method**: `PATCH` ・ 權限：`authorization` + `requireMember` ・ `multipart/form-data`
- **Request Body**（form-data）:
  ```json
  {
    "postId": "string",
    "content": "string",
    "status": "number",
    "removeImage": "boolean (字串 \"true\" 表示移除圖片)",
    "hashTags": "string (JSON 陣列字串)"
  }
  ```
  - 檔案欄位：`imageFile`（選填）
- **Response**:
  - 成功 `200`：更新後的貼文物件（含 `editedAt`）
  - `403 FORBIDDEN` / `404 NOT_FOUND`

> 圖片一律以資料庫既有值為基礎，僅能透過上傳 `imageFile` 或 `removeImage` 變更，**不採信** body 直接傳入的 `image` / `imageId`。

### 刪除貼文
- **URL**: `/api/post/delete`
- **Method**: `DELETE` ・ 權限：`authorization` + `requireMember`
- **Request Body**:
  ```json
  { "postId": "string" }
  ```
- **Response**:
  - 成功 `200`：`{ "code": "DELETE_SUCCESS", "message": "刪除成功" }`
  - `403 FORBIDDEN` / `404 NOT_FOUND`

### 喜歡 / 取消喜歡貼文
- **URL**: `/api/post/toggleLikeAction`
- **Method**: `PATCH` ・ 權限：`authorization` + `requireMember`
- **Request Body**:
  ```json
  { "postId": "string", "action": "boolean" }
  ```
- **Response**:
  - 成功 `200`：`{ "code": "SUCCESS", "message": "操作成功", "updateResult": { ...更新後貼文 } }`
  - `404 NOT_FOUND`

### 取得(搜尋) hashTag 貼文
- **URL**: `/api/post/hashTag`
- **Method**: `POST` ・ 權限：公開
- **Request Body**:
  ```json
  { "searchString": "string", "page": "number", "limit": "number" }
  ```
- **Response**:
  - 成功 `200`：`{ "posts": [ ... ], "nextPage": "number", "totalPost": "number" }`
  - `searchString` 為空：`{ "posts": [], "code": "NO_SEARCH_STRING" }`

---

## 留言相關 API

> 留言基底路徑 `/api/comment`。

### 取得貼文留言
- **URL**: `/api/comment/`
- **Method**: `POST` ・ 權限：公開
- **Request Body**:
  ```json
  { "id": "string" }
  ```
  （`id` 為貼文 Post 的 `_id`）
- **Response**:
  - 成功 `200`：回傳該貼文物件，其中 `comments` 已 populate（含 `author`、`replyTo`）
    ```json
    {
      "_id": "string",
      "comments": [
        {
          "_id": "string",
          "author": { "_id": "string", "account": "string", "name": "string", "avatar": "string", "bgColor": "string" },
          "replyTo": { "_id": "string", "account": "string", "name": "string", "avatar": "string", "bgColor": "string" },
          "content": "string",
          "createdAt": "date"
        }
      ]
    }
    ```
  - `404 NO_COMMENT`：沒有留言

> 註：此端點目前僅查詢 **Post**；文章留言可透過 `POST /api/article/detail` 的 `comments` 取得。

### 新增留言
- **URL**: `/api/comment/create`
- **Method**: `POST` ・ 權限：`authorization` + `requireMember`
- **Request Body**:
  ```json
  {
    "id": "string",
    "content": "string",
    "route": "string"
  }
  ```
  - `route`：`"post"` 或 `"article"`，決定留言掛在貼文或文章下
  - `id`：對應的貼文 / 文章 `_id`
- **Response**:
  - 成功 `200`：回傳更新後的父物件（貼文 / 文章，`comments` 已加入新留言 id）
  - `400 INVALID_PARAM`：`route` 參數錯誤
  - `404 NOT_FOUND`：留言對象不存在

### 更新留言
- **URL**: `/api/comment/update/:id`
- **Method**: `PATCH` ・ 權限：`authorization` + `requireMember`
- **Path 參數**: `id` = 留言 `_id`
- **Request Body**:
  ```json
  { "content": "string" }
  ```
- **Response**:
  - 成功 `200`：更新後的留言物件
  - `403 FORBIDDEN`：非留言作者
  - `404 NOT_FOUND`：留言不存在

### 刪除留言
- **URL**: `/api/comment/delete/:id`
- **Method**: `DELETE` ・ 權限：`authorization` + `requireMember`
- **Path 參數**: `id` = 留言 `_id`
- **Response**:
  - 成功 `200`：`{ "code": "DELETE_SUCCESS", "message": "刪除成功" }`（同時清除 Post / Article 中對該留言的引用）
  - `403 FORBIDDEN` / `404 NOT_FOUND`

---

## 追蹤相關 API

> 追蹤基底路徑 `/api/follow`。

### 取得追蹤清單（某使用者追蹤了誰）
- **URL**: `/api/follow/getfollowing`
- **Method**: `POST` ・ 權限：公開
- **Request Body**:
  ```json
  { "userId": "string", "page": "number", "limit": "number" }
  ```
- **Response** 成功 `200`：
  ```json
  {
    "followList": [
      {
        "_id": "string",
        "account": "string",
        "name": "string",
        "avatar": "string",
        "bgColor": "string",
        "followState": "number",
        "isFollow": true
      }
    ],
    "nextPage": "number",
    "totalUser": "number"
  }
  ```

> `userId` 非合法 ObjectId 時回 `{ followList: [], nextPage: -1, totalUser: 0 }`。

### 取得粉絲清單（誰追蹤了某使用者）
- **URL**: `/api/follow/getfollower`
- **Method**: `POST` ・ 權限：公開
- **Request Body**:
  ```json
  { "userId": "string", "page": "number", "limit": "number" }
  ```
- **Response** 成功 `200`：
  ```json
  {
    "followList": [
      { "_id": "string", "account": "string", "name": "string", "avatar": "string", "bgColor": "string", "followState": "number" }
    ],
    "nextPage": "number",
    "totalUser": "number"
  }
  ```

### 追蹤使用者
- **URL**: `/api/follow/follow`
- **Method**: `POST` ・ 權限：`authorization` + `requireMember`
- **Request Body**:
  ```json
  { "targetId": "string" }
  ```
  （追蹤人取自登入身分；`targetId` 為被追蹤者）
- **Response**:
  - 成功 `200`：`{ "code": "SUCCESS", "message": "追蹤成功" }`
  - `400 INVALID`：目標不存在 / 無法追蹤自己
  - `401 FOLLOWED`：已追蹤

### 取消追蹤
- **URL**: `/api/follow/unfollow`
- **Method**: `POST` ・ 權限：`authorization` + `requireMember`
- **Request Body**:
  ```json
  { "targetId": "string" }
  ```
- **Response**:
  - 成功 `200`：`{ "code": "SUCCESS", "message": "取消追蹤成功" }`
  - `400 INVALID`：目標不存在
  - `401 UNFOLLOWED`：未追蹤（已是取消狀態）

### 更新訂閱狀態
- **URL**: `/api/follow/changeState`
- **Method**: `PATCH` ・ 權限：`authorization` + `requireMember`
- **Request Body**:
  ```json
  { "targetId": "string", "state": "number" }
  ```
  （`followState`：0-追蹤但不推播 / 1-主動推播）
- **Response**:
  - 成功 `200`：
    ```json
    {
      "code": "UPDATE_SUCCESS",
      "message": "已更新狀態",
      "FollowData": { "_id": "string", "follower": "string", "followed": "string", "followState": "number" }
    }
    ```
  - `400 INVALID`：目標不存在

---

## 使用者相關 API

> 使用者基底路徑 `/api/user`。

### 搜尋使用者清單（含追蹤資料）
- **URL**: `/api/user/getSearchUserList`
- **Method**: `POST` ・ 權限：`optionalAuth`（登入才附加追蹤狀態）
- **Request Body**:
  ```json
  { "searchString": "string", "page": "number", "limit": "number" }
  ```
- **Response** 成功 `200`：
  ```json
  {
    "userList": [
      {
        "_id": "string",
        "account": "string",
        "name": "string",
        "avatar": "string",
        "bgColor": "string",
        "isFollow": "boolean",
        "followState": "number | null"
      }
    ],
    "nextPage": "number",
    "totalUser": "number"
  }
  ```

> `searchString` 比對 `account` / `name`。未登入時不含 `isFollow` / `followState`。

### 取得推薦使用者清單（含追蹤資料）
- **URL**: `/api/user/getRecommendUserList`
- **Method**: `POST` ・ 權限：`optionalAuth`
- **Request Body**: `{}`（身分取自 cookie，可省略）
- **Response** 成功 `200`：依粉絲數排序的前 10 名使用者
  ```json
  [
    {
      "userId": "string",
      "account": "string",
      "name": "string",
      "avatar": "string",
      "bgColor": "string",
      "followerCount": "number",
      "isFollow": "boolean",
      "followState": "number | null"
    }
  ]
  ```

> 未登入時回傳的陣列不含 `isFollow` / `followState`。

### 個人 - 取得自己的使用者資料
- **URL**: `/api/user/own`
- **Method**: `POST` ・ 權限：`authorization` + `requireMember`
- **Request Body**: （無，身分取自 cookie）
- **Response** 成功 `200`：
  ```json
  {
    "userId": "string",
    "_id": "string",
    "email": "string",
    "account": "string",
    "name": "string",
    "avatar": "string",
    "avatarId": "string",
    "bgColor": "string",
    "bio": "string",
    "userRole": "number",
    "status": "number",
    "createdAt": "date",
    "language": "string",
    "theme": "number",
    "emailPrompt": "boolean",
    "mobilePrompt": "boolean",
    "articleCollect": ["string"],
    "postCollect": ["string"]
  }
  ```

### 個人 - 更新使用者資料
- **URL**: `/api/user/own`
- **Method**: `PATCH` ・ 權限：`authorization` + `requireMember` ・ 驗證：email、account ・ `multipart/form-data`
- **Request Body**（form-data，皆為選填）:
  ```json
  {
    "email": "string",
    "name": "string",
    "account": "string",
    "bio": "string",
    "avatar": "string",
    "avatarId": "string",
    "removeAvatar": "boolean (字串 \"true\")",
    "language": "string (zh | en)",
    "emailPrompt": "boolean",
    "mobilePrompt": "boolean"
  }
  ```
  - 頭像檔案欄位：`imageFile`（選填）
- **Response**:
  - 成功 `200`：更新後的使用者資料（含設定欄位，格式同「取得自己的使用者資料」）
  - `401 EMAIL_EXISTED`：Email 已被他人使用
  - `401 ACCOUNT_EXISTED`：帳號名稱已被他人使用
  - `400 INVALID_PARAM`：`language` 不合法，或同時上傳圖片與移除頭像
  - `404 NOT_FOUND`：找不到使用者

### 個人 - 切換深色模式
- **URL**: `/api/user/own/theme`
- **Method**: `PATCH` ・ 權限：`authorization` + `requireMember`
- **Request Body**:
  ```json
  { "theme": "number" }
  ```
  （0-明亮 / 1-深色）
- **Response**:
  - 成功 `200`：更新後的 UserSetting 物件

### 個人 - 刪除使用者
- **URL**: `/api/user/own`
- **Method**: `DELETE` ・ 權限：`authorization` + `requireMember`
- **Request Body**: （無，身分取自 cookie）
- **Response**:
  - 成功 `200`：`{ "code": "DELETE_SUCCESS", "message": "刪除成功" }`
  - `404 NOT_FOUND`：找不到使用者

> 連動清理：UserSetting、Follow（雙向）、Article、Post、Comment、按讚/留言引用、Cloudinary 圖片，並清除登入 cookie。

### 取得其他使用者資料
- **URL**: `/api/user/:id`
- **Method**: `POST` ・ 權限：`optionalAuth`（登入才附加追蹤狀態）
- **Path 參數**: `id` = 目標使用者 `_id`
- **Request Body**: `{}`（身分取自 cookie，可省略）
- **Response** 成功 `200`：
  ```json
  {
    "userId": "string",
    "_id": "string",
    "email": "string",
    "account": "string",
    "name": "string",
    "avatar": "string",
    "avatarId": "string",
    "bgColor": "string",
    "bio": "string",
    "userRole": "number",
    "status": "number",
    "createdAt": "date",
    "isFollow": "boolean",
    "followState": "number"
  }
  ```
  - `404 NOT_FOUND`：沒有使用者資料

> 未登入或未追蹤時不含 `isFollow` / `followState`。

---

## 工具相關 API

> 工具基底路徑 `/api/utility`。

### 取得搜尋結果數量
- **URL**: `/api/utility/searchCount`
- **Method**: `POST` ・ 權限：公開
- **Request Body**:
  ```json
  { "searchString": "string" }
  ```
- **Response** 成功 `200`：各類別符合的筆數
  ```json
  {
    "code": "SUCCESS",
    "article": "number",
    "post": "number",
    "user": "number",
    "hashtag": "number"
  }
  ```

---

## 錯誤代碼說明

| 錯誤代碼 | 典型 HTTP | 說明 |
|---------|-----------|------|
| `SUCCESS` | 200 | 操作成功 |
| `DELETE_SUCCESS` | 200 | 刪除成功 |
| `UPDATE_SUCCESS` | 200 | 更新成功 |
| `SYSTEM_ERR` | 500 | 系統 / 伺服器錯誤 |
| `VALIDATION_ERR` | 401 | 欄位驗證未通過 |
| `INVALID_PARAM` | 400 | 參數不合法 |
| `INVALID` | 400 | 追蹤目標不合法 / 無法追蹤自己 |
| `EMAIL_EXISTED` | 401 | Email 已被註冊 / 已被使用 |
| `ACCOUNT_EXISTED` | 401 | 帳號名稱已被使用 |
| `EMAIL_NOT_EXIST` | 404 | Email 尚未註冊 |
| `WRONG_PWD` | 401 | 密碼錯誤 |
| `PWD_UNMATCH` | 401 | 密碼與確認密碼不相符 |
| `NO_TOKEN` | 401 | 未提供驗證資訊 |
| `UN_AUTH` | 401 | 未登入 / 登入已失效 |
| `TOKEN_ERR` | 401 | 驗證錯誤 |
| `EXPIRE` | 500 | 重設密碼連結無效或已過期 |
| `GUEST_FORBIDDEN` | 403 | 訪客無此權限 |
| `FORBIDDEN` | 403 | 無權限操作（非作者本人） |
| `USER_NOT_FOUND` | 404 | 使用者不存在 |
| `NOT_FOUND` | 404 | 找不到資料 / 路由 |
| `NO_COMMENT` | 404 | 沒有留言 |
| `NO_SEARCH_STRING` | 200 | 未提供搜尋字串（hashTag 查詢） |
| `FOLLOWED` | 401 | 已追蹤 |
| `UNFOLLOWED` | 401 | 已取消追蹤 / 未追蹤 |
| `UPLOAD_ERR` | 400 | 檔案上傳錯誤（Multer） |
