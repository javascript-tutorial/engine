let mongoose = require('mongoose');
let assert = require('assert');
let request = require('request-promise').defaults({
  simple:                  false,
  resolveWithFullResponse: true
});

let config = require('config');
let Schema = mongoose.Schema;
let _ = require('lodash');
let log = require('engine/log')();
let Zip = require('node-zip');

let schema = new Schema({
  description: {
    type:    String,
    default: ""
  },
  webPath:     {
    type:     String,
    unique:   true,
    required: true
  },
  plunkId:     {
    type:     String,
    required: true
  },
  files:       [{
    filename: String,
    content:  String
  }]
});

schema.methods.getUrl = function() {
  return 'https://plnkr.co/edit/' + this.plunkId + '?p=preview';
};

schema.methods.getZip = function() {
  let archive = new Zip();

  for (let i = 0; i < this.files.length; i++) {
    let file = this.files[i];
    archive.file(file.filename, file.content);
  }

  let buffer = archive.generate({type: 'nodebuffer'});

  return buffer;
};

/**
 * Merges files into the current plunk
 * @param files
 * @returns {boolean} new files list to post w/ nulls where files are deleted
 */
schema.methods.mergeAndSyncRemote = async function(files, plunkerToken) {

  let changes = {};

  log.debug("mergeAndSyncRemote " + this.plunkId);
  log.debug("OLD files", this.files);
  log.debug("NEW files", files);

  // if (this.files[0]._id.toString() == '55cf00e5676e320b40dcc039') debugger;
  // TODO: plunk fails to not update!

  /* delete this.files which are absent in files */
  for (let i = 0; i < this.files.length; i++) {
    let file = this.files[i];
    if (!files[file.filename]) {
      this.files.splice(i--, 1);
      changes[file.filename] = null; // for submitting to plnkr
    }
  }

  for (let name in files) {
    let existingFile = null;
    for (let i = 0; i < this.files.length; i++) {
      let item = this.files[i];
      if (item.filename == name) {
        existingFile = item;
        break;
      }
    }
    if (existingFile) {
      if (existingFile.content == files[name].content) continue;
      existingFile.content = files[name].content;
    } else {
      this.files.push(files[name]);
    }
    delete files[name].filename;
    changes[name] = files[name];
  }

  log.debug("UPDATED files", this.files);

  if (_.isEmpty(changes)) {
    log.debug("no changes, skip updating");
    return;
  } else {
    log.debug("plunk " + this.plunkId + " changes", changes);
  }


  if (this.plunkId) {
    log.debug("update remotely", this.webPath, this.plunkId);
    await Plunk.updateRemote(this.plunkId, this.files, plunkerToken);
  } else {
    log.debug("create plunk remotely", this.webPath);
    this.plunkId = await Plunk.createRemote(this.description, this.files, plunkerToken);
  }


  await this.persist();

};

schema.statics.createRemote = async function(description, files, plunkerToken) {

  if (!process.env.PLNKR_ENABLED) {
    return Math.random().toString(36).slice(2);
  }

  let entries = [];
  files.forEach(function(file) {
    entries.push({
      content:  file.content,
      encoding: 'utf-8',
      type: 'file',
      pathname: file.filename
    }); // no _id
  });

  let form = {
    title:       'Code example',
    tags:        [],
    private:     true,
    entries
  };

  let data = {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json;charset=utf-8',
      'Authorization': `Bearer ${plunkerToken}`
    },
    json:    true,
    url:     "http://api.plnkr.co/v2/plunks",
    body:    form
  };

  console.log(data);

  log.debug(data, "plunk createRemote");

  let result = await Plunk.request(data);

  console.log("RESULT", result.statusCode, result.body);


  assert.equal(result.statusCode, 201);

  return result.body.id;

};

schema.statics.request = async function(data) {
  let result = await request(data);

  if (result.statusCode == 404) {
    throw new Error("result " + data.url + " status code 404, probably (plnkrAuthId is too old OR this plunk doesn't belong to plunk@javascript.ru (javascript-plunk) user)");
  }
  if (result.statusCode == 400) {
    throw new Error("invalid json, probably you don't need to stringify body (request will do it)");
  }

  return result;
};

schema.statics.updateRemote = async function(plunkId, files, plunkerToken) {

  if (!process.env.PLNKR_ENABLED) {
    return;
  }

  let entries = [];
  files.forEach(function(file) {
    entries.push({
      content:  file.content,
      encoding: 'utf-8',
      type: 'file',
      pathname: file.filename
    }); // no _id
  });

  let form = {
    entries
  };

  /*
    let j = request.jar();
    let cookie = request.cookie('plnk_session');
    cookie.value = plunkerToken;
    j.setCookie(cookie, "http://api.plnkr.co");
  */
  let options = {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json;charset=utf-8',
      'Authorization': `Bearer ${plunkerToken}`
    },
    json:    true,
    url:     `https://api.plnkr.co/v2/plunks/${plunkId}/versions`,
    body:    form
  };

  log.debug(options);

  let result = await Plunk.request(options);

  assert.equal(result.statusCode, 201);
};


let Plunk = module.exports = mongoose.model('Plunk', schema);


