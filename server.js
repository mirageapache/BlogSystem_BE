const express = require("express");
const port = process.env.port || 3000;
const app = express();

app.get("/", (req, res) => {
  res.send("express server");
});

app.listen(port, () => {
  console.log(`Express is running on http://localhost:${port}`);
});
