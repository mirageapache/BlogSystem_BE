const AES = require("crypto-js/aes");
const cryptoSecret = process.env.CRYPTO_SECRET;

const utilityController = {
  /** 字串加密 */
  encode: async (req, res) => {
    const string = req.body.string;
    const encodeStr = AES.encrypt(string, cryptoSecret);
    return res.status(200).json({ encodeStr });
  },

  /** 字串解密 */
  decode: async (req, res) => {
    const string = req.body.string;
    const decodeStr = AES.decrypt(string, cryptoSecret);
    return res.status(200).json({ decodeStr });
  },
};

module.exports = utilityController;
