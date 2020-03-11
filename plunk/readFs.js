let fs = require('fs');
let path = require('path');
let mime = require('mime');
let log = require('engine/log')();
let stripIndents = require('engine/text-utils/stripIndents');

function readFs(dir) {

  let files = fs.readdirSync(dir);

  let hadErrors = false;
  files = files.filter(function(file) {
    if (file[0] == ".") return false;

    let filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      log.error("Directory not allowed: " + file);
      hadErrors = true;
    }

    let type = mime.getType(file).split('/');
    if (type[0] != 'text' && type[1] != 'json' && type[1] != 'javascript' && type[1] != 'svg+xml') {
      log.error("Bad file extension: " + file);
      hadErrors = true;
    }

    return true;
  });

  if (hadErrors) {
    return null;
  }

  files = files.sort(function(fileA, fileB) {
    let extA = fileA.slice(fileA.lastIndexOf('.') + 1);
    let extB = fileB.slice(fileB.lastIndexOf('.') + 1);

    if (extA == extB) {
      return fileA > fileB ? 1 : -1;
    }

    // html always first
    if (extA == 'html') return 1;
    if (extB == 'html') return -1;

    // then goes CSS
    if (extA == 'css') return 1;
    if (extB == 'css') return -1;

    // then JS
    if (extA == 'js') return 1;
    if (extB == 'js') return -1;

    // then other extensions
    return fileA > fileB ? 1 : -1;
  });

  let filesForPlunk = {};
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    filesForPlunk[file] = {
      filename: file,
      content: stripIndents(fs.readFileSync(path.join(dir, file), 'utf-8'))
    };
  }

  return filesForPlunk;
}


module.exports = readFs;

/*
async function readFs(dir) {

  let files = fs.readdirSync(dir);

  let errors = [];
  files = files.filter(function(file) {
    if (file[0] == ".") return false;

    let filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      errors.push("Directory not allowed: " + file);
      return false;
    }

    let type = mime.lookup(file).split('/');
    if (type[0] != 'text' && type[1] != 'json' && type[1] != 'javascript') {
      errors.push("Bad file extension: " + file);
    }

    return true;
  });

  let meta = {};
  let plunkFilePath = path.join(dir, '.plnkr');

  if (fs.existsSync(plunkFilePath)) {
    let existingPlunk = fs.readFileSync(plunkFilePath, 'utf-8');
    existingPlunk = JSON.parse(existingPlunk);

    // dir name change (2 levels up) = new plunk
    let plunkDirName = fs.realpathSync(dir);
    plunkDirName = path.basename(path.dirname(plunkDirName)) + path.sep + path.basename(plunkDirName);

    if (existingPlunk.name == plunkDirName) {
      meta = existingPlunk;
    }
  }


  if (errors.length) {
    log.error(errors);
    return false;
  }

  files = files.sort(function(fileA, fileB) {
    let extA = fileA.slice(fileA.lastIndexOf('.') + 1);
    let extB = fileB.slice(fileB.lastIndexOf('.') + 1);

    if (extA == extB) {
      return fileA > fileB ? 1 : -1;
    }

    // html always first
    if (extA == 'html') return 1;
    if (extB == 'html') return -1;

    // then goes CSS
    if (extA == 'css') return 1;
    if (extB == 'css') return -1;

    // then JS
    if (extA == 'js') return 1;
    if (extB == 'js') return -1;

    // then other extensions
    return fileA > fileB ? 1 : -1;
  });

  let filesForPlunk = {};
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    filesForPlunk[file] = {
      filename: file,
      content: fs.readFileSync(path.join(dir, file), 'utf-8')
    };
  }

  return {
    meta: meta,
    files: filesForPlunk
  };
}
*/


/*
require('co')(readPlunkContent('/private/var/site/js-dev/tutorial/03-more/11-css-for-js/17-css-sprite/height48'))(function(err, res) {
  if (err) console.error(err.message, err.stack);
  else console.log(res);
});
*/
