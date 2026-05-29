const express = require("express");
const router = express.Router();
const utilityController = require("../../controllers/utilityController");

/** 搜尋結果數量 */
router.post('/searchCount', utilityController.searchCount);

module.exports = router;
