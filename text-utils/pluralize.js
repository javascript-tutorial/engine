function getPluralType(n) {
  if ((n % 10) == 1 && (n % 100) != 11) {
    return 'one';
  }
  if ((n % 10) >= 2 && (n % 10) <= 4 && ((n % 100) < 12 || (n % 100) > 14) && n == Math.floor(n)) {
    return 'few';
  }
  if ((n % 10) === 0 || ((n % 10) >= 5 && (n % 10) <= 9) || ((n % 100) >= 11 && (n % 100) <= 14) && n == Math.floor(n)) {
    return 'many';
  }
  return 'other';
}

// pluralize(10, 'груша', 'груши', 'груш')
function pluralize(count, string) {
  var type = getPluralType(count);
  var values = string.split(',');

  switch (type) {
    case 'one':
      return values[0];
    case 'few':
      return values[1];
    case 'many':
      return values[2];
    default:
      throw new Error("Unsupported count: " + count);
  }

}

module.exports = pluralize;
