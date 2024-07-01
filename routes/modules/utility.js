const express = require("express");
const router = express.Router();
const utilityController = require("../../controllers/utilityController");

/** 字串加密 */
router.post("/encode", utilityController.encode);

/** 字串解密 */
router.post("/decode", utilityController.decode);

module.exports = router;
