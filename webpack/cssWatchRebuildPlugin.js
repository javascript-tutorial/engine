const Minimatch = require("minimatch").Minimatch;
const config = require('config');
const glob = require('glob');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs-extra');

module.exports = class CssWatchRebuildPlugin {
  initialized = false;

  apply(compiler) {
    compiler.hooks.watchRun.tap('CssWatchRebuildPlugin', (compilation) => {

      console.log(compiler.watchMode, '!!!');
      // setup watch
      if (compiler.watchMode && !this.initialized) {
        // console.log("setup watch on styles");

        let paths = ['templates','modules/styles'];

        for (let handlerName in config.handlers) {
          let handlerPath = config.handlers[handlerName].path;
          if (!fs.statSync(handlerPath).isDirectory()) continue;
          paths.push(handlerPath);
        }

        for(let path of paths) {
          chokidar.watch(path, {
            ignoreInitial: true,
            ignored: (path, stats) => stats?.isFile() && !path.endsWith('.styl')
          })
            .on('add', file => this.rebuild())
            .on('unlink', file => this.rebuild());

          // console.log("setup watch on ", path);
        }
        this.initialized = true
      }
    });

    // Runs only once before the initial compilation, regardless of watch mode.
    // we make sure tmp/ru/styles.styl exists before resolvers
    compiler.hooks.afterPlugins.tap('CssWatchRebuildPlugin', (compiler) => {
      // compiler.hooks.beforeRun.tapAsync('CssWatchRebuildPlugin', async (compiler, callback) => {

      this.rebuild();

    });

  }

  rebuild() {
    // console.log("REBUILD");
    let styles = glob.sync(`{templates,modules/styles}/**/*.styl`, {cwd: config.projectRoot});

    let filesContent = {
      styles: styles.map(s => path.join(config.projectRoot, s))
    };

    for (let handlerName in config.handlers) {
      let name = path.basename(handlerName);

      let handlerPath = config.handlers[handlerName].path;
      if (!fs.statSync(handlerPath).isDirectory()) continue;

      let handlerStyles = glob.sync(`**/*.styl`, {cwd: handlerPath});
      for (const handlerStyle of handlerStyles) {

        if (handlerStyle.match(/(^|\/)_/)) {

          if (!filesContent[name]) {
            filesContent[name] = [];
          }

          filesContent[name].push(path.join(handlerPath, handlerStyle));
        } else {
          filesContent.styles.push(path.join(handlerPath, handlerStyle));
        }
      }
    }

    for(let name in filesContent) {
      let content = filesContent[name];

      if (path.sep === '\\') {
        // for windows c:\path\notification.styl fails because "\n" is line break
        // so replace slashes with unix ones (that's ok)
        content = content.map(s => s.replace(/\\/g, '/'));
      }
      // console.log(content);
      content = content.map(s => `@require '${s}'`).join("\n");

      fs.writeFileSync(`${config.tmpRoot}/${name}.styl`, content);
    }

    //console.log("LOG STYLES", filesContent);
  }

}
