
export const convertPixelsToPercent = (screenSize, pixels) => {
  // screenSize is either X or Y
  // pixels is either X or Y
  return pixels / screenSize * 100;
}

export const convertPercentToPixels = (screenSize, percentage) => {
  // screenSize is either X or Y
  // percentage is either X or Y
  return percentage / 100 * screenSize;
}
