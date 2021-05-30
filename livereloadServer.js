let tinyLr = require('tiny-lr');
let debounce = require('lodash/debounce');
let config = require('config');
let path = require('path');
let fs = require('fs');

class LivereloadServer {
  constructor() {
    let options = {
      livereload: require.resolve('livereload-js/dist/livereload.js'),
    };

    if (process.env.HTTPS) {
      Object.assign(options, {
        key: fs.readFileSync(path.join(config.certDir, 'local-key.pem')),
        cert: fs.readFileSync(path.join(config.certDir, 'local.pem')),
      });
    }

    this.tinyLrServer = new tinyLr.Server(options);

    this.tinyLrServer.listen(35729, undefined, () => {
      console.log("Livereload server listening");
    });

    this.changes = new Set();

    this.flushDebounced = debounce(this.flush, 200);
  }

  queueFlush(path) {
    this.changes.add(path);
    this.flushDebounced();
  }

  flush() {
    this.tinyLrServer.changed({ 
      body: { 
        files: Array.from(this.changes) 
      } 
    });
  
    this.changes.clear();
  }

}

module.exports = new LivereloadServer();