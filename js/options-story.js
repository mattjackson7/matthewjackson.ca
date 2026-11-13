/* Options page scroll stories: Black-Scholes-Merton, the binomial tree, the
   Greeks, and implied volatility. Every number is computed here: Monte Carlo
   against the closed form, the tree's backward induction, finite-difference
   errors in double precision, and Newton-Raphson iterates. The implied
   volatility smile at the end comes from a synthetic market with a skew. */
(function () {
  if (!window.Story || !window.Viz) return;
  var V = Viz, FOAM = V.FOAM, MIST = V.MIST, DEEP = V.DEEP;
  var ACC = '#ff6a55', RGB = '255,106,85', BLUE = '#7cc4ff';
  var S0 = 100, K = 100, R = 0.04, SIG = 0.25, T = 1;

  // a short crossfade from the previous beat's final frame, as on the other pages
  function scene(beats, caps) {
    return {
      draw: function (c, s) {
        var b = Math.min(beats.length - 1, s.step), inA = b > 0 ? V.ease(V.seg(s.p, 0, 0.1)) : 1;
        if (inA < 1) V.faded(1 - inA, function () { beats[b - 1](c, s.w, s.h, 1); });
        V.faded(inA, function () { beats[b](c, s.w, s.h, V.seg(s.p, 0.06, 0.94)); });
        c.globalAlpha = 1;
      },
      caption: function (s) { return caps[Math.min(caps.length - 1, s.step)](V.seg(s.p, 0.06, 0.94)); }
    };
  }
  function f2(x) { return x.toFixed(2); }

  /* ================= 1. Black-Scholes-Merton ================= */
  var rr = V.rng(11), NP = 110, NSTEP = 64, PATHS = [];
  for (var i = 0; i < NP; i++) {
    var pth = [S0], s = S0;
    for (var k = 0; k < NSTEP; k++) {
      s *= Math.exp((R - SIG * SIG / 2) * (T / NSTEP) + SIG * Math.sqrt(T / NSTEP) * V.gauss(rr));
      pth.push(s);
    }
    PATHS.push(pth);
  }
  var NT = 6000, ST = [];
  for (i = 0; i < NT; i++) ST.push(S0 * Math.exp((R - SIG * SIG / 2) * T + SIG * Math.sqrt(T) * V.gauss(rr)));
  var PAY = ST.map(function (x) { return Math.max(x - K, 0); });
  var EPAY = V.mean(PAY), DISC = Math.exp(-R * T), CMC = DISC * EPAY;
  var SEMC = DISC * Math.sqrt(V.mean(PAY.map(function (x) { return (x - EPAY) * (x - EPAY); })) / NT);
  var B0 = V.bsm(S0, K, T, R, SIG);
  var SLO = 40, SHI = 220, NB = 45;
  var HIST = new Array(NB).fill(0);
  ST.forEach(function (x) { var b = Math.floor((x - SLO) / (SHI - SLO) * NB); if (b >= 0 && b < NB) HIST[b]++; });
  var HMAX = Math.max.apply(null, HIST);


  // one path, delta-hedged daily and weekly: the P&L of the option alone and of the hedged book
  var HN = 252, HS_ = [S0], HD = [], HU = [0], HH = [0], HW = [0];
  (function () {
    var hr = V.rng(29), dt = T / HN;
    for (var k = 1; k <= HN; k++) HS_.push(HS_[k - 1] * Math.exp((0.08 - SIG * SIG / 2) * dt + SIG * Math.sqrt(dt) * V.gauss(hr)));
    var val = function (k) { return V.bsm(HS_[k], K, T - k * dt, R, SIG); };
    var wDelta = 0, cu = 0, ch = 0, cw = 0;
    for (k = 0; k < HN; k++) {
      var b = val(k), b1 = val(k + 1), dV = b1.call - b.call, dS = HS_[k + 1] - HS_[k];
      if (k % 5 === 0) wDelta = b.delta;
      HD.push(b.delta);
      cu += dV;
      // the hedged book: long the option, short delta shares, the rest in cash at r
      ch += dV - b.delta * dS - R * (b.call - b.delta * HS_[k]) * dt;
      cw += dV - wDelta * dS - R * (b.call - wDelta * HS_[k]) * dt;
      HU.push(cu); HH.push(ch); HW.push(cw);
    }
    HD.push(HS_[HN] > K ? 1 : 0);
  })();

  // the four terms of the PDE at (S, time to expiry tau); they sum to zero
  function PDETERMS(Sx, tau) {
    var b = V.bsm(Sx, K, tau, R, SIG);
    var theta = -Sx * V.pdf(b.d1) * SIG / (2 * Math.sqrt(tau)) - R * K * Math.exp(-R * tau) * V.N(b.d2);
    return { v: b.call, theta: theta, gamma: 0.5 * SIG * SIG * Sx * Sx * b.gamma, delta: R * Sx * b.delta, disc: -R * b.call };
  }

  // Crank-Nicolson for V_tau = 1/2 sigma^2 S^2 V_SS + r S V_S - r V, marched from the payoff
  var CN_DS = 2, CN_M = 150, CN_STEPS = 100, CN = [], CN_PRICE = 0, CN_ERR = 0;
  (function () {
    var dt = T / CN_STEPS, Vv = [], i, n;
    for (i = 0; i <= CN_M; i++) Vv.push(Math.max(i * CN_DS - K, 0));
    CN.push(Vv.slice());
    var al = [], be = [], ga = [];
    for (i = 0; i <= CN_M; i++) {
      al.push(0.25 * dt * (SIG * SIG * i * i - R * i));
      be.push(-0.5 * dt * (SIG * SIG * i * i + R));
      ga.push(0.25 * dt * (SIG * SIG * i * i + R * i));
    }
    for (n = 1; n <= CN_STEPS; n++) {
      var tau = n * dt, rhs = [], lo = [], di = [], up = [];
      var top = CN_M * CN_DS - K * Math.exp(-R * tau);
      for (i = 1; i < CN_M; i++) {
        rhs.push(al[i] * Vv[i - 1] + (1 + be[i]) * Vv[i] + ga[i] * Vv[i + 1]);
        lo.push(-al[i]); di.push(1 - be[i]); up.push(-ga[i]);
      }
      rhs[rhs.length - 1] += ga[CN_M - 1] * top;  // the known boundary at S_max
      // Thomas algorithm for the tridiagonal system
      var m = rhs.length;
      for (i = 1; i < m; i++) { var wq = lo[i] / di[i - 1]; di[i] -= wq * up[i - 1]; rhs[i] -= wq * rhs[i - 1]; }
      var x = new Array(m);
      x[m - 1] = rhs[m - 1] / di[m - 1];
      for (i = m - 2; i >= 0; i--) x[i] = (rhs[i] - up[i] * x[i + 1]) / di[i];
      Vv = [0].concat(x, [top]);
      if (n % 2 === 0) CN.push(Vv.slice());
    }
    CN_PRICE = Vv[Math.round(S0 / CN_DS)];
    for (i = Math.round(40 / CN_DS); i <= Math.round(200 / CN_DS); i++) CN_ERR = Math.max(CN_ERR, Math.abs(Vv[i] - V.bsm(i * CN_DS, K, T, R, SIG).call));
  })();

  var bsmBeats = [
    // 1.1 paths under the risk-neutral measure, piling up into a distribution at expiry
    function (c, w, h, p) {
      var box = { x: 40, y: 24, w: w * 0.6 - 40, h: h - 60 }, hx = w * 0.6 + 14, hw = w - hx - 10;
      var F = V.frame(c, box, [0, T], [SLO, SHI], { xticks: [0, 0.5, 1], yticks: [50, 100, 150, 200], xlabel: 't (years)', ylabel: 'S' });
      var upto = Math.max(1, Math.floor(V.ease(V.seg(p, 0, 0.6)) * NSTEP));
      PATHS.forEach(function (pt, j) {
        var hi = j < 3;
        V.ga(c, hi ? 0.95 : 0.22);
        c.strokeStyle = hi ? ACC : MIST;
        c.lineWidth = hi ? 1.6 : 1;
        c.beginPath();
        for (var k2 = 0; k2 <= upto; k2++) { var x = F.X(k2 / NSTEP * T), y = F.Y(V.clamp(pt[k2], SLO, SHI)); if (k2) c.lineTo(x, y); else c.moveTo(x, y); }
        c.stroke();
      });
      V.line(c, box.x, F.Y(K), w - 10, F.Y(K), FOAM, { dash: [4, 5], alpha: 0.6 });
      V.text(c, 'K', w - 12, F.Y(K) - 5, { size: 11, color: FOAM, align: 'right' });
      // the terminal values fall into a histogram on their side
      var fill = V.ease(V.seg(p, 0.45, 1)), n = Math.floor(fill * NT), cnt = new Array(NB).fill(0);
      for (var q = 0; q < n; q++) { var b = Math.floor((ST[q] - SLO) / (SHI - SLO) * NB); if (b >= 0 && b < NB) cnt[b]++; }
      var bh = box.h / NB;
      cnt.forEach(function (ct, b2) {
        if (!ct) return;
        V.ga(c, 0.55);
        c.fillStyle = MIST;
        c.fillRect(hx, F.Y(SLO + (b2 + 1) * (SHI - SLO) / NB) + 0.5, ct / HMAX * hw, Math.max(1, bh - 1));
      });
      if (fill > 0) V.text(c, 'Sₜ at expiry', hx, box.y + 10, { size: 10, alpha: fill });
    },
    // 1.2 apply the payoff, average it, discount it
    function (c, w, h, p) {
      var narrow = w < 520, box = { x: 34, y: 30, w: (narrow ? w - 50 : w * 0.66 - 34), h: narrow ? h * 0.5 : h - 70 };
      var F = V.frame(c, box, [SLO, SHI], [0, 1], { xticks: [50, 100, 150, 200], xlabel: 'Sₜ' });
      var kill = V.ease(V.seg(p, 0.15, 0.4)), avg = V.ease(V.seg(p, 0.45, 0.7)), dsc = V.ease(V.seg(p, 0.74, 0.95));
      var bw = box.w / NB;
      HIST.forEach(function (ct, b) {
        var mid = SLO + (b + 0.5) * (SHI - SLO) / NB, itm = mid > K;
        var hh = ct / HMAX * box.h * 0.8 * (itm ? 1 : 1 - 0.85 * kill);
        V.ga(c, itm ? 0.45 + 0.5 * kill : 0.5);
        c.fillStyle = itm ? (kill > 0 ? ACC : MIST) : MIST;
        c.fillRect(box.x + b * bw + 0.5, box.y + box.h - hh, Math.max(1, bw - 1), hh);
      });
      // the payoff line, on its own scale
      var PY = function (v) { return box.y + box.h - v / 120 * box.h; };
      V.ga(c, kill);
      c.strokeStyle = FOAM;
      c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(F.X(SLO), PY(0)); c.lineTo(F.X(K), PY(0)); c.lineTo(F.X(SHI), PY(SHI - K)); c.stroke();
      V.text(c, 'payoff (Sₜ − K)⁺', F.X(SHI) - 4, PY(SHI - K) + 16, { size: 10, color: FOAM, align: 'right', alpha: kill });
      // the average payoff, then discounted to today
      var px = narrow ? box.x + 20 : box.x + box.w + 34, pw = narrow ? 50 : Math.min(60, w - px - 40);
      var py = narrow ? box.y + box.h + 50 : box.y, ph = narrow ? h - py - 30 : box.h;
      var BY = function (v) { return py + ph - v / 20 * ph; };
      if (avg > 0) {
        var val = V.lerp(EPAY, CMC, dsc);
        V.ga(c, avg);
        c.fillStyle = ACC;
        c.fillRect(px, BY(val), pw, py + ph - BY(val));
        V.text(c, (dsc > 0.5 ? 'Cₘᴄ ' : 'E[payoff] ') + val.toFixed(2), px + pw / 2, Math.min(BY(val), BY(B0.call)) - 14, { size: 11, color: FOAM, align: 'center', weight: 500, alpha: avg });
        if (dsc > 0) {
          V.line(c, px - 6, BY(B0.call), px + pw + 6, BY(B0.call), FOAM, { width: 1.6, dash: [3, 3], alpha: dsc });
          V.text(c, 'BSM ' + B0.call.toFixed(2), px + pw + 8, BY(B0.call) + 4, { size: 10, color: FOAM, alpha: dsc });
          V.text(c, '× e⁻ʳᵀ', px + pw / 2, py + ph + 16, { size: 10, color: ACC, align: 'center', alpha: dsc });
        }
      }
    },
    // 1.3 delta hedging: the randomness cancels
    function (c, w, h, p) {
      var n = Math.max(2, Math.round(V.ease(V.seg(p, 0, 0.9)) * HN));
      var top = { x: 46, y: 24, w: w - 80, h: h * 0.24 }, mid = { x: 46, y: top.y + top.h + 34, w: w - 80, h: h * 0.14 }, bot = { x: 46, y: mid.y + mid.h + 40, w: w - 80, h: h - mid.y - mid.h - 74 };
      var smin = Math.min.apply(null, HS_), smax = Math.max.apply(null, HS_);
      var F = V.frame(c, top, [0, T], [smin - 2, smax + 2], { ylabel: 'Sₜ, one path' });
      var series = function (box, Fx, arr, col, wd, dash) {
        V.ga(c, 1);
        c.strokeStyle = col; c.lineWidth = wd || 1.5; c.setLineDash(dash || []);
        c.beginPath();
        for (var k2 = 0; k2 < n && k2 < arr.length; k2++) { var x = Fx.X(k2 / HN * T), y = Fx.Y(arr[k2]); if (k2) c.lineTo(x, y); else c.moveTo(x, y); }
        c.stroke(); c.setLineDash([]);
      };
      series(top, F, HS_, FOAM, 1.4);
      var M = V.frame(c, mid, [0, T], [0, 1], { yticks: [0, 1], ylabel: 'Δₜ = N(d₁): shares held short' });
      series(mid, M, HD, ACC, 1.6);
      var lim = Math.max(Math.abs(Math.min.apply(null, HU)), Math.abs(Math.max.apply(null, HU))) * 1.1;
      var P = V.frame(c, bot, [0, T], [-lim, lim], { xticks: [0, 0.5, 1], yticks: [-Math.round(lim), 0, Math.round(lim)], xlabel: 't', ylabel: 'cumulative P&L' });
      V.line(c, bot.x, P.Y(0), bot.x + bot.w, P.Y(0), 'rgba(143,177,189,0.35)', { dash: [3, 4] });
      series(bot, P, HU, ACC, 1.6);
      series(bot, P, HW, MIST, 1.2, [4, 3]);
      series(bot, P, HH, FOAM, 2);
      var i2 = Math.min(n, HN) - 1;
      V.text(c, 'option alone ' + HU[i2].toFixed(2), bot.x + bot.w, P.Y(HU[i2]) - 6, { size: 10, color: ACC, align: 'right' });
      V.text(c, 'hedged daily ' + HH[i2].toFixed(2), bot.x + 6, bot.y + bot.h - 6, { size: 10, color: FOAM });
      V.text(c, 'hedged weekly', bot.x + 130, bot.y + bot.h - 6, { size: 10, color: MIST });
      // a zoomed inset: what the hedge leaves behind
      var zl2 = Math.max(Math.max.apply(null, HH.map(Math.abs)), Math.max.apply(null, HW.map(Math.abs))) * 1.15;
      var ib = { x: bot.x + bot.w * 0.58, y: bot.y + bot.h * 0.56, w: bot.w * 0.4, h: bot.h * 0.3 };
      V.ga(c, 0.95);
      c.fillStyle = DEEP;
      c.fillRect(ib.x - 4, ib.y - 4, ib.w + 8, ib.h + 18);
      var Z = V.frame(c, ib, [0, T], [-zl2, zl2], {});
      V.line(c, ib.x, Z.Y(0), ib.x + ib.w, Z.Y(0), 'rgba(143,177,189,0.35)', { dash: [3, 4] });
      series(ib, Z, HW, MIST, 1.1, [4, 3]);
      series(ib, Z, HH, FOAM, 1.5);
      V.text(c, 'hedged only, \u00b1' + zl2.toFixed(2), ib.x + 4, ib.y + ib.h + 12, { size: 9 });
    },
    // 1.4 the PDE: four terms that always cancel
    function (c, w, h, p) {
      var Sx = V.lerp(62, 138, V.ease(p)), tau = 0.5, tm = PDETERMS(Sx, tau);
      var top = { x: 46, y: 26, w: w - 80, h: h * 0.3 };
      var F = V.frame(c, top, [55, 145], [0, 45], { xticks: [60, 80, 100, 120, 140], yticks: [0, 20, 40], ylabel: 'V(S), T − t = 0.5' });
      V.plot(c, function (x) { return V.bsm(x, K, tau, R, SIG).call; }, 55, 145, F.X, F.Y, FOAM);
      V.dot(c, F.X(Sx), F.Y(tm.v), 4.5, ACC, { halo: true });
      // waterfall: each term stacks on the last, and the total returns to zero
      var names = ['∂V/∂t', '½σ²S² ∂²V/∂S²', 'rS ∂V/∂S', '−rV'];
      var vals = [tm.theta, tm.gamma, tm.delta, tm.disc], lim = 12;
      var box = { x: 46, y: top.y + top.h + 50, w: w - 80, h: h - top.y - top.h - 96 };
      var Y = function (v) { return box.y + box.h / 2 - v / lim * box.h / 2; };
      V.line(c, box.x, Y(0), box.x + box.w, Y(0), 'rgba(234,246,248,0.5)', { width: 1.2 });
      V.text(c, '0', box.x - 8, Y(0) + 4, { size: 10, align: 'right' });
      var cum = 0, bw = box.w / 5.6;
      vals.forEach(function (v, j) {
        var x = box.x + j * bw * 1.2 + 6, y0 = Y(cum), y1 = Y(cum + v);
        V.ga(c, 0.85);
        c.fillStyle = v >= 0 ? ACC : BLUE;
        c.fillRect(x, Math.min(y0, y1), bw, Math.max(1.5, Math.abs(y1 - y0)));
        V.line(c, x + bw, y1, x + bw * 1.2 + 6, y1, 'rgba(234,246,248,0.4)', { dash: [2, 2] });
        V.text(c, (v >= 0 ? '+' : '') + v.toFixed(2), x + bw / 2, Math.min(y0, y1) - 6, { size: 10, color: FOAM, align: 'center' });
        V.text(c, names[j], x + bw / 2, box.y + box.h + 16, { size: w < 520 ? 8 : 10, align: 'center' });
        cum += v;
      });
      var sx = box.x + 4 * bw * 1.2 + 6;
      V.dot(c, sx + bw / 2, Y(cum), 5, FOAM, {});
      V.text(c, 'sum ' + V.sci(Math.abs(cum) || 1e-17), sx + bw / 2, Y(0) - 12, { size: 10, color: FOAM, align: 'center', weight: 500 });
    },
    // 1.5 Crank-Nicolson, run backward from the payoff
    function (c, w, h, p) {
      var narrow = w < 560, f = V.ease(V.seg(p, 0, 0.92)), snap = f * (CN.length - 1), si = Math.floor(snap), fr = snap - si;
      var tau = snap / (CN.length - 1) * T;
      var cur = CN[si].map(function (v, j) { return si + 1 < CN.length ? V.lerp(v, CN[si + 1][j], fr) : v; });
      var hp = narrow ? { x: 40, y: 26, w: w - 60, h: h * 0.36 } : { x: 40, y: 30, w: w * 0.42, h: h - 80 };
      var cp = narrow ? { x: 40, y: hp.y + hp.h + 50, w: w - 60, h: h - hp.y - hp.h - 84 } : { x: w * 0.42 + 80, y: 30, w: w * 0.58 - 100, h: h - 80 };
      // the (S, tau) grid, filled row by row as the solver marches
      var H = V.frame(c, hp, [40, 200], [0, T], { xticks: [50, 100, 150, 200], yticks: [0, 0.5, 1], xlabel: 'S', ylabel: 'time to expiry τ' });
      var rows = CN.length, cw = hp.w / ((200 - 40) / CN_DS), rh = hp.h / (rows - 1);
      for (var r2 = 0; r2 <= si; r2++) {
        for (var i3 = Math.round(40 / CN_DS); i3 <= Math.round(200 / CN_DS); i3++) {
          var v = CN[r2][i3];
          V.ga(c, 0.12 + 0.75 * Math.min(1, v / 100));
          c.fillStyle = ACC;
          c.fillRect(H.X(i3 * CN_DS) - cw / 2, H.Y(r2 / (rows - 1) * T) - rh / 2, cw + 0.5, rh + 0.5);
        }
      }
      // the stencil: three known values feed one new one
      var sk = Math.round(K / CN_DS), yNow = H.Y(tau), yPrev = H.Y(Math.max(0, tau - T / (rows - 1)));
      [-1, 0, 1].forEach(function (d) { V.dot(c, H.X((sk + d * 4) * CN_DS), yPrev, 3.5, FOAM, {}); V.line(c, H.X((sk + d * 4) * CN_DS), yPrev, H.X(sk * CN_DS), yNow, FOAM, { alpha: 0.7 }); });
      V.dot(c, H.X(sk * CN_DS), yNow, 4.5, ACC, { halo: true });
      // the current slice, against the closed form
      var Cp = V.frame(c, cp, [40, 200], [0, 105], { xticks: [50, 100, 150, 200], yticks: [0, 50, 100], xlabel: 'S', ylabel: 'V(S, τ)' });
      if (tau > 0.002) V.plot(c, function (x) { return V.bsm(x, K, tau, R, SIG).call; }, 40, 200, Cp.X, Cp.Y, FOAM, { dash: [4, 4], width: 1.2, alpha: 0.8 });
      else V.plot(c, function (x) { return Math.max(x - K, 0); }, 40, 200, Cp.X, Cp.Y, FOAM, { dash: [4, 4], width: 1.2, alpha: 0.8 });
      V.ga(c, 1);
      c.strokeStyle = ACC; c.lineWidth = 2.2;
      c.beginPath();
      for (var i4 = Math.round(40 / CN_DS), first = true; i4 <= Math.round(200 / CN_DS); i4++) { var x4 = Cp.X(i4 * CN_DS), y4 = Cp.Y(cur[i4]); if (first) { c.moveTo(x4, y4); first = false; } else c.lineTo(x4, y4); }
      c.stroke();
      V.text(c, 'τ = ' + tau.toFixed(2), cp.x + 6, cp.y + 26, { size: 12, color: ACC, weight: 500 });
      V.text(c, 'solver —  closed form - -', cp.x + 6, cp.y + 44, { size: 10 });
    },
    // 1.6 the closed form: one Gaussian, shifted by sigma root T
    function (c, w, h, p) {
      var box = { x: 30, y: 30, w: w - 60, h: h * 0.42 };
      var F = V.frame(c, box, [-3.5, 3.5], [0, 0.45], { xticks: [-3, -2, -1, 0, 1, 2, 3], xlabel: 'z' });
      var a = V.ease(V.seg(p, 0, 0.25)), sh = V.ease(V.seg(p, 0.3, 0.55)), fm = V.seg(p, 0.6, 1);
      var cut = -B0.d2, shift = SIG * Math.sqrt(T) * sh;
      function area(off, col, al) {
        V.ga(c, al);
        c.fillStyle = col;
        c.beginPath(); c.moveTo(F.X(cut), F.Y(0));
        for (var x = cut; x <= 3.5; x += 0.02) c.lineTo(F.X(x), F.Y(V.pdf(x - off)));
        c.lineTo(F.X(3.5), F.Y(0)); c.closePath(); c.fill();
      }
      area(0, 'rgba(' + RGB + ',0.4)', a * (1 - 0.5 * sh));
      if (sh > 0) area(shift, 'rgba(' + RGB + ',0.3)', sh);
      V.plot(c, V.pdf, -3.5, 3.5, F.X, F.Y, FOAM, { width: 1.6 });
      if (sh > 0) V.plot(c, function (x) { return V.pdf(x - shift); }, -3.5, 3.5, F.X, F.Y, ACC, { width: 1.8 });
      V.line(c, F.X(cut), F.Y(0), F.X(cut), box.y - 4, ACC, { width: 1.4, alpha: a });
      V.text(c, 'Sₜ > K  ⇔  z > −d₂', F.X(cut) - 6, box.y + 8, { size: 11, color: ACC, weight: 500, align: 'right', alpha: a });
      if (sh > 0) {
        V.line(c, F.X(0), F.Y(0.43), F.X(shift), F.Y(0.43), FOAM, { width: 1.4, alpha: sh });
        V.text(c, 'shift σ√T = ' + (SIG * Math.sqrt(T)).toFixed(2), F.X(shift) + 30, F.Y(0.43) + 4, { size: 10, color: FOAM, alpha: sh });
      }
      var n2 = V.N(B0.d2), n1now = 1 - V.N(cut - shift);
      V.text(c, 'N(d₂) = ' + n2.toFixed(4) + '  (probability of exercise)', box.x, box.y + box.h + 34, { size: 12, color: FOAM, alpha: a });
      V.text(c, (sh < 1 ? 'shifting: ' : 'N(d₁) = ') + n1now.toFixed(4) + '  (same region, share measure)', box.x, box.y + box.h + 56, { size: 12, color: ACC, alpha: sh });
      var disc = K * Math.exp(-R * T), fs = V.clamp(w / 44, 11, 15), ly = box.y + box.h + 92, gap = fs * 1.9;
      if (ly + 2 * gap + 4 > h) { fs = Math.max(9, fs * 0.85); gap = fs * 1.5; ly = Math.max(box.y + box.h + 56 + gap, Math.min(ly, h - 4 - 2 * gap)); }
      var lines = [
        'C = S·N(d₁) − K e⁻ʳᵀ·N(d₂)',
        '  = ' + S0 + ' × ' + V.N(B0.d1).toFixed(4) + ' − ' + disc.toFixed(2) + ' × ' + n2.toFixed(4) + ' = ' + B0.call.toFixed(3),
        'PDE solver: ' + CN_PRICE.toFixed(3) + '   Monte Carlo: ' + CMC.toFixed(3) + ' ± ' + (1.96 * SEMC).toFixed(3)
      ];
      lines.forEach(function (ln, j) {
        var al = V.ease(V.seg(fm, j * 0.3, j * 0.3 + 0.28));
        V.text(c, ln, box.x, ly + j * gap, { size: fs, color: j === 1 ? ACC : j === 2 ? MIST : FOAM, weight: j === 1 ? 500 : 400, alpha: al });
      });
    }
  ];
  Story.scene('bsm', scene(bsmBeats, [
    function () { return NP + ' simulated paths of dS = rS dt + σS dW, with r = ' + R + ' and σ = ' + SIG + ', and ' + NT.toLocaleString() + ' draws of S<sub>T</sub>.'; },
    function () { return 'E[(S<sub>T</sub> − K)<sup>+</sup>] = <b>' + f2(EPAY) + '</b>, discounted: <b>' + CMC.toFixed(3) + '</b>. Closed form: <b>' + B0.call.toFixed(3) + '</b>.'; },
    function () { return 'Over the year the option alone swings by up to <b>' + Math.max.apply(null, HU.map(Math.abs)).toFixed(1) + '</b>; hedged daily, the P&amp;L stays within <b>' + Math.max.apply(null, HH.map(Math.abs)).toFixed(2) + '</b>. Weekly: <b>' + Math.max.apply(null, HW.map(Math.abs)).toFixed(2) + '</b>.'; },
    function (p) { var Sx = V.lerp(62, 138, V.ease(p)), tm = PDETERMS(Sx, 0.5); return 'At S = <b>' + Sx.toFixed(1) + '</b>: ' + tm.theta.toFixed(3) + ' + ' + tm.gamma.toFixed(3) + ' + ' + tm.delta.toFixed(3) + ' − ' + Math.abs(tm.disc).toFixed(3) + ' = <b>' + V.sci(Math.abs(tm.theta + tm.gamma + tm.delta + tm.disc) || 1e-17) + '</b>.'; },
    function () { return 'Crank-Nicolson on a ' + (CN_M + 1) + '-point grid with ' + CN_STEPS + ' time steps. Largest gap to the closed form at expiry τ = 1: <b>' + V.sci(CN_ERR) + '</b>.'; },
    function () { var inside = Math.abs(B0.call - CMC) <= 1.96 * SEMC; return 'Three routes to one number: closed form <b>' + B0.call.toFixed(3) + '</b>, PDE <b>' + CN_PRICE.toFixed(3) + '</b>, Monte Carlo ' + CMC.toFixed(3) + (inside ? ' (interval contains the closed form)' : '') + '.'; }
  ]));

  /* ================= 2. The binomial tree ================= */
  var NT2 = 5, DT = T / NT2, U = Math.exp(SIG * Math.sqrt(DT)), D = 1 / U;
  var PU = (Math.exp(R * DT) - D) / (U - D), DF = Math.exp(-R * DT);
  function treeVals(american) {
    var vals = [], ex = [];
    for (var n = NT2; n >= 0; n--) {
      vals[n] = []; ex[n] = [];
      for (var j = 0; j <= n; j++) {
        var Sx = S0 * Math.pow(U, j) * Math.pow(D, n - j), intr = Math.max(K - Sx, 0);
        if (n === NT2) { vals[n][j] = intr; ex[n][j] = false; continue; }
        var cont = DF * (PU * vals[n + 1][j + 1] + (1 - PU) * vals[n + 1][j]);
        ex[n][j] = american && intr > cont + 1e-12;
        vals[n][j] = american ? Math.max(cont, intr) : cont;
      }
    }
    return { v: vals, ex: ex };
  }
  var EU = treeVals(false), AM = treeVals(true);
  // convergence of the tree to BSM, for a European call
  function treeCall(n) {
    var dt = T / n, u = Math.exp(SIG * Math.sqrt(dt)), d = 1 / u, pu = (Math.exp(R * dt) - d) / (u - d), df = Math.exp(-R * dt), v = [];
    for (var j = 0; j <= n; j++) v.push(Math.max(S0 * Math.pow(u, j) * Math.pow(d, n - j) - K, 0));
    for (var m = n - 1; m >= 0; m--) for (j = 0; j <= m; j++) v[j] = df * (pu * v[j + 1] + (1 - pu) * v[j]);
    return v[0];
  }
  var CONV = [];
  for (var nn = 1; nn <= 160; nn++) CONV.push(treeCall(nn));

  function treeLayout(w, h) {
    var mx = 44, colw = (w - 2 * mx) / NT2, vstep = Math.min((h - 90) / (2 * NT2), colw * 0.42);
    var r = Math.max(10, Math.min(19, vstep * 0.95, colw * 0.3));
    return { X: function (n) { return mx + n * colw; }, Y: function (n, j) { return h / 2 + 6 - (2 * j - n) * vstep; }, r: r };
  }
  function price(n, j) { return S0 * Math.pow(U, j) * Math.pow(D, n - j); }
  // the lattice: col(n) gives each column's visibility, label(n, j) its text
  function drawTree(c, w, h, o) {
    var L = treeLayout(w, h);
    for (var n = 0; n < NT2; n++) {
      for (var j = 0; j <= n; j++) {
        var a = Math.min(o.col(n), o.col(n + 1));
        if (a <= 0) continue;
        [j, j + 1].forEach(function (jj) {
          var glow = o.glow && o.glow(n, j, jj);
          V.line(c, L.X(n), L.Y(n, j), L.X(n + 1), L.Y(n + 1, jj), glow ? ACC : 'rgba(143,177,189,0.45)', { width: glow ? 2 : 1, alpha: a });
        });
      }
    }
    for (n = 0; n <= NT2; n++) {
      var ca = o.col(n);
      if (ca <= 0) continue;
      for (j = 0; j <= n; j++) {
        var st = o.style ? o.style(n, j) : {};
        V.ga(c, ca);
        c.fillStyle = st.fill || DEEP;
        c.beginPath(); c.arc(L.X(n), L.Y(n, j), L.r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = st.stroke || 'rgba(143,177,189,0.7)';
        c.lineWidth = st.lw || 1.2;
        c.stroke();
        V.text(c, o.label(n, j), L.X(n), L.Y(n, j) + 0.5, { size: Math.max(8, Math.min(11, L.r * 0.62)), color: st.text || FOAM, align: 'center', base: 'middle', alpha: ca * (st.textAlpha == null ? 1 : st.textAlpha) });
      }
    }
    return L;
  }
  var treeBeats = [
    // 2.1 the lattice grows one step at a time
    function (c, w, h, p) {
      drawTree(c, w, h, {
        col: function (n) { return V.ease(V.seg(p, n / (NT2 + 1), (n + 1) / (NT2 + 1))); },
        label: function (n, j) { return price(n, j).toFixed(1); }
      });
    },
    // 2.2 at expiry the put pays its intrinsic value
    function (c, w, h, p) {
      var e = V.ease(V.seg(p, 0.1, 0.8));
      drawTree(c, w, h, {
        col: function () { return 1; },
        label: function (n, j) { return n === NT2 ? (e > 0.5 ? EU.v[n][j].toFixed(2) : price(n, j).toFixed(1)) : price(n, j).toFixed(1); },
        style: function (n, j) {
          if (n !== NT2) return { textAlpha: 1 - 0.5 * e };
          var pos = EU.v[n][j] > 0;
          return { fill: pos ? 'rgba(' + RGB + ',' + (0.55 * e) + ')' : DEEP, stroke: pos ? ACC : 'rgba(143,177,189,0.7)', textAlpha: Math.abs(e - 0.5) * 2 };
        }
      });
    },
    // 2.3 European: discounted expectations flow back to today
    function (c, w, h, p) { backward(c, w, h, p, EU, false); },
    // 2.4 American: at every node, exercise if that's worth more
    function (c, w, h, p) { backward(c, w, h, p, AM, true); },
    // 2.5 convergence to BSM as the number of steps grows
    function (c, w, h, p) {
      var nShow = Math.max(2, Math.round(V.ease(V.seg(p, 0, 0.85)) * CONV.length));
      var short = h < 340, box = { x: 46, y: 30, w: w - 76, h: h * (short ? 0.4 : 0.5) };
      var F = V.frame(c, box, [1, CONV.length], [B0.call - 1.2, B0.call + 1.2], { xticks: [1, 40, 80, 120, 160], yticks: [Math.round(B0.call - 1), Math.round(B0.call), Math.round(B0.call + 1)], xlabel: 'steps N' });
      V.line(c, box.x, F.Y(B0.call), box.x + box.w, F.Y(B0.call), FOAM, { dash: [4, 4], alpha: 0.7 });
      V.text(c, 'BSM ' + B0.call.toFixed(3), box.x + box.w, F.Y(B0.call) - 6, { size: 10, color: FOAM, align: 'right' });
      V.ga(c, 1);
      c.strokeStyle = ACC;
      c.lineWidth = 1.4;
      c.beginPath();
      for (var k2 = 0; k2 < nShow; k2++) { var x = F.X(k2 + 1), y = F.Y(V.clamp(CONV[k2], B0.call - 1.2, B0.call + 1.2)); if (k2) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
      // the error on log axes, against a slope of -1
      var eb = { x: 46, y: box.y + box.h + (short ? 40 : 50), w: w - 76, h: h - box.y - box.h - (short ? 66 : 80) };
      var E = V.frame(c, eb, [1, 160], [1e-3, 3], { logX: true, logY: true, xticks: [1, 10, 100], yticks: eb.h < 70 ? [0.001, 1] : [0.001, 0.01, 0.1, 1], yfmt: function (t) { return String(t); }, ylabel: '|tree − BSM|' });
      V.ga(c, 0.9);
      c.fillStyle = ACC;
      for (k2 = 0; k2 < nShow; k2++) { var er = Math.abs(CONV[k2] - B0.call); if (er > 1e-3) c.fillRect(E.X(k2 + 1) - 1, E.Y(er) - 1, 2, 2); }
      V.plot(c, function (nn2) { return 1.2 / nn2; }, 1, 160, E.X, E.Y, FOAM, { dash: [4, 4], width: 1.2, alpha: 0.7 });
      V.text(c, 'O(1/N)', E.X(30), E.Y(1.2 / 30) - 8, { size: 10, color: FOAM });
    }
  ];
  function backward(c, w, h, p, TV, american) {
    var prog = V.ease(V.seg(p, 0, 0.92)) * NT2, done = NT2 - prog;
    drawTree(c, w, h, {
      col: function () { return 1; },
      glow: function (n, j, jj) { return n >= Math.floor(done) && n < Math.floor(done) + 1 && n === Math.max(0, Math.ceil(done) - 1) && prog % 1 > 0.05; },
      label: function (n, j) { return n >= done - 0.0001 ? TV.v[n][j].toFixed(2) : price(n, j).toFixed(1); },
      style: function (n, j) {
        var computed = n >= done - 0.0001;
        if (american && computed && TV.ex[n][j]) return { fill: 'rgba(' + RGB + ',0.85)', stroke: FOAM, lw: 2, text: DEEP };
        if (!computed) return { textAlpha: 0.45 };
        return { fill: 'rgba(' + RGB + ',' + Math.min(0.5, TV.v[n][j] / 30) + ')', stroke: ACC };
      }
    });
    if (american) {
      V.text(c, '● exercise early', 12, h - 14, { size: 11, color: ACC, alpha: V.ease(V.seg(p, 0.3, 0.6)) });
    }
  }
  Story.scene('tree', scene(treeBeats, [
    function () { return 'u = e<sup>σ√Δt</sup> = <b>' + U.toFixed(4) + '</b>, d = <b>' + D.toFixed(4) + '</b>, p = <b>' + PU.toFixed(4) + '</b>, with ' + NT2 + ' steps of Δt = ' + DT + '.'; },
    function () { return 'A put with K = 100 pays max(K − S<sub>T</sub>, 0) at each of the ' + (NT2 + 1) + ' terminal nodes.'; },
    function () { return 'Each node: e<sup>−rΔt</sup>[p V<sub>up</sub> + (1 − p) V<sub>down</sub>]. European put today: <b>' + EU.v[0][0].toFixed(4) + '</b>.'; },
    function () { return 'American put: <b>' + AM.v[0][0].toFixed(4) + '</b>, an early-exercise premium of <b>' + (AM.v[0][0] - EU.v[0][0]).toFixed(4) + '</b> on this 5-step tree.'; },
    function () { return 'European call by tree, N = 1 to 160, against BSM <b>' + B0.call.toFixed(3) + '</b>: at N = 160 the error is <b>' + Math.abs(CONV[159] - B0.call).toFixed(4) + '</b>.'; }
  ]));

  /* ================= 3. The Greeks ================= */
  var TG = 0.5;
  function call(Sx, t, sig) { return V.bsm(Sx, K, t, R, sig == null ? SIG : sig).call; }
  // central and forward differences for delta at the money, across step sizes
  var HS = [], ECEN = [], EFWD = [], DTRUE = V.bsm(S0, K, TG, R, SIG).delta;
  for (var e = 1.3; e >= -9; e -= 0.05) {
    var hh = Math.pow(10, e);
    HS.push(hh);
    ECEN.push(Math.abs((call(S0 + hh, TG) - call(S0 - hh, TG)) / (2 * hh) - DTRUE) || 1e-17);
    EFWD.push(Math.abs((call(S0 + hh, TG) - call(S0, TG)) / hh - DTRUE) || 1e-17);
  }
  var BEST = ECEN.reduce(function (m, v, j) { return v < ECEN[m] ? j : m; }, 0);

  var greekBeats = [
    // 3.1 delta: the slope of the price, traced as the tangent sweeps
    function (c, w, h, p) {
      var Sx = V.lerp(66, 134, V.ease(p));
      var top = { x: 44, y: 26, w: w - 70, h: h * 0.44 }, bot = { x: 44, y: top.y + top.h + 46, w: w - 70, h: h - top.y - top.h - 80 };
      var F = V.frame(c, top, [60, 140], [0, 42], { xticks: [60, 80, 100, 120, 140], yticks: [0, 20, 40], ylabel: 'C(S)' });
      V.plot(c, function (x) { return call(x, TG); }, 60, 140, F.X, F.Y, FOAM);
      var g = V.bsm(Sx, K, TG, R, SIG), cx = call(Sx, TG);
      V.line(c, F.X(Sx - 14), F.Y(cx - 14 * g.delta), F.X(Sx + 14), F.Y(cx + 14 * g.delta), ACC, { width: 2 });
      V.dot(c, F.X(Sx), F.Y(cx), 4, ACC, { halo: true });
      var G = V.frame(c, bot, [60, 140], [0, 1], { xticks: [60, 80, 100, 120, 140], yticks: [0, 0.5, 1], ylabel: 'Δ(S) = ∂C/∂S' });
      V.plot(c, function (x) { return V.bsm(x, K, TG, R, SIG).delta; }, 60, Sx, G.X, G.Y, ACC, { width: 2 });
      V.dot(c, G.X(Sx), G.Y(g.delta), 4, ACC, { halo: true });
      V.line(c, F.X(Sx), F.Y(cx), G.X(Sx), G.Y(g.delta), 'rgba(234,246,248,0.3)', { dash: [2, 4] });
    },
    // 3.2 gamma: delta's slope, sharpening as expiry nears
    function (c, w, h, p) {
      var t = V.lerp(1, 0.03, V.ease(p));
      var top = { x: 44, y: 26, w: w - 70, h: h * 0.4 }, bot = { x: 44, y: top.y + top.h + 46, w: w - 70, h: h - top.y - top.h - 80 };
      var F = V.frame(c, top, [60, 140], [0, 1], { xticks: [60, 80, 100, 120, 140], yticks: [0, 0.5, 1], ylabel: 'Δ(S)' });
      V.plot(c, function (x) { return V.bsm(x, K, 1, R, SIG).delta; }, 60, 140, F.X, F.Y, MIST, { width: 1, dash: [3, 4], alpha: 0.6 });
      V.plot(c, function (x) { return V.bsm(x, K, t, R, SIG).delta; }, 60, 140, F.X, F.Y, FOAM, { width: 2 });
      var gmax = V.bsm(K, K, 0.03, R, SIG).gamma * 1.05;
      var G = V.frame(c, bot, [60, 140], [0, gmax], { xticks: [60, 80, 100, 120, 140], ylabel: 'Γ(S) = ∂²C/∂S²' });
      V.ga(c, 0.3);
      c.fillStyle = ACC;
      c.beginPath(); c.moveTo(G.X(60), G.Y(0));
      for (var x = 60; x <= 140; x += 0.5) c.lineTo(G.X(x), G.Y(V.bsm(x, K, t, R, SIG).gamma));
      c.lineTo(G.X(140), G.Y(0)); c.closePath(); c.fill();
      V.plot(c, function (x2) { return V.bsm(x2, K, t, R, SIG).gamma; }, 60, 140, G.X, G.Y, ACC, { width: 2 });
      V.text(c, 'T = ' + t.toFixed(2) + ' y', top.x + top.w, top.y + 12, { size: 12, color: ACC, align: 'right', weight: 500 });
    },
    // 3.3 finite differences: the secant closes on the tangent, until rounding takes over
    function (c, w, h, p) {
      var narrow = w < 560, idx = Math.round(V.ease(p) * (HS.length - 1)), hcur = HS[idx];
      var zl = narrow ? { x: 40, y: 26, w: w - 60, h: h * 0.36 } : { x: 40, y: 30, w: w * 0.42, h: h - 90 };
      var er = narrow ? { x: 52, y: zl.y + zl.h + 52, w: w - 76, h: h - zl.y - zl.h - 84 } : { x: w * 0.42 + 100, y: 30, w: w * 0.58 - 120, h: h - 90 };
      var F = V.frame(c, zl, [75, 125], [0, 26], { xticks: [80, 100, 120], ylabel: 'C(S) near S = 100' });
      c.save();
      c.beginPath(); c.rect(zl.x, zl.y, zl.w, zl.h); c.clip();
      V.plot(c, function (x) { return call(x, TG); }, 75, 125, F.X, F.Y, FOAM);
      var c0 = call(S0, TG);
      V.line(c, F.X(80), F.Y(c0 - 20 * DTRUE), F.X(120), F.Y(c0 + 20 * DTRUE), FOAM, { dash: [3, 4], alpha: 0.6 });
      var hv = Math.min(hcur, 24), cl = call(S0 - hv, TG), cr = call(S0 + hv, TG), slope = (cr - cl) / (2 * hv);
      V.line(c, F.X(S0 - 24), F.Y(c0 - 24 * slope), F.X(S0 + 24), F.Y(c0 + 24 * slope), ACC, { width: 1.8 });
      V.dot(c, F.X(S0 - hv), F.Y(cl), 3.5, ACC, { halo: true });
      V.dot(c, F.X(S0 + hv), F.Y(cr), 3.5, ACC, { halo: true });
      c.restore();
      V.text(c, 'h = ' + V.sci(hcur), zl.x + 6, zl.y + 26, { size: 12, color: ACC, weight: 500 });
      var E = V.frame(c, er, [1e-9, 20], [1e-12, 1], { logX: true, logY: true, xticks: [1e-8, 1e-6, 1e-4, 1e-2, 1], yticks: [1e-12, 1e-9, 1e-6, 1e-3, 1], xfmt: function (t) { return V.sci(t, 0).replace('1.×', '').replace('1×', ''); }, yfmt: function (t) { return V.sci(t, 0).replace('1×', ''); }, xlabel: 'step h', ylabel: 'error in Δ' });
      [[EFWD, MIST, 'forward, O(h)'], [ECEN, ACC, 'central, O(h²)']].forEach(function (s, j) {
        V.ga(c, 1);
        c.strokeStyle = s[1];
        c.lineWidth = j ? 1.8 : 1.2;
        c.beginPath();
        var first = true;
        s[0].forEach(function (v, k2) { var y = E.Y(V.clamp(v, 1e-12, 1)); if (first) { c.moveTo(E.X(HS[k2]), y); first = false; } else c.lineTo(E.X(HS[k2]), y); });
        c.stroke();
        V.text(c, s[2], er.x + er.w - 4, er.y + 14 + j * 16, { size: 10, color: s[1], align: 'right' });
      });
      V.line(c, E.X(hcur), er.y, E.X(hcur), er.y + er.h, FOAM, { alpha: 0.6, dash: [2, 3] });
      V.dot(c, E.X(hcur), E.Y(V.clamp(ECEN[idx], 1e-12, 1)), 4, ACC, { halo: true });
    }
  ];
  Story.scene('greeks', scene(greekBeats, [
    function (p) { var Sx = V.lerp(66, 134, V.ease(p)); return 'S = <b>' + Sx.toFixed(1) + '</b>: Δ = <b>' + V.bsm(Sx, K, TG, R, SIG).delta.toFixed(4) + '</b>, the slope of the tangent. T = 0.5.'; },
    function (p) { var t = V.lerp(1, 0.03, V.ease(p)); return 'At the money, Γ = <b>' + V.bsm(K, K, t, R, SIG).gamma.toFixed(4) + '</b> with T = ' + t.toFixed(2) + '. Near expiry, delta jumps from 0 to 1 over a narrow range of S.'; },
    function (p) { var idx = Math.round(V.ease(p) * (HS.length - 1)); return 'Central difference at h = ' + V.sci(HS[idx]) + ': error <b>' + V.sci(ECEN[idx]) + '</b>. Best: <b>' + V.sci(ECEN[BEST]) + '</b> near h = ' + V.sci(HS[BEST]) + '.'; }
  ]));

  /* ================= 4. Implied volatility ================= */
  var KI = 110, TI = 0.5, SSTAR = 0.28, CM = V.bsm(S0, KI, TI, R, SSTAR).call;
  function civ(sig) { return V.bsm(S0, KI, TI, R, sig).call; }
  var ITER = [0.6];
  for (i = 0; i < 6; i++) { var sg = ITER[ITER.length - 1], g = V.bsm(S0, KI, TI, R, sg); ITER.push(sg - (g.call - CM) / g.vega); }
  // a synthetic market with a skew: prices from a known smile, inverted back by Newton
  function marketIV(k2, t) { return 0.2 + (-0.16 * k2 + 0.3 * k2 * k2) / Math.sqrt(t / 0.25) + 0.02 * Math.sqrt(t); }
  function invert(price, Kx, t) {
    var sg2 = 0.3;
    for (var it = 0; it < 30; it++) { var b = V.bsm(S0, Kx, t, R, sg2); if (b.vega < 1e-8) break; var nx = sg2 - (b.call - price) / b.vega; if (Math.abs(nx - sg2) < 1e-12) { sg2 = nx; break; } sg2 = Math.max(0.01, nx); }
    return sg2;
  }
  var STRIKES = [], EXPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5], SURF = [];
  for (var kk = 70; kk <= 130; kk += 5) STRIKES.push(kk);
  EXPS.forEach(function (t) {
    SURF.push(STRIKES.map(function (Kx) { var iv = marketIV(Math.log(Kx / S0), t); return invert(V.bsm(S0, Kx, t, R, iv).call, Kx, t); }));
  });

  var ivBeats = [
    // 4.1 one price, one volatility: invert the curve
    function (c, w, h, p) {
      var box = { x: 50, y: 30, w: w - 80, h: h - 80 };
      var F = V.frame(c, box, [0, 0.8], [0, 18], { xticks: [0, 0.2, 0.4, 0.6, 0.8], yticks: [0, 5, 10, 15], xlabel: 'σ', ylabel: 'C(σ), K = 110, T = 0.5' });
      var a = V.ease(V.seg(p, 0, 0.4)), b = V.ease(V.seg(p, 0.42, 0.6)), d = V.ease(V.seg(p, 0.62, 0.95));
      V.plot(c, civ, 0.005, 0.005 + 0.795 * a, F.X, F.Y, FOAM);
      V.line(c, box.x, F.Y(CM), box.x + box.w * b, F.Y(CM), ACC, { dash: [5, 4], width: 1.4 });
      V.text(c, 'market price ' + CM.toFixed(2), box.x + 6, F.Y(CM) - 8, { size: 11, color: ACC, alpha: b });
      if (d > 0) {
        V.line(c, F.X(SSTAR), F.Y(CM), F.X(SSTAR), F.Y(V.lerp(CM, 0, d)), ACC, { width: 1.6 });
        V.dot(c, F.X(SSTAR), F.Y(CM), 4.5, ACC, { halo: true });
        V.text(c, 'σ* = ' + SSTAR.toFixed(2), F.X(SSTAR) + 8, F.Y(0) - 8, { size: 12, color: ACC, weight: 500, alpha: d });
      }
    },
    // 4.2 Newton-Raphson: ride the tangent down to the market price
    function (c, w, h, p) {
      var narrow = w < 560, box = narrow ? { x: 50, y: 24, w: w - 80, h: h * 0.42 } : { x: 50, y: 30, w: w * 0.6 - 50, h: h - 80 };
      var F = V.frame(c, box, [0.1, 0.7], [0, 16], { xticks: [0.2, 0.4, 0.6], yticks: [0, 5, 10, 15], xlabel: 'σ' });
      V.plot(c, civ, 0.1, 0.7, F.X, F.Y, FOAM);
      V.line(c, box.x, F.Y(CM), box.x + box.w, F.Y(CM), ACC, { dash: [5, 4], width: 1.2, alpha: 0.7 });
      var steps = 4, fl = V.ease(p) * steps, cur = Math.min(steps - 1, Math.floor(fl)), q = fl - cur;
      for (var j = 0; j <= cur; j++) {
        var sg2 = ITER[j], cv = civ(sg2), vg = V.bsm(S0, KI, TI, R, sg2).vega, nx = ITER[j + 1];
        var part = j < cur ? 1 : V.ease(V.seg(q, 0, 0.7));
        // the tangent from (sigma_n, C) to where it meets the market price
        V.line(c, F.X(sg2), F.Y(cv), F.X(V.lerp(sg2, nx, part)), F.Y(V.lerp(cv, CM, part)), ACC, { width: 1.8 });
        V.dot(c, F.X(sg2), F.Y(cv), 4, ACC, { halo: true });
        if (part > 0.95) V.line(c, F.X(nx), F.Y(CM), F.X(nx), F.Y(civ(nx)), 'rgba(234,246,248,0.5)', { dash: [2, 3] });
      }
      // the iterates, with the error shrinking quadratically
      var tx = narrow ? 30 : w * 0.6 + 26, ty = narrow ? box.y + box.h + 40 : 60, fs = narrow ? 9.5 : 11, lh = narrow ? 1.55 : 1.9;
      V.text(c, 'n     σₙ             |σₙ − σ*|', tx, ty, { size: fs, color: FOAM, weight: 500 });
      for (j = 0; j <= Math.min(5, cur + 1); j++) {
        var a2 = j <= cur ? 1 : V.ease(V.seg(q, 0.7, 1));
        var err = Math.abs(ITER[j] - SSTAR);
        V.text(c, j + '     ' + ITER[j].toFixed(12).slice(0, 14) + '   ' + (err < 1e-15 ? '< 1e-15' : V.sci(err)), tx, ty + (j + 1) * fs * lh, { size: fs, color: j === cur + 1 ? ACC : MIST, alpha: a2 });
      }
    },
    // 4.3 every strike, every expiry: the smile, then the surface
    function (c, w, h, p) {
      var sm = V.ease(V.seg(p, 0, 0.42)), sf = V.ease(V.seg(p, 0.46, 1));
      if (sf < 1) V.faded(1 - sf, function () {
        var box = { x: 50, y: 30, w: w - 80, h: h - 80 }, row = SURF[1];
        var F = V.frame(c, box, [68, 132], [0.15, 0.4], { xticks: [70, 85, 100, 115, 130], yticks: [0.2, 0.3, 0.4], xlabel: 'strike K', ylabel: 'implied vol, T = 0.25' });
        var n = Math.round(sm * STRIKES.length);
        V.plot(c, function (Kx) { return marketIV(Math.log(Kx / S0), 0.25); }, 68, 132, F.X, F.Y, FOAM, { width: 1, dash: [3, 4], alpha: sm * 0.6 });
        for (var j = 0; j < n; j++) V.dot(c, F.X(STRIKES[j]), F.Y(row[j]), 4, ACC, { halo: true });
      });
      if (sf > 0) {
        // a wireframe in strike, expiry, and implied vol, turning as you scroll
        var ang = V.lerp(-0.9, 0.5, sf), cx = w / 2, cy = h * 0.6, sc = Math.min(w * 0.3, h * 0.36);
        var proj = function (kx, ty2, iv) {
          var x = (kx - 100) / 30, y = (ty2 - 0.8) / 0.7, z = (iv - 0.24) / 0.12;
          var xr = x * Math.cos(ang) - y * Math.sin(ang), yr = x * Math.sin(ang) + y * Math.cos(ang);
          return [cx + xr * sc, cy + yr * sc * 0.45 - z * sc * 0.55];
        };
        V.ga(c, sf);
        for (var e2 = 0; e2 < EXPS.length; e2++) {
          c.beginPath();
          for (var s2 = 0; s2 < STRIKES.length; s2++) { var q = proj(STRIKES[s2], EXPS[e2], SURF[e2][s2]); if (s2) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }
          c.strokeStyle = ACC; c.lineWidth = 1.4; c.stroke();
        }
        for (s2 = 0; s2 < STRIKES.length; s2++) {
          c.beginPath();
          for (e2 = 0; e2 < EXPS.length; e2++) { var q2 = proj(STRIKES[s2], EXPS[e2], SURF[e2][s2]); if (e2) c.lineTo(q2[0], q2[1]); else c.moveTo(q2[0], q2[1]); }
          c.strokeStyle = 'rgba(234,246,248,0.45)'; c.lineWidth = 1; c.stroke();
        }
        var a1 = proj(70, 0.1, 0.16), a3 = proj(130, 0.1, 0.16), a4 = proj(70, 1.5, 0.16);
        V.text(c, 'K 70', a1[0] - 6, a1[1] + 14, { size: 10, align: 'right', alpha: sf });
        V.text(c, 'K 130', a3[0] + 6, a3[1] + 14, { size: 10, alpha: sf });
        V.text(c, 'T 1.5', a4[0] - 6, a4[1] - 6, { size: 10, align: 'right', alpha: sf });
      }
    }
  ];
  Story.scene('iv', scene(ivBeats, [
    function () { return 'One option, K = 110, T = 0.5, priced by the market at <b>' + CM.toFixed(4) + '</b>. Only one σ reproduces it.'; },
    function (p) { var j = Math.min(4, Math.floor(V.ease(p) * 4) + 1); return 'Iterate ' + j + ': error <b>' + V.sci(Math.abs(ITER[j] - SSTAR)) + '</b>. The number of correct digits roughly doubles each step.'; },
    function () { return 'Prices from a synthetic skewed market, each inverted by Newton: the smile at T = 0.25, then the surface across ' + EXPS.length + ' expiries.'; }
  ]));

  Story.start();
})();
