const express = require("express");
const router = express.Router();
const utilityController = require("../../controllers/utilityController");

/** 搜尋結果數量 */
router.post('/searchCount', utilityController.searchCount);

/** 字串加密 */
router.post("/encode", utilityController.encode);

/** 字串解密 */
router.post("/decode", utilityController.decode);

module.exports = router;
