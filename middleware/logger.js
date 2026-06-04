/** 輕量結構化 logger 包裝（無外部依賴）
 * 統一輸出格式並附上時間戳與等級；測試環境(NODE_ENV === 'test')靜音。
 * 日後若要換成 winston / pino，只需改這個檔，呼叫端不受影響。
 */
const isTest = process.env.NODE_ENV === "test";

const format = (level, args) => [
  `[${new Date().toISOString()}] [${level}]`,
  ...args,
];

const logger = {
  info: (...args) => {
    if (!isTest) console.log(...format("INFO", args));
  },
  warn: (...args) => {
    if (!isTest) console.warn(...format("WARN", args));
  },
  error: (...args) => {
    if (!isTest) console.error(...format("ERROR", args));
  },
};

module.exports = logger;
