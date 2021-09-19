const util = require('util');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const config = require('config');
const glob = require("glob");
const yaml = require('js-yaml');
const assert = require('assert');
const log = require('engine/log')();
const request = require('request-promise');

let req = request.defaults({
  headers: {
    'X-FIGMA-TOKEN': config.figma.accessToken
  },
  json:    true
});


// TODO: use htmlhint/jslint for html/js examples

module.exports = class FigmaImporter {
  constructor(options) {
    let imageTranslationsPath = path.join(config.tutorialRoot, 'images.yml');
    if (fs.existsSync(imageTranslationsPath)) {
      this.translations = yaml.load(fs.readFileSync(imageTranslationsPath, 'utf8'));
    } else {
      this.translations = Object.create(null);
    }
  }

  async syncFigures() {

    let outputDir = path.join(config.tmpRoot, 'figma');

    fse.removeSync(outputDir);
    fse.mkdirsSync(outputDir);

    let {document} = await req(`https://api.figma.com/v1/files/${config.figma.tutorialDocumentKey}?depth=2`);

    let ids = Object.create(null);
    for (let page of document.children) {
      for (let frame of page.children) {
        if (frame.name.endsWith('.svg') && frame.name[0] !== '-') {
          ids[frame.id] = frame.name;
        }
      }
    }

    console.log(ids);
    
    let idsString = Object.keys(ids).join(',');

    let url = `https://api.figma.com/v1/images/${config.figma.tutorialDocumentKey}?format=svg&ids=` + idsString;
    log.debug(url);

    let result = await req(url);

    if (result.err) {
      log.error(result);
      throw new Error("Error in result");
    }

    console.log(result);

    let jobs = [];
    let nameByNumber = [];
    for (let [id, url] of Object.entries(result.images)) {
      nameByNumber.push(ids[id]);
      jobs.push(request(url));
    }

    let exportedImages = await Promise.all(jobs);

    for (let i=0; i<exportedImages.length; i++) {
      let imagePath = path.join(outputDir, nameByNumber[i]);
      if (fs.existsSync(imagePath)) {
        throw new Error("Figma image already exists: " + imagePath);
      }
      console.log(imagePath);
      fs.writeFileSync(imagePath, exportedImages[i]);
    }
  }
};
