
function deTab(text) {
  // attacklab: Detab's completely rewritten for speed.
  // In perl we could fix it by anchoring the regexp with \G.
  // In javascript we're less fortunate.

  // expand first n-1 tabs
  text = text.replace(/\t(?=\t)/g, "  "); // attacklab: g_tab_width

  // replace the nth with two sentinels
  text = text.replace(/\t/g, "~A~B");

  // use the sentinel to anchor our regex so it doesn't explode
  text = text.replace(/~B(.+?)~A/g,
    function(wholeMatch, m1) {
      let leadingText = m1;
      let numSpaces = 2 - leadingText.length % 2;  // attacklab: g_tab_width

      // there *must* be a better way to do this:
      // for (let i = 0; i < numSpaces; i++) leadingText += " ";
      leadingText += " ".repeat(numSpaces);

      return leadingText;
    }
  );

  // clean up sentinels
  text = text.replace(/~A/g, "  ");  // attacklab: g_tab_width
  text = text.replace(/~B/g, "");

  return text;
}

module.exports = function(text) {
  text = deTab(text);
  text += "\n";

  let block = [];
  let inline = [];
  let last = null;
  let newText = [];

  text.split("\n").forEach(function(line) {
    if (/^\s*\*!\*\s*$/.test(line)) { // only *!*
      if (last) {
        newText.push(line);
      } else {
        last = newText.length;
      }
    } else if (/^\s*\*\/!\*\s*$/.test(line)) { // only */!*
      if (last !== null) {
        block.push({start: last, end: newText.length-1});
        last = null;
      } else {
        newText.push(line);
      }
    } else if (/\s*\*!\*\s*$/.test(line)) { // ends with *!*
      block.push({start: newText.length, end: newText.length});
      line = line.replace(/\s*\*!\*\s*$/g, '');
      newText.push(line);
    } else {
      newText.push("");
      let offset = 0;
      while(true) {
        let fromPos = line.indexOf('*!*');
        let toPos = line.indexOf('*/!*');
        if (fromPos != -1 && toPos != -1) {
          inline.push({ start: newText.length-1, col: {start: offset+fromPos, end: offset+toPos-3} });
          newText[newText.length-1] += line.slice(0, toPos+4).replace(/\*\/?!\*/g, '');
          offset += toPos - 3;
          line = line.slice(toPos+4);
        } else {
          newText[newText.length-1] += line;
          break;
        }
      }
    }
  });

  if (last) {
    block.push({start: last, end: newText.length-1});
  }

  let inlineGrouped = [];
  for(let inlineObj of inline) {
    let existing = inlineGrouped.find(obj => obj.start === inlineObj.start);
    if (existing) {
      existing.cols.push(inlineObj.col);
    } else {
      inlineGrouped.push({start: inlineObj.start, cols: [inlineObj.col]});
    }
  }

  let highlight = [...block, ...inlineGrouped].sort((a, b) => b.start - a.start);

  return {
    highlight,
    text: newText.join("\n").replace(/\s+$/, '')
  };

};
