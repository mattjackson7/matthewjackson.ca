/* Projects page: a live figure on each card, running only while it is on
   screen, plus stats that count up the first time they come into view.
     options   - a call price decaying toward its payoff; the pointer sets spot
     risk      - a Monte Carlo histogram that refills, alternating calm and
                 crisis correlations, with its VaR line sliding between them
     optimizer - a portfolio cloud with a particle climbing to the max-Sharpe
                 point; the pointer picks a point on the frontier */
(function () {
  if (!window.Viz) return;
  var V = Viz, FOAM = V.FOAM, MIST = V.MIST;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS = { options: '#ff6a55', risk: '#ffb14e', optimizer: '#5fd3b0' };

  /* ---------- options ---------- */
  function optionsFig() {
    var K = 100, R = 0.04, SIG = 0.28, spot = 112, spotT = 112, t0 = 0;
    return {
      point: function (fx) { spotT = 62 + fx * 76; },
      draw: function (c, w, h, now) {
        if (!t0) t0 = now;
        var cyc = ((now - t0) / 1000) % 8, T = reduce ? 0.5 : Math.max(0.01, 1 - Math.min(1, cyc / 6.5) * 0.99);
        spot += (spotT - spot) * 0.12;
        var box = { x: 26, y: 14, w: w - 40, h: h - 40 };
        var F = V.frame(c, box, [60, 140], [0, 42], { xticks: [80, 100, 120], xfmt: function (t) { return t === 100 ? 'K' : String(t); } });
        V.plot(c, function (S) { return Math.max(S - K, 0); }, 60, 140, F.X, F.Y, FOAM, { dash: [4, 5], width: 1.2, alpha: 0.55 });
        [1, 0.5, 0.2].forEach(function (Tc) { V.plot(c, function (S) { return V.bsm(S, K, Tc, R, SIG).call; }, 60, 140, F.X, F.Y, MIST, { width: 1, alpha: 0.25 }); });
        V.plot(c, function (S) { return V.bsm(S, K, T, R, SIG).call; }, 60, 140, F.X, F.Y, COLORS.options, { width: 2.2 });
        var b = V.bsm(spot, K, T, R, SIG);
        V.line(c, F.X(spot - 12), F.Y(b.call - 12 * b.delta), F.X(spot + 12), F.Y(b.call + 12 * b.delta), FOAM, { width: 1.4 });
        V.dot(c, F.X(spot), F.Y(b.call), 4, COLORS.options, { halo: true });
        V.text(c, 'T ' + T.toFixed(2) + '   Δ ' + b.delta.toFixed(2) + '   C ' + b.call.toFixed(2), box.x + 8, box.y + 12, { size: 11, color: FOAM });
        return !reduce;
      }
    };
  }

  /* ---------- risk ---------- */
  function riskFig() {
    var vols = [0.18, 0.09, 0.22, 0.20], wts = [0.4, 0.3, 0.15, 0.15], hz = 10 / 252;
    function chol(rho) {
      var S = vols.map(function (a, i) { return vols.map(function (b, j) { return a * b * (i === j ? 1 : rho) * hz; }); });
      var L = S.map(function () { return [0, 0, 0, 0]; });
      for (var j = 0; j < 4; j++) {
        var s = 0, k;
        for (k = 0; k < j; k++) s += L[j][k] * L[j][k];
        L[j][j] = Math.sqrt(S[j][j] - s);
        for (var i = j + 1; i < 4; i++) { s = 0; for (k = 0; k < j; k++) s += L[i][k] * L[j][k]; L[i][j] = (S[i][j] - s) / L[j][j]; }
      }
      return L;
    }
    var regimes = [{ rho: 0.2, L: chol(0.2), name: 'calm ρ = 0.2' }, { rho: 0.8, L: chol(0.8), name: 'crisis ρ = 0.8' }];
    var NB = 46, LO = -0.12, HI = 0.12, NMAX = 9000, r = V.rng(5);
    var reg = 0, n = 0, cnt = new Array(NB).fill(0), prev = null, samples = [], varNow = 0.05, varT = 0.05, hold = 0;
    function reset() { prev = cnt.slice(); n = 0; cnt.fill(0); samples = []; }
    function sample(k) {
      var L = regimes[reg].L;
      for (var q = 0; q < k && n < NMAX; q++) {
        var z = [V.gauss(r), V.gauss(r), V.gauss(r), V.gauss(r)], R = 0;
        for (var i = 0; i < 4; i++) { var x = 0; for (var j = 0; j <= i; j++) x += L[i][j] * z[j]; R += wts[i] * x; }
        samples.push(R); n++;
        var b = Math.floor((R - LO) / (HI - LO) * NB);
        if (b >= 0 && b < NB) cnt[b]++;
      }
      if (n % 600 < k || n >= NMAX) { var s = samples.slice().sort(function (a, b2) { return a - b2; }); varT = -s[Math.floor(0.01 * s.length)]; }
    }
    if (reduce) sample(NMAX);
    return {
      draw: function (c, w, h) {
        if (!reduce) {
          if (n < NMAX) sample(220);
          else if (++hold > 70) { hold = 0; reg = 1 - reg; reset(); }
        }
        varNow += (varT - varNow) * 0.08;
        var box = { x: 10, y: 22, w: w - 20, h: h - 46 }, base = box.y + box.h;
        var X = function (v) { return box.x + (v - LO) / (HI - LO) * box.w; };
        var peak = Math.max(30, Math.max.apply(null, cnt)), bw = box.w / NB;
        // the previous run stays as a faded outline while the new one fills
        if (prev) {
          var pk = Math.max.apply(null, prev), fade = Math.max(0, 1 - n / (NMAX * 0.6));
          V.ga(c, 0.5 * fade); c.strokeStyle = MIST; c.lineWidth = 1;
          c.beginPath();
          prev.forEach(function (ct, b) { var y = base - ct / pk * box.h; if (b) c.lineTo(box.x + b * bw, y); else c.moveTo(box.x, y); c.lineTo(box.x + (b + 1) * bw, y); });
          c.stroke();
          peak = Math.max(peak, n < NMAX ? pk * n / NMAX : 0, 30);
        }
        cnt.forEach(function (ct, b) {
          var mid = LO + (b + 0.5) * (HI - LO) / NB, tail = mid < -varNow;
          V.ga(c, tail ? 0.95 : 0.4);
          c.fillStyle = tail ? COLORS.risk : MIST;
          var bh = ct / peak * box.h;
          c.fillRect(box.x + b * bw + 0.5, base - bh, Math.max(1, bw - 1), bh);
        });
        V.line(c, X(-varNow), box.y - 4, X(-varNow), base, COLORS.risk, { width: 1.6 });
        V.text(c, 'VaR₉₉ ' + (varNow * 100).toFixed(1) + '%', X(-varNow) - 6, box.y + 8, { size: 11, color: COLORS.risk, align: 'right', weight: 500 });
        V.text(c, regimes[reg].name + '   n = ' + n.toLocaleString(), box.x + box.w, box.y + 8, { size: 11, color: FOAM, align: 'right' });
        V.line(c, box.x, base + 0.5, box.x + box.w, base + 0.5, 'rgba(143,177,189,0.35)');
        return !reduce;
      }
    };
  }

  /* ---------- optimizer ---------- */
  function optimizerFig() {
    var MU = [0.085, 0.035, 0.05, 0.07], VOL = [0.18, 0.09, 0.22, 0.20];
    var RHO = [[1, 0.45, 0.25, 0.55], [0.45, 1, 0.15, 0.4], [0.25, 0.15, 1, 0.2], [0.55, 0.4, 0.2, 1]], RF = 0.02;
    var S = RHO.map(function (r, i) { return r.map(function (v, j) { return v * VOL[i] * VOL[j]; }); });
    function mv(w) {
      var Sw = S.map(function (r) { return r.reduce(function (a, v, j) { return a + v * w[j]; }, 0); });
      var v = w.reduce(function (a, x, i) { return a + x * Sw[i]; }, 0), m = w.reduce(function (a, x, i) { return a + x * MU[i]; }, 0);
      return { sd: Math.sqrt(v), m: m, Sw: Sw, v: v };
    }
    function project(v) {
      var u = v.slice().sort(function (a, b) { return b - a; }), cs = 0, th = 0;
      for (var i = 0; i < 4; i++) { cs += u[i]; var t = (cs - 1) / (i + 1); if (u[i] - t > 0) th = t; }
      return v.map(function (x) { return Math.max(0, x - th); });
    }
    var r = V.rng(9), cloud = [], frontier = [];
    for (var k = 0; k < 900; k++) {
      var pw = 1 + r() * 4, w = [0, 0, 0, 0].map(function () { return Math.pow(r(), pw); }), s = V.sum(w);
      w = w.map(function (x) { return x / s; });
      var st = mv(w); cloud.push([st.sd, st.m, w]);
    }
    // the long-only frontier: the upper-left convex hull of the cloud, from the
    // least-risk portfolio up to the highest-return one
    (function () {
      var pts = cloud.slice().sort(function (p, q) { return p[0] - q[0]; });
      var gmv = pts[0], top = cloud.reduce(function (m, p) { return p[1] > m[1] ? p : m; }, cloud[0]);
      var cand = pts.filter(function (p) { return p[0] <= top[0] && p[1] >= gmv[1]; });
      var hull = [];
      cand.forEach(function (p) {
        while (hull.length >= 2) {
          var o = hull[hull.length - 2], a2 = hull[hull.length - 1];
          if ((a2[0] - o[0]) * (p[1] - o[1]) - (a2[1] - o[1]) * (p[0] - o[0]) >= 0) hull.pop(); else break;
        }
        hull.push(p);
      });
      frontier = hull;
    })();
    var wcur = [0.25, 0.25, 0.25, 0.25], trail = [], step = 0, pick = -1, pickT = -1;
    function restart() {
      var w0 = [r(), r(), r(), r()], s0 = V.sum(w0);
      wcur = w0.map(function (x) { return x / s0; }); trail = []; step = 0;
    }
    restart();
    return {
      point: function (fx) { pickT = Math.round(V.clamp(fx, 0, 1) * (frontier.length - 1)); },
      leave: function () { pickT = -1; },
      draw: function (c, w, h) {
        var box = { x: 26, y: 14, w: w - 40, h: h - 40 }, SX = [0.08, 0.215], MY = [0.03, 0.09];
        var F = V.frame(c, box, SX, MY, {});
        V.ga(c, 0.35);
        c.fillStyle = MIST;
        cloud.forEach(function (p) { c.fillRect(F.X(p[0]) - 0.8, F.Y(p[1]) - 0.8, 1.6, 1.6); });
        V.ga(c, 0.9);
        c.strokeStyle = COLORS.optimizer; c.lineWidth = 2;
        c.beginPath();
        frontier.forEach(function (p, i) { if (i) c.lineTo(F.X(p[0]), F.Y(p[1])); else c.moveTo(F.X(p[0]), F.Y(p[1])); });
        c.stroke();
        // the climb: projected gradient ascent on the Sharpe ratio, restarting when it settles
        if (!reduce) {
          for (var q = 0; q < 2; q++) {
            var st = mv(wcur);
            var g = MU.map(function (m, i) { return (m - RF) / st.sd - (st.m - RF) * st.Sw[i] / (st.v * st.sd); });
            var gn = Math.sqrt(V.sum(g.map(function (x) { return x * x; }))) || 1;
            wcur = project(wcur.map(function (x, i) { return x + 0.012 * g[i] / gn; }));
            step++;
          }
          if (step > 160) restart();
        }
        var cur = mv(wcur);
        trail.push([cur.sd, cur.m]); if (trail.length > 60) trail.shift();
        V.ga(c, 0.8); c.strokeStyle = FOAM; c.lineWidth = 1.2;
        c.beginPath();
        trail.forEach(function (p, i) { if (i) c.lineTo(F.X(p[0]), F.Y(p[1])); else c.moveTo(F.X(p[0]), F.Y(p[1])); });
        c.stroke();
        V.dot(c, F.X(cur.sd), F.Y(cur.m), 4, COLORS.optimizer, { halo: true });
        V.text(c, 'Sharpe ' + ((cur.m - RF) / cur.sd).toFixed(3), F.X(cur.sd) + 9, F.Y(cur.m) + 4, { size: 11, color: FOAM });
        // a picked point on the frontier, with its weights
        pick = pickT;
        if (pick >= 0) {
          var p = frontier[pick];
          V.dot(c, F.X(p[0]), F.Y(p[1]), 5, FOAM, {});
          var names = ['EQ', 'CR', 'CM', 'RE'], bx = box.x + box.w - 120, by = box.y + box.h - 70;
          p[2].forEach(function (wv, i) {
            V.text(c, names[i], bx, by + i * 15 + 9, { size: 10 });
            V.ga(c, 0.9); c.fillStyle = COLORS.optimizer; c.fillRect(bx + 24, by + i * 15 + 2, wv * 80, 9);
            V.text(c, Math.round(wv * 100) + '%', bx + 28 + wv * 80, by + i * 15 + 10, { size: 10, color: FOAM });
          });
        }
        V.text(c, 'risk σ →', box.x + box.w, box.y + box.h - 6, { size: 10, align: 'right' });
        V.text(c, 'return μ', box.x + 6, box.y + 10, { size: 10 });
        return true;
      }
    };
  }

  /* ---------- running the figures ---------- */
  var MAKERS = { options: optionsFig, risk: riskFig, optimizer: optimizerFig };
  var figs = [];
  document.querySelectorAll('canvas[data-live]').forEach(function (cv) {
    var make = MAKERS[cv.getAttribute('data-live')];
    if (!make) return;
    var f = { cv: cv, ctx: cv.getContext('2d'), fig: make(), visible: false, w: 0, h: 0, dpr: 1 };
    figs.push(f);
    var wrap = cv.parentElement;
    function at(e) { var r = cv.getBoundingClientRect(); return V.clamp((e.clientX - r.left) / r.width, 0, 1); }
    wrap.addEventListener('pointermove', function (e) { if (f.fig.point) f.fig.point(at(e)); kick(); });
    wrap.addEventListener('pointerleave', function () { if (f.fig.leave) f.fig.leave(); kick(); });
  });
  function size(f) {
    f.dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = f.cv.getBoundingClientRect();
    f.w = r.width; f.h = r.height;
    f.cv.width = Math.round(f.w * f.dpr); f.cv.height = Math.round(f.h * f.dpr);
  }
  var raf = 0;
  function frame(now) {
    raf = 0;
    var again = false;
    figs.forEach(function (f) {
      if (!f.visible && f.drawn) return;
      f.ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
      f.ctx.clearRect(0, 0, f.w, f.h);
      var more = f.fig.draw(f.ctx, f.w, f.h, now);
      f.ctx.globalAlpha = 1;
      f.drawn = true;
      if (more && f.visible) again = true;
    });
    if (again) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  figs.forEach(size);
  window.addEventListener('resize', function () { figs.forEach(function (f) { size(f); f.drawn = false; }); kick(); });
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { figs.forEach(function (f) { if (f.cv === e.target) f.visible = e.isIntersecting; }); });
      kick();
    });
    figs.forEach(function (f) { io.observe(f.cv); });
  } else figs.forEach(function (f) { f.visible = true; });
  kick();

  /* ---------- stats that count up ---------- */
  var stats = document.querySelectorAll('[data-count]');
  function countUp(el) {
    var to = +el.getAttribute('data-count'), pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '';
    if (reduce) return;
    var t0 = 0;
    (function tick(now) {
      if (!t0) t0 = now;
      var t = Math.min(1, (now - t0) / 1100), v = Math.round(to * (1 - Math.pow(1 - t, 3)));
      el.textContent = pre + v.toLocaleString() + suf;
      if (t < 1) requestAnimationFrame(tick);
    })(performance.now());
  }
  if (window.IntersectionObserver) {
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io2.unobserve(e.target); countUp(e.target); } });
    }, { threshold: 0.6 });
    stats.forEach(function (el) { io2.observe(el); });
  }
})();
