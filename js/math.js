/* Typesets the site's math with KaTeX: \( ... \) inline, \[ ... \] displayed.
   Loaded with defer after KaTeX itself, so it runs once the page is parsed,
   including the map overlay that site.js builds. Displayed equations that are
   wider than their box (on a phone, say) are scaled down to fit. */
(function () {
  if (!window.renderMathInElement) return; // without KaTeX the TeX source stays readable
  renderMathInElement(document.body, {
    delimiters: [
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false }
    ],
    ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'canvas'],
    throwOnError: false
  });

  // shrink each too-wide equation to its box, down to about 60%; past that it scrolls
  function fit() {
    document.querySelectorAll('.eq').forEach(function (box) {
      var k = box.querySelector('.katex-display > .katex') || box.querySelector('.katex');
      if (!k) return;
      k.style.fontSize = '';
      var avail = box.clientWidth - parseFloat(getComputedStyle(box).paddingLeft) - parseFloat(getComputedStyle(box).paddingRight);
      var need = k.scrollWidth;
      if (need > avail + 1) {
        var base = parseFloat(getComputedStyle(k).fontSize);
        k.style.fontSize = (base * Math.max(0.6, (avail - 2) / need)) + 'px';
      }
    });
  }
  fit();
  var t = 0;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fit, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  // typeset math changes line heights: let anything that measures the page re-measure
  window.dispatchEvent(new Event('resize'));
})();
