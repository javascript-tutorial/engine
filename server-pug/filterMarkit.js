let filters = require('pug').filters;

let BasicParser = require('engine/markit').BasicParser;

filters.markit = function(html) {
  let parser = new BasicParser({
    html: true
  });

  return parser.render(html);
};

