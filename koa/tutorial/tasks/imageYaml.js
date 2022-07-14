let fs = require('mz/fs');
let path = require('path');
let config = require('config');
const util = require('util');
const glob = util.promisify(require('glob'));
let log = require('engine/log')();
const yaml = require('js-yaml');
const Entities = require('html-entities').XmlEntities;

const entities = new Entities();


async function getImageYaml(imageFile) {
  let content = await fs.readFile(imageFile, 'utf-8');

  let name = path.basename(imageFile);
  let tspans = Array.from(content.matchAll(/<tspan.*?>(.*?)<\/tspan>/g));

  let obj = {
    [name] : Object.create(null)
  };

  for(let match of tspans) {
    if (!match) continue; // empty strings sometimes
    let text = entities.decode(match[1]);
    obj[name][text] = "";
  }

  return obj;
}


// Get all strings from image
module.exports = async function() {

  let args = require('yargs')
    .usage('NODE_LANG=en glp engine:koa:tutorial:imageYaml --image try-catch-flow')
    .argv;


  console.log(`Searching in tutorial ${config.tutorialRoot}`);

  let imageFiles;
  if (args.image) {
    console.log(`Processing image ${args.image}`);
    let image = args.image.endsWith('.svg') ? args.image : (args.image + '.svg');

    imageFiles = await glob(`${config.tutorialRoot}/**/${image}`);

    if (!imageFiles.length) {
      throw new Error("No such image");
    }

    if (imageFiles.length > 1) {
      throw new Error("Too many such images");
    }
  } else {
    console.log("Processing all images");

    imageFiles = await glob(`${config.tutorialRoot}/**/*.svg`);

  }


  let results = Object.create(null);
  for(let imageFile of imageFiles) {
    let stringsObj = await getImageYaml(imageFile);
    Object.assign(results, stringsObj);
  }

  let output = [];
  for(let key in results) {
    output.push(yaml.dump({[key]: results[key]}, {forceQuotes: true}));
  }

  console.log(output.join('\n'));

};
