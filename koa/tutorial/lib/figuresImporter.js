const util = require('util');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const config = require('config');
const glob = require("glob");
const yaml = require('js-yaml');
const assert = require('assert');
const log = require('engine/log')();
const execSync = require('child_process').execSync;
const SVGO = require('svgo');
const SAX = require('@trysound/sax');
const light2dark = require('client/init/light2dark');

let svgo = new SVGO({
  plugins: [{
    cleanupAttrs: true,
  }, {
    removeDoctype: true,
  },{
    removeXMLProcInst: true,
  },{
    removeComments: true,
  },{
    removeMetadata: true,
  },{
    removeTitle: true,
  },{
    removeDesc: true,
  },{
    removeUselessDefs: true,
  },{
    removeEditorsNSData: true,
  },{
    removeEmptyAttrs: true,
  },{
    removeHiddenElems: true,
  },{
    removeEmptyText: true,
  },{
    removeEmptyContainers: true,
  },{
    removeViewBox: false,
  },{
    cleanupEnableBackground: true,
  },{
    convertStyleToAttrs: true,
  },{
    convertColors: true,
  },{
    convertPathData: true,
  },{
    convertTransform: true,
  },{
    removeUnknownsAndDefaults: true,
  },{
    removeNonInheritableGroupAttrs: true,
  },{
    removeUselessStrokeAndFill: true,
  },{
    removeUnusedNS: true,
  },{
    cleanupIDs: true,
  },{
    cleanupNumericValues: true,
  },{
    moveElemsAttrsToGroup: true,
  },{
    moveGroupAttrsToElems: true,
  },{
    collapseGroups: true,
  },{
    removeRasterImages: false,
  },{
    mergePaths: true,
  },{
    convertShapeToPath: true,
  },{
    sortAttrs: true,
  }/*,{
    removeDimensions: true,
  }*/
  /*,{  // removes colors
    removeAttrs: {attrs: '(stroke|fill)'},
  }*/]
});

// TODO: use htmlhint/jslint for html/js examples

// png to svg
// export NODE_LANG=ru
// 1. Replace png->svg in tutorial glp engine:koa:tutorial:pngToSvg
// 2. Update new svgs glp engine:koa:tutorial:figuresImport
// 3. Get image.yaml glp engine:koa:tutorial:imageYaml
// 4. Update translation
// 5. Reimport: glp engine:koa:tutorial:figuresImport


