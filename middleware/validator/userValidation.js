const mongoose = require("mongoose");
const { body } = require("express-validator");
const User = require("../../models/user");
const { getRandomInt } = require("../mathUtils");
if (process.env.NODE_ENV !== "production") require("dotenv").config();

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
const emailExisting = async (email) => {
  const result = await User.findOne({ email });
    if (result) return res.status(401).json({ message: "該Email已存在！" });
}

/** password 驗證 */
const validatePassword = [
  body("password")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("密碼欄位必填")
];

/** account 檢查是否重複(僅在註冊使用) 
*   在註冊時當account已存在將在原先的字串後面加上亂數(11-999)再寫入資料庫
*/
const checkAccountExist = async (account) => {
  let newAccount = account;
  let existingAccount;
  try {
    do {
      existingAccount = await User.findOne({ account: newAccount });
      if (existingAccount) {
        newAccount = account;
        newAccount += getRandomInt(11, 999);
      }
    } while (existingAccount);

    return newAccount;
  } catch (error) {
    console.log(error);
  }
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
    .withMessage("Name can not contain symbols"),
];

/** 檢查 account 是否已存在 */
const accountExisting = async (account) => {
  const result = await User.findOne({ account });
    if (result) return res.status(401).json({ message: "該帳號名稱已存在！" });
}

/** name 驗證 */
const validateName = [
  body("name")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("暱稱欄位必填")
    .isLength({ max: 20 })
    .withMessage("暱稱最多20個字")
];

module.exports = {
  validateEmail,
  emailExisting,
  validatePassword,
  checkAccountExist,
  validateAccount,
  accountExisting,
  validateName,
};
