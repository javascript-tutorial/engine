let fs = require('mz/fs');
let path = require('path');
let config = require('config');
const util = require('util');
const glob = util.promisify(require('glob'));
let log = require('engine/log')();
const execSync = require('child_process').execSync;

// Get all strings from image
module.exports = async function() {

  let args = require('yargs')
    .usage('NODE_LANG=en glp engine:koa:tutorial:pngToSvg')
    .argv;

  let artboardsByPages = JSON.parse(execSync(`/Applications/Sketch.app/Contents/Resources/sketchtool/bin/sketchtool list artboards ${config.tutorialRoot}/figures.sketch`, {
    encoding: 'utf-8'
  }));

  let artboards = artboardsByPages
    .pages
    .reduce(function (prev, current) {
      return prev.concat(current.artboards);
    }, []);

  artboards = artboards.filter(a => a.name.endsWith('.svg'));

  for(let artboard of artboards) {
    let name = artboard.name.slice(0, -4);
    let pngFile = await glob(`${config.tutorialRoot}/**/${name}.png`);

    if (pngFile.length) {
      pngFile = pngFile[0];
      console.log(`Image ${pngFile}`);
      fs.unlinkSync(pngFile);
      fs.unlinkSync(pngFile.replace('.png', '@2x.png'));
      fs.writeFileSync(pngFile.replace('.png', '.svg'), '');
    }

    let files = await glob(`${config.tutorialRoot}/**/*.md`);
    for(let file of files) {
      let content = fs.readFileSync(file, 'utf-8');
      let replaced = content.replace(`${name}.png`, `${name}.svg`);
      if (content !== replaced) {
        console.log(`Replace in ${file}`);
        fs.writeFileSync(file, replaced);
      }
    }




  }

  console.log("Done, now please call figuresImport task to fill SVGs!");
};


