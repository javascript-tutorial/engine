const delegate = require('client/delegate');
const prism = require('engine/prism');
const ItemSlider = require('./itemSlider');

function init() {

  initTaskButtons();
  initFolderList();
  initViewMoreButton();
  initCoursesSlider();

  prism.init();
}

function initTaskButtons() {
  // solution button
  delegate(document, '.task__solution', 'click', function(event) {
    event.target.closest('.task').classList.toggle('task_answer_open');
  });

  // close solution button
  delegate(document, '.task__answer-close', 'click', function(event) {
    event.target.closest('.task').classList.toggle('task_answer_open');
  });

  // every step button (if any steps)
  delegate(document, '.task__step-show', 'click', function(event) {
    event.target.closest('.task__step').classList.toggle('task_step_open');
  });
}

function initViewMoreButton() {
  delegate(document, 'a.list-sub__more', 'click', function(event) {
    event.preventDefault();
    const target = event.target;
    for (let item of target.closest('.list-sub').querySelectorAll('.list-sub__item_phone_hidden')) {
      item.classList.remove('list-sub__item_phone_hidden');
    }
    target.style.display = 'none';
  })
}

function initFolderList() {
  delegate(document, '.lessons-list__lesson_level_1 > .lessons-list__link', 'click', function(event) {
    let link = event.delegateTarget;
    let openFolder = link.closest('.lessons-list').querySelector('.lessons-list__lesson_open');
    // close the previous open folder (thus making an accordion)
    if (openFolder && openFolder !== link.parentNode) {
      openFolder.classList.remove('lessons-list__lesson_open');
    }
    link.parentNode.classList.toggle('lessons-list__lesson_open');
    event.preventDefault();
  });
}

function initCoursesSlider() {
  const slider = document.querySelector('[data-courses-slider]');
  if (slider) new ItemSlider({el: slider, class: 'slider_frontpage'});
}

window.runDemo = function(button) {

  let demoElem;
  let parent = button;

  /* jshint -W084 */
  while (parent = parent.parentElement) {
    demoElem = parent.querySelector('[data-demo]');
    if (demoElem) break;
  }

  if (!demoElem) {
    alert("Error, no demo element");
  } else {
    /* jshint -W061 */
    eval(demoElem.textContent);
  }

};

init();
