const request = require("supertest");
const app = require("../app"); // 假設Express應用程序在app.js中定義

describe("註冊和登入功能測試", () => {
  // 註冊測試
  it("註冊成功", async () => {
    const response = await request(app)
      .post("/auth/signup")
      .send({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("success");
    // 這裡可以加上更多的斷言來檢驗註冊成功後的回應
  });

  it("註冊失敗 - 密碼與確認密碼不符", async () => {
    const response = await request(app)
      .post("/auth/signup")
      .send({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password456", // 不符的確認密碼
      });
    
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("密碼與確認密碼不相符！");
  });

  // 登入測試
  it("登入成功", async () => {
    const response = await request(app)
      .post("/auth/signin")
      .send({
        email: "test@example.com",
        password: "password123",
      });
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("signin success");
    // 這裡可以加上更多的斷言來檢驗登入成功後的回應
  });

  it("登入失敗 - Email尚未註冊", async () => {
    const response = await request(app)
      .post("/auth/signin")
      .send({
        email: "nonexistent@example.com", // 不存在的Email
        password: "password123",
      });
    
    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Email尚未註冊！");
  });

  it("登入失敗 - 密碼錯誤", async () => {
    const response = await request(app)
      .post("/auth/signin")
      .send({
        email: "test@example.com",
        password: "incorrectpassword", // 錯誤的密碼
      });
    
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("密碼錯誤！");
  });
});