module.exports = class FiguresImporter {
  constructor(options) {
    this.sketchtool = options.sketchtool || '/Applications/Sketch.app/Contents/Resources/sketchtool/bin/sketchtool';

    this.root = fs.realpathSync(options.root);
    this.figuresFilePath = options.figuresFilePath;
  }

  async syncFigures() {

    if (!fs.existsSync(this.sketchtool)) {
      log.info("No sketchtool");
      return;
    }

    let outputDir = path.join(config.tmpRoot, 'sketchtool');

    fse.removeSync(outputDir);
    fse.mkdirsSync(outputDir);

    let artboardsByPages = JSON.parse(execSync(this.sketchtool + ' list artboards "' + this.figuresFilePath + '"', {
      encoding: 'utf-8'
    }));

    let artboards = artboardsByPages
      .pages
      .reduce(function (prev, current) {
        return prev.concat(current.artboards);
      }, []);

    let svgIds = [];
    let pngIds = [];
    let artboardsExported = [];

    for (let i = 0; i < artboards.length; i++) {
      let artboard = artboards[i];

      // only allow artboards with extensions are exported
      // others are temporary / helpers
      let ext = path.extname(artboard.name).slice(1);
      if (ext === 'png') {
        pngIds.push(artboard.id);
        artboardsExported.push(artboard);
      }
      if (ext === 'svg') {
        svgIds.push(artboard.id);
        artboardsExported.push(artboard);
      }
    }

    // NB: Artboards are NOT trimmed (sketchtool doesn't do that yet)
    execSync(this.sketchtool + ' export artboards "' + this.figuresFilePath + '" ' +
      '--overwriting=YES --trimmed=YES --formats=png --scales=1,2 --output="' + outputDir + '" --items=' + pngIds.join(','), {
      stdio: 'inherit',
      encoding: 'utf-8'
    });

    // NB: Artboards are NOT trimmed (sketchtool doesn't do that yet)
    execSync(this.sketchtool + ' export artboards "' + this.figuresFilePath + '" ' +
      '--overwriting=YES --trimmed=YES --formats=svg --output="' + outputDir + '" --items=' + svgIds.join(','), {
      stdio: 'inherit',
      encoding: 'utf-8'
    });

    {
      // files are exported as array-pop.svg.svg, metric-css.png@2x.png
      // => remove first extension
      let images = glob.sync(path.join(outputDir, '*.*'));

      for (let image of images) {
        // code-style.svg.svg -> code-style.svg
        fs.renameSync(image, image.replace(/.(svg|png)/, ''));
      }
    }

    // Copy exported to tutorial
    let allFigureFilePaths = glob.sync(path.join(this.root, '**/*.{png,svg}'));

    function findArtboardPaths(artboard) {

      let paths = [];
      for (let j = 0; j < allFigureFilePaths.length; j++) {
        if (path.basename(allFigureFilePaths[j]) === artboard.name) {
          paths.push(path.dirname(allFigureFilePaths[j]));
        }
      }

      return paths;
    }

    // copy should trigger folder resync on watch
    // and that's right (img size changed, <img> must be rerendered)

    for (let i = 0; i < artboardsExported.length; i++) {
      let artboard = artboardsExported[i];
      let artboardPaths = findArtboardPaths(artboard);
      if (!artboardPaths.length) {
        log.error("Artboard path not found " + artboard.name);
        continue;
      }

      for (let j = 0; j < artboardPaths.length; j++) {
        let artboardPath = artboardPaths[j];

        log.info("syncFigure move " + artboard.name + " -> " + artboardPath);

        if (path.extname(artboard.name) === '.png') {
          fse.copySync(path.join(outputDir, artboard.name), path.join(artboardPath, artboard.name));
          let x2Name = artboard.name.replace('.png', '@2x.png');
          fse.copySync(path.join(outputDir, x2Name), path.join(artboardPath, x2Name));
        } else if (path.extname(artboard.name) === '.svg') {
          let content = fse.readFileSync(path.join(outputDir, artboard.name), 'utf-8');

          /* was fixed in firefox
          if (content.includes('letter-spacing="')) {
            log.error("Bad svg", path.join(outputDir, artboard.name));
            throw new Error("SVG with letter-spacing not supported by Firefox");
          }*/

          content = content.replace(/(?<=<svg.*>)/, `
            <defs>
              <style>
              @import url('https://fonts.googleapis.com/css?family=Open+Sans:bold,italic,bolditalic%7CPT+Mono');
              @font-face {
                font-family: 'PT Mono';
                font-weight: bold;
                font-style: normal;
                src: local('PT MonoBold'),
                        url('/font/PTMonoBold.woff2') format('woff2'),
                        url('/font/PTMonoBold.woff') format('woff'),
                        url('/font/PTMonoBold.ttf') format('truetype');
              }
              </style>
            </defs>
          `);

          ({data: content} = await svgo.optimize(content));

          const sax = SAX.parser(true, {
            trim: false,
            normalize: false,
            xmlns: true,
            position: true
          });

          function checkColor(color) {
            if (color.startsWith('url(')) return;
            color = normalizeColor(color);
            // console.log(`Check color ${color}`);
            if (!light2dark[color]) {
              console.error(`No color mapping for ${color} at ${sax.line}:${sax.column}`, path.join(artboardPath, artboard.name));
            }
          }

          sax.onattribute = ({name, value}) => {
            if (value == 'none') return;
            if (name == 'fill' || name == 'stroke') {
              checkColor(value);
            }

            if (name == 'style') {
              let colors = value.match(/(?<=[ "':])\#[a-z0-9]+/ig);
              for(let color of colors) {
                checkColor(color);
              }
            }
          };


          sax.write(content).close();

          // console.log(content);

          fs.writeFileSync(path.join(artboardPath, artboard.name), content);

        } else {
          fse.copySync(path.join(outputDir, artboard.name), path.join(artboardPath, artboard.name));
        }
      }

    }


  };
};

// #abc -> #aabbcc
function normalizeColor(color) {
  if (color[0] == '#' && color.length == 4) {
    let letters = color.slice(1).split('');
    color = '#' + letters[0] + letters[0] +letters[1] +letters[1] + letters[2] + letters[2];
  }
  return color.toLowerCase();
}