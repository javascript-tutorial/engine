const fs = require('fs-extra');
const path = require('path');
const config = require('config');
const glob = require('util').promisify(require('glob'));
const mime = require('mime');
const Article = require('../models/article');
const Task = require('../models/task');
const log = require('engine/log')();

const TutorialTree = require('../models/tutorialTree');
const TutorialView = require('../models/tutorialView');
const TutorialViewStorage = require('../models/tutorialViewStorage');
const getPlunkerToken = require('engine/plunk').getPlunkerToken;
const TutorialParser = require('./tutorialParser');
const stripTitle = require('engine/markit').stripTitle;
const stripYamlMetadata = require('engine/markit').stripYamlMetadata;

const t = require('engine/i18n');

const execa = require('execa');

module.exports = class TutorialImporter {
  constructor(options) {
    this.root = fs.realpathSync(options.root);
    this.parserDryRunEnabled = options.parserDryRunEnabled;
    this.onchange = options.onchange || function () {};
    this.tree = TutorialTree.instance();
  }

  /*
  update=false => removes old entry and re-imports
  update=true => doesnn't remove anything, for adding only (checks for dupe slugs)
   */
  async sync(directory, update = false) {

    if (process.env.PLNKR_ENABLED && !this.plunkerToken) {
      this.plunkerToken = await getPlunkerToken();
    }

    log.info("sync", directory);
    let dir = fs.realpathSync(directory);

    let type;
    while (true) {
      console.log(dir, this.root);
      if (dir.endsWith('.view') && !dir.endsWith('/_js.view')) {
        type = 'View';
        break;
      }
      if (fs.existsSync(path.join(dir, 'index.md'))) {
        type = 'Folder';
        break;
      }
      if (fs.existsSync(path.join(dir, 'article.md'))) {
        type = 'Article';
        break;
      }
      if (fs.existsSync(path.join(dir, 'task.md'))) {
        type = 'Task';
        break;
      }

      dir = path.dirname(dir);

      if (dir === this.root || dir === '/') {
        console.error("Unknown directory type", directory)
        throw new Error("Unknown directory type: " + directory);
      }
    }

    let slug = path.basename(dir).slice(path.basename(dir).indexOf('-') + 1);

    let parentDir = path.dirname(dir);

    let parentSlug = path.basename(parentDir);
    parentSlug = parentSlug.slice(parentSlug.indexOf('-') + 1);

    let parent = this.tree.bySlug(parentSlug);

    if (update) {
      //console.log("DESTROY", slug);
      this.tree.destroyTree(slug);
    }

    await this['sync' + type](dir, parent);

  }

  async syncFolder(sourceFolderPath, parent) {
    log.info("syncFolder", sourceFolderPath);

    const contentPath = path.join(sourceFolderPath, 'index.md');
    let content = fs.readFileSync(contentPath, 'utf-8').trim();

    const folderFileName = path.basename(sourceFolderPath);

    const data = {
      isFolder: true
    };

    if (parent) {
      data.parent = parent.slug;
    }

    data.weight = parseInt(folderFileName);
    data.slug = folderFileName.slice(folderFileName.indexOf('-') + 1);

    //this.tree.destroyTree(data.slug);

    let tmp = stripYamlMetadata(content);

    content = tmp.text;
    let meta = tmp.meta;

    if (meta.libs) data.libs = meta.libs;

    tmp = stripTitle(content);

    data.title = tmp.title;
    content = tmp.text;

    data.content = content;

    if (this.parserDryRunEnabled) {
      let options = {
        staticHost: config.urlBase.static.href.slice(0, -1),
        resourceWebRoot: Article.getResourceWebRootBySlug(data.slug)
      };
      const parser = new TutorialParser(options);

      await parser.parse(content);
    }

    data.githubPath = sourceFolderPath.slice(this.root.length);

    const folder = new Article(data);

    this.tree.add(folder);

    const subPaths = fs.readdirSync(sourceFolderPath);

    for (let subPath of subPaths) {
      if (subPath === 'index.md') continue;

      subPath = path.join(sourceFolderPath, subPath);

      if (fs.existsSync(path.join(subPath, 'index.md'))) {
        await this.syncFolder(subPath, folder);
      } else if (fs.existsSync(path.join(subPath, 'article.md'))) {
        await this.syncArticle(subPath, folder);
      } else {
        await this.syncResource(subPath, folder.getResourceFsRoot());
      }
    }

    this.onchange(folder.getUrl());

  };

  async syncArticle(articlePath, parent) {
    log.info("syncArticle", articlePath);

    const contentPath = path.join(articlePath, 'article.md');
    let content = fs.readFileSync(contentPath, 'utf-8').trim();

    const articlePathName = path.basename(articlePath);

    const data = {
      isFolder: false
    };

    if (parent) {
      data.parent = parent.slug;
    }

    data.weight = parseInt(articlePathName);
    data.slug = articlePathName.slice(articlePathName.indexOf('-') + 1);

    // this.tree.destroyTree(data.slug);

    let tmp = stripYamlMetadata(content);

    content = tmp.text;
    let meta = tmp.meta;

    if (meta.libs) data.libs = meta.libs;

    if (meta.archive) data.archive = meta.archive;

    tmp = stripTitle(content);

    data.title = tmp.title;
    content = tmp.text;

    data.content = content;

    if (this.parserDryRunEnabled) {
      // just make sure it parses
      const options = {
        staticHost: config.urlBase.static.href.slice(0, -1),
        resourceWebRoot: Article.getResourceWebRootBySlug(data.slug),
      };
      const parser = new TutorialParser(options);

      await parser.parse(content);
    }

    data.githubPath = articlePath.slice(this.root.length); // + '/article.md';

    let {stdout} = await execa('git', ['log' ,'-1', '--format=%at', articlePath], {cwd: this.root});

    data.updatedAt = +stdout;

    log.debug(data);

    try {
      data.headJs = fs.readFileSync(path.join(articlePath, 'head.js'), 'utf8');
    } catch (e) {
    }
    try {
      data.headCss = fs.readFileSync(path.join(articlePath, 'head.css'), 'utf8');
    } catch (e) {
    }
    try {
      data.headHtml = fs.readFileSync(path.join(articlePath, 'head.html'), 'utf8');
    } catch (e) {
    }

    const article = new Article(data);
    this.tree.add(article);

    const subPaths = fs.readdirSync(articlePath);

    for (let subPath of subPaths) {
      if (subPath === 'article.md') continue;

      subPath = path.join(articlePath, subPath);

      if (fs.existsSync(path.join(subPath, 'task.md'))) {
        await this.syncTask(subPath, article);
      } else if (subPath.endsWith('.view')) {
        await this.syncView(subPath, article);
      } else {
        // resources
        await this.syncResource(subPath, article.getResourceFsRoot());
      }

    }

    this.onchange(article.getUrl());

  };


  async syncResource(sourcePath, destDir) {
    fs.ensureDirSync(destDir);

    log.debug("syncResource", sourcePath, destDir);

    const stat = fs.statSync(sourcePath);
    const ext = getFileExt(sourcePath);
    const destPath = path.join(destDir, path.basename(sourcePath));

    if (stat.isFile()) {
      if (ext === 'png' || ext === 'jpg' || ext === 'gif' || ext === 'svg') {
        importImage(sourcePath, destDir);
        return;
      }
      copySync(sourcePath, destPath);
    } else if (stat.isDirectory()) {
      fs.ensureDirSync(destPath);
      const subPathNames = fs.readdirSync(sourcePath);
      for (let subPath of subPathNames) {
        subPath = path.join(sourcePath, subPath);
        await this.syncResource(subPath, destPath);
      }

    } else {
      throw new Error("Unsupported file type at " + sourcePath);
    }

  };

  async syncTask(taskPath, parent) {
    log.debug("syncTask", taskPath);

    const contentPath = path.join(taskPath, 'task.md');
    let content = fs.readFileSync(contentPath, 'utf-8').trim();

    const taskPathName = path.basename(taskPath);

    const data = {
      parent: parent.slug
    };

    data.weight = parseInt(taskPathName);
    data.slug = taskPathName.slice(taskPathName.indexOf('-') + 1);

    data.githubPath = taskPath.slice(this.root.length);

    //this.tree.destroyTree(data.slug);

    let tmp = stripYamlMetadata(content);

    content = tmp.text;
    let meta = tmp.meta;

    if (meta.libs) data.libs = meta.libs;
    if (meta.importance) data.importance = meta.importance;
    if (meta.type) data.type = meta.type;
    data.version = meta.version || (data.type ? 2 : 1);

    tmp = stripTitle(content);

    data.title = tmp.title;
    content = tmp.text;

    data.content = content;

    // Solution, no title, no meta
    const solutionPath = path.join(taskPath, 'solution.md');
    const solution = fs.readFileSync(solutionPath, 'utf-8').trim();
    data.solution = solution;

    
    if (this.parserDryRunEnabled) {
      log.debug('parsing content and solution');
      const options = {
        staticHost: config.urlBase.static.href.slice(0, -1),
        resourceWebRoot: Task.getResourceWebRootBySlug(data.slug),
      };

      const parser = new TutorialParser(options);

      await parser.parse(content);
      await parser.parse(solution);
    }

    if (fs.existsSync(path.join(taskPath, '_js.view', 'solution.js'))) {
      data.solutionJs = fs.readFileSync(path.join(taskPath, '_js.view', 'solution.js'), 'utf8');
    }

    log.debug("task data", data);

    if (data.version > 1) {
      data.source = await readdir(path.join(taskPath, 'source'));
      data.solution = await readdir(path.join(taskPath, 'solution'));
      console.log(data);
    }

    const task = new Task(data);
    this.tree.add(task);

    log.debug("task saved");

    const subPaths = fs.readdirSync(taskPath);

    for (let subPath of subPaths) {
      // names starting with _ don't sync
      if (subPath === 'task.md' || subPath === 'solution.md' || subPath[0] === '_') continue;

      subPath = path.join(taskPath, subPath);

      if (subPath.endsWith('.view')) {
        await this.syncView(subPath, task);
      } else {
        await this.syncResource(subPath, task.getResourceFsRoot());
      }
    }

    if (fs.existsSync(path.join(taskPath, '_js.view'))) {
      await this.syncTaskJs(path.join(taskPath, '_js.view'), task);
    }

    this.onchange(task.getUrl());

  };


  async syncView(dir, parent) {

    log.info("syncView: dir", dir);
    let pathName = path.basename(dir).replace('.view', '');
    if (pathName === '_js') {
      throw new Error("Must not syncView " + pathName);
    }

    let webPath = parent.getResourceWebRoot() + '/' + pathName;

    log.debug("syncView webpath", webPath);

    let view = TutorialViewStorage.instance().get(webPath);

    if (view) {
      log.debug("Plunk from db", view);
    } else {
      view = new TutorialView({
        webPath,
        description: "Fork from " + config.urlBaseProduction.main.href
      });
      log.debug("Created new plunk (db empty)", view);
    }

    let filesForPlunk = await TutorialView.readFs(dir);
    log.debug("Files for plunk", filesForPlunk);

    if (!filesForPlunk) return; // had errors

    log.debug("Merging plunk");

    await view.mergeAndSyncPlunk(filesForPlunk, this.plunkerToken);

    log.debug("Plunk merged");

    let dst = path.join(parent.getResourceFsRoot(), pathName);

    fs.ensureDirSync(dst);
    fs.readdirSync(dir).forEach(function(dirFile) {
      copySync(path.join(dir, dirFile), path.join(dst, dirFile));
    });

    TutorialViewStorage.instance().set(webPath, view);
  };


  async syncTaskJs(jsPath, task) {

    log.debug("syncTaskJs", jsPath);

    let sourceJs;

    try {
      sourceJs = fs.readFileSync(path.join(jsPath, 'source.js'), 'utf8');
    } catch (e) {
      sourceJs = "// " + t('tutorial.importer.your_code');
    }

    let testJs;
    try {
      testJs = fs.readFileSync(path.join(jsPath, 'test.js'), 'utf8');
    } catch (e) {
      testJs = "";
    }

    let solutionJs = fs.readFileSync(path.join(jsPath, 'solution.js'), 'utf8');

    // Source
    let sourceWebPath = task.getResourceWebRoot() + '/source';

    let source = makeSource(sourceJs, testJs);

    let sourceView = TutorialViewStorage.instance().get(sourceWebPath);

    if (!sourceView) {
      sourceView = new TutorialView({
        webPath: sourceWebPath,
        description: "Fork from " + config.urlBaseProduction.main.href
      });
      TutorialViewStorage.instance().set(sourceWebPath, sourceView);
    }

    let sourceFilesForView = [{
      content:  source,
      filename: 'index.html'
    }];

    if (testJs) {
      sourceFilesForView.push({
        content:  testJs.trim(),
        filename: 'test.js'
      });
    }

    log.debug("save plunk for", sourceWebPath);

    await sourceView.mergeAndSyncPlunk(sourceFilesForView, this.plunkerToken);

    // Solution
    let solutionWebPath = task.getResourceWebRoot() + '/solution';

    let solution = makeSolution(solutionJs, testJs);

    let solutionView = TutorialViewStorage.instance().get(solutionWebPath);

    if (!solutionView) {
      solutionView = new TutorialView({
        webPath:     solutionWebPath,
        description: "Fork from " + config.urlBaseProduction.main.href
      });
      TutorialViewStorage.instance().set(solutionWebPath, solutionView);
    }

    let solutionFilesForView = [{
      content:  solution,
      filename: 'index.html'
    }];

    if (testJs) {
      solutionFilesForView.push({
        content:  testJs.trim(),
        filename: 'test.js'
      });
    }

    log.debug("save plunk for", solutionWebPath);

    await solutionView.mergeAndSyncPlunk(solutionFilesForView, this.plunkerToken);

    // Copy files for src="..."

    let pathName = path.basename(jsPath).replace('.view', '');
    let dst = path.join(task.getResourceFsRoot(), pathName);

    fs.ensureDirSync(dst);
    fs.readdirSync(jsPath).forEach(function(dirFile) {
      copySync(path.join(jsPath, dirFile), path.join(dst, dirFile));
    });


  };

};



