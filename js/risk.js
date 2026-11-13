/* Risk page: the Monte Carlo VaR figure and the loss-distribution navigator. */
(function () {
  var FOAM = '#eaf6f8', MIST = '#8fb1bd', ACCENT = '#ffb14e';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function gauss() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* ---------- Navigator: a return distribution with a fat left tail ---------- */
  // the curve runs from the worst losses (top of the page) to the best gains;
  // the bars you have scrolled past fill in, like the tail behind a VaR line
  function density(a) {
    var x = -3.4 + a * 6.2;
    var core = 0.84 * Math.exp(-Math.pow(x - 0.25, 2) / (2 * 0.8)) / Math.sqrt(0.8);
    var tail = 0.16 * Math.exp(-Math.pow(x + 1.3, 2) / (2 * 2.2)) / Math.sqrt(2.2);
    return core + tail;
  }
  var DMAX = 0;
  for (var k = 0; k <= 200; k++) DMAX = Math.max(DMAX, density(k / 200));
  function height(a) { return 0.04 + 0.86 * density(a) / DMAX; }

  var bars = [];
  if (window.PathNav) {
    PathNav.create({
      name: 'Loss distribution',
      sections: [
        { id: 'overview', label: 'Overview' },
        { id: 'sim', label: 'Simulation' },
        { id: 'var', label: 'VaR & CVaR' },
        { id: 'component', label: 'Component VaR' },
        { id: 'stress', label: 'Stress test' },
        { id: 'backtest', label: 'Backtest' },
        { id: 'checks', label: 'Checks' },
        { id: 'code', label: 'Code' }
      ],
      cross: function (s, a) { return height(a); },
      decor: function (d) {
        bars = [];
        var n = 26;
        for (var i = 0; i < n; i++) {
          var a0 = i / n, a1 = (i + 1) / n, b = height((a0 + a1) / 2) - 0.02;
          var p = d.toPx(a0, 0), q = d.toPx(a1, b);
          var gap = 1.2;
          var x = Math.min(p[0], q[0]), y = Math.min(p[1], q[1]);
          var rw = Math.abs(q[0] - p[0]), rh = Math.abs(q[1] - p[1]);
          if (d.vertical) { y += gap / 2; rh -= gap; } else { x += gap / 2; rw -= gap; }
          var r = d.el('rect', { x: x, y: y, width: Math.max(0, rw), height: Math.max(0, rh), fill: 'currentColor', 'fill-opacity': 0.16 }, d.g);
          r.__mid = (a0 + a1) / 2;
          r.__on = false;
          bars.push(r);
        }
      },
      update: function (d, s) {
        var a = d.a(s);
        for (var i = 0; i < bars.length; i++) {
          var on = bars[i].__mid <= a;
          if (on !== bars[i].__on) {
            bars[i].__on = on;
            bars[i].setAttribute('fill', on ? ACCENT : 'currentColor');
            bars[i].setAttribute('fill-opacity', on ? 0.42 : 0.16);
          }
        }
      }
    });
  }

  /* ---------- Figure: a Monte Carlo VaR histogram ---------- */
  var cv = document.getElementById('fig-risk');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var read = document.getElementById('risk-read');
  var chips = document.querySelectorAll('.chip[data-rho]');

  var VOL = [0.18, 0.22, 0.26, 0.32];    // annual volatilities
  var MU = [0.06, 0.07, 0.08, 0.10];     // annual drifts
  var WEIGHT = [0.25, 0.25, 0.25, 0.25];
  var H = 10 / 252;                      // a 10-day horizon
  var NMAX = 40000, PER_FRAME = 700;
  var LO = -0.16, HI = 0.16, BINS = 96;

  var L = [], samples = new Float32Array(NMAX), n = 0, counts = new Float64Array(BINS);
  var stats = { var95: 0, var99: 0, cvar99: 0 }, ymax = 1, rho = 0.2;
  var w = 0, hgt = 0, dpr = 1, visible = true, raf = 0, frameNo = 0;
  var M = { l: 14, r: 14, t: 18, b: 32 };

  // the same hand-written Cholesky-Banachiewicz factorization the engine uses
  function cholesky(S) {
    var m = S.length, Lm = [];
    for (var i = 0; i < m; i++) Lm.push(new Array(m).fill(0));
    for (var j = 0; j < m; j++) {
      var sum = 0;
      for (var k = 0; k < j; k++) sum += Lm[j][k] * Lm[j][k];
      Lm[j][j] = Math.sqrt(S[j][j] - sum);
      for (i = j + 1; i < m; i++) {
        sum = 0;
        for (k = 0; k < j; k++) sum += Lm[i][k] * Lm[j][k];
        Lm[i][j] = (S[i][j] - sum) / Lm[j][j];
      }
    }
    return Lm;
  }

  function reset(r) {
    rho = r;
    var S = VOL.map(function (si, i) {
      return VOL.map(function (sj, j) { return si * sj * (i === j ? 1 : rho) * H; });
    });
    L = cholesky(S);
    n = 0;
    counts.fill(0);
    stats = { var95: 0, var99: 0, cvar99: 0 };
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(Number(c.getAttribute('data-rho')) === rho)); });
    if (reduce) { simulate(NMAX); computeStats(); }
    kick();
  }

  function simulate(count) {
    var m = VOL.length, z = new Array(m);
    for (var c = 0; c < count && n < NMAX; c++) {
      for (var i = 0; i < m; i++) z[i] = gauss();
      var R = 0;
      for (i = 0; i < m; i++) {
        var x = MU[i] * H;
        for (var k = 0; k <= i; k++) x += L[i][k] * z[k];
        R += WEIGHT[i] * x;
      }
      samples[n++] = R;
      var b = Math.floor((R - LO) / (HI - LO) * BINS);
      if (b >= 0 && b < BINS) counts[b]++;
    }
  }

  function computeStats() {
    if (n < 200) return;
    var sorted = samples.slice(0, n).sort();
    var i95 = Math.floor(0.05 * n), i99 = Math.floor(0.01 * n), tail = 0;
    for (var i = 0; i < i99; i++) tail += sorted[i];
    stats = { var95: -sorted[i95], var99: -sorted[i99], cvar99: -tail / Math.max(1, i99) };
  }

  function X(r) { return M.l + (r - LO) / (HI - LO) * (w - M.l - M.r); }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hgt);
    var base = hgt - M.b, top = M.t + 24;

    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = MIST;
    ctx.strokeStyle = 'rgba(143,177,189,0.14)';
    for (var r = -0.15; r <= 0.1501; r += 0.05) {
      ctx.beginPath(); ctx.moveTo(X(r), M.t); ctx.lineTo(X(r), base); ctx.stroke();
      ctx.fillText((r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(Math.round(r * 100)) + '%', X(r), base + 18);
    }

    var peak = 0;
    for (var b = 0; b < BINS; b++) peak = Math.max(peak, counts[b]);
    ymax += (Math.max(1, peak) - ymax) * 0.2;
    var bw = (w - M.l - M.r) / BINS;
    var cut = -stats.var99;
    for (b = 0; b < BINS; b++) {
      if (!counts[b]) continue;
      var x0 = M.l + b * bw, bh = counts[b] / ymax * (base - top);
      var mid = LO + (b + 0.5) / BINS * (HI - LO);
      var inTail = n > 200 && mid < cut;
      ctx.fillStyle = inTail ? ACCENT : MIST;
      ctx.globalAlpha = inTail ? 0.95 : 0.4;
      ctx.fillRect(x0 + 0.5, base - bh, Math.max(1, bw - 1), bh);
    }
    ctx.globalAlpha = 1;

    if (n > 200) {
      marker(-stats.var95, 'VaR 95', MIST, [4, 4], 0);
      marker(-stats.var99, 'VaR 99', ACCENT, [], 16);
      marker(-stats.cvar99, 'CVaR 99', FOAM, [2, 3], 32);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = MIST;
    ctx.fillText('n = ' + n.toLocaleString(), w - M.r, M.t + 4);

    if (read) {
      read.innerHTML = 'VaR<sub>95</sub> = <b>' + pct(stats.var95) + '</b> &ensp;VaR<sub>99</sub> = <b>' + pct(stats.var99) +
        '</b> &ensp;CVaR<sub>99</sub> = <b>' + pct(stats.cvar99) + '</b> &ensp;&rho; = <b>' + rho.toFixed(1) + '</b>';
    }

    function marker(at, label, color, dash, dy) {
      var x = X(at);
      ctx.setLineDash(dash);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x, M.t + dy); ctx.lineTo(x, base); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.textAlign = 'right';
      ctx.fillText(label, x - 5, M.t + dy + 10);
    }
  }
  function pct(x) { return n > 200 ? (x * 100).toFixed(2) + '%' : '–'; }

  function frame() {
    raf = 0;
    if (n < NMAX) {
      simulate(PER_FRAME);
      if (++frameNo % 5 === 0 || n >= NMAX) computeStats();
    }
    draw();
    var settling = Math.abs(ymax - Math.max.apply(null, counts)) > 0.5;
    if (visible && (n < NMAX || settling)) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = cv.getBoundingClientRect();
    w = r.width; hgt = r.height;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(hgt * dpr);
    kick();
  }

  chips.forEach(function (c) {
    c.addEventListener('click', function () { reset(Number(c.getAttribute('data-rho'))); });
  });
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) kick();
    }).observe(cv);
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
  else window.addEventListener('resize', resize);
  reset(0.2);
  resize();
})();
