let path = require('path');
let yaml = require('js-yaml');
let en = require('../migrateRu/en').bySlugMap;
let ruOld =  require('../migrateRu/ruOld').bySlugMap;
let ruNew =  require('../migrateRu/ruNew').bySlugMap;
let log = require('engine/log')();
let assert = require('assert');
let fs = require('fs-extra');
let glob = require('glob');
let rootNew = '/js/ru.javascript.info';
let rootOld = '/js/javascript-tutorial-ru';
let config = require('config');
let migrate = yaml.load(fs.readFileSync(path.join(__dirname, '../migrateRu/migrate.yml'), 'utf-8'));

let articlesNew = findEntries(rootNew, 'article');
let articlesOld = findEntries(rootOld, 'article');

let disqusExportFile = config.lang === 'en' ?
  'javascriptinfo-2019-07-05T20_11_09.014112-links.csv' :
  'learnjavascriptru-2019-07-05T20_11_23.960543-links.csv';

let disqus = readDisqus(disqusExportFile);

let result = Object.create(null);
function junk(url) {
  result[url] = `${config.urlBaseProduction.main}deleted`;
}
function redirect(from, to) {
  result[from] = `${config.urlBaseProduction.main}${to == '/' ? '' : to}`;
}


module.exports = async function() {

  let {stay, move, archiveNoReplacement, archive} = migrate;
  archive.push(...archiveNoReplacement);

  let moveMap = Object.create(null);
  // For move - ensure we have it in both tuts
  for(let slugs of move) {
    let [from, to] = slugs.split(' ');
    to = to.replace(/#.*/, '');
    moveMap[from] = to;
  }

  for(let disqusUrl of disqus) {
    let url = disqusUrl
      .replace('http://javascript', 'https://javascript')
      .replace('http://learn.javascript', 'https://learn.javascript');

    url = url.replace(/\?.*/, '');

    if (!url.startsWith(config.urlBaseProduction.main.href)) {
      junk(disqusUrl);
      continue;
    }

    let urlPath = url.slice(config.urlBaseProduction.main.href.length);
    if (urlPath.startsWith('node/')) {
      junk(disqusUrl);
      continue;
    }

    if (!urlPath) {
      redirect(disqusUrl, '/');
      continue;
    }

    if (moveMap[urlPath]) {
      redirect(disqusUrl, moveMap[urlPath]);
    }

    redirect(disqusUrl, urlPath);

  }

  if (config.lang === 'en') {
    redirect('https://javascript.info/fetch-basics', 'fetch');
  }

  let content = '';
  for(let [from, to] of Object.entries(result)) {
    content += `${from}, ${to}\n`;
  }
  content = content.trim();

  console.log("Writing to ",disqusExportFile.replace('.csv', '.result.csv'));
  fs.writeFileSync(path.join(__dirname, disqusExportFile.replace('.csv', '.result.csv')), content);



};

function readDisqus(fileName) {
  return fs.readFileSync(path.join(__dirname, fileName),'utf-8').trim().split('\n').map(l => l.trim());
}

function findEntries(root, type) {
  let articles = glob.sync(`**/`, {cwd: root});
  articles = articles.filter(path => path.match(/^\d+-/));

  articles = articles.filter(path => fs.existsSync(root + '/' + path + `${type}.md`));
  articles = articles.map(path => path.replace(/\/$/, ''));

  let obj = Object.create(null);
  for(let article of articles) {
    obj[article.split('/').pop().replace(/^\d+-/, '')] = article;
  }

  return obj;
}
