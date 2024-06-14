const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/** 追蹤 Follow Ship Schema */
const FollowShipSchema = new Schema({
  /** 被追蹤人 */
  followed: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  /** 追蹤人 */
  follower: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  /** 訂閱狀態 [0-追蹤(不主動推播) / 1-主動推播] */
  followState: {
    type: Number,
    default: 1,
  },
  /** 開始追蹤日期 */
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Follow", FollowShipSchema);
