const express = require("express");
const router = express.Router();
const AES = require("crypto-js/aes");
const cryptoSecret = process.env.CRYPTO_SECRET;

/** 字串加密 */
router.get('/encode', async (req, res) => {
  const string = req.body.string;
  const encodeStr = AES.encrypt(string, cryptoSecret);
  res.status(200).json({ encodeStr });
});

/** 字串解密 */
router.get('/decode', async (req, res) => {
  const string = req.body.string;
  const decodeStr = AES.decrypt(string, cryptoSecret);
  res.status(200).json({ decodeStr });
});

module.exports = router;