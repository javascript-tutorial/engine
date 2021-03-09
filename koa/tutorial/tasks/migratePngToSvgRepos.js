let fs = require('mz/fs');
let path = require('path');
let config = require('config');
const util = require('util');
const glob = util.promisify(require('glob'));
let log = require('engine/log')();
const execSync = require('child_process').execSync;

// Get all strings from image
module.exports = async function() {

  for(let lang of config.langs) {
    console.log("LANG", lang.code);
    let root = `/js/javascript-nodejs/repo/${lang.code}.javascript.info`;
    let figuresRoot = '/js/javascript-nodejs/repo/en.javascript.info/figures.sketch';

    execSync(`git reset --hard`, {cwd: root, stdio: 'inherit'});
    execSync(`git clean -df`, {cwd: root, stdio: 'inherit'});
    execSync(`git pull origin master`, {cwd: root, stdio: 'inherit'});

    execSync(`NODE_LANG=${lang.code} NODE_ENV=production FIGURES_ROOT=${figuresRoot} TUTORIAL_ROOT=${root} npm run gulp engine:koa:tutorial:pngToSvg`, {
      stdio: 'inherit'
    });

    try {
      await execSync('git diff-index --quiet HEAD', {cwd: root, stdio: 'inherit'});
      console.log("Already done");
    } catch (e) {
      if (e.status === 1) {
        execSync(`git add -A`, {cwd: root, stdio: 'inherit'});

        execSync(`git commit -m "Move images PNG to SVG"`, {cwd: root, stdio: 'inherit'});
        execSync(`git push origin master`, {cwd: root, stdio: 'inherit'});
      } else {
        throw e;
      }
    }

  }


};


