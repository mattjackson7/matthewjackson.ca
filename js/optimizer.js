/* Optimizer page: the efficient frontier figure and the frontier navigator. */
(function () {
  var FOAM = '#eaf6f8', MIST = '#8fb1bd', ACCENT = '#5fd3b0';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // small seeded generator, so the navigator's cloud is the same on every visit
  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }

  /* ---------- Navigator: walking up the efficient frontier ---------- */
  // across = risk, along = return; the frontier is the hyperbola's upper branch
  function frontier(a) {
    var h = Math.sqrt(0.05 + a * a) - Math.sqrt(0.05);
    return 0.1 + 0.8 * h / (Math.sqrt(1.05) - Math.sqrt(0.05));
  }
  if (window.PathNav) {
    PathNav.create({
      name: 'Efficient frontier',
      sections: [
        { id: 'overview', label: 'Overview' },
        { id: 'features', label: 'Features' },
        { id: 'forecast', label: 'Forecasting' },
        { id: 'covariance', label: 'Covariance' },
        { id: 'optimize', label: 'Optimization' },
        { id: 'backtest', label: 'Backtest' },
        { id: 'code', label: 'Code' }
      ],
      cross: function (s, a) { return frontier(a); },
      decor: function (d) {
        // a cloud of feasible portfolios, all riskier than the frontier
        var r = rng(23);
        for (var k = 0; k < 170; k++) {
          var a = 0.02 + r() * 0.96, f = frontier(a) + 0.04;
          var b = f + Math.pow(r(), 1.7) * (0.97 - f);
          if (b > 0.97) continue;
          var p = d.toPx(a, b);
          d.el('circle', { cx: p[0], cy: p[1], r: 1.3, fill: 'currentColor', 'fill-opacity': 0.42 }, d.g);
        }
      }
    });
  }

  /* ---------- Figure: random portfolios and the frontier ---------- */
  var cv = document.getElementById('fig-opt');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var read = document.getElementById('opt-read');

  var MU = [0.05, 0.07, 0.09, 0.11, 0.13];
  var VOL = [0.10, 0.14, 0.18, 0.24, 0.30];
  var CORR = [
    [1.0, 0.3, 0.2, 0.1, 0.1],
    [0.3, 1.0, 0.4, 0.3, 0.2],
    [0.2, 0.4, 1.0, 0.5, 0.3],
    [0.1, 0.3, 0.5, 1.0, 0.4],
    [0.1, 0.2, 0.3, 0.4, 1.0]
  ];
  var RF = 0.02, NPTS = 3000;
  var n = MU.length;
  var SIG = CORR.map(function (row, i) { return row.map(function (c, j) { return c * VOL[i] * VOL[j]; }); });

  function inverse(A) { // Gauss-Jordan elimination with partial pivoting
    var m = A.length, M = A.map(function (r, i) {
      return r.concat(A.map(function (_, j) { return i === j ? 1 : 0; }));
    });
    for (var c = 0; c < m; c++) {
      var piv = c;
      for (var r = c + 1; r < m; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      var t = M[c]; M[c] = M[piv]; M[piv] = t;
      var d = M[c][c];
      for (var k = 0; k < 2 * m; k++) M[c][k] /= d;
      for (r = 0; r < m; r++) {
        if (r === c) continue;
        var f = M[r][c];
        for (k = 0; k < 2 * m; k++) M[r][k] -= f * M[c][k];
      }
    }
    return M.map(function (r) { return r.slice(m); });
  }
  function mul(A, x) { return A.map(function (r) { return r.reduce(function (s, v, j) { return s + v * x[j]; }, 0); }); }
  function dot(x, y) { return x.reduce(function (s, v, i) { return s + v * y[i]; }, 0); }

  var INV = inverse(SIG);
  var ONE = MU.map(function () { return 1; });
  var invOne = mul(INV, ONE), invMu = mul(INV, MU);
  var A = dot(ONE, invOne), B = dot(ONE, invMu), C = dot(MU, invMu), D = A * C - B * B;
  var gmv = { s: Math.sqrt(1 / A), m: B / A };
  function sigmaAt(m) { return Math.sqrt((A * m * m - 2 * B * m + C) / D); }
  function weightsAt(m) {
    var lam = (C - B * m) / D, gam = (A * m - B) / D;
    return invOne.map(function (v, i) { return lam * v + gam * invMu[i]; });
  }
  // tangency portfolio: w proportional to inverse(Sigma) (mu - rf)
  var ex = mul(INV, MU.map(function (m) { return m - RF; }));
  var tsum = ex.reduce(function (a, b) { return a + b; }, 0);
  var wT = ex.map(function (v) { return v / tsum; });
  var tan = { m: dot(wT, MU), s: Math.sqrt(dot(wT, mul(SIG, wT))) };

  // random long-only portfolios, with weights of varied concentration
  var pts = [], rand = rng(5);
  for (var k = 0; k < NPTS; k++) {
    var pw = 1 + rand() * 5;
    var wv = MU.map(function () { return Math.pow(rand(), pw); });
    var sum = wv.reduce(function (a, b) { return a + b; }, 0);
    wv = wv.map(function (v) { return v / sum; });
    pts.push({ s: Math.sqrt(dot(wv, mul(SIG, wv))), m: dot(wv, MU) });
  }

  var SMAX = 0.34, MMAX = 0.16;
  var w = 0, h = 0, dpr = 1, shown = reduce ? NPTS : 0, visible = true, raf = 0;
  var sel = tan.m, selTarget = tan.m;
  var M = { l: 46, r: 14, t: 16, b: 32 };
  function X(s) { return M.l + s / SMAX * (w - M.l - M.r); }
  function Y(m) { return h - M.b - m / MMAX * (h - M.t - M.b); }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.strokeStyle = 'rgba(143,177,189,0.14)';
    ctx.fillStyle = MIST;
    ctx.lineWidth = 1;
    ctx.textAlign = 'center';
    for (var s = 0; s <= 0.30001; s += 0.05) {
      ctx.beginPath(); ctx.moveTo(X(s), M.t); ctx.lineTo(X(s), h - M.b); ctx.stroke();
      ctx.fillText(Math.round(s * 100) + '%', X(s), h - M.b + 18);
    }
    ctx.textAlign = 'right';
    for (var m = 0; m <= 0.15001; m += 0.05) {
      ctx.beginPath(); ctx.moveTo(M.l, Y(m)); ctx.lineTo(w - M.r, Y(m)); ctx.stroke();
      ctx.fillText(Math.round(m * 100) + '%', M.l - 8, Y(m) + 4);
    }
    ctx.textAlign = 'right';
    ctx.fillText('risk σ', w - M.r - 4, h - M.b - 8);
    ctx.fillText('return μ', w - M.r - 4, M.t + 12);

    // the cloud
    ctx.fillStyle = MIST;
    ctx.globalAlpha = 0.3;
    for (var i = 0; i < shown; i++) ctx.fillRect(X(pts[i].s) - 0.8, Y(pts[i].m) - 0.8, 1.6, 1.6);
    ctx.globalAlpha = 1;

    // the individual assets
    ctx.fillStyle = FOAM;
    MU.forEach(function (mu, j) {
      ctx.beginPath(); ctx.arc(X(VOL[j]), Y(mu), 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillText('A' + (j + 1), X(VOL[j]) + 6, Y(mu) + 4);
    });

    // the capital market line through the tangency portfolio
    var slope = (tan.m - RF) / tan.s;
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = FOAM;
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(X(0), Y(RF)); ctx.lineTo(X(SMAX), Y(RF + slope * SMAX)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // the frontier: efficient upper branch solid, lower branch dashed
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (m = gmv.m; m <= MMAX; m += 0.001) {
      var x = X(sigmaAt(m));
      if (m === gmv.m) ctx.moveTo(x, Y(m)); else ctx.lineTo(x, Y(m));
    }
    ctx.stroke();
    ctx.setLineDash([3, 5]);
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (m = gmv.m; m >= 0.01; m -= 0.001) {
      if (m === gmv.m) ctx.moveTo(X(sigmaAt(m)), Y(m)); else ctx.lineTo(X(sigmaAt(m)), Y(m));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // tangency portfolio
    ctx.strokeStyle = FOAM;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(X(tan.s), Y(tan.m), 7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = FOAM;
    ctx.fillText('tangency', X(tan.s) + 11, Y(tan.m) - 8);

    // the selected frontier point and its weights
    var ss = sigmaAt(sel), wsel = weightsAt(sel);
    ctx.fillStyle = FOAM;
    ctx.beginPath(); ctx.arc(X(ss), Y(sel), 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ACCENT;
    ctx.beginPath(); ctx.arc(X(ss), Y(sel), 3.5, 0, Math.PI * 2); ctx.fill();
    weightsInset(wsel);

    if (read) {
      read.innerHTML = '&sigma; = <b>' + (ss * 100).toFixed(1) + '%</b> &ensp;&mu; = <b>' + (sel * 100).toFixed(1) +
        '%</b> &ensp;Sharpe = <b>' + ((sel - RF) / ss).toFixed(2) + '</b>';
    }
  }

  // weights of the selected portfolio as a small bar chart, top left
  function weightsInset(wv) {
    var x0 = M.l + 16, y0 = M.t + 8, bw = w < 520 ? 12 : 16, gap = 8, hh = 46;
    var zero = y0 + hh * 0.62;
    ctx.fillStyle = MIST;
    ctx.textAlign = 'left';
    ctx.fillText('weights', x0, y0);
    ctx.strokeStyle = 'rgba(143,177,189,0.35)';
    ctx.beginPath(); ctx.moveTo(x0 - 4, zero); ctx.lineTo(x0 + n * (bw + gap), zero); ctx.stroke();
    wv.forEach(function (v, j) {
      var bh = Math.max(-1, Math.min(1.6, v)) * hh * 0.5;
      ctx.fillStyle = v >= 0 ? ACCENT : '#ff6a55';
      ctx.fillRect(x0 + j * (bw + gap), zero - Math.max(bh, 0), bw, Math.abs(bh));
      ctx.fillStyle = MIST;
      ctx.fillText('A' + (j + 1), x0 + j * (bw + gap), zero + hh * 0.45 + 10);
    });
  }

  function frame() {
    raf = 0;
    if (shown < NPTS) shown = Math.min(NPTS, shown + 90);
    sel += (selTarget - sel) * (reduce ? 1 : 0.18);
    draw();
    if (visible && (shown < NPTS || Math.abs(selTarget - sel) > 1e-5)) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = cv.getBoundingClientRect();
    w = r.width; h = r.height;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    kick();
  }

  // pointer across the figure picks a risk level; read the efficient return there
  cv.addEventListener('pointermove', function (e) {
    var r = cv.getBoundingClientRect();
    var s = (e.clientX - r.left - M.l) / (r.width - M.l - M.r) * SMAX;
    s = Math.max(gmv.s, Math.min(sigmaAt(MMAX), s));
    var disc = B * B - A * (C - D * s * s);
    selTarget = (B + Math.sqrt(Math.max(0, disc))) / A;
    kick();
  });
  cv.addEventListener('pointerleave', function () { selTarget = tan.m; kick(); });

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) kick();
    }).observe(cv);
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
  else window.addEventListener('resize', resize);
  resize();
})();
