let path = require('path');
let yaml = require('js-yaml');
let en = require('./en').bySlugMap;
let ruOld =  require('./ruOld').bySlugMap;
let ruNew =  require('./ruNew').bySlugMap;
let log = require('engine/log')();
let assert = require('assert');
let fs = require('fs-extra');
let glob = require('glob');
let rootNew = '/js/ru.javascript.info';
let rootOld = '/js/javascript-tutorial-ru';
let migrate = yaml.load(fs.readFileSync(path.join(__dirname, 'migrate.yml'), 'utf-8'));

let articlesNew = findEntries(rootNew, 'article');
let articlesOld = findEntries(rootOld, 'article');

module.exports = async function() {

  // all ok with map-set and fetch, urls are same

  let {stay, move, archiveNoReplacement, archive} = migrate;
  archive.push(...archiveNoReplacement);

  // For stay - ensure we have it in both tuts
  for(let slug of stay) {
    assert(ruNew[slug]);
    assert(ruOld[slug]);
  }

  // For move - ensure we have it in both tuts
  for(let slugs of move) {
    let [from, to] = slugs.split(' ');
    to = to.replace(/#.*/, '');
    console.log(`${from} -> ${to}`);
    assert(ruNew[to]);
    assert(ruOld[from]);
  }
  // For archive - ensure we have it in old tut
  for(let slug of archive) {
    console.log(slug);
    assert(ruOld[slug]);
  }

  fs.ensureDirSync(`${rootNew}/99-archive`);
  fs.emptyDirSync(`${rootNew}/99-archive`);
  fs.writeFileSync(`${rootNew}/99-archive/index.md`, '# Архив\n');

  let counter = 1;

  for(let slugs of move) {
    let [from, to] = slugs.split(' ');
    to = to.replace(/#.*/, '');

    console.log(`${rootOld}/${articlesOld[from]}`, `${rootNew}/99-archive/${String(counter).padStart(3, 0)}-${from}`);
    fs.copySync(`${rootOld}/${articlesOld[from]}`, `${rootNew}/99-archive/${String(counter).padStart(3, 0)}-${from}`);
    counter++;
  }

  for(let from of archive) {
    console.log(`${rootOld}/${articlesOld[from]}`, `${rootNew}/99-archive/${String(counter).padStart(3, 0)}-${from}`);
    fs.copySync(`${rootOld}/${articlesOld[from]}`, `${rootNew}/99-archive/${String(counter).padStart(3, 0)}-${from}`);
    counter++;
  }

  let tasks = findEntries(`${rootNew}/99-archive`, 'task');
  for(let slug in tasks) {
    let taskPath = tasks[slug];
    if (ruNew[slug]) {
      // there's same-named task in new tutorial
      console.log(`Remove same-slug task ${rootNew}/99-archive/${taskPath}`);
      fs.removeSync(`${rootNew}/99-archive/${taskPath}`);
    }
  }


  let articles = findEntries(`${rootNew}/99-archive`, 'article');

  for(let slug of archive) {
    console.log(slug, articles[slug]);
    let articlePath = `${rootNew}/99-archive/${articles[slug]}/article.md`;
    let content = fs.readFileSync(articlePath, 'utf-8');
    content = processContent(articlePath, content, null);
  }

  for(let slugs of move) {
    let [from, to] = slugs.split(' ');
    console.log(from, articles[from]);
    let articlePath = `${rootNew}/99-archive/${articles[from]}/article.md`;
    let content = fs.readFileSync(articlePath, 'utf-8');
    content = processContent(articlePath, content, to);
  }


};

function processContent(articlePath, content, ref = null) {
  content = content
    .replace(/Полифилл/g, 'Полифил')
    .replace(/полифилл/g, 'полифил')
    .replace(/Коллбэк/g, 'Колбэк')
    .replace(/коллбэк/g, 'колбэк');

  if (content.match(/^---/m)) {
    console.log("Has YAML", articlePath);
    content = `archive:\n  ref: ${ref}\n${content}`;
    fs.writeFileSync(articlePath, content);
  } else {
    content = `archive:\n  ref: ${ref}\n\n---\n\n${content}`;
    fs.writeFileSync(articlePath, content);
  }
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