function makeSource(sourceJs, testJs) {
  let source = "<!doctype html>\n";
  if (testJs) {
    source += "<script src=\"" + config.urlBase.static.href + "test/libs.js\"></script>\n";
    source += "<script src=\"test.js\"></script>\n";
  }
  source += "<script>\n\n";

  source += sourceJs.trim().replace(/^/gim, '  ');
  source += "\n\n</script>\n";
  source += "\n</html>";
  return source;
}

async function readdir(dir) {
  let filePaths = await glob('**', {cwd: dir});
  let files = {};
  for(let filePath of filePaths) {
    filePath = '/' + filePath;

    files[filePath] = await fs.readFile(path.join(dir, filePath));
    let mimeType = mime.getType(filePath);

    if (mimeType.match(/text|javascript|json/)) {
      files[filePath] = files[filePath].toString();
    }
  }

  return files;
}

function makeSolution(solutionJs, testJs) {
  let solution = "<!doctype html>\n";
  if (testJs) {
    solution += "<script src=\"" + config.urlBase.static.href + "test/libs.js\"></script>\n";
    solution += "<script src=\"test.js\"></script>\n";
  }
  solution += "<script>\n\n";

  solution += solutionJs.trim().replace(/^/gim, '  ');

  solution += "\n\n</script>\n";
  solution += "\n</html>";

  return solution;
}

function checkSameMtime(filePath1, filePath2) {
  if (!fs.existsSync(filePath2)) return false;

  const stat1 = fs.statSync(filePath1);
  if (!stat1.isFile()) {
    throw new Error("not a file: " + filePath1);
  }

  const stat2 = fs.statSync(filePath2);
  if (!stat2.isFile()) {
    throw new Error("not a file: " + filePath2);
  }

  return stat1.mtime === stat2.mtime;
}


function getFileExt(filePath) {
  let ext = filePath.match(/\.([^.]+)$/);
  return ext && ext[1];
}

function importImage(srcPath, dstDir) {
  log.info("importImage", srcPath, "to", dstDir);
  const filename = path.basename(srcPath);
  const dstPath = path.join(dstDir, filename);

  copySync(srcPath, dstPath);
}

function copySync(srcPath, dstPath) {
  if (checkSameMtime(srcPath, dstPath)) {
    log.debug("copySync: same mtime %s = %s", srcPath, dstPath);
    return;
  }

  log.debug("copySync %s -> %s", srcPath, dstPath);

  fs.copySync(srcPath, dstPath);
}

