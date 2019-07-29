const fs = require('fs');
const path = require('path');
const log = require('engine/log')();
const execSync = require('child_process').execSync;

module.exports = function pixelWidth({text, font, size}) {
  let fontPath = path.join(__dirname, `../resources/${font}.ttf`);
  if (!fs.existsSync(fontPath)) {
    throw new Error("No font: " + fontPath);
  }
  let result = execSync(`convert -debug annotate xc: -font ${fontPath} -pointsize ${size} -annotate 0 "${text.replace(/"/g, '\\"')}" null: 2>&1`, {
    encoding: 'utf-8'
  });

  if (result.includes('unable to read font')) {
    throw new Error(result);
  }

  let width = result.match(/^\s+Metrics:.*?width: (\d+)/m);

  width = width && width[1];
  width = +width;

  if (!width) {
    throw new Error("No width in output: " + result);
  }

  return width;
};


