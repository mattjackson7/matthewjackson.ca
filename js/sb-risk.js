/* Risk sandbox: build a portfolio from the engine's four asset classes and
   watch its loss distribution, VaR, CVaR and component VaR respond.
   20,000 standard normal scenarios are drawn once; each change re-correlates
   them through a fresh Cholesky factor, so the histogram morphs instead of
   reshuffling. */
(function () {
  var root = document.getElementById('sb-risk');
  if (!root || !window.Sandbox || !window.Viz) return;
  var V = Viz, SB = Sandbox, FOAM = V.FOAM, MIST = V.MIST, DEEP = V.DEEP, ACC = '#ffb14e';

  var NAMES = ['Equities', 'Credit', 'Commodities', 'Real estate'], SHORT = ['EQ', 'CR', 'CM', 'RE'];
  var VOLS = [0.18, 0.09, 0.22, 0.20];
  var RHO = [
    [1.00, 0.45, 0.25, 0.55],
    [0.45, 1.00, 0.15, 0.40],
    [0.25, 0.15, 1.00, 0.20],
    [0.55, 0.40, 0.20, 1.00]
  ];
  var CRISIS = 0.8;
  var DEF = { pos: [400, 300, 150, 150], stress: 0, days: 10, conf: 0.99 };
  var P = { pos: DEF.pos.slice(), stress: DEF.stress, days: DEF.days, conf: DEF.conf };
  var NS = 20000, NB = 56, n = 4;

  // the fixed draws
  var R = V.rng(20261116), Z = new Float64Array(NS * n);
  for (var k = 0; k < NS * n; k++) Z[k] = V.gauss(R);

  function corr() {
    return RHO.map(function (r, i) { return r.map(function (v, j) { return i === j ? 1 : v + P.stress * (CRISIS - v); }); });
  }
  function cholesky(A) {
    var L = A.map(function () { return [0, 0, 0, 0]; });
    for (var i = 0; i < n; i++) for (var j = 0; j <= i; j++) {
      var s = A[i][j];
      for (var m = 0; m < j; m++) s -= L[i][m] * L[j][m];
      L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j][j];
    }
    return L;
  }
  function zq(p) { // inverse normal CDF by bisection on Viz.N
    var lo = -8, hi = 8;
    for (var it = 0; it < 60; it++) { var mid = (lo + hi) / 2; if (V.N(mid) < p) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  /* ---------- Targets and eased copies ---------- */
  var PNL = new Float64Array(NS), DP = new Float64Array(NS), SORT = new Float64Array(NS);
  var T = { R: 1, VaR: 0, CVaR: 0, comp: [0, 0, 0, 0], stand: [0, 0, 0, 0], scale: 1 }, D = { R: null, VaR: null, CVaR: null, comp: [0, 0, 0, 0], stand: [0, 0, 0, 0], scale: null, hmax: null };
  var M = {}, first = true;

  function recompute() {
    var C = corr(), L = cholesky(C), h = Math.sqrt(P.days / 252), i, j;
    var b = P.pos.map(function (p, i) { return p * VOLS[i] * h; }); // $k of one-sigma move per asset
    var tot = P.pos.reduce(function (a, v) { return a + v; }, 0);
    // a = L^T b, so each scenario's P&L is a . z
    var a = [0, 0, 0, 0];
    for (j = 0; j < n; j++) for (i = j; i < n; i++) a[j] += L[i][j] * b[i];
    for (k = 0; k < NS; k++) {
      var o = k * n;
      PNL[k] = a[0] * Z[o] + a[1] * Z[o + 1] + a[2] * Z[o + 2] + a[3] * Z[o + 3];
    }
    SORT.set(PNL); SORT.sort();
    var cut = Math.max(1, Math.floor((1 - P.conf) * NS)), tail = 0;
    for (k = 0; k < cut; k++) tail += SORT[k];
    var VaR = -SORT[cut], CVaR = -tail / cut;
    // parametric component VaR, which splits exactly (Euler)
    var Cb = b.map(function (_, i) { return C[i].reduce(function (s, v, j) { return s + v * b[j]; }, 0); });
    var sp = Math.sqrt(b.reduce(function (s, v, i) { return s + v * Cb[i]; }, 0)), z = zq(P.conf);
    var comp = b.map(function (v, i) { return sp > 0 ? z * v * Cb[i] / sp : 0; });
    var stand = b.map(function (v) { return z * v; });
    var standSum = stand.reduce(function (s, v) { return s + v; }, 0);
    var avg = 0;
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) avg += C[i][j] / 6;
    M = { tot: tot, VaR: VaR, CVaR: CVaR, VaRp: z * sp, standSum: standSum, avg: avg, sp: sp };
    T.R = Math.max(1, 4.6 * sp); T.VaR = VaR; T.CVaR = CVaR; T.comp = comp; T.stand = stand;
    T.scale = Math.max(1, standSum) * 1.08;
    if (first) { DP.set(PNL); first = false; }
    report();
    vw.kick();
  }

  /* ---------- Controls ---------- */
  var ctl = root.querySelector('.sb-controls');
  function k$(v) { return v >= 1000 ? '$' + (v / 1000).toFixed(2) + 'M' : '$' + Math.round(v) + 'k'; }
  var sP = NAMES.map(function (nm, i) {
    return SB.slider(ctl, { label: nm + ' <span class="sb-sub">' + Math.round(VOLS[i] * 100) + '% vol</span>', min: 0, max: 1000, step: 10, value: P.pos[i], fmt: k$, onInput: function (v) { P.pos[i] = v; recompute(); } });
  });
  var sS = SB.slider(ctl, { label: 'Correlation stress', min: 0, max: 100, step: 1, value: 0, fmt: function (v) { return v ? v + '% to crisis' : 'as estimated'; }, onInput: function (v) { P.stress = v / 100; recompute(); } });
  var sD = SB.slider(ctl, { label: 'Horizon', min: 1, max: 20, step: 1, value: P.days, fmt: function (v) { return v + (v === 1 ? ' day' : ' days'); }, onInput: function (v) { P.days = v; recompute(); } });
  var cC = SB.chips(ctl, { label: 'Confidence', value: 0.99, options: [{ v: 0.95, label: '95%' }, { v: 0.99, label: '99%' }, { v: 0.999, label: '99.9%' }], onChange: function (v) { P.conf = v; recompute(); } });
  SB.resetButton(ctl, function () {
    P = { pos: DEF.pos.slice(), stress: DEF.stress, days: DEF.days, conf: DEF.conf };
    sP.forEach(function (s, i) { s.set(P.pos[i]); }); sS.set(0); sD.set(P.days); cC.set(P.conf);
    recompute();
  });

  /* ---------- Readouts ---------- */
  var setOut = SB.readouts(root.querySelector('.sb-out'), [
    { key: 'tot', label: 'Portfolio' },
    { key: 'var', label: 'VaR' },
    { key: 'cvar', label: 'CVaR' },
    { key: 'div', label: 'Diversification' },
    { key: 'rho', label: 'Average &rho;' }
  ]);
  var readEl = root.querySelector('.sb-read');
  function pct(c) { return (Math.round(c * 1000) / 10) + '%'; }
  function report() {
    if (M.tot <= 0) {
      setOut({ tot: '$0', var: '&ndash;', cvar: '&ndash;', div: '&ndash;', rho: M.avg.toFixed(2) });
      readEl.innerHTML = 'Give the portfolio at least one position to see its risk.';
      return;
    }
    var save = Math.max(0, M.standSum - M.VaRp), share = M.standSum > 0 ? save / M.standSum : 0;
    setOut({ tot: k$(M.tot), var: k$(M.VaR), cvar: k$(M.CVaR), div: '&minus;' + Math.round(share * 100) + '%', rho: M.avg.toFixed(2) });
    var held = P.pos.filter(function (v) { return v > 0; }).length;
    var hz = P.days + (P.days === 1 ? ' day' : ' days');
    readEl.innerHTML = 'Over ' + hz + ', there’s a <b>' + pct(1 - P.conf) + '</b> chance of losing more than <b>' + k$(M.VaR) + '</b> (' + (M.VaR / M.tot * 100).toFixed(1) + '% of the portfolio). ' +
      'When that happens, the average loss is <b>' + k$(M.CVaR) + '</b>. ' +
      (held < 2 ? 'With a single asset there’s nothing to diversify: add a second position to see VaR fall below the sum of its parts.' :
      'Holding ' + (held === 4 ? 'the four' : 'these ' + held) + ' together rather than separately cuts VaR by <b>' + k$(save) + '</b>' +
      (P.stress > 0.5 ? ': less and less as correlations rise toward ' + CRISIS + '.' : '.'));
  }

  /* ---------- Drawing ---------- */
  var vw = SB.view(root.querySelector('canvas'), {
    height: function (w) { return w < 640 ? 470 : Math.min(420, Math.round(w * 0.5)); },
    draw: draw
  });
  var BINS = new Float64Array(NB);

  function draw(c, w, h, dt) {
    var moving = SB.towardAll(DP, PNL, dt, 10, 0.02);
    ['R', 'VaR', 'CVaR', 'scale'].forEach(function (key) {
      D[key] = SB.toward(D[key], T[key], dt, 10);
      if (SB.near(D[key], T[key], 0.01)) D[key] = T[key]; else moving = true;
    });
    moving = SB.towardAll(D.comp, T.comp, dt, 10, 0.01) || moving;
    moving = SB.towardAll(D.stand, T.stand, dt, 10, 0.01) || moving;

    var wide = w >= 640;
    var hb = wide ? { x: 46, y: 34, w: w * 0.6 - 60, h: h - 34 - 36 } : { x: 40, y: 34, w: w - 54, h: 220 };
    var cb = wide ? { x: w * 0.6 + 12, y: 34, w: w * 0.4 - 18, h: h - 34 - 20 } : { x: 0, y: hb.y + hb.h + 64, w: w - 4, h: h - (hb.y + hb.h + 64) - 10 };

    /* histogram of P&L */
    var Rr = D.R, i;
    for (i = 0; i < NB; i++) BINS[i] = 0;
    for (k = 0; k < NS; k++) {
      var bi = Math.floor((DP[k] + Rr) / (2 * Rr) * NB);
      if (bi >= 0 && bi < NB) BINS[bi]++;
    }
    var hmax = 0;
    for (i = 0; i < NB; i++) hmax = Math.max(hmax, BINS[i]);
    D.hmax = SB.toward(D.hmax, hmax, dt, 10);
    if (!SB.near(D.hmax, hmax, 1)) moving = true;
    var step = SB.niceStep(2 * Rr, wide ? 5 : 4), xt = [];
    for (var t = Math.ceil(-Rr / step) * step; t <= Rr; t += step) xt.push(Math.abs(t) < 1e-9 ? 0 : t);
    var F = V.frame(c, hb, [-Rr, Rr], [0, Math.max(1, D.hmax) * 1.12], {
      xticks: xt, xfmt: function (v) { return (v < 0 ? '−' : v > 0 ? '+' : '') + '$' + Math.round(Math.abs(v)) + 'k'; }
    });
    V.text(c, 'profit or loss over ' + P.days + (P.days === 1 ? ' day' : ' days'), hb.x, hb.y - 18, { size: 10 });
    var bw = hb.w / NB;
    for (i = 0; i < NB; i++) {
      if (!BINS[i]) continue;
      var x0 = hb.x + i * bw, mid = -Rr + (i + 0.5) * 2 * Rr / NB, inTail = mid < -D.VaR;
      V.ga(c, inTail ? 0.95 : 0.4);
      c.fillStyle = inTail ? ACC : MIST;
      var y = F.Y(BINS[i]);
      c.fillRect(x0 + 0.5, y, Math.max(0.5, bw - 1), hb.y + hb.h - y);
    }
    if (M.tot > 0) {
      var vx = F.X(-D.VaR), cx = F.X(-D.CVaR);
      V.line(c, vx, hb.y + 4, vx, hb.y + hb.h, ACC, { width: 1.6 });
      V.text(c, 'VaR ' + k$(D.VaR), vx + 5, hb.y + 12, { size: 11, color: FOAM, weight: 500 });
      V.line(c, cx, hb.y + 30, cx, hb.y + hb.h, FOAM, { width: 1.2, dash: [3, 3], alpha: 0.7 });
      V.text(c, 'CVaR ' + k$(D.CVaR), cx - 5, hb.y + 38, { size: 11, color: FOAM, align: 'right' });
    }

    /* component VaR */
    var labW = wide ? 66 : 122, valW = 54, bx = cb.x + labW, bwid = Math.max(40, cb.w - labW - valW);
    var rowH = Math.min(34, (cb.h - 70) / 5.6), sc = D.scale;
    V.text(c, 'Component VaR', cb.x, cb.y - 18, { size: 10 });
    V.text(c, 'outline: each held alone', cb.x + cb.w, cb.y - 18, { size: 10, align: 'right', alpha: 0.8 });
    var W2 = function (v) { return Math.max(0, v) / sc * bwid; };
    for (i = 0; i < n; i++) {
      var ry = cb.y + i * rowH * 1.25 + 4, bh = rowH * 0.62;
      var share = M.tot > 0 ? Math.round(P.pos[i] / M.tot * 100) : 0;
      V.text(c, (wide ? SHORT[i] : NAMES[i]) + ' ' + share + '%', cb.x, ry + bh * 0.78, { size: 11, color: FOAM });
      V.ga(c, 1); c.strokeStyle = 'rgba(143,177,189,0.55)'; c.lineWidth = 1;
      c.strokeRect(bx + 0.5, ry + 0.5, Math.max(0, W2(D.stand[i]) - 1), bh - 1);
      V.ga(c, 0.9); c.fillStyle = ACC; c.fillRect(bx, ry, W2(D.comp[i]), bh);
      V.text(c, k$(D.comp[i]), bx + W2(Math.max(D.comp[i], D.stand[i])) + 6, ry + bh * 0.78, { size: 10 });
    }
    // the total: components stacked, against the sum of the standalone VaRs
    var ty = cb.y + n * rowH * 1.25 + 18, th = rowH * 0.8, sum = 0;
    V.text(c, 'Total', cb.x, ty + th * 0.72, { size: 11, color: FOAM, weight: 500 });
    V.ga(c, 1); c.strokeStyle = 'rgba(143,177,189,0.55)';
    c.strokeRect(bx + 0.5, ty + 0.5, Math.max(0, W2(D.stand.reduce(function (s, v) { return s + v; }, 0)) - 1), th - 1);
    for (i = 0; i < n; i++) {
      var x = bx + W2(sum), ww = W2(D.comp[i]);
      V.ga(c, 0.55 + 0.4 * (i % 2)); c.fillStyle = ACC; c.fillRect(x, ty, Math.max(0, ww - 2), th);
      if (ww > 22) V.text(c, SHORT[i], x + 4, ty + th * 0.68, { size: 9, color: DEEP, weight: 500, keepIn: false });
      sum += D.comp[i];
    }
    var standTot = D.stand.reduce(function (s, v) { return s + v; }, 0);
    if (M.tot > 0) {
      V.text(c, k$(sum), bx + W2(standTot) + 6, ty + th * 0.72, { size: 10, color: FOAM });
      var gap = standTot - sum;
      if (gap > 0.5) {
        var gy = ty + th + 16;
        V.line(c, bx + W2(sum), gy - 4, bx + W2(standTot), gy - 4, MIST, { width: 1 });
        V.text(c, '−' + k$(gap) + ' from diversification', bx + W2(standTot), gy + 10, { size: 10, align: 'right' });
      }
    }
    V.ga(c, 1);
    return moving;
  }

  recompute();
})();
