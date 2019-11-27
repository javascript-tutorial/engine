'use strict';

/**
 * Strips first # Title
 * Returns {title, text}
 */

module.exports = function(text) {

  let titleReg = /^\s*#\s+(.*)/u;
  let title = text.match(titleReg);

  // console.log("TITLE", title);
  if (!title) {
    return {
      text: text,
      title: ''
    };
  }

  return {
    text: text.replace(titleReg, ''),
    title: title[1].trim()
  };

};
