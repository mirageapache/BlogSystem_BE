const jwt = require("jsonwebtoken");
if (process.env.NODE_ENV !== "production") require("dotenv").config();

const authorization = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  console.log(req.params.id);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log(decoded);
  try {
    // 驗證 token
    // if ((req.params.id = decoded.id)) {
    //   next();
    // } else {
    //   return res.status(401).json({ message: "Unauthorized" });
    // }
  } catch (error) {}
};

module.exports = { authorization };
