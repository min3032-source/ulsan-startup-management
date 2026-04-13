export function formatPhone(value) {
  const numbers = value.replace(/[^\d]/g, '')

  if (numbers.length <= 3) {
    return numbers
  } else if (numbers.length <= 7) {
    return numbers.slice(0, 3) + '-' + numbers.slice(3)
  } else if (numbers.startsWith('02')) {
    // 02 지역번호
    if (numbers.length <= 9) {
      return numbers.slice(0, 2) + '-' + numbers.slice(2, 5) + '-' + numbers.slice(5)
    }
    return numbers.slice(0, 2) + '-' + numbers.slice(2, 6) + '-' + numbers.slice(6, 10)
  } else {
    // 010, 011 등
    return numbers.slice(0, 3) + '-' + numbers.slice(3, 7) + '-' + numbers.slice(7, 11)
  }
}
