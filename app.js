const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

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
  console.log("connection db error : ", err);
});

// 路由設定
app.use(routes);

module.exports = app;