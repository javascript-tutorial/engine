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

// TODO: use htmlhint/jslint for html/js examples

module.exports = class FiguresImporter {
  constructor(options) {
    this.sketchtool = options.sketchtool || '/Applications/Sketch.app/Contents/Resources/sketchtool/bin/sketchtool';

    this.root = fs.realpathSync(options.root);
    this.figuresFilePath = options.figuresFilePath;

    let imageTranslationsPath = path.join(this.root, 'images.yml');
    if (fs.existsSync(imageTranslationsPath)) {
      this.translations = yaml.safeLoad(fs.readFileSync(imageTranslationsPath, 'utf8'));
    } else {
      this.translations = Object.create(null);
    }

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


    // apply translations to SVG
    let images = glob.sync('**/*.svg', {cwd: outputDir});

    for(let image of images) {
      let translation = this.translations[path.basename(image)];
      if (!translation) {
        continue;
      }

      let content = fs.readFileSync(path.join(outputDir, image), 'utf-8');

      let translatedContent = content.replace(/(<tspan.*?x=")(.*?)(".*?>)(.*?)(?=<\/tspan>)/g, (match, part1, x, part2, text) => {
        if (!translation[text]) {
          // no such translation
          return match;
        }

        let translated = translation[text];

        if (typeof translated == 'string') {
          // replace text
          return part1 + x + part2 + translated;
        }

        assert(typeof translated == 'object');

        if (translated.x) {
          x = +x + +translated.x;
        }
        return part1 + x + part2 + translated.text;
      });

      log.debug("translated file", image);
      fs.writeFileSync(path.join(outputDir, image), translatedContent);
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
        fse.copySync(path.join(outputDir, artboard.name), path.join(artboardPath, artboard.name));
        if (path.extname(artboard.name) === '.png') {
          let x2Name = artboard.name.replace('.png', '@2x.png');
          fse.copySync(path.join(outputDir, x2Name), path.join(artboardPath, x2Name));
        }
      }

    }


  };
};
