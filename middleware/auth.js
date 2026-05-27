const jwt = require("jsonwebtoken");
if (process.env.NODE_ENV !== "production") require("dotenv").config();

/** authToken 驗證 */
const authorization = (req, res, next) => {
  const token = req.cookies?.authToken;
  if (!token)
    return res.status(401).json({ code: "NO_TOKEN", message: "未提供驗證資訊" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (!decoded)
      return res.status(401).json({ code: "UN_AUTH", message: "狀態未登入", error: err });

    const hasIdInRequest = req.params.id || req.body.id || req.body.userId;
    const idMatches =
      req.params.id === decoded.userId ||
      req.body.id === decoded.userId ||
      req.body.userId === decoded.userId;

    if (!hasIdInRequest || idMatches) {
      req.user = decoded;
      next();
    } else {
      return res.status(401).json({ code: "UN_AUTH", message: "狀態未登入", error: err });
    }
  });
};

module.exports = { authorization };
