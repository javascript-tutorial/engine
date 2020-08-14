let assert = require('assert');
let _ = require('lodash');
let log = require('engine/log')();
let Zip = require('jszip');
const fs = require('fs-extra');
const stripIndents = require('engine/text-utils/stripIndents');
const path = require('path');
const mime = require('mime');

// we create fake plunk ids with this prefix
// so that when updating for real, we know they do not exist and don't send updates to https://plnkr.co server
const DEV_PREFIX = '_[stub]_';

let request = require('request-promise').defaults({
  simple: false,
  resolveWithFullResponse: true
});


module.exports = class TutorialView {
  constructor(data) {
    'description,webPath,plunkId,files'.split(',').forEach(field => {
      if (field in data) {
        this[field] = data[field];
      }
    });
    if (!this.files) {
      this.files = [];
    }
  }

  getUrl() {
    if (this.plunkId) {
      return 'https://plnkr.co/edit/' + this.plunkId + '?p=preview';
    } else {
      return null;
    }
  }

  async getZip() {
    let archive = new Zip();

    for (let file of this.files) {
      archive.file(file.filename, file.content);
    }

    let buffer = await archive.generateAsync({type: 'nodebuffer'});

    return buffer;
  };

  async mergeAndSyncPlunk(files, plunkerToken) {

    let changes = {};

    log.debug("mergeAndSyncRemote " + this.plunkId);
    log.debug("OLD files", this.files);
    log.debug("NEW files", files);

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

    log.debug("plunk has changes or is new", this.plunkId);
  }

  async updateRemote(plunkerToken) {

    if (!process.env.PLNKR_ENABLED) {
      if (!this.plunkId) {
        this.plunkId = DEV_PREFIX + Math.random().toString(36).slice(2);
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

    if (response.statusCode == 401) {
      let fileNames = this.files.map(f => f.filename);
      throw new Error(`No permissions to create/update, plunkId:${this.plunkId} files:${fileNames.join(',')}`);
    }

    assert.equal(response.statusCode, 201);

    if (!this.plunkId) {
      this.plunkId = response.body.id;
    }

    return response.body.id;
  };


  static async readFs(dir) {

    let allFiles = await fs.readdir(dir);

    let files = [];
    for(let file of allFiles) {
      if (file[0] == ".") continue;

      let filePath = path.join(dir, file);
      if ((await fs.stat(filePath)).isDirectory()) {
        log.error("Directory not allowed: " + file);
        return null;
      }

      let type = mime.getType(file).split('/');
      if (type[0] != 'text' && type[1] != 'json' && type[1] != 'javascript' && type[1] != 'svg+xml') {
        log.error("Bad file extension: " + file);
        return null;
      }

      files.push(file);
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

    let filesForPlunk = [];
    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      filesForPlunk.push({
        filename: file,
        content: stripIndents(await fs.readFile(path.join(dir, file), 'utf-8'))
      });
    }

    // console.log("FILES FOR PLUNK", filesForPlunk);

    return filesForPlunk;
  }

};
