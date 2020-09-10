let tinyLr = require('tiny-lr');
let debounce = require('lodash/debounce');

class LivereloadServer {
  constructor() {
    this.tinyLrServer = new tinyLr.Server({
      livereload: require.resolve('livereload-js/dist/livereload.js')
    });

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