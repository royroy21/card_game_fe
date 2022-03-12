
const removeFromList = (list, itemToRemove) => {
  return list.filter(item => {
    return (item !== itemToRemove)
  })
}

export default removeFromList;
