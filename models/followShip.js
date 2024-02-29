const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/** 追蹤 Follow Ship Schema */
const FollowShipSchema = new Schema({
  /** 使用者id */
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
  },
  /** 追蹤
   * 自己追蹤其他使用者
   * state為訂閱狀態 state為訂閱狀態 [0-未追蹤 / 1-追蹤(不主動推播) / 2-主動推播]
   */
  following: {
    type: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: User,
        },
        state: {
          type: Number,
          default: 1,
        },
      },
    ],
    ref: User,
  },
  /** 粉絲
   * 其他使用者追蹤自己
   */
  follower: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: User,
  },
});

module.exports = mongoose.model("followShip", FollowShipSchema);
