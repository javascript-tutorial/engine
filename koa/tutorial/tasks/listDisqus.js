let path = require('path');
let fs = require('fs');
const parseString = require('xml2js').parseString;

module.exports = async function() {

  require('util').inspect.defaultOptions.depth = 4;
  let args = require('yargs')
    .example("gulp --from disqus.xml")
    .argv;

  let xml = fs.readFileSync(args.from);

  let disqus = await new Promise((resolve, reject) => {
    parseString(xml, (err, res) => err ? reject(err) : resolve(res));
  });


  console.log(disqus);



};
