
function capitalizeKeys(obj, mapper, seen = new WeakSet()) {
  if (Array.isArray(obj)) {
    return obj.map(item => capitalizeKeys(item, mapper, seen));
  }

  if (Object.prototype.toString.call(obj) !== '[object Object]') {
    return obj;
  }

  if (seen.has(obj)) {
    throw new Error("Circular reference detected");
  }

  seen.add(obj); // Mark the object as visited.

  let output = {};

  for (let key in obj) {
    let keyCapitalized = key.replace(/_(\w)/g, (match, letter) => letter.toUpperCase());
    if (mapper) keyCapitalized = mapper(keyCapitalized);
    output[keyCapitalized] = capitalizeKeys(obj[key], mapper, seen);
  }

  seen.delete(obj); // Remove from `seen` after processing to allow for reuse in non-circular parts.

  return output;
}

module.exports = capitalizeKeys;
