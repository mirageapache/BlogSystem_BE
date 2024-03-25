const { hashSync, genSaltSync } = require("bcryptjs");
const saltRounds = genSaltSync(11);
console.log(saltRounds);

const hashedPwd = hashSync("abcd1234", saltRounds); // init加密密碼
console.log(hashedPwd);
const userMockData = [
  { email: "test1@test.com", password: hashedPwd },
  { email: "test2@test.com", password: hashedPwd },
  { email: "test3@test.com", password: hashedPwd },
];

module.exports = { userMockData };
