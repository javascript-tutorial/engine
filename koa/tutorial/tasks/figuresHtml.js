let fse = require('fs-extra');
let path = require('path');
let log = require('engine/log')();
let config = require('config');
let glob = require('glob');

module.exports = async function() {

  let root = fse.realpathSync(config.tutorialRoot);

  let images = glob.sync('**/*.svg', {cwd: root});
  console.log(images);

  let outputRoot = path.join(config.tmpRoot, 'figures-html');

  fse.emptyDirSync(outputRoot);

  let html = `<!doctype html><style>
  img { display: inline-block; margin: 10px }
  </style>`;

  for(let image of images) {
    let imageFilename = path.basename(image);
    fse.copyFileSync(path.join(root, image), path.join(outputRoot, imageFilename));
    html += `<img src="${imageFilename}">\n`;
  }

  fse.writeFileSync(path.join(outputRoot, 'white.html'), html);

};
