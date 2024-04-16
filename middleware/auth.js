const jwt = require('jsonwebtoken');
if (process.env.NODE_ENV !== "production") require("dotenv").config();

const authorization = (req, res, next) => {
  const token = req.header('Authorization');
  console.log('token = ', token)
  console.log('JWT_SECRET = ', process.env.JWT_SECRET)
  console.log('req = ', req)
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  // 驗證 token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.param.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

}

module.exports = { authorization };