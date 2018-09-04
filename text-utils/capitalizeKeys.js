
function capitalizeKeys(obj, mapper) {

  if (Array.isArray(obj)) {
    let arr = obj;
    return arr.map(item => capitalizeKeys(item, mapper));
  }

  if (Object.prototype.toString.apply(obj) !== '[object Object]') {
    return obj;
  }

  let output = {};

  for (var key in obj) {
    var keyCapitalized = key.replace(/_(\w)/g, (match, letter) => letter.toUpperCase());
    if (mapper) keyCapitalized = mapper(keyCapitalized);
    output[keyCapitalized] = capitalizeKeys(obj[key], mapper);
  }
  return output;
}

module.exports = capitalizeKeys;


