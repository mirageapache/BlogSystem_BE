const mongoose = require("mongoose");
const { body } = require("express-validator");
const User = require("../../models/user");
const { getRandomInt } = require("../mathUtils");
if (process.env.NODE_ENV !== "production") require("dotenv").config();

/** email 驗證 */
const validateEmail = [
  body("email")
    .bail()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),
];

/** password 驗證 */
const validatePassword = [
  body("password")
    .bail()
    .notEmpty()
    .withMessage("Password is required")
    .trim()
    .withMessage("Password must be at most 30 characters"),
];

/** 檢查 account 是否重複 */
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

/** name 驗證 */
const validateName = [
  body("name")
    .bail()
    .notEmpty()
    .withMessage("Name is required")
    .trim()
    .isLength({ max: 20 })
    .withMessage("Name must be at most 20 characters")
    .matches(/^[a-zA-Z0-9_.]+$/)
    .withMessage("Name can not contain symbols"),
];

module.exports = {
  validateEmail,
  validatePassword,
  checkAccountExist,
  validateName,
};
