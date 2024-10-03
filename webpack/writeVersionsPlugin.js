const fs = require('fs-extra');
const path = require('path');

class WriteVersionsPlugin {
  constructor(file) {
    this.file = file;
  }

  writeStats(compilation, stats) {
    const assetsByChunkName = stats.toJson().assetsByChunkName;

    for (const name in assetsByChunkName) {
      if (Array.isArray(assetsByChunkName[name])) {
        assetsByChunkName[name] = assetsByChunkName[name].map(assetPath => {
          return compilation.options.output.publicPath + assetPath;
        });
      } else {
        assetsByChunkName[name] = compilation.options.output.publicPath + assetsByChunkName[name];
      }
    }

    // Ensure the directory exists and write the versioned assets to the file
    fs.ensureDirSync(path.dirname(this.file));
    fs.writeFileSync(this.file, JSON.stringify(assetsByChunkName));
  }

  apply(compiler) {
    compiler.hooks.done.tap('WriteVersionsPlugin', (stats) => {
      this.writeStats(compiler, stats);
    });
  }
}

module.exports = WriteVersionsPlugin;