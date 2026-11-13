/* Results page: count-up numbers, a season-by-season figure, the cheer record
   (nationals finishes and a map of road wins), a round-off into a double full traced from video,
   a breaststroke cycle, season bests by year, and a first-year 100 raced
   against the best one. */
(function () {
  var COLORS = { swim: '#7cc4ff', cheer: '#ff8fb8', acad: '#ffd166' };
  var GOLD = '#ffd166', SILVER = '#c9d6df';
  var SEASONS = ['2021–22', '2022–23', '2023–24', '2024–25', '2025–26'];
  // the cheer record, by season index (0 is 2021–22)
  var CHEER = {
    1: { place: 2, road: 'Nashville', short: 'NSH' },
    2: { place: 1, road: 'Nashville', short: 'NSH' },
    3: { place: 1, road: 'Virginia Beach', short: 'VB' },
    4: { place: 1, road: 'Montreal', short: 'MTL', captain: true }
  };
  var TRACKS = [
    { id: 'cheer', name: 'Cheerleading', icon: 'trophy', seasons: [1, 2, 3, 4] },
    { id: 'swim', name: 'Swimming', icon: 'wave', seasons: [0, 1, 2, 3, 4] },
    { id: 'acad', name: 'All-Canadian', icon: 'medal', seasons: [0, 1, 3, 4] }
  ];
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ord(n) { return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th'; }
  function mk(svg) {
    return function (tag, attrs, parent, text) {
      var n = document.createElementNS(NS, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      if (text) n.textContent = text;
      (parent || svg).appendChild(n);
      return n;
    };
  }
  function icon(el, name, x, y, s, col, parent) {
    var u = el('use', { href: '#i-' + name, x: x, y: y, width: s, height: s, color: col }, parent);
    u.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#i-' + name);
    return u;
  }
  // run a canvas animation only while it is on screen
  function whenVisible(node, start, stop) {
    if (!window.IntersectionObserver) { start(); return; }
    new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }, { threshold: 0.15 }).observe(node);
  }
  function setupCanvas(cv, hh) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.getBoundingClientRect().width;
    cv.style.height = hh + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr);
    var c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c: c, w: w, h: hh };
  }

  /* ---------- Navigator ---------- */
  if (window.PathNav) {
    PathNav.create({
      name: 'Seasons',
      sections: [{ id: 'overview', label: 'Overview' }, { id: 'cheer', label: 'Cheerleading' }, { id: 'swim', label: 'Swimming' }],
      cross: function () { return 0.1; },
      decor: function (d) {
        [1, 2, 3, 4].forEach(function (k) {
          var p = d.toPx(d.a(1), 0.22 + k * 0.15);
          d.el('circle', { cx: p[0], cy: p[1], r: 3, fill: CHEER[k].place === 1 ? GOLD : SILVER }, d.g);
        });
        [0, 1, 2, 3, 4].forEach(function (k) {
          var p = d.toPx(d.a(2), 0.22 + k * 0.15);
          d.el('circle', { cx: p[0], cy: p[1], r: 2.2, fill: COLORS.swim, 'fill-opacity': 0.7 }, d.g);
        });
      }
    });
  }

  /* ---------- Count-up numbers ---------- */
  var stats = document.querySelectorAll('.res-stats [data-count]');
  function countUp(el) {
    var to = +el.getAttribute('data-count'), pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '';
    if (reduce) { el.innerHTML = pre + to + suf; return; }
    var t0 = 0;
    (function step(now) {
      if (!t0) t0 = now;
      var u = Math.min(1, (now - t0) / 1100), e = 1 - Math.pow(1 - u, 3);
      el.innerHTML = pre + Math.round(to * e) + suf;
      if (u < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); countUp(e.target); } });
    }, { threshold: 0.6 });
    [].forEach.call(stats, function (s) { s.innerHTML = (s.getAttribute('data-prefix') || '') + '0' + (s.getAttribute('data-suffix') || ''); io.observe(s); });
  }

  /* ---------- Season figure ---------- */
  var svg = document.getElementById('seasons'), read = document.getElementById('season-read');
  var rows = {}, cols = [], activeRow = null, activeCol = null;
  var el = mk(svg);
  var SEASON_TEXT = [
    'swimming; Academic All-Canadian.',
    'second at cheer nationals and a win in Nashville; swimming; Academic All-Canadian.',
    'national champions and a second win in Nashville; swimming.',
    'national champions and a win in Virginia Beach; swimming; Academic All-Canadian.',
    'national champions and a win in Montreal, as captain; swimming; Academic All-Canadian.'
  ];
  function draw() {
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    rows = {}; cols = [];
    var w = svg.getBoundingClientRect().width || 800, narrow = w < 560;
    var LW = narrow ? 30 : 128, TOP = 10, ROW = narrow ? 54 : 60, AX = 30, R = 6;
    var h = TOP + TRACKS.length * ROW + AX;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('height', h);
    var cw = (w - LW - R) / SEASONS.length;
    var X = function (k) { return LW + k * cw; };
    SEASONS.forEach(function (s, k) {
      var g = el('g', { 'class': 'scol', tabindex: 0, 'data-k': k });
      el('rect', { 'class': 'shade', x: X(k) + 2, y: TOP - 4, width: cw - 4, height: h - TOP - AX + 8, rx: 6 }, g);
      el('text', { x: X(k) + cw / 2, y: h - 9, 'text-anchor': 'middle' }, g, narrow ? s.slice(2, 4) + '–' + s.slice(-2) : s);
      cols.push(g);
      g.addEventListener('pointerenter', function () { setCol(k); });
      g.addEventListener('focus', function () { setCol(k); });
      g.addEventListener('click', function () { setCol(k); });
      g.addEventListener('pointerleave', function () { setCol(null); });
    });
    TRACKS.forEach(function (t, i) {
      var yy = TOP + i * ROW + ROW / 2 - 4, col = COLORS[t.id];
      var g = el('a', { href: t.id === 'acad' ? '#overview' : '#' + t.id, 'class': 'srow', style: 'color:' + col, 'aria-label': t.name });
      icon(el, t.icon, 4, yy - 9, 18, col, g);
      if (!narrow) el('text', { 'class': 'lbl', x: 28, y: yy + 4.5 }, g, t.name);
      t.seasons.forEach(function (k) {
        var x0 = X(k) + 6, x1 = X(k + 1) - 6, cx = (x0 + x1) / 2;
        var marked = t.id !== 'swim';
        el('rect', { 'class': 'bar', x: x0, y: yy - 5, width: x1 - x0, height: 10, rx: 5, style: 'fill:' + col + ';fill-opacity:' + (marked ? 0.9 : 0.6) }, g);
        if (t.id === 'cheer') {
          var r = CHEER[k], mc = r.place === 1 ? GOLD : SILVER;
          el('circle', { cx: cx, cy: yy, r: 13, fill: '#07222e', stroke: mc, 'stroke-width': 1.6 }, g);
          if (r.place === 1) icon(el, 'trophy', cx - 8, yy - 8, 16, mc, g);
          else el('text', { x: cx, y: yy + 4, 'text-anchor': 'middle', 'class': 'place', style: 'fill:' + mc }, g, '2nd');
          if (r.captain) {
            el('circle', { cx: cx + 12, cy: yy - 11, r: 7.5, style: 'fill:' + col }, g);
            el('text', { x: cx + 12, y: yy - 7.5, 'text-anchor': 'middle', 'class': 'cap' }, g, 'C');
          }
          el('text', { x: cx, y: yy + 27, 'text-anchor': 'middle', 'class': 'road' }, g, narrow ? r.short : 'won ' + r.road);
        } else if (t.id === 'acad') {
          el('circle', { cx: cx, cy: yy, r: 13, fill: '#07222e', stroke: col, 'stroke-width': 1.6 }, g);
          icon(el, 'medal', cx - 8, yy - 8, 16, col, g);
        }
      });
      rows[t.id] = g;
    });
    setRow(activeRow, true); setCol(activeCol, true);
  }
  function setRow(id, force) {
    if (id === activeRow && !force) return;
    activeRow = id;
    for (var k in rows) rows[k].classList.toggle('on', k === id);
    if (svg) svg.classList.toggle('has-on', !!id);
  }
  function setCol(k, force) {
    if (k === activeCol && !force) return;
    activeCol = k;
    cols.forEach(function (g, i) { g.classList.toggle('on', i === k); });
    if (read) read.innerHTML = k == null ? 'Fig. 1. Five seasons, three tracks. Hover or tap a season to read it.' : '<b>' + SEASONS[k] + '</b>: ' + SEASON_TEXT[k];
  }
  if (svg) {
    draw();
    window.addEventListener('resize', draw);
    var secs = ['cheer', 'swim'].map(function (id) { return document.getElementById(id); });
    var onScroll = function () {
      var line = window.innerHeight * 0.45, best = null;
      secs.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.top < line && r.bottom > line * 0.4) best = s.id; });
      setRow(best);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Nationals: finish by season ---------- */
  var nats = document.getElementById('nats');
  function drawNats() {
    if (!nats) return;
    var e = mk(nats);
    while (nats.firstChild) nats.removeChild(nats.firstChild);
    var w = nats.getBoundingClientRect().width || 400, h = 230, L = 46, R = 22, T = 26, B = 34;
    nats.setAttribute('viewBox', '0 0 ' + w + ' ' + h); nats.setAttribute('height', h);
    var ks = [1, 2, 3, 4];
    var X = function (i) { return L + (i + 0.5) * (w - L - R) / ks.length; };
    var Y = function (pl) { return T + (pl - 1) * (h - T - B) / 2; };
    [1, 2, 3].forEach(function (pl) {
      e('line', { x1: L, x2: w - R, y1: Y(pl), y2: Y(pl), 'class': 'grid' });
      e('text', { x: L - 10, y: Y(pl) + 4, 'text-anchor': 'end' }, null, ord(pl));
    });
    var d = ks.map(function (k, i) { return (i ? 'L' : 'M') + X(i) + ' ' + Y(CHEER[k].place); }).join('');
    e('path', { d: d, 'class': 'trace', fill: 'none', stroke: COLORS.cheer, 'stroke-width': 2.5 });
    ks.forEach(function (k, i) {
      var r = CHEER[k], mc = r.place === 1 ? GOLD : SILVER, g = e('g', { 'class': 'pt', style: 'animation-delay:' + (0.25 + i * 0.25) + 's' });
      e('circle', { cx: X(i), cy: Y(r.place), r: 15, fill: '#07222e', stroke: mc, 'stroke-width': 2 }, g);
      if (r.place === 1) icon(e, 'trophy', X(i) - 9, Y(r.place) - 9, 18, mc, g);
      else e('text', { x: X(i), y: Y(r.place) + 4, 'text-anchor': 'middle', 'class': 'place', style: 'fill:' + mc }, g, '2nd');
      e('text', { x: X(i), y: h - 10, 'text-anchor': 'middle' }, null, SEASONS[k].slice(0, 2) + SEASONS[k].slice(-2));
    });
  }

  /* ---------- Road wins: a map with flights from Guelph ---------- */
  var road = document.getElementById('roadmap');
  var CITIES = [
    { name: 'Guelph', lat: 43.55, lon: -80.25, home: true },
    { name: 'Nashville', lat: 36.16, lon: -86.78, years: '2023, 2024' },
    { name: 'Virginia Beach', lat: 36.85, lon: -75.98, years: '2025' },
    { name: 'Montreal', lat: 45.50, lon: -73.57, years: '2026' }
  ];
  function drawRoad() {
    if (!road) return;
    var e = mk(road);
    while (road.firstChild) road.removeChild(road.firstChild);
    var w = road.getBoundingClientRect().width || 400, h = Math.round(Math.max(230, Math.min(320, w * 0.62))), pad = 16;
    road.setAttribute('viewBox', '0 0 ' + w + ' ' + h); road.setAttribute('height', h);
    // equirectangular, with longitude squeezed by cos(latitude) so distances look right
    var LON0 = -90, LON1 = -70, LAT0 = 33.5, LAT1 = 48, k = Math.cos(41 * Math.PI / 180);
    var sx = (w - 2 * pad) / ((LON1 - LON0) * k), sy = (h - 2 * pad) / (LAT1 - LAT0), sc = Math.min(sx, sy);
    var ox = (w - (LON1 - LON0) * k * sc) / 2, oy = (h - (LAT1 - LAT0) * sc) / 2;
    var P = function (lat, lon) { return [ox + (lon - LON0) * k * sc, oy + (LAT1 - lat) * sc]; };
    // land, the Great Lakes and state lines (js/roadmap-geo.js, from Natural Earth)
    var GEO = window.ROADMAP_GEO;
    if (GEO) {
      var toD = function (rings) {
        return rings.map(function (r) {
          return 'M' + r.split(' ').map(function (q) { var t = q.split(','), p = P(t[1] / 100, t[0] / 100); return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L') + 'Z';
        }).join('');
      };
      var landD = toD(GEO.land);
      e('path', { d: landD, 'class': 'land', 'fill-rule': 'evenodd' });
      e('path', { d: toD(GEO.states), 'class': 'states' });
      e('path', { d: landD, 'class': 'coast' });
    }
    var home = P(CITIES[0].lat, CITIES[0].lon);
    // labels go wherever they fit: inside the figure and clear of every marker and earlier label
    var taken = [[home[0] - 11, home[1] - 11, home[0] + 11, home[1] + 11]];
    CITIES.slice(1).forEach(function (cty) { var q = P(cty.lat, cty.lon); taken.push([q[0] - 13, q[1] - 13, q[0] + 13, q[1] + 13]); });
    function hits(b) { return taken.reduce(function (n, t) { var ox = Math.min(b[2], t[2]) - Math.max(b[0], t[0]), oy = Math.min(b[3], t[3]) - Math.max(b[1], t[1]); return n + (ox > 0 && oy > 0 ? ox * oy : 0); }, 0); }
    function out(b) { return Math.max(0, 2 - b[0]) + Math.max(0, b[2] - (w - 2)) + Math.max(0, 2 - b[1]) + Math.max(0, b[3] - (h - 2)); }
    function place(p, lines, g, prefer) {
      var C = { right: [16, -1, 'start'], left: [-16, -1, 'end'], below: [0, 27, 'middle'], above: [0, -16 - 13 * (lines.length - 1), 'middle'] };
      var order = [prefer, 'right', 'left', 'below', 'above'].filter(function (v, i, a) { return a.indexOf(v) === i; });
      var best = null;
      order.forEach(function (o) {
        if (best && best.score === 0) return;
        var c = C[o], els = lines.map(function (l, i) { return e('text', { x: p[0] + c[0], y: p[1] + c[1] + i * 13, 'text-anchor': c[2], 'class': l[1] }, g, l[0]); });
        var b = els.reduce(function (r, el) { var q = el.getBBox(); return [Math.min(r[0], q.x), Math.min(r[1], q.y), Math.max(r[2], q.x + q.width), Math.max(r[3], q.y + q.height)]; }, [1e9, 1e9, -1e9, -1e9]);
        var score = hits(b) + out(b) * 50;
        if (!best || score < best.score) { if (best) best.els.forEach(function (el) { el.remove(); }); best = { els: els, b: b, score: score }; }
        else els.forEach(function (el) { el.remove(); });
      });
      taken.push(best.b);
    }
    CITIES.slice(1).forEach(function (cty, i) {
      var p = P(cty.lat, cty.lon), mx = (home[0] + p[0]) / 2, my = (home[1] + p[1]) / 2;
      var dx = p[0] - home[0], dy = p[1] - home[1], len = Math.hypot(dx, dy);
      var cx = mx + dy / len * len * 0.25, cy = my - dx / len * len * 0.25;
      e('path', { d: 'M' + home[0] + ' ' + home[1] + 'Q' + cx + ' ' + cy + ' ' + p[0] + ' ' + p[1], 'class': 'flight', pathLength: 1, style: 'animation-delay:' + (0.2 + i * 0.35) + 's' });
    });
    e('circle', { cx: home[0], cy: home[1], r: 5, fill: COLORS.cheer });
    e('circle', { cx: home[0], cy: home[1], r: 10, fill: 'none', stroke: COLORS.cheer, 'stroke-opacity': 0.5 });
    place(home, [['Guelph', 'city']], null, 'left');
    CITIES.slice(1).forEach(function (cty, i) {
      var p = P(cty.lat, cty.lon);
      var g = e('g', { 'class': 'pt', style: 'animation-delay:' + (0.9 + i * 0.35) + 's' });
      e('circle', { cx: p[0], cy: p[1], r: 11, fill: '#07222e', stroke: GOLD, 'stroke-width': 1.5 }, g);
      icon(e, 'trophy', p[0] - 7, p[1] - 7, 14, GOLD, g);
      place(p, [[cty.name, 'city'], [cty.years, 'yrs']], g, p[0] < w * 0.62 ? 'right' : 'left');
    });
    // faint region names, only where they don't touch anything else
    if (GEO) [[47.3, -79.5, 'CANADA'], [34.4, -82.6, 'UNITED STATES'], [35.6, -71.2, 'ATLANTIC']].forEach(function (r) {
      var q = P(r[0], r[1]), t = e('text', { x: q[0], y: q[1], 'text-anchor': 'middle', 'class': 'region' }, null, r[2]);
      var bb = t.getBBox(), b = [bb.x - 3, bb.y - 2, bb.x + bb.width + 3, bb.y + bb.height + 2];
      if (hits(b) > 0 || out(b) > 0) t.remove(); else road.insertBefore(t, road.querySelector('.flight'));
    });
  }
  [nats, road].forEach(function (n) {
    if (!n) return;
    if (window.IntersectionObserver && !reduce) {
      var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); n.classList.add('go'); } }, { threshold: 0.4 });
      o.observe(n);
    } else n.classList.add('go');
  });
  drawNats(); drawRoad();
  window.addEventListener('resize', function () { drawNats(); drawRoad(); });

  /* ---------- Round-off into a double full: traced from video ---------- */
  var tuckCv = document.getElementById('tuck'), graphCv = document.getElementById('tgraph');
  if (tuckCv && graphCv) (function () {
    // 69 frames at 30 fps from a phone clip, rebuilt in 3D (js/tumble3d-data.js): joints from a pose model,
    // corrected by hand; the camera's pan, tilt, roll, zoom and drift measured from the background and the
    // floor lines; every joint on its line of sight, with fixed bone lengths, a torso that can twist, and in
    // the air a gravity parabola and steady spin. Drawn as a person by js/tumble3d.js.
    var DATA = window.TUMBLE3D;
    if (!DATA) return;
    var FR = DATA.X, VARS = DATA.vars, T0 = DATA.t0, DT = 1 / 30, END = T0 + (FR.length - 1) * DT;
    // phases by time from take-off (s)
    var PH = [['Run-in', T0, -0.75], ['Round-off', -0.75, -0.3], ['Snap-down', -0.3, 0], ['Double full', 0, 0.8], ['Landing', 0.8, END + 0.01]];
    var META = {
      h: { name: 'Height of centre of mass', short: 'Height', unit: 'm', dp: 2 },
      spd: { name: 'Speed along the floor', short: 'Speed', unit: 'm/s', dp: 2 },
      dist: { name: 'Distance covered', short: 'Distance', unit: 'm', dp: 2 },
      rot: { name: 'Flip rotation', short: 'Flip', unit: '°', dp: 0 },
      rotv: { name: 'Flip speed', short: 'Flip speed', unit: '°/s', dp: 0 },
      tw: { name: 'Twist', short: 'Twist', unit: '°', dp: 0 },
      twv: { name: 'Twist speed', short: 'Twist speed', unit: '°/s', dp: 0 }
    };
    var which = 'h', slow = true, raf = 0, last = 0, clock = T0 - 0.3, scrub = null, GA = null, GG = null, gbox = null;
    function at(arr, t) {
      var f = Math.max(0, Math.min(arr.length - 1, (t - T0) / DT)), i = Math.min(arr.length - 2, Math.floor(f)), e = f - i;
      return arr[i] + (arr[i + 1] - arr[i]) * e;
    }
    function phaseAt(t) { for (var i = 0; i < PH.length; i++) if (t < PH[i][2]) return PH[i][0]; return 'Landing'; }
    function fmt(v, m) { return (v < 0 && Math.abs(v) >= Math.pow(10, -m.dp) / 2 ? '−' : '') + Math.abs(v).toFixed(m.dp) + (m.unit === '°' || m.unit === '°/s' ? '' : ' ') + m.unit; }
    function niceStep(r) { var p = Math.pow(10, Math.floor(Math.log10(r / 4))), s = r / 4 / p; return (s < 1.5 ? 1 : s < 3.5 ? 2 : s < 7.5 ? 5 : 10) * p; }
    function now() { return scrub !== null ? scrub : Math.max(T0, Math.min(END, clock)); }

    // the 3D scene (three.js), with every variable as a live counter in the corner
    var T3 = null, t3tried = false, hud = document.getElementById('t3-hud'), hudRows = {}, hudTime = null;
    if (hud) {
      hudTime = document.createElement('p'); hudTime.className = 't3-time'; hud.parentNode.appendChild(hudTime);
      ['h', 'spd', 'dist', 'rot', 'rotv', 'tw', 'twv'].forEach(function (k) {
        var r = document.createElement('button'); r.type = 'button'; r.className = 'r'; r.setAttribute('data-v', k);
        r.innerHTML = '<span>' + META[k].short + '</span><b></b>';
        r.addEventListener('click', function () { var chip = document.querySelector('.tvars button[data-v="' + k + '"]'); if (chip) chip.click(); });
        hud.appendChild(r); hudRows[k] = r;
      });
    }
    function drawScene() {
      if (!t3tried) { t3tried = true; T3 = window.Tumble3D ? window.Tumble3D.mount(tuckCv) : null; if (!T3) tuckCv.classList.add('no3d'); }
      var t = now();
      if (T3) T3.render(t);
      Object.keys(hudRows).forEach(function (k) { hudRows[k].lastChild.textContent = fmt(at(VARS[k], t), META[k]); hudRows[k].classList.toggle('on', k === which); });
      if (hudTime) hudTime.innerHTML = '<b>' + (t < 0 ? '−' : '+') + Math.abs(t).toFixed(2) + ' s</b>' + phaseAt(t) + ' · ' + (scrub !== null ? 'scrubbing' : slow ? '0.35× speed' : 'real speed');
    }

    function drawGraph() {
      var narrow = graphCv.getBoundingClientRect().width < 560;
      if (!GG) GG = setupCanvas(graphCv, narrow ? 210 : 230);
      var c = GG.c, w = GG.w, h = GG.h, t = now(), M = META[which], arr = VARS[which];
      c.clearRect(0, 0, w, h);
      var L = narrow ? 46 : 58, R = 12, top = 34, bot = h - 26;
      gbox = { x0: L, x1: w - R, y0: top, y1: bot };
      var X = function (tt) { return L + (tt - T0) / (END - T0) * (w - L - R); };
      var lo = Math.min.apply(0, arr), hi = Math.max.apply(0, arr);
      if (lo > 0 && (which === 'h' || which === 'spd' || which === 'dist' || which === 'rot' || which === 'tw')) lo = 0;
      var st = niceStep(hi - lo || 1); lo = Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st;
      var Y = function (v) { return bot - (v - lo) / (hi - lo) * (bot - top); };
      // phases as bands, the double full's flight highlighted
      PH.forEach(function (p, i) {
        var a = X(Math.max(T0, p[1])), b = X(Math.min(END, p[2]));
        if (p[0] === 'Double full') { c.fillStyle = 'rgba(255,143,184,0.09)'; c.fillRect(a, top, b - a, bot - top); }
        if (i) Viz.line(c, a, top, a, bot, 'rgba(234,246,248,0.12)', { width: 1 });
        var lab = narrow ? ['Run', 'R-off', 'Snap', 'Double full', 'Land'][i] : p[0];
        Viz.text(c, lab, (a + b) / 2, top - 8, { size: 10, color: phaseAt(t) === p[0] ? Viz.FOAM : Viz.MIST, align: 'center' });
      });
      for (var v = lo; v <= hi + st / 2; v += st) {
        Viz.line(c, L, Y(v), w - R, Y(v), 'rgba(234,246,248,0.08)', { width: 1 });
        Viz.text(c, (Math.abs(v) < st / 2 ? 0 : +v.toFixed(st < 1 ? 1 : 0)) + '', L - 6, Y(v) + 4, { size: 10, color: Viz.MIST, align: 'right' });
      }
      Viz.text(c, M.unit, 6, top - 8, { size: 10, color: Viz.MIST });
      [-1, -0.5, 0, 0.5, 1].forEach(function (tt) { if (tt < T0 || tt > END) return; Viz.text(c, (tt > 0 ? '+' : tt < 0 ? '−' : '') + Math.abs(tt) + ' s', X(tt), h - 8, { size: 10, color: Viz.MIST, align: 'center' }); });
      c.strokeStyle = COLORS.cheer; c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath();
      arr.forEach(function (v, i) { var x = X(T0 + i * DT); i ? c.lineTo(x, Y(v)) : c.moveTo(x, Y(v)); }); c.stroke();
      var val = at(arr, t), x = X(t);
      Viz.line(c, x, top, x, bot, 'rgba(234,246,248,0.35)', { width: 1 });
      Viz.dot(c, x, Y(val), 4.5, Viz.FOAM, {});
      var right = x > w - R - 90;
      Viz.text(c, fmt(val, M), x + (right ? -9 : 9), Math.max(top + 12, Y(val) - 9), { size: 12, color: Viz.FOAM, align: right ? 'right' : 'left', weight: 500 });
    }
    function render() { drawScene(); drawGraph(); }
    function frame(ts) {
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      if (scrub === null) { clock += dt * (slow ? 0.35 : 1); if (clock > END + (slow ? 0.5 : 0.8)) clock = T0 - 0.3; }
      render(); raf = requestAnimationFrame(frame);
    }
    // variable buttons
    var btns = [].slice.call(document.querySelectorAll('.tvars button'));
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        which = b.getAttribute('data-v');
        btns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        if (!raf) render();
      });
    });
    // hover or drag across the graph to scrub
    function scrubAt(ev) {
      if (!gbox) return;
      var bx = graphCv.getBoundingClientRect(), x = ev.clientX - bx.left;
      scrub = T0 + Math.max(0, Math.min(1, (x - gbox.x0) / (gbox.x1 - gbox.x0))) * (END - T0);
      if (!raf) render();
    }
    var release = function () { scrub = null; if (!raf) render(); };
    graphCv.addEventListener('pointermove', scrubAt);
    graphCv.addEventListener('pointerdown', scrubAt);
    graphCv.addEventListener('pointerleave', release);
    graphCv.addEventListener('pointerup', function (ev) { if (ev.pointerType !== 'mouse') release(); });
    graphCv.addEventListener('pointercancel', release);
    var speedBtn = document.getElementById('tuck-speed');
    if (speedBtn) speedBtn.addEventListener('click', function () {
      slow = !slow; clock = T0 - 0.3;
      speedBtn.textContent = slow ? 'Play at real speed' : 'Play in slow motion';
      if (!raf) render();
    });
    window.addEventListener('resize', function () { GG = null; render(); });
    if (reduce) { clock = 0.4; render(); return; }
    whenVisible(tuckCv, function () { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }, function () { cancelAnimationFrame(raf); raf = 0; });
    render();
  })();

  /* ---------- A breaststroke cycle, side view ---------- */
  var strokeCv = document.getElementById('stroke');
  if (strokeCv) (function () {
    var PI = Math.PI;
    // joint angles through the cycle: [phase, upper arm, forearm, thigh, shin, head lift, shoulder tilt]
    var KEYS = [
      [0.00, 0, 0, PI, PI, 0, 0],
      [0.15, -0.7, -1.5, PI, PI, 0.03, 0.05],
      [0.28, -1.9, -0.4, PI + 0.15, PI - 0.3, 0.13, 0.22],
      [0.42, -0.3, -0.1, PI + 0.9, 0.5, 0.04, 0.08],
      [0.60, 0, 0, PI, PI, 0, 0],
      [1.00, 0, 0, PI, PI, 0, 0]
    ];
    function at(ph) {
      for (var i = 0; i < KEYS.length - 1; i++) if (ph <= KEYS[i + 1][0]) break;
      var A = KEYS[i], B = KEYS[i + 1], t = (ph - A[0]) / (B[0] - A[0]), e = t * t * (3 - 2 * t);
      return A.map(function (v, j) { return v + (B[j] - v) * e; });
    }
    // a model of speed through one cycle: a surge after the kick, a smaller one
    // from the pull, and a near stall while the legs recover; mean scaled to 1
    var g = function (x, m, s) { return Math.exp(-0.5 * Math.pow((x - m) / s, 2)); };
    var raw = function (ph) { return 0.55 + 0.75 * g(ph, 0.62, 0.08) + 0.35 * g(ph, 0.22, 0.07) - 0.4 * g(ph, 0.43, 0.05) - 0.15 * g(ph, 0.95, 0.12) + 0.2 * g(ph, 0.8, 0.12); };
    var mean = 0; for (var i = 0; i < 200; i++) mean += raw((i + 0.5) / 200) / 200;
    var speed = function (ph) { return raw(ph) / mean; };
    var VBAR = 50 / 29.88, CYC = 1.25, SLOW = 0.55;
    var bubbles = []; for (i = 0; i < 40; i++) bubbles.push([Math.random(), Math.random()]);
    var raf = 0, last = 0, ph = 0, G = null;
    var PHASES = [[0.0, 0.26, 'pull'], [0.26, 0.4, 'breathe'], [0.4, 0.62, 'kick'], [0.62, 1.0, 'glide']];
    function render() {
      if (!G) G = setupCanvas(strokeCv, strokeCv.getBoundingClientRect().width < 520 ? 270 : 300);
      var c = G.c, w = G.w, h = G.h, narrow = w < 520;
      c.clearRect(0, 0, w, h);
      var topH = h * 0.56, sc = Math.min(w * 0.42, topH * 1.5), water = topH * 0.36;
      // water and the bubbles streaming past at the swimmer's speed
      c.fillStyle = 'rgba(124,196,255,0.07)'; c.fillRect(0, water, w, topH - water);
      Viz.line(c, 0, water, w, water, 'rgba(124,196,255,0.5)', { width: 1.2 });
      bubbles.forEach(function (b) { Viz.dot(c, b[0] * w, water + 8 + b[1] * (topH - water - 14), 1.3, 'rgba(234,246,248,0.35)', {}); });
      var k = at(ph), tilt = k[6];
      var cx = w * 0.56, cy = water + 0.11 * sc;
      var P = function (x, y) { return [cx + x * sc, cy - y * sc]; };
      var S = [0, 0], Hp = [-0.5 * Math.cos(tilt), -0.5 * Math.sin(tilt)];
      var E = [S[0] + 0.17 * Math.cos(k[1]), S[1] + 0.17 * Math.sin(k[1])], Hd = [E[0] + 0.17 * Math.cos(k[2]), E[1] + 0.17 * Math.sin(k[2])];
      var Kn = [Hp[0] + 0.24 * Math.cos(k[3]), Hp[1] + 0.24 * Math.sin(k[3])], Ft = [Kn[0] + 0.23 * Math.cos(k[4]), Kn[1] + 0.23 * Math.sin(k[4])];
      var Nk = [S[0] + 0.1 * Math.cos(tilt + 0.1), S[1] + 0.1 * Math.sin(tilt + 0.1) + k[5]];
      var Q = function (q) { return P(q[0], q[1]); };
      c.strokeStyle = COLORS.swim; c.lineWidth = narrow ? 3 : 3.5; c.lineCap = c.lineJoin = 'round';
      c.beginPath();
      var pts = [Ft, Kn, Hp, S, E, Hd].map(Q);
      c.moveTo(pts[0][0], pts[0][1]); for (i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.stroke();
      var hd = Q(Nk), sh = Q(S); c.beginPath(); c.moveTo(sh[0], sh[1]); c.lineTo(hd[0], hd[1]); c.stroke();
      c.beginPath(); c.arc(hd[0], hd[1], 0.05 * sc, 0, 2 * PI); c.fillStyle = '#07222e'; c.fill(); c.stroke();
      // the speed trace underneath, one cycle wide
      var L = narrow ? 10 : 46, R = 10, y0 = topH + 18, y1 = h - 26;
      var X = function (p) { return L + p * (w - L - R); }, Y = function (v) { return y1 - (v - 0.2) / 1.6 * (y1 - y0); };
      PHASES.forEach(function (q) {
        var on = ph >= q[0] && ph < q[1];
        if (on) { c.fillStyle = 'rgba(124,196,255,0.08)'; c.fillRect(X(q[0]), y0 - 6, X(q[1]) - X(q[0]), y1 - y0 + 8); }
        Viz.text(c, q[2], (X(q[0]) + X(q[1])) / 2, h - 8, { size: 11, color: on ? Viz.FOAM : Viz.MIST, align: 'center', weight: on ? 500 : 400 });
      });
      Viz.line(c, X(0), Y(1), X(1), Y(1), 'rgba(255,209,102,0.6)', { width: 1, dash: [4, 4] });
      if (!narrow) Viz.text(c, 'mean', L - 6, Y(1) + 4, { size: 10, color: GOLD, align: 'right' });
      Viz.plot(c, speed, 0, 1, X, Y, COLORS.swim, { width: 2 });
      var v = speed(ph);
      Viz.dot(c, X(ph), Y(v), 4.5, Viz.FOAM, {});
      Viz.text(c, (v * VBAR).toFixed(2) + ' m/s', w - 10, 20, { size: 13, color: Viz.FOAM, align: 'right', weight: 500 });
      Viz.text(c, '50 m pace, modelled through one stroke', w - 10, 36, { size: 10, color: Viz.MIST, align: 'right' });
    }
    function frame(now) {
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      ph = (ph + dt * SLOW / CYC) % 1;
      var v = speed(ph);
      bubbles.forEach(function (b) { b[0] -= dt * SLOW * v * 0.22; if (b[0] < 0) { b[0] += 1; b[1] = Math.random(); } });
      render();
      raf = requestAnimationFrame(frame);
    }
    if (reduce) { ph = 0.25; render(); return; }
    whenVisible(strokeCv, function () { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }, function () { cancelAnimationFrame(raf); raf = 0; });
    window.addEventListener('resize', function () { G = null; render(); });
    render();
  })();

  /* ---------- Season bests by year, short course ---------- */
  // null where no short-course swim of that event was raced that season
  var BESTS = [
    { id: 'prog50', name: '50 m breaststroke', times: [null, 30.46, 30.12, 29.88, 30.78], lo: 29.6, hi: 31.0, step: 0.5 },
    { id: 'prog100', name: '100 m breaststroke', times: [68.71, 67.31, 67.70, 65.79, 68.57], lo: 65.5, hi: 69.0, step: 1 }
  ];
  function fmtT(t) { var m = Math.floor(t / 60), s = t - 60 * m; return (m ? m + ':' + (s < 10 ? '0' : '') : '') + s.toFixed(2); }
  function drawProg(B) {
    var svg = document.getElementById(B.id);
    if (!svg) return;
    var e = mk(svg);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var w = svg.getBoundingClientRect().width || 400, h = 256, L = 52, R = 18, T = 66, Bm = 30;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h);
    var X = function (k) { return L + (k + 0.5) * (w - L - R) / 5; };
    // faster is up
    var Y = function (t) { return T + (t - B.lo) / (B.hi - B.lo) * (h - T - Bm); };
    var ks = [], best = 0, first = -1;
    B.times.forEach(function (t, k) { if (t === null) return; ks.push(k); if (first < 0) first = k; if (t < B.times[best] || B.times[best] === null) best = k; });
    e('text', { x: 0, y: 16, 'class': 'city' }, null, B.name);
    var gain = B.times[first] - B.times[best];
    e('text', { x: 0, y: 32, 'class': 'deg', style: 'fill:' + Viz.MIST }, null, '−' + gain.toFixed(2) + ' s, first university swim to best');
    e('text', { x: L - 8, y: T - 16, 'text-anchor': 'end', 'class': 'deg' }, null, 'faster ↑');
    for (var t = Math.ceil(B.lo / B.step) * B.step; t <= B.hi + 1e-9; t += B.step) {
      e('line', { x1: L, x2: w - R, y1: Y(t), y2: Y(t), 'class': 'grid' });
      e('text', { x: L - 8, y: Y(t) + 4, 'text-anchor': 'end' }, null, fmtT(t).replace(/\.00$/, ''));
    }
    var d = ks.map(function (k, i) { return (i ? 'L' : 'M') + X(k) + ' ' + Y(B.times[k]); }).join('');
    e('path', { d: d, 'class': 'trace', fill: 'none', stroke: COLORS.swim, 'stroke-width': 2 });
    B.times.forEach(function (t, k) {
      e('text', { x: X(k), y: h - 8, 'text-anchor': 'middle' }, null, SEASONS[k].slice(0, 2) + SEASONS[k].slice(-2));
      if (t === null) { e('text', { x: X(k), y: Y((B.lo + B.hi) / 2), 'text-anchor': 'middle', 'class': 'deg' }, null, 'not swum'); return; }
      var isBest = k === best, g = e('g', { 'class': 'pt', style: 'animation-delay:' + (0.2 + k * 0.18) + 's' });
      e('title', {}, g, SEASONS[k] + ': ' + fmtT(t) + (isBest ? ' (best)' : ''));
      e('circle', { cx: X(k), cy: Y(t), r: 14, fill: 'transparent' }, g);
      e('circle', { cx: X(k), cy: Y(t), r: isBest ? 6 : 4.5, fill: isBest ? GOLD : COLORS.swim, stroke: '#07222e', 'stroke-width': 2 }, g);
      if (isBest || k === first || k === B.times.length - 1) {
        e('text', { x: X(k), y: Y(t) + (isBest ? -12 : 18), 'text-anchor': 'middle', 'class': isBest ? 'city' : 'deg', style: isBest ? '' : 'fill:' + Viz.FOAM }, g, fmtT(t));
      }
    });
  }
  function drawBests() { BESTS.forEach(drawProg); }
  drawBests();
  BESTS.forEach(function (B) {
    var n = document.getElementById(B.id);
    if (!n) return;
    if (window.IntersectionObserver && !reduce) {
      var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); n.classList.add('go'); } }, { threshold: 0.4 });
      o.observe(n);
    } else n.classList.add('go');
  });
  window.addEventListener('resize', drawBests);

  /* ---------- The race: first-year 100 against the best 100 ---------- */
  var cv = document.getElementById('race');
  if (!cv || !window.Viz) return;
  var V = Viz, FOAM = V.FOAM, MIST = V.MIST;
  var raceRead = document.getElementById('race-read'), again = document.getElementById('race-again');
  var SPEED = 4, POOL = 25;
  var SWIMS = [
    { name: '2024–25', dist: 100, time: 65.79, label: '1:05.79', col: '#ffd166' },
    { name: '2021–22', dist: 100, time: 68.71, label: '1:08.71', col: '#7cc4ff' }
  ];
  var w = 0, h = 0, dpr = 1, t0 = 0, raf = 0, visible = false, done = false, started = false;
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = cv.getBoundingClientRect().width;
    h = w < 520 ? 190 : 230;
    cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  }
  // distance covered after t seconds: average pace, with the surge and glide
  // of each breaststroke cycle (about 1.1 s) layered on top
  function distance(s, t) {
    if (t >= s.time) return s.dist;
    var v = s.dist / s.time, f = 1 / 1.1, a = 0.35;
    var d = v * t + a * v * Math.sin(2 * Math.PI * f * t) / (2 * Math.PI * f);
    return Math.max(0, Math.min(s.dist, d));
  }
  function fmt(t) {
    var m = Math.floor(t / 60), sec = t - 60 * m;
    return (m ? m + ':' + (sec < 10 ? '0' : '') : '') + sec.toFixed(2);
  }
  function drawRace(t) {
    var c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    var narrow = w < 520, L = narrow ? 8 : 100, R = 10, TOPY = 34, laneH = (h - TOPY - 28) / 2;
    var X = function (m) { return L + m / POOL * (w - L - R); };
    // the water, ropes and 5 m marks
    c.fillStyle = 'rgba(124,196,255,0.06)';
    c.fillRect(X(0), TOPY, X(POOL) - X(0), laneH * 2);
    for (var m = 5; m < POOL; m += 5) {
      V.line(c, X(m), TOPY, X(m), TOPY + laneH * 2, 'rgba(234,246,248,0.08)', { width: 1 });
      V.text(c, m + ' m', X(m), h - 10, { size: 10, color: MIST, align: 'center' });
    }
    for (var r = 0; r <= 2; r++) {
      var ry = TOPY + r * laneH;
      V.line(c, X(0), ry, X(POOL), ry, r === 1 ? 'rgba(255,177,78,0.6)' : 'rgba(234,246,248,0.25)', { width: r === 1 ? 2 : 1, dash: r === 1 ? [6, 5] : null });
    }
    V.line(c, X(0), TOPY, X(0), TOPY + laneH * 2, FOAM, { width: 2 });
    V.line(c, X(POOL), TOPY, X(POOL), TOPY + laneH * 2, FOAM, { width: 2 });
    // the clock
    var clock = Math.min(t, SWIMS[1].time);
    V.text(c, fmt(clock), w - R, 22, { size: narrow ? 18 : 22, color: FOAM, align: 'right', weight: 500 });
    V.text(c, '×' + SPEED + ' speed', L, 22, { size: 11, color: MIST });
    SWIMS.forEach(function (s, i) {
      var d = distance(s, t), len = Math.min(Math.floor(d / POOL), s.dist / POOL - 1), along = d - len * POOL;
      var pos = len % 2 === 0 ? along : POOL - along;
      var cy = TOPY + (i + 0.5) * laneH, x = X(pos), fin = t >= s.time;
      if (!narrow) {
        V.text(c, s.name, 8, cy - 6, { size: 12, color: s.col, weight: 600 });
        V.text(c, 'length ' + Math.min(len + 1, s.dist / POOL) + '/' + s.dist / POOL, 8, cy + 10, { size: 10, color: MIST });
      }
      // the wake behind the swimmer
      var dir = len % 2 === 0 ? -1 : 1, g = c.createLinearGradient(x, 0, x + dir * 70, 0);
      g.addColorStop(0, s.col); g.addColorStop(1, 'rgba(0,0,0,0)');
      if (!fin) { V.ga(c, 0.5); c.strokeStyle = g; c.lineWidth = 3; c.beginPath(); c.moveTo(x, cy); c.lineTo(x + dir * 70, cy); c.stroke(); V.ga(c, 1); }
      V.dot(c, x, cy, fin ? 6 : 7, s.col, {});
      if (fin) {
        V.text(c, s.label, x + (pos > POOL / 2 ? -14 : 14), cy + 4, { size: 13, color: s.col, align: pos > POOL / 2 ? 'right' : 'left', weight: 600 });
      } else if (narrow) {
        V.text(c, s.name, x + (dir < 0 ? 12 : -12), cy - 12, { size: 10, color: s.col, align: dir < 0 ? 'left' : 'right' });
      }
    });
  }
  function frame(now) {
    raf = 0;
    if (!t0) t0 = now;
    var t = (now - t0) / 1000 * SPEED;
    drawRace(t);
    if (t >= SWIMS[1].time) {
      done = true;
      if (raceRead) raceRead.textContent = 'Fig. 7. 100 m breaststroke, short course: 1:08.71 in first year, 1:05.79 at best. At the best swim\u2019s touch, the first-year swim is still about ' + (100 * (1 - SWIMS[0].time / SWIMS[1].time)).toFixed(1) + ' m out at average pace.';
      return;
    }
    if (raceRead) raceRead.textContent = t < SWIMS[0].time ? 'Fig. 7. The first-year 100 against the best 100, four lengths each, swum at their average paces.' : 'Fig. 7. The best swim has touched; the first-year swim is still coming home.';
    if (visible) raf = requestAnimationFrame(frame);
  }
  function go() {
    if (reduce) { drawRace(999); return; }
    cancelAnimationFrame(raf); t0 = 0; done = false; started = true;
    raf = requestAnimationFrame(frame);
  }
  layout();
  drawRace(reduce ? 999 : 0);
  window.addEventListener('resize', function () { layout(); drawRace(done || reduce ? 999 : 0); if (started && !done) go(); });
  if (window.IntersectionObserver && !reduce) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !started) go();
      else if (visible && !done && !raf) { raf = requestAnimationFrame(frame); }
    }, { threshold: 0.4 }).observe(cv);
  } else { visible = true; drawRace(999); }
  if (again) again.addEventListener('click', go);
})();
