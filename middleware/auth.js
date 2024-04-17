const jwt = require("jsonwebtoken");
if (process.env.NODE_ENV !== "production") require("dotenv").config();

const authorization = (req, res, next) => {
  const token = req.header("Authorization").split(" ")[1];
  console.log(token);
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('JWT驗證失敗:', err);
      return res.status(401).json({ message: "Unauthorized" , error: err});
    } else {
      console.log('JWT驗證成功，解析結果:', decoded);
      next();
    }
  });
};

module.exports = { authorization };
