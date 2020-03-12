const TutorialView = require('./tutorialView');
const config = require('config');
const fs = require('mz/fs');
const path = require('path');

module.exports = class TutorialViewStorage {
  constructor() {
    this.storage = Object.create(null);
  }

  set(key, value) {
    this.storage[key] = value;
  }

  get(key) {
    return this.storage[key];
  }

  getAll() {
    return this.storage;
  }

  has(key) {
    return (key in this.storage);
  }

  clear() {
    for (let key in this.storage) {
      delete this.storage[key];
    }
  }

  static instance() {
    if (!this._instance) {
      this._instance = new TutorialViewStorage();
    }
    return this._instance;
  }

  serialize() {
    return {
      storage: this.storage
    };
  }

  load({storage}) {
    for(let key in this.storage) {
      delete this.storage[key];
    }

    for(let key in storage) {
      this.storage[key] = new TutorialView(storage[key]);
    }
  }

  async loadFromCache({allowEmpty = true} = {}) {
    if (allowEmpty) {
      let exists = await fs.exists(path.join(config.cacheRoot, 'tutorialViewStorage.json'));
      if (!exists) return;
    }

    // return;

    let views = await fs.readFile(path.join(config.cacheRoot, 'tutorialViewStorage.json'));
    views = JSON.parse(views);
    this.load(views);
  }

  async saveToCache() {
    await fs.writeFile(path.join(config.cacheRoot, 'tutorialViewStorage.json'), JSON.stringify(this.serialize(), null, 2));
  }


};
