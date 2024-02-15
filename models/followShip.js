const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/** 追蹤 Follow Ship Schema */
export const FollowShipSchema = new Schema({
  /** 使用者id */
  user:{
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
  },
  /** 追蹤
   * 自己追蹤其他使用者
   * state為訂閱狀態 [0-禁聲 / 1-一般 / 2-主動推播] 
   */
  following:{
    type: [{
      userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
      },
      state:{
        type: Number,
        default: 1,
      },
    }],
    ref: User,
  },
  /** 粉絲
   * 其他使用者追蹤自己
   */
  follower:{
    type: [mongoose.Schema.Types.ObjectId],
    ref: User,
  },
});
