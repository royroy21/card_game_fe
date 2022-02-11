
export const range = (start, stop, step = 1) => {
  return Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => x + y * step)
}

export const removeFromList = (list, itemToRemove) => {
  return list.filter(item => {
    return (item !== itemToRemove)
  })
}

export const getRandomNumber = (min, max, fractionDigits=0) => {
    const number = Math.random() * (max - min) + min;
    return parseFloat(number.toFixed(fractionDigits))
}
