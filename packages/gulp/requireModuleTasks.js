const path = require('path');
const fs = require('fs');
const gulp = require('gulp');

function lazyRequireTask(modulePath) {
  let args = [].slice.call(arguments, 1);
  return function(callback) {

    //console.log("PATH", path.join(process.cwd(), modulePath));
    //console.log(require.resolve(modulePath));
    let task = require(path.resolve(process.cwd(), modulePath)).apply(this, args);

    //console.log("DONE");
    return task(callback);
  };
}

function requireModuleTasks(moduleName) {

  let dir = path.join(path.dirname(require.resolve(moduleName)), 'tasks');
  let taskFiles = fs.readdirSync(dir);

  let hasDeps;
  try {
    fs.accessSync(path.join(dir, 'deps.json'));
    hasDeps = true;
  } catch(e) {
    hasDeps = false;
  }

  let deps = hasDeps ? require(path.join(dir, 'deps.json')) : {};

  for(let taskFile of taskFiles) {
    // migrate:myTask

    let taskName = taskFile.split('.')[0];
    if (taskName === '') continue; // ignore .files

    let taskNameFull = moduleName.replace(/\//g, ':') + ':' + taskName;

    // console.log(taskNameFull, );
    gulp.task(taskNameFull, deps[taskName] || [], lazyRequireTask(path.join(dir, taskFile)) );
  }

}

module.exports = {lazyRequireTask, requireModuleTasks};