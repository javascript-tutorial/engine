const fs = require('fs');
const path = require('path');
const lang = require('config').lang;
const config = require('config');

function tryPaths(roots, filename) {

  let paths = [
    `${filename}.${lang}`,
    `${filename}.${lang}.pug`,
    `${filename}`,
    `${filename}.pug`,
    `${filename}/index.${lang}.pug`,
    `${filename}/index.pug`,
  ];

  for(let root of roots) {
    for (let tryPath of paths) {
      let p = path.join(root, tryPath);
      if (fs.existsSync(p) && !fs.statSync(p).isDirectory()) {
        return p;
      }
    }
  }

  return null;
}

module.exports = function(filename, source, loadOptions) {
  filename = filename.replace(/\.pug$/, '');

  // console.log("RESOLVE", filename, source);
  if (filename[0] === '~') {
    filename = filename.slice(1);
    let paths = require.resolve.paths(filename);
    let resolved = tryPaths(paths, filename);
    if (!resolved) {
      throw new Error(`Pug file ${filename} from ${source} not resolved`);
    }
    return resolved;
  }

  if (filename[0] === '/') {
    let result = tryPaths([loadOptions.useAbsoluteTemplatePath ? '/' : loadOptions.basedir], filename);
    if (!result) {
      throw new Error(`Pug file ${filename} not resolved`);
    }
    return result;
  }


  let roots = [];
  if (source) {
    roots.push(path.dirname(source));
  } else {
    roots.push(config.projectRoot);
  }
  if (loadOptions && loadOptions.roots) roots.push(...loadOptions.roots);
  let result = tryPaths(roots, filename);
  if (!result) {
    throw new Error(`Pug file ${filename} from ${source || 'code'} not resolved`);
  }
  return result;
};
