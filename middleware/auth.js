const jwt = require("jsonwebtoken");
const User = require("../models/user");

/** authToken 驗證
 * 僅信任 JWT 來源的身份，將解析結果寫入 req.user。
 * 任何由前端傳入的 userId（params/body/query）都不在此處比對 — controller 也不該採信。
 * 另比對 tokenVersion：登出 / 重設密碼後遞增版本，使舊 token 立即失效。
 */
const authorization = (req, res, next) => {
  const token = req.cookies?.authToken;
  if (!token)
    return res.status(401).json({ code: "NO_TOKEN", message: "未提供驗證資訊" });

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err || !decoded)
      return res.status(401).json({ code: "UN_AUTH", message: "狀態未登入" });

    // 訪客 token 沒有對應的 user 紀錄，不做 tokenVersion 檢查
    if (decoded.role === "guest" || decoded.userId === "guest") {
      req.user = decoded;
      return next();
    }

    try {
      const user = await User.findById(decoded.userId)
        .select("tokenVersion")
        .lean();
      if (!user || (user.tokenVersion ?? 0) !== (decoded.tokenVersion ?? -1)) {
        return res
          .status(401)
          .json({ code: "UN_AUTH", message: "登入已失效，請重新登入" });
      }
      req.user = decoded; // { userId, tokenVersion, role? }
      next();
    } catch (e) {
      return res
        .status(500)
        .json({ code: "SYSTEM_ERR", message: "驗證失敗" });
    }
  });
};

/** 拒絕訪客存取寫入類 API
 * 必須放在 authorization 之後使用。
 */
const requireMember = (req, res, next) => {
  if (!req.user || req.user.role === "guest" || req.user.userId === "guest") {
    return res.status(403).json({ code: "GUEST_FORBIDDEN", message: "訪客無此權限" });
  }
  next();
};

/** 可選認證：有合法 token 就帶上 req.user，沒有/失敗也直接放行。
 * 用於「未登入也能看，但已登入要附加個人化資訊（例如追蹤狀態）」的路由。
 */
const optionalAuth = (req, res, next) => {
  const token = req.cookies?.authToken;
  if (!token) return next();

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (!err && decoded) req.user = decoded;
    next();
  });
};

module.exports = { authorization, requireMember, optionalAuth };
