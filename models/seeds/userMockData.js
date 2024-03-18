const { hashSync, genSaltSync } = require("bcryptjs");

const hashedPwd = hashSync("abcd1234", genSaltSync(11)); // init加密密碼
const userMockData = [
  { email: "test1@test.com", password: hashedPwd },
  { email: "test2@test.com", password: hashedPwd },
  { email: "test3@test.com", password: hashedPwd },
];

module.exports = { userMockData };
