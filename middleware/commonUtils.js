const mongoose = require("mongoose");
const { getRandomInt } = require("./mathUtils");

/** 公開可見的使用者欄位（用於 populate select），集中管理避免多處重複 */
const USER_PUBLIC_FIELDS = "_id account name avatar bgColor";

/** 驗證是否為合法的 MongoDB ObjectId */
const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(id) &&
  String(new mongoose.Types.ObjectId(id)) === String(id);

/** escape 使用者輸入中的 regex 特殊字元，避免 Regex Injection / ReDoS */
const escapeRegExp = (str = "") =>
  String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 安全解析前端傳入的 hashTags 字串（JSON 陣列），失敗或非陣列一律回 [] */
const parseHashTags = (raw) => {
  if (raw === undefined || raw === null || raw === "") return [];
  if (Array.isArray(raw)) return raw;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
};

/** 統一的 cookie 設定（依環境決定 secure / sameSite），extra 可覆寫或追加（如 maxAge） */
const getCookieOptions = (extra = {}) => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    ...extra,
  };
};

/** 亂數產生大頭貼背景顏色
 * 註：僅用於 UI 顯示（非安全用途），使用 Math.random() 即可；切勿用於產生 token / 密鑰。
 */
const getRandomColor = () => {
  const colorList = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', 
    '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#78716c'
  ]
  const index = getRandomInt(0, colorList.length-1);
  return colorList[index];
}

module.exports = {
  getRandomColor,
  isValidId,
  escapeRegExp,
  parseHashTags,
  getCookieOptions,
  USER_PUBLIC_FIELDS,
};
