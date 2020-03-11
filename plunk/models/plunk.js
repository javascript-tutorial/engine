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

  log.debug("mergeAndSyncRemote " + this.plunkId);
  log.debug("OLD files", this.files.toObject());
  log.debug("NEW files", files);

  // if (this.files[0]._id.toString() == '55cf00e5676e320b40dcc039') debugger;
  // TODO: plunk fails to not update!

  let changed = false;
  if (this.files.length != files.length) {
    changed = true;
  }

  // console.log(this.files, files);

  if (changed == false) {
    for (let i = 0; i < files.length; i++) {
      if (this.files[i].filename != files[i].filename
        || this.files[i].content != files[i].content) {
        changed = true;
        break;
      }
    }
  }

  if (!changed) {
    log.debug("no changes, skip updating");
    return;
  }

  log.debug("plunk has changes or is new", this.plunkId);

  this.files = files;

  await this.updateRemote(plunkerToken);

  await this.persist();
};

schema.methods.updateRemote = async function(plunkerToken) {

  if (!process.env.PLNKR_ENABLED) {
    if (!this.plunkId) {
      this.plunkId = Math.random().toString(36).slice(2);
    }
    return this.plunkId;
  }

  let entries = this.files.map(file => {
    return {
      content:  file.content,
      encoding: 'utf-8',
      type: 'file',
      pathname: file.filename
    }
  });

  let options = {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json;charset=utf-8',
      'Authorization': `Bearer ${plunkerToken}`
    },
    json:    true
  };

  options.url = this.plunkId ? `https://api.plnkr.co/v2/plunks/${this.plunkId}/versions` : "http://api.plnkr.co/v2/plunks";

  options.body = this.plunkId ? {entries} : {
    title:   'Code example',
    tags:    [],
    private: true,
    entries
  };

  let response = await request(options);

  // console.log(response);

  assert.equal(response.statusCode, 201);

  if (!this.plunkId) {
    this.plunkId = response.body.id;
  }

  return response.body.id;

};


let Plunk = module.exports = mongoose.model('Plunk', schema);


