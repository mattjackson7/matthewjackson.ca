/* Optimizer sandbox: set your own expected returns and watch the
   maximum-Sharpe portfolio re-solve. With shorting allowed it's closed form;
   long-only, every subset of assets is tried (31 for five assets): the optimum
   is the best of the subsets whose own unconstrained solution is all positive. */
(function () {
  var root = document.getElementById('sb-optimizer');
  if (!root || !window.Sandbox || !window.Viz) return;
  var V = Viz, SB = Sandbox, FOAM = V.FOAM, MIST = V.MIST, DEEP = V.DEEP, ACC = '#5fd3b0';

  var VOL = [0.10, 0.14, 0.18, 0.24, 0.30];
  var CORR = [
    [1.0, 0.3, 0.2, 0.1, 0.1],
    [0.3, 1.0, 0.4, 0.3, 0.2],
    [0.2, 0.4, 1.0, 0.5, 0.3],
    [0.1, 0.3, 0.5, 1.0, 0.4],
    [0.1, 0.2, 0.3, 0.4, 1.0]
  ];
  var n = 5, RF = 0.02, NF = 64, MUMIN = -0.04, MUMAX = 0.20;
  var DEF = { mu: [0.05, 0.07, 0.09, 0.11, 0.13], short: false, shrink: 0 };
  var P = { mu: DEF.mu.slice(), short: DEF.short, shrink: DEF.shrink };
  var RBAR = 0;
  for (var a = 0; a < n; a++) for (var b = a + 1; b < n; b++) RBAR += CORR[a][b] / 10;

  /* ---------- Linear algebra on small matrices ---------- */
  function solve(A, y) { // Gaussian elimination with partial pivoting; null if singular
    var m = y.length, M = A.map(function (r, i) { return r.slice().concat([y[i]]); });
    for (var c = 0; c < m; c++) {
      var p = c;
      for (var r = c + 1; r < m; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-14) return null;
      var t = M[c]; M[c] = M[p]; M[p] = t;
      for (r = c + 1; r < m; r++) { var f = M[r][c] / M[c][c]; for (var k = c; k <= m; k++) M[r][k] -= f * M[c][k]; }
    }
    var x = new Array(m);
    for (var i = m - 1; i >= 0; i--) { var s = M[i][m]; for (var j = i + 1; j < m; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
    return x;
  }
  function sigma() {
    return CORR.map(function (r, i) { return r.map(function (v, j) { var c = i === j ? 1 : v + P.shrink * (RBAR - v); return c * VOL[i] * VOL[j]; }); });
  }
  function stats(w, S) {
    var m = 0, v = 0;
    for (var i = 0; i < n; i++) { m += w[i] * P.mu[i]; for (var j = 0; j < n; j++) v += w[i] * S[i][j] * w[j]; }
    return { m: m, s: Math.sqrt(Math.max(v, 0)) };
  }
  // every non-empty subset, as index lists
  var SUBS = [];
  for (var mask = 1; mask < 32; mask++) { var idx = []; for (var q = 0; q < n; q++) if (mask & (1 << q)) idx.push(q); SUBS.push(idx); }
  function sub(S, ix) { return ix.map(function (i) { return ix.map(function (j) { return S[i][j]; }); }); }
  function expand(ix, x) { var w = [0, 0, 0, 0, 0]; ix.forEach(function (i, k) { w[i] = x[k]; }); return w; }

  // the portfolio on support ix that minimizes variance for return m (m == null: just fully invested)
  function minVar(S, ix, m) {
    var Ss = sub(S, ix), ones = ix.map(function () { return 1; }), mus = ix.map(function (i) { return P.mu[i]; });
    var x1 = solve(Ss, ones);
    if (!x1) return null;
    if (m == null) { var s1 = x1.reduce(function (s, v) { return s + v; }, 0); return expand(ix, x1.map(function (v) { return v / s1; })); }
    if (ix.length < 2) return Math.abs(mus[0] - m) < 1e-9 ? expand(ix, [1]) : null;
    var xm = solve(Ss, mus);
    var A = x1.reduce(function (s, v) { return s + v; }, 0), B = xm.reduce(function (s, v) { return s + v; }, 0);
    var C = xm.reduce(function (s, v, k) { return s + v * mus[k]; }, 0), det = A * C - B * B;
    if (Math.abs(det) < 1e-12) return null;
    var lam = (C - B * m) / det, gam = (A * m - B) / det;
    return expand(ix, x1.map(function (v, k) { return lam * v + gam * xm[k]; }));
  }
  function bestLongOnly(S, m) {
    var best = null, bv = Infinity;
    SUBS.forEach(function (ix) {
      var w = minVar(S, ix, m);
      if (!w || w.some(function (v) { return v < -1e-10; })) return;
      var v = stats(w, S).s;
      if (v < bv) { bv = v; best = w; }
    });
    return best;
  }
  function tangency(S) {
    var best = null, bsr = -Infinity;
    (P.short ? [SUBS[SUBS.length - 1]] : SUBS).forEach(function (ix) {
      var x = solve(sub(S, ix), ix.map(function (i) { return P.mu[i] - RF; }));
      if (!x) return;
      var tot = x.reduce(function (s, v) { return s + v; }, 0);
      if (tot <= 1e-12) return;
      var w = expand(ix, x.map(function (v) { return v / tot; }));
      if (!P.short && w.some(function (v) { return v < -1e-10; })) return;
      var st = stats(w, S), sr = (st.m - RF) / st.s;
      if (sr > bsr) { bsr = sr; best = w; }
    });
    return best;
  }

  /* ---------- Targets and eased copies ---------- */
  var T = { fs: new Float64Array(NF), fm: new Float64Array(NF), w: [0, 0, 0, 0, 0], mu: P.mu.slice(), tan: [0, 0], ylo: 0, yhi: 0.2, wmax: 1 };
  var D = { fs: new Float64Array(NF), fm: new Float64Array(NF), w: [0, 0, 0, 0, 0], mu: P.mu.slice(), tan: [0, 0], ylo: null, yhi: null, wmax: null };
  var M = {}, firstDraw = true;

  function recompute() {
    var S = sigma(), i;
    var gmv = P.short ? minVar(S, SUBS[SUBS.length - 1], null) : bestLongOnly(S, null);
    var g = stats(gmv, S), top = Math.max.apply(null, P.mu);
    var hi = P.short ? Math.max(top + 0.05, g.m + 0.06) : top;
    for (i = 0; i < NF; i++) {
      var m = g.m + (hi - g.m) * i / (NF - 1), w;
      if (P.short) w = minVar(S, SUBS[SUBS.length - 1], m);
      else w = i === NF - 1 ? expand([P.mu.indexOf(top)], [1]) : bestLongOnly(S, m);
      var st = w ? stats(w, S) : { s: T.fs[i], m: m };
      T.fs[i] = st.s; T.fm[i] = st.m;
    }
    var tw = tangency(S);
    M = { ok: !!tw };
    if (tw) {
      var ts = stats(tw, S);
      M.m = ts.m; M.s = ts.s; M.sr = (ts.m - RF) / ts.s; M.w = tw;
      T.w = tw.slice(); T.tan = [ts.s, ts.m];
    } else {
      M.w = gmv; M.m = g.m; M.s = g.s;
      T.w = gmv.slice(); T.tan = [g.s, g.m];
    }
    T.mu = P.mu.slice();
    var lo = Math.min(RF, Math.min.apply(null, P.mu)), yh = Math.max(top, P.short ? hi : top);
    T.ylo = Math.floor((lo - 0.02) * 50) / 50; T.yhi = Math.ceil((yh + 0.02) * 50) / 50;
    T.wmax = Math.max(1, Math.max.apply(null, T.w.map(Math.abs)));
    if (firstDraw) { D.fs.set(T.fs); D.fm.set(T.fm); firstDraw = false; }
    report();
    vw.kick();
  }

  /* ---------- Controls ---------- */
  var ctl = root.querySelector('.sb-controls');
  function p1(v) { return (v * 100).toFixed(1) + '%'; }
  var sM = P.mu.map(function (m, i) {
    return SB.slider(ctl, { label: 'A' + (i + 1) + ' expected return <span class="sb-sub">' + Math.round(VOL[i] * 100) + '% vol</span>', min: MUMIN * 100, max: MUMAX * 100, step: 0.5, value: m * 100,
      fmt: function (v) { return v.toFixed(1) + '%'; }, onInput: function (v) { P.mu[i] = v / 100; recompute(); } });
  });
  var sSh = SB.slider(ctl, { label: 'Covariance shrinkage <i>&delta;</i>', min: 0, max: 100, step: 1, value: 0, fmt: function (v) { return v + '%'; }, onInput: function (v) { P.shrink = v / 100; recompute(); } });
  var cS = SB.chips(ctl, { label: 'Constraint', value: false, options: [{ v: false, label: 'Long only' }, { v: true, label: 'Shorting allowed' }], onChange: function (v) { P.short = v; recompute(); } });
  SB.resetButton(ctl, function () {
    P = { mu: DEF.mu.slice(), short: DEF.short, shrink: DEF.shrink };
    sM.forEach(function (s, i) { s.set(P.mu[i] * 100); }); sSh.set(0); cS.set(false);
    recompute();
  });

  /* ---------- Readouts ---------- */
  var setOut = SB.readouts(root.querySelector('.sb-out'), [
    { key: 'm', label: 'Expected return' },
    { key: 's', label: 'Volatility' },
    { key: 'sr', label: 'Sharpe ratio' },
    { key: 'held', label: 'Assets held' }
  ]);
  var readEl = root.querySelector('.sb-read');
  function report() {
    var held = M.w.filter(function (v) { return Math.abs(v) > 0.005; }).length;
    setOut({ m: p1(M.m), s: p1(M.s), sr: M.ok ? M.sr.toFixed(2) : '&ndash;', held: held + ' of 5' });
    if (!M.ok) { readEl.innerHTML = 'No asset beats the <b>2%</b> risk-free rate by enough to be worth its risk, so there’s no maximum-Sharpe portfolio. Shown instead: the least volatile mix.'; return; }
    var order = M.w.map(function (v, i) { return i; }).sort(function (x, y) { return M.w[y] - M.w[x]; });
    var s = 'The maximum-Sharpe portfolio puts <b>' + Math.round(M.w[order[0]] * 100) + '%</b> in A' + (order[0] + 1) + ' and <b>' + Math.round(M.w[order[1]] * 100) + '%</b> in A' + (order[1] + 1) + '. ';
    var lo = order[order.length - 1];
    if (M.w[lo] < -0.005) s += 'It shorts <b>' + Math.round(-M.w[lo] * 100) + '%</b> of A' + (lo + 1) + ' to fund the rest. ';
    else if (held < 5) s += 'It drops ' + order.filter(function (i) { return Math.abs(M.w[i]) <= 0.005; }).map(function (i) { return 'A' + (i + 1); }).join(' and ') + ' entirely. ';
    s += P.shrink > 0.05 ? 'Shrinking the correlations toward their average (' + RBAR.toFixed(2) + ') makes the assets look more alike, which evens the weights out.' :
      'Nudge any one return by a point and see how far the weights swing: that sensitivity is why the forecasts and the covariance both get so much care.';
    readEl.innerHTML = s;
  }

  /* ---------- Drawing ---------- */
  var cv = root.querySelector('canvas');
  var vw = SB.view(cv, {
    height: function (w) { return w < 640 ? 480 : Math.min(420, Math.round(w * 0.5)); },
    draw: draw
  });
  var geo = null, drag = -1, hover = -1;

  function draw(c, w, h, dt) {
    var moving = SB.towardAll(D.fs, T.fs, dt, 12, 1e-5);
    moving = SB.towardAll(D.fm, T.fm, dt, 12, 1e-5) || moving;
    moving = SB.towardAll(D.w, T.w, dt, 12, 1e-4) || moving;
    moving = SB.towardAll(D.mu, T.mu, dt, 18, 1e-5) || moving;
    moving = SB.towardAll(D.tan, T.tan, dt, 12, 1e-5) || moving;
    ['ylo', 'yhi', 'wmax'].forEach(function (k) {
      D[k] = SB.toward(D[k], T[k], dt, 10);
      if (SB.near(D[k], T[k], 1e-4)) D[k] = T[k]; else moving = true;
    });
    var wide = w >= 640;
    var pb = wide ? { x: 48, y: 30, w: w * 0.6 - 62, h: h - 30 - 36 } : { x: 44, y: 30, w: w - 58, h: 250 };
    var wb = wide ? { x: w * 0.6 + 14, y: 34, w: w * 0.4 - 18, h: h - 54 } : { x: 0, y: pb.y + pb.h + 58, w: w - 4, h: h - (pb.y + pb.h + 58) - 8 };

    /* risk-return plane */
    var yst = SB.niceStep(D.yhi - D.ylo, 5), yt = [];
    for (var t = Math.ceil(D.ylo / yst) * yst; t <= D.yhi + 1e-9; t += yst) yt.push(t);
    var F = V.frame(c, pb, [0, 0.36], [D.ylo, D.yhi], {
      xticks: [0, 0.1, 0.2, 0.3], yticks: yt,
      xfmt: function (v) { return Math.round(v * 100) + '%'; }, yfmt: function (v) { return Math.round(v * 100) + '%'; },
      xlabel: 'risk σ', ylabel: 'return μ'
    });
    var X = F.X, Y = F.Y, i;
    c.save(); c.beginPath(); c.rect(pb.x, pb.y, pb.w, pb.h); c.clip();
    // capital market line
    if (M.ok) {
      var sl = (D.tan[1] - RF) / Math.max(1e-6, D.tan[0]);
      V.line(c, X(0), Y(RF), X(0.36), Y(RF + sl * 0.36), MIST, { dash: [4, 4], alpha: 0.6 });
    }
    // frontier
    V.ga(c, 1); c.strokeStyle = ACC; c.lineWidth = 2.2;
    c.beginPath();
    for (i = 0; i < NF; i++) c[i ? 'lineTo' : 'moveTo'](X(D.fs[i]), Y(D.fm[i]));
    c.stroke();
    c.restore();
    V.dot(c, X(0), Y(RF), 3, MIST);
    V.text(c, 'r_f', X(0) + 6, Y(RF) + 12, { size: 10 });
    // assets: drag them up and down
    for (i = 0; i < n; i++) {
      var ax = X(VOL[i]), ay = Y(D.mu[i]), on = i === drag || i === hover;
      V.ga(c, on ? 0.9 : 0.45); c.strokeStyle = FOAM; c.lineWidth = 1;
      c.beginPath(); c.arc(ax, ay, on ? 10 : 8, 0, Math.PI * 2); c.stroke();
      V.dot(c, ax, ay, 4, FOAM);
      V.text(c, 'A' + (i + 1), ax + 12, ay + 4, { size: 11, color: FOAM, weight: on ? 500 : 400 });
    }
    // the chosen portfolio
    var tx = X(D.tan[0]), ty = Y(D.tan[1]);
    V.dot(c, tx, ty, 6, ACC, { halo: true });
    V.text(c, M.ok ? 'max Sharpe' : 'min variance', tx - 10, ty - 10, { size: 11, color: FOAM, align: 'right', weight: 500 });
    V.text(c, 'drag an asset up or down', pb.x + pb.w, pb.y - 14, { size: 10, align: 'right', alpha: drag >= 0 ? 0.4 : 0.85 });

    /* weights */
    var labW = 34, valW = 46, anyNeg = D.w.some(function (v) { return v < -0.002; });
    var bx = wb.x + labW, bw = Math.max(40, wb.w - labW - valW), zero = anyNeg ? bx + bw * 0.35 : bx;
    var span = anyNeg ? bw * 0.65 : bw, rowH = Math.min(40, wb.h / 6.2);
    V.text(c, 'weights', wb.x, wb.y - 18, { size: 10 });
    V.line(c, zero, wb.y - 4, zero, wb.y + n * rowH, MIST, { alpha: 0.4 });
    for (i = 0; i < n; i++) {
      var ry = wb.y + i * rowH, bh = rowH * 0.58, ww = D.w[i] / D.wmax * span;
      V.text(c, 'A' + (i + 1), wb.x, ry + bh * 0.78, { size: 11, color: FOAM });
      V.ga(c, 0.9); c.fillStyle = ACC;
      if (ww >= 0) c.fillRect(zero, ry, ww, bh); else { V.ga(c, 0.55); c.fillRect(zero + ww, ry, -ww, bh); }
      var lab = Math.round(D.w[i] * 100) + '%';
      V.text(c, lab === '-0%' ? '0%' : lab.replace('-', '−'), ww >= 0 ? zero + ww + 6 : zero + 6, ry + bh * 0.78, { size: 10 });
    }
    V.ga(c, 1);
    geo = { X: X, Y: Y, pb: pb };
    return moving;
  }

  /* dragging an asset's expected return */
  function at(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function hit(p) {
    if (!geo) return -1;
    var best = -1, bd = 22 * 22;
    for (var i = 0; i < n; i++) { var dx = geo.X(VOL[i]) - p[0], dy = geo.Y(D.mu[i]) - p[1], d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
    return best;
  }
  function muAt(y) {
    var pb = geo.pb, v = D.ylo + (pb.y + pb.h - y) / pb.h * (D.yhi - D.ylo);
    return Math.max(MUMIN, Math.min(MUMAX, Math.round(v * 200) / 200));
  }
  cv.addEventListener('pointerdown', function (e) {
    var i = hit(at(e));
    if (i < 0) return;
    drag = i; cv.setPointerCapture(e.pointerId); e.preventDefault();
    vw.kick();
  });
  cv.addEventListener('pointermove', function (e) {
    var p = at(e);
    if (drag >= 0) {
      var v = muAt(p[1]);
      if (v !== P.mu[drag]) { P.mu[drag] = v; sM[drag].set(v * 100); recompute(); }
      return;
    }
    var hv = hit(p);
    if (hv !== hover) { hover = hv; cv.style.cursor = hv >= 0 ? 'ns-resize' : ''; vw.kick(); }
  });
  function end() { if (drag >= 0) { drag = -1; vw.kick(); } }
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('pointerleave', function () { if (hover >= 0 && drag < 0) { hover = -1; cv.style.cursor = ''; vw.kick(); } });

  recompute();
})();
