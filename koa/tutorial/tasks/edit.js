let path = require('path');
let log = require('engine/log')();
let config = require('config');

let TutorialTree = require('../models/tutorialTree');
let url = require('url');
let execSync = require('child_process').execSync;

module.exports = async function() {

  let args = require('yargs')
    .usage("tutorial url is required.")
    .example("gulp tutorial:edit --url http://javascript.local/memory-leaks-jquery")
    .demand(['url'])
    .argv;

  let urlPath = url.parse(args.url).pathname.split('/').filter(Boolean);

  await TutorialTree.instance().loadFromCache();

  if (urlPath.length === 1) {
    let article = TutorialTree.instance().bySlug(urlPath[0]);
    if (!article) {
      console.log("Not found!");
      return;
    }

    let weight = article.weight + '';

    let dirName = weight + '-' + article.slug;
    let cmd = "find '" + config.tutorialRoot + "' -path '*" + dirName + "/article.md'";
    console.log(cmd);

    let result = execSync(cmd, {encoding: 'utf8'}).trim();

    if (!result) {
      return;
    }

    console.log(path.dirname(result));
    execSync('a -n ' + result);
  }

  if (urlPath[0] == 'task') {
    let task = TutorialTree.instance().bySlug(urlPath[1]);
    if (!task) {
      return;
    }

    let dirName = task.weight + '-' + task.slug;
    let result = execSync("find '" + args.root + "' -path '*/" + dirName + "/task.md'", {encoding: 'utf8'}).trim();

    if (!result) {
      return;
    }

    console.log(path.dirname(result));
    execSync('a -n ' + result + ' ' + result.replace('task.md', 'solution.md'));
  }
};
