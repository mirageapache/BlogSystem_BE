const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const port = process.env.PORT || 3000;
const routes = require("./routes");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 資料庫連線設定
mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;

db.once("once", () => {
  console.log("mongodb is connected!");
});

db.on("error", (err) => {
  console.log(err);
});

// 路由設定
app.use(routes);

// 伺服器監聽
app.listen(port, () => {
  console.log(`Express is running on http://localhost:${port}`);
});
