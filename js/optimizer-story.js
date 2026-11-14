/* Optimizer page: one continuous scroll story that follows four assets from
   raw prices to portfolio weights. Each beat is a smooth function of scroll
   progress, so the math morphs forward as you read and rewinds as you scroll
   back: price lines split into features, features condense into a tensor, a
   feature vector is weighted and collapsed, forecasts fly into mu, the
   covariance shrinks, the weight vector rotates through a matrix product, and
   gradient ascent climbs to the maximum Sharpe ratio.

   The assets match the risk engine page (EQ, CR, CM, RE). Prices are simulated;
   the selection weights and attention pattern are illustrative, since the real
   ones come from a trained model. Everything else is computed here. */
(function () {
  if (!window.Story) return;

  var G = '95,211,176', BLUE = '124,196,255';
  var FOAM = '#eaf6f8', MIST = '#8fb1bd', ACC = '#5fd3b0', DEEP = '#07222e';
  var MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

  /* ---------- Helpers ---------- */
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
  function gauss(r) {
    var u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function matvec(A, x) { return A.map(function (r) { return r.reduce(function (s, v, j) { return s + v * x[j]; }, 0); }); }
  function dot(a, b) { return a.reduce(function (s, v, i) { return s + v * b[i]; }, 0); }
  function sum(a) { return a.reduce(function (s, v) { return s + v; }, 0); }

  // every draw goes through ga(), so a whole beat can be faded as one
  var BASE = 1;
  function ga(c, a) { c.globalAlpha = BASE * (a == null ? 1 : a); }
  function faded(k, fn) { var b = BASE; BASE *= k; fn(); BASE = b; }

  function text(c, s, x, y, o) {
    o = o || {};
    // drawn by Viz.text, which fits labels to o.fit and keeps them inside the canvas
    window.Viz.text(c, s, x, y, Object.assign({}, o, { alpha: BASE * (o.alpha == null ? 1 : o.alpha) }));
  }
  function cellFill(v, scale, k) {
    var inten = Math.min(1, Math.abs(v) / (scale || 1));
    return 'rgba(' + (v >= 0 ? G : BLUE) + ',' + ((0.07 + 0.55 * inten) * (k == null ? 1 : k)) + ')';
  }
  // one cell: a shaded box with a value in it
  function cell(c, x, y, wd, ht, v, o) {
    o = o || {};
    var a = o.alpha == null ? 1 : o.alpha;
    if (a <= 0.005) return;
    var g = Math.max(1, Math.min(wd, ht) * 0.07);
    ga(c, a);
    c.fillStyle = cellFill(v, o.scale, 1);
    c.fillRect(x + g / 2, y + g / 2, wd - g, ht - g);
    if (o.stroke) {
      c.strokeStyle = o.stroke;
      c.lineWidth = o.lw || 1.6;
      c.strokeRect(x + g / 2 + 0.5, y + g / 2 + 0.5, wd - g - 1, ht - g - 1);
    }
    if (o.label !== false && Math.min(wd, ht) > 15) {
      var fs = Math.max(8, Math.min(13, Math.min(wd * 0.26, ht * 0.4)));
      text(c, o.fmt ? o.fmt(v) : num(v, 2, wd), x + wd / 2, y + ht / 2 + 0.5,
        { size: fs, color: FOAM, align: 'center', base: 'middle', weight: 500, fit: wd - 4, alpha: a * (o.textAlpha == null ? 1 : o.textAlpha) });
    }
  }
  function num(v, d, wd) {
    var s = v.toFixed(d);
    return wd < 38 ? s.replace(/^(-?)0\./, '$1.') : s;
  }
  function brackets(c, x, y, wd, ht, a) {
    var t = Math.min(6, wd * 0.15);
    ga(c, a);
    c.strokeStyle = MIST;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x - 3 + t, y); c.lineTo(x - 3, y); c.lineTo(x - 3, y + ht); c.lineTo(x - 3 + t, y + ht);
    c.moveTo(x + wd + 3 - t, y); c.lineTo(x + wd + 3, y); c.lineTo(x + wd + 3, y + ht); c.lineTo(x + wd + 3 - t, y + ht);
    c.stroke();
  }
  function matrix(c, x, y, cs, M, o) {
    o = o || {};
    var rows = M.length, cols = M[0].length;
    for (var i = 0; i < rows; i++) {
      for (var j = 0; j < cols; j++) {
        var co = { scale: o.scale, alpha: (o.alpha == null ? 1 : o.alpha) * (o.cellAlpha ? o.cellAlpha(i, j) : 1), fmt: o.fmt };
        if (o.stroke) co.stroke = o.stroke(i, j);
        if (o.textAlpha) co.textAlpha = o.textAlpha(i, j);
        cell(c, x + j * cs, y + i * cs, cs, cs, M[i][j], co);
      }
    }
    brackets(c, x, y, cols * cs, rows * cs, o.alpha);
    if (o.label) text(c, o.label, x + cols * cs / 2, y - (o.heads ? 22 : 8), { size: 12, color: FOAM, align: 'center', weight: 500, alpha: o.alpha });
    if (o.heads) {
      for (j = 0; j < cols; j++) text(c, NAMES[j], x + j * cs + cs / 2, y - 6, { size: 10, align: 'center', alpha: o.alpha, fit: cs - 3 });
      for (i = 0; i < rows; i++) text(c, NAMES[i], x - 8, y + i * cs + cs / 2, { size: 10, align: 'right', base: 'middle', alpha: o.alpha });
    }
  }
  function arrow(c, x0, y0, x1, y1, color, a) {
    ga(c, a);
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    var ang = Math.atan2(y1 - y0, x1 - x0), hl = 8;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x1 - hl * Math.cos(ang - 0.45), y1 - hl * Math.sin(ang - 0.45));
    c.lineTo(x1 - hl * Math.cos(ang + 0.45), y1 - hl * Math.sin(ang + 0.45));
    c.closePath();
    c.fill();
  }

  /* ---------- The model ---------- */
  var NAMES = ['EQ', 'CR', 'CM', 'RE'];
  var FEATS = ['log return', 'RSI', 'MACD signal', 'volatility', 'volume'];
  var FSHORT = ['r', 'RSI', 'MACD', 'vol', 'vlm'];
  var VOLS = [0.18, 0.09, 0.22, 0.20];
  var RHO = [
    [1.00, 0.45, 0.25, 0.55],
    [0.45, 1.00, 0.15, 0.40],
    [0.25, 0.15, 1.00, 0.20],
    [0.55, 0.40, 0.20, 1.00]
  ];
  var MU = [0.085, 0.035, 0.05, 0.07];  // the median forecasts, annualized
  var RF = 0.02, ALPHA = 0.1, N = 4;
  var S = RHO.map(function (r, i) { return r.map(function (v, j) { return v * VOLS[i] * VOLS[j]; }); });
  function shrunk(a) { return S.map(function (r, i) { return r.map(function (v, j) { return i === j ? v : (1 - a) * v; }); }); }
  var SH = shrunk(ALPHA);
  var S100 = S.map(function (r) { return r.map(function (v) { return v * 100; }); });

  // simulated prices, from correlated daily shocks
  var R = rng(17), DAYS = 120, WIN = 60;
  var Lc = (function () {
    var L = S.map(function () { return [0, 0, 0, 0]; });
    for (var j = 0; j < N; j++) {
      var s = 0;
      for (var k = 0; k < j; k++) s += L[j][k] * L[j][k];
      L[j][j] = Math.sqrt(S[j][j] - s);
      for (var i = j + 1; i < N; i++) {
        s = 0;
        for (k = 0; k < j; k++) s += L[i][k] * L[j][k];
        L[i][j] = (S[i][j] - s) / L[j][j];
      }
    }
    return L;
  })();
  var PRICE = NAMES.map(function () { return [100]; }), RET = NAMES.map(function () { return [0]; });
  for (var d = 1; d < DAYS; d++) {
    var shock = matvec(Lc, [gauss(R), gauss(R), gauss(R), gauss(R)]);
    for (var a = 0; a < N; a++) {
      var r = MU[a] / 252 + shock[a] / Math.sqrt(252);
      RET[a].push(r);
      PRICE[a].push(PRICE[a][d - 1] * Math.exp(r));
    }
  }

  // the five features, computed for real from those prices, then standardized
  function ema(xs, al) { var out = [], m = xs[0]; xs.forEach(function (x) { m = al * x + (1 - al) * m; out.push(m); }); return out; }
  var FEAT = NAMES.map(function (_, a) {
    var p = PRICE[a], rr = RET[a], n = p.length;
    var gain = ema(rr.map(function (x) { return Math.max(x, 0); }), 1 / 14);
    var loss = ema(rr.map(function (x) { return Math.max(-x, 0); }), 1 / 14);
    var rsi = gain.map(function (g, i) { return 100 - 100 / (1 + g / Math.max(1e-9, loss[i])); });
    var e12 = ema(p, 2 / 13), e26 = ema(p, 2 / 27);
    var signal = ema(e12.map(function (v, i) { return v - e26[i]; }), 2 / 10);
    var vol = rr.map(function (_, i) {
      var lo = Math.max(1, i - 19), s = 0, m = 0, k;
      for (k = lo; k <= i; k++) m += rr[k];
      m /= (i - lo + 1);
      for (k = lo; k <= i; k++) s += (rr[k] - m) * (rr[k] - m);
      return Math.sqrt(s / Math.max(1, i - lo)) * Math.sqrt(252);
    });
    var vr = rng(100 + a);
    var raw = rr.map(function (x) { return Math.exp(0.3 * gauss(vr) + 9 * Math.abs(x)); });
    var vlm = raw.map(function (v, i) { var lo = Math.max(0, i - 19), m = 0; for (var k = lo; k <= i; k++) m += raw[k]; return v / (m / (i - lo + 1)); });
    return [rr, rsi, signal, vol, vlm].map(function (xs) {
      var tail = xs.slice(26), m = sum(tail) / tail.length;
      var sd = Math.sqrt(sum(tail.map(function (x) { return (x - m) * (x - m); })) / tail.length) || 1;
      return xs.map(function (x, i) { return i < 26 ? 0 : clamp((x - m) / sd, -2.5, 2.5); });
    });
  });

  // the optimization: projected gradient ascent on the Sharpe ratio
  function stats(w) {
    var Sw = matvec(SH, w), v = dot(w, Sw), sd = Math.sqrt(v), m = dot(w, MU);
    return { Sw: Sw, v: v, sd: sd, m: m, sr: (m - RF) / sd };
  }
  function project(v) { // Euclidean projection onto { w >= 0, sum w = 1 }
    var u = v.slice().sort(function (a, b) { return b - a; }), cs = 0, th = 0;
    for (var i = 0; i < u.length; i++) {
      cs += u[i];
      var t = (cs - 1) / (i + 1);
      if (u[i] - t > 0) th = t;
    }
    return v.map(function (x) { return Math.max(0, x - th); });
  }
  var W0 = [0.25, 0.25, 0.25, 0.25];
  var PATH = [W0];
  (function () {
    var w = W0;
    for (var k = 0; k < 70; k++) {
      var st = stats(w);
      var g = MU.map(function (m, i) { return (m - RF) / st.sd - (st.m - RF) * st.Sw[i] / (st.v * st.sd); });
      var gn = Math.sqrt(dot(g, g)) || 1;
      w = project(w.map(function (x, i) { return x + 0.045 * Math.pow(0.95, k) * g[i] / gn; }));
      PATH.push(w);
    }
  })();
  var WSTAR = PATH[PATH.length - 1];
  var ST0 = stats(W0), STAR = stats(WSTAR);
  var CLOUD = [];
  (function () {
    var cr = rng(5);
    for (var k = 0; k < 1400; k++) {
      var pw = 1 + cr() * 4, w = [0, 0, 0, 0].map(function () { return Math.pow(cr(), pw); }), s = sum(w);
      w = w.map(function (x) { return x / s; });
      var st = stats(w);
      CLOUD.push([st.sd, st.m]);
    }
  })();

  /* ---------- Shared layouts, so consecutive beats line up ---------- */
  function tensorBox(w, h) {
    var off = Math.min(16, w * 0.025), x0 = Math.min(84, w * 0.17);
    var top = 40 + 3 * off, gw = w - x0 - 3 * off - 14, gh = Math.min(h * 0.5, 5 * 34);
    return { x0: x0, y0: top, gw: gw, gh: gh, cw: gw / WIN, ch: gh / 5, off: off };
  }
  function sigmaBox(w, h) {
    // wide enough for the product layout: matrix, w, '=', result (8 cells plus a margin)
    var x = Math.max(40, w * 0.08), cs = Math.min(56, (w - x - 12) / 8, (h - 120) / 5.2);
    return { cs: cs, x: x, y: Math.max(60, (h - 4 * cs) / 2 - 10) };
  }
  function muBox(w, h) {
    var sb = sigmaBox(w, h), cs = sb.cs;
    return { cs: cs, x: w - cs - 14, y: sb.y };
  }

  /* ---------- Beats ---------- */
  var BEATS = [];

  // 1.1 raw prices
  BEATS.push(function (c, w, h, p) {
    var top = 30, rowH = (h - 50) / 4, n = Math.max(2, Math.ceil(ease(p * 1.2) * DAYS));
    NAMES.forEach(function (nm, a) {
      var mid = top + (a + 0.5) * rowH, lo = Math.min.apply(null, PRICE[a]), hi = Math.max.apply(null, PRICE[a]);
      text(c, nm, 0, mid + 4, { size: 11 });
      ga(c, 0.9);
      c.strokeStyle = a === 0 ? FOAM : MIST;
      c.lineWidth = 1.4;
      c.beginPath();
      for (var t = 0; t < n; t++) {
        var x = 40 + t / (DAYS - 1) * (w - 50), y = mid - ((PRICE[a][t] - lo) / (hi - lo) - 0.5) * rowH * 0.7;
        if (t) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.stroke();
    });
  });
  function priceY(w, h, a, t) {
    var top = 30, rowH = (h - 50) / 4, mid = top + (a + 0.5) * rowH;
    var lo = Math.min.apply(null, PRICE[a]), hi = Math.max.apply(null, PRICE[a]);
    return mid - ((PRICE[a][t] - lo) / (hi - lo) - 0.5) * rowH * 0.7;
  }
  function dayX(w, t) { return 40 + t / (DAYS - 1) * (w - 50); }

  // 1.2 the EQ price line splits into five feature tracks
  function tracks(c, w, h, e, alpha) {
    var top = 34, area = h - 60, tH = area / 5;
    for (var k = 0; k < 5; k++) {
      var mid = top + (k + 0.5) * tH;
      ga(c, alpha * (0.6 + 0.4 * e));
      c.strokeStyle = e > 0.5 ? (k === 0 ? ACC : MIST) : FOAM;
      c.lineWidth = 1.3;
      c.beginPath();
      for (var t = 0; t < DAYS; t++) {
        var y = lerp(priceY(w, h, 0, t), mid - FEAT[0][k][t] * tH * 0.17, e), x = dayX(w, t);
        if (t) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.stroke();
      text(c, FEATS[k], 40, mid - tH * 0.36, { size: 10, alpha: alpha * ease(seg(e, 0.6, 1)) });
    }
  }
  BEATS.push(function (c, w, h, p) {
    var e = ease(seg(p, 0, 0.75));
    for (var a = 1; a < N; a++) {
      ga(c, (1 - e) * 0.9);
      c.strokeStyle = MIST;
      c.lineWidth = 1.4;
      c.beginPath();
      for (var t = 0; t < DAYS; t++) { var x = dayX(w, t), y = priceY(w, h, a, t); if (t) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
      text(c, NAMES[a], 0, 30 + (a + 0.5) * (h - 50) / 4 + 4, { size: 11, alpha: 1 - e });
    }
    text(c, 'EQ', 0, lerp(30 + 0.5 * (h - 50) / 4 + 4, 22, e), { size: 11, color: FOAM });
    tracks(c, w, h, e, 1);
  });

  // 1.3 the tracks condense into a heatmap, and the other assets stack behind it
  function grid(c, B, a, alpha, morph, w, h) {
    // morph 0..1 from the line positions of beat 1.2 into the grid
    var dx = (3 - a) * 0, layer = a, ox = B.x0 + layer * B.off, oy = B.y0 - layer * B.off;
    var top = 34, tH = (h - 60) / 5;
    for (var k = 0; k < 5; k++) {
      for (var t = 0; t < WIN; t++) {
        var day = DAYS - WIN + t, v = FEAT[a][k][day];
        var gx = ox + t * B.cw, gy = oy + k * B.ch;
        var x = lerp(dayX(w, day), gx, morph), y = lerp(top + (k + 0.5) * tH - v * tH * 0.17 - 2, gy, morph);
        var cw = lerp(2, B.cw, morph), ch = lerp(4, B.ch, morph);
        ga(c, alpha);
        c.fillStyle = cellFill(v, 2.2, 1);
        c.fillRect(x + 0.5, y + 0.5, Math.max(1, cw - 1), Math.max(1, ch - 1));
      }
    }
    return { ox: ox, oy: oy };
  }
  BEATS.push(function (c, w, h, p) {
    var B = tensorBox(w, h), e1 = ease(seg(p, 0, 0.45)), e2 = ease(seg(p, 0.45, 0.95));
    if (e1 < 1) tracks(c, w, h, 1, 1 - e1);
    for (var a = N - 1; a >= 1; a--) {
      if (e2 > 0) {
        ga(c, e2);
        c.fillStyle = DEEP;
        var o = grid(c, B, a, 0.85 * e2, 1, w, h);
        text(c, NAMES[a], o.ox + B.gw + 4, o.oy + 10, { size: 9, alpha: e2 });
      }
    }
    // the front grid sits on an opaque backing so the stack reads as layers
    ga(c, e2);
    c.fillStyle = DEEP;
    c.fillRect(B.x0, B.y0, B.gw, B.gh);
    grid(c, B, 0, 1, e1, w, h);
    for (var k = 0; k < 5; k++) text(c, FSHORT[k], B.x0 - 8, B.y0 + (k + 0.5) * B.ch + 4, { size: 10, align: 'right', alpha: e1 });
    text(c, 'EQ', B.x0 + B.gw + 4, B.y0 + 10, { size: 9, color: FOAM, alpha: e1 });
    text(c, '← 60 days →', B.x0 + B.gw / 2, B.y0 + B.gh + 18, { size: 10, align: 'center', alpha: e1 });
    if (e2 > 0) {
      arrow(c, B.x0 + B.gw + 22, B.y0 + B.gh - 6, B.x0 + B.gw + 22 + 3 * B.off, B.y0 + B.gh - 6 - 3 * B.off, MIST, e2);
      text(c, 'assets', B.x0 + B.gw + 26 + 3 * B.off, B.y0 + B.gh - 10 - 3 * B.off, { size: 10, alpha: e2 });
      text(c, 'assets × features × time', B.x0, B.y0 + B.gh + 40, { size: 12, color: FOAM, alpha: e2, weight: 500 });
    }
  });

  /* ---------- Forecasting: inside the Temporal Fusion Transformer ----------
     The weights below are random stand-ins for trained parameters (the real
     model uses 32 to 64 dimensions; this one uses 4 so every number fits on
     screen). Every operation applied to them is computed exactly. */
  var D = 4;
  function randM(r, n, seed, sc) {
    var g = rng(seed), M = [];
    for (var i = 0; i < r; i++) { var row = []; for (var j = 0; j < n; j++) row.push(gauss(g) * sc); M.push(row); }
    return M;
  }
  function elu(x) { return x > 0 ? x : Math.exp(x) - 1; }
  function sigm(x) { return 1 / (1 + Math.exp(-x)); }
  function mean(a) { return sum(a) / a.length; }
  function std(a) { var m = mean(a); return Math.sqrt(sum(a.map(function (v) { return (v - m) * (v - m); })) / a.length + 1e-6); }

  // today's five features, each embedded as a D-dimensional vector
  var XT = FEAT[0].map(function (f) { return f[DAYS - 1]; });
  var EMB_W = randM(5, D, 401, 0.8), EMB_B = randM(5, D, 402, 0.25);
  var EMB = XT.map(function (x, k) { return EMB_W[k].map(function (wv, j) { return x * wv + EMB_B[k][j]; }); });
  var CTX = randM(1, D, 403, 0.7)[0];   // static context: the asset's own embedding

  function grnParams(seed) {
    return { W23: randM(D, 2 * D, seed, 0.5), b2: randM(1, D, seed + 1, 0.15)[0], W1: randM(2 * D, D, seed + 2, 1.3), b1: randM(1, 2 * D, seed + 3, 0.3)[0] };
  }
  function grn(a, P) {
    var ac = a.concat(CTX);
    var prod2 = matvec(P.W23, ac), z = prod2.map(function (v, i) { return v + P.b2[i]; });
    var e2 = z.map(elu);
    var prod1 = matvec(P.W1, e2), e1 = prod1.map(function (v, i) { return v + P.b1[i]; });
    var g1 = e1.slice(0, D), g2 = e1.slice(D), gate = g2.map(sigm);
    var glu = g1.map(function (v, i) { return v * gate[i]; });
    var s = a.map(function (v, i) { return v + glu[i]; }), m = mean(s), sd = std(s);
    return { a: a, ac: ac, prod2: prod2, z: z, e2: e2, prod1: prod1, e1: e1, g1: g1, g2: g2, gate: gate, glu: glu, s: s, m: m, sd: sd,
      out: s.map(function (v) { return (v - m) / sd; }) };
  }
  var GP = [0, 1, 2, 3, 4].map(function (k) { return grnParams(500 + 10 * k); });
  var G0 = grn(EMB[0], GP[0]);
  var GOUT = EMB.map(function (e, k) { return grn(e, GP[k]).out; });

  // variable selection: softmax over the features, then a weighted sum
  var LOGIT = [1.1, 0.2, 0.5, 0.9, -0.3];
  var EXPL = LOGIT.map(Math.exp), VSN = EXPL.map(function (v) { return v / sum(EXPL); });
  var XIV = [0, 1, 2, 3].map(function (j) { return sum(VSN.map(function (v, k) { return v * GOUT[k][j]; })); });

  // a one-unit LSTM run over the 60-day window of selected inputs
  var LSEQ = [], LH = [], LC = [], LGATE = [];
  (function () {
    var h0 = 0, c0 = 0;
    for (var t = 0; t < WIN; t++) {
      var day = DAYS - WIN + t, x = sum(VSN.map(function (v, k) { return v * FEAT[0][k][day]; }));
      var f = sigm(0.8 * x + 0.5 * h0 + 0.6), i = sigm(0.9 * x + 0.4 * h0 - 0.1);
      var g = Math.tanh(1.1 * x + 0.6 * h0), o = sigm(0.7 * x + 0.3 * h0 + 0.2);
      c0 = f * c0 + i * g;
      h0 = o * Math.tanh(c0);
      LSEQ.push(x); LH.push(h0); LC.push(c0); LGATE.push([f, i, o]);
    }
  })();

  // attention of each forecast day over the window (illustrative pattern);
  // the scores are its logarithm, so softmax of the scores recovers it exactly
  var ATT = [0, 1, 2, 3, 4].map(function (hh) {
    var ar = rng(300 + hh), row = [];
    for (var k = 0; k < WIN; k++) {
      var back = WIN - 1 - k;
      row.push(Math.exp(-back / (9 + 2 * hh)) + 0.45 * Math.exp(-Math.pow(back - 21, 2) / 18) + 0.12 * ar());
    }
    var s = sum(row);
    return row.map(function (v) { return v / s; });
  });
  var SCORE = ATT.map(function (row) { var l = row.map(Math.log), m = mean(l); return l.map(function (v) { return v - m; }); });

  // daily median forecasts, which sum to the 5-day expected return
  var SPLIT = [0.24, 0.22, 0.20, 0.18, 0.16];
  var Q50 = MU.map(function (m) { return SPLIT.map(function (s) { return m * 5 / 252 * s; }); });
  var QSD = VOLS.map(function (v) { return 1.2816 * v / Math.sqrt(252); });

  /* ---------- Drawing helpers for this chapter ---------- */
  function vec(c, x, y, cs, vals, o) {
    o = o || {};
    var al = o.alpha == null ? 1 : o.alpha;
    vals.forEach(function (v, k) {
      cell(c, x, y + k * cs, cs, cs, v, { scale: o.scale || 1.5, alpha: al * (o.cellAlpha ? o.cellAlpha(k) : 1),
        fmt: o.fmt || function (u) { return num(u, 2, cs); }, stroke: o.stroke ? o.stroke(k) : null, label: cs > 22 });
    });
    brackets(c, x, y, cs, vals.length * cs, al);
    if (o.label) text(c, o.label, x + cs / 2, y - 9, { size: 12, color: o.labelColor || FOAM, align: 'center', weight: 500, alpha: al });
  }
  // M times v, one row at a time: v turns to lie along the row, the pairs
  // multiply, and the products slide into that row's entry of the result
  function matvecAnim(c, o) {
    var M = o.M, v = o.v, r = M.length, n = v.length, cs = o.cs, al = o.alpha == null ? 1 : o.alpha;
    var out = matvec(M, v), slot = 1 / r;
    var row = o.q >= 1 ? r : Math.min(r - 1, Math.floor(o.q * r)), q = row < r ? clamp((o.q - row * slot) / slot, 0, 1) : 1;
    var rot = ease(seg(q, 0, 0.35)), mul = ease(seg(q, 0.35, 0.55)), mrg = ease(seg(q, 0.6, 0.9));
    for (var i = 0; i < r; i++) {
      for (var j = 0; j < n; j++) {
        var act = i === row;
        cell(c, o.mx + j * cs, o.my + i * cs, cs, cs, M[i][j], { scale: o.mScale || 1, alpha: al * (act ? 1 - 0.85 * mrg : 1),
          textAlpha: act ? 1 - mul : 1, stroke: act ? 'rgba(' + G + ',0.7)' : null, label: cs > 30 });
      }
    }
    brackets(c, o.mx, o.my, n * cs, r * cs, al);
    if (o.mLabel) text(c, o.mLabel, o.mx + n * cs / 2, o.my - 9, { size: 12, color: FOAM, align: 'center', weight: 500, alpha: al });
    if (row < r) {
      for (j = 0; j < n; j++) {
        var x = lerp(o.mx + j * cs, o.rx, mrg), y = lerp(o.my + row * cs, o.ry + row * cs, mrg);
        cell(c, x, y, cs, cs, M[row][j] * v[j], { scale: o.pScale || 0.6, alpha: al * mul * (1 - mrg), stroke: ACC, lw: 1.1, label: cs > 30 });
      }
    }
    vec(c, o.vx, o.vy, cs, v, { scale: o.vScale || 1.5, alpha: al, label: o.vLabel });
    if (row < r && rot > 0 && mul < 1) {
      var phi = rot * Math.PI / 2, dx = Math.sin(phi), dy = Math.cos(phi);
      var ax = lerp(o.vx, o.mx, rot), ay = lerp(o.vy, o.my + row * cs, rot);
      ga(c, al * (1 - mul));
      c.strokeStyle = ACC;
      c.lineWidth = 1.5;
      for (var k = 0; k < n; k++) c.strokeRect(ax + k * cs * dx + 3, ay + k * cs * dy + 3, cs - 6, cs - 6);
    }
    if (!o.hideResult) {
      for (i = 0; i < r; i++) {
        var done = i < row ? 1 : i === row ? ease(seg(q, 0.82, 1)) : 0;
        if (done) cell(c, o.rx, o.ry + i * cs, cs, cs, out[i], { scale: o.rScale || 1.5, alpha: al * done, label: cs > 22 });
      }
      brackets(c, o.rx, o.ry, cs, r * cs, al);
      if (o.rLabel) text(c, o.rLabel, o.rx + cs / 2, o.ry - 9, { size: 12, color: FOAM, align: 'center', weight: 500, alpha: al });
    }
    return out;
  }
  // a small plot of an activation, for values to be carried through it
  function curvePanel(c, x, y, wd, ht, f, xr, yr, label, al) {
    var X = function (v) { return x + (v - xr[0]) / (xr[1] - xr[0]) * wd; };
    var Y = function (v) { return y + ht - (v - yr[0]) / (yr[1] - yr[0]) * ht; };
    ga(c, al * 0.5);
    c.strokeStyle = 'rgba(143,177,189,0.5)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, Y(0)); c.lineTo(x + wd, Y(0));
    c.moveTo(X(0), y); c.lineTo(X(0), y + ht);
    c.stroke();
    ga(c, al);
    c.strokeStyle = FOAM;
    c.lineWidth = 1.6;
    c.beginPath();
    for (var k = 0; k <= 80; k++) {
      var v = xr[0] + k / 80 * (xr[1] - xr[0]), yy = clamp(f(v), yr[0], yr[1]);
      if (k) c.lineTo(X(v), Y(yy)); else c.moveTo(X(v), Y(yy));
    }
    c.stroke();
    text(c, label, x + 4, y + 12, { size: 11, color: FOAM, alpha: al, weight: 500 });
    return { X: X, Y: Y };
  }
  // values dropping onto an axis, rising to a curve, then flying into a vector
  function carry(c, vals, f, P, from, to, cs, t, al) {
    var drop = ease(seg(t, 0, 0.35)), rise = ease(seg(t, 0.38, 0.7)), fly = ease(seg(t, 0.74, 1));
    if (fly >= 1) return; // delivered: the vector shows the values now
    vals.forEach(function (v, i) {
      var sx = from.x + cs / 2, sy = from.y + i * cs + cs / 2;
      var ax = P.X(v), ay = P.Y(0), cy = P.Y(f(v));
      var x = lerp(sx, ax, drop), y = lerp(sy, ay, drop);
      y = lerp(y, cy, rise);
      x = lerp(x, to.x + cs / 2, fly); y = lerp(y, to.y + i * cs + cs / 2, fly);
      if (rise > 0 && fly < 1) {
        ga(c, al * 0.45 * (1 - fly));
        c.setLineDash([2, 3]);
        c.strokeStyle = ACC;
        c.lineWidth = 1;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax, cy); c.stroke();
        c.setLineDash([]);
      }
      ga(c, al);
      c.fillStyle = FOAM;
      c.beginPath(); c.arc(x, y, 4.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = ACC;
      c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill();
    });
  }

  // 2.1 embed: today's column lifts out and each value becomes a vector
  function embedLayout(w, h) {
    var cs = Math.min(40, (h - 100) / 6.2, (w - 120) / 6.5);
    return { cs: cs, x: Math.max(70, w * 0.18), y: (h - 5 * cs) / 2 };
  }
  var embedBeat = function (c, w, h, p) {
    var B = tensorBox(w, h), E = embedLayout(w, h), cs = E.cs;
    var a = ease(seg(p, 0, 0.35)), e = ease(seg(p, 0.42, 0.9));
    if (a < 1) faded(1 - a, function () { BEATS[2](c, w, h, 1); });
    for (var k = 0; k < 5; k++) {
      var sx = B.x0 + (WIN - 1) * B.cw, sy = B.y0 + k * B.ch;
      var x0 = lerp(sx, E.x, a), y0 = lerp(sy, E.y + k * cs, a), cw0 = lerp(B.cw, cs, a), ch0 = lerp(B.ch, cs, a);
      if (e <= 0) cell(c, x0, y0, cw0, ch0, XT[k], { scale: 2.2, label: a > 0.6 });
      else for (var j = D - 1; j >= 0; j--) cell(c, E.x + j * cs * e, y0, cs, cs, lerp(XT[k], EMB[k][j], e), { scale: lerp(2.2, 1.5, e), alpha: j === 0 ? 1 : e, label: e > 0.97 || j === 0 });
      text(c, FSHORT[k], E.x - 8, E.y + k * cs + cs / 2, { size: 10, align: 'right', base: 'middle', alpha: a });
    }
    text(c, e > 0.5 ? 'embeddings e⁽ᵏ⁾' : 'xₜ', E.x + (e > 0.5 ? 2 * cs : cs / 2), E.y - 10, { size: 12, color: FOAM, align: 'center', weight: 500, alpha: a });
    text(c, 'e⁽ᵏ⁾ = x⁽ᵏ⁾ w⁽ᵏ⁾ + b⁽ᵏ⁾', E.x, E.y + 5 * cs + 26, { size: 12, color: ACC, alpha: e });
  };

  // 2.2 GRN, part one: [W2 W3][a; c] + b2, then ELU
  function denseLayout(w, h) {
    var cs = Math.min(32, (w - 56) / 12.2, (h - 168) / 8);
    var mx = 48, my = 2 * cs + 40, vx = mx + 8 * cs + 0.9 * cs, rx = vx + 2.2 * cs;
    var py = my + 6 * cs + 26;
    return { cs: cs, mx: mx, my: my, vx: vx, vy: my - 2 * cs, rx: rx, ry: my, px: mx, py: py, pw: rx - mx - 1.2 * cs, ph: h - py - 22 };
  }
  var grnDenseBeat = function (c, w, h, p) {
    var L = denseLayout(w, h), cs = L.cs, E = embedLayout(w, h);
    var s0 = ease(seg(p, 0, 0.14)), mq = seg(p, 0.15, 0.55), bq = ease(seg(p, 0.56, 0.64)), eq = seg(p, 0.65, 0.97);
    if (s0 < 1) {
      // the first embedding turns from a row into the top of the input column
      faded(1 - s0, function () {
        for (var k = 1; k < 5; k++) for (var j = 0; j < D; j++) cell(c, E.x + j * E.cs, E.y + k * E.cs, E.cs, E.cs, EMB[k][j], { scale: 1.5 });
      });
      var phi = s0 * Math.PI / 2, ccs = lerp(E.cs, cs, s0);
      var ax = lerp(E.x, L.vx, s0), ay = lerp(E.y, L.vy, s0);
      for (var j2 = 0; j2 < D; j2++) cell(c, ax + j2 * ccs * Math.cos(phi), ay + j2 * ccs * Math.sin(phi), ccs, ccs, G0.a[j2], { scale: 1.5 });
      for (j2 = 0; j2 < D; j2++) cell(c, L.vx, L.vy + (D + j2) * cs, cs, cs, CTX[j2], { scale: 1.5, alpha: s0 });
      return;
    }
    matvecAnim(c, { M: GP[0].W23, v: G0.ac, cs: cs, mx: L.mx, my: L.my, vx: L.vx, vy: L.vy, rx: L.rx, ry: L.ry, q: mq,
      mLabel: '[W₂ W₃]', vLabel: '[a; c]', hideResult: true, mScale: 1.2 });
    text(c, 'a', L.vx + cs + 8, L.vy + 2 * cs, { size: 11, base: 'middle' });
    text(c, 'c', L.vx + cs + 8, L.vy + 6 * cs, { size: 11, base: 'middle' });
    // the result column, with the bias added once the product is done
    var shown = mq >= 1 ? 4 : Math.floor(mq * 4);
    var zv = G0.prod2.map(function (v, i) { return lerp(v, G0.z[i], bq); });
    vec(c, L.rx, L.ry, cs, zv, { cellAlpha: function (i) { return i < shown || mq >= 1 ? 1 : 0; }, label: bq > 0.5 ? 'z' : '', scale: 1.5 });
    if (bq > 0 && bq < 1) text(c, '+ b₂', L.rx + cs / 2, L.ry + 4 * cs + 16, { size: 11, color: ACC, align: 'center', alpha: Math.sin(bq * Math.PI) });
    if (eq > 0) {
      var P = curvePanel(c, L.px, L.py, L.pw, L.ph, elu, [-2.5, 2.5], [-1.2, 2.5], 'ELU', ease(seg(eq, 0, 0.2)));
      var to = { x: L.rx, y: L.py + (L.ph - 4 * cs) / 2 };
      carry(c, G0.z, elu, P, { x: L.rx, y: L.ry }, to, cs, seg(eq, 0.1, 1), 1);
      var fin = ease(seg(eq, 0.9, 1));
      if (fin > 0) vec(c, to.x, to.y, cs, G0.e2, { alpha: fin, label: 'η₂' });
    }
  };

  // 2.3 GRN, part two: W1 eta2 + b1, split into two halves, gate one with the other
  function gluLayout(w, h) {
    var cs = Math.min(30, (h - 80) / 9, (w - 60) / 9);
    var mx = 40, my = (h - 8 * cs) / 2;
    var vx = mx + 4 * cs + 0.9 * cs, rx = vx + 2.2 * cs;
    var gy = (h - 4 * cs) / 2, x1 = 30, x2 = 30 + 1.7 * cs;
    var px = x2 + 2.4 * cs, gx = w - 3 * cs, ox = w - 1.5 * cs;
    return { cs: cs, mx: mx, my: my, vx: vx, vy: my + 2 * cs, rx: rx, ry: my, gy: gy, x1: x1, x2: x2, px: px, pw: gx - px - 0.8 * cs, gx: gx, ox: ox };
  }
  var gluBeat = function (c, w, h, p) {
    var L = gluLayout(w, h), cs = L.cs;
    var mq = seg(p, 0, 0.4), bq = ease(seg(p, 0.41, 0.47)), sp = ease(seg(p, 0.5, 0.62)), sq = seg(p, 0.62, 0.84), mu = ease(seg(p, 0.86, 1));
    if (sp < 1) {
      faded(1 - sp, function () {
        matvecAnim(c, { M: GP[0].W1, v: G0.e2, cs: cs, mx: L.mx, my: L.my, vx: L.vx, vy: L.vy, rx: L.rx, ry: L.ry, q: mq,
          mLabel: 'W₁', vLabel: 'η₂', hideResult: true, mScale: 1.2 });
      });
    }
    // eta1 = W1 eta2 + b1, then its two halves slide apart
    var shown = mq >= 1 ? 8 : Math.floor(mq * 8);
    for (var i = 0; i < 2 * D; i++) {
      if (i >= shown && mq < 1) continue;
      var v = lerp(G0.prod1[i], G0.e1[i], bq), top = i < D;
      var tx = top ? L.x1 : L.x2, ty = L.gy + (i % D) * cs;
      if (!top && sq > 0) continue; // the gate half is carried through the sigmoid below
      if (top && mu > 0) continue;  // the value half is multiplied below
      cell(c, lerp(L.rx, tx, sp), lerp(L.ry + i * cs, ty, sp), cs, cs, v, { scale: 1.5, label: cs > 22 });
    }
    if (sp < 0.5 && bq > 0) text(c, 'η₁', L.rx + cs / 2, L.ry - 9, { size: 12, color: FOAM, align: 'center', weight: 500, alpha: 1 - 2 * sp });
    if (sp > 0.5) {
      text(c, 'γ₁', L.x1 + cs / 2, L.gy - 9, { size: 12, color: FOAM, align: 'center', weight: 500, alpha: mu > 0 ? 1 - mu : 1 });
      text(c, 'γ₂', L.x2 + cs / 2, L.gy - 9, { size: 12, color: FOAM, align: 'center', weight: 500 });
      brackets(c, L.x1, L.gy, cs, 4 * cs, 1 - mu);
      brackets(c, L.x2, L.gy, cs, 4 * cs, sq > 0 ? 1 - ease(seg(sq, 0, 0.3)) : 1);
    }
    if (sq > 0) {
      var P = curvePanel(c, L.px, L.gy - cs * 0.6, L.pw, 5.2 * cs, sigm, [-4, 4], [-0.15, 1.15], 'σ (sigmoid)', ease(seg(sq, 0, 0.2)));
      carry(c, G0.g2, sigm, P, { x: L.x2, y: L.gy }, { x: L.gx, y: L.gy }, cs, seg(sq, 0.1, 1), 1);
      var gIn = ease(seg(sq, 0.9, 1));
      if (gIn > 0) vec(c, L.gx, L.gy, cs, G0.gate, { alpha: gIn, label: 'gate', scale: 1, fmt: function (u) { return num(u, 2, cs); } });
    }
    if (mu > 0) {
      for (i = 0; i < D; i++) {
        var x = lerp(L.x1, L.ox, mu);
        cell(c, x, L.gy + i * cs, cs, cs, lerp(G0.g1[i], G0.glu[i], ease(seg(mu, 0.5, 1))), { scale: 1.5 });
      }
      if (mu > 0.6) {
        brackets(c, L.ox, L.gy, cs, 4 * cs, ease(seg(mu, 0.6, 1)));
        text(c, 'GLU', L.ox + cs / 2, L.gy - 9, { size: 12, color: ACC, align: 'center', weight: 500, alpha: ease(seg(mu, 0.6, 1)) });
      }
      text(c, '⊙', (L.gx + cs + L.ox) / 2, L.gy + 2 * cs + 5, { size: 16, color: FOAM, align: 'center', alpha: 1 - Math.abs(mu - 0.5) * 2 });
    }
  };

  // 2.4 GRN, part three: add the input back, then normalize
  function lnLayout(w, h) {
    var cs = Math.min(36, (h - 120) / 6, w / 10);
    return { cs: cs, ax: 24, gx: 24 + 2 * cs, y: (h - 4 * cs) / 2, lx0: 24 + 4 * cs, lx1: w - 2.6 * cs, ly: h / 2 + 6, ox: w - 1.4 * cs };
  }
  var lnBeat = function (c, w, h, p) {
    var L = lnLayout(w, h), cs = L.cs;
    var add = ease(seg(p, 0, 0.26)), dots = ease(seg(p, 0.3, 0.42)), ctr = ease(seg(p, 0.45, 0.64)), scl = ease(seg(p, 0.67, 0.85)), out = ease(seg(p, 0.88, 1));
    // a slides onto GLU(eta1) and the two add
    var aX = lerp(L.ax, L.gx, add);
    if (add < 1) vec(c, aX, L.y, cs, G0.a, { alpha: 1 - add * 0.9, label: 'a' });
    var sv = G0.glu.map(function (v, i) { return lerp(v, G0.s[i], add); });
    if (dots < 1) vec(c, L.gx, L.y, cs, sv, { alpha: 1 - dots, label: add > 0.5 ? 'a + GLU' : 'GLU' });
    if (dots > 0) {
      var range = 3.2, X = function (v) { return L.lx0 + (v + range) / (2 * range) * (L.lx1 - L.lx0); };
      ga(c, dots);
      c.strokeStyle = 'rgba(143,177,189,0.5)';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(L.lx0, L.ly); c.lineTo(L.lx1, L.ly); c.stroke();
      for (var t = -3; t <= 3; t++) {
        c.beginPath(); c.moveTo(X(t), L.ly - 4); c.lineTo(X(t), L.ly + 4); c.stroke();
        text(c, String(t), X(t), L.ly + 18, { size: 10, align: 'center', alpha: dots });
      }
      var div = lerp(1, G0.sd, scl);
      var cur = G0.s.map(function (v) { return (v - G0.m * ctr) / div; });
      var mNow = G0.m * (1 - ctr), sdNow = G0.sd / div;
      // the mean, and a bracket one standard deviation either side
      ga(c, dots * (1 - out));
      c.strokeStyle = ACC;
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(X(mNow), L.ly - 26); c.lineTo(X(mNow), L.ly + 4); c.stroke();
      c.setLineDash([3, 3]);
      c.beginPath(); c.moveTo(X(mNow - sdNow), L.ly - 14); c.lineTo(X(mNow + sdNow), L.ly - 14); c.stroke();
      c.setLineDash([]);
      text(c, 'mean ' + mNow.toFixed(2) + ',  std ' + sdNow.toFixed(2), (L.lx0 + L.lx1) / 2, L.ly - 40, { size: 12, color: ACC, align: 'center', weight: 500, alpha: dots * (1 - out) });
      cur.forEach(function (v, i) {
        var x = lerp(X(v), L.ox + cs / 2, out), y = lerp(L.ly, L.y + i * cs + cs / 2, out);
        var sx = lerp(L.gx + cs / 2, x, dots), sy = lerp(L.y + i * cs + cs / 2, y, dots);
        ga(c, 1);
        c.fillStyle = FOAM;
        c.beginPath(); c.arc(sx, sy, 5, 0, Math.PI * 2); c.fill();
        c.fillStyle = ACC;
        c.beginPath(); c.arc(sx, sy, 3.3, 0, Math.PI * 2); c.fill();
      });
      text(c, ctr < 0.5 ? 'subtract the mean' : scl < 0.5 ? 'divide by the std' : 'LayerNorm', (L.lx0 + L.lx1) / 2, L.ly + 44, { size: 11, align: 'center', alpha: dots * (1 - out) });
    }
    if (out > 0.8) vec(c, L.ox, L.y, cs, G0.out, { alpha: ease(seg(out, 0.8, 1)), label: 'GRN(a, c)', labelColor: ACC });
  };

  // 2.5 variable selection: softmax over the features, then a weighted sum
  function selLayout(w, h) {
    var cs = Math.min(36, (h - 150) / 7, (w - 80) / 11);
    var mx = 58, my = 46, bx = mx + 4 * cs + 34;
    return { cs: cs, mx: mx, my: my, bx: bx, bw: w - bx - 56, zero: bx + (w - bx - 56) * 0.22, sy: my + 5 * cs + 34, xy: my + 5 * cs + 70 };
  }
  var selBeat = function (c, w, h, p) {
    var L = selLayout(w, h), cs = L.cs;
    var mIn = ease(seg(p, 0, 0.12)), lg = ease(seg(p, 0.12, 0.24)), ex = ease(seg(p, 0.26, 0.42)), nm = ease(seg(p, 0.44, 0.58));
    var st = ease(seg(p, 0.6, 0.7)), wt = ease(seg(p, 0.72, 0.84)), mg = ease(seg(p, 0.86, 1));
    var scaleL = (L.bw - (L.zero - L.bx)) / 1.4, expK = (L.bw - (L.zero - L.bx)) / Math.max.apply(null, EXPL);
    // per-feature GRN outputs, weighted and merged into one context vector
    for (var k = 0; k < 5; k++) {
      for (var j = 0; j < D; j++) {
        var v = lerp(GOUT[k][j], VSN[k] * GOUT[k][j], wt);
        var y = lerp(L.my + k * cs, L.xy, mg);
        cell(c, L.mx + j * cs, y, cs, cs, v, { scale: lerp(2, 0.9, wt), alpha: mIn * (mg > 0 ? 1 - 0.85 * mg : 1), label: mg < 0.1 && cs > 22 });
      }
      text(c, FSHORT[k], L.mx - 8, L.my + k * cs + cs / 2, { size: 10, align: 'right', base: 'middle', alpha: mIn * (1 - mg) });
      // the selection weights: logits, then exponentials, then normalized
      var len = lerp(lerp(LOGIT[k] * scaleL, EXPL[k] * expK, ex), VSN[k] * L.bw, nm);
      var x0 = lerp(L.zero, L.bx, Math.max(ex, nm));
      var cum = sum(VSN.slice(0, k)) * L.bw;
      var bx = lerp(len < 0 ? x0 + len : x0, L.bx + cum, st), by = lerp(L.my + k * cs + cs * 0.22, L.sy, st);
      if (lg > 0 && wt < 1) {
        ga(c, lg * (1 - wt));
        c.fillStyle = 'rgba(' + G + ',' + (0.95 - k * 0.14) + ')';
        c.fillRect(bx, by, Math.abs(len) * lg, cs * 0.56);
        if (st < 0.5) text(c, (nm > 0.5 ? VSN[k] : ex > 0.5 ? EXPL[k] : LOGIT[k]).toFixed(2), Math.max(bx, x0) + Math.abs(len) * lg + 6, by + cs * 0.42, { size: 11, color: FOAM, alpha: lg * (1 - 2 * st) });
        else if (VSN[k] * L.bw > 30) text(c, FSHORT[k], bx + 4, by + cs * 0.4, { size: 10, color: DEEP, alpha: (st - 0.5) * 2 * (1 - wt) });
      }
    }
    if (lg > 0 && ex < 1) {
      ga(c, lg * (1 - ex));
      c.strokeStyle = 'rgba(143,177,189,0.5)';
      c.beginPath(); c.moveTo(L.zero, L.my - 4); c.lineTo(L.zero, L.my + 5 * cs); c.stroke();
    }
    var lab = nm > 0.5 ? 'softmax: eᶻ / Σeᶻ' : ex > 0.5 ? 'exponentiate: eᶻ' : 'scores z';
    text(c, lab, L.bx, L.my - 12, { size: 12, color: ACC, weight: 500, alpha: lg * (1 - st) });
    if (st > 0 && wt < 1) text(c, 'weights sum to 1', L.bx, L.sy + cs * 0.56 + 18, { size: 11, color: FOAM, alpha: st * (1 - wt) });
    text(c, L.bx - L.mx > 175 ? 'GRN output per feature' : 'GRN outputs', L.mx, L.my - 12, { size: 12, color: FOAM, weight: 500, alpha: mIn * (1 - mg) });
    if (mg > 0.85) {
      var a2 = ease(seg(mg, 0.85, 1));
      for (j = 0; j < D; j++) cell(c, L.mx + j * cs, L.xy, cs, cs, XIV[j], { scale: 0.9, alpha: a2, stroke: ACC });
      text(c, 'ξₜ = Σₖ vₖ · GRNₖ', L.mx + 4 * cs + 14, L.xy + cs * 0.65, { size: 12, color: FOAM, weight: 500, alpha: a2 });
    }
  };

  // 2.6 the LSTM encoder runs along the window, carrying its state
  function seqLayout(w, h) {
    var x0 = 18, x1 = w * 0.8;
    return { x0: x0, x1: x1, step: (x1 - x0) / (WIN - 1), base: h - 52, hy: h * 0.5, cy: h * 0.24, fx0: x1 + (w - x1) * 0.25, fstep: (w - 16 - (x1 + (w - x1) * 0.25)) / 4 };
  }
  var lstmBeat = function (c, w, h, p) {
    var S = seqLayout(w, h), L = selLayout(w, h);
    var a = ease(seg(p, 0, 0.22)), run = ease(seg(p, 0.25, 0.97)) * (WIN - 1);
    // xi collapses into a token at the newest day; the earlier days appear
    for (var t = 0; t < WIN; t++) {
      var last = t === WIN - 1, dx = S.x0 + t * S.step;
      var appear = last ? 1 : ease(seg(a, 0.3 + (WIN - 1 - t) / WIN * 0.6, 0.45 + (WIN - 1 - t) / WIN * 0.6));
      var px = last ? lerp(L.mx + 2 * L.cs, dx, a) : dx, py = last ? lerp(L.xy + L.cs / 2, S.base, a) : S.base;
      ga(c, appear);
      c.fillStyle = t <= run ? ACC : MIST;
      c.beginPath(); c.arc(px, py, last ? lerp(L.cs * 0.5, 2.6, a) : 2.4, 0, Math.PI * 2); c.fill();
    }
    text(c, 'inputs ξₜ', S.x0, S.base + 22, { size: 10, alpha: a });
    if (run > 0) {
      var amp = Math.min(70, h * 0.16), maxC = Math.max.apply(null, LC.map(Math.abs)) || 1;
      ga(c, 1);
      c.fillStyle = 'rgba(' + G + ',0.75)';
      for (t = 0; t <= Math.floor(run); t++) {
        var bh = LH[t] * amp;
        c.fillRect(S.x0 + t * S.step - S.step * 0.3, S.hy - Math.max(bh, 0), Math.max(1, S.step * 0.6), Math.abs(bh));
      }
      c.strokeStyle = FOAM;
      c.lineWidth = 1.5;
      c.beginPath();
      for (t = 0; t <= Math.floor(run); t++) { var yy = S.cy - LC[t] / maxC * amp * 0.6; if (t) c.lineTo(S.x0 + t * S.step, yy); else c.moveTo(S.x0 + t * S.step, yy); }
      c.stroke();
      text(c, 'hidden state hₜ', S.x0, S.hy + amp * 0.2 + 18, { size: 10, color: ACC });
      text(c, 'cell state cₜ', S.x0, S.cy - amp * 0.6 - 8, { size: 10, color: FOAM });
      // the pulse: where the recurrence is now, with its gates
      var ti = Math.min(WIN - 1, Math.floor(run)), px2 = S.x0 + run * S.step;
      ga(c, 0.35);
      c.strokeStyle = ACC;
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(px2, S.cy - amp * 0.7); c.lineTo(px2, S.base); c.stroke();
      ga(c, 1);
      c.fillStyle = FOAM;
      c.beginPath(); c.arc(px2, S.hy, 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = ACC;
      c.beginPath(); c.arc(px2, S.hy, 4, 0, Math.PI * 2); c.fill();
      var gtx = 'f ' + LGATE[ti][0].toFixed(2) + '  i ' + LGATE[ti][1].toFixed(2) + '  o ' + LGATE[ti][2].toFixed(2);
      text(c, gtx, clamp(px2, 70, w - 70), S.base - 18, { size: 11, color: FOAM, align: 'center', weight: 500 });
    }
  };

  // 2.7 attention: scores from query and keys, softmax, then a weighted sum
  var attnBeat = function (c, w, h, p) {
    var S = seqLayout(w, h);
    var a = ease(seg(p, 0, 0.1)), sc = ease(seg(p, 0.1, 0.3)), sm = ease(seg(p, 0.33, 0.52)), arcs = ease(seg(p, 0.54, 0.68)), b = seg(p, 0.7, 0.98);
    for (var t = 0; t < WIN; t++) {
      ga(c, 1);
      c.fillStyle = MIST;
      c.beginPath(); c.arc(S.x0 + t * S.step, S.base, 2.4, 0, Math.PI * 2); c.fill();
    }
    text(c, 'keys and values: the encoded window', S.x0, S.base + 22, { size: 10 });
    for (var f = 0; f < 5; f++) {
      ga(c, 1);
      c.strokeStyle = ACC;
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(S.fx0 + f * S.fstep, S.base, 4.5, 0, Math.PI * 2); c.stroke();
    }
    text(c, 'queries', S.fx0 - 4, S.base + 22, { size: 10, color: ACC });
    // which forecast day is attending: the first, then each in turn
    var hf = b * 5, row = b > 0 ? Math.min(4, Math.floor(hf)) : 0, fr = hf - row;
    var fxr = S.fx0 + row * S.fstep, peak = Math.max.apply(null, ATT[row]);
    var smax = Math.max.apply(null, SCORE[row].map(Math.abs));
    var top = S.base - 16, barH = Math.min(h * 0.28, 110);
    if (sc > 0 && b === 0) {
      // bars: scores q.k / sqrt(d), then the same bars after softmax
      for (t = 0; t < WIN; t++) {
        var sv = SCORE[row][t] / smax, wv = ATT[row][t] / peak;
        var hgt = lerp(sv * 0.6, wv, sm) * barH * sc;
        ga(c, 0.85);
        c.fillStyle = hgt >= 0 ? ACC : 'rgba(' + BLUE + ',0.9)';
        c.fillRect(S.x0 + t * S.step - S.step * 0.3, (sm > 0.5 ? top : top - barH * 0.6) - Math.max(hgt, 0), Math.max(1, S.step * 0.6), Math.abs(hgt));
      }
      text(c, sm > 0.5 ? 'softmax(scores): weights that sum to 1' : 'scores q · kₜ / √d', S.x0, top - barH - 10, { size: 12, color: ACC, weight: 500, alpha: sc });
    }
    if (arcs > 0) {
      for (t = 0; t < WIN; t++) {
        var wt = ATT[row][t] / peak;
        if (wt < 0.06) continue;
        var dx2 = S.x0 + t * S.step, lift = Math.min(h * 0.32, (fxr - dx2) * 0.45);
        ga(c, wt * 0.8 * arcs * (b > 0 ? Math.min(1, fr * 3 + (row < 4 ? 0 : 1)) : 1) * (b === 0 ? (1 - 0.5 * (1 - sm)) : 1));
        c.strokeStyle = ACC;
        c.lineWidth = 0.6 + wt * 1.8;
        c.beginPath(); c.moveTo(fxr, S.base - 5); c.quadraticCurveTo((fxr + dx2) / 2, S.base - lift, dx2, S.base - 3); c.stroke();
      }
    }
    if (b > 0) {
      var hm = { x: S.x0, y: 30, w: S.x1 - S.x0, h: Math.min(h * 0.28, 110) }, rh = hm.h / 5;
      text(c, 'attention weights', hm.x, hm.y - 8, { size: 10 });
      for (var hh = 0; hh < 5; hh++) {
        var shown = hh < row ? 1 : hh === row ? ease(fr * 1.4) : 0;
        if (!shown) continue;
        var pk = Math.max.apply(null, ATT[hh]);
        for (t = 0; t < WIN; t++) {
          ga(c, shown * (0.08 + 0.85 * ATT[hh][t] / pk));
          c.fillStyle = ACC;
          c.fillRect(hm.x + t * S.step - S.step / 2 + 0.5, hm.y + hh * rh + 0.5, Math.max(1, S.step - 1), rh - 1);
        }
        text(c, 'h' + (hh + 1), hm.x + hm.w + 6, hm.y + hh * rh + rh * 0.7, { size: 9, alpha: shown });
      }
    }
  };

  // 2.8 the quantile head: three outputs per day, trained with the pinball loss
  function pinball(q, u) { return u >= 0 ? q * u : (q - 1) * u; }
  function fanPanel(w, h) {
    var narrow = w < 520;
    return narrow ? { x: 30, y: h * 0.6, w: w - 50, h: h * 0.36 } : { x: w * 0.5, y: 40, w: w * 0.48, h: h - 90 };
  }
  var quantBeat = function (c, w, h, p) {
    var narrow = w < 520, pin = ease(seg(p, 0, 0.42)), fan = seg(p, 0.46, 0.98);
    var PX = narrow ? { x: 30, y: 30, w: w - 50, h: h * 0.32 } : { x: 30, y: 60, w: w * 0.4, h: h * 0.5 };
    var X = function (u) { return PX.x + (u + 1) / 2 * PX.w; }, Y = function (v) { return PX.y + PX.h - v / 0.9 * PX.h; };
    ga(c, 1);
    c.strokeStyle = 'rgba(143,177,189,0.4)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(PX.x, Y(0)); c.lineTo(PX.x + PX.w, Y(0)); c.moveTo(X(0), PX.y); c.lineTo(X(0), PX.y + PX.h); c.stroke();
    text(c, 'pinball loss by quantile q', PX.x, PX.y - 10, { size: 12, color: FOAM, weight: 500 });
    text(c, 'y − ŷ', PX.x + PX.w, Y(0) + 16, { size: 10, align: 'right' });
    [0.1, 0.5, 0.9].forEach(function (q, i) {
      var reach = clamp(pin * 3 - i, 0, 1);
      if (!reach) return;
      ga(c, 1);
      c.strokeStyle = i === 1 ? ACC : i === 0 ? 'rgba(' + BLUE + ',0.95)' : FOAM;
      c.lineWidth = 1.8;
      c.beginPath();
      for (var k = 0; k <= 40 * reach; k++) { var u = -1 + k / 20; if (k) c.lineTo(X(u), Y(pinball(q, u))); else c.moveTo(X(u), Y(pinball(q, u))); }
      c.stroke();
      text(c, 'q = ' + q, PX.x + i * 70, PX.y + PX.h + (narrow ? 30 : 36), { size: 11, color: c.strokeStyle, alpha: reach, weight: 500 });
    });
    // the forecast fan for EQ, built one day ahead at a time
    var F = fanPanel(w, h), cum = 0, pts = [];
    for (var hh = 0; hh < 5; hh++) { cum += Q50[0][hh]; pts.push({ m: cum, s: QSD[0] * Math.sqrt(hh + 1) }); }
    var span = 0.045, FX = function (d) { return F.x + d / 5 * F.w; }, FY = function (v) { return F.y + F.h / 2 - v / span * F.h / 2; };
    ga(c, ease(seg(fan, 0, 0.1)));
    c.strokeStyle = 'rgba(143,177,189,0.3)';
    c.strokeRect(F.x + 0.5, F.y + 0.5, F.w - 1, F.h - 1);
    c.beginPath(); c.moveTo(F.x, FY(0)); c.lineTo(F.x + F.w, FY(0)); c.stroke();
    text(c, 'EQ, cumulative log return', F.x + 6, F.y + 14, { size: 10, alpha: ease(seg(fan, 0, 0.1)) });
    var nShown = fan * 5;
    [[-1, 'rgba(' + BLUE + ',0.95)'], [0, ACC], [1, FOAM]].forEach(function (qq) {
      ga(c, 1);
      c.strokeStyle = qq[1];
      c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(FX(0), FY(0));
      for (var d = 0; d < 5 && d < nShown; d++) {
        var fr = Math.min(1, nShown - d), prev = d ? pts[d - 1] : { m: 0, s: 0 };
        var vv = lerp(prev.m + qq[0] * prev.s, pts[d].m + qq[0] * pts[d].s, fr);
        c.lineTo(FX(d + fr), FY(vv));
      }
      c.stroke();
    });
    for (var d = 0; d < 5 && d < nShown; d++) {
      [-1, 0, 1].forEach(function (k) {
        ga(c, Math.min(1, nShown - d));
        c.fillStyle = k === 0 ? ACC : k < 0 ? 'rgba(' + BLUE + ',0.95)' : FOAM;
        c.beginPath(); c.arc(FX(d + 1), FY(pts[d].m + k * pts[d].s), 3, 0, Math.PI * 2); c.fill();
      });
      text(c, 'h' + (d + 1), FX(d + 1), F.y + F.h - 6, { size: 9, align: 'center', alpha: Math.min(1, nShown - d) });
    }
  };

  // 2.9 the daily medians add up to the 5-day forecast, which becomes mu
  function muVector(c, w, h, alphaFn) {
    var M = muBox(w, h);
    for (var a = 0; a < N; a++) {
      var al = alphaFn ? alphaFn(a) : 1;
      cell(c, M.x, M.y + a * M.cs, M.cs, M.cs, MU[a], { scale: 0.1, alpha: al, fmt: function (v) { return (v * 100).toFixed(1) + (M.cs > 40 ? '%' : ''); } });
      text(c, NAMES[a], M.x - 8, M.y + a * M.cs + M.cs / 2, { size: 10, align: 'right', base: 'middle', alpha: al });
    }
    brackets(c, M.x, M.y, M.cs, 4 * M.cs, 1);
    text(c, 'μ', M.x + M.cs / 2, M.y - 10, { size: 14, color: FOAM, align: 'center', weight: 500 });
  }
  var toMuBeat = function (c, w, h, p) {
    var M = muBox(w, h), a = ease(seg(p, 0, 0.16)), st = ease(seg(p, 0.2, 0.46)), an = ease(seg(p, 0.5, 0.66)), fl = ease(seg(p, 0.7, 0.9)), rest = ease(seg(p, 0.78, 0.98));
    var px = 30, pw = M.x - 70, py = 50, ph = h - 120;
    var bps = 0.2 / 100, BY = function (v) { return py + ph - v / bps * ph; };
    var m5 = sum(Q50[0]), slotW = pw / 7, bw = slotW * 0.55;
    // the five daily medians, then stacked end to end into their sum
    ga(c, 1);
    c.strokeStyle = 'rgba(143,177,189,0.4)';
    c.beginPath(); c.moveTo(px, py + ph); c.lineTo(px + pw, py + ph); c.stroke();
    text(c, 'EQ: median forecast per day', px, py - 18, { size: 12, color: FOAM, weight: 500 });
    var cum = 0, sx = px + slotW * 5.9;
    for (var d = 0; d < 5; d++) {
      var v = Q50[0][d], x = lerp(px + slotW * (d + 0.3), sx, st), yb = lerp(py + ph, BY(cum), st);
      var hh = (py + ph) - BY(v);
      var fx = lerp(x, M.x, fl), fy = lerp(yb - hh, M.y, fl), fw = lerp(bw, M.cs, fl), fh = lerp(hh, M.cs * (d === 0 ? 1 : 0), fl);
      ga(c, a * (1 - fl * (d === 0 ? 0 : 1)));
      c.fillStyle = 'rgba(' + G + ',' + (0.95 - d * 0.12) + ')';
      c.fillRect(fx, fy, fw, Math.max(fh, 0));
      if (st < 0.15) text(c, (v * 100).toFixed(3) + (slotW > 56 ? '%' : ''), x + bw / 2, yb - hh - 6, { size: 10, color: FOAM, align: 'center', alpha: a * (1 - st / 0.15) });
      if (st < 0.5) text(c, 'h' + (d + 1), px + slotW * (d + 0.3) + bw / 2, py + ph + 14, { size: 10, align: 'center', alpha: a * (1 - st * 2) });
      cum += v;
    }
    var sumTxt = Q50[0].map(function (v) { return (v * 100).toFixed(3); }).join(' + ') + ' = ' + (m5 * 100).toFixed(3) + '%';
    // the sum's label, kept clear of the mu vector on narrow screens
    var sLab = 'Σₕ q̂₀.₅(h) = ' + (m5 * 100).toFixed(3) + '%  (5-day)', sW = sLab.length * 6.7;
    if (sx + bw / 2 + sW / 2 > M.x - 12) { sLab = 'Σₕ q̂₀.₅(h) = ' + (m5 * 100).toFixed(3) + '%'; sW = sLab.length * 6.7; }
    text(c, sLab, Math.min(sx + bw / 2, M.x - 12 - sW / 2), BY(m5) - 10, { size: 11, color: ACC, align: 'center', weight: 500, alpha: st * (1 - fl) });
    var fs = Math.max(10, Math.min(12, w / 52));
    text(c, sumTxt, px, h - 42, { size: fs, color: FOAM, alpha: st * (1 - an * 0.4) });
    text(c, '× 252/5 to annualize:  ' + (m5 * 100).toFixed(3) + '% × 50.4 = ' + (MU[0] * 100).toFixed(1) + '%', px, h - 20, { size: fs, color: ACC, weight: 500, alpha: an });
    // EQ lands first; the other assets follow the same arithmetic
    muVector(c, w, h, function (k) { return k === 0 ? ease(seg(fl, 0.85, 1)) : ease(seg(rest, 0.4 + k * 0.15, 0.55 + k * 0.15)); });
    for (var k = 1; k < N; k++) {
      var r = ease(seg(rest, (k - 1) * 0.15, 0.4 + (k - 1) * 0.15));
      if (r <= 0 || r >= 1) continue;
      var ox = lerp(px + pw * 0.4, M.x + M.cs / 2, r), oy = lerp(py + ph * 0.3 + k * 20, M.y + k * M.cs + M.cs / 2, r);
      text(c, NAMES[k] + ' ' + (sum(Q50[k]) * 100).toFixed(3) + '%', ox, oy, { size: 11, color: ACC, align: 'center', alpha: Math.sin(r * Math.PI) });
    }
  };

  BEATS.push(embedBeat, grnDenseBeat, gluBeat, lnBeat, selBeat, lstmBeat, attnBeat, quantBeat, toMuBeat);

  // 3.1 the sample covariance fills in beside mu
  BEATS.push(function (c, w, h, p) {
    var SB = sigmaBox(w, h);
    matrix(c, SB.x, SB.y, SB.cs, S100, {
      scale: 4.84, heads: true, label: 'S × 100',
      cellAlpha: function (i, j) { var q = i * 4 + j; return ease(seg(p, 0.05 + q * 0.045, 0.18 + q * 0.045)); }
    });
    muVector(c, w, h);
  });

  // 3.2 shrinkage pulls every covariance in by alpha
  BEATS.push(function (c, w, h, p) {
    var SB = sigmaBox(w, h), al = ALPHA * ease(seg(p, 0.1, 0.8));
    var M = shrunk(al).map(function (r) { return r.map(function (v) { return v * 100; }); });
    matrix(c, SB.x, SB.y, SB.cs, M, {
      scale: 4.84, heads: true, label: al > 0.05 ? 'Σ̂ × 100' : 'S × 100',
      stroke: function (i, j) { return i !== j && al > 0 && al < ALPHA ? 'rgba(' + G + ',0.8)' : (i === 0 && j === 3 ? FOAM : null); }
    });
    muVector(c, w, h);
    // alpha as a slider under the matrix, and one entry worked through
    var sy = SB.y + 4 * SB.cs + 30, sw = 4 * SB.cs;
    ga(c, 1);
    c.strokeStyle = 'rgba(143,177,189,0.45)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(SB.x, sy); c.lineTo(SB.x + sw, sy); c.stroke();
    var kx = SB.x + al / 0.2 * sw;
    c.fillStyle = ACC;
    c.beginPath(); c.arc(kx, sy, 6, 0, Math.PI * 2); c.fill();
    text(c, 'α = ' + al.toFixed(3), kx, sy - 12, { size: 11, color: ACC, align: 'center', weight: 500 });
    text(c, '(1 − α) × ' + S100[0][3].toFixed(2) + ' = ' + M[0][3].toFixed(2) + '   (EQ, RE)', SB.x, sy + 28, { size: Math.max(10, Math.min(12, w / 50)), color: FOAM });
  });

  // 4.1 the weight vector rotates onto each row of Sigma-hat; products add into Sigma-hat w
  function prodLayout(w, h) {
    var SB = sigmaBox(w, h), cs = SB.cs;
    return { SB: SB, cs: cs, wx: SB.x + 4 * cs + cs * 0.9, wy: SB.y, rx: SB.x + 4 * cs + cs * 2.95, ry: SB.y };
  }
  var SW100 = matvec(SH, W0).map(function (v) { return v * 100; });
  var SH100 = SH.map(function (r) { return r.map(function (v) { return v * 100; }); });
  BEATS.push(function (c, w, h, p) {
    var P = prodLayout(w, h), cs = P.cs, SB = P.SB;
    var slot = 0.92 / 4, rowNow = Math.min(3, Math.floor(seg(p, 0.04, 0.96) * 4)), q = clamp((p - 0.04 - rowNow * slot) / slot, 0, 1);
    var rot = ease(seg(q, 0, 0.32)), mul = ease(seg(q, 0.34, 0.52)), mrg = ease(seg(q, 0.56, 0.9));
    // Sigma-hat, with the active row showing its products while they're formed
    matrix(c, SB.x, SB.y, cs, SH100, {
      scale: 4.84, heads: true, label: 'Σ̂ × 100',
      cellAlpha: function (i) { return i === rowNow ? 1 - 0.85 * mrg : 1; },
      textAlpha: function (i) { return i === rowNow ? 1 - mul : 1; },
      stroke: function (i) { return i === rowNow ? 'rgba(' + G + ',0.7)' : null; }
    });
    // the products, written over the active row, then sliding into the result
    for (var k = 0; k < N; k++) {
      var pv = SH100[rowNow][k] * W0[k];
      var x = lerp(SB.x + k * cs, P.rx, mrg), y = lerp(SB.y + rowNow * cs, P.ry + rowNow * cs, mrg);
      cell(c, x, y, cs, cs, pv, { scale: 1.2, alpha: mul * (1 - mrg), stroke: ACC, lw: 1.2, fmt: function (v) { return num(v, 2, cs); } });
    }
    // w, and a copy of it rotating from a column to lie along the row
    for (k = 0; k < N; k++) cell(c, P.wx, P.wy + k * cs, cs, cs, W0[k], { scale: 0.5, fmt: function (v) { return num(v, 2, cs); } });
    brackets(c, P.wx, P.wy, cs, 4 * cs, 1);
    text(c, 'w', P.wx + cs / 2, P.wy - 10, { size: 13, color: FOAM, align: 'center', weight: 500 });
    if (rot > 0 && mul < 1) {
      var phi = rot * Math.PI / 2, dx = Math.sin(phi), dy = Math.cos(phi);
      var ax = lerp(P.wx, SB.x, rot), ay = lerp(P.wy, SB.y + rowNow * cs, rot);
      for (k = 0; k < N; k++) {
        var gx = ax + k * cs * dx, gy = ay + k * cs * dy;
        // the copy appears only once it has left the w column, and writes its value along the bottom edge of the cell,
        // on a dark backing, so it never sits on the number underneath
        var wa = (1 - mul) * ease(seg(rot, 0, 0.3));
        ga(c, wa);
        c.strokeStyle = ACC;
        c.lineWidth = 1.6;
        c.strokeRect(gx + 4, gy + 4, cs - 8, cs - 8);
        var wfs = Math.max(8, cs * 0.2), wtx = num(W0[k], 2, cs), wpw = wtx.length * wfs * 0.62 + 6, wy = gy + cs - 5;
        ga(c, 0.92 * wa); c.fillStyle = DEEP; c.fillRect(gx + cs / 2 - wpw / 2, wy - wfs * 0.95, wpw, wfs * 1.25);
        text(c, wtx, gx + cs / 2, wy, { size: wfs, color: ACC, align: 'center', alpha: wa });
      }
    }
    // the result column, one entry per finished row
    text(c, '=', P.wx + cs + (P.rx - P.wx - cs) / 2, P.wy + 2 * cs + 6, { size: 18, color: FOAM, align: 'center' });
    for (var i = 0; i < N; i++) {
      var done = i < rowNow ? 1 : i === rowNow ? ease(seg(q, 0.82, 1)) : 0;
      if (done) cell(c, P.rx, P.ry + i * cs, cs, cs, SW100[i], { scale: 2.5, alpha: done, fmt: function (v) { return num(v, 2, cs); } });
    }
    brackets(c, P.rx, P.ry, cs, 4 * cs, 1);
    text(c, 'Σ̂w', P.rx + cs / 2, P.ry - 10, { size: 13, color: FOAM, align: 'center', weight: 500 });
  });

  // 4.2 w transposed rotates into a row; dot products give variance and return
  BEATS.push(function (c, w, h, p) {
    var P = prodLayout(w, h), cs = P.cs, M = muBox(w, h);
    var cols = [
      { x: P.rx, tx: w * 0.36, vals: SW100, scale: 2.5, out: ST0.v * 100, lab: 'wᵀΣ̂w × 100' },
      { x: M.x, tx: w * 0.68, vals: MU.map(function (v) { return v * 100; }), scale: 10, out: ST0.m * 100, lab: 'wᵀμ (%)' }
    ];
    // on short screens the Sharpe line has to sit where the two result labels are, so they give way as it arrives
    var srY = P.ry + 4 * cs + 26 + cs + 52, srTight = srY > h - 14, srA = ease(seg(p, 0.88, 1));
    var firstVis = 1 - ease(seg(p, 0, 0.12));
    if (firstVis > 0) faded(firstVis, function () { BEATS[14](c, w, h, 1); });
    var inA = ease(seg(p, 0, 0.12));
    cols.forEach(function (col, ci) {
      var q = seg(p, ci ? 0.48 : 0.06, ci ? 0.86 : 0.44);
      var rot = ease(seg(q, 0, 0.35)), mul = ease(seg(q, 0.38, 0.6)), mrg = ease(seg(q, 0.64, 0.95));
      var vy = P.ry, outY = vy + 4 * cs + 26;
      for (var k = 0; k < N; k++) {
        var prod = col.vals[k] * W0[k];
        var v = lerp(col.vals[k], prod, mul);
        var y = lerp(vy + k * cs, outY, mrg), xx = lerp(col.x, col.tx - cs / 2, mrg);
        cell(c, xx, y, cs, cs, v, { scale: col.scale * (1 - 0.7 * mul), alpha: inA * (1 - mrg), fmt: function (x) { return num(x, 2, cs); } });
      }
      brackets(c, col.x, vy, cs, 4 * cs, inA * (1 - mrg));
      // w transposed: a column of weights turning into a row above its partner
      if (rot > 0 && mul < 1) {
        var phi = rot * Math.PI / 2, dx = Math.sin(phi), dy = Math.cos(phi);
        var ax = lerp(P.wx, col.x - 1.5 * cs, rot), ay = lerp(P.wy, vy - 1.2 * cs, rot);
        for (k = 0; k < N; k++) {
          var gx = ax + k * cs * 0.8 * dx, gy = ay + k * cs * dy * (1 - rot);
          ga(c, 1 - mul);
          c.strokeStyle = ACC;
          c.lineWidth = 1.5;
          c.strokeRect(gx + 4, gy + 4, cs * 0.8 - 8, cs - 8);
          text(c, num(W0[k], 2, 30), gx + cs * 0.4, gy + cs * 0.6, { size: Math.max(8, cs * 0.2), color: ACC, align: 'center', alpha: 1 - mul });
        }
        text(c, 'wᵀ', ax - 14, ay + cs * 0.6, { size: 12, color: ACC, align: 'right', alpha: rot * (1 - mul) });
      }
      if (mrg > 0.6) {
        var a2 = ease(seg(mrg, 0.6, 1));
        cell(c, col.tx - cs, outY, cs * 2, cs, col.out, { scale: col.scale, alpha: a2, stroke: ACC, fmt: function (x) { return x.toFixed(ci ? 2 : 3); } });
        text(c, col.lab, col.tx, outY + cs + 16, { size: 10, color: FOAM, align: 'center', alpha: a2 * (srTight ? 1 - srA : 1) });
      }
    });
    if (inA > 0) {
      for (var k2 = 0; k2 < N; k2++) cell(c, P.wx, P.wy + k2 * cs, cs, cs, W0[k2], { scale: 0.5, alpha: inA, fmt: function (v) { return num(v, 2, cs); } });
      brackets(c, P.wx, P.wy, cs, 4 * cs, inA);
      text(c, 'w', P.wx + cs / 2, P.wy - 10, { size: 13, color: FOAM, align: 'center', weight: 500, alpha: inA });
    }
    var sr = ease(seg(p, 0.88, 1));
    text(c, 'SR = (' + (ST0.m * 100).toFixed(2) + '% − ' + (RF * 100).toFixed(0) + '%) / ' + (ST0.sd * 100).toFixed(2) + '% = ' + ST0.sr.toFixed(3),
      w / 2, Math.min(h - 14, P.ry + 4 * cs + 26 + cs + 52), { size: clamp(w / 40, 11, 15), color: ACC, align: 'center', weight: 500, alpha: sr });
  });

  // 4.3 gradient ascent climbs to the maximum Sharpe ratio
  function climbLayout(w, h) {
    var narrow = w < 560;
    var cw = narrow ? w - 20 : w * 0.64, ch = narrow ? h * 0.56 : h - 70;
    return { narrow: narrow, x: 34, y: 26, w: cw - 34, h: ch - 26 - 22, bx: narrow ? 40 : cw + 30, by: narrow ? ch + 18 : 60, bw: narrow ? w - 80 : w - cw - 90, bh: narrow ? (h - ch - 30) / 4 : Math.min(40, (h - 140) / 4) };
  }
  function weightBars(c, L, wv, alpha, prev) {
    for (var i = 0; i < N; i++) {
      var y = L.by + i * L.bh * 1.15;
      text(c, NAMES[i], L.bx - 8, y + L.bh * 0.62, { size: 10, align: 'right', alpha: alpha });
      ga(c, alpha * 0.18);
      c.fillStyle = MIST;
      c.fillRect(L.bx, y, L.bw, L.bh * 0.7);
      ga(c, alpha);
      c.fillStyle = ACC;
      c.fillRect(L.bx, y, L.bw * wv[i], L.bh * 0.7);
      text(c, (wv[i] * 100).toFixed(1) + '%', L.bx + L.bw * wv[i] + 6, y + L.bh * 0.52, { size: 11, color: FOAM, alpha: alpha });
    }
  }
  function interpW(f) {
    var i = Math.min(PATH.length - 2, Math.floor(f)), t = f - i;
    return PATH[i].map(function (v, k) { return lerp(v, PATH[i + 1][k], t); });
  }
  BEATS.push(function (c, w, h, p) {
    var L = climbLayout(w, h), SMAX = 0.24, MMAX = 0.095;
    var X = function (s) { return L.x + s / SMAX * L.w; }, Y = function (m) { return L.y + L.h - (m - 0.02) / (MMAX - 0.02) * L.h; };
    ga(c, 1);
    c.strokeStyle = 'rgba(143,177,189,0.25)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(L.x, L.y); c.lineTo(L.x, L.y + L.h); c.lineTo(L.x + L.w, L.y + L.h); c.stroke();
    text(c, 'risk σ', L.x + L.w, L.y + L.h + 16, { size: 10, align: 'right' });
    text(c, 'return μ', L.x + 6, L.y + 8, { size: 10 });
    ga(c, 0.32);
    c.fillStyle = MIST;
    CLOUD.forEach(function (pt) { c.fillRect(X(pt[0]) - 0.8, Y(pt[1]) - 0.8, 1.6, 1.6); });
    var f = ease(seg(p, 0.05, 0.92)) * (PATH.length - 1);
    var wv = interpW(f), st = stats(wv);
    // the path so far
    ga(c, 0.9);
    c.strokeStyle = ACC;
    c.lineWidth = 1.6;
    c.beginPath();
    for (var k = 0; k <= Math.floor(f); k++) { var sk = stats(PATH[k]); if (k) c.lineTo(X(sk.sd), Y(sk.m)); else c.moveTo(X(sk.sd), Y(sk.m)); }
    c.lineTo(X(st.sd), Y(st.m));
    c.stroke();
    // the step direction, turning as the climb levels out
    var ahead = stats(interpW(Math.min(PATH.length - 1, f + 1.5)));
    var vx = X(ahead.sd) - X(st.sd), vy = Y(ahead.m) - Y(st.m), vl = Math.hypot(vx, vy);
    if (vl > 0.4 && f < PATH.length - 3) arrow(c, X(st.sd), Y(st.m), X(st.sd) + vx / vl * 46, Y(st.m) + vy / vl * 46, FOAM, 0.9);
    // the capital market line appears once the top is reached
    var cml = ease(seg(p, 0.88, 1));
    if (cml > 0) {
      ga(c, 0.6 * cml);
      c.setLineDash([5, 6]);
      c.strokeStyle = FOAM;
      c.beginPath(); c.moveTo(X(0), Y(RF)); c.lineTo(X(SMAX), Y(RF + STAR.sr * SMAX)); c.stroke();
      c.setLineDash([]);
    }
    ga(c, 1);
    c.fillStyle = FOAM;
    c.beginPath(); c.arc(X(st.sd), Y(st.m), 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = ACC;
    c.beginPath(); c.arc(X(st.sd), Y(st.m), 4, 0, Math.PI * 2); c.fill();
    text(c, 'SR = ' + st.sr.toFixed(3), X(st.sd) + 10, Y(st.m) - 10, { size: 12, color: FOAM, weight: 500 });
    weightBars(c, L, wv, 1);
    text(c, 'weights', L.bx, L.by - 14, { size: 11, color: FOAM });
  });

  // 4.4 the bars turn into the final weight vector
  BEATS.push(function (c, w, h, p) {
    var L = climbLayout(w, h), e = ease(seg(p, 0.08, 0.7)), cs = Math.min(54, (h - 120) / 5);
    var vx = w / 2 - cs / 2 + (L.narrow ? 0 : 40), vy = (h - 4 * cs) / 2;
    faded(1 - e, function () { BEATS[16](c, w, h, 1); });
    for (var i = 0; i < N; i++) {
      // each bar spins a quarter turn about its centre as it becomes a cell
      var by = L.by + i * L.bh * 1.15, bw = L.bw * WSTAR[i], bh = L.bh * 0.7;
      var cx = lerp(L.bx + bw / 2, vx + cs / 2, e), cy = lerp(by + bh / 2, vy + i * cs + cs / 2, e);
      var ww = lerp(bw, cs, e), hh = lerp(bh, cs, e), ang = (1 - e) * 0 + Math.sin(e * Math.PI) * Math.PI / 2;
      c.save();
      c.translate(cx, cy);
      c.rotate(ang);
      cell(c, -ww / 2, -hh / 2, ww, hh, WSTAR[i], { scale: 0.6, alpha: Math.max(0.25, e), label: false });
      c.restore();
      if (e > 0.85) {
        var a2 = ease(seg(e, 0.85, 1));
        text(c, (WSTAR[i] * 100).toFixed(1) + '%', vx + cs / 2, vy + i * cs + cs / 2 + 4, { size: Math.max(10, cs * 0.24), color: FOAM, align: 'center', weight: 500, alpha: a2 });
        text(c, NAMES[i], vx - 10, vy + i * cs + cs / 2 + 4, { size: 11, align: 'right', alpha: a2 });
      }
    }
    var a3 = ease(seg(p, 0.7, 0.95));
    brackets(c, vx, vy, cs, 4 * cs, a3);
    text(c, 'w*', vx + cs / 2, vy - 12, { size: 14, color: ACC, align: 'center', weight: 500, alpha: a3 });
    text(c, 'Σw = ' + sum(WSTAR).toFixed(3) + ',  w ≥ 0', vx + cs / 2, vy + 4 * cs + 24, { size: 11, align: 'center', alpha: a3 });
    if (!L.narrow) arrow(c, vx + cs + 24, vy + 2 * cs, vx + cs + 110, vy + 2 * cs, ACC, a3);
    if (!L.narrow) text(c, 'backtest', vx + cs + 118, vy + 2 * cs + 4, { size: 12, color: ACC, alpha: a3 });
  });

  /* ---------- The scene ---------- */
  var CAPS = [
    function () { return 'Simulated daily prices for four illustrative assets, the same EQ, CR, CM, and RE as on the risk engine page.'; },
    function () { return 'EQ’s price line splitting into its five features, computed from those prices and standardized.'; },
    function () { return 'The last 60 days of every feature, for every asset: the tensor the model reads.'; },
    function () { return 'Each of today’s five feature values becomes a 4-dimensional embedding. Weights here are random stand-ins; the arithmetic is exact.'; },
    function (p) { return p < 0.55 ? '[W<sub>2</sub> W<sub>3</sub>] times the stacked input [a; c], row by row.' : 'Add the bias b<sub>2</sub>, then ELU: values below zero bend toward −1, values above pass through.'; },
    function (p) { return p < 0.5 ? 'W<sub>1</sub> maps η<sub>2</sub> to 8 numbers, then the bias b<sub>1</sub> is added.' : 'Split into γ<sub>1</sub> and γ<sub>2</sub>; the sigmoid turns γ<sub>2</sub> into gates between 0 and 1 that scale γ<sub>1</sub>.'; },
    function () { return 'Skip connection, then LayerNorm: mean <b>' + G0.m.toFixed(2) + '</b> and std <b>' + G0.sd.toFixed(2) + '</b> become 0 and 1.'; },
    function () { return 'Selection weights v = softmax(z): ' + VSN.map(function (v, k) { return FSHORT[k] + ' <b>' + v.toFixed(2) + '</b>'; }).join(', ') + '.'; },
    function (p) { var t = Math.min(WIN - 1, Math.floor(ease(seg(p, 0.25, 0.97)) * (WIN - 1))); return 'A one-unit LSTM, run for real over the window. Day <b>' + (t + 1) + '</b>: h = <b>' + LH[t].toFixed(3) + '</b>, c = <b>' + LC[t].toFixed(3) + '</b>.'; },
    function (p) { return p < 0.55 ? 'Scores, then softmax: each forecast day’s weights over the past 60 days sum to 1. Pattern illustrative.' : 'Each forecast day takes a weighted sum of the window, then the matrix of weights fills in.'; },
    function (p) { return p < 0.45 ? 'Pinball loss: under-forecasts cost q per unit, over-forecasts cost 1 − q, so each output settles on its quantile.' : 'Three outputs per day ahead: q<sub>10</sub>, q<sub>50</sub>, q<sub>90</sub>, accumulated over the 5-day horizon.'; },
    function () { return 'As in the code: μ = the sum of the five daily q<sub>50</sub> log-return forecasts, annualized here to sit with the annual covariance.'; },
    function () { return 'Sample covariance S of the four assets, annualized, × 100.'; },
    function () { return 'Off-diagonal entries shrink by (1 − α); the diagonal, each asset’s variance, stays put.'; },
    function (p) { var r = Math.min(4, Math.floor(seg(p, 0.04, 0.96) * 4) + 1); return 'Row <b>' + r + ' of 4</b>: (Σ̂w)<sub>i</sub> = Σ<sub>k</sub> Σ̂<sub>ik</sub> w<sub>k</sub>, starting from equal weights.'; },
    function () { return 'Equal weights: variance <b>' + (ST0.v * 100).toFixed(3) + '</b> (× 100), return <b>' + (ST0.m * 100).toFixed(2) + '%</b>, Sharpe <b>' + ST0.sr.toFixed(3) + '</b>.'; },
    function (p) { var st = stats(interpW(ease(seg(p, 0.05, 0.92)) * (PATH.length - 1))); return 'Projected gradient ascent: Sharpe <b>' + st.sr.toFixed(3) + '</b>, from ' + ST0.sr.toFixed(3) + ' at equal weights.'; },
    function () { return 'Max-Sharpe weights: ' + WSTAR.map(function (v, i) { return NAMES[i] + ' <b>' + (v * 100).toFixed(1) + '%</b>'; }).join(', ') + '. Sharpe ' + STAR.sr.toFixed(3) + '.'; }
  ];

  Story.scene('pipeline', {
    draw: function (c, s) {
      var beat = Math.min(BEATS.length - 1, s.step), p = s.p;
      // a short crossfade from the previous beat's final frame
      // the old beat fades out before the new one fades in, so their labels never share the canvas
      var outA = beat > 0 ? 1 - ease(seg(p, 0, 0.05)) : 0, inA = beat > 0 ? ease(seg(p, 0.05, 0.1)) : 1;
      if (outA > 0) faded(outA, function () { BEATS[beat - 1](c, s.w, s.h, 1); });
      if (inA > 0) faded(inA, function () { BEATS[beat](c, s.w, s.h, seg(p, 0.06, 0.94)); });
      c.globalAlpha = 1;
    },
    caption: function (s) {
      var beat = Math.min(CAPS.length - 1, s.step);
      return CAPS[beat](seg(s.p, 0.06, 0.94));
    }
  });

  Story.start();
})();
