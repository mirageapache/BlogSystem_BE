const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/** 追蹤 Follow Ship Schema */
const FollowShipSchema = new Schema({
  /** 使用者id */
  user: {
    type: mongoose.Schema.Types.ObjectId,
    select: false,
    ref: "User",
  },
  /** 追蹤清單
   * 自己追蹤其他使用者
   *
   */
  following: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "User",
  },
  /** 粉絲清單
   * 其他使用者追蹤自己
   * state為訂閱狀態 state為訂閱狀態 [0-追蹤(不主動推播) / 1-主動推播]
   */
  follower: {
    type: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        state: {
          type: Number,
          default: 1,
        },
      },
    ],
  },
});

module.exports = mongoose.model("FollowShip", FollowShipSchema);
