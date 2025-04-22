# Blog System API 文檔

## 目錄
1. [認證相關 API](#認證相關-api)
2. [貼文相關 API](#貼文相關-api)
3. [用戶相關 API](#用戶相關-api)
4. [評論相關 API](#評論相關-api)
5. [追蹤相關 API](#追蹤相關-api)
6. [文章相關 API](#文章相關-api)

## 認證相關 API

### 註冊
- **URL**: `/api/auth/signup`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string",
    "confirmPassword": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "code": "SUCCESS",
    "message": "註冊成功"
  }
  ```
  - 失敗: `401 Unauthorized`
  ```json
  {
    "code": "EMAIL_EXISTED",
    "message": "Email已被註冊"
  }
  ```

### 登入
- **URL**: `/api/auth/signin`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "code": "SUCCESS",
    "message": "登入成功",
    "authToken": "string",
    "userData": {
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
      "mobilePrompt": "boolean"
    }
  }
  ```

### 找回密碼
- **URL**: `/api/auth/find-password`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "code": "SUCCESS",
    "message": "已發送重置密碼Email"
  }
  ```

### 重設密碼
- **URL**: `/api/auth/reset-password`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "password": "string",
    "confirmPassword": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "code": "SUCCESS",
    "message": "密碼重設成功"
  }
  ```

## 貼文相關 API

### 取得所有貼文
- **URL**: `/api/posts`
- **Method**: `GET`
- **Response**:
  - 成功: `200 OK`
  ```json
  [
    {
      "_id": "string",
      "author": {
        "_id": "string",
        "account": "string",
        "name": "string",
        "avatar": "string",
        "bgColor": "string"
      },
      "content": "string",
      "image": "string",
      "status": "number",
      "hashTags": ["string"],
      "createdAt": "date",
      "likedByUsers": [
        {
          "_id": "string",
          "account": "string",
          "name": "string",
          "avatar": "string",
          "bgColor": "string"
        }
      ],
      "comments": ["string"]
    }
  ]
  ```

### 取得分頁貼文
- **URL**: `/api/posts/partial`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "page": "number",
    "limit": "number"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "posts": [
      {
        "_id": "string",
        "author": {
          "_id": "string",
          "account": "string",
          "name": "string",
          "avatar": "string",
          "bgColor": "string"
        },
        "content": "string",
        "image": "string",
        "status": "number",
        "hashTags": ["string"],
        "createdAt": "date",
        "likedByUsers": [
          {
            "_id": "string",
            "account": "string",
            "name": "string",
            "avatar": "string",
            "bgColor": "string"
          }
        ],
        "comments": ["string"]
      }
    ],
    "nextPage": "number",
    "totalPosts": "number"
  }
  ```

### 搜尋貼文
- **URL**: `/api/posts/search`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "searchString": "string",
    "authorId": "string",
    "page": "number",
    "limit": "number"
  }
  ```
- **Response**: 同分頁貼文

### 取得貼文詳細資料
- **URL**: `/api/posts/detail`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "postId": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "_id": "string",
    "author": {
      "_id": "string",
      "account": "string",
      "name": "string",
      "avatar": "string",
      "bgColor": "string"
    },
    "content": "string",
    "image": "string",
    "status": "number",
    "hashTags": ["string"],
    "createdAt": "date",
    "likedByUsers": [
      {
        "_id": "string",
        "account": "string",
        "name": "string",
        "avatar": "string",
        "bgColor": "string"
      }
    ],
    "comments": [
      {
        "_id": "string",
        "author": {
          "_id": "string",
          "account": "string",
          "name": "string",
          "avatar": "string",
          "bgColor": "string"
        },
        "replyTo": {
          "_id": "string",
          "account": "string",
          "name": "string",
          "avatar": "string",
          "bgColor": "string"
        },
        "content": "string",
        "createdAt": "date"
      }
    ]
  }
  ```

### 新增貼文
- **URL**: `/api/posts`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "author": "string",
    "content": "string",
    "status": "number",
    "hashTags": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "_id": "string",
    "author": "string",
    "content": "string",
    "image": "string",
    "imageId": "string",
    "status": "number",
    "hashTags": ["string"],
    "createdAt": "date"
  }
  ```

### 更新貼文
- **URL**: `/api/posts/:postId`
- **Method**: `PUT`
- **Request Body**:
  ```json
  {
    "content": "string",
    "status": "number",
    "image": "string",
    "imageId": "string",
    "removeImage": "boolean",
    "hashTags": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "_id": "string",
    "author": "string",
    "content": "string",
    "image": "string",
    "imageId": "string",
    "status": "number",
    "hashTags": ["string"],
    "createdAt": "date"
  }
  ```

## 用戶相關 API

### 取得所有使用者
- **URL**: `/api/users`
- **Method**: `GET`
- **Response**:
  - 成功: `200 OK`
  ```json
  [
    {
      "_id": "string",
      "email": "string",
      "account": "string",
      "name": "string",
      "avatar": "string",
      "bgColor": "string",
      "userRole": "number",
      "status": "number",
      "bio": "string",
      "createdAt": "date"
    }
  ]
  ```

### 搜尋使用者
- **URL**: `/api/users/search`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "searchString": "string",
    "userId": "string",
    "page": "number",
    "limit": "number"
  }
  ```
- **Response**:
  - 成功: `200 OK`
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
        "followState": "number"
      }
    ],
    "nextPage": "number",
    "totalUser": "number"
  }
  ```

### 取得推薦使用者
- **URL**: `/api/users/recommend`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "userId": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
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
      "followState": "number"
    }
  ]
  ```

### 取得其他使用者資料
- **URL**: `/api/users/:id`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "currentUserId": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "userId": "string",
    "email": "string",
    "account": "string",
    "name": "string",
    "avatar": "string",
    "bgColor": "string",
    "userRole": "number",
    "status": "number",
    "bio": "string",
    "createdAt": "date",
    "isFollow": "boolean",
    "followState": "number"
  }
  ```

