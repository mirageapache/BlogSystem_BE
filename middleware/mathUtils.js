/** 亂數產生介於min與max之間的數值
 *  @param min 最小值(包含)
 *  @param max 最大值(不包含)
 */
const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

module.exports = {
  getRandomInt
};
