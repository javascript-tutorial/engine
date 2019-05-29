let config = require('config');
let log = require('engine/log')();
let pm2 = require('pm2');
let promisify = require('util').promisify;

let pm2connect = promisify(pm2.connect.bind(pm2));
let pm2list = promisify(pm2.list.bind(pm2));
let pm2sendDataToProcessId = promisify(pm2.sendDataToProcessId.bind(pm2));

module.exports = async function() {

  let args = require('yargs')
    .argv;

  await pm2connect();

  let list = await pm2list();

  log.debug("Process list", list);

  for (let proc of list) {

    if (proc.name !== "javascript-" + config.lang) {
      log.debug("skip " + proc.name);
      continue;
    }

    log.debug(`Send to ${proc.name} id:${proc.pm_id}`);

    await pm2sendDataToProcessId(proc.pm_id, {
      type:  'process:msg',
      data:  {},
      topic: 'tutorial:reboot'
    });
  }

  pm2.disconnect();
};
