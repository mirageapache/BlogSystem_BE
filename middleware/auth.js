const jwt = require("jsonwebtoken");
const { isEmpty } = require("lodash");
if (process.env.NODE_ENV !== "production") require("dotenv").config();

/** authToken 驗證 */
const authorization = (req, res, next) => {
  const tokenString = req.header("Authorization");
  if (isEmpty(tokenString))
    return res.status(401).json({ code: "NO_TOKEN", message: "未提供驗證資訊" });
  const token = tokenString.split(" ")[1];
  if (!token) return res.status(401).json({ code: "NO_TOKEN", message: "未提供驗證資訊" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    // 參數帶在網址 => req.params / 參數包在body => req.body.param，兩個都要判斷
    if (
      decoded &&
      (req.params.id === decoded.userId ||
        req.body.id === decoded.userId ||
        req.body.userId === decoded.userId)
    ) {
      next();
    } else {
      return res.status(401).json({ code: "UN_AUTH", message: "狀態未登入", error: err });
    }
  });
};

module.exports = { authorization };
