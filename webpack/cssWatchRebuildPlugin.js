const fs = require('fs');
const Minimatch = require("minimatch").Minimatch;
const config = require('config');
const glob = require('glob');
const chokidar = require('chokidar');
const path = require('path');

class CssWatchRebuildPlugin {

  apply(compiler) {

    compiler.hooks.afterEnvironment.tap("CssWatchRebuildPlugin", () => {

      compiler.watchFileSystem = new CssWatchFS(
        compiler.watchFileSystem
      );
    });

  }
}

module.exports = CssWatchRebuildPlugin;

class CssWatchFS {
  constructor(wfs, roots) {
    this.wfs = wfs;
    this.roots = roots;

    this.rebuild();


    chokidar.watch(`{templates,modules/styles}/**/*.styl`, {ignoreInitial: true}).on('add', file => this.rebuild());

    for (let handlerName in config.handlers) {
      let handlerPath = config.handlers[handlerName].path;
      if (!fs.statSync(handlerPath).isDirectory()) continue;
      chokidar.watch(`${handlerPath}/**/*.styl`, {ignoreInitial: true}).on('add', file => this.rebuild());
    }

  }

  rebuild() {
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

      this.wfs.inputFileSystem.purge(`${config.tmpRoot}/${name}.styl`);
    }

    //console.log("LOG STYLES", filesContent);
  }


  // rebuild batch for deleted .styl
  watch(files, dirs, missing, startTime, options, callback, callbackUndelayed) {
    const watcher = this.wfs.watch(files, dirs, missing, startTime, options,
      (
        err,
        filesModified,
        dirsModified,
        missingModified,
        fileTimestamps,
        dirTimestamps
      ) => {
        //console.log(fileTimestamps);
        if (err) return callback(err);

        // console.log("Modified",  filesModified, fs.existsSync(filesModified[0]));
        for(let fileModified of filesModified) {
          // deleted style
          if (!fs.existsSync(fileModified)) {
            this.rebuild();
            //
            // for(let name in this.roots) {
            //
            //   let mm = new Minimatch(`${this.roots[name]}/**/*.styl`);
            //   let fn = fileModified.slice(config.projectRoot.length + 1);
            //   //console.log("CHECK", fn);
            //
            //   if (mm.match(fn))  {
            //     this.rebuildRoot(name);
            //     fileTimestamps.set(`${config.tmpRoot}/${name}.styl`, Date.now());
            //   }
            //
            // }
          }
        }

        callback(
          err,
          filesModified,
          dirsModified,
          missingModified,
          fileTimestamps,
          dirTimestamps
        );
      },
      callbackUndelayed
    );

    return {
      close: () => watcher.close(),
      pause: () => watcher.pause(),
      getContextTimestamps: () => watcher.getContextTimestamps(),
      getFileTimestamps: () => watcher.getFileTimestamps()
    };
  }
}
