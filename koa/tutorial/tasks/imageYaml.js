let fs = require('mz/fs');
let path = require('path');
let config = require('config');
const util = require('util');
const glob = util.promisify(require('glob'));
let log = require('engine/log')();

// Left-pad translations with spaces if needed to make them "wide enough"
module.exports = async function() {

  let args = require('yargs')
    .usage('NODE_LANG=en glp engine:koa:tutorial:imageYaml --image try-catch-flow')
    .demand(['image'])
    .argv;

  let image = args.image.endsWith('.svg') ? args.image : (args.image + '.svg');

  let imageFile = await glob(`${config.tutorialRoot}/**/${image}`);

  if (!imageFile.length) {
    throw new Error("No such image");
  }

  if (imageFile.length > 1) {
    throw new Error("Too many such images");
  }

  imageFile = imageFile[0];

  let content = await fs.readFile(imageFile, 'utf-8');

  let tspans = Array.from(content.matchAll(/<tspan.*?>(.*?)<\/tspan>/g));

  console.log(`${image}:`);

  for(let match of tspans) {
    if (!match) continue; // empty strings sometimes
    console.log(`  "${match[1].replace(/"/g,'\\"')}": ""`);
  }
};


