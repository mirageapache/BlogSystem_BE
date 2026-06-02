const rateLimit = require("express-rate-limit");

/** 共用回應格式 */
const handler = (req, res) =>
  res
    .status(429)
    .json({ code: "RATE_LIMIT", message: "請求過於頻繁，請稍後再試" });

/** 一般認證類限速（登入 / 註冊 / 重設密碼）
 * 注意：部署於 Vercel serverless 時為記憶體型，計數不跨實例共享，
 * 屬 best-effort，仍能擋住單一實例上的暴力嘗試。
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 20, // 每個 IP 15 分鐘內最多 20 次
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/** 寄信類限速（找回密碼 → Mailgun），避免被濫發 */
const mailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 5, // 每個 IP 1 小時內最多 5 次
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

module.exports = { authLimiter, mailLimiter };
