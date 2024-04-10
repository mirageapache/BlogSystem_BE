const app = require('./app');
const port = process.env.PORT || 3000;

// 伺服器監聽
app.listen(port, () => {
  console.log(`Express is running on http://localhost:${port}`);
});
