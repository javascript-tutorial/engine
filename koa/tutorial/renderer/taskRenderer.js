const config = require('config');
const Task = require('../models/task');
const log = require('engine/log')();
const assert = require('assert');

const TutorialParser = require('../lib/tutorialParser');
const TutorialViewStorage = require('../models/tutorialViewStorage');
const capitalize = require('lodash/capitalize');
const t = require('engine/i18n');


/**
 * Can render many articles, keeping metadata
 */
module.exports = class TaskRenderer {

  async renderContent(task, options) {
    let parser = new TutorialParser(Object.assign({
      resourceWebRoot: task.getResourceWebRoot()
    }, options));


    const tokens = await parser.parse(task.content);

    let content = parser.render(tokens);

    content = await this.addContentPlunkLink(task, content);
    return content;
  }


  async addContentPlunkLink(task, content) {

    let sourcePlunk = TutorialViewStorage.instance().get(task.getResourceWebRoot() + '/source');

    if (sourcePlunk) {

      let files = sourcePlunk.files;
      // console.log(files);
      let hasTest = false;
      for (let file of files) {
        if (file.filename === 'test.js') hasTest = true;
      }

      let title = hasTest ? t('tutorial.task.open_task.sandbox.tests') : t('tutorial.task.open_task.sandbox.no_tests');

      content += `<p><a href="${sourcePlunk.getUrl()}" target="_blank" data-plunk-id="${sourcePlunk.plunkId}">${title}</a></p>`;
    }

    return content;
  }

  async render(task, options) {
    assert(task.constructor.name === 'Task');
    this.content = await this.renderContent(task, options);
    this.solution = await this.renderSolution(task, options);

    return {
      content:  this.content,
      solution: this.solution
    };
  }

  async renderSolution(task, options) {

    let parser = new TutorialParser(Object.assign({
      resourceWebRoot: task.getResourceWebRoot()
    }, options));

    const tokens = await parser.parse(task.solution);

    const solutionParts = [];


    // if no #header at start
    // no parts, single solution
    if (tokens.length === 0 || tokens[0].type !== 'heading_open') {
      let solution = parser.render(tokens);
      solution = await addSolutionPlunkLink(solution);
      return solution;
    }

    // otherwise, split into parts
    let currentPart;
    for (let idx = 0; idx < tokens.length; idx++) {
      let token = tokens[idx];
      if (token.type === 'heading_open') {

        let i = idx + 1;
        while (tokens[i].type !== 'heading_close') i++;

        let headingTokens = tokens.slice(idx + 1, i);

        currentPart = {
          title:   stripTags(parser.render(headingTokens)),
          content: []
        };
        solutionParts.push(currentPart);
        idx = i;
        continue;
      }

      currentPart.content.push(token);
    }

    for (let i = 0; i < solutionParts.length; i++) {
      let part = solutionParts[i];
      part.content = parser.render(part.content);
    }

    let solutionPartLast = solutionParts[solutionParts.length - 1];
    solutionParts[solutionParts.length - 1].content = await addSolutionPlunkLink(solutionPartLast.content);

    async function addSolutionPlunkLink(solution) {

      let solutionPlunk = TutorialViewStorage.instance().get(task.getResourceWebRoot() + '/solution');

      if (solutionPlunk) {

        if (task.solutionJs) { // task may have solution.view OR _js.view
          // append _js.view/solution.js to the solution UNLESS it has ```js demo in it
          // English: all ok
          // Other languages: not checked for duplicates

          /*
// script to gather all tasks with solutionJs
var js = JSON.parse(require('fs').readFileSync('./tutorialTree.json', 'utf-8'));
for(let key in js.bySlugMap) {
  let entry = js.bySlugMap[key];
  if (!entry.value.solutionJs) continue;
  console.log('http://javascript.local/task/' + key);
}
// use it as: node ~/tasks.js | xargs open

           */

          if (!solution.match(/data-demo="1"/)) {
            let solutionJs = `
\`\`\`js
${task.solutionJs}
\`\`\`
        `;

            const tokens = await parser.parse(solutionJs);
            solution += parser.render(tokens);
          }
        }


        let files = solutionPlunk.files;
        let hasTest = false;
        for (let i = 0; i < files.length; i++) {
          if (files[i].filename === 'test.js') hasTest = true;
        }


        let title = hasTest ? t('tutorial.task.open_solution.sandbox.tests') : t('tutorial.task.open_solution.sandbox.no_tests');

        solution += `<p><a href="${solutionPlunk.getUrl()}" target="_blank" data-plunk-id="${solutionPlunk.plunkId}">${title}</a></p>`;
      }

      return solution;
    }

    return solutionParts;
  }


};


function stripTags(text) {
  return text.replace(/<\/?[a-z].*?>/gim, '');
}

