const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.header('Authorization');
  console.log('token = ', token)
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  // 驗證 token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log('req = ',req);
    req.param.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

}

module.exports = { authenticate };