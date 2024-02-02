const express = require("express");
const port = process.env.PORT || 3000;
const mongoose = require("mongoose");
if(process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const app = express();

// 資料庫連線設定
mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;

db.once('once', () => {
  console.log('mongodb is connected!');
});

db.on('error', (err) => {
  console.log(err)
});

// 路由
app.get("/", (req, res) => {
  res.send("express server");
});

app.listen(port, () => {
  console.log(`Express is running on http://localhost:${port}`);
});
