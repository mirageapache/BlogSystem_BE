const { validateAccount, validatePassword, validateName, validateEmail } =
  require("./userValidation");

/** 註冊 validation */
const signupValidation = Object.values({
  validateAccount,
  validatePassword,
  validateName,
  validateEmail,
});

module.exports = signupValidation;