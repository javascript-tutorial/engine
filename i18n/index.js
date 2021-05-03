const log = require('engine/log')();
const path = require('path');
const fs = require('fs');
const glob = require('glob');
let yaml = require('js-yaml');

let t = require('./t');

let docs = {};

t.requireHandlerLocales = function () {

  let translationPath = path.join(config.projectRoot, 'locales');

  if (fs.existsSync(path.join(translationPath, config.lang + '.yml'))) {
    translationPath = path.join(translationPath, config.lang + '.yml');
  } else {
    translationPath = path.join(translationPath, 'en.yml');
  }

  let doc = yaml.load(fs.readFileSync(translationPath, 'utf-8'));

  t.i18n.add('', doc);

  for (let handlerName in config.handlers) {
    let handlerPath = config.handlers[handlerName].path;
    let localesPath = path.join(handlerPath, 'locales');
    if (!fs.existsSync(localesPath)) continue;

    this.requirePhrase(handlerPath);
  }

};


t.requirePhrase = function (moduleName) {

  // if same doc was processed - don't redo it
  if (docs[moduleName]) {
    return;
  }

  docs[moduleName] = true;

  let localesPath = path.join(path.dirname(require.resolve(moduleName)), 'locales');


  let packageDirs = glob.sync('**/', {cwd: localesPath});

  let translationPath;

  for(let packageDir of packageDirs) {

    if (fs.existsSync(path.join(localesPath, packageDir, config.lang + '.yml'))) {
      translationPath = path.join(localesPath, packageDir, config.lang + '.yml');
    } else {
      translationPath = path.join(localesPath, packageDir, 'en.yml');
    }

    let doc = yaml.load(fs.readFileSync(translationPath, 'utf-8'));
    let name = path.basename(moduleName) + '.' + packageDir.slice(0, -1).replace(/\//g, '.');

    t.i18n.add(name, doc);
  }

  // require locales/en.yml
  translationPath = null;

  if (fs.existsSync(path.join(localesPath, config.lang + '.yml'))) {
    translationPath = path.join(localesPath, config.lang + '.yml');
  } else if (fs.existsSync(path.join(localesPath, 'en.yml')))  {
    translationPath = path.join(localesPath, 'en.yml');
  }

  if (translationPath) {
    let doc = yaml.load(fs.readFileSync(translationPath, 'utf-8'));

    t.i18n.add(path.basename(moduleName), doc);
  }

};

let config = require('config');

module.exports = t;
