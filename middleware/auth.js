const jwt = require("jsonwebtoken");
if (process.env.NODE_ENV !== "production") require("dotenv").config();

/** authToken 驗證 */
const authorization = (req, res, next) => {
  const token = req.header("Authorization").split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    // 參數帶在網址 => req.params / 參數包在body => req.body.param，兩個都要判斷
    if (decoded && (req.params.id === decoded.userId || req.body.id === decoded.userId)) {
      next();
    } else {
      return res.status(401).json({ message: "Unauthorized" , error: err});
    }
  });
};

module.exports = { authorization };
