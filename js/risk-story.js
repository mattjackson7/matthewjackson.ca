/* Risk page scroll stories. Every scene draws from one small model: four
   illustrative assets with their volatilities and correlations, so the
   covariance matrix built in section 1 is the same one factored, stressed,
   and simulated later. All numbers are computed here, in the browser. */
(function () {
  if (!window.Story) return;

  var AMBER = '255,177,78', BLUE = '124,196,255';
  var FOAM = '#eaf6f8', MIST = '#8fb1bd', ACC = '#ffb14e';
  var MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

  /* ---------- The model ---------- */
  var NAMES = ['EQ', 'CR', 'CM', 'RE']; // equities, credit, commodities, real estate
  var VOLS = [0.18, 0.09, 0.22, 0.20];  // annual volatilities
  var RHO = [
    [1.00, 0.45, 0.25, 0.55],
    [0.45, 1.00, 0.15, 0.40],
    [0.25, 0.15, 1.00, 0.20],
    [0.55, 0.40, 0.20, 1.00]
  ];
  var RHO_X = RHO.map(function (r, i) { return r.map(function (v, j) { return i === j ? 1 : 0.8; }); });
  var WT = [0.40, 0.30, 0.15, 0.15];   // portfolio weights
  var HZ = 10 / 252;                   // a 10-day horizon
  var Z99 = 2.3263;

  /* ---------- Small helpers ---------- */
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function rng(seed) {
    return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  }
  function gauss(r) {
    var u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function Phi(x) { // standard normal CDF (Abramowitz and Stegun 7.1.26)
    var t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
    return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
  }
  function sigmaOf(rho) { return rho.map(function (r, i) { return r.map(function (v, j) { return v * VOLS[i] * VOLS[j]; }); }); }
  function cholesky(S) {
    var n = S.length, L = S.map(function () { return S.map(function () { return 0; }); });
    for (var j = 0; j < n; j++) {
      var s = 0;
      for (var k = 0; k < j; k++) s += L[j][k] * L[j][k];
      L[j][j] = Math.sqrt(S[j][j] - s);
      for (var i = j + 1; i < n; i++) {
        s = 0;
        for (k = 0; k < j; k++) s += L[i][k] * L[j][k];
        L[i][j] = (S[i][j] - s) / L[j][j];
      }
    }
    return L;
  }
  function transpose(A) { return A[0].map(function (_, j) { return A.map(function (r) { return r[j]; }); }); }
  function matmul(A, B) {
    return A.map(function (r) { return B[0].map(function (_, j) { return r.reduce(function (s, v, k) { return s + v * B[k][j]; }, 0); }); });
  }
  function matvec(A, x) { return A.map(function (r) { return r.reduce(function (s, v, j) { return s + v * x[j]; }, 0); }); }
  function dot(a, b) { return a.reduce(function (s, v, i) { return s + v * b[i]; }, 0); }
  function scale(A, k) { return A.map(function (r) { return r.map(function (v) { return v * k; }); }); }
  function lerpM(A, B, t) { return A.map(function (r, i) { return r.map(function (v, j) { return lerp(v, B[i][j], t); }); }); }
  function diag(v) { return v.map(function (x, i) { return v.map(function (_, j) { return i === j ? x : 0; }); }); }
  function pct(x, d) { return (x * 100).toFixed(d == null ? 2 : d) + '%'; }
  var SUBS = '₀₁₂₃₄₅₆₇₈₉';
  var SUPS = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function sub(n) { return String(n).split('').map(function (d) { return SUBS[+d]; }).join(''); }
  function sci(x) {
    if (x === 0) return '0 (exact in floating point)';
    var parts = x.toExponential(1).split('e');
    return parts[0] + ' × 10' + String(+parts[1]).split('').map(function (ch) { return SUPS[ch]; }).join('');
  }

  /* ---------- Derived numbers ---------- */
  var SIG = sigmaOf(RHO), L = cholesky(SIG), LT = transpose(L), REC = matmul(L, LT);
  var RESID = 0;
  SIG.forEach(function (r, i) { r.forEach(function (v, j) { RESID = Math.max(RESID, Math.abs(REC[i][j] - v)); }); });
  var SIG100 = scale(SIG, 100), REC100 = scale(REC, 100);
  var ORDER = [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1], [2, 1], [3, 1], [2, 2], [3, 2], [3, 3]];
  var IDX = [[0, -1, -1, -1], [1, 4, -1, -1], [2, 5, 7, -1], [3, 6, 8, 9]];

  var R = rng(42);
  var SPARK = [];
  for (var d = 0; d < 64; d++) SPARK.push(matvec(L, [gauss(R), gauss(R), gauss(R), gauss(R)]).map(function (v) { return v / Math.sqrt(252); }));
  var LX = cholesky(sigmaOf(RHO_X));
  var CLOUD = [];
  for (var k = 0; k < 700; k++) {
    var z = [gauss(R), gauss(R), gauss(R), gauss(R)];
    CLOUD.push({ z: z, x: matvec(L, z), xs: matvec(LX, z) });
  }
  var NPORT = 6000, PORT = new Float64Array(NPORT);
  for (k = 0; k < NPORT; k++) PORT[k] = dot(WT, matvec(L, [gauss(R), gauss(R), gauss(R), gauss(R)])) * Math.sqrt(HZ);
  var SORTED = Array.prototype.slice.call(PORT).sort(function (a, b) { return a - b; });
  var I99 = Math.floor(0.01 * NPORT);
  var VAR99 = -SORTED[I99];
  var CVAR99 = -SORTED.slice(0, I99).reduce(function (a, b) { return a + b; }, 0) / I99;

  // parametric (normal) component VaR, which splits exactly by Euler's theorem
  function portVar(S) { var Sh = scale(S, HZ); return Z99 * Math.sqrt(dot(WT, matvec(Sh, WT))); }
  var SH = scale(SIG, HZ), SW = matvec(SH, WT), SP = Math.sqrt(dot(WT, SW));
  var VARP = Z99 * SP;
  var STAND = WT.map(function (w, i) { return Z99 * w * Math.sqrt(SH[i][i]); });
  var COMP = WT.map(function (w, i) { return Z99 * w * SW[i] / SP; });
  var STANDSUM = STAND.reduce(function (a, b) { return a + b; }, 0);
  var VARX = portVar(sigmaOf(RHO_X));

  // a daily return series whose volatility jumps partway through
  var RB = rng(9), DAYS = 1000, WIN = 252, RET = [], VLINE = [], VIOL = [];
  var JUMP = 560;
  for (d = 0; d < DAYS; d++) RET.push(gauss(RB) * (d < JUMP ? 0.010 : d < 780 ? 0.024 : 0.012));
  for (d = WIN; d < DAYS; d++) {
    var ss = 0;
    for (var q = d - WIN; q < d; q++) ss += RET[q] * RET[q];
    VLINE[d] = Z99 * Math.sqrt(ss / (WIN - 1));
    if (RET[d] < -VLINE[d]) VIOL.push(d);
  }
  var TT = DAYS - WIN, VV = VIOL.length, P0 = 0.01, PH = VV / TT;
  var LR = -2 * ((VV * Math.log(P0) + (TT - VV) * Math.log(1 - P0)) -
    ((VV ? VV * Math.log(PH) : 0) + (TT - VV) * Math.log(1 - PH)));
  var PVAL = 2 * (1 - Phi(Math.sqrt(LR)));

  /* ---------- More derived numbers for the morphs ---------- */
  // a long run of daily returns, so the running average of outer products converges
  var OPN = 2520, OPR = [];
  (function () {
    var r2 = rng(314);
    for (var t = 0; t < OPN; t++) OPR.push(matvec(L, [gauss(r2), gauss(r2), gauss(r2), gauss(r2)]).map(function (v) { return v / Math.sqrt(252); }));
  })();
  var OPMEAN = [0, 1, 2, 3].map(function (i) { return OPR.reduce(function (s, r) { return s + r[i]; }, 0) / OPN; });
  function runningCov(n) { // the average of the first n outer products, annualized, x100
    var C = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    for (var t = 0; t < n; t++) {
      var d = OPR[t].map(function (v, i) { return v - OPMEAN[i]; });
      for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) C[i][j] += d[i] * d[j];
    }
    return C.map(function (r) { return r.map(function (v) { return v / Math.max(1, n - 1) * 252 * 100; }); });
  }
  var OPCOV = []; // checkpoints along a log scale, for scrubbing
  var OPN_STEPS = [1, 2, 3, 5, 8, 13, 20, 32, 50, 80, 126, 200, 320, 500, 800, 1260, 2000, 2520];
  OPN_STEPS.forEach(function (n) { OPCOV.push(runningCov(n)); });
  var DAY0 = OPR[0].map(function (v, i) { return (v - OPMEAN[i]) * Math.sqrt(252) * 10; }); // one day's deviation, scaled for display
  var OPMAXERR = 0;
  OPCOV[OPCOV.length - 1].forEach(function (r, i) { r.forEach(function (v, j) { OPMAXERR = Math.max(OPMAXERR, Math.abs(v - SIG100[i][j])); }); });

  // a few scenario vectors for the dot-product beat
  var XS = (function () {
    var r3 = rng(77), out = [];
    for (var k = 0; k < 3; k++) out.push(matvec(L, [gauss(r3), gauss(r3), gauss(r3), gauss(r3)]).map(function (v) { return v * Math.sqrt(HZ) * 100; }));
    return out;
  })();
  // the 2x2 Cholesky factor for an ellipse of a pair of assets
  function ellipseL(S, a, b) {
    var l11 = Math.sqrt(S[a][a]), l21 = S[b][a] / l11, l22 = Math.sqrt(S[b][b] - l21 * l21);
    return [[l11, 0], [l21, l22]];
  }
  var SIGX = sigmaOf(RHO_X), SIGX100 = scale(SIGX, 100);
  var SH4 = scale(SH, 1e4), SW4 = matvec(SH4, WT);  // 10-day covariance, x10^4
  var WSW4 = WT.map(function (w, i) { return w * SW4[i]; });

  /* ---------- Drawing helpers (alpha runs through Viz, so beats can fade) ---------- */
  var V = window.Viz;
  function text(c, s, x, y, o) { V.text(c, s, x, y, o); }
  function fmtNum(v, dgt, cs) {
    var s = v.toFixed(dgt);
    return cs < 38 ? s.replace(/^(-?)0\./, '$1.') : s;
  }
  function cellAt(c, x, y, wd, ht, v, o) {
    o = o || {};
    var a = o.alpha == null ? 1 : o.alpha;
    if (a <= 0.005) return;
    var g = Math.max(1, Math.min(wd, ht) * 0.07), inten = Math.min(1, Math.abs(v) / (o.scale || 1));
    V.ga(c, a);
    c.fillStyle = 'rgba(' + (v >= 0 ? AMBER : BLUE) + ',' + (0.07 + 0.5 * inten) + ')';
    c.fillRect(x + g / 2, y + g / 2, wd - g, ht - g);
    if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = o.lw || 1.8; c.strokeRect(x + g / 2 + 0.5, y + g / 2 + 0.5, wd - g - 1, ht - g - 1); }
    if (o.label !== false && Math.min(wd, ht) > 14) {
      var fs = Math.max(8, Math.min(14, Math.min(wd * 0.27, ht * 0.4)));
      text(c, o.fmt ? o.fmt(v) : fmtNum(v, 2, wd), x + wd / 2, y + ht / 2 + 0.5, { size: fs, color: FOAM, align: 'center', base: 'middle', weight: 500, fit: wd - 4, alpha: a * (o.textAlpha == null ? 1 : o.textAlpha) });
    }
  }
  function brackets(c, x, y, wd, ht, a) {
    var tk = Math.min(6, wd * 0.16);
    V.ga(c, a == null ? 1 : a);
    c.strokeStyle = MIST;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x - 3 + tk, y); c.lineTo(x - 3, y); c.lineTo(x - 3, y + ht); c.lineTo(x - 3 + tk, y + ht);
    c.moveTo(x + wd + 3 - tk, y); c.lineTo(x + wd + 3, y); c.lineTo(x + wd + 3, y + ht); c.lineTo(x + wd + 3 - tk, y + ht);
    c.stroke();
  }
  function matrix(c, x, y, cs, M, o) {
    o = o || {};
    var rows = M.length, cols = M[0].length, al = o.alpha == null ? 1 : o.alpha;
    if (al <= 0.01) return;
    for (var i = 0; i < rows; i++) {
      for (var j = 0; j < cols; j++) {
        var cx = x + j * cs, cy = y + i * cs;
        V.ga(c, al);
        c.strokeStyle = 'rgba(143,177,189,0.16)';
        c.lineWidth = 1;
        c.strokeRect(cx + 1.5, cy + 1.5, cs - 3, cs - 3);
        if (o.blank && o.blank(i, j)) { text(c, '0', cx + cs / 2, cy + cs / 2 + 0.5, { size: Math.max(8, cs * 0.25), color: 'rgba(143,177,189,0.45)', align: 'center', base: 'middle', alpha: al, fit: cs - 4 }); continue; }
        var show = o.show ? o.show(i, j) : 1;
        if (show > 0) cellAt(c, cx, cy, cs, cs, M[i][j], { scale: o.scale, alpha: al * show, fmt: o.fmt ? function (v) { return o.fmt(v, i, j); } : function (v) { return fmtNum(v, 2, cs); }, textAlpha: o.textAlpha ? o.textAlpha(i, j) : 1 });
        var hl = o.hi && o.hi(i, j);
        if (hl) { V.ga(c, al); c.strokeStyle = hl; c.lineWidth = 2; c.strokeRect(cx + 2, cy + 2, cs - 4, cs - 4); }
      }
    }
    brackets(c, x, y, cols * cs, rows * cs, al);
    var fs = Math.max(8, Math.min(14, cs * 0.27));
    if (o.heads) {
      for (j = 0; j < cols; j++) text(c, NAMES[j], x + j * cs + cs / 2, y - 4, { size: Math.max(8, fs * 0.85), align: 'center', base: 'bottom', alpha: al, fit: cs - 3 });
      if (cs >= 10) for (i = 0; i < rows; i++) text(c, NAMES[i], x - 8, y + i * cs + cs / 2, { size: Math.min(Math.max(8, fs * 0.85), cs * 0.8), align: 'right', base: 'middle', alpha: al });
    }
    if (o.label) text(c, o.label, x + cols * cs / 2, y - (o.heads ? fs + 10 : 7), { size: Math.max(10, fs), color: o.labelColor || FOAM, align: 'center', base: 'bottom', weight: 500, alpha: al });
  }
  function symbol(c, s, x, y, size, alpha) { text(c, s, x, y, { size: size, color: FOAM, align: 'center', base: 'middle', alpha: alpha }); }
  function scatter(c, ox, oy, sz, pts, o) {
    o = o || {};
    var half = sz / 2, cx = ox + half, cy = oy + half, k = half / (o.range || 3.3);
    V.ga(c, 1);
    c.strokeStyle = 'rgba(143,177,189,0.18)';
    c.lineWidth = 1;
    c.strokeRect(ox + 0.5, oy + 0.5, sz - 1, sz - 1);
    c.beginPath(); c.moveTo(ox, cy); c.lineTo(ox + sz, cy); c.moveTo(cx, oy); c.lineTo(cx, oy + sz); c.stroke();
    V.ga(c, o.alpha || 0.55);
    c.fillStyle = o.color || MIST;
    var r = sz < 220 ? 1.5 : 2;
    for (var i = 0; i < pts.length; i++) {
      var px = cx + pts[i][0] * k, py = cy - pts[i][1] * k;
      if (px < ox || px > ox + sz || py < oy || py > oy + sz) continue;
      c.fillRect(px - r / 2, py - r / 2, r, r);
    }
    if (o.xl) text(c, o.xl, ox + sz - 4, cy - 6, { size: 10, align: 'right' });
    if (o.yl) text(c, o.yl, cx + 6, oy + 12, { size: 10 });
    return { cx: cx, cy: cy, k: k };
  }
  // an ellipse: the image of the circle of radius rad under a 2x2 map, drawn in scatter coordinates
  function ellipse(c, ax, M2, rad, color, al, dash) {
    V.ga(c, al);
    c.strokeStyle = color;
    c.lineWidth = 1.6;
    c.setLineDash(dash || []);
    c.beginPath();
    for (var k = 0; k <= 72; k++) {
      var th = k / 72 * Math.PI * 2, u = Math.cos(th) * rad, v = Math.sin(th) * rad;
      var x = M2[0][0] * u + M2[0][1] * v, y = M2[1][0] * u + M2[1][1] * v;
      if (k) c.lineTo(ax.cx + x * ax.k, ax.cy - y * ax.k); else c.moveTo(ax.cx + x * ax.k, ax.cy - y * ax.k);
    }
    c.stroke();
    c.setLineDash([]);
  }
  function corr(pts) {
    var n = pts.length, mx = 0, my = 0, sxx = 0, syy = 0, sxy = 0;
    pts.forEach(function (p) { mx += p[0]; my += p[1]; });
    mx /= n; my /= n;
    pts.forEach(function (p) { var a = p[0] - mx, b = p[1] - my; sxx += a * a; syy += b * b; sxy += a * b; });
    return sxy / Math.sqrt(sxx * syy);
  }
  // M times v, one row at a time: v turns to lie along the row, the pairs
  // multiply, and the products slide into that row's entry of the result
  function matvecAnim(c, o) {
    var M = o.M, v = o.v, r = M.length, n = v.length, cs = o.cs, al = o.alpha == null ? 1 : o.alpha;
    var out = matvec(M, v), slot = 1 / r;
    var row = o.q >= 1 ? r : Math.min(r - 1, Math.floor(o.q * r)), q = row < r ? clamp((o.q - row * slot) / slot, 0, 1) : 1;
    var rot = ease(seg(q, 0, 0.35)), mul = ease(seg(q, 0.35, 0.55)), mrg = ease(seg(q, 0.6, 0.9));
    matrix(c, o.mx, o.my, cs, M, { scale: o.mScale || 1, alpha: al, label: o.mLabel, fmt: o.mFmt,
      textAlpha: function (i) { return i === row ? 1 - mul : 1; }, hi: function (i) { return i === row ? 'rgba(' + AMBER + ',0.75)' : null; } });
    if (row < r) for (var j = 0; j < n; j++) {
      cellAt(c, lerp(o.mx + j * cs, o.rx, mrg), lerp(o.my + row * cs, o.ry + row * cs, mrg), cs, cs, M[row][j] * v[j],
        { scale: o.pScale || 1, alpha: al * mul * (1 - mrg), stroke: ACC, lw: 1.2, fmt: o.pFmt });
    }
    for (j = 0; j < n; j++) cellAt(c, o.vx, o.vy + j * cs, cs, cs, v[j], { scale: o.vScale || 1.5, alpha: al, fmt: o.vFmt });
    brackets(c, o.vx, o.vy, cs, n * cs, al);
    if (o.vLabel) text(c, o.vLabel, o.vx + cs / 2, o.vy - 8, { size: 12, color: FOAM, align: 'center', weight: 500, alpha: al });
    if (row < r && rot > 0 && mul < 1) {
      var phi = rot * Math.PI / 2, dx = Math.sin(phi), dy = Math.cos(phi);
      var ax = lerp(o.vx, o.mx, rot), ay = lerp(o.vy, o.my + row * cs, rot);
      V.ga(c, al * (1 - mul));
      c.strokeStyle = ACC; c.lineWidth = 1.5;
      for (var k = 0; k < n; k++) c.strokeRect(ax + k * cs * dx + 3, ay + k * cs * dy + 3, cs - 6, cs - 6);
    }
    for (var i = 0; i < r; i++) {
      var done = i < row ? 1 : i === row ? ease(seg(q, 0.82, 1)) : 0;
      if (done) cellAt(c, o.rx, o.ry + i * cs, cs, cs, out[i], { scale: o.rScale || 1.5, alpha: al * done, fmt: o.rFmt });
    }
    brackets(c, o.rx, o.ry, cs, r * cs, al);
    if (o.rLabel) text(c, o.rLabel, o.rx + cs / 2, o.ry - 8, { size: 12, color: FOAM, align: 'center', weight: 500, alpha: al });
    return { out: out, row: row };
  }
  // a short crossfade from the previous beat's final frame
  function scene(beats, caps) {
    return {
      draw: function (c, s) {
        var b = Math.min(beats.length - 1, s.step), inA = b > 0 ? ease(seg(s.p, 0, 0.1)) : 1;
        if (inA < 1) V.faded(1 - inA, function () { beats[b - 1](c, s.w, s.h, 1); });
        V.faded(inA, function () { beats[b](c, s.w, s.h, seg(s.p, 0.06, 0.94)); });
        c.globalAlpha = 1;
      },
      caption: function (s) { return caps[Math.min(caps.length - 1, s.step)](seg(s.p, 0.06, 0.94)); }
    };
  }
  function f100(v) { return v.toFixed(2); }

  /* ---------- 1. Simulation ---------- */
  function cholFormula(cur) {
    var i = cur[0], j = cur[1], terms = [], nums = [];
    var name = 'L' + sub(i + 1) + sub(j + 1);
    for (var kk = 0; kk < j; kk++) {
      if (i === j) { terms.push('L' + sub(j + 1) + sub(kk + 1) + '²'); nums.push((L[j][kk] * L[j][kk]).toFixed(4)); }
      else { terms.push('L' + sub(i + 1) + sub(kk + 1) + 'L' + sub(j + 1) + sub(kk + 1)); nums.push((L[i][kk] * L[j][kk]).toFixed(4)); }
    }
    var s = 'Σ' + sub(i + 1) + sub(j + 1), sv = SIG[i][j].toFixed(4);
    var minus = function (arr) { return arr.length ? ' − ' + arr.join(' − ') : ''; };
    if (i === j) return [name + ' = √(' + s + minus(terms) + ')', '= √(' + sv + minus(nums) + ') = ' + L[i][j].toFixed(4)];
    var dj = 'L' + sub(j + 1) + sub(j + 1);
    return [name + ' = (' + s + minus(terms) + ') / ' + dj, '= (' + sv + minus(nums) + ') / ' + L[j][j].toFixed(4) + ' = ' + L[i][j].toFixed(4)];
  }

  var cholBeats = [
    // 1.1 covariance as an average of outer products
    function (c, w, h, p) {
      var cs = Math.min(46, w / 12.5, (h - 120) / 7.5);
      var vx = 26, gy = 54 + 1.6 * cs, gx = vx + 1.7 * cs, ax = w - 4 * cs - 10, ay = gy;
      var rot = ease(seg(p, 0, 0.18)), fill = seg(p, 0.18, 0.4), pour = ease(seg(p, 0.42, 0.55)), acc = seg(p, 0.55, 0.97);
      var ON = DAY0.map(function (a) { return DAY0.map(function (b) { return a * b; }); });
      // the day's deviation vector, and its transpose turning into a row above the grid
      var vecA = 1 - 0.8 * ease(seg(acc, 0, 0.2));
      for (var i = 0; i < 4; i++) cellAt(c, vx, gy + i * cs, cs, cs, DAY0[i], { scale: 2.5, alpha: vecA, fmt: function (v) { return fmtNum(v, 2, cs); } });
      brackets(c, vx, gy, cs, 4 * cs, vecA);
      text(c, 'r̃ₜ', vx + cs / 2, gy - 8, { size: 12, color: FOAM, align: 'center', weight: 500 });
      var phi = rot * Math.PI / 2;
      for (i = 0; i < 4; i++) {
        var px = lerp(vx, gx, rot) + i * cs * Math.sin(phi), py = lerp(gy, gy - 1.25 * cs, rot) + i * cs * Math.cos(phi);
        cellAt(c, px, py, cs, cs, DAY0[i], { scale: 2.5, alpha: vecA, stroke: ACC, lw: 1.2, fmt: function (v) { return fmtNum(v, 2, cs); } });
      }
      if (rot > 0.9) text(c, 'r̃ₜᵀ', gx + 2 * cs, gy - 1.25 * cs - 8, { size: 12, color: ACC, align: 'center', weight: 500 });
      // the outer product: a rank-one 4 x 4, filling cell by cell, then pouring into the running average
      for (i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
        var show = ease(seg(fill, (i * 4 + j) / 16, (i * 4 + j + 1.5) / 16));
        if (!show) continue;
        var x = lerp(gx + j * cs, ax + j * cs, pour), y = lerp(gy + i * cs, ay + i * cs, pour);
        cellAt(c, x, y, cs, cs, ON[i][j], { scale: 4, alpha: show * (1 - 0.9 * ease(seg(acc, 0, 0.15))), fmt: function (v) { return fmtNum(v, 1, cs); } });
      }
      if (fill > 0 && pour < 1) { brackets(c, gx, gy, 4 * cs, 4 * cs, 1 - pour); text(c, 'r̃ₜ r̃ₜᵀ', gx + 2 * cs, gy + 4 * cs + 18, { size: 11, color: ACC, align: 'center', alpha: 1 - pour }); }
      // the accumulator: as days add up, the average converges on Sigma
      if (acc > 0) {
        var f = ease(acc) * (OPN_STEPS.length - 1), k = Math.min(OPN_STEPS.length - 2, Math.floor(f)), fr = f - k;
        var M = lerpM(OPCOV[k], OPCOV[k + 1], fr), n = Math.round(lerp(OPN_STEPS[k], OPN_STEPS[k + 1], fr));
        matrix(c, ax, ay, cs, M, { scale: 4.84, heads: true, label: 'Σ̂ × 100' });
        text(c, 'average of ' + n.toLocaleString() + ' days', ax + 2 * cs, ay + 4 * cs + 20, { size: 11, color: ACC, align: 'center', weight: 500 });
      } else {
        brackets(c, ax, ay, 4 * cs, 4 * cs, 0.5);
        text(c, 'Σ̂ × 100', ax + 2 * cs, ay - 22, { size: 12, color: FOAM, align: 'center', weight: 500, alpha: 0.6 });
      }
    },
    // 1.2 Sigma splits into D rho D
    function (c, w, h, p) {
      var cs = Math.min((w - 10) / 14.8, (h - 100) / 8.6, 52);
      var sym = 1.4 * cs, x0 = (w - 12 * cs - 2 * sym) / 2 + 4;
      var rowY = h - 4 * cs - 12, rhoX = x0 + 4 * cs + sym, dRx = rhoX + 4 * cs + sym;
      var topX = (w - 4 * cs) / 2, topY = 30 + Math.max(10, cs * 0.3);
      var e = ease(seg(p, 0.08, 0.75)), dA = ease(seg(p, 0.3, 0.8));
      matrix(c, topX, topY, cs, SIG100, { scale: 4.84, alpha: 1 - 0.65 * e, heads: true, label: 'Σ × 100' });
      var offd = function (i, j) { return i !== j; };
      matrix(c, x0, rowY, cs, diag(VOLS), { scale: 0.22, blank: offd, alpha: dA, label: 'D' });
      matrix(c, dRx, rowY, cs, diag(VOLS), { scale: 0.22, blank: offd, alpha: dA, label: 'D' });
      symbol(c, '·', x0 + 4 * cs + sym / 2, rowY + 2 * cs, 22, dA);
      symbol(c, '·', rhoX + 4 * cs + sym / 2, rowY + 2 * cs, 22, dA);
      symbol(c, '=', w / 2, (topY + 4 * cs + rowY) / 2 - 4, 22, dA);
      matrix(c, lerp(topX, rhoX, e), lerp(topY, rowY, e), cs, lerpM(SIG100, RHO, e), { scale: lerp(4.84, 1, e), label: e > 0.6 ? 'ρ' : '' });
    },
    // 1.3 Cholesky, each entry worked through
    function (c, w, h, p) {
      var cs = Math.min((w - 70) / 8, (h - 260) / 4.4, 50);
      var gapM = Math.max(cs, 34), x0 = (w - 8 * cs - gapM) / 2 + 12, y0 = 44, Lx = x0 + 4 * cs + gapM;
      var kf = p * 10.4, kk = Math.min(10, Math.floor(kf)), q = Math.min(1, kf - kk);
      var cur = kk < 10 ? ORDER[kk] : null;
      var isCur = function (i, j) { return cur && cur[0] === i && cur[1] === j; };
      var landed = ease(seg(q, 0.88, 1));
      matrix(c, x0, y0, cs, SIG100, { scale: 4.84, heads: true, label: 'Σ × 100', hi: function (i, j) { return isCur(i, j) ? ACC : null; }, fmt: function (v) { return v.toFixed(cs < 40 ? 1 : 2); } });
      matrix(c, Lx, y0, cs, L, {
        scale: 0.22, heads: true, label: 'L', fmt: function (v) { return fmtNum(v, cs < 40 ? 2 : 3, cs); },
        blank: function (i, j) { return j > i; },
        show: function (i, j) { var n = IDX[i][j]; return n < kk ? 1 : n === kk ? landed : 0; },
        hi: function (i, j) { return isCur(i, j) ? ACC : null; }
      });
      // the workspace: one equation line, Sigma_ij - (sum of products) = remainder, then / L_jj or sqrt
      var cw = clamp((w - 24) / 8.3, 40, 72), ch = clamp(cw * 0.5, 24, 34), wy = y0 + 4 * cs + 40 + ch * 1.8;
      var wx = Math.max(8, (w - 8.3 * cw) / 2), slot = function (k) { return wx + k * 1.55 * cw; };
      var fmt4 = function (v) { return v.toFixed(4); };
      if (cur) {
        var i = cur[0], j = cur[1], diagE = i === j;
        var fsig = ease(seg(q, 0, 0.16)), slide = ease(seg(q, 0.18, 0.36)), mult = ease(seg(q, 0.38, 0.5)), coll = ease(seg(q, 0.52, 0.62));
        var rem = ease(seg(q, 0.64, 0.72)), opE = ease(seg(q, 0.74, 0.84)), fly = ease(seg(q, 0.86, 1));
        var s0 = 0, k;
        for (k = 0; k < j; k++) s0 += L[i][k] * L[j][k];
        // Sigma_ij flies down into the first slot
        cellAt(c, lerp(x0 + j * cs, slot(0), fsig), lerp(y0 + i * cs, wy, fsig), lerp(cs, cw, fsig), lerp(cs, ch, fsig), SIG[i][j],
          { scale: 0.05, stroke: ACC, lw: 1.3, fmt: fmt4, alpha: 1 - 0.0 * fly });
        text(c, 'Σ' + sub(i + 1) + sub(j + 1), slot(0) + cw / 2, wy + ch + 14, { size: 10, align: 'center', alpha: fsig });
        // the partial rows of L slide down above the line, multiply pairwise, and collapse into the sum
        if (j > 0) {
          var py = wy - ch * 1.7, pw = Math.min(cw * 0.9, (1.55 * cw * 2 - 8) / Math.max(1, j));
          for (k = 0; k < j; k++) {
            var tx = slot(1) + cw / 2 - (j * pw) / 2 + k * pw;
            var axp = lerp(Lx + k * cs, tx, slide), ayp = lerp(y0 + i * cs, py - ch * 0.55, slide);
            var bxp = lerp(Lx + k * cs, tx, slide), byp = lerp(y0 + j * cs, py + ch * 0.55, slide);
            byp = lerp(byp, ayp, mult);
            var vv = lerp(L[i][k], L[i][k] * L[j][k], mult);
            var fx = lerp(lerp(axp, tx, mult), slot(1), coll), fy = lerp(ayp, wy, coll);
            if (slide > 0 && coll < 1) {
              if (mult < 1) cellAt(c, bxp, byp, slide < 1 ? cs : pw, slide < 1 ? cs : ch, L[j][k], { scale: 0.22, alpha: (1 - mult), fmt: function (u) { return u.toFixed(3); } });
              cellAt(c, fx, fy, slide < 1 ? cs : pw, slide < 1 ? cs : ch, vv, { scale: mult > 0.5 ? 0.02 : 0.22, alpha: 1 - coll, stroke: mult > 0.5 ? ACC : null, lw: 1.1, fmt: function (u) { return u.toFixed(mult > 0.5 ? 4 : 3); } });
            }
          }
          if (slide > 0.9 && mult < 0.5) text(c, 'L' + sub(i + 1) + 'ₖ × L' + sub(j + 1) + 'ₖ', slot(1) + cw / 2, py - ch * 1.25, { size: 10, color: ACC, align: 'center', alpha: 1 - 2 * mult });
          if (coll > 0) {
            symbol(c, '−', slot(1) - 0.27 * cw, wy + ch / 2, 18, coll);
            cellAt(c, slot(1), wy, cw, ch, s0, { scale: 0.02, stroke: ACC, lw: 1.3, fmt: fmt4, alpha: coll });
            text(c, 'Σₖ L' + sub(i + 1) + 'ₖL' + sub(j + 1) + 'ₖ', slot(1) + cw / 2, wy + ch + 14, { size: 10, align: 'center', alpha: coll });
          }
        }
        // the remainder, then divide by L_jj (or take the root), then into L
        var rs = j > 0 ? 2 : 1;
        if (rem > 0) {
          symbol(c, '=', slot(rs) - 0.27 * cw, wy + ch / 2, 18, rem);
          cellAt(c, slot(rs), wy, cw, ch, SIG[i][j] - s0, { scale: 0.05, fmt: fmt4, alpha: rem });
        }
        if (opE > 0) {
          text(c, diagE ? '√' : '÷ ' + L[j][j].toFixed(4), slot(rs + 1) + cw / 2, wy + ch / 2 + 1, { size: 12, color: ACC, align: 'center', base: 'middle', weight: 500, alpha: opE });
          var dx = slot(rs + 2) - 0.12 * cw;
          symbol(c, '=', slot(rs + 2) - 0.27 * cw, wy + ch / 2, 18, opE);
          cellAt(c, lerp(dx + 0.12 * cw, Lx + j * cs, fly), lerp(wy, y0 + i * cs, fly), lerp(cw, cs, fly), lerp(ch, cs, fly), L[i][j],
            { scale: 0.22, stroke: ACC, lw: 1.6, fmt: fmt4, alpha: opE * (1 - landed) });
          text(c, 'L' + sub(i + 1) + sub(j + 1), dx + 0.12 * cw + cw / 2, wy + ch + 14, { size: 10, color: ACC, align: 'center', alpha: opE * (1 - fly) });
        }
        var lines = cholFormula(cur), fs = clamp(w / 46, 10, 13), fy2 = wy + ch + 48;
        text(c, lines[0], w / 2, fy2, { size: fs, color: FOAM, align: 'center', weight: 500 });
        text(c, lines[1], w / 2, fy2 + fs * 1.8, { size: fs, color: ACC, align: 'center' });
      } else {
        text(c, 'All ten entries found. Above the diagonal, L is zero.', w / 2, y0 + 4 * cs + 70, { size: 13, color: FOAM, align: 'center', weight: 500 });
      }
    },
    // 1.4 L times its transpose rebuilds Sigma, the row and column behind each entry lit
    function (c, w, h, p) {
      var cs = Math.min((w - 12) / 15, (h - 130) / 4.6, 46);
      var sy = 1.5 * cs, x0 = (w - 12 * cs - 2 * sy) / 2 + 6, y0 = (h - 4 * cs) / 2 - 20;
      var x1 = x0 + 4 * cs + sy, x2 = x1 + 4 * cs + sy;
      var fl = seg(p, 0.04, 0.8) * 16, cur = Math.min(15, Math.floor(fl)), ci = Math.floor(cur / 4), cj = cur % 4, done = p >= 0.8;
      var f3 = function (v) { return fmtNum(v, cs < 38 ? 2 : 3, cs); };
      matrix(c, x0, y0, cs, L, { scale: 0.22, blank: function (i, j) { return j > i; }, fmt: f3, label: 'L', hi: function (i) { return !done && i === ci ? ACC : null; } });
      matrix(c, x1, y0, cs, LT, { scale: 0.22, blank: function (i, j) { return j < i; }, fmt: f3, label: 'Lᵀ', hi: function (i, j) { return !done && j === cj ? ACC : null; } });
      matrix(c, x2, y0, cs, REC100, {
        scale: 4.84, label: 'LLᵀ × 100',
        show: function (i, j) { var q = i * 4 + j; return q < cur || done ? 1 : q === cur ? ease(fl - cur) : 0; },
        hi: function (i, j) { return !done && i === ci && j === cj ? ACC : null; }
      });
      symbol(c, '·', x0 + 4 * cs + sy / 2, y0 + 2 * cs, 22);
      symbol(c, '=', x1 + 4 * cs + sy / 2, y0 + 2 * cs, 20);
      if (!done) {
        var terms = [], tot = 0;
        for (var k = 0; k <= Math.min(ci, cj); k++) { terms.push(L[ci][k].toFixed(3) + '·' + L[cj][k].toFixed(3)); tot += L[ci][k] * L[cj][k]; }
        text(c, '(LLᵀ)' + sub(ci + 1) + sub(cj + 1) + ' = ' + terms.join(' + ') + ' = ' + tot.toFixed(4), w / 2, y0 + 4 * cs + 40, { size: clamp(w / 52, 9, 12), color: FOAM, align: 'center' });
      }
      text(c, '‖LLᵀ − Σ‖∞ = ' + sci(RESID), w / 2, y0 + 4 * cs + 70, { size: clamp(w / 36, 11, 16), color: ACC, align: 'center', weight: 500, alpha: ease(seg(p, 0.8, 0.95)) });
    },
    // 1.5 the circle becomes the ellipse, and one draw goes through L
    function (c, w, h, p) {
      var side = w >= 600 ? 250 : 0;
      var sz = Math.min(h - 40, w - side - 16), ox = (w - side - sz) / 2, oy = (h - sz) / 2;
      var e = ease(seg(p, 0.08, 0.8));
      var pts = CLOUD.map(function (o) { return [lerp(o.z[0], o.x[0] / 0.2, e), lerp(o.z[3], o.x[3] / 0.2, e)]; });
      var ax = scatter(c, ox, oy, sz, pts, { xl: 'EQ', yl: 'RE' });
      var E2 = ellipseL(SIG, 0, 3).map(function (r) { return r.map(function (v) { return v / 0.2; }); });
      var M2 = lerpM([[1, 0], [0, 1]], E2, e);
      ellipse(c, ax, M2, 1, ACC, 0.9);
      ellipse(c, ax, M2, 2, ACC, 0.6, [4, 4]);
      var p0 = pts[0];
      V.dot(c, ax.cx + p0[0] * ax.k, ax.cy - p0[1] * ax.k, 4, ACC, { halo: true });
      text(c, 'corr = ' + corr(pts).toFixed(2), ox + 8, oy + 18, { size: 12, color: FOAM, weight: 500 });
      text(c, e < 0.5 ? 'unit circle' : '1σ and 2σ ellipses', ox + 8, oy + 34, { size: 10, color: ACC });
      if (side) {
        var ms = 27, mx = w - side + 2, my = (h - 4 * ms) / 2;
        matvecAnim(c, { M: L, v: CLOUD[0].z, cs: ms, mx: mx, my: my, vx: mx + 4 * ms + 18, vy: my, rx: mx + 4 * ms + 18 + 2.2 * ms, ry: my,
          q: seg(p, 0.05, 0.85), mScale: 0.22, vScale: 2.5, rScale: 0.45, mLabel: 'L', vLabel: 'z', rLabel: 'Lz',
          mFmt: function (v) { return v.toFixed(2).replace(/^(-?)0\./, '$1.'); }, vFmt: function (v) { return v.toFixed(1); }, pFmt: function (v) { return v.toFixed(2).replace(/^(-?)0\./, '$1.'); }, rFmt: function (v) { return v.toFixed(2).replace(/^(-?)0\./, '$1.'); } });
      }
    }
  ];
  Story.scene('cholesky', scene(cholBeats, [
    function (p) { return p < 0.42 ? 'One day’s deviation from the mean, times its own transpose: a rank-one 4 × 4 matrix.' : 'Averaging the outer products: after 2,520 days every entry is within <b>' + OPMAXERR.toFixed(2) + '</b> (× 10⁻²) of the true Σ. From here the figure uses the true Σ.'; },
    function () { return 'Σ<sub>ij</sub> = σ<sub>i</sub> ρ<sub>ij</sub> σ<sub>j</sub>. Dividing out the volatilities leaves correlations, with ones on the diagonal.'; },
    function (p) { var k = Math.min(10, Math.floor(p * 10.4)); return k < 10 ? 'Entry <b>' + (k + 1) + ' of 10</b>: the partial rows multiply and add, come off Σ, and are scaled into L.' : '<b>All ten entries found.</b>'; },
    function () { return 'Each entry of LL<sup>T</sup> is a row of L dotted with a column of L<sup>T</sup>. Residual: <b>' + sci(RESID) + '</b>.'; },
    function () { return 'The circle of independent draws becomes the covariance ellipse. Target correlation of EQ and RE: <b>' + RHO[0][3].toFixed(2) + '</b>.'; }
  ]));

  /* ---------- 2. VaR and CVaR ---------- */
  var HLO = -0.09, HHI = 0.08, NB = 58;
  var COUNTS = (function () {
    var cnt = new Array(NB).fill(0);
    for (var i = 0; i < NPORT; i++) { var b = Math.floor((PORT[i] - HLO) / (HHI - HLO) * NB); if (b >= 0 && b < NB) cnt[b]++; }
    return cnt;
  })();
  var FULLMAX = Math.max.apply(null, COUNTS);
  function histBox(c, box, n, colorOf, xr, alpha) {
    xr = xr || [HLO, HHI];
    var X = function (r) { return box.x + (r - xr[0]) / (xr[1] - xr[0]) * box.w; };
    var cnt = n >= NPORT ? COUNTS : (function () { var ct = new Array(NB).fill(0); for (var i = 0; i < n; i++) { var b = Math.floor((PORT[i] - HLO) / (HHI - HLO) * NB); if (b >= 0 && b < NB) ct[b]++; } return ct; })();
    var bw = (HHI - HLO) / NB, base = box.y + box.h;
    for (var b = 0; b < NB; b++) {
      if (!cnt[b]) continue;
      var lo = HLO + b * bw, mid = lo + bw / 2, x0 = X(lo), x1 = X(lo + bw);
      if (x1 < box.x || x0 > box.x + box.w) continue;
      var bh = cnt[b] / FULLMAX * box.h, col = colorOf ? colorOf(mid) : null;
      V.ga(c, (alpha == null ? 1 : alpha) * (col ? 0.95 : 0.42));
      c.fillStyle = col || MIST;
      c.fillRect(Math.max(box.x, x0) + 0.5, base - bh, Math.max(1, Math.min(x1, box.x + box.w) - Math.max(box.x, x0) - 1), bh);
    }
    return { X: X, base: base, cnt: cnt };
  }
  function pctTicks(c, box, X, xr, step) {
    for (var t = Math.ceil(xr[0] / step) * step; t <= xr[1] + 1e-9; t += step) {
      text(c, (t > 0 ? '+' : t < 0 ? '−' : '') + Math.abs(Math.round(t * 1000) / 10) + '%', X(t), box.y + box.h + 16, { size: 10, align: 'center' });
    }
  }
  var varBeats = [
    // 2.1 each scenario dotted with the weights, then the rest of the scenarios
    function (c, w, h, p) {
      var cs = Math.min(40, (h * 0.44 - 50) / 4.3, w / 13);
      var box = { x: 10, y: h * 0.5, w: w - 20, h: h * 0.42 };
      var nF = Math.max(0, Math.floor(ease(seg(p, 0.58, 1)) * NPORT));
      var H = histBox(c, box, nF);
      pctTicks(c, box, H.X, [HLO, HHI], 0.04);
      var kNow = Math.min(2, Math.floor(p / 0.18));
      // the returns already dropped, as marks on the axis
      for (var d = 0; d < kNow && nF === 0; d++) V.dot(c, H.X(dot(WT, XS[d]) / 100), box.y + box.h - 4, 3.5, ACC, {});
      if (p < 0.56) {
        var k = kNow, q = seg(p, k * 0.18, k * 0.18 + 0.18);
        var mul = ease(seg(q, 0.12, 0.4)), mrg = ease(seg(q, 0.44, 0.7)), drop = ease(seg(q, 0.74, 1));
        var top = 40, xX = 40, xW = xX + 2.2 * cs, xS = xW + 2.6 * cs;
        var Rp = dot(WT, XS[k]);
        var f2d = function (u) { return u.toFixed(2); };
        for (var i = 0; i < 4; i++) {
          var x = lerp(lerp(xX, xX + 1.1 * cs, mul), xS, mrg), y = lerp(top + i * cs, top + 1.5 * cs, mrg);
          cellAt(c, x, y, cs, cs, lerp(XS[k][i], XS[k][i] * WT[i], mul), { scale: 6, alpha: 1 - mrg, fmt: f2d });
          cellAt(c, lerp(xW, xX + 1.1 * cs, mul), top + i * cs, cs, cs, WT[i], { scale: 0.5, alpha: 1 - mul, fmt: f2d });
          if (cs >= 10) text(c, NAMES[i], xX - 8, top + i * cs + cs / 2, { size: Math.min(10, cs * 0.8), align: 'right', base: 'middle', alpha: 1 - mrg });
        }
        text(c, 'X' + sub(k + 1) + ' (%)', xX + cs / 2, top - 8, { size: 11, color: FOAM, align: 'center', weight: 500, alpha: 1 - mul });
        text(c, 'w', xW + cs / 2, top - 8, { size: 11, color: FOAM, align: 'center', weight: 500, alpha: 1 - mul });
        symbol(c, '⊙', xX + 1.6 * cs, top + 2 * cs, 16, 1 - mul);
        if (mul > 0.5) text(c, 'wᵢXᵢ', xX + 1.6 * cs, top - 8, { size: 11, color: ACC, align: 'center', weight: 500, alpha: 1 - mrg });
        if (mrg > 0.6) {
          var bx = lerp(xS, H.X(Rp / 100) - cs / 2, drop), by = lerp(top + 1.5 * cs, box.y + box.h - cs, drop);
          cellAt(c, bx, by, cs * 1.3, cs, Rp, { scale: 3, stroke: ACC, alpha: 1 - 0.7 * drop, fmt: f2d });
          text(c, 'Rₚ = Σ wᵢXᵢ = ' + Rp.toFixed(2) + '%', xS + 1.6 * cs, top + 2 * cs + 4, { size: 12, color: ACC, weight: 500, alpha: 1 - drop });
        }
      }
      if (nF > 0) text(c, 'n = ' + nF.toLocaleString(), w - 12, box.y + 14, { size: 11, align: 'right' });
    },
    // 2.2 the histogram stacks into the CDF; read it backward at 1%
    function (c, w, h, p) {
      var box = { x: 44, y: 30, w: w - 70, h: h - 80 };
      var cdf = ease(seg(p, 0, 0.3)), zoom = ease(seg(p, 0.34, 0.58)), read = ease(seg(p, 0.62, 0.86)), five = ease(seg(p, 0.88, 1));
      var xr = [HLO, lerp(HHI, -0.02, zoom)], ymax = lerp(1, 0.08, zoom);
      var X = function (r) { return box.x + (r - xr[0]) / (xr[1] - xr[0]) * box.w; };
      var Y = function (u) { return box.y + box.h - u / ymax * box.h; };
      // bars morph from counts to cumulative heights
      var bw = (HHI - HLO) / NB, cum = 0;
      c.save();
      c.beginPath(); c.rect(box.x, box.y - 10, box.w, box.h + 10); c.clip();
      for (var b = 0; b < NB; b++) {
        cum += COUNTS[b] / NPORT;
        var lo = HLO + b * bw, x0 = X(lo), x1 = X(lo + bw);
        var hHist = COUNTS[b] / FULLMAX * box.h * (1 - zoom), hCdf = box.y + box.h - Y(cum);
        var hh = lerp(hHist, hCdf, cdf), wd = lerp(x1 - x0 - 1, Math.max(1, (x1 - x0) * 0.35), cdf);
        V.ga(c, 0.5);
        c.fillStyle = MIST;
        c.fillRect(x0 + (x1 - x0 - wd) / 2, box.y + box.h - hh, wd, hh);
      }
      // the empirical CDF as a line through the sorted samples
      if (cdf > 0) {
        V.ga(c, cdf);
        c.strokeStyle = FOAM;
        c.lineWidth = 1.8;
        c.beginPath();
        var first = true;
        for (var k = 0; k < NPORT; k += 3) { var x = X(SORTED[k]), y = Y((k + 1) / NPORT); if (first) { c.moveTo(x, y); first = false; } else c.lineTo(x, y); }
        c.stroke();
      }
      c.restore();
      V.ga(c, 1);
      c.strokeStyle = 'rgba(143,177,189,0.35)';
      c.beginPath(); c.moveTo(box.x, box.y); c.lineTo(box.x, box.y + box.h); c.lineTo(box.x + box.w, box.y + box.h); c.stroke();
      pctTicks(c, box, X, xr, zoom > 0.5 ? 0.01 : 0.04);
      [0.01, 0.05].concat(zoom < 0.5 ? [0.5, 1] : [0.08]).forEach(function (u) { if (u <= ymax + 1e-9) text(c, (u * 100) + '%', box.x - 6, Y(u) + 3, { size: 10, align: 'right' }); });
      text(c, cdf > 0.5 ? 'P(Rₚ ≤ x)' : 'count', box.x + 6, box.y + 10, { size: 10 });
      function readAt(q, col, a) {
        var xq = -(q === 0.01 ? VAR99 : -SORTED[Math.floor(0.05 * NPORT)]);
        var xe = lerp(box.x, X(xq), Math.min(1, a * 2)), ye = Y(q);
        V.line(c, box.x, ye, xe, ye, col, { width: 1.6, alpha: Math.min(1, a * 3) });
        if (a > 0.5) { V.line(c, X(xq), ye, X(xq), lerp(ye, box.y + box.h, (a - 0.5) * 2), col, { width: 1.6 }); }
        if (a > 0.95) text(c, 'VaR' + (q === 0.01 ? '₉₉' : '₉₅') + ' = ' + pct(-xq), X(xq) + 6, box.y + box.h - 8 - (q === 0.05 ? 15 : 0), { size: 11, color: col, weight: 500 });
      }
      if (read > 0) readAt(0.01, ACC, read);
      if (five > 0) readAt(0.05, FOAM, five);
    },
    // 2.3 the tail bars slide together into their center of mass
    function (c, w, h, p) {
      var box = { x: 10, y: 50, w: w - 20, h: h - 100 };
      var lit = ease(seg(p, 0, 0.2)), mv = ease(seg(p, 0.25, 0.75)), lab = ease(seg(p, 0.78, 1));
      var H = histBox(c, box, NPORT, function (m) { return m < -VAR99 && lit > 0 ? null : null; });
      pctTicks(c, box, H.X, [HLO, HHI], 0.04);
      var bw = (HHI - HLO) / NB, stack = 0, xc = H.X(-CVAR99), cw = Math.max(10, box.w / NB * 1.6);
      for (var b = 0; b < NB; b++) {
        var lo = HLO + b * bw, mid = lo + bw / 2;
        if (mid >= -VAR99 || !COUNTS[b]) continue;
        var bh = COUNTS[b] / FULLMAX * box.h * lerp(4, 1.6, mv);   // magnified 4x to be seen; 1.6x once stacked
        var x = lerp(H.X(lo), xc - cw / 2, mv), y = lerp(box.y + box.h - bh, box.y + box.h - stack - bh, mv);
        V.ga(c, lit);
        c.fillStyle = ACC;
        c.fillRect(x + 0.5, y, Math.max(1, lerp(H.X(lo + bw) - H.X(lo) - 1, cw, mv)), bh);
        stack += bh * mv;
      }
      V.line(c, H.X(-VAR99), box.y - 10, H.X(-VAR99), box.y + box.h, ACC, { width: 1.4, alpha: lit });
      text(c, 'VaR₉₉', H.X(-VAR99) + 6, box.y, { size: 11, color: ACC, weight: 500, alpha: lit });
      text(c, 'tail magnified', box.x + 6, box.y - 20, { size: 10, alpha: lit });
      if (lab > 0) {
        V.line(c, xc, box.y + 10, xc, box.y + box.h, FOAM, { dash: [3, 3], width: 1.4, alpha: lab });
        text(c, 'CVaR₉₉ = ' + pct(CVAR99) + '  (the tail’s mean)', Math.max(4, xc - 10), box.y + box.h + 34, { size: 12, color: FOAM, weight: 500, alpha: lab });
      }
    }
  ];
  Story.scene('var', scene(varBeats, [
    function (p) { return p < 0.55 ? 'Each scenario’s asset returns X, weighted by w and summed: one portfolio return, dropped into the histogram.' : '<b>' + Math.floor(ease(seg(p, 0.58, 1)) * NPORT).toLocaleString() + '</b> of ' + NPORT.toLocaleString() + ' simulated 10-day portfolio returns.'; },
    function (p) { return p < 0.34 ? 'The bars stack into the cumulative distribution F(x) = P(R<sub>p</sub> ≤ x).' : p < 0.6 ? 'Zooming into the left tail.' : 'Reading F backward at 1%: VaR<sub>99</sub> = <b>' + pct(VAR99) + '</b>. At 5%: <b>' + pct(-SORTED[Math.floor(0.05 * NPORT)]) + '</b>.'; },
    function () { return 'The ' + I99 + ' worst scenarios slide together at their mean: CVaR<sub>99</sub> = <b>' + pct(CVAR99) + '</b>, beyond VaR<sub>99</sub> = ' + pct(VAR99) + '.'; }
  ]));

  /* ---------- 3. Component VaR ---------- */
  var SHADES = [0.95, 0.72, 0.52, 0.34];
  function barLayout(w, h) {
    var labW = w < 480 ? 48 : 70, valW = 64, maxV = STANDSUM * 1.04;
    var rowH = Math.min(46, (h - 40) / 6.8), y0 = (h - rowH * 6.6) / 2;
    return { X: function (v) { return labW + v / maxV * (w - labW - valW); }, rowH: rowH, bh: rowH * 0.58,
      rowY: function (r) { return y0 + r * rowH * 1.06 + (r >= 4 ? rowH * 0.35 : 0); }, fs: w < 480 ? 10 : 12 };
  }
  var compBeats = [
    // 3.1 standalone VaRs overshoot the portfolio's
    function (c, w, h, p) {
      var B = barLayout(w, h), g = ease(seg(p, 0, 0.6)), gapA = ease(seg(p, 0.6, 0.9));
      STAND.forEach(function (v, i) {
        var y = B.rowY(i);
        text(c, NAMES[i] + ' ' + Math.round(WT[i] * 100) + '%', 0, y + B.bh * 0.72, { size: B.fs });
        V.ga(c, 1);
        c.fillStyle = 'rgba(' + AMBER + ',' + SHADES[i] + ')';
        c.fillRect(B.X(0), y, (B.X(v) - B.X(0)) * g, B.bh);
        text(c, pct(v), B.X(v * g) + 6, y + B.bh * 0.72, { size: B.fs, color: FOAM });
      });
      var ys = B.rowY(4), yp = B.rowY(5);
      text(c, 'Sum', 0, ys + B.bh * 0.72, { size: B.fs });
      V.ga(c, 0.6); c.fillStyle = MIST; c.fillRect(B.X(0), ys, (B.X(STANDSUM) - B.X(0)) * g, B.bh);
      text(c, pct(STANDSUM), B.X(STANDSUM * g) + 6, ys + B.bh * 0.72, { size: B.fs, color: FOAM });
      text(c, 'VaRₚ', 0, yp + B.bh * 0.72, { size: B.fs, color: ACC });
      V.ga(c, 1); c.fillStyle = ACC; c.fillRect(B.X(0), yp, (B.X(VARP) - B.X(0)) * g, B.bh);
      text(c, pct(VARP), B.X(VARP * g) + 6, yp + B.bh * 0.72, { size: B.fs, color: FOAM });
      if (gapA > 0) {
        V.ga(c, gapA); c.setLineDash([4, 4]); c.strokeStyle = FOAM;
        c.strokeRect(B.X(VARP) + 0.5, yp + 0.5, B.X(STANDSUM) - B.X(VARP) - 1, B.bh - 1);
        c.setLineDash([]);
        text(c, 'diversification', (B.X(VARP) + B.X(STANDSUM)) / 2, yp + B.bh + 16, { size: B.fs, color: FOAM, align: 'center', alpha: gapA });
      }
    },
    // 3.2 the gradient: Sigma w, then w times it, scaled by z / sigma_p
    function (c, w, h, p) {
      var cs = Math.min(44, (w - 40) / 10.5, (h - 150) / 4.6), mx = Math.max(30, (w - 10 * cs) / 2), my = 48;
      var vx = mx + 4 * cs + 0.9 * cs, rx = vx + 2.2 * cs;
      var mq = seg(p, 0, 0.5), hd = ease(seg(p, 0.54, 0.7)), sc = ease(seg(p, 0.74, 0.92));
      var f1 = function (v) { return v.toFixed(1); };
      V.faded(1 - 0.4 * hd, function () {
        matvecAnim(c, { M: SH4, v: WT, cs: cs, mx: mx, my: my, vx: vx, vy: my, rx: rx, ry: my, q: mq, mScale: 13, vScale: 0.5, rScale: 8, pScale: 5,
          mLabel: 'Σₕ × 10⁴', vLabel: 'w', rLabel: 'Σₕw', mFmt: f1, vFmt: function (v) { return v.toFixed(2); }, rFmt: f1, pFmt: f1 });
      });
      // w times Sigma w, element by element, then scaled into each component
      var ox = rx + 2.6 * cs;
      if (hd > 0) {
        for (var i = 0; i < 4; i++) {
          var v = lerp(SW4[i], WSW4[i], hd), val = lerp(v, COMP[i] * 100, sc);
          cellAt(c, lerp(rx, ox, hd), my + i * cs, cs, cs, val, { scale: sc > 0.5 ? 3 : 6, stroke: ACC, lw: 1.2, fmt: function (u) { return u.toFixed(sc > 0.5 ? 2 : 1); } });
        }
        brackets(c, ox, my, cs, 4 * cs, hd);
        text(c, sc > 0.5 ? 'components (%)' : 'w ⊙ Σₕw', ox + cs / 2, my - 8, { size: 11, color: ACC, align: 'center', weight: 500, alpha: hd });
      }
      var fs = clamp(w / 50, 10, 12), ty = my + 4 * cs + 34;
      text(c, 'σₚ = √(wᵀΣₕw) = ' + pct(SP), mx, ty, { size: fs, color: FOAM, alpha: hd });
      text(c, 'componentᵢ = z₉₉ · wᵢ(Σₕw)ᵢ / σₚ,  z₉₉ = ' + Z99.toFixed(3), mx, ty + fs * 1.9, { size: fs, color: ACC, alpha: sc });
      text(c, 'Σ components = ' + pct(COMP.reduce(function (a, b) { return a + b; }, 0)) + ' = VaRₚ', mx, ty + fs * 3.8, { size: fs, color: FOAM, alpha: ease(seg(p, 0.9, 1)) });
    },
    // 3.3 the standalone bars shrink to their components and stack into VaR_p
    function (c, w, h, p) {
      var B = barLayout(w, h), e = ease(seg(p, 0.05, 0.85)), yp2 = B.rowY(5), cum = 0;
      text(c, 'Sum', 0, B.rowY(4) + B.bh * 0.72, { size: B.fs, alpha: 1 - e });
      V.ga(c, 0.6 * (1 - e)); c.fillStyle = MIST; c.fillRect(B.X(0), B.rowY(4), B.X(STANDSUM) - B.X(0), B.bh);
      text(c, 'VaRₚ', 0, yp2 + B.bh * 0.72, { size: B.fs, color: ACC });
      V.ga(c, 1); c.strokeStyle = ACC; c.lineWidth = 1.5; c.strokeRect(B.X(0) + 0.5, yp2 + 0.5, B.X(VARP) - B.X(0) - 1, B.bh - 1);
      COMP.forEach(function (v, i) {
        var width = lerp(STAND[i], v, e), x = B.X(lerp(0, cum, e)), y = lerp(B.rowY(i), yp2, e);
        text(c, NAMES[i] + ' ' + Math.round(WT[i] * 100) + '%', 0, B.rowY(i) + B.bh * 0.72, { size: B.fs, alpha: 1 - e });
        V.ga(c, 1); c.fillStyle = 'rgba(' + AMBER + ',' + SHADES[i] + ')';
        c.fillRect(x, y, B.X(width) - B.X(0) - (e > 0.5 ? 1 : 0), B.bh);
        if (e > 0.9 && B.X(v) - B.X(0) > 34) {
          text(c, NAMES[i], x + 5, y + B.bh * 0.45, { size: 10, color: '#07222e', weight: 500 });
          text(c, Math.round(v / VARP * 100) + '%', x + 5, y + B.bh * 0.88, { size: 10, color: '#07222e' });
        }
        cum += v;
      });
      text(c, 'Σ components = ' + pct(cum) + ' = VaRₚ', B.X(0), yp2 + B.bh + 22, { size: B.fs, color: FOAM, alpha: ease(seg(p, 0.85, 1)) });
    }
  ];
  Story.scene('component', scene(compBeats, [
    function () { return 'Sum of standalone VaRs <b>' + pct(STANDSUM) + '</b> against portfolio VaR <b>' + pct(VARP) + '</b> (99%, 10-day, normal model for illustration).'; },
    function () { return 'The gradient of σ<sub>p</sub> is Σ<sub>h</sub>w / σ<sub>p</sub>; weighting it by w gives each holding’s share. 10-day covariance, × 10<sup>4</sup>.'; },
    function () { return 'Contributions: ' + COMP.map(function (v, i) { return NAMES[i] + ' <b>' + Math.round(v / VARP * 100) + '%</b>'; }).join(', ') + '. They sum to VaR<sub>p</sub> exactly.'; }
  ]));

  /* ---------- 4. Stress testing ---------- */
  function dRhoD(c, w, h, rhoM, o) {
    var cs = Math.min((w - 10) / 14.8, (h - 120) / 4.8, 54);
    var sym = 1.4 * cs, x0 = (w - 12 * cs - 2 * sym) / 2 + 4, y0 = (h - 4 * cs) / 2 + 4;
    var rhoX = x0 + 4 * cs + sym, dRx = rhoX + 4 * cs + sym;
    var offd = function (i, j) { return i !== j; };
    var dOpts = { scale: 0.22, blank: offd, label: o.held ? 'D (fixed)' : 'D', hi: function (i, j) { return o.held && i === j ? FOAM : null; }, alpha: o.dAlpha };
    matrix(c, x0, y0, cs, diag(VOLS), dOpts);
    matrix(c, dRx, y0, cs, diag(VOLS), dOpts);
    matrix(c, rhoX, y0, cs, rhoM, { scale: 1, label: o.rhoLabel || 'ρ', hi: o.rhoHi });
    symbol(c, '·', x0 + 4 * cs + sym / 2, y0 + 2 * cs, 22, o.dAlpha);
    symbol(c, '·', rhoX + 4 * cs + sym / 2, y0 + 2 * cs, 22, o.dAlpha);
    return { cs: cs, x0: x0, y0: y0, rhoX: rhoX, dRx: dRx };
  }
  var stressBeats = [
    function (c, w, h) { dRhoD(c, w, h, RHO, {}); },
    function (c, w, h, p) {
      var e = ease(seg(p, 0.1, 0.85));
      var G = dRhoD(c, w, h, lerpM(RHO, RHO_X, e), { held: true, rhoLabel: e > 0.5 ? 'ρ stress' : 'ρ', rhoHi: function (i, j) { return i !== j && e < 1 ? ACC : null; } });
      var avg = 0, n = 0;
      RHO.forEach(function (r, i) { r.forEach(function (v, j) { if (i !== j) { avg += lerp(v, 0.8, e); n++; } }); });
      text(c, 'mean off-diagonal ρ = ' + (avg / n).toFixed(2), w / 2, G.y0 + 4 * G.cs + 40, { size: clamp(w / 40, 11, 14), color: e > 0 ? ACC : MIST, align: 'center', weight: 500 });
    },
    // 4.3 rebuild Sigma: the left D scales the rows, the right D the columns
    function (c, w, h, p) {
      var rowS = ease(seg(p, 0.05, 0.35)), colS = ease(seg(p, 0.4, 0.7)), cmp = ease(seg(p, 0.74, 1));
      var cs = Math.min((w - 10) / 14.8, (h - 120) / 4.8, 54), sym = 1.4 * cs, x0 = (w - 12 * cs - 2 * sym) / 2 + 4, y0 = (h - 4 * cs) / 2 + 4;
      var rhoX = x0 + 4 * cs + sym, dRx = rhoX + 4 * cs + sym;
      var M = RHO_X.map(function (r, i) { return r.map(function (v, j) { return v * lerp(1, VOLS[i], rowS) * lerp(1, VOLS[j], colS) * lerp(1, 100, Math.min(rowS, colS)); }); });
      var offd = function (i, j) { return i !== j; };
      var cx = lerp(rhoX, (w - 8 * cs - sym) / 2 + 4 * cs + sym, cmp);
      matrix(c, x0 + (rhoX - x0 - 4 * cs) * rowS * 0.6, y0, cs, diag(VOLS), { scale: 0.22, blank: offd, label: 'D', alpha: 1 - rowS });
      matrix(c, dRx - (dRx - rhoX - 4 * cs) * colS * 0.6, y0, cs, diag(VOLS), { scale: 0.22, blank: offd, label: 'D', alpha: 1 - colS });
      matrix(c, cx, y0, cs, M, {
        scale: lerp(1, 4.84, Math.min(rowS, colS)), label: colS > 0.9 ? 'Σ stress × 100' : rowS > 0.5 ? 'Dρ' : 'ρ stress',
        hi: function (i, j) { return (rowS > 0 && rowS < 1) ? 'rgba(' + AMBER + ',0.6)' : (colS > 0 && colS < 1) ? 'rgba(' + AMBER + ',0.6)' : null; },
        fmt: function (v) { return fmtNum(v, 2, cs); }
      });
      if (cmp > 0) {
        var lx = (w - 8 * cs - sym) / 2;
        matrix(c, lx, y0, cs, SIG100, { scale: 4.84, label: 'Σ calm × 100', alpha: cmp,
          hi: function (i, j) { return i === j ? FOAM : null; } });
        symbol(c, '→', lx + 4 * cs + sym / 2, y0 + 2 * cs, 20, cmp);
        text(c, 'same diagonal, larger off-diagonal entries', w / 2, y0 + 4 * cs + 40, { size: clamp(w / 44, 10, 13), color: ACC, align: 'center', weight: 500, alpha: cmp });
      }
    },
    // 4.4 calm against crisis: the cloud and its ellipse collapse toward a line
    function (c, w, h, p) {
      var sz = Math.min((w - 24) / 2, h * 0.6), gx = 24, ox1 = (w - 2 * sz - gx) / 2, ox2 = ox1 + sz + gx, oy = 18;
      var e = ease(seg(p, 0.05, 0.6));
      var calm = CLOUD.map(function (o) { return [o.x[0] / 0.2, o.x[2] / 0.2]; });
      var crisis = CLOUD.map(function (o) { return [lerp(o.x[0], o.xs[0], e) / 0.2, lerp(o.x[2], o.xs[2], e) / 0.2]; });
      var a1 = scatter(c, ox1, oy, sz, calm, { xl: 'EQ', yl: 'CM' });
      var a2 = scatter(c, ox2, oy, sz, crisis, { xl: 'EQ', yl: 'CM', color: ACC, alpha: 0.6 });
      var Ec = ellipseL(SIG, 0, 2).map(function (r) { return r.map(function (v) { return v / 0.2; }); });
      var Ex = ellipseL(SIGX, 0, 2).map(function (r) { return r.map(function (v) { return v / 0.2; }); });
      ellipse(c, a1, Ec, 2, FOAM, 0.8);
      ellipse(c, a2, lerpM(Ec, Ex, e), 2, ACC, 0.95);
      text(c, 'calm, ρ = ' + RHO[0][2].toFixed(2), ox1 + 6, oy + sz + 16, { size: 11 });
      text(c, 'crisis, ρ = ' + lerp(RHO[0][2], 0.8, e).toFixed(2), ox2 + 6, oy + sz + 16, { size: 11, color: ACC });
      var g = ease(seg(p, 0.6, 0.95)), by = oy + sz + 38, bh = Math.min(22, (h - by - 10) / 2.6);
      var labW = 92, X = function (v) { return labW + v / (VARX * 1.15) * (w - labW - 70); };
      [[VARP, 'calm VaR', MIST], [VARX, 'crisis VaR', ACC]].forEach(function (row, i) {
        var y = by + i * bh * 1.35;
        text(c, row[1], 0, y + bh * 0.72, { size: 11, color: row[2] });
        V.ga(c, i ? 0.95 : 0.6); c.fillStyle = row[2]; c.fillRect(X(0), y, (X(row[0]) - X(0)) * g, bh);
        text(c, pct(row[0]), X(row[0] * g) + 6, y + bh * 0.72, { size: 11, color: FOAM });
      });
    }
  ];
  Story.scene('stress', scene(stressBeats, [
    function () { return 'D holds each asset’s volatility; ρ holds how they move together.'; },
    function () { return 'Off-diagonal correlations rolling to <b>0.80</b>. The volatilities in D don’t change.'; },
    function (p) { return p < 0.4 ? 'The left D multiplies row i by σ<sub>i</sub>.' : p < 0.74 ? 'The right D multiplies column j by σ<sub>j</sub>: (DρD)<sub>ij</sub> = σ<sub>i</sub>ρ<sub>ij</sub>σ<sub>j</sub>.' : 'Against the calm Σ: variances unchanged, every covariance larger.'; },
    function () { return 'The 2σ ellipse narrows toward a line. VaR<sub>99</sub>, 10-day: <b>' + pct(VARP) + '</b> calm, <span class="hot">' + pct(VARX) + '</span> in the crisis.'; }
  ]));

  /* ---------- 5. Backtesting ---------- */
  function retChart(c, w, h, chartH, cursor, o) {
    var M = { l: 6, r: 6, t: 30, b: 20 };
    var mid = M.t + (chartH - M.t - M.b) * 0.42, amp = (chartH - M.t - M.b) * 0.55 / 0.065;
    var X = function (d) { return M.l + d / (DAYS - 1) * (w - M.l - M.r); }, Y = function (r) { return mid - r * amp; };
    if (o.window) {
      V.ga(c, 0.06); c.fillStyle = FOAM;
      c.fillRect(X(cursor - WIN), M.t - 12, X(cursor) - X(cursor - WIN), chartH - M.t - M.b + 12);
      text(c, '252-day window', X(cursor - WIN) + 4, M.t - 2, { size: 10 });
    }
    V.ga(c, 0.5); c.strokeStyle = MIST; c.lineWidth = 1;
    c.beginPath();
    for (var d = 0; d <= cursor; d++) { c.moveTo(X(d), mid); c.lineTo(X(d), Y(RET[d])); }
    c.stroke();
    V.ga(c, 1); c.strokeStyle = ACC; c.lineWidth = 1.6;
    c.beginPath();
    for (d = WIN; d <= cursor; d++) { if (d === WIN) c.moveTo(X(d), Y(-VLINE[d])); else c.lineTo(X(d), Y(-VLINE[d])); }
    c.stroke();
    if (cursor >= JUMP) {
      V.line(c, X(JUMP), M.t - 6, X(JUMP), chartH - M.b, 'rgba(234,246,248,0.35)', { dash: [2, 4] });
      text(c, 'vol jump', X(JUMP) + 4, chartH - M.b - 4, { size: 10 });
    }
    if (o.viol != null) {
      var count = 0;
      VIOL.forEach(function (vd) { if (vd > o.viol) return; count++; V.dot(c, X(vd), Y(RET[vd]), 3, ACC, { halo: true }); });
      text(c, 'V = ' + count + ' violations', M.l, 14, { size: 12, color: FOAM, weight: 500 });
      text(c, 'expected ≈ ' + (0.01 * TT).toFixed(1), w - M.r, 14, { size: 12, align: 'right' });
    }
  }
  function loglik(pp) { return VV * Math.log(pp) + (TT - VV) * Math.log(1 - pp); }
  var btBeats = [
    function (c, w, h, p) { retChart(c, w, h, h, Math.round(WIN + ease(p) * (DAYS - 1 - WIN)), { window: true }); },
    function (c, w, h, p) { retChart(c, w, h, h, DAYS - 1, { viol: WIN + ease(seg(p, 0, 0.9)) * (DAYS - 1 - WIN) }); },
    // 5.3 the likelihood gap, carried onto the chi-squared curve
    function (c, w, h, p) {
      var draw = ease(seg(p, 0, 0.25)), gap = ease(seg(p, 0.28, 0.48)), carry = ease(seg(p, 0.52, 0.8)), verdict = ease(seg(p, 0.82, 1));
      var lb = { x: 54, y: 30, w: w - 80, h: h * 0.38 };
      var pr = [0.005, 0.03], lmax = loglik(PH) + 0.6, lmin = Math.min(loglik(pr[0]), loglik(pr[1]));
      var LX2 = function (pp) { return lb.x + (pp - pr[0]) / (pr[1] - pr[0]) * lb.w; };
      var LY = function (v) { return lb.y + lb.h - (v - lmin) / (lmax - lmin) * lb.h; };
      V.ga(c, 1); c.strokeStyle = 'rgba(143,177,189,0.35)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(lb.x, lb.y); c.lineTo(lb.x, lb.y + lb.h); c.lineTo(lb.x + lb.w, lb.y + lb.h); c.stroke();
      text(c, 'log-likelihood ℓ(p) = V ln p + (T−V) ln(1−p)', lb.x + 6, lb.y - 8, { size: 10 });
      text(c, 'violation rate p', lb.x + lb.w, lb.y + lb.h + 16, { size: 10, align: 'right' });
      c.save(); c.beginPath(); c.rect(lb.x, lb.y, lb.w, lb.h); c.clip();
      V.plot(c, loglik, pr[0], pr[0] + (pr[1] - pr[0]) * draw, LX2, LY, FOAM, { width: 1.8 });
      c.restore();
      // the two rates: the target, and the one observed
      var y0 = LY(loglik(P0)), y1 = LY(loglik(PH));
      if (gap > 0) {
        V.line(c, LX2(P0), lb.y + lb.h, LX2(P0), y0, MIST, { dash: [3, 3], alpha: gap });
        V.line(c, LX2(PH), lb.y + lb.h, LX2(PH), y1, ACC, { dash: [3, 3], alpha: gap });
        text(c, 'p = 0.01', LX2(P0), lb.y + lb.h + 16, { size: 10, align: 'center', alpha: gap });
        text(c, 'p̂ = ' + PH.toFixed(4), LX2(PH), lb.y + lb.h + 30, { size: 10, color: ACC, align: 'center', alpha: gap });
        V.dot(c, LX2(P0), y0, 3.5, MIST, { alpha: gap });
        V.dot(c, LX2(PH), y1, 3.5, ACC, { halo: true, alpha: gap });
      }
      // the gap between them, doubled, becomes the statistic on the chi-squared axis
      var cb = { x: 30, y: lb.y + lb.h + 60, w: w - 60, h: h - lb.y - lb.h - 90 };
      var xmax = Math.max(10, LR * 1.3);
      var CX = function (x) { return cb.x + x / xmax * cb.w; };
      var f = function (x) { return Math.exp(-x / 2) / Math.sqrt(2 * Math.PI * x); };
      var CY = function (y) { return cb.y + cb.h - Math.min(1, y / 0.8) * cb.h; };
      V.ga(c, 0.18 * (0.3 + 0.7 * carry)); c.fillStyle = 'rgba(' + AMBER + ',1)';
      c.beginPath(); c.moveTo(CX(3.84), cb.y + cb.h);
      for (var x = 3.84; x <= xmax; x += 0.05) c.lineTo(CX(x), CY(f(x)));
      c.lineTo(CX(xmax), cb.y + cb.h); c.closePath(); c.fill();
      V.plot(c, f, 0.08, xmax, CX, CY, MIST, { width: 1.4, alpha: 0.4 + 0.6 * carry });
      V.line(c, cb.x, cb.y + cb.h, cb.x + cb.w, cb.y + cb.h, 'rgba(143,177,189,0.35)');
      V.line(c, CX(3.84), cb.y, CX(3.84), cb.y + cb.h, MIST, { dash: [4, 4], alpha: 0.4 + 0.6 * carry });
      text(c, '3.84, 5% critical value', CX(3.84) + 5, cb.y + 10, { size: 10, alpha: 0.4 + 0.6 * carry });
      for (var t = 0; t <= xmax; t += 2) text(c, String(t), CX(t), cb.y + cb.h + 15, { size: 10, align: 'center' });
      if (gap > 0) {
        // the bracket: vertical gap in the likelihood plot, then laid flat along the chi-squared axis
        var len0 = y0 - y1, len1 = CX(LR) - CX(0);
        var bx0 = LX2(PH) + 14, by0 = y1;
        var bx = lerp(bx0, CX(0), carry), by = lerp(by0, cb.y + cb.h - 6, carry);
        var ang = lerp(Math.PI / 2, 0, carry), len = lerp(len0, len1, carry);
        V.ga(c, gap);
        c.strokeStyle = ACC; c.lineWidth = 3;
        c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(ang) * len, by + Math.sin(ang) * len); c.stroke();
        text(c, carry < 0.5 ? 'ℓ(p̂) − ℓ(p) = ' + (LR / 2).toFixed(3) : 'LR = 2 × gap = ' + LR.toFixed(2), bx + (carry < 0.5 ? 10 : Math.cos(ang) * len / 2), by + (carry < 0.5 ? len / 2 : -10), { size: 11, color: ACC, weight: 500, align: carry < 0.5 ? 'left' : 'center' });
        if (carry > 0.95) V.dot(c, CX(LR), cb.y + cb.h - 6, 4.5, ACC, { halo: true });
      }
      text(c, PVAL < 0.05 ? 'beyond 3.84: rejected' : 'short of 3.84: not rejected', CX(LR) + 8, cb.y + cb.h - 40, { size: 11, color: PVAL < 0.05 ? ACC : FOAM, weight: 500, alpha: verdict });
    }
  ];
  Story.scene('backtest', scene(btBeats, [
    function (p) { var d = Math.round(WIN + ease(p) * (DAYS - 1 - WIN)); return 'Day <b>' + d + '</b>: VaR<sub>99</sub> from the previous 252 days = <b>' + pct(VLINE[d]) + '</b>. Simulated returns.'; },
    function () { var after = VIOL.filter(function (v) { return v >= JUMP; }).length; return '<b>' + VV + '</b> violations in ' + TT + ' days, against about ' + (0.01 * TT).toFixed(1) + ' expected: <b>' + (VV - after) + '</b> before the volatility jump, <b>' + after + '</b> after it.'; },
    function () { var verdict = PVAL < 0.05 ? '<span class="hot">rejected at 5%</span>' : '<b>not rejected</b> at 5%'; return 'LR = 2[ℓ(p̂) − ℓ(0.01)] = <b>' + LR.toFixed(2) + '</b>, p = <b>' + PVAL.toFixed(3) + '</b>: the model is ' + verdict + '.'; }
  ]));

  Story.start();
})();
