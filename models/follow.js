const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/** 追蹤 Follow Ship Schema */
const FollowShipSchema = new Schema({
  /** 追蹤清單(自己追蹤其他使用者) */
  following: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  /** 粉絲清單(其他使用者追蹤自己) */
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
