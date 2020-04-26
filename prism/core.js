
// in node.js:
// global.Prism = Prism;
require('prismjs/components/prism-core.js');

require('prismjs/components/prism-markup.js');
require('prismjs/components/prism-css.js');
require('prismjs/components/prism-css-extras.js');
require('prismjs/components/prism-clike.js');
require('prismjs/components/prism-javascript.js');
require('prismjs/components/prism-http.js');
require('prismjs/components/prism-scss.js');
require('prismjs/components/prism-sql.js');
require('prismjs/components/prism-java.js');
require('prismjs/components/prism-bash.js');

// for iBooks to use monospace font
Prism.hooks.add('wrap', function(env) {
  if (env.tag === 'span') {
    env.tag = 'code';
  }
});
