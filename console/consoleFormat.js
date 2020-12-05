/* can be required directly from other client-side code */

module.exports = function(args) {
  return Array.from(args).map(format).join(', ');
}

function format(value, depth = 0) {
  if (value == null) return 'null';

  if (typeof value == 'function') {
    return formatFunction(value, depth);
  }

  if (Array.isArray(value)) {
    return formatArray(value, depth);
  }

  if (typeof window == 'object') {
    if (value instanceof Node) {
      return format(value.outerHTML, depth);
    }

    if (value instanceof Event) {
      let copyProps = [Symbol.toStringTag, 'type', 'clientX', 'clientY', 'key', 'code'];
      let obj = {};
      for(let prop of copyProps) {
        if (prop in value) {  
          obj[prop] = value[prop];
        }
      }
      return format(obj, depth);
    }
  }

  if (typeof value == 'object') {
    return formatObject(value, depth);
  }

  if (typeof value == 'string') {
    return formatString(value, depth);
  }

  return JSON.stringify(value);
}

function formatFunction(f, depth = 0) {
  if (depth) {
    return 'function ' + f.name;
  }

  f = f.toString();
  f = f.split('\n');
  if (f.length > 10) {
    f = f.slice(0, 10).join('\n') + '\n...';
  }
  return f;
}

function formatArray(value, depth = 0) {
  if (depth > 2) return '[...]';

  let limit = depth == 1 ? 3 : 10;

  if (value.length > limit) {
    value = value.slice(0, limit);
    value.push('...');
  }

  return '[' + value.map(v => format(v, depth + 1)).join(', ') + ']';
}

function formatString(value, depth = 0) {
  let limit = depth == 1 ? 20 : 60;

  if (value.length > limit) {
    value = value.slice(0, value.limit - 1) + '…';
  }

  return `"${value}"`;
}

function formatObject(value, depth = 0) {
  let name = value.constructor.name;

  if (name == 'Object' && value[Symbol.toStringTag]) {
    name = value[Symbol.toStringTag];
  }

  if (name != 'Object' && value.toString != Object.prototype.toString) {
    return value.toString();
  }

  let result = '';

  if (name != 'Object') {
    result += name + ' ';
  }
  
  result += '{';

  if (depth > 1) {
    result += '...';
  } else {
    let items = [];
    for(let prop in value) {
      if (!value.hasOwnProperty(prop)) continue;
      items.push(`${prop}: ${format(value[prop], depth + 1)}`);
    }
    result += items.join(', ');
  }

  result += '}';

  return result;
}