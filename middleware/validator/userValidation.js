const { body } = require('express-validator');

/** account 驗證 */
export const validateAccount = [
  body('account')
    .bail()
    .notEmpty().withMessage('Account is required')
    .trim()
    .isLength({ max: 30 }).withMessage('Account must be at most 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Account can not contain symbols')
];

/** password 驗證 */
export const validatePassword = [
  body('password')
    .bail()
    .notEmpty().withMessage('Password is required')
    .trim()
    .isLength({ max: 30 }).withMessage('Password must be at most 30 characters')
]

/** name 驗證 */
export const validateName = [
  body('name')
  .bail()
  .notEmpty().withMessage('Name is required')
  .trim()
  .isLength({ max: 20 }).withMessage('Name must be at most 20 characters')
  .matches(/^[a-zA-Z0-9_.]+$/).withMessage('Name can not contain symbols')
]

/** email 驗證 */
export const validateEmail = [
  body('email')
    .bail()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
]