### 取得個人資料
- **URL**: `/api/users/own/:id`
- **Method**: `GET`
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "userId": "string",
    "email": "string",
    "account": "string",
    "name": "string",
    "avatar": "string",
    "bgColor": "string",
    "userRole": "number",
    "status": "number",
    "bio": "string",
    "createdAt": "date",
    "language": "string",
    "theme": "number",
    "emailPrompt": "boolean",
    "mobilePrompt": "boolean"
  }
  ```

## 評論相關 API

### 取得所有留言
- **URL**: `/api/comments`
- **Method**: `GET`
- **Response**:
  - 成功: `200 OK`
  ```json
  [
    {
      "_id": "string",
      "author": "string",
      "content": "string",
      "createdAt": "date"
    }
  ]
  ```

### 取得貼文留言
- **URL**: `/api/comments/post`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "id": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "_id": "string",
    "comments": [
      {
        "_id": "string",
        "author": {
          "_id": "string",
          "account": "string",
          "name": "string",
          "avatar": "string",
          "bgColor": "string"
        },
        "replyTo": {
          "_id": "string",
          "account": "string",
          "name": "string",
          "avatar": "string",
          "bgColor": "string"
        },
        "content": "string",
        "createdAt": "date"
      }
    ]
  }
  ```

### 新增留言
- **URL**: `/api/comments`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "id": "string",
    "userId": "string",
    "content": "string",
    "route": "string" // "post" 或 "article"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "_id": "string",
    "comments": ["string"]
  }
  ```

### 更新留言
- **URL**: `/api/comments/:id`
- **Method**: `PUT`
- **Request Body**:
  ```json
  {
    "content": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "_id": "string",
    "author": "string",
    "content": "string",
    "createdAt": "date"
  }
  ```

### 刪除留言
- **URL**: `/api/comments`
- **Method**: `DELETE`
- **Request Body**:
  ```json
  {
    "postId": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "code": "DELETE_SUCCESS",
    "message": "刪除成功"
  }
  ```

## 追蹤相關 API

### 取得追蹤清單
- **URL**: `/api/follows/following`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "userId": "string",
    "page": "number",
    "limit": "number"
  }
  ```
- **Response**:
  - 成功: `200 OK`
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
        "isFollow": "boolean"
      }
    ],
    "nextPage": "number",
    "totalUser": "number"
  }
  ```

### 取得粉絲清單
- **URL**: `/api/follows/follower`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "userId": "string",
    "page": "number",
    "limit": "number"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "followList": [
      {
        "_id": "string",
        "account": "string",
        "name": "string",
        "avatar": "string",
        "bgColor": "string",
        "followState": "number"
      }
    ],
    "nextPage": "number",
    "totalUser": "number"
  }
  ```

