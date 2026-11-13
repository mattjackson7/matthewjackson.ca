/* Page navigator: a small live figure beside the page whose shape fits the
   topic (a binomial tree, a loss distribution, an efficient frontier, a
   timeline). Each section of the page is a node on the figure's path, and a
   particle tracks your place as you scroll.

   Drag or flick the particle along the path: the release velocity is
   projected forward (as iOS does with flicks) and the particle settles on the
   node nearest that projected point on a damped spring, carrying the page with
   it. Tap a node to go straight there. Pulling outward hands the gesture to
   the site map. Desktop: a figure on the right. Touch and narrower screens:
   a bar along the bottom.

   Usage:
     PathNav.create({
       name: 'Binomial tree',
       sections: [{ id: 'overview', label: 'Overview' }, ...],
       cross: function (s, a) { return b; }, // 0..1 across the path at section coordinate s (a along it)
       decor: function (d) { ... },        // draw the static figure (d.el, d.toPx, d.a)
       update: function (d, s) { ... }     // optional, called on every frame
     });

   Coordinates: a runs along the path (0..1, page order), b runs across it
   (0 = the baseline: the screen edge on desktop, the bottom of the bar on touch). */
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';

  function create(cfg) {
    var sections = cfg.sections.map(function (s) { return document.getElementById(s.id); });
    if (sections.some(function (s) { return !s; })) return null;

    var N = sections.length, MAX = N - 1;
    var root = document.documentElement;
    var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    var barMQ = window.matchMedia('(max-width: 1099px), (pointer: coarse)');

    var TAU = 0.16;                 // flick projection: landing = s + v * TAU
    var OMEGA = 2 * Math.PI * 1.25; // spring natural frequency (rad/s)
    var ZETA = 0.9;                 // damping ratio, just under critical
    var VMAX = 6;                   // cap on carried velocity (nodes per second)
    var EDGE = 16;                  // inset of the first and last node (px)
    var INSET = 12;                 // inset across the path (px)
    var DRAG_SLOP = 5;              // px before a press becomes a drag

    function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
    function el(tag, attrs, parent) {
      var n = document.createElementNS(SVGNS, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(n);
      return n;
    }

    /* ---------- DOM ---------- */
    var nav = document.createElement('nav');
    nav.className = 'pnav';
    nav.setAttribute('aria-label', 'Sections of this page');

    var svg = el('svg', { 'class': 'pnav-svg', 'aria-hidden': 'true' });
    var decorG = el('g', { 'class': 'decor' }, svg);
    var path = el('path', { 'class': 'path' }, svg);
    var nodesG = el('g', {}, svg);
    var ghost = el('circle', { 'class': 'ghost', r: 9 }, svg);
    var particle = el('g', {}, svg);
    var particleIn = el('g', { 'class': 'particle-in' }, particle);
    el('circle', { 'class': 'halo', r: 6 }, particleIn);
    el('circle', { 'class': 'core', r: 3.8 }, particleIn);
    nav.appendChild(svg);

    var list = document.createElement('ol');
    var nodes = [];
    var links = cfg.sections.map(function (sec, i) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + sec.id;
      a.className = 'well';
      a.draggable = false; // otherwise a mouse drag picks up the link itself
      var lbl = document.createElement('span');
      lbl.className = 'lbl';
      lbl.textContent = sec.label;
      a.appendChild(lbl);
      li.appendChild(a);
      list.appendChild(li);
      nodes.push(el('circle', { 'class': 'node', r: 3.6 }, nodesG));
      return a;
    });
    nav.appendChild(list);

    var name = document.createElement('div');
    name.className = 'pnav-name';
    name.setAttribute('aria-hidden', 'true');
    name.textContent = cfg.name || '';
    nav.appendChild(name);
    var cap = document.createElement('div');
    cap.className = 'pnav-cap';
    cap.setAttribute('aria-hidden', 'true');
    nav.appendChild(cap);

    document.body.appendChild(nav);
    document.body.classList.add('has-pnav');

    /* ---------- Geometry ---------- */
    var vertical = true, W = 0, H = 0, L = 1, spacing = 1;
    var anchors = sections.map(function () { return 0; });

    function along(s) { return (EDGE + s * spacing) / L; }
    function toPx(a, b) {
      return vertical
        ? [W - INSET - b * (W - 2 * INSET), a * H]
        : [a * W, H - INSET - b * (H - 2 * INSET)];
    }
    // the across-axis position; cross(s, a) gets both the section coordinate and a
    function crossAt(s) { var c = clamp(s, 0, MAX); return cfg.cross(c, along(c)); }
    function point(s) { return toPx(along(s), crossAt(s)); }

    var helper = {
      el: el,
      toPx: toPx,
      a: along,
      cross: crossAt,
      N: N,
      get vertical() { return vertical; },
      get W() { return W; },
      get H() { return H; }
    };

    function layout() {
      vertical = !barMQ.matches;
      var r = nav.getBoundingClientRect();
      W = r.width;
      H = r.height;
      L = vertical ? H : W;
      spacing = (L - 2 * EDGE) / MAX;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

      while (decorG.firstChild) decorG.removeChild(decorG.firstChild);
      if (cfg.decor) cfg.decor(Object.assign({ g: decorG }, helper));

      var d = '';
      for (var k = 0; k <= MAX * 20; k++) {
        var p = point(k / 20);
        d += (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
      }
      path.setAttribute('d', d);

      links.forEach(function (a, i) {
        var p = point(i);
        nodes[i].setAttribute('cx', p[0]);
        nodes[i].setAttribute('cy', p[1]);
        var start = EDGE + (i - 0.5) * spacing + 'px';
        var size = spacing + 'px';
        a.style.top = vertical ? start : '0';
        a.style.height = vertical ? size : '100%';
        a.style.left = vertical ? '0' : start;
        a.style.width = vertical ? '100%' : size;
      });
      measure();
      render();
    }

    // where each section settles: its top, just under the header
    function measure() {
      var pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
      var maxY = Math.max(0, root.scrollHeight - window.innerHeight);
      anchors = sections.map(function (sec, i) {
        if (i === 0) return 0;
        return Math.min(maxY, sec.getBoundingClientRect().top + window.scrollY - pad);
      });
      for (var i = 1; i <= MAX; i++) {
        if (anchors[i] <= anchors[i - 1]) anchors[i] = anchors[i - 1] + 1;
      }
    }
    function yFor(s) {
      s = clamp(s, 0, MAX);
      var i = Math.min(MAX - 1, Math.floor(s));
      return anchors[i] + (s - i) * (anchors[i + 1] - anchors[i]);
    }
    function sFor(y) {
      if (y <= anchors[0]) return 0;
      for (var i = 0; i < MAX; i++) {
        if (y < anchors[i + 1]) return i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
      }
      return MAX;
    }

    /* ---------- State ---------- */
    // mode: 'idle' follows the page, 'drag' follows the pointer,
    // 'settle' runs the spring, 'hold' pauses a spring under a finger
    var mode = 'idle';
    var s = 0, v = 0, target = 0, preview = -1, current = -1, shownCap = '';
    var noiseX = 0, noiseY = 0, speed = 0, prevS = 0;
    var lastFrame = 0, lastScroll = 0, raf = 0;

    function takeScroll() { root.style.scrollBehavior = 'auto'; }
    function releaseScroll() { root.style.scrollBehavior = ''; }
    function scrollToS(x) { window.scrollTo(0, yFor(x)); }
    function finish() { mode = 'idle'; v = 0; releaseScroll(); }

    function go(i, focusAfter) {
      measure();
      target = i;
      if (mode === 'idle') s = sFor(window.scrollY);
      takeScroll();
      if (reduceMQ.matches) { s = i; scrollToS(i); finish(); }
      else mode = 'settle';
      if (focusAfter) {
        var sec = sections[i];
        if (!sec.hasAttribute('tabindex')) sec.setAttribute('tabindex', '-1');
        sec.focus({ preventScroll: true });
      }
      kick();
    }

    function cancel() {
      if (mode !== 'settle') return;
      finish();
      s = sFor(window.scrollY);
      kick();
    }

    /* ---------- Animation ---------- */
    function gauss() {
      var a = 0, b = 0;
      while (a === 0) a = Math.random();
      while (b === 0) b = Math.random();
      return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    function frame(now) {
      raf = 0;
      var dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 1 / 60;
      lastFrame = now;

      if (mode === 'settle') {
        var acc = -OMEGA * OMEGA * (s - target) - 2 * ZETA * OMEGA * v;
        v += acc * dt;
        s += v * dt;
        if (Math.abs(s - target) < 0.002 && Math.abs(v) < 0.02) {
          s = target;
          scrollToS(s);
          finish();
        } else {
          scrollToS(s);
        }
      } else if (mode === 'idle') {
        s = sFor(window.scrollY);
      }

      // Brownian jitter, an Ornstein-Uhlenbeck process whose size follows speed
      var inst = Math.abs(s - prevS) / dt;
      prevS = s;
      speed += (inst - speed) * Math.min(1, dt * 8);
      var amp = reduceMQ.matches ? 0 : Math.min(1, speed / 3) * 2;
      var theta = 14, k = amp * Math.sqrt(2 * theta * dt);
      noiseX += -theta * noiseX * dt + k * gauss();
      noiseY += -theta * noiseY * dt + k * gauss();

      render();

      var busy = mode !== 'idle' || speed > 0.02 ||
        Math.abs(noiseX) + Math.abs(noiseY) > 0.05 || now - lastScroll < 200;
      if (busy) kick();
      else lastFrame = 0;
    }

    function render() {
      var p = toPx(along(clamp(s, -0.4, MAX + 0.4)), crossAt(s));
      particle.setAttribute('transform',
        'translate(' + (p[0] + noiseX).toFixed(2) + ' ' + (p[1] + noiseY).toFixed(2) + ')');

      // a section stays current until the next one reaches the top
      var here = clamp(Math.floor(s + 0.03), 0, MAX);
      if (here !== current) {
        if (current >= 0) {
          links[current].removeAttribute('aria-current');
          nodes[current].setAttribute('class', 'node');
        }
        links[here].setAttribute('aria-current', 'true');
        nodes[here].setAttribute('class', 'node on');
        current = here;
      }

      var show = mode === 'drag' ? preview : -1;
      links.forEach(function (a, i) { a.classList.toggle('target', i === show); });
      if (show >= 0) {
        var g = point(show);
        ghost.setAttribute('cx', g[0]);
        ghost.setAttribute('cy', g[1]);
      }

      var c = show >= 0
        ? '→ <b>' + cfg.sections[show].label + '</b>'
        : pad2(here + 1) + ' / ' + pad2(N) + '&ensp;<b>' + cfg.sections[here].label + '</b>';
      if (c !== shownCap) { cap.innerHTML = c; shownCap = c; }

      if (cfg.update) cfg.update(Object.assign({ g: decorG }, helper), clamp(s, 0, MAX));
    }
    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    /* ---------- Pointer: drag, flick, tap ---------- */
    var press = null, suppressClick = false, samples = [];

    function coord(e) { return vertical ? e.clientY : e.clientX; }
    function rubber(x) {
      if (x < 0) return -0.3 * (1 - Math.exp(x / 0.3));
      if (x > MAX) return MAX + 0.3 * (1 - Math.exp(-(x - MAX) / 0.3));
      return x;
    }
    function velocity() {
      if (samples.length < 2) return 0;
      var a = samples[0], b = samples[samples.length - 1];
      var dt = (b.t - a.t) / 1000;
      return dt > 0.01 ? (b.s - a.s) / dt : 0;
    }
    // velocity over the last 80ms of movement; zero if the pointer sat still
    // for a moment before lifting, so a deliberate placement doesn't fling
    function releaseVelocity(now) {
      if (!samples.length || now - samples[samples.length - 1].t > 100) return 0;
      return velocity();
    }

    nav.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (mode === 'settle') { mode = 'hold'; v = 0; }
      press = { id: e.pointerId, start: coord(e), sx: e.clientX, sy: e.clientY, s0: s, raw: s, dragging: false };
      nav.classList.remove('intro');
      nav.classList.add('active');
      kick();
    });

    window.addEventListener('pointermove', function (e) {
      if (!press || e.pointerId !== press.id) return;
      var c = coord(e);
      if (!press.dragging) {
        var alongPx = Math.abs(c - press.start);
        // pulling outward, away from the screen edge, hands the gesture to the site map
        var out = vertical ? press.sx - e.clientX : press.sy - e.clientY;
        if (out > 18 && out > alongPx) {
          var claimed = !document.dispatchEvent(new CustomEvent('mapgesture', {
            cancelable: true,
            detail: { pointerId: e.pointerId, x: e.clientX, y: e.clientY }
          }));
          if (claimed) {
            if (mode === 'hold') mode = 'settle';
            press = null;
            nav.classList.remove('active');
            kick();
            return;
          }
        }
        if (alongPx < DRAG_SLOP || out > alongPx) return;
        press.dragging = true;
        press.start = c;
        press.s0 = mode === 'idle' ? sFor(window.scrollY) : s;
        mode = 'drag';
        samples = [];
        takeScroll();
        measure();
        nav.setPointerCapture(e.pointerId);
        nav.classList.add('dragging');
      }
      press.raw = press.s0 + (c - press.start) / spacing;
      s = rubber(press.raw);
      samples.push({ t: e.timeStamp, s: press.raw });
      while (samples.length && e.timeStamp - samples[0].t > 80) samples.shift();
      preview = clamp(Math.round(press.raw + velocity() * TAU), 0, MAX);
      scrollToS(s);
      kick();
    });

    function endPress(e, cancelled) {
      if (!press || e.pointerId !== press.id) return;
      nav.classList.remove('active', 'dragging');
      if (press.dragging) {
        v = clamp(releaseVelocity(e.timeStamp), -VMAX, VMAX);
        target = clamp(Math.round(press.raw + v * TAU), 0, MAX);
        if (reduceMQ.matches) { s = target; scrollToS(s); finish(); }
        else mode = 'settle';
        if (!cancelled) {
          suppressClick = true;
          setTimeout(function () { suppressClick = false; }, 60);
        }
      } else if (mode === 'hold') {
        mode = 'settle';
      }
      press = null;
      samples = [];
      kick();
    }
    nav.addEventListener('dragstart', function (e) { e.preventDefault(); });
    window.addEventListener('pointerup', function (e) { endPress(e, false); });
    window.addEventListener('pointercancel', function (e) { endPress(e, true); });

    // every in-page link to a section rides the same spring
    var ids = cfg.sections.map(function (x) { return x.id; });
    document.addEventListener('click', function (e) {
      if (suppressClick && nav.contains(e.target)) { e.preventDefault(); return; }
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var i = ids.indexOf(a.getAttribute('href').slice(1));
      if (i < 0) return;
      e.preventDefault();
      go(i, e.detail === 0);
    });

    /* ---------- Page events ---------- */
    window.addEventListener('scroll', function () { lastScroll = performance.now(); kick(); }, { passive: true });
    window.addEventListener('wheel', cancel, { passive: true });
    document.addEventListener('touchstart', function (e) { if (!nav.contains(e.target)) cancel(); }, { passive: true });
    document.addEventListener('keydown', function (e) {
      if (/^(Arrow(Up|Down)|Page(Up|Down)|Home|End| )$/.test(e.key)) cancel();
    });
    window.addEventListener('resize', layout);
    if (barMQ.addEventListener) barMQ.addEventListener('change', layout);
    if (window.ResizeObserver) new ResizeObserver(measure).observe(document.body);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    layout();
    s = prevS = sFor(window.scrollY);
    render();

    // on the bottom bar, show the labels briefly so the bar announces itself
    if (barMQ.matches) {
      nav.classList.add('intro');
      setTimeout(function () { nav.classList.remove('intro'); }, 2400);
    }
    return { go: go };
  }

  window.PathNav = { create: create };
})();
