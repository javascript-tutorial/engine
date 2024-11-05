function capitalizeKeys(obj, mapper) {
  const seen = new WeakSet();
  const stack = [{ input: obj, output: Array.isArray(obj) ? [] : {} }];
  const rootOutput = stack[0].output;

  while (stack.length > 0) {
    const { input, output } = stack.pop();

    if (seen.has(input)) {
      console.error("Circular reference in capitalizeKeys", obj);
      throw new Error("Circular reference detected");
    }
    seen.add(input);

    if (Array.isArray(input)) {
      input.forEach((item, index) => {
        if (Array.isArray(item)) {
          output[index] = [];
          stack.push({ input: item, output: output[index] });
        } else if (typeof item === 'object' && item !== null) {
          output[index] = {};
          stack.push({ input: item, output: output[index] });
        } else {
          output[index] = item;
        }
      });
    } else if (typeof input === 'object' && input !== null) {
      Object.entries(input).forEach(([key, value]) => {
        let keyCapitalized = key.replace(/_(\w)/g, (_, letter) => letter.toUpperCase());
        if (mapper) keyCapitalized = mapper(keyCapitalized);

        if (Array.isArray(value)) {
          output[keyCapitalized] = [];
          stack.push({ input: value, output: output[keyCapitalized] });
        } else if (typeof value === 'object' && value !== null) {
          output[keyCapitalized] = {};
          stack.push({ input: value, output: output[keyCapitalized] });
        } else {
          output[keyCapitalized] = value;
        }
      });
    }
  }

  return rootOutput;
}

module.exports = capitalizeKeys;
