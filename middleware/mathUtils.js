/** 亂數產生介於min與max之間的數值
 *  @param min 最小值(包含)
 *  @param max 最大值(不包含)
 *  註：使用 Math.random()，僅供非安全用途（如帳號亂數後綴 / 顏色挑選）；切勿用於 token / 密鑰產生。
 */
const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

module.exports = {
  getRandomInt
};
