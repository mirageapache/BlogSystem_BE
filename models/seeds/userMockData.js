const bcrypt = require("bcryptjs");
const salt = Number.parseInt(process.env.SALT_ROUNDS);

const hashedPwd = bcrypt.hashSync("abcd1234", salt); // init加密密碼

const userMockData = [
  { email: "test1@test.com", password: hashedPwd },
  { email: "test2@test.com", password: hashedPwd },
  { email: "test3@test.com", password: hashedPwd },
];

module.exports = { userMockData };
