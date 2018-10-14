module.exports = function makeHighlight(ranges) {

  if (!ranges || !ranges.length) {
    return '';
  }

  let results = [];

  for (let range of ranges) {

    let mask = `<code class="block-highlight${range.cols ? ' block-highlight_inline' : ''}" data-start="${range.start}">`;

    mask += '\n'.repeat(range.start);

    if (range.end) {
      mask += `<code class="mask">${'\n'.repeat(range.end - range.start + 1)}</code>`;
    } else if (range.cols) {
      for (let i = 0; i < range.cols.length; i++) {
        let col = range.cols[i];
        let prevCol = (i === 0) ? null : range.cols[i - 1];
        mask += ' '.repeat((prevCol ? (col.start - prevCol.end) : col.start));
        mask += `<code class="mask-inline">${' '.repeat(col.end - col.start)}</code>`;
      }
    }

    mask += '</code>';

    results.push(mask);
  }

  // first bigger (lower) block
  // results.reverse();

  return results.join('');

};
