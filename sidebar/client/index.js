
document.addEventListener('click', onClick);

document.addEventListener('keydown', onKeyDown);

initSidebarHighlight();

function toggle() {

  let pageWrapper = document.querySelector('.page-wrapper');

  document.querySelector('.page').classList.toggle('page_sidebar_on');

  pageWrapper && pageWrapper.classList.toggle('page-wrapper_sidebar_on');

  if (document.querySelector('.page').classList.contains('page_sidebar_on')) {
    delete localStorage.noSidebar;
  } else {
    localStorage.noSidebar = 1;
  }

}

function onClick(event) {

  if (!event.target.hasAttribute('data-sidebar-toggle')) return;

  toggle();
}


function onKeyDown(event) {
  // don't react on Ctrl-> <- if in text
  if (document.activeElement) {
    if (~['INPUT', 'TEXTAREA', 'SELECT'].indexOf(document.activeElement.tagName)) return;
  }

  if (event.keyCode != "S".charCodeAt(0)) return;

  if (~navigator.userAgent.toLowerCase().indexOf("mac os x")) {
    if (!event.metaKey || !event.altKey) return;
  } else {
    if (!event.altKey) return;
  }

  toggle();
  event.preventDefault();

}

function initSidebarHighlight() {

  function highlight() {

    let current = document.getElementsByClassName('sidebar__navigation-link_active');
    if (current[0]) current[0].classList.remove('sidebar__navigation-link_active');

    //debugger;
    let h2s = document.getElementsByTagName('h2');
    let i;
    for (i = 0; i < h2s.length; i++) {
      let h2 = h2s[i];
      // first in-page header
      // >1, because when visiting http://javascript.local/native-prototypes#native-prototype-change,
      // top may be 0.375 or kind of...
      if (h2.getBoundingClientRect().top > 1) break;
    }
    i--; // we need the one before it (currently reading)

    if (i >= 0) {
      let href = h2s[i].firstElementChild && h2s[i].firstElementChild.getAttribute('href');
      let li = document.querySelector('.sidebar__navigation-link a[href="' + href + '"]');
      if (href && li) {
        li.classList.add('sidebar__navigation-link_active');
      }
    }

  }

  document.addEventListener('DOMContentLoaded', function() {
    highlight();

    window.addEventListener('scroll', highlight);
  });

}


/*
document.addEventListener('DOMContentLoaded', function() {

  if (window._bsa) {
    initCarbon();
  } else {
    let script = document.querySelector('script[src*="buysellads.com"]');
    script.onload = () => setTimeout(initCarbon);
  }

  function initCarbon() {

    _bsa.init('custom', 'CKYDEK3U', 'placement:javascriptinfo',
      {
        target:   '#carbon',
        template: `
    <a href="##statlink##" target="_blank" rel="nofollow noopener" class="carbon-cpc">
    <div class="carbon-description"><strong>##company##</strong> — ##description##</div>
    </a>
    <a href="https://www.carbonads.net/?utm_source=javascript-info-custom&utm_medium=ad_via_link&utm_campaign=in_unit&utm_term=custom" target="_blank" rel="nofollow noopener" class="carbon-sponsor">Ads via Carbon</a>
    `
      }
    );
  }
});
*/
