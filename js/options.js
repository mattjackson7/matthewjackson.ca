/* Options page: the BSM figure and the binomial-tree navigator. */
(function () {
  var FOAM = '#eaf6f8', MIST = '#8fb1bd', ACCENT = '#ff6a55';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Navigator: a recombining binomial tree ---------- */
  // one price path through the lattice, one node per section (j = net up moves)
  var PATH = [0, 1, 2, 1, 0, -1, 0];
  var STEP = 0.44 / (PATH.length - 1); // across-axis spacing between price levels

  if (window.PathNav) {
    PathNav.create({
      name: 'Binomial tree',
      sections: [
        { id: 'overview', label: 'Overview' },
        { id: 'bsm', label: 'Black-Scholes' },
        { id: 'tree', label: 'Binomial tree' },
        { id: 'greeks', label: 'Greeks' },
        { id: 'iv', label: 'Implied vol' },
        { id: 'results', label: 'Results' },
        { id: 'code', label: 'Code' }
      ],
      cross: function (s) {
        var i = Math.min(PATH.length - 2, Math.floor(s)), f = s - i;
        var j = PATH[i] + f * (PATH[i + 1] - PATH[i]);
        return 0.5 + j * STEP;
      },
      decor: function (d) {
        // every edge of the lattice, faintly
        var n = PATH.length - 1;
        for (var k = 0; k < n; k++) {
          for (var j = -k; j <= k; j += 2) {
            var p = d.toPx(d.a(k), 0.5 + j * STEP);
            [1, -1].forEach(function (m) {
              var q = d.toPx(d.a(k + 1), 0.5 + (j + m) * STEP);
              d.el('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: 'currentColor', 'stroke-opacity': 0.22, 'stroke-width': 1 }, d.g);
            });
          }
        }
        for (k = 0; k <= n; k++) {
          for (j = -k; j <= k; j += 2) {
            var c = d.toPx(d.a(k), 0.5 + j * STEP);
            d.el('circle', { cx: c[0], cy: c[1], r: 1.6, fill: 'currentColor', 'fill-opacity': 0.45 }, d.g);
          }
        }
      }
    });
  }

  /* ---------- Figure: call value against spot, decaying with time ---------- */
  var cv = document.getElementById('fig-options');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var read = document.getElementById('opt-read');

  var K = 100, R = 0.04, SMIN = 50, SMAX = 150, VMAX = 56;
  var spot = 112, sigma = 0.25, sigmaTarget = 0.25;
  var T = 1, cycleStart = 0, visible = true, raf = 0;
  var w = 0, h = 0, dpr = 1;
  var M = { l: 46, r: 14, t: 16, b: 32 };

  function N(x) { // standard normal CDF (Abramowitz and Stegun 7.1.26)
    var t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
    return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
  }
  function pdf(x) { return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI); }

  function bsm(S, T, sig) {
    if (T < 1e-6) return { C: Math.max(S - K, 0), delta: S > K ? 1 : 0, gamma: 0, vega: 0 };
    var sq = Math.sqrt(T);
    var d1 = (Math.log(S / K) + (R + sig * sig / 2) * T) / (sig * sq), d2 = d1 - sig * sq;
    return {
      C: S * N(d1) - K * Math.exp(-R * T) * N(d2),
      delta: N(d1),
      gamma: pdf(d1) / (S * sig * sq),
      vega: S * pdf(d1) * sq / 100 // per volatility point
    };
  }

  function X(S) { return M.l + (S - SMIN) / (SMAX - SMIN) * (w - M.l - M.r); }
  function Y(V) { return h - M.b - V / VMAX * (h - M.t - M.b); }

  function curve(Tc) {
    ctx.beginPath();
    for (var S = SMIN; S <= SMAX; S += 0.5) {
      var y = Y(Math.min(VMAX, bsm(S, Tc, sigma).C));
      if (S === SMIN) ctx.moveTo(X(S), y); else ctx.lineTo(X(S), y);
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // axes and grid
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = MIST;
    ctx.strokeStyle = 'rgba(143,177,189,0.14)';
    ctx.lineWidth = 1;
    ctx.textAlign = 'center';
    for (var S = 60; S <= 140; S += 20) {
      ctx.beginPath(); ctx.moveTo(X(S), M.t); ctx.lineTo(X(S), h - M.b); ctx.stroke();
      ctx.fillText(S === 100 ? 'K = 100' : String(S), X(S), h - M.b + 18);
    }
    ctx.textAlign = 'right';
    for (var V = 0; V <= 50; V += 10) {
      ctx.beginPath(); ctx.moveTo(M.l, Y(V)); ctx.lineTo(w - M.r, Y(V)); ctx.stroke();
      ctx.fillText(String(V), M.l - 8, Y(V) + 4);
    }

    // payoff at expiry
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = FOAM;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(X(SMIN), Y(0)); ctx.lineTo(X(K), Y(0)); ctx.lineTo(X(SMAX), Y(Math.min(VMAX, SMAX - K)));
    ctx.stroke();
    ctx.setLineDash([]);

    // a fan of fixed expiries for reference
    ctx.strokeStyle = MIST;
    ctx.globalAlpha = 0.28;
    [1, 0.5, 0.25].forEach(function (Tc) { curve(Tc); ctx.stroke(); });

    // the live curve
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2.2;
    curve(T);
    ctx.stroke();

    // spot marker, value, and the delta tangent
    var g = bsm(spot, T, sigma);
    var px = X(spot), py = Y(Math.min(VMAX, g.C));
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = MIST;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(px, h - M.b); ctx.lineTo(px, py); ctx.stroke();
    ctx.setLineDash([]);
    var span = 12;
    ctx.strokeStyle = FOAM;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(X(spot - span), Y(g.C - g.delta * span));
    ctx.lineTo(X(spot + span), Y(g.C + g.delta * span));
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = FOAM;
    ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ACCENT;
    ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = MIST;
    ctx.fillText('T = ' + T.toFixed(2) + ' y', M.l + 10, M.t + 14);
    ctx.fillText('σ = ' + sigma.toFixed(2), M.l + 10, M.t + 30);

    if (read) {
      read.innerHTML = 'S = <b>' + spot.toFixed(1) + '</b> &ensp;C = <b>' + g.C.toFixed(2) +
        '</b> &ensp;&Delta; = <b>' + g.delta.toFixed(2) + '</b> &ensp;&Gamma; = <b>' + g.gamma.toFixed(3) +
        '</b> &ensp;&nu; = <b>' + g.vega.toFixed(2) + '</b>';
    }
  }

  function frame(now) {
    raf = 0;
    if (!cycleStart) cycleStart = now;
    // expiry runs from one year down to almost nothing, holds, then resets
    var t = (now - cycleStart) / 1000;
    if (t > 9) { cycleStart = now; t = 0; }
    T = reduce ? 0.5 : Math.max(0.01, 1 - Math.min(1, t / 7.5) * 0.99);
    sigma += (sigmaTarget - sigma) * 0.15;
    draw();
    if (visible && !reduce) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = cv.getBoundingClientRect();
    w = r.width; h = r.height;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    if (w < 480) M.l = 34;
    kick();
  }

  cv.addEventListener('pointermove', function (e) {
    var r = cv.getBoundingClientRect();
    var fx = (e.clientX - r.left - M.l) / (r.width - M.l - M.r);
    var fy = (e.clientY - r.top) / r.height;
    spot = Math.max(SMIN + 1, Math.min(SMAX - 1, SMIN + fx * (SMAX - SMIN)));
    sigmaTarget = 0.1 + (1 - Math.max(0, Math.min(1, fy))) * 0.5;
    kick();
  });

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
