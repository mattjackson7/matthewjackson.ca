/* Results page, swimming: every individual swim on record (window.SWIMS, from
   js/swim-data.js) drawn three ways. A career explorer by event and pool, the
   pacing of each 100 m breaststroke as its two halves, and a race between any
   two swims of one event, as crude stick figures each swum at its own splits. */
(function () {
  var DATA = window.SWIMS, V = window.Viz, SB = window.Sandbox;
  if (!DATA || !V || !SB) return;
  var FOAM = V.FOAM, MIST = V.MIST, DEEP = V.DEEP, SWIM = '#7cc4ff', GOLD = '#ffd166';
  var reduce = SB.reduce;
  var STROKES = { BR: 'breaststroke', FL: 'butterfly', FR: 'freestyle', IM: 'individual medley', BK: 'backstroke' };
  var SNAME = { BR: 'Breast', FL: 'Fly', FR: 'Free', IM: 'IM', BK: 'Back' };
  var MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  var ROUND = { P: 'prelims', F: 'final', T: 'timed final' };
  var GUELPH = 2021 + 8 / 12; // September 2021

  var ALL = DATA.swims.map(function (r) {
    var p = r[0].split('-');
    return {
      date: r[0], x: +p[0] + (+p[1] - 1) / 12 + (+p[2] - 1) / 365, y: +p[0], m: +p[1],
      meet: DATA.meets[r[1]], ev: r[2], course: r[3], t: r[4], place: r[5], round: r[6], sp: r[7]
    };
  });

  /* ---------- Words and numbers ---------- */
  function fmtT(t) { var m = Math.floor(t / 60 + 1e-9), s = t - 60 * m; return (m ? m + ':' + (s < 9.995 ? '0' : '') : '') + s.toFixed(2); }
  function fmtDate(s) { var p = s.split('-'); return +p[2] + ' ' + MONTHS[+p[1] - 1] + ' ' + p[0]; }
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function evName(ev, course) { return (course === 'S' ? 'short-course ' : 'long-course ') + ev.slice(2) + ' m ' + STROKES[ev.slice(0, 2)]; }
  function laps(s) {
    if (!s.sp || s.sp.length < 2 || s.sp.some(function (v) { return !v; })) return null;
    return s.sp.map(function (c, k) { return c - (k ? s.sp[k - 1] : 0); });
  }
  function describe(s) {
    var where = s.meet[0] + (s.meet[1] ? ', ' + s.meet[1] : '');
    var how = s.place ? ord(s.place) + (s.round ? ' in the ' + ROUND[s.round] : '') : (s.round ? ROUND[s.round].replace(/^./, function (c) { return c.toUpperCase(); }) : '');
    var l = laps(s), sp = l ? ' &middot; 50s: ' + l.map(fmtT).join(' / ') : '';
    return '<b>' + fmtT(s.t) + '</b> &middot; ' + fmtDate(s.date) + ' &middot; ' + where + (how ? ' &middot; ' + how : '') + sp;
  }
  function season(s) { var a = s.m >= 9 ? s.y : s.y - 1; return a + '–' + String(a + 1).slice(2); }

  /* ---------- Chip rows that can be rebuilt ---------- */
  function chipRow(parent, label, onPick) {
    var row = SB.el('div', 'sw-row', parent);
    row.setAttribute('role', 'group'); row.setAttribute('aria-label', label);
    SB.el('span', '', row, label);
    var btns = [];
    function build(opts, value) {
      btns.forEach(function (b) { row.removeChild(b); });
      btns = opts.map(function (o) {
        var b = SB.el('button', 'chip', row, o.label);
        b.type = 'button'; b.__v = o.v;
        if (o.off) b.setAttribute('aria-disabled', 'true');
        b.addEventListener('click', function () { if (!o.off && b.getAttribute('aria-pressed') !== 'true') onPick(o.v); });
        return b;
      });
      set(value);
    }
    function set(v) { btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.__v === v)); }); }
    return { build: build, set: set };
  }

  // a dot set fades out completely before the next fades in, so two never overlap
  function crossfade(st, dt) {
    if (st.tr < 1) st.tr = reduce ? 1 : Math.min(1, st.tr + dt / 0.55);
    return st.tr < 1;
  }
  function phases(st) { return { out: st.prev && st.tr < 0.5 ? 1 - st.tr * 2 : 0, inA: st.tr < 0.5 && st.prev ? 0 : st.prev ? (st.tr - 0.5) * 2 : 1 }; }

  // pointer and keyboard reading of the nearest point
  function reader(cv, getPts, show) {
    var hov = -1;
    function pick(i) { if (i !== hov) { hov = i; show(i); } }
    function at(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function nearest(p) {
      var pts = getPts(), best = -1, bd = 30 * 30;
      pts.forEach(function (q, i) { var dx = q.px - p[0], dy = q.py - p[1], d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } });
      return best;
    }
    cv.addEventListener('pointermove', function (e) { pick(nearest(at(e))); });
    cv.addEventListener('pointerdown', function (e) { pick(nearest(at(e))); });
    cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') pick(-1); });
    cv.addEventListener('keydown', function (e) {
      var n = getPts().length;
      if (!n) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') pick(hov < 0 ? 0 : Math.min(n - 1, hov + 1));
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') pick(hov < 0 ? n - 1 : Math.max(0, hov - 1));
      else if (e.key === 'Escape') pick(-1);
      else return;
      e.preventDefault();
    });
    cv.addEventListener('blur', function () { pick(-1); });
    return { get: function () { return hov; }, reset: function () { hov = -1; } };
  }

  /* ================= Fig. 6: every swim, by event ================= */
  (function () {
    var cv = document.getElementById('career'), ctl = document.getElementById('career-ctl'), read = document.getElementById('career-read');
    if (!cv || !ctl) return;
    var count = {};
    ALL.forEach(function (s) { var k = s.ev + s.course; count[k] = (count[k] || 0) + 1; });
    function n(ev, c) { return count[ev + c] || 0; }
    function dists(st) {
      var ds = {};
      ALL.forEach(function (s) { if (s.ev.slice(0, 2) === st) ds[s.ev.slice(2)] = 1; });
      return Object.keys(ds).map(Number).sort(function (a, b) { return a - b; })
        .filter(function (d) { return n(st + d, 'S') + n(st + d, 'L') >= 3; });
    }
    var sel = { st: 'BR', d: 100, c: 'S' };
    var rS = chipRow(ctl, 'Stroke', function (v) { sel.st = v; var ds = dists(v); if (ds.indexOf(sel.d) < 0) sel.d = ds.indexOf(100) >= 0 ? 100 : ds[0]; fix(); });
    var rD = chipRow(ctl, 'Distance', function (v) { sel.d = v; fix(); });
    var rC = chipRow(ctl, 'Course', function (v) { sel.c = v; fix(); });
    rS.build(['BR', 'FL', 'FR', 'IM', 'BK'].map(function (k) { return { v: k, label: SNAME[k] }; }), sel.st);
    function fix() {
      var ev = sel.st + sel.d;
      if (!n(ev, sel.c)) sel.c = sel.c === 'S' ? 'L' : 'S';
      rS.set(sel.st);
      rD.build(dists(sel.st).map(function (d) { return { v: d, label: d + ' m' }; }), sel.d);
      rC.build([{ v: 'S', label: '25 m pool', off: !n(ev, 'S') }, { v: 'L', label: '50 m pool', off: !n(ev, 'L') }], sel.c);
      load();
    }

    var st = { cur: null, prev: null, tr: 1 }, Y = { lo: null, hi: null }, T = { lo: 0, hi: 1 }, geo = null;
    function load() {
      var ev = sel.st + sel.d, pts = ALL.filter(function (s) { return s.ev === ev && s.course === sel.c; });
      var best = Infinity, bi = 0;
      pts.forEach(function (s, i) { s.pb = s.t < best; if (s.pb) { best = s.t; bi = i; } });
      var set = { ev: ev, c: sel.c, pts: pts, best: bi, lo: Math.min.apply(null, pts.map(function (s) { return s.t; })), hi: Math.max.apply(null, pts.map(function (s) { return s.t; })) };
      if (st.cur) { st.prev = st.cur; st.tr = 0; }
      st.cur = set;
      var span = Math.max(1, set.hi - set.lo);
      T.lo = set.lo - span * 0.08; T.hi = set.hi + span * 0.1;
      rd && rd.reset();
      caption(-1);
      vw.kick();
    }
    function caption(i) {
      var s = st.cur;
      if (i >= 0 && s.pts[i]) { read.innerHTML = describe(s.pts[i]); return; }
      var f = s.pts[0], b = s.pts[s.best];
      read.innerHTML = 'Fig. 6. Every ' + evName(s.ev, s.c) + ' on record: <b>' + s.pts.length + '</b> ' + (s.pts.length === 1 ? 'swim' : 'swims') +
        (s.pts.length > 1 ? ', from ' + f.y + ' to ' + s.pts[s.pts.length - 1].y + '. The line is my best so far; gold is the fastest, <b>' + fmtT(b.t) + '</b>' +
        (b !== f ? ', down from ' + fmtT(f.t) + ' in ' + f.y : '') + '.' : '.') + ' Hover, tap or use the arrow keys to read a swim.';
    }
    var X0 = 2011.6, X1 = 2026.4;
    var vw = SB.view(cv, {
      height: function (w) { return w < 560 ? 320 : Math.min(400, Math.round(w * 0.42)); },
      draw: function (c, w, h, dt) {
        var moving = crossfade(st, dt);
        ['lo', 'hi'].forEach(function (k) { Y[k] = SB.toward(Y[k], T[k], dt, 9); if (SB.near(Y[k], T[k], 0.005)) Y[k] = T[k]; else moving = true; });
        var narrow = w < 560, box = { x: narrow ? 48 : 58, y: 30, w: 0, h: 0 };
        box.w = w - box.x - 12; box.h = h - box.y - 30;
        var Xf = function (x) { return box.x + (x - X0) / (X1 - X0) * box.w; };
        var Yf = function (t) { return box.y + (t - Y.lo) / (Y.hi - Y.lo) * box.h; }; // faster is up
        // eras
        V.ga(c, 1); c.fillStyle = 'rgba(124,196,255,0.05)'; c.fillRect(Xf(GUELPH), box.y, Xf(X1) - Xf(GUELPH), box.h);
        c.fillStyle = 'rgba(143,177,189,0.05)'; c.fillRect(Xf(2020.25), box.y, Xf(GUELPH) - Xf(2020.25), box.h);
        V.text(c, narrow ? 'Blue Fins' : 'Halton Hills Blue Fins', box.x + 6, box.y - 10, { size: 10 });
        V.text(c, narrow ? 'Guelph' : 'University of Guelph', Xf(GUELPH) + 6, box.y - 10, { size: 10, color: SWIM });
        if (!narrow) V.text(c, 'pandemic', (Xf(2020.25) + Xf(GUELPH)) / 2, box.y + box.h - 8, { size: 9, align: 'center', alpha: 0.7 });
        // axes
        var step = SB.niceStep(Y.hi - Y.lo, narrow ? 4 : 5);
        for (var t = Math.ceil(Y.lo / step) * step; t <= Y.hi; t += step) {
          V.line(c, box.x, Yf(t), box.x + box.w, Yf(t), 'rgba(143,177,189,0.12)', { width: 1 });
          V.text(c, fmtT(t).replace(/\.00$/, ''), box.x - 6, Yf(t) + 3, { size: 10, align: 'right' });
        }
        for (var yr = 2012; yr <= 2026; yr += narrow ? 2 : 1) V.text(c, narrow ? '’' + String(yr).slice(2) : String(yr), Xf(yr), box.y + box.h + 16, { size: 10, align: 'center' });
        if (!narrow) V.text(c, 'faster ↑', box.x - 6, box.y - 10, { size: 10, align: 'right' });
        var ph = phases(st);
        if (ph.out > 0) drawSet(c, st.prev, ph.out, Xf, Yf, box, false);
        if (ph.inA > 0) drawSet(c, st.cur, ph.inA, Xf, Yf, box, true);
        V.ga(c, 1);
        geo = { Xf: Xf, Yf: Yf };
        return moving;
      }
    });
    function drawSet(c, set, a, Xf, Yf, box, live) {
      var P = set.pts, i, best = Infinity;
      // the best-so-far staircase
      V.ga(c, 0.85 * a); c.strokeStyle = SWIM; c.lineWidth = 1.6; c.beginPath();
      P.forEach(function (s, k) {
        if (!k) { c.moveTo(Xf(s.x), Yf(s.t)); best = s.t; return; }
        if (s.t < best) { c.lineTo(Xf(s.x), Yf(best)); c.lineTo(Xf(s.x), Yf(s.t)); best = s.t; }
      });
      if (P.length) c.lineTo(Xf(X1) - 2, Yf(best));
      c.stroke();
      var hv = live && rd ? rd.get() : -1;
      for (i = 0; i < P.length; i++) {
        var s = P[i], px = Xf(s.x), py = Yf(s.t);
        if (live) { s.px = px; s.py = py; }
        if (i === set.best) continue;
        if (s.pb) V.dot(c, px, py, 3.4, SWIM, { alpha: a });
        else V.dot(c, px, py, 2.6, MIST, { alpha: 0.6 * a });
      }
      var b = P[set.best];
      if (b) {
        V.dot(c, Xf(b.x), Yf(b.t), 7.5, DEEP, { alpha: a });
        V.dot(c, Xf(b.x), Yf(b.t), 5.5, GOLD, { alpha: a });
        V.text(c, fmtT(b.t), Xf(b.x) + 4, Yf(b.t) - 11, { size: 11, color: GOLD, align: 'right', weight: 600, alpha: a });
      }
      if (P.length > 1 && P[0] !== b) V.text(c, fmtT(P[0].t), Xf(P[0].x) - 4, Yf(P[0].t) + 17, { size: 10, color: FOAM, alpha: a });
      if (hv >= 0 && P[hv]) {
        var q = P[hv];
        V.ga(c, a); c.strokeStyle = FOAM; c.lineWidth = 1.5;
        c.beginPath(); c.arc(Xf(q.x), Yf(q.t), 8, 0, Math.PI * 2); c.stroke();
        V.line(c, Xf(q.x), box.y, Xf(q.x), box.y + box.h, FOAM, { dash: [2, 4], alpha: 0.3 * a });
      }
    }
    var rd = reader(cv, function () { return st.cur ? st.cur.pts : []; }, function (i) { caption(i); vw.kick(); });
    fix();
  })();

  /* ================= Fig. 7: the two halves of every 100 m breaststroke ================= */
  (function () {
    var cv = document.getElementById('splits'), ctl = document.getElementById('splits-ctl'), read = document.getElementById('splits-read');
    if (!cv || !ctl) return;
    function setFor(c) {
      var pts = ALL.filter(function (s) { return s.ev === 'BR100' && s.course === c && laps(s); }).map(function (s) {
        var l = laps(s); return { s: s, a: l[0], b: l[1] };
      });
      var bi = 0;
      pts.forEach(function (p, i) { if (p.s.t < pts[bi].s.t) bi = i; });
      return { c: c, pts: pts, best: bi };
    }
    var sets = { S: setFor('S'), L: setFor('L') };
    var st = { cur: null, prev: null, tr: 1 }, R = { a0: null, a1: null, b0: null, b1: null }, RT = {};
    var row = chipRow(ctl, 'Course', function (v) { row.set(v); show(v); });
    row.build([{ v: 'S', label: '25 m pool' }, { v: 'L', label: '50 m pool' }], 'S');
    function show(c) {
      if (st.cur) { st.prev = st.cur; st.tr = 0; }
      st.cur = sets[c];
      var P = st.cur.pts, as = P.map(function (p) { return p.a; }), bs = P.map(function (p) { return p.b; });
      var pa = (Math.max.apply(null, as) - Math.min.apply(null, as)) * 0.08 + 0.4, pb = (Math.max.apply(null, bs) - Math.min.apply(null, bs)) * 0.08 + 0.4;
      RT = { a0: Math.min.apply(null, as) - pa, a1: Math.max.apply(null, as) + pa, b0: Math.min.apply(null, bs) - pb, b1: Math.max.apply(null, bs) + pb };
      rd && rd.reset();
      caption(-1);
      vw.kick();
    }
    function caption(i) {
      var S = st.cur;
      if (i >= 0 && S.pts[i]) {
        var p = S.pts[i];
        read.innerHTML = describe(p.s) + ' &middot; back half ' + (p.b - p.a).toFixed(2) + ' s slower';
        return;
      }
      var first = S.pts[0], b = S.pts[S.best];
      read.innerHTML = 'Fig. 7. Every 100 m breaststroke with splits, ' + (S.c === 'S' ? 'short' : 'long') + ' course: the first 50 across and the second 50 up, so faster swims sit toward the bottom left. ' +
        'Diagonals join equal finishing times. From ' + first.s.y + ' to the best, the first 50 dropped <b>' + (first.a - b.a).toFixed(2) + ' s</b> and the second <b>' + (first.b - b.b).toFixed(2) + ' s</b>.';
    }
    var vw = SB.view(cv, {
      height: function (w) { return w < 560 ? 330 : Math.min(400, Math.round(w * 0.42)); },
      draw: function (c, w, h, dt) {
        var moving = crossfade(st, dt);
        ['a0', 'a1', 'b0', 'b1'].forEach(function (k) { R[k] = SB.toward(R[k], RT[k], dt, 9); if (SB.near(R[k], RT[k], 0.002)) R[k] = RT[k]; else moving = true; });
        var narrow = w < 560, box = { x: 50, y: 30, w: w - 50 - 14, h: h - 30 - 40 };
        var F = V.frame(c, box, [R.a0, R.a1], [R.b0, R.b1], {});
        // faster at the bottom left: x as is, y as is (smaller = lower)
        var Xf = F.X, Yf = F.Y;
        var sa = SB.niceStep(R.a1 - R.a0, narrow ? 4 : 6), sb = SB.niceStep(R.b1 - R.b0, 5), t;
        for (t = Math.ceil(R.a0 / sa) * sa; t <= R.a1; t += sa) V.text(c, fmtT(t).replace(/\.00$/, ''), Xf(t), box.y + box.h + 15, { size: 10, align: 'center' });
        for (t = Math.ceil(R.b0 / sb) * sb; t <= R.b1; t += sb) V.text(c, fmtT(t).replace(/\.00$/, ''), box.x - 6, Yf(t) + 3, { size: 10, align: 'right' });
        V.text(c, 'first 50 →', box.x + box.w, box.y + box.h + 30, { size: 10, align: 'right' });
        V.text(c, 'second 50 ↑', box.x + 6, box.y - 10, { size: 10 });
        // diagonals of equal total time
        var lo = R.a0 + R.b0, hi = R.a1 + R.b1, ts = SB.niceStep(hi - lo, 6);
        c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
        for (t = Math.ceil(lo / ts) * ts; t <= hi; t += ts) V.line(c, Xf(R.a0), Yf(t - R.a0), Xf(R.a1), Yf(t - R.a1), 'rgba(143,177,189,0.18)', { width: 1 });
        c.restore();
        for (t = Math.ceil(lo / ts) * ts; t <= hi; t += ts) {
          var ax = t - R.b1; // where the diagonal meets the top edge
          if (ax > R.a0 + (R.a1 - R.a0) * 0.04 && ax < R.a1 - (R.a1 - R.a0) * 0.04) V.text(c, fmtT(t).replace(/\.00$/, ''), Xf(ax), box.y + 11, { size: 9, align: 'center', alpha: 0.8 });
        }
        // older swims dim, newer bright
        var lx = box.x + box.w - 120, ly = box.y - 13;
        if (!narrow) {
          var g = c.createLinearGradient(lx + 40, 0, lx + 90, 0); g.addColorStop(0, 'rgba(124,196,255,0.2)'); g.addColorStop(1, SWIM);
          V.ga(c, 1); c.fillStyle = g; c.fillRect(lx + 40, ly - 4, 50, 5);
          V.text(c, 'older', lx + 36, ly + 1, { size: 9, align: 'right' });
          V.text(c, 'newer', lx + 94, ly + 1, { size: 9 });
        }
        var ph = phases(st);
        if (ph.out > 0) drawSet(c, st.prev, ph.out, Xf, Yf, false);
        if (ph.inA > 0) drawSet(c, st.cur, ph.inA, Xf, Yf, true);
        V.ga(c, 1);
        return moving;
      }
    });
    function drawSet(c, S, a, Xf, Yf, live) {
      var P = S.pts, y0 = P[0].s.x, y1 = P[P.length - 1].s.x, hv = live && rd ? rd.get() : -1;
      P.forEach(function (p, i) {
        var px = Xf(p.a), py = Yf(p.b);
        if (live) { p.px = px; p.py = py; }
        if (i === S.best) return;
        var k = y1 > y0 ? (p.s.x - y0) / (y1 - y0) : 1;
        V.dot(c, px, py, 3.6, SWIM, { alpha: a * (0.22 + 0.78 * k) });
      });
      var b = P[S.best];
      V.dot(c, Xf(b.a), Yf(b.b), 7.5, DEEP, { alpha: a });
      V.dot(c, Xf(b.a), Yf(b.b), 5.5, GOLD, { alpha: a });
      V.text(c, fmtT(b.s.t) + '  (' + b.a.toFixed(2) + ' + ' + b.b.toFixed(2) + ')', Xf(b.a) - 4, Yf(b.b) + 20, { size: 10, color: GOLD, weight: 600, alpha: a });
      if (hv >= 0 && P[hv]) {
        V.ga(c, a); c.strokeStyle = FOAM; c.lineWidth = 1.5;
        c.beginPath(); c.arc(P[hv].px, P[hv].py, 8, 0, Math.PI * 2); c.stroke();
      }
    }
    var rd = reader(cv, function () { return st.cur ? st.cur.pts : []; }, function (i) { caption(i); vw.kick(); });
    show('S');
  })();

  /* ================= Fig. 8: race any two swims of one event ================= */
  (function () {
    var cv = document.getElementById('race'), selA = document.getElementById('race-a'), selB = document.getElementById('race-b');
    var raceRead = document.getElementById('race-read'), again = document.getElementById('race-again'), ctl = document.getElementById('race-ctl');
    if (!cv || !selA || !selB || !ctl) return;
    var COLS = [SWIM, GOLD], MEDLEY = ['FL', 'BK', 'BR', 'FR'], SPEEDS = [4, 5, 8, 10, 15, 20, 30, 40, 60, 80];
    var TAU = 2 * Math.PI;

    /* ---- which event ---- */
    var count = {};
    ALL.forEach(function (s) { var k = s.ev + s.course; count[k] = (count[k] || 0) + 1; });
    function n(ev, c) { return count[ev + c] || 0; }
    function dists(st) {
      var ds = {};
      ALL.forEach(function (s) { if (s.ev.slice(0, 2) === st) ds[s.ev.slice(2)] = 1; });
      return Object.keys(ds).map(Number).sort(function (a, b) { return a - b; })
        .filter(function (d) { return n(st + d, 'S') >= 2 || n(st + d, 'L') >= 2; });
    }
    var sel = { st: 'BR', d: 100, c: 'S' };
    var rS = chipRow(ctl, 'Stroke', function (v) { sel.st = v; var ds = dists(v); if (ds.indexOf(sel.d) < 0) sel.d = ds.indexOf(100) >= 0 ? 100 : ds[0]; fix(); });
    var rD = chipRow(ctl, 'Distance', function (v) { sel.d = v; fix(); });
    var rC = chipRow(ctl, 'Course', function (v) { sel.c = v; fix(); });
    rS.build(['BR', 'FL', 'FR', 'IM', 'BK'].map(function (k) { return { v: k, label: SNAME[k] }; }), sel.st);
    function fix() {
      var ev = sel.st + sel.d;
      if (n(ev, sel.c) < 2) sel.c = sel.c === 'S' ? 'L' : 'S';
      rS.set(sel.st);
      rD.build(dists(sel.st).map(function (d) { return { v: d, label: d + ' m' }; }), sel.d);
      rC.build([{ v: 'S', label: '25 m pool', off: n(ev, 'S') < 2 }, { v: 'L', label: '50 m pool', off: n(ev, 'L') < 2 }], sel.c);
      fill();
      if (built) go();
    }

    /* ---- the two lane pickers ---- */
    var LIST = [], POOL = 25, DIST = 100, built = false;
    function fill() {
      LIST = ALL.filter(function (s) { return s.ev === sel.st + sel.d && s.course === sel.c; });
      POOL = sel.c === 'S' ? 25 : 50; DIST = sel.d;
      var bestI = 0;
      LIST.forEach(function (s, i) { if (s.t < LIST[bestI].t) bestI = i; });
      [selA, selB].forEach(function (sl) {
        sl.innerHTML = '';
        var groups = {};
        LIST.forEach(function (s, i) {
          var sn = season(s), g = groups[sn];
          if (!g) { g = groups[sn] = document.createElement('optgroup'); g.label = sn + (s.meet[2] === 'G' ? ' · Guelph' : ' · Blue Fins'); sl.appendChild(g); }
          var o = document.createElement('option');
          o.value = i;
          o.textContent = fmtT(s.t) + ' · ' + MONTHS[s.m - 1] + ' ' + s.y + ' · ' + s.meet[0] + (i === bestI ? ' (best)' : '');
          g.appendChild(o);
        });
      });
      // default: my first university championship swim of the event against the best one, else the first ever
      var a = LIST.findIndex(function (s, i) { return i !== bestI && s.meet[2] === 'G' && /OUA|Ontario University/.test(s.meet[0]); });
      if (a < 0) a = bestI === 0 ? 1 : 0;
      selA.value = a; selB.value = bestI;
      cv.setAttribute('aria-label', 'A ' + POOL + ' metre pool with two lanes, each a stick-figure swimmer racing one of the two chosen ' + DIST + ' metre ' + STROKES[sel.st] + ' swims at its real splits.');
    }

    /* ---- the race model ---- */
    var SW = [], SPEED = 4, DPS = 4, LENGTHS = 4;
    // where each stroke surfaces: off the start, and off each turn
    var BRK = { FR: 9, FL: 8, BK: 10, BR: 7 }, BRK_T = { FR: 5, FL: 5, BK: 6, BR: 6 };
    function pick() {
      LENGTHS = DIST / POOL;
      SW = [selA, selB].map(function (sl, k) {
        var s = LIST[+sl.value] || LIST[0];
        var ok = s.sp && s.sp.length >= 2 && s.sp.every(function (v) { return v > 0; });
        var cum = ok ? s.sp.slice() : null;
        if (cum) cum[cum.length - 1] = s.t;
        return { s: s, t: s.t, cum: cum, name: MONTHS[s.m - 1] + ' ' + s.y, col: COLS[k] };
      });
      var slow = Math.max(SW[0].t, SW[1].t), fast = Math.min(SW[0].t, SW[1].t);
      SPEED = SPEEDS.find(function (v) { return slow / v <= 22; }) || SPEEDS[SPEEDS.length - 1];
      // one drawn stroke cycle covers this many metres, so the quicker swimmer strokes about 1.5 times a second on screen
      DPS = DIST / fast * SPEED / 1.5;
      // the start and each turn last long enough to see, but never more than a slice of a length
      SW.forEach(function (s) {
        var lt = s.t / LENGTHS;
        s.blockEnd = Math.min(0.3 * SPEED, 0.12 * lt);
        s.flightEnd = s.blockEnd + Math.min(0.24 * SPEED, 0.08 * lt);
        s.dEntry = base(s, s.flightEnd);
        s.hw = Math.min(0.26 * SPEED, 0.14 * lt);
        s.walls = [];
        for (var j = 1; j < LENGTHS; j++) s.walls.push(timeAt(s, j * POOL));
      });
    }
    // metres covered after t seconds, each split at its own even pace
    function base(w, t) {
      if (t >= w.t) return DIST;
      if (!w.cum) return DIST * t / w.t;
      var seg = DIST / w.cum.length, k = 0;
      while (k < w.cum.length - 1 && t >= w.cum[k]) k++;
      var a = k ? w.cum[k - 1] : 0;
      return seg * (k + (t - a) / (w.cum[k] - a));
    }
    // and its inverse: when the swimmer reaches d metres
    function timeAt(w, d) {
      if (!w.cum) return w.t * d / DIST;
      var seg = DIST / w.cum.length, k = Math.min(w.cum.length - 1, Math.floor(d / seg + 1e-9)), a = k ? w.cum[k - 1] : 0;
      return a + (d - seg * k) / seg * (w.cum[k] - a);
    }
    function strokeAt(d) { return sel.st === 'IM' ? MEDLEY[Math.min(3, Math.floor(d / (DIST / 4)))] : sel.st; }
    // what the swimmer is doing at time t: on the block, in the air, tumbling at a wall, underwater, or swimming
    function stage(w, t) {
      if (t >= w.t) return { kind: 'fin' };
      if (t < w.blockEnd) return { kind: 'block' };
      if (t < w.flightEnd) return { kind: 'flight', k: (t - w.blockEnd) / (w.flightEnd - w.blockEnd) };
      for (var j = 0; j < w.walls.length; j++) {
        if (Math.abs(t - w.walls[j]) < w.hw) return { kind: 'turn', j: j, k: (t - w.walls[j] + w.hw) / (2 * w.hw) };
      }
      var b = base(w, t), len = Math.floor(b / POOL), along = b - len * POOL, st = strokeAt(b);
      if (len === 0) { var brk = Math.min(POOL * 0.4, BRK[st]); if (b < brk) return { kind: 'under', start: true, k: (b - w.dEntry) / Math.max(0.1, brk - w.dEntry) }; }
      else { var bt = Math.min(POOL * 0.3, BRK_T[st]); if (along < bt) return { kind: 'under', k: along / bt }; }
      return { kind: 'swim' };
    }
    // each stroke's speed rises and falls through the cycle; breaststroke the most, freestyle and backstroke barely
    var SURGE = { BR: [0.38, -1.2], FL: [0.28, -0.7], FR: [0.06, 0], BK: [0.06, 0] };
    function distance(w, t, sg) {
      var b = base(w, t);
      if (t >= w.t) return DIST;
      if (sg.kind !== 'swim') return b;
      var g = SURGE[strokeAt(b)], ph = b / DPS;
      return Math.max(0, Math.min(DIST - 0.01, b + g[0] * DPS / TAU * Math.sin(TAU * ph + g[1] * Math.PI)));
    }

    /* ---- a very crude swimmer, side on: nose at (0,0), body trailing back, in units of body length ---- */
    function sm(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
    function lerp(a, b, k) { return a + (b - a) * k; }
    function lerp2(p, q, k) { return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]; }
    function add(p, q) { return [p[0] + q[0], p[1] + q[1]]; }
    function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); }
    var FACE = { FR: [0.02, 0.045], FL: [0.04, 0.03], BR: [0.045, 0], BK: [0.02, -0.045] };
    function pose(kind, st, ph, u) {
      var sin = Math.sin, cos = Math.cos, P = { head: [-0.08, 0], S: [-0.19, 0.02], H: [-0.56, 0.04], face: FACE[st] || FACE.BR, arms: [], legs: [] };
      ph = ph - Math.floor(ph);
      if (kind === 'block') {
        if (st === 'BK') {
          // backstroke start: in the water facing the wall, hands on the grips, feet on the wall
          P.head = [-0.08, -0.1]; P.S = [-0.15, -0.04]; P.H = [-0.3, 0.2]; P.face = [-0.045, 0];
          var g = [P.S, [-0.3, -0.06], [-0.45, -0.16]];
          P.arms.push(g, g);
          var bl = [P.H, [-0.12, 0.3], [-0.44, 0.34]];
          P.legs.push(bl, bl);
        } else {
          // crouched on the block, hands at its front edge
          P.head = [-0.06, 0.02]; P.S = [-0.13, -0.04]; P.H = [-0.4, -0.22]; P.face = [0.03, 0.04];
          var ar = [P.S, [-0.07, 0.08], [0.0, 0.16]];
          P.arms.push(ar, ar);
          var lg = [P.H, [-0.3, -0.02], [-0.45, 0.16]];
          P.legs.push(lg, lg);
          P.plat = [[-0.52, 0.17], [0.04, 0.17]];
        }
      } else if (kind === 'line' || kind === 'under') {
        // streamline: arms locked over the head, legs together
        var hand = [0.14, 0.0], kk = 0, bend = 0;
        if (kind === 'under' && st === 'BR') {
          // the breaststroke pullout: glide, one long pull to the hips, hands back up, one kick
          var fwd = [0.14, 0], hip = [-0.5, 0.07];
          if (u < 0.45) hand = fwd;
          else if (u < 0.65) { var q = sm((u - 0.45) / 0.2); hand = lerp2(fwd, hip, q); hand[1] += 0.15 * sin(Math.PI * q); }
          else if (u < 0.85) { var r = sm((u - 0.65) / 0.2); hand = lerp2(hip, fwd, r); hand[1] += 0.06 * sin(Math.PI * r); }
          bend = u > 0.72 && u < 0.9 ? sin(Math.PI * (u - 0.72) / 0.18) : 0;
        } else if (kind === 'under') kk = 0.22 * sin(TAU * ph);
        var elbow = add(lerp2(P.S, hand, 0.5), [0, 0.04]), arm = [P.S, elbow, hand];
        P.arms.push(arm, arm);
        var knee = st === 'BR' ? add(P.H, lerp2([-0.22, 0.01], [-0.1, 0.17], bend)) : add(P.H, [-0.22 * cos(kk * 0.5), 0.22 * sin(kk * 0.5)]);
        var foot = st === 'BR' ? add(P.H, lerp2([-0.45, 0.02], [-0.24, 0.0], bend)) : add(knee, [-0.23 * cos(kk), 0.23 * sin(kk)]);
        P.legs.push([P.H, knee, foot], [P.H, knee, foot]);
      } else if (kind === 'tuck') {
        // balled up at the wall
        P.head = [-0.08, 0]; P.S = [-0.16, 0.06]; P.H = [-0.27, 0.22]; P.face = [0.045, 0];
        var ta = [P.S, [-0.03, 0.16], [0.06, 0.1]];
        P.arms.push(ta, ta);
        var tl = [P.H, [-0.04, 0.25], [-0.2, 0.33]];
        P.legs.push(tl, tl);
      } else if (st === 'FR' || st === 'BK') {
        // alternating windmill arms and a flutter kick; on the back for backstroke
        if (st === 'BK') P.H = [-0.56, 0.08];
        for (var k = 0; k < 2; k++) {
          var a = TAU * (ph + k / 2);
          P.arms.push([P.S, add(P.S, [0.36 * cos(a), 0.36 * sin(a)])]);
          var la = 0.17 * sin(TAU * (3 * ph + k / 2));
          P.legs.push([P.H, add(P.H, [-0.44 * cos(la), 0.44 * sin(la)])]);
        }
      } else if (st === 'FL') {
        // both arms together, the body rolling through a wave, two dolphin kicks a stroke
        P.head = [-0.08, -0.06 * sin(TAU * ph + 0.6)];
        P.S = [-0.19, 0.02 - 0.04 * sin(TAU * ph + 0.3)];
        P.H = [-0.56, 0.04 + 0.07 * sin(TAU * ph - 1.0)];
        var fa = TAU * ph, farm = [P.S, add(P.S, [0.36 * cos(fa), 0.36 * sin(fa)])];
        P.arms.push(farm, farm.map(function (p) { return [p[0] - 0.02, p[1] + 0.01]; }));
        var fk = 0.3 * sin(TAU * 2 * ph), fkn = add(P.H, [-0.22 * cos(fk * 0.5), 0.22 * sin(fk * 0.5)]);
        var fleg = [P.H, fkn, add(fkn, [-0.23 * cos(fk), 0.23 * sin(fk)])];
        P.legs.push(fleg, fleg);
      } else {
        // breaststroke: pull and breathe, hands shoot forward, kick, glide
        var lift = Math.sin(Math.PI * Math.max(0, Math.min(1, (ph - 0.1) / 0.36)));
        P.head = [-0.08, -0.08 * lift]; P.S = [-0.19, 0.02 - 0.04 * lift]; P.H = [-0.56, 0.04 + 0.03 * lift];
        var ext = [0.4, 0.01], pulled = [0.07, 0.2], tucked = [0.13, 0.05], bh;
        if (ph < 0.3) bh = lerp2(ext, pulled, sm(ph / 0.3));
        else if (ph < 0.47) { var bq = (ph - 0.3) / 0.17; bh = bq < 0.4 ? lerp2(pulled, tucked, sm(bq / 0.4)) : lerp2(tucked, ext, sm((bq - 0.4) / 0.6)); }
        else bh = ext;
        var reach = Math.hypot(bh[0], bh[1]) / 0.4, bel = [bh[0] / 2, bh[1] / 2 + 0.1 * (1 - reach)];
        var armB = [P.S, add(P.S, bel), add(P.S, bh)];
        P.arms.push(armB, armB);
        var bb = ph < 0.28 ? 0 : ph < 0.47 ? sm((ph - 0.28) / 0.19) : ph < 0.6 ? 1 - sm((ph - 0.47) / 0.13) : 0;
        var legB = [P.H, add(P.H, lerp2([-0.22, 0.01], [-0.1, 0.17], bb)), add(P.H, lerp2([-0.45, 0.02], [-0.24, 0.0], bb))];
        P.legs.push(legB, legB);
      }
      return P;
    }
    // draw a pose at (x, y), facing dir, turned by ang about the pivot (positive tips the head down)
    function swimmer(c, x, y, dir, L, P, col, ang, piv) {
      c.save();
      c.translate(x, y); c.scale(dir * L, L);
      if (ang) { c.translate(piv[0], piv[1]); c.rotate(ang); c.translate(-piv[0], -piv[1]); }
      c.lineWidth = Math.max(2, L * 0.05) / L; c.lineCap = c.lineJoin = 'round';
      if (P.plat) { c.strokeStyle = MIST; poly(c, P.plat); }
      c.strokeStyle = col;
      V.ga(c, 0.45); poly(c, P.arms[1]); poly(c, P.legs[1]);
      V.ga(c, 1); poly(c, P.legs[0]); poly(c, [P.head, P.S, P.H]);
      c.beginPath(); c.arc(P.head[0], P.head[1], 0.07, 0, TAU); c.fillStyle = DEEP; c.fill(); c.stroke();
      c.beginPath(); c.arc(P.head[0] + P.face[0], P.head[1] + P.face[1], 0.018, 0, TAU); c.fillStyle = col; c.fill();
      poly(c, P.arms[0]);
      c.restore();
    }

    /* ---- drawing ---- */
    var w = 0, h = 0, dpr = 1, t0 = 0, raf = 0, visible = false, done = false, started = false;
    function layout() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.getBoundingClientRect().width;
      h = w < 520 ? 250 : 290;
      cv.style.height = h + 'px';
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    function drawRace(t) {
      var c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      var narrow = w < 520, L0 = narrow ? 8 : 112, R = 10, TOPY = 34, laneH = (h - TOPY - 28) / 2;
      var X = function (m) { return L0 + m / POOL * (w - L0 - R); };
      var BL = Math.max(36, Math.min(laneH * 0.85, (X(POOL) - X(0)) * 0.17, 96)), tick = POOL === 25 ? 5 : 10;
      // the head runs from a body length off the wall it pushed from to the wall it touches, so a turn flips the body in place
      var headX = function (pos, dir) { return dir > 0 ? X(0) + BL + (X(POOL) - X(0) - BL) * pos / POOL : X(0) + (X(POOL) - BL - X(0)) * pos / POOL; };
      V.ga(c, 1);
      c.fillStyle = 'rgba(124,196,255,0.06)';
      c.fillRect(X(0), TOPY, X(POOL) - X(0), laneH * 2);
      for (var m = tick; m < POOL; m += tick) {
        V.line(c, X(m), TOPY, X(m), TOPY + laneH * 2, 'rgba(234,246,248,0.08)', { width: 1 });
        V.text(c, m + ' m', X(m), h - 10, { size: 10, color: MIST, align: 'center' });
      }
      for (var r = 0; r <= 2; r++) {
        var ry = TOPY + r * laneH;
        V.line(c, X(0), ry, X(POOL), ry, r === 1 ? 'rgba(255,177,78,0.6)' : 'rgba(234,246,248,0.25)', { width: r === 1 ? 2 : 1, dash: r === 1 ? [6, 5] : null });
      }
      var slow = Math.max(SW[0].t, SW[1].t);
      V.text(c, fmtT(Math.max(0, Math.min(t, slow))), w - R, 22, { size: narrow ? 18 : 22, color: FOAM, align: 'right', weight: 500 });
      V.text(c, '×' + SPEED + ' speed', L0, 22, { size: 11, color: MIST });
      SW.forEach(function (s, i) {
        var fin = t >= s.t, sg = stage(s, t), d = distance(s, t, sg);
        var len = Math.min(Math.floor(d / POOL), LENGTHS - 1), along = d - len * POOL;
        var pos = fin ? (LENGTHS % 2 ? POOL : 0) : len % 2 === 0 ? along : POOL - along;
        var dir = fin ? (LENGTHS % 2 ? 1 : -1) : len % 2 === 0 ? 1 : -1;
        var cy = TOPY + (i + 0.5) * laneH + BL * 0.04, st = strokeAt(Math.min(d, DIST - 0.01));
        var x = headX(pos, dir), y = cy, ang = 0, piv = [0, 0], P;
        var bottom = TOPY + (i + 1) * laneH;
        // the water surface through the lane
        V.line(c, X(0), cy - BL * 0.01, X(POOL), cy - BL * 0.01, 'rgba(124,196,255,0.22)', { width: 1 });
        c.save();
        c.beginPath(); c.rect(X(0), TOPY + i * laneH + 1, X(POOL) - X(0), laneH - 2); c.clip();
        var k = sg.k == null ? 0 : Math.max(0, Math.min(1, sg.k));
        if (sg.kind === 'block') {
          P = pose('block', st, 0);
          x = X(0) + 0.45 * BL; y = st === 'BK' ? cy : cy - 0.3 * BL; dir = 1;
        } else if (sg.kind === 'flight') {
          // off the block in an arc, entering the water a few metres out (a backstroker arches back over the surface)
          var bk = st === 'BK', y0 = bk ? cy : cy - 0.3 * BL;
          P = pose('line', st, 0);
          x = lerp(X(0) + 0.45 * BL, headX(s.dEntry, 1), k);
          y = lerp(y0, cy + 0.1 * BL, k) - (bk ? 0.14 : 0.2) * BL * 4 * k * (1 - k);
          ang = -0.2 + 0.65 * k; dir = 1;
        } else if (sg.kind === 'turn') {
          // tumble for freestyle and backstroke, a two-hand touch and tuck for breaststroke and butterfly
          var dIn = sg.j % 2 === 0 ? 1 : -1, sIn = strokeAt((sg.j + 1) * POOL - 0.01), flip = sIn === 'FR' || sIn === 'BK';
          P = pose('tuck', sIn, 0);
          dir = dIn; x = (dIn > 0 ? X(POOL) : X(0)) - dIn * 0.3 * BL; y = cy + 0.06 * BL;
          piv = [-0.14, 0.15];
          if (flip) ang = Math.PI * sm(k);
          else { ang = -0.25 * Math.sin(Math.PI * k); y -= 0.08 * BL * Math.sin(Math.PI * k); }
        } else if (sg.kind === 'under') {
          var dep = sg.start ? (k < 0.3 ? 0.1 + 0.12 * sm(k / 0.3) : 0.22 * (1 - sm((k - 0.3) / 0.7))) : 0.16 * (1 - sm(k));
          P = pose('under', st, d / (DPS * 0.4), k);
          y = cy + dep * BL;
          ang = sg.start ? (k < 0.6 ? 0.2 - 0.4 * sm(k / 0.6) : -0.2 * (1 - sm((k - 0.6) / 0.4))) : -0.12 * Math.sin(Math.PI * k);
        } else if (fin) P = pose('swim', st, st === 'BR' ? 0.75 : 0.95);
        else P = pose('swim', st, base(s, t) / DPS);
        if (!fin && (sg.kind === 'swim' || sg.kind === 'under')) {
          var tail = x - dir * BL * 0.95, g = c.createLinearGradient(tail, 0, tail - dir * 60, 0);
          g.addColorStop(0, s.col); g.addColorStop(1, 'rgba(0,0,0,0)');
          V.ga(c, 0.35); c.strokeStyle = g; c.lineWidth = 2; c.beginPath(); c.moveTo(tail, y); c.lineTo(tail - dir * 60, y); c.stroke(); V.ga(c, 1);
        }
        swimmer(c, x, y, dir, BL, P, s.col, ang, piv);
        c.restore();
        // split times float up off the wall they were taken at
        if (s.cum) {
          var seg = DIST / s.cum.length;
          for (var q = 0; q < s.cum.length - 1; q++) {
            var lap = s.cum[q] - (q ? s.cum[q - 1] : 0), life = Math.min(1.8, 0.9 * lap / SPEED), age = (t - s.cum[q]) / SPEED;
            if (age < 0 || age >= life) continue;
            var dk = seg * (q + 1), wl = Math.round(dk / POOL);
            if (Math.abs(dk / POOL - wl) > 1e-6) continue;
            var far = wl % 2 === 1, a = age < 0.12 ? age / 0.12 : 1 - sm((age - life * 0.6) / (life * 0.4));
            V.ga(c, a);
            V.text(c, dk + ' m  ' + fmtT(s.cum[q]), far ? X(POOL) - 6 : X(0) + 6, bottom - 9 - 8 * sm(age / life), { size: narrow ? 10 : 11, color: s.col, align: far ? 'right' : 'left', weight: 600 });
            V.ga(c, 1);
          }
        }
        var info = s.cum ? 'length ' + Math.min(len + 1, LENGTHS) + '/' + LENGTHS : 'even pace';
        var topY = TOPY + i * laneH + 15, right = x > (X(0) + X(POOL)) / 2;
        if (!narrow) {
          V.text(c, s.name, 8, cy - 8, { size: 12, color: s.col, weight: 600 });
          V.text(c, info, 8, cy + 8, { size: 10, color: MIST });
          if (sel.st === 'IM') V.text(c, STROKES[st], 8, cy + 22, { size: 10, color: MIST });
          if (fin) V.text(c, fmtT(s.t), x + (right ? -8 : 8), topY, { size: 13, color: s.col, align: right ? 'right' : 'left', weight: 600 });
        } else {
          var lab = fin ? s.name + ' · ' + fmtT(s.t) : s.name;
          V.text(c, lab, right ? x - 6 : x + 6, topY, { size: 10, color: s.col, align: right ? 'right' : 'left', weight: fin ? 600 : 400 });
        }
      });
    }
    function summary() {
      var a = SW[0], b = SW[1];
      if (Math.abs(a.t - b.t) < 0.005) return 'Fig. 8. A dead heat: both swims touch at ' + fmtT(a.t) + '.';
      var fast = a.t < b.t ? a : b, slow = fast === a ? b : a, gap = DIST - base(slow, fast.t);
      return 'Fig. 8. ' + fast.name + ' touches in <b>' + fmtT(fast.t) + '</b>; ' + slow.name + ' is still <b>' + gap.toFixed(1) + ' m</b> out, finishing in ' + fmtT(slow.t) + '.' +
        (!a.cum || !b.cum ? ' Swims without recorded splits are paced evenly.' : '');
    }
    function running() {
      return 'Fig. 8. Pick an event, then any two of my swims of it. Each is swum at its real splits, start and turns included, ' + SPEED + ' times real speed; the clock shows real time and the splits pop up at each wall.';
    }
    function frame(now) {
      raf = 0;
      if (!t0) t0 = now;
      var t = (now - t0) / 1000 * SPEED, slow = Math.max(SW[0].t, SW[1].t);
      drawRace(t);
      if (t >= slow) { done = true; raceRead.innerHTML = summary(); return; }
      if (raceRead.innerHTML !== running()) raceRead.innerHTML = running();
      if (visible) raf = requestAnimationFrame(frame);
    }
    function go() {
      pick();
      cancelAnimationFrame(raf); raf = 0;
      if (reduce) { done = true; started = true; drawRace(999); raceRead.innerHTML = summary(); return; }
      if (!visible) { done = false; started = false; drawRace(0); raceRead.innerHTML = running(); return; }
      cancelAnimationFrame(raf); raf = 0; t0 = 0; done = false; started = true;
      raf = requestAnimationFrame(frame);
    }
    fix();
    built = true;
    pick();
    layout();
    drawRace(reduce ? 999 : 0);
    raceRead.innerHTML = reduce ? summary() : running();
    window.addEventListener('resize', function () { layout(); drawRace(done || reduce ? 999 : 0); if (started && !done) go(); });
    if (window.IntersectionObserver && !reduce) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !started) go();
        else if (visible && !done && !raf) raf = requestAnimationFrame(frame);
      }, { threshold: 0.4 }).observe(cv);
    } else { visible = true; done = true; drawRace(999); raceRead.innerHTML = summary(); }
    [selA, selB].forEach(function (s) { s.addEventListener('change', function () { visible = true; go(); }); });
    if (again) again.addEventListener('click', function () { visible = true; go(); });
  })();
})();
