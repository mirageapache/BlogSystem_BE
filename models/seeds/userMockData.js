import { hash, genSaltSync } from "bcryptjs";

const hashedPwd = await hash("abcd1234", genSaltSync(11)); // init加密密碼
const userMockData = [
  { _id:'11111' ,email: "test1@test.com", password: hashedPwd },
  { _id:'22222' ,email: "test2@test.com", password: hashedPwd },
  { _id:'33333' ,email: "test3@test.com", password: hashedPwd },
];

export default { userMockData };