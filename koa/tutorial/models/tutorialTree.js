'use strict';

const assert = require('assert');
const Article = require('./article');
const Task = require('./task');
const log = require('engine/log')();

const config = require('config');
const fs = require('mz/fs');
const path = require('path');

class TutorialTree {

  constructor({
    name
  } = options) {
    this.roots = [];
    this.name = name;
    this.bySlugMap = Object.create(null);
  }

  bySlug(slug) {
    return this.bySlugMap[slug];
  }

  getSiblings(slug) {
    let entry = this.bySlug(slug);
    return entry.parent ? this.bySlug(entry.parent).children : this.roots;
  }

  getParents(slug) {
    const parents = [];
    let entry = this.bySlug(slug);
    while (entry.parent) {
      const parent = this.bySlug(entry.parent);
      parents.push(parent);
      entry = parent;
    }
    return parents;
  }

  getPrev(slug) {
    let entry = this.bySlug(slug);
    let siblings = entry.parent ? this.bySlug(entry.parent).children : this.roots;
    let idx = siblings.indexOf(slug);
    assert(idx >= 0);

    if (idx === 0) {
      return entry.parent;
    } else {
      if (!entry.isFolder) {
        return siblings[idx - 1];
      } else {
        // get last child of prev sibling
        let prevSibling = this.bySlug(siblings[idx - 1]);
        while (prevSibling.isFolder) {
          if (!prevSibling.children.length) break;
          prevSibling = this.bySlug(prevSibling.children[prevSibling.children.length - 1]);
        }
        return prevSibling.slug;
      }

    }
  }

  getDescendantsList(slug) {
    let results = [];

    let find = (slug) => {
      let entry = this.bySlug(slug);
      if (!entry.children) return;
      for(let childSlug of entry.children) {
        results.push(childSlug);
        find(childSlug);
      }
    };

    find(slug);

    return results;

  }

  getNext(slug, canGoDown = true) {
    let entry = this.bySlug(slug);
    if (entry.isFolder && entry.children[0] && canGoDown) {
      return entry.children[0];
    }
    let siblings = entry.parent ? this.bySlug(entry.parent).children : this.roots;
    let idx = siblings.indexOf(slug);
    assert(idx >= 0);

    if (idx < siblings.length - 1) {
      return siblings[idx + 1];
    } else {
      return entry.parent ? this.getNext(entry.parent, false) : null;
    }
  }

  addToSlugMap(entry) {
    this.bySlugMap[entry.slug] = entry;
  }

  deleteFromSlugMap(slug) {
    delete this.bySlugMap[slug];
  }

  destroyTree(slug) {
    let entry = this.bySlug(slug);

    if (!entry) return;

    // console.log("DESTROY", slug);

    if (entry.children) {
      // Working with an items list reference. Items keys should be detached
      let children = entry.children.slice(); // copy array, as for will modify it
      for (let childSlug of children) {
        this.destroyTree(childSlug);
      }
    }

    this.deleteFromSlugMap(slug);

    let siblings = entry.parent ? this.bySlug(entry.parent).children : this.roots;
    let idx = siblings.indexOf(slug);

    // if (idx == -1) console.log(entry, this.bySlug(entry.parent));
    assert(idx >= 0);

    siblings.splice(idx, 1);
  }

  add(entry) {

    // console.log("ADD", entry.slug, "CHECK", this.bySlug(entry.slug));

    if (this.bySlug(entry.slug)) {
      log.error("Dupe entry", entry);
      throw new Error("Already exists an entry with slug:" + entry.slug);
    }

    this.addToSlugMap(entry);
    let siblings = entry.parent ? this.bySlug(entry.parent).children : this.roots;
    let i = 0;
    while (i < siblings.length) {
      if (this.bySlug(siblings[i]).weight >= entry.weight) {
        break;
      }
      i++;
    }
    if (i === siblings.length) {
      // console.log("INSERT", entry.slug, "IN", siblings, "PUSH");
      siblings.push(entry.slug);
    } else {
      // console.log("INSERT", entry.slug, "IN", siblings, "SPLICE", i);
      siblings.splice(i, 0, entry.slug);

    }

  }

  getAll() {
    return Object.values(this.bySlugMap);
  }

  clear() {
    for (let key in this.bySlugMap) {
      delete this.bySlugMap[key];
    }
    this.roots.length = 0;
  }

  static instance(name = 'tutorialTree') {
    if (!this._instances[name]) {
      this._instances[name] = new TutorialTree({
        name
      });
    }
    return this._instances[name];
  }

  serialize() {
    let bySlugMap = Object.create(null);
    for (let slug in this.bySlugMap) {
      let value = this.bySlugMap[slug];
      bySlugMap[slug] = {type: value.constructor.name, value};
    }
    return {
      roots: this.roots,
      bySlugMap
    };
  }

  load({roots, bySlugMap}) {
    this.roots.length = 0;
    this.roots.push(...roots);
    for (let slug in this.bySlugMap) {
      delete this.bySlugMap[slug];
    }
    let constructors = {Article, Task};
    for (let slug in bySlugMap) {
      let {type, value} = bySlugMap[slug];
      this.bySlugMap[slug] = constructors[type].deserialize(value);
    }

  }


  async loadFromCache() {
    let tree = await fs.readFile(path.join(config.cacheRoot, `${this.name}.json`));
    tree = JSON.parse(tree);
    this.load(tree);
  }

  async saveToCache() {
    await fs.writeFile(path.join(config.cacheRoot, `${this.name}.json`), JSON.stringify(this.serialize(), null, 2));
  }

};

TutorialTree._instances = {};

module.exports = TutorialTree;