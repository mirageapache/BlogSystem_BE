const mongoose = require("mongoose");
const { Schema } = mongoose;

/** 通知 Notification Schema（同時涵蓋互動通知與系統通知 type:'system'） */
const notificationSchema = new Schema(
  {
    /** 接收者（作者本人） */
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    /** 觸發者；系統通知無 sender，故非必填 */
    sender: { type: Schema.Types.ObjectId, ref: "User" },
    type: {
      type: String,
      enum: ["like_post", "like_article", "comment_post", "comment_article", "reply_comment", "follow", "system"],
      required: true,
    },
    /** 導向目標頁；系統通知可無目標，故非必填 */
    entityType: { type: String, enum: ["post", "article", "user", "system"] },
    /** 點擊導向的目標 id；系統通知改用 link，故非必填 */
    entityId: { type: Schema.Types.ObjectId },
    /** 系統通知標題（互動類用不到） */
    title: { type: String, default: "", maxlength: 100 },
    /** 系統通知點擊導向（站內路徑或外部 URL，寫入時過白名單）；互動類用 entityType/entityId */
    link: { type: String, default: "", maxlength: 500 },
    /** 留言摘要 / 貼文標題 / 系統通知內文 */
    preview: { type: String, default: "", maxlength: 200 },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true } // createdAt / updatedAt
);

// 列表查詢：某人的通知依時間倒序
notificationSchema.index({ recipient: 1, createdAt: -1 });
// 未讀數查詢
notificationSchema.index({ recipient: 1, isRead: 1 });
// 按愛心 / 追蹤去重（同一人對同一目標只留一筆）
notificationSchema.index(
  { recipient: 1, sender: 1, type: 1, entityId: 1 },
  { unique: true, partialFilterExpression: { type: { $in: ["like_post", "like_article", "follow"] } } }
);

module.exports = mongoose.model("Notification", notificationSchema);
