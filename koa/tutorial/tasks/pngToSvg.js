let fs = require('fs-extra');
let path = require('path');
let config = require('config');
const util = require('util');
const glob = util.promisify(require('glob'));
let log = require('engine/log')();
const execSync = require('child_process').execSync;

function loadFiles() {
  let filePaths = glob.sync(`${config.tutorialRoot}/**/*.*`);
  let files = Object.create(null);
  for(let filePath of filePaths) {
    files[filePath] = filePath.match(/\.(md|html|svg)$/) ? fs.readFileSync(filePath, 'utf-8') : true;
  }
  return files;
}

// Get all strings from image
module.exports = async function() {

  let args = require('yargs')
    .usage('NODE_LANG=en glp engine:koa:tutorial:pngToSvg')
    .argv;

  let sketchTool = '/Applications/Sketch.app/Contents/Resources/sketchtool/bin/sketchtool';

  let figuresFilePath = process.env.FIGURES_ROOT || path.join(config.tutorialRoot, 'figures.sketch');

  let artboardsByPages = JSON.parse(execSync(`${sketchTool} list artboards ${figuresFilePath}`, {
    encoding: 'utf-8'
  }));

  let artboards = artboardsByPages
    .pages
    .reduce(function (prev, current) {
      return prev.concat(current.artboards);
    }, []);

  artboards = artboards.filter(a => a.name.endsWith('.svg'));

  let svgsDir = path.join(config.tmpRoot, 'svgs');
  fs.emptyDirSync(svgsDir);
  execSync(`${sketchTool} export artboards "${figuresFilePath}" --overwriting=YES --trimmed=YES --formats=svg --output="${svgsDir}" --items=${artboards.map(a => a.id).join(',')}`, {
    stdio: 'inherit',
    encoding: 'utf-8'
  });

  console.log("Got artboards list");


  for(let artboard of artboards) {
    if (!artboard.name.endsWith('.svg')) continue;

    let existingSvgs = glob.sync(`${config.tutorialRoot}/**/${artboard.name}`);
    for (let old of existingSvgs) {
      fs.copySync(path.join(svgsDir, artboard.name + '.svg'), old);
    }
  }

  console.log("Replaced old svgs");




  let files = loadFiles();
  console.log("Loaded whole tutorial");

  for(let artboard of artboards) {
    let name = artboard.name.slice(0, -4);

    let pngFiles = [];
    for(let filePath in files) {
      if(filePath.endsWith(`/${name}.png`)) {
        pngFiles.push(filePath);
      }
    }

    for(let pngFile of pngFiles) {
      console.log(`Image ${pngFile}`);
      fs.unlinkSync(pngFile);
      try {
        fs.unlinkSync(pngFile.replace('.png', '@2x.png'));
      } catch(e) {}

      fs.copySync(path.join(svgsDir, artboard.name + '.svg'), path.join(path.dirname(pngFile), artboard.name));
    }

    for(let [filePath, content] of Object.entries(files)) {
      if (content === true) continue;
      let replaced = content.replace(new RegExp(name + '.png', 'g'), `${name}.svg`);
      if (content !== replaced) {
        console.log(`Replace in ${filePath}`, `${name}.png`, `${name}.svg`);
        files[filePath] = replaced;
        fs.writeFileSync(filePath, replaced);
      }
    }

  }

  files = loadFiles();
  console.log("Reloaded whole tutorial");

  console.log("Deleting unused images");

  // Delete unused images
  let allImagePaths = Object.keys(files).filter(p => p.endsWith('.svg') || p.endsWith('.png'));

  for(let image of allImagePaths) {
    let used = false;
    for(let filePath in files) {
      // console.log("Looking for", image, filePath);
      let content = files[filePath];
      if (content === true) continue;
      if (content.includes(path.basename(image).replace('@2x', ''))) {
        used = true;
        break;
      }
    }
    if (!used) {
      console.log("Unused image, deleting", image);
      fs.unlinkSync(image);
    }
  }


};


