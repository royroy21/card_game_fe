
const getRandomNumber = (min, max, fractionDigits=0) => {
    const number = Math.random() * (max - min) + min;
    return parseFloat(number.toFixed(fractionDigits))
}

export default getRandomNumber;
