/* Sandboxes: the "try it" panels at the end of each project page.
   Shared pieces: sliders, toggle chips, live readouts, and a canvas loop that
   eases every drawn value toward its target, so nothing jumps.
   Exposed as window.Sandbox; each page's own file builds its panel. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var uid = 0;

  function el(tag, cls, parent, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    if (parent) parent.appendChild(n);
    return n;
  }

  // a labelled range input with its value shown beside the name
  function slider(parent, o) {
    var id = 'sb-' + (++uid);
    var wrap = el('div', 'sb-ctl', parent);
    var head = el('div', 'sb-head', wrap);
    var lab = el('label', '', head, o.label);
    lab.htmlFor = id;
    var out = el('output', 'sb-val', head);
    out.htmlFor = id;
    var inp = el('input', '', wrap);
    inp.type = 'range'; inp.id = id;
    inp.min = o.min; inp.max = o.max; inp.step = o.step; inp.value = o.value;
    function show() {
      var v = +inp.value;
      out.innerHTML = o.fmt(v);
      inp.setAttribute('aria-valuetext', out.textContent);
      inp.style.setProperty('--f', ((v - o.min) / (o.max - o.min)).toFixed(4));
    }
    inp.addEventListener('input', function () { show(); o.onInput(+inp.value); });
    show();
    return { input: inp, set: function (v) { inp.value = v; show(); } };
  }

  // a row of mutually exclusive chips
  function chips(parent, o) {
    var wrap = el('div', 'sb-ctl', parent);
    el('div', 'sb-head', wrap, '<span>' + o.label + '</span>');
    var row = el('div', 'sb-chips', wrap);
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', o.label.replace(/<[^>]+>/g, ''));
    var btns = o.options.map(function (op) {
      var b = el('button', 'chip', row, op.label);
      b.type = 'button';
      b.addEventListener('click', function () { set(op.v); o.onChange(op.v); });
      b.__v = op.v;
      return b;
    });
    function set(v) { btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.__v === v)); }); }
    set(o.value);
    return { set: set };
  }

  // live readouts: a definition list whose values are set by key
  function readouts(dl, items) {
    var cells = {};
    items.forEach(function (it) {
      var d = el('div', '', dl);
      el('dt', '', d, it.label);
      cells[it.key] = el('dd', '', d, '&ndash;');
    });
    return function (vals) { for (var k in vals) if (cells[k] && cells[k].innerHTML !== vals[k]) cells[k].innerHTML = vals[k]; };
  }

  // a canvas that redraws on demand and keeps animating while draw() reports motion
  function view(cv, o) {
    var c = cv.getContext('2d'), W = 0, H = 0, raf = 0, last = 0;
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.getBoundingClientRect().width || 300, h = o.height(w);
      cv.style.height = h + 'px';
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      W = w; H = h;
    }
    function frame(now) {
      raf = 0;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      c.clearRect(0, 0, W, H);
      if (o.draw(c, W, H, dt)) raf = requestAnimationFrame(frame);
      else last = 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    var rt = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { var w = W; size(); if (o.resized && w !== W) o.resized(W, H); kick(); }, 80);
    });
    size();
    kick();
    return { kick: kick, size: function () { return { w: W, h: H }; }, canvas: cv };
  }

  // exponential approach toward a target; Reduce Motion snaps straight there
  function toward(cur, tgt, dt, rate) {
    if (reduce || cur == null || !isFinite(cur)) return tgt;
    var k = 1 - Math.exp(-dt * (rate || 12));
    return cur + (tgt - cur) * k;
  }
  // the same for a whole array, in place; returns true while anything is still moving
  function towardAll(cur, tgt, dt, rate, eps) {
    var moving = false, e = eps || 1e-4;
    for (var i = 0; i < tgt.length; i++) {
      var v = toward(cur[i], tgt[i], dt, rate);
      if (Math.abs(tgt[i] - v) > e) moving = true; else v = tgt[i];
      cur[i] = v;
    }
    return moving;
  }
  function near(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-4); }

  // round a range's top up to a tidy number, and pick a tick step for it
  function niceStep(span, n) {
    var raw = span / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }

  // a reset chip that sits after the controls
  function resetButton(parent, fn) {
    var b = el('button', 'chip sb-reset', parent, 'Reset');
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  window.Sandbox = {
    reduce: reduce, el: el, slider: slider, chips: chips, readouts: readouts, view: view,
    toward: toward, towardAll: towardAll, near: near, niceStep: niceStep, resetButton: resetButton
  };
})();
