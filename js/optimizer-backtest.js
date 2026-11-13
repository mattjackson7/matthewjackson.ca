/* Optimizer page: the backtest as a scroll story. A real walk-forward
   simulation runs here on simulated assets: every five days a 252-day window
   is re-estimated, the max-Sharpe weights are re-solved and held, and the
   result is compared with equal-weight and buy-and-hold. A trailing-mean
   estimate stands in for the TFT forecast. The numbers illustrate the method;
   they are not the project's results. */
(function () {
  if (!window.Story || !window.Viz) return;
  var V = Viz, ACC = '#5fd3b0', RED = '#ff6a55', BLUE = '#7cc4ff', FOAM = V.FOAM, MIST = V.MIST;
  var TONES = [ACC, BLUE, FOAM, MIST];

  /* ---------- Simulated market ---------- */
  var NAMES = ['EQ', 'CR', 'CM', 'RE'];
  var VOLS = [0.18, 0.09, 0.22, 0.20];
  var RHO = [[1, 0.45, 0.25, 0.55], [0.45, 1, 0.15, 0.4], [0.25, 0.15, 1, 0.2], [0.55, 0.4, 0.2, 1]];
  var WIN = 252, HOLD = 5, TEST = 504, DAYS = WIN + TEST, ALPHA = 0.1;
  var n = 4;
  var S = RHO.map(function (r, i) { return r.map(function (v, j) { return v * VOLS[i] * VOLS[j]; }); });
  var L = (function () {
    var M = S.map(function () { return [0, 0, 0, 0]; });
    for (var j = 0; j < n; j++) {
      var s = 0, k;
      for (k = 0; k < j; k++) s += M[j][k] * M[j][k];
      M[j][j] = Math.sqrt(S[j][j] - s);
      for (var i = j + 1; i < n; i++) { s = 0; for (k = 0; k < j; k++) s += M[i][k] * M[j][k]; M[i][j] = (S[i][j] - s) / M[j][j]; }
    }
    return M;
  })();
  // drifts by regime: a calm stretch, a sell-off in equities and real estate, a recovery
  function drift(d) {
    if (d >= 430 && d < 530) return [-0.55, 0.01, 0.12, -0.35];
    if (d >= 530 && d < 620) return [0.30, 0.05, 0.02, 0.20];
    return [0.08, 0.035, 0.05, 0.065];
  }
  var R = V.rng(77), RET = [];
  for (var d = 0; d < DAYS; d++) {
    var z = [V.gauss(R), V.gauss(R), V.gauss(R), V.gauss(R)], mu = drift(d), row = [];
    for (var i = 0; i < n; i++) {
      var x = 0;
      for (var k = 0; k <= i; k++) x += L[i][k] * z[k];
      row.push(mu[i] / 252 + x / Math.sqrt(252));
    }
    RET.push(row);
  }
  var PRICE = NAMES.map(function (_, i) { var p = [1]; for (var t = 1; t < DAYS; t++) p.push(p[t - 1] * Math.exp(RET[t][i])); return p; });

  /* ---------- Walk-forward backtest ---------- */
  function matvec(A, x) { return A.map(function (r) { return r.reduce(function (s, v, j) { return s + v * x[j]; }, 0); }); }
  function dot(a, b) { return a.reduce(function (s, v, i) { return s + v * b[i]; }, 0); }
  function project(v) {
    var u = v.slice().sort(function (a, b) { return b - a; }), cs = 0, th = 0;
    for (var i = 0; i < u.length; i++) { cs += u[i]; var t = (cs - 1) / (i + 1); if (u[i] - t > 0) th = t; }
    return v.map(function (x) { return Math.max(0, x - th); });
  }
  function estimate(t) {
    var m = [0, 0, 0, 0], C = S.map(function () { return [0, 0, 0, 0]; }), a, b, s;
    for (s = t - WIN; s < t; s++) for (a = 0; a < n; a++) m[a] += RET[s][a] / WIN;
    for (s = t - WIN; s < t; s++) for (a = 0; a < n; a++) for (b = 0; b < n; b++) C[a][b] += (RET[s][a] - m[a]) * (RET[s][b] - m[b]) / (WIN - 1);
    var avg = V.mean(m);
    // the forecast stand-in: the trailing mean, pulled halfway to the cross-sectional mean
    var muh = m.map(function (v) { return 252 * (0.5 * v + 0.5 * avg); });
    var Sh = C.map(function (r, i2) { return r.map(function (v, j) { return 252 * (i2 === j ? v : (1 - ALPHA) * v); }); });
    return { mu: muh, S: Sh };
  }
  function maxSharpe(E, w0) {
    var w = w0.slice();
    for (var k = 0; k < 90; k++) {
      var Sw = matvec(E.S, w), v = dot(w, Sw), sd = Math.sqrt(v), m = dot(w, E.mu);
      var g = E.mu.map(function (mm, i2) { return mm / sd - m * Sw[i2] / (v * sd); });
      var gn = Math.sqrt(dot(g, g)) || 1;
      w = project(w.map(function (x, i2) { return x + 0.03 * Math.pow(0.96, k) * g[i2] / gn; }));
    }
    return w;
  }
  var REB = [], WD = [], RS = [], REW = [], RBH = [];
  (function () {
    var w = [0.25, 0.25, 0.25, 0.25], bh = [0.25, 0.25, 0.25, 0.25];
    for (var t = WIN; t < DAYS; t++) {
      if ((t - WIN) % HOLD === 0) { w = maxSharpe(estimate(t), w); REB.push({ t: t, w: w.slice() }); }
      var simple = RET[t].map(function (r) { return Math.exp(r) - 1; });
      WD.push(w.slice());
      RS.push(dot(w, simple));
      REW.push(V.mean(simple));
      var tot = V.sum(bh);
      RBH.push(dot(bh.map(function (v) { return v / tot; }), simple));
      bh = bh.map(function (v, i2) { return v * (1 + simple[i2]); });
    }
  })();
  function wealth(rs) { var wv = [1]; rs.forEach(function (r) { wv.push(wv[wv.length - 1] * (1 + r)); }); return wv; }
  function drawdown(wv) { var pk = 0; return wv.map(function (v) { pk = Math.max(pk, v); return v / pk - 1; }); }
  function metrics(rs) {
    var T = rs.length, wv = wealth(rs), ann = Math.pow(wv[T], 252 / T) - 1;
    var m = V.mean(rs), sd = Math.sqrt(V.sum(rs.map(function (r) { return (r - m) * (r - m); })) / (T - 1));
    var down = rs.filter(function (r) { return r < 0; }), dsd = Math.sqrt(V.sum(down.map(function (r) { return r * r; })) / Math.max(1, down.length));
    var mdd = Math.min.apply(null, drawdown(wv));
    return { ann: ann, vol: sd * Math.sqrt(252), sharpe: m / sd * Math.sqrt(252), sortino: ann / (dsd * Math.sqrt(252)), mdd: mdd, calmar: ann / Math.abs(mdd) };
  }
  var WS = wealth(RS), WEW = wealth(REW), WBH = wealth(RBH);
  var DS = drawdown(WS), DEW = drawdown(WEW);
  var MS = metrics(RS), MEW = metrics(REW), MBH = metrics(RBH);

  /* ---------- Drawing ---------- */
  function layout(w, h) {
    var nw = w < 520;
    return { x: 34, w: w - 110, top: { y: 28, h: h * 0.42 }, bot: { y: h * 0.42 + (nw ? 76 : 64), h: h * 0.4 - (nw ? 12 : 0) } };
  }
  function X(Ly, d) { return Ly.x + d / (DAYS - 1) * Ly.w; }

  function priceLines(c, Ly, alpha) {
    var lo = Infinity, hi = -Infinity;
    PRICE.forEach(function (p) { p.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); }); });
    var Y = function (v) { return Ly.top.y + Ly.top.h - (v - lo) / (hi - lo) * Ly.top.h; };
    PRICE.forEach(function (p, i) {
      V.ga(c, alpha);
      c.strokeStyle = TONES[i];
      c.lineWidth = 1.1;
      c.beginPath();
      for (var t = 0; t < DAYS; t += 2) { if (t) c.lineTo(X(Ly, t), Y(p[t])); else c.moveTo(X(Ly, t), Y(p[t])); }
      c.stroke();
    });
    // end labels, nudged apart so they never sit on top of each other
    spread(PRICE.map(function (p, i) { return { y: Y(p[DAYS - 1]) + 4, i: i }; }), 12)
      .forEach(function (l) { V.text(c, NAMES[l.i], X(Ly, DAYS - 1) + 6, l.y, { size: 10, color: TONES[l.i], alpha: alpha }); });
  }
  // sort labels by height and push them apart to at least gap px
  function spread(labs, gap, maxY) {
    labs.sort(function (a, b) { return a.y - b.y; });
    for (var q = 1; q < labs.length; q++) if (labs[q].y - labs[q - 1].y < gap) labs[q].y = labs[q - 1].y + gap;
    if (maxY != null && labs.length && labs[labs.length - 1].y > maxY) {
      labs[labs.length - 1].y = maxY;
      for (q = labs.length - 2; q >= 0; q--) labs[q].y = Math.min(labs[q].y, labs[q + 1].y - gap);
    }
    return labs;
  }
  // the weights over time as a stacked band, up to a given day
  function weightBand(c, Ly, upto, alpha) {
    var B = Ly.bot;
    for (var a = n - 1; a >= 0; a--) {
      V.ga(c, alpha * (0.85 - a * 0.12));
      c.fillStyle = TONES[a];
      c.beginPath();
      for (var t = WIN; t <= upto; t++) {
        var w = WD[t - WIN], top = V.sum(w.slice(0, a + 1));
        var y = B.y + B.h - top * B.h;
        if (t === WIN) c.moveTo(X(Ly, t), y); else c.lineTo(X(Ly, t), y);
      }
      c.lineTo(X(Ly, upto), B.y + B.h);
      c.lineTo(X(Ly, WIN), B.y + B.h);
      c.closePath();
      c.fill();
    }
    if (B.h < 40) return;  // too thin for labels: just the band
    V.text(c, 'weights, stacked to 100%', Ly.x, B.y - 8, { size: 10, alpha: alpha });
    var w2 = WD[Math.min(TEST - 1, upto - WIN)], cum = 0, wl = [];
    for (a = 0; a < n; a++) {
      var mid = B.y + B.h - (cum + w2[a] / 2) * B.h;
      cum += w2[a];
      if (w2[a] > 0.06) wl.push({ y: mid + 4, a: a, w: w2[a] });
    }
    // a thin band only has room for its biggest weights
    var room = Math.max(1, Math.floor(B.h / 12) + 1);
    if (wl.length > room) wl = wl.sort(function (p, q) { return q.w - p.w; }).slice(0, room);
    spread(wl, 12, B.y + B.h + 2).forEach(function (l) { V.text(c, NAMES[l.a] + ' ' + Math.round(w2[l.a] * 100) + '%', X(Ly, upto) + 6, l.y, { size: 10, color: TONES[l.a], alpha: alpha }); });
  }
  function wealthLines(c, Ly, box, upto, alpha) {
    var all = WS.concat(WEW, WBH), lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    var Y = function (v) { return box.y + box.h - (v - lo) / (hi - lo) * box.h; };
    V.line(c, X(Ly, WIN), Y(1), X(Ly, DAYS - 1), Y(1), 'rgba(143,177,189,0.35)', { dash: [3, 4], alpha: alpha });
    var series = [[WBH, FOAM, [5, 4], 'B&H'], [WEW, MIST, [], 'EW'], [WS, ACC, [], 'max-SR']];
    series.forEach(function (s, idx) {
      V.ga(c, alpha);
      c.strokeStyle = s[1];
      c.lineWidth = idx === 2 ? 2.2 : 1.4;
      c.setLineDash(s[2]);
      c.beginPath();
      for (var k = 0; k <= upto - WIN; k++) { var x = X(Ly, WIN + k), y = Y(s[0][k]); if (k) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
      c.setLineDash([]);
    });
    // end labels, nudged apart so close finishes stay readable
    var labs = series.map(function (s) { var v = s[0][upto - WIN]; return { y: Y(v) + 4, v: v, s: s }; }).sort(function (a, b) { return a.y - b.y; });
    for (var q = 1; q < labs.length; q++) if (labs[q].y - labs[q - 1].y < 13) labs[q].y = labs[q - 1].y + 13;
    labs.forEach(function (l) { V.text(c, l.s[3] + ' ' + l.v.toFixed(2), X(Ly, upto) + 6, l.y, { size: 10, color: l.s[1], alpha: alpha }); });
    V.text(c, Ly.w > 420 ? 'wealth, starting at 1   (max-SR: the strategy; EW: equal-weight; B&H: buy-and-hold)' : 'wealth, starting at 1', Ly.x, box.y - 8, { size: 10, alpha: alpha });
  }

  var beats = [
    // 5.1 the window slides; every five days the weights are re-solved
    function (c, w, h, p) {
      var Ly = layout(w, h), cur = Math.round(WIN + V.ease(p) * (TEST - 1));
      priceLines(c, Ly, 0.75);
      V.ga(c, 0.1);
      c.fillStyle = FOAM;
      c.fillRect(X(Ly, cur - WIN), Ly.top.y - 6, X(Ly, cur) - X(Ly, cur - WIN), Ly.top.h + 12);
      V.text(c, '252-day estimation window', X(Ly, cur - WIN) + 4, Ly.top.y + 6, { size: 10, color: FOAM });
      V.line(c, X(Ly, cur), Ly.top.y - 6, X(Ly, cur), Ly.bot.y + Ly.bot.h, ACC, { width: 1.4 });
      REB.forEach(function (rb) {
        if (rb.t > cur) return;
        V.line(c, X(Ly, rb.t), Ly.top.y + Ly.top.h + 6, X(Ly, rb.t), Ly.top.y + Ly.top.h + 14, ACC, { alpha: 0.7 });
      });
      V.text(c, 'rebalance every 5 days', X(Ly, WIN), Ly.top.y + Ly.top.h + (w < 520 ? 26 : 28), { size: 10, color: ACC });
      weightBand(c, Ly, cur, 1);
    },
    // 5.2 hold each portfolio for five days and compound the results
    function (c, w, h, p) {
      var Ly = layout(w, h), cur = Math.round(WIN + V.ease(p) * (TEST - 1));
      var box = { y: Ly.top.y + 10, h: Ly.top.h + Ly.bot.h * 0.45 };
      wealthLines(c, Ly, box, cur, 1);
      var B = { y: box.y + box.h + 40 };
      V.faded(0.4, function () { weightBand(c, { x: Ly.x, w: Ly.w, bot: { y: B.y, h: h - B.y - 16 } }, cur, 1); });
      V.line(c, X(Ly, cur), box.y, X(Ly, cur), h - 16, ACC, { width: 1.2, alpha: 0.6 });
    },
    // 5.3 drawdowns and the metrics
    function (c, w, h, p) {
      var Ly = layout(w, h), narrow = w < 520;
      var box = { y: 34, h: h * (narrow ? 0.24 : 0.3) };
      wealthLines(c, Ly, box, DAYS - 1, 1);
      var dd = { y: box.y + box.h + (narrow ? 28 : 34), h: h * (narrow ? 0.12 : 0.16) }, lo = Math.min.apply(null, DS.concat(DEW));
      var Y = function (v) { return dd.y + v / lo * dd.h; };
      var g = V.ease(V.seg(p, 0, 0.4)), upto = Math.round(g * TEST);
      V.ga(c, 0.55);
      c.fillStyle = ACC;
      c.beginPath(); c.moveTo(X(Ly, WIN), dd.y);
      for (var k = 0; k <= upto; k++) c.lineTo(X(Ly, WIN + k), Y(DS[k]));
      c.lineTo(X(Ly, WIN + upto), dd.y); c.closePath(); c.fill();
      V.ga(c, 0.9);
      c.strokeStyle = MIST;
      c.lineWidth = 1.2;
      c.beginPath();
      for (k = 0; k <= upto; k++) { if (k) c.lineTo(X(Ly, WIN + k), Y(DEW[k])); else c.moveTo(X(Ly, WIN + k), Y(DEW[k])); }
      c.stroke();
      V.text(c, 'drawdown from the running peak', Ly.x, dd.y - 8, { size: 10 });
      V.text(c, (MS.mdd * 100).toFixed(1) + '% max', X(Ly, DAYS - 1) + 6, Y(MS.mdd), { size: 10, color: ACC, alpha: g });
      // the metrics, one row at a time
      var rows = [['Annual return', 'ann', true], ['Annual volatility', 'vol', true], ['Sharpe', 'sharpe'], ['Sortino', 'sortino'], ['Max drawdown', 'mdd', true], ['Calmar', 'calmar']];
      var ty = dd.y + dd.h + (narrow ? 24 : 30), rh = Math.min(22, (h - ty - 8) / 7), fs = Math.min(narrow ? 10 : 11, rh * 0.78);
      var cx = narrow ? [0, w * 0.42, w * 0.62, w * 0.82] : [Ly.x, Ly.x + Ly.w * 0.42, Ly.x + Ly.w * 0.62, Ly.x + Ly.w * 0.82];
      ['', 'max-Sharpe', 'equal-wt', 'buy-hold'].forEach(function (hd, j) { V.text(c, hd, cx[j], ty, { size: fs, color: j === 1 ? ACC : MIST, weight: 500 }); });
      rows.forEach(function (r, i2) {
        var a = V.ease(V.seg(p, 0.35 + i2 * 0.09, 0.45 + i2 * 0.09));
        if (!a) return;
        var yy = ty + (i2 + 1) * rh;
        V.text(c, r[0], cx[0], yy, { size: fs, alpha: a });
        [MS, MEW, MBH].forEach(function (m, j) {
          var v = m[r[1]];
          V.text(c, r[2] ? (v * 100).toFixed(1) + '%' : v.toFixed(2), cx[j + 1], yy, { size: fs, color: j === 0 ? FOAM : MIST, alpha: a, weight: j === 0 ? 500 : 400 });
        });
      });
    },
    // 5.4 the look-ahead trap, and the fix
    function (c, w, h, p) {
      var Ly = layout(w, h), a1 = V.ease(V.seg(p, 0, 0.45)), a2 = V.ease(V.seg(p, 0.5, 0.95));
      function track(y, label, col) {
        V.line(c, X(Ly, 0), y, X(Ly, DAYS - 1), y, 'rgba(143,177,189,0.5)', { width: 2 });
        V.text(c, label, Ly.x, col === RED ? Math.max(14, y - 88) : Math.max(infoY + 17, y - 40), { size: 11, color: col, weight: 500, fit: w - Ly.x - 4 });
      }
      // top: one forecast, made on the test period, reused at every rebalance
      var sh = h < 320, y1 = h * (sh ? 0.42 : 0.3), y2 = h * (sh ? 0.82 : 0.74), infoY = y1 + (sh ? 30 : 40);
      track(y1, w < 520 ? 'now: one test-period forecast, reused' : 'now: one forecast from the test period, reused everywhere', RED);
      var fx0 = X(Ly, DAYS - 120), fx1 = X(Ly, DAYS - 1);
      V.ga(c, 0.25);
      c.fillStyle = RED;
      c.fillRect(fx0, y1 - 12, fx1 - fx0, 24);
      V.text(c, 'forecast', (fx0 + fx1) / 2, y1 + 4, { size: 10, color: RED, align: 'center' });
      var shown = 0;
      for (var t = WIN; t < DAYS - 120; t += 25) {
        var fr = V.clamp(a1 * 14 - shown, 0, 1);
        shown++;
        if (!fr) continue;
        var tx = X(Ly, t);
        V.ga(c, 0.75 * fr);
        c.strokeStyle = RED;
        c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(fx0, y1 - 12); c.quadraticCurveTo((fx0 + tx) / 2, y1 - 12 - (fx0 - tx) * 0.22, tx, y1 - 4); c.stroke();
        V.dot(c, tx, y1, 3.2, RED, { alpha: fr });
      }
      V.text(c, 'information from the future reaches earlier dates', Ly.x, infoY, { size: 10, color: RED, alpha: a1 });
      // bottom: re-predict at each rebalance from the data to its left only
      track(y2, 'next: re-predict at every rebalance', ACC);
      shown = 0;
      for (t = WIN; t < DAYS; t += 25) {
        var fr2 = V.clamp(a2 * 18 - shown, 0, 1);
        shown++;
        if (!fr2) continue;
        var bx = X(Ly, t);
        V.ga(c, 0.18 * fr2);
        c.fillStyle = ACC;
        c.fillRect(X(Ly, t - 40), y2 - 9, bx - X(Ly, t - 40), 18);
        V.ga(c, 0.85 * fr2);
        c.strokeStyle = ACC;
        c.lineWidth = 1.3;
        c.beginPath(); c.moveTo(X(Ly, t - 20), y2 - 9); c.quadraticCurveTo(X(Ly, t - 10), y2 - 24, bx, y2 - 4); c.stroke();
        V.dot(c, bx, y2, 3.2, ACC, { alpha: fr2 });
      }
      V.text(c, 'every forecast uses only the days before it', Ly.x, y2 + 40, { size: 10, color: ACC, alpha: a2 });
    }
  ];

  var caps = [
    function (p) { var k = Math.min(REB.length, Math.floor(V.ease(p) * (TEST - 1) / HOLD) + 1); return 'Rebalance <b>' + k + ' of ' + REB.length + '</b>. Simulated assets; a trailing mean stands in for the TFT forecast.'; },
    function () { return 'max-SR is the strategy, EW equal-weight, B&amp;H buy-and-hold. Final wealth: max-Sharpe <b>' + WS[TEST].toFixed(2) + '</b>, equal-weight <b>' + WEW[TEST].toFixed(2) + '</b>, buy-and-hold <b>' + WBH[TEST].toFixed(2) + '</b>. Illustrative, not the project’s results.'; },
    function () { return 'Sharpe <b>' + MS.sharpe.toFixed(2) + '</b> against <b>' + MEW.sharpe.toFixed(2) + '</b> equal-weight, on simulated data. Computed with the formulas from the code.'; },
    function () { return 'The fix the README lists as the next extension: re-predict at each walk-forward step.'; }
  ];

  Story.scene('backtest-wf', {
    draw: function (c, s) {
      var b = Math.min(beats.length - 1, s.step), inA = b > 0 ? V.ease(V.seg(s.p, 0, 0.1)) : 1;
      if (inA < 1) V.faded(1 - inA, function () { beats[b - 1](c, s.w, s.h, 1); });
      V.faded(inA, function () { beats[b](c, s.w, s.h, V.seg(s.p, 0.06, 0.94)); });
      c.globalAlpha = 1;
    },
    caption: function (s) { return caps[Math.min(caps.length - 1, s.step)](V.seg(s.p, 0.06, 0.94)); }
  });
})();
