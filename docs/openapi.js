const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");

// spec 直接由各 route 檔上方的 @openapi 註解掃出來（註解貼在路由旁，最不易與程式漂移）。
// 用絕對路徑掃 route 模組，避免依賴啟動時的 cwd（serverless / 測試 cwd 不一定是專案根）。
// 安全性採「各端點自宣告」而非全域預設：本 API 公開/選登/需登入混雜，全域 bearer 會把公開端點誤鎖。
//   需登入：security: [{ bearer: [] }]
//   選登（登入後回傳更多欄位，如 isFollowing）：security: [{ bearer: [] }, {}]
//   AI 內部服務：security: [{ aiKey: [] }]
//   公開：不寫 security
module.exports = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BlogSystem API",
      version: "1.0.0",
      description:
        "部落格系統後端 API。需登入的端點請帶 `Authorization: Bearer <JWT>`。\n\n" +
        "Schema 欄位對應 Mongoose model；實際回應可能依端點做投影或 populate（如 author 會展開成 User）。",
    },
    components: {
      securitySchemes: {
        bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        aiKey: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "AI 內部服務金鑰（aiAuth middleware 讀 x-api-key header 驗證）",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            code: { type: "string", example: "INVALID_PARAM" },
            message: { type: "string" },
          },
        },
        // 使用者（不含 password / tokenVersion 等機敏欄位；部分端點只回公開子集）
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            email: { type: "string", description: "僅本人端點回傳" },
            account: { type: "string" },
            name: { type: "string" },
            avatar: { type: "string" },
            avatarId: { type: "string" },
            bgColor: { type: "string" },
            bio: { type: "string" },
            userRole: { type: "integer", enum: [0, 1, 2], description: "0-一般 / 1-進階 / 2-系統管理員" },
            status: { type: "integer", enum: [0, 1, 2, 3], description: "0-未驗證 / 1-正常 / 2-黑名單 / 3-停用" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Post: {
          type: "object",
          properties: {
            _id: { type: "string" },
            author: { $ref: "#/components/schemas/User" },
            content: { type: "string" },
            image: { type: "string" },
            imageId: { type: "string", description: "Cloudinary public_id（內部用）" },
            status: {
              type: "integer",
              enum: [0, 1, 2, 3],
              description: "0-草稿 / 1-發佈(公開) / 2-發佈(限閱) / 3-下架",
            },
            hashTags: { type: "array", items: { type: "string" } },
            collectionCount: { type: "integer" },
            shareCount: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            editedAt: { type: "string", format: "date-time" },
            likedByUsers: { type: "array", items: { type: "string" } },
            comments: { type: "array", items: { type: "string" } },
          },
        },
        Article: {
          type: "object",
          properties: {
            _id: { type: "string" },
            author: { $ref: "#/components/schemas/User" },
            title: { type: "string" },
            content: { type: "string" },
            coverImage: { type: "string" },
            coverImageId: { type: "string", description: "Cloudinary public_id（內部用）" },
            status: {
              type: "integer",
              enum: [0, 1, 2, 3],
              description: "0-草稿 / 1-發佈(公開) / 2-發佈(限閱) / 3-下架",
            },
            hashTags: { type: "array", items: { type: "string" } },
            collectionCount: { type: "integer" },
            shareCount: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            editedAt: { type: "string", format: "date-time" },
            likedByUsers: { type: "array", items: { type: "string" } },
            comments: { type: "array", items: { type: "string" } },
          },
        },
        Comment: {
          type: "object",
          properties: {
            _id: { type: "string" },
            author: { $ref: "#/components/schemas/User" },
            replyTo: { $ref: "#/components/schemas/User" },
            parentComment: { type: "string", description: "母留言 id（回覆串結構）" },
            content: { type: "string", maxLength: 500 },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Follow: {
          type: "object",
          properties: {
            _id: { type: "string" },
            followed: { $ref: "#/components/schemas/User" },
            follower: { $ref: "#/components/schemas/User" },
            followState: { type: "integer", enum: [0, 1], description: "0-追蹤(不推播) / 1-主動推播" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        // 核心領域物件：對應 notificationService 的 toClientShape 輸出（sender 只露公開欄位）
        Notification: {
          type: "object",
          properties: {
            _id: { type: "string" },
            type: { type: "string", example: "like_post" },
            entityType: { type: "string", example: "post" },
            entityId: { type: "string", nullable: true },
            title: { type: "string" },
            link: { type: "string" },
            preview: { type: "string" },
            isRead: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            sender: {
              type: "object",
              nullable: true,
              properties: {
                _id: { type: "string" },
                account: { type: "string" },
                name: { type: "string" },
                avatar: { type: "string" },
                bgColor: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  // glob 在 Windows 只吃正斜線，path.join 會產生反斜線，轉一下否則掃不到任何檔
  apis: [path.join(__dirname, "../routes/modules/*.js").replace(/\\/g, "/")],
});
