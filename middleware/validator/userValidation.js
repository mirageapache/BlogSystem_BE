const mongoose = require("mongoose");
const { body } = require("express-validator");
const User = require("../../models/user");
const { getRandomInt } = require("../mathUtils");

/** email 驗證 */
const validateEmail = [
  body("email")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Email欄位必填")
    .isEmail()
    .withMessage("請輸入有效的Email"),
];

/** 檢查 email 是否已存在 */
const emailExisted = async (email, userId) => {
  let result = await User.find({ email });
  result = result.filter((res) => res._id.toString() !== userId);
  if (result.length > 0) return true;
  return false;
};

/** password 驗證 */
const validatePassword = [
  body("password").bail().trim().notEmpty().withMessage("密碼欄位必填"),
];

/** account 檢查是否重複(僅在註冊使用)
 *   在註冊時當account已存在將在原先的字串後面加上亂數(11-999)再寫入資料庫
 */
const checkAccountExist = async (account) => {
  let newAccount = account;
  const MAX_ATTEMPTS = 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const existingAccount = await User.findOne({ account: newAccount })
      .select("_id")
      .lean();
    if (!existingAccount) return newAccount;
    // 已存在則在原帳號後綴亂數重試
    newAccount = `${account}${getRandomInt(11, 999)}`;
  }

  // 重試多次仍碰撞，改用較大的亂數區間，盡可能避免重複（最終仍由 DB unique index 兜底）
  return `${account}${getRandomInt(1000, 999999)}`;
};

/** account 驗證 */
const validateAccount = [
  body("account")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("帳號欄位必填")
    .isLength({ max: 20 })
    .withMessage("帳號最多20個字")
    .matches(/^[a-zA-Z0-9_.]+$/)
    .withMessage("帳號僅能使用英數字、底線(_)與句點(.)"),
];

/** 檢查 account 是否已存在 */
const accountExisting = async (account, userId) => {
  const result = await User.find({ account });
  const newresult = result.filter((res) => res._id.toString() !== userId);
  if (newresult.length > 0) return true;
  return false;
};

/** name 驗證 */
const validateName = [
  body("name")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("暱稱欄位必填")
    .isLength({ max: 20 })
    .withMessage("暱稱最多20個字"),
];

module.exports = {
  validateEmail,
  emailExisted,
  validatePassword,
  checkAccountExist,
  validateAccount,
  accountExisting,
  validateName,
};
