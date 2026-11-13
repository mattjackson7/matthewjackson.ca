/* Shared helpers for the scroll-story figures: easing, seeded randomness,
   canvas text and axes, and a double-precision normal CDF with Black-Scholes
   built on it. Exposed as window.Viz. */
(function () {
  var FOAM = '#eaf6f8', MIST = '#8fb1bd', DEEP = '#07222e';
  var MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

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
  function sum(a) { return a.reduce(function (s, v) { return s + v; }, 0); }
  function mean(a) { return sum(a) / a.length; }

  // standard normal CDF to about 1e-14 (Hart's algorithm, as given by West, 2005)
  function N(x) {
    var z = Math.abs(x), c = 0;
    if (z <= 37) {
      var e = Math.exp(-z * z / 2), b;
      if (z < 7.07106781186547) {
        b = 3.52624965998911e-2 * z + 0.700383064443688;
        b = b * z + 6.37396220353165; b = b * z + 33.912866078383; b = b * z + 112.079291497871;
        b = b * z + 221.213596169931; b = b * z + 220.206867912376;
        c = e * b;
        b = 8.83883476483184e-2 * z + 1.75566716318264;
        b = b * z + 16.064177579207; b = b * z + 86.7807322029461; b = b * z + 296.564248779674;
        b = b * z + 637.333633378831; b = b * z + 793.826512519948; b = b * z + 440.413735824752;
        c = c / b;
      } else {
        b = z + 0.65; b = z + 4 / b; b = z + 3 / b; b = z + 2 / b; b = z + 1 / b;
        c = e / b / 2.506628274631;
      }
    }
    return x > 0 ? 1 - c : c;
  }
  function pdf(x) { return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI); }

  // Black-Scholes-Merton call and put, with the pieces exposed
  function bsm(S, K, T, r, sig) {
    if (T <= 0) return { call: Math.max(S - K, 0), put: Math.max(K - S, 0), d1: 0, d2: 0, delta: S > K ? 1 : 0, gamma: 0, vega: 0 };
    var sq = Math.sqrt(T), d1 = (Math.log(S / K) + (r + sig * sig / 2) * T) / (sig * sq), d2 = d1 - sig * sq;
    var disc = K * Math.exp(-r * T);
    return {
      call: S * N(d1) - disc * N(d2), put: disc * N(-d2) - S * N(-d1),
      d1: d1, d2: d2, delta: N(d1), gamma: pdf(d1) / (S * sig * sq), vega: S * pdf(d1) * sq
    };
  }

  // every draw goes through ga(), so a whole beat can be faded as one
  var state = { base: 1 };
  function ga(c, a) { c.globalAlpha = state.base * (a == null ? 1 : a); }
  function faded(k, fn) { var b = state.base; state.base *= k; fn(); state.base = b; }

  function text(c, s, x, y, o) {
    o = o || {};
    ga(c, o.alpha);
    var size = o.size || 12;
    c.font = (o.weight || 400) + ' ' + size + 'px ' + MONO;
    c.fillStyle = o.color || MIST;
    c.textAlign = o.align || 'left';
    c.textBaseline = o.base || 'alphabetic';
    // o.fit: the widest the text may be; shrink to fit, and skip it if it would be unreadably small
    if (o.fit) {
      var tw = c.measureText(s).width;
      if (tw > o.fit) { size = size * o.fit / tw; if (size < 5.5) return; c.font = (o.weight || 400) + ' ' + size.toFixed(2) + 'px ' + MONO; }
    }
    // keep every label inside the canvas: on narrow screens, slide it back in from the edge
    var m = c.getTransform && c.getTransform();
    if (m && !m.b && !m.c && m.a > 0 && o.keepIn !== false) {
      var mt = c.measureText(s), L = x - mt.actualBoundingBoxLeft, R = x + mt.actualBoundingBoxRight;
      var X0 = -m.e / m.a + 2, X1 = (c.canvas.width - m.e) / m.a - 2;
      if (R - L > X1 - X0) {  // wider than the whole canvas: shrink it to fit
        size = size * (X1 - X0) / (R - L) * 0.98;
        if (size < 5.5) return;
        c.font = (o.weight || 400) + ' ' + size.toFixed(2) + 'px ' + MONO;
        mt = c.measureText(s); L = x - mt.actualBoundingBoxLeft; R = x + mt.actualBoundingBoxRight;
      }
      if (R - L < X1 - X0) { if (L < X0) x += X0 - L; else if (R > X1) x -= R - X1; }
    }
    c.fillText(s, x, y);
  }
  function line(c, x0, y0, x1, y1, color, o) {
    o = o || {};
    ga(c, o.alpha);
    c.strokeStyle = color;
    c.lineWidth = o.width || 1.2;
    c.setLineDash(o.dash || []);
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.setLineDash([]);
  }
  function dot(c, x, y, r, fill, o) {
    o = o || {};
    ga(c, o.alpha);
    if (o.halo) { c.fillStyle = FOAM; c.beginPath(); c.arc(x, y, r + 2, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = fill;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  // a polyline through f(x) for x in [a, b], in plot coordinates
  function plot(c, f, a, b, X, Y, color, o) {
    o = o || {};
    var n = o.n || 160;
    ga(c, o.alpha);
    c.strokeStyle = color;
    c.lineWidth = o.width || 1.8;
    c.setLineDash(o.dash || []);
    c.beginPath();
    for (var k = 0; k <= n; k++) {
      var x = a + (b - a) * k / n, y = f(x);
      if (!isFinite(y)) continue;
      if (k) c.lineTo(X(x), Y(y)); else c.moveTo(X(x), Y(y));
    }
    c.stroke();
    c.setLineDash([]);
  }
  // a plot frame: maps data to pixels and draws light axes with tick labels
  function frame(c, box, xr, yr, o) {
    o = o || {};
    var X = function (v) { return box.x + (v - xr[0]) / (xr[1] - xr[0]) * box.w; };
    var Y = function (v) { return box.y + box.h - (v - yr[0]) / (yr[1] - yr[0]) * box.h; };
    if (o.logX) X = function (v) { return box.x + (Math.log10(v) - Math.log10(xr[0])) / (Math.log10(xr[1]) - Math.log10(xr[0])) * box.w; };
    if (o.logY) Y = function (v) { return box.y + box.h - (Math.log10(v) - Math.log10(yr[0])) / (Math.log10(yr[1]) - Math.log10(yr[0])) * box.h; };
    var al = o.alpha == null ? 1 : o.alpha;
    ga(c, al * 0.6);
    c.strokeStyle = 'rgba(143,177,189,0.35)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(box.x, box.y); c.lineTo(box.x, box.y + box.h); c.lineTo(box.x + box.w, box.y + box.h);
    c.stroke();
    (o.xticks || []).forEach(function (t) {
      text(c, o.xfmt ? o.xfmt(t) : String(t), X(t), box.y + box.h + 15, { size: 10, align: 'center', alpha: al });
    });
    (o.yticks || []).forEach(function (t) {
      text(c, o.yfmt ? o.yfmt(t) : String(t), box.x - 6, Y(t) + 3, { size: 10, align: 'right', alpha: al });
    });
    if (o.xlabel) text(c, o.xlabel, box.x + box.w, box.y + box.h - 6, { size: 10, align: 'right', alpha: al });
    if (o.ylabel) text(c, o.ylabel, box.x + 6, box.y + 10, { size: 10, alpha: al });
    return { X: X, Y: Y };
  }
  function sup(n) {
    var map = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
    return String(n).split('').map(function (ch) { return map[ch] || ch; }).join('');
  }
  function sci(x, d) {
    if (!isFinite(x) || x === 0) return '0';
    var p = x.toExponential(d == null ? 1 : d).split('e');
    return p[0] + '×10' + sup(+p[1]);
  }

  window.Viz = {
    FOAM: FOAM, MIST: MIST, DEEP: DEEP, MONO: MONO,
    clamp: clamp, lerp: lerp, ease: ease, seg: seg, rng: rng, gauss: gauss, sum: sum, mean: mean,
    N: N, pdf: pdf, bsm: bsm,
    ga: ga, faded: faded, text: text, line: line, dot: dot, plot: plot, frame: frame, sci: sci
  };
})();
