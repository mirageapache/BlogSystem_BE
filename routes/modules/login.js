const express = require("express");
const router = express.Router();
const { get } = require("lodash");
const { validationResult } = require("express-validator");
const User = require("../../models/user");
const { signupValidation } = require("../../middleware/validator");
const {
  validateAccount,
  validatePassword,
  validateName,
  validateEmail,
} = require("../../middleware/validator/userValidation");

/** 註冊 */
router.post("/signup", [validateEmail, validatePassword ], async (req, res) => {
  const param = get(req, "body", {});
  console.log(param);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password, name, avatar, userRole, status } = param;
    // const newUser = await User.create({
    //   password,
    //   name,
    //   email,
    //   avatar: avatar || "",
    //   userRole: userRole || 0,
    //   status: status || 0,
    // });
    // res.status(200).json(newUser);

    res.status(200).json(req.body);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/** 登入 */
router.post("/signin", async (req, res) => {
  console.log(req.body);
  signupValidation();
  // try {
  //   const { account, password, name, email, avatar, userRole, status } =
  //     req.body;
  //   const newUser = await User.create({
  //     account,
  //     password,
  //     name,
  //     email,
  //     avatar: avatar || "",
  //     userRole: userRole || 0,
  //     status: status || 0,
  //   });
  //   res.status(200).json(newUser);
  // } catch (error) {
  //   res.status(400).json({ message: error.message });
  // }
});

module.exports = router;