### 追蹤使用者
- **URL**: `/api/follows`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "userId": "string",
    "targetId": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "code": "SUCCESS",
    "message": "追蹤成功"
  }
  ```
  - 失敗: `401 Unauthorized`
  ```json
  {
    "code": "FOLLOWED",
    "message": "已追蹤"
  }
  ```

### 取消追蹤
- **URL**: `/api/follows`
- **Method**: `DELETE`
- **Request Body**:
  ```json
  {
    "userId": "string",
    "targetId": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "code": "SUCCESS",
    "message": "取消追蹤成功"
  }
  ```
  - 失敗: `401 Unauthorized`
  ```json
  {
    "code": "UNFOLLOWED",
    "message": "已取消追蹤"
  }
  ```

### 更新訂閱狀態
- **URL**: `/api/follows/state`
- **Method**: `PUT`
- **Request Body**:
  ```json
  {
    "userId": "string",
    "targetId": "string",
    "state": "number"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "code": "UPDATE_SUCCESS",
    "message": "已更新狀態",
    "FollowData": {
      "_id": "string",
      "follower": "string",
      "followed": "string",
      "followState": "number"
    }
  }
  ```

## 文章相關 API

### 取得所有文章
- **URL**: `/api/articles`
- **Method**: `GET`
- **Response**:
  - 成功: `200 OK`
  ```json
  [
    {
      "_id": "string",
      "author": {
        "_id": "string",
        "account": "string",
        "name": "string",
        "avatar": "string",
        "bgColor": "string"
      },
      "title": "string",
      "content": "string",
      "status": "number",
      "subject": "string",
      "hashTags": ["string"],
      "createdAt": "date",
      "likedByUsers": [
        {
          "_id": "string",
          "account": "string",
          "name": "string",
          "avatar": "string",
          "bgColor": "string"
        }
      ],
      "comments": ["string"]
    }
  ]
  ```

### 取得分頁文章
- **URL**: `/api/articles/partial`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "page": "number",
    "limit": "number"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "articles": [
      {
        "_id": "string",
        "author": {
          "_id": "string",
          "account": "string",
          "name": "string",
          "avatar": "string",
          "bgColor": "string"
        },
        "title": "string",
        "content": "string",
        "status": "number",
        "subject": "string",
        "hashTags": ["string"],
        "createdAt": "date",
        "likedByUsers": [
          {
            "_id": "string",
            "account": "string",
            "name": "string",
            "avatar": "string",
            "bgColor": "string"
          }
        ],
        "comments": ["string"]
      }
    ],
    "nextPage": "number",
    "totalArticle": "number"
  }
  ```

### 搜尋文章
- **URL**: `/api/articles/search`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "searchString": "string",
    "authorId": "string",
    "page": "number",
    "limit": "number"
  }
  ```
- **Response**: 同分頁文章

### 取得文章詳細資料
- **URL**: `/api/articles/detail`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "articleId": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "_id": "string",
    "author": {
      "_id": "string",
      "account": "string",
      "name": "string",
      "avatar": "string",
      "bgColor": "string"
    },
    "title": "string",
    "content": "string",
    "status": "number",
    "subject": "string",
    "hashTags": ["string"],
    "createdAt": "date",
    "likedByUsers": [
      {
        "_id": "string",
        "account": "string",
        "name": "string",
        "avatar": "string",
        "bgColor": "string"
      }
    ],
    "comments": [
      {
        "_id": "string",
        "author": {
          "_id": "string",
          "account": "string",
          "name": "string",
          "avatar": "string",
          "bgColor": "string"
        },
        "replyTo": {
          "_id": "string",
          "account": "string",
          "name": "string",
          "avatar": "string",
          "bgColor": "string"
        },
        "content": "string",
        "createdAt": "date"
      }
    ]
  }
  ```

### 新增文章
- **URL**: `/api/articles`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "userId": "string",
    "title": "string",
    "content": "string",
    "subject": "string",
    "hashTags": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "_id": "string",
    "author": "string",
    "title": "string",
    "content": "string",
    "status": "number",
    "subject": "string",
    "hashTags": ["string"],
    "createdAt": "date",
    "likedByUsers": [],
    "comments": []
  }
  ```

### 更新文章
- **URL**: `/api/articles/:articleId`
- **Method**: `PUT`
- **Request Body**:
  ```json
  {
    "userId": "string",
    "title": "string",
    "content": "string",
    "subject": "string",
    "hashTags": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "_id": "string",
    "author": "string",
    "title": "string",
    "content": "string",
    "status": "number",
    "subject": "string",
    "hashTags": ["string"],
    "createdAt": "date",
    "editedAt": "date"
  }
  ```

### 刪除文章
- **URL**: `/api/articles`
- **Method**: `DELETE`
- **Request Body**:
  ```json
  {
    "articleId": "string"
  }
  ```
- **Response**:
  - 成功: `200 OK`
  ```json
  {
    "code": "DELETE_SUCCESS",
    "message": "文章刪除成功"
  }
  ```

## 錯誤代碼說明

| 錯誤代碼 | 說明 |
|---------|------|
| SYSTEM_ERR | 系統錯誤 |
| VALIDATION_ERR | 驗證錯誤 |
| EMAIL_EXISTED | Email已被註冊 |
| EMAIL_NOT_EXIST | Email尚未註冊 |
| WRONG_PWD | 密碼錯誤 |
| PWD_UNMATCH | 密碼與確認密碼不相符 |
| NO_TOKEN | 未提供驗證資訊 |
| TOKEN_ERR | 驗證錯誤 |
| EXPIRE | 重設密碼連接無效或已過期 |
| NOT_FOUND | 找不到資料 |
| SEND_EMAIL_ERR | 發送郵件錯誤 | 