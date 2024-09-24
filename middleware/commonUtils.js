const { getRandomInt } = require("./mathUtils");

/** 亂數產生大頭貼背景顏色 */
const getRandomColor = () => {
  const colorList = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', 
    '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#78716c'
  ]
  const index = getRandomInt(0, colorList.length-1);
  return colorList[index];
}

module.exports = {
  getRandomColor
};
