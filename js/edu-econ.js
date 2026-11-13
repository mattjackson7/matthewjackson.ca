/* Education: one demo per economics and finance course. Loaded after education.js, which exposes EDU (the helpers). */
(function () {
  'use strict';
  var E = window.EDU; if (!E) return;
  var px = E.px, text = E.text, axes = E.axes, clear = E.clear, onScroll = E.onScroll, progress = E.progress, hover = E.hover, rng = E.rng, def = E.def;
  var FOAM = E.FOAM, MIST = E.MIST, ROPE = E.ROPE, DEEP = E.DEEP, BLUE = '#7cc4ff', GOLD = '#ffd166', GREEN = '#5fd3b0', PURPLE = '#c39bff';
  function line(c, pts) { c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); }
  function poly(c, pts, fill) { line(c, pts); c.closePath(); c.fillStyle = fill; c.fill(); }
  function plotBox(st, l, t, r, b) { return { l: px(st, l), t: px(st, t), r: st.W - px(st, r), b: st.H - px(st, b) }; }

  /* ECON 1050: who really pays a tax */
  def('ECON1050', { gauge: 'Tax per unit', hint: 'Move your pointer up and down to change how price-sensitive buyers are', aria: 'Supply and demand with a per-unit tax: consumer and producer surplus, tax revenue, and the deadweight loss triangle.',
    note: 'A per-unit tax drives a wedge between what buyers pay and what sellers keep. Trade falls to where the wedge fits between the curves; the gold rectangle is the government&rsquo;s revenue and the red triangle is the deadweight loss, trades worth more than they cost that no longer happen. Who bears the tax has nothing to do with who writes the cheque: the less price-sensitive side pays more of it. Make demand steep (inelastic) and buyers absorb nearly all of it.'
  }, function (st, g, read) {
    var t = 2, b = 1, bt = null, clock = 0;
    onScroll(function () { var p = progress(st.cv); t = 6 * p; g(p, '$' + t.toFixed(2)); });
    hover(st, function (p) { bt = p ? 0.3 + 2.7 * Math.max(0, Math.min(1, 1 - p[1] / st.H)) : null; });
    st.frame = function (dt) { clock += dt; var aim = bt != null ? bt : 1 + 0.6 * Math.sin(clock * 0.4); b += (aim - b) * Math.min(1, dt * 5); };
    st.draw = function () {
      clear(st); var c = st.ctx, B = plotBox(st, 46, 20, 20, 34), a = 10, cc = 1, d = 1, QM = 10, PM = 11;
      var X = function (q) { return B.l + q / QM * (B.r - B.l); }, Y = function (p) { return B.b - p / PM * (B.b - B.t); };
      var q0 = (a - cc) / (b + d), p0 = a - b * q0, qt = Math.max(0, (a - cc - t) / (b + d)), pb = a - b * qt, ps = pb - t, qd = a / b;
      poly(c, [[X(0), Y(a)], [X(qt), Y(pb)], [X(0), Y(pb)]], 'rgba(124,196,255,.22)');
      poly(c, [[X(0), Y(ps)], [X(qt), Y(ps)], [X(0), Y(cc)]], 'rgba(95,211,176,.22)');
      poly(c, [[X(0), Y(pb)], [X(qt), Y(pb)], [X(qt), Y(ps)], [X(0), Y(ps)]], 'rgba(255,209,102,.3)');
      poly(c, [[X(qt), Y(pb)], [X(q0), Y(p0)], [X(qt), Y(ps)]], 'rgba(255,106,85,.45)');
      axes(st, B.l, B.b, B.r, B.b); axes(st, B.l, B.b, B.l, B.t);
      c.lineWidth = px(st, 2.2); c.strokeStyle = BLUE; line(c, [[X(0), Y(a)], [X(Math.min(QM, qd)), Y(Math.max(0, a - b * Math.min(QM, qd)))]]); c.stroke();
      c.strokeStyle = GREEN; line(c, [[X(0), Y(cc)], [X(QM), Y(cc + d * QM)]]); c.stroke();
      c.setLineDash([px(st, 5), px(st, 5)]); c.strokeStyle = 'rgba(95,211,176,.6)'; line(c, [[X(0), Y(cc + t)], [X(QM), Y(cc + t + d * QM)]]); c.stroke(); c.setLineDash([]);
      text(st, 'demand', X(Math.min(qd, QM) * 0.85), Y(a - b * Math.min(qd, QM) * 0.85) - px(st, 8), BLUE); text(st, 'supply', X(8.6), Y(cc + d * 8.6) + px(st, 16), GREEN);
      text(st, 'buyers pay $' + pb.toFixed(2), X(qt) + px(st, 8), Y(pb) - px(st, 6), FOAM); text(st, 'sellers keep $' + ps.toFixed(2), X(qt) + px(st, 8), Y(ps) + px(st, 14), FOAM);
      text(st, 'quantity →', B.r, B.b + px(st, 18), MIST, 'right'); text(st, '↑ price', B.l + px(st, 6), B.t + px(st, 4), MIST);
      var share = t ? (pb - p0) / t : b / (b + d);
      text(st, 'revenue', px(st, 56), st.H - px(st, 48), GOLD); text(st, 'deadweight loss', px(st, 120), st.H - px(st, 48), ROPE);
      read('A $' + t.toFixed(2) + ' tax: trade falls from ' + q0.toFixed(2) + ' to ' + qt.toFixed(2) + ' units, raising $' + (t * qt).toFixed(2) + ' and destroying $' + (0.5 * t * (q0 - qt)).toFixed(2) + ' of surplus. Buyers bear ' + Math.round(share * 100) + '% of it because demand is ' + (b > 1.3 ? 'steep (inelastic).' : b < 0.8 ? 'flat (elastic).' : 'about as steep as supply.'));
    };
  });

  /* ECON 1100: the spending multiplier */
  def('ECON1100', { gauge: 'Marginal propensity to consume', aria: 'A $100 rise in government spending rippling through rounds of re-spending, with the total approaching the multiplier.',
    note: 'The Keynesian multiplier: $100 of new spending is someone&rsquo;s income, and they spend a fraction (the marginal propensity to consume, MPC) of it, which is someone else&rsquo;s income, and so on. The rounds shrink geometrically and add up to \\(\\Delta Y = \\Delta G/(1 - \\text{MPC})\\). The more of each dollar is re-spent, the bigger the final effect; taxes, saving and imports all leak out of the chain and shrink it.'
  }, function (st, g, read) {
    var mpc = 0.75, shown = 0, acc = 0;
    onScroll(function () { var p = progress(st.cv), m = Math.round((0.5 + 0.4 * p) * 100) / 100; g(p, 'MPC = ' + m.toFixed(2)); if (m !== mpc) { mpc = m; shown = 0; } });
    st.frame = function (dt) { acc += dt; if (acc > 0.35) { acc = 0; shown = shown < 22 ? shown + 1 : (shown > 30 ? 0 : shown + 1); } };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, total = 100 / (1 - mpc), n = 22, B = plotBox(st, 40, 30, 20, 50), bw = (B.r - B.l) / (n + 3), sc = (B.b - B.t) / (total * 1.12), cum = 0;
      axes(st, B.l, B.b, B.r, B.b);
      for (var k = 0; k < n; k++) { var v = 100 * Math.pow(mpc, k), x = B.l + k * bw, on = k < Math.min(shown, n);
        c.fillStyle = on ? (k ? 'rgba(255,209,102,.75)' : ROPE) : 'rgba(255,209,102,.08)'; c.fillRect(x + 1, B.b - (cum + v) * sc, bw - 2, v * sc); if (on) cum += v; }
      var tx = B.l + (n + 1) * bw; c.fillStyle = 'rgba(124,196,255,.25)'; c.fillRect(tx, B.b - total * sc, bw * 1.6, total * sc);
      c.fillStyle = BLUE; c.fillRect(tx, B.b - cum * sc, bw * 1.6, cum * sc);
      c.setLineDash([px(st, 4), px(st, 4)]); c.strokeStyle = 'rgba(124,196,255,.6)'; c.lineWidth = px(st, 1); line(c, [[B.l, B.b - total * sc], [B.r, B.b - total * sc]]); c.stroke(); c.setLineDash([]);
      text(st, 'limit $' + total.toFixed(0), B.r, B.b - total * sc - px(st, 6), BLUE, 'right');
      text(st, 'round 1: the $100', B.l, B.b + px(st, 18), ROPE); text(st, 'later rounds: each ' + Math.round(mpc * 100) + '% of the last →', B.l + bw * 4, B.b + px(st, 18), GOLD);
      text(st, 'total', tx + bw * 0.8, B.b + px(st, 18), BLUE, 'center');
      read('With an MPC of ' + mpc.toFixed(2) + ', $100 of new spending grows to $' + cum.toFixed(0) + ' after ' + Math.min(shown, n) + ' rounds, heading for $' + total.toFixed(0) + ': a multiplier of ' + (1 / (1 - mpc)).toFixed(1) + '. Scroll to change the MPC.');
    };
  });

  /* ECON 2310: monopoly versus competition */
  def('ECON2310', { gauge: 'Marginal cost', hint: 'Move your pointer left and right to choose an output', aria: 'Demand, marginal revenue and marginal cost: the monopolist picks the output where marginal revenue meets marginal cost, below the competitive output, leaving a deadweight loss.',
    note: 'A competitive market produces until price equals marginal cost. A monopolist knows that selling one more unit means cutting the price on all the others, so its marginal revenue falls twice as fast as demand, and it stops where \\(MR = MC\\): less output at a higher price. Slide the output and watch profit (the gold rectangle) peak exactly there; the red triangle is the value lost relative to competition.'
  }, function (st, g, read) {
    var c0 = 2, q = 3, qt = null, clock = 0;
    onScroll(function () { var p = progress(st.cv); c0 = 0.5 + 4 * p; g(p, '$' + c0.toFixed(2)); });
    hover(st, function (p) { var B = plotBox(st, 46, 20, 20, 34); qt = p ? Math.max(0.2, Math.min(9.5, (p[0] - B.l) / (B.r - B.l) * 10)) : null; });
    st.frame = function (dt) { clock += dt; var aim = qt != null ? qt : 3.2 + 1.8 * Math.sin(clock * 0.4); q += (aim - q) * Math.min(1, dt * 5); };
    st.draw = function () {
      clear(st); var c = st.ctx, B = plotBox(st, 46, 20, 20, 34), X = function (v) { return B.l + v / 10 * (B.r - B.l); }, Y = function (v) { return B.b - v / 11 * (B.b - B.t); };
      var P = function (v) { return 10 - v; }, MC = function (v) { return c0 + 0.5 * v; }, AC = function (v) { return c0 + 0.25 * v; };
      var qm = (10 - c0) / 2.5, qc = (10 - c0) / 1.5, pm = P(qm), prof = function (v) { return (P(v) - AC(v)) * v; };
      poly(c, [[X(qm), Y(pm)], [X(qc), Y(P(qc))], [X(qm), Y(MC(qm))]], 'rgba(255,106,85,.4)');
      var pq = P(q), aq = AC(q); poly(c, [[X(0), Y(pq)], [X(q), Y(pq)], [X(q), Y(aq)], [X(0), Y(aq)]], prof(q) >= 0 ? 'rgba(255,209,102,.32)' : 'rgba(255,106,85,.25)');
      axes(st, B.l, B.b, B.r, B.b); axes(st, B.l, B.b, B.l, B.t); c.lineWidth = px(st, 2.2);
      c.strokeStyle = BLUE; line(c, [[X(0), Y(10)], [X(10), Y(0)]]); c.stroke();
      c.strokeStyle = 'rgba(124,196,255,.55)'; c.setLineDash([px(st, 5), px(st, 4)]); line(c, [[X(0), Y(10)], [X(5), Y(0)]]); c.stroke(); c.setLineDash([]);
      c.strokeStyle = GREEN; line(c, [[X(0), Y(MC(0))], [X(10), Y(MC(10))]]); c.stroke();
      c.strokeStyle = 'rgba(95,211,176,.5)'; c.lineWidth = px(st, 1.2); line(c, [[X(0), Y(AC(0))], [X(10), Y(AC(10))]]); c.stroke();
      text(st, 'demand', X(8.6), Y(P(8.6)) - px(st, 8), BLUE); text(st, 'marginal revenue', X(4.2), Y(10 - 2 * 4.2) + px(st, 16), BLUE); text(st, 'marginal cost', X(8.8), Y(MC(8.8)) - px(st, 8), GREEN, 'right');
      c.fillStyle = GOLD; c.beginPath(); c.arc(X(qm), Y(pm), px(st, 6), 0, 7); c.fill(); text(st, 'monopoly', X(qm) + px(st, 8), Y(pm) - px(st, 8), GOLD);
      c.fillStyle = FOAM; c.beginPath(); c.arc(X(qc), Y(P(qc)), px(st, 5), 0, 7); c.fill(); text(st, 'competitive', X(qc) + px(st, 8), Y(P(qc)) - px(st, 8), FOAM);
      c.strokeStyle = 'rgba(234,246,248,.5)'; c.lineWidth = px(st, 1); line(c, [[X(q), B.b], [X(q), Y(pq)]]); c.stroke();
      text(st, 'quantity →', B.r, B.b + px(st, 18), MIST, 'right'); text(st, '↑ $', B.l + px(st, 6), B.t + px(st, 4), MIST);
      read('Producing ' + q.toFixed(1) + ' units earns a profit of $' + prof(q).toFixed(2) + '; the most possible is $' + prof(qm).toFixed(2) + ' at ' + qm.toFixed(1) + ' units and $' + pm.toFixed(2) + ', against ' + qc.toFixed(1) + ' units under competition. Deadweight loss $' + (0.5 * (qc - qm) * (pm - MC(qm))).toFixed(2) + '.');
    };
  });

  /* ECON 2410: Solow growth */
  def('ECON2410', { gauge: 'Savings rate', aria: 'The Solow growth model: investment and depreciation curves meeting at the steady state, with an economy converging to it over time.',
    note: 'The Solow model: output per worker \\(y = k^{\\alpha}\\) comes from capital per worker, a fraction \\(s\\) is saved and invested, and capital wears out and is spread over a growing population at rate \\(n + \\delta\\). Capital grows while \\(s k^\\alpha > (n+\\delta)k\\) and settles where they meet, the steady state. Saving more raises the level of income but not its long-run growth rate (that takes technology), and past the golden rule \\(s = \\alpha\\) extra saving actually lowers consumption.'
  }, function (st, g, read) {
    var s = 0.25, k = 1.5, al = 0.33, nd = 0.08, hist = [], acc = 0;
    onScroll(function () { var p = progress(st.cv); s = 0.1 + 0.5 * p; g(p, 's = ' + (s * 100).toFixed(0) + '%'); });
    st.frame = function (dt) { for (var i = 0; i < 4; i++) k += (s * Math.pow(k, al) - nd * k) * dt * 2; acc += dt; if (acc > 0.05) { acc = 0; hist.push(Math.pow(k, al)); if (hist.length > 300) hist.shift(); } };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, wide = W > H * 1.4, lw = wide ? W * 0.5 : W, lh = wide ? H : H * 0.55, KM = 30, YM = Math.pow(KM, al) * 1.05;
      var l = px(st, 40), b = lh - px(st, 30), r = lw - px(st, 16), t = px(st, 20), X = function (v) { return l + v / KM * (r - l); }, Y = function (v) { return b - v / YM * (b - t); };
      axes(st, l, b, r, b); axes(st, l, b, l, t); c.lineWidth = px(st, 2);
      var pts = function (f) { var o = []; for (var i = 0; i <= 120; i++) { var v = i / 120 * KM; o.push([X(v), Y(f(v))]); } return o; };
      c.strokeStyle = BLUE; line(c, pts(function (v) { return Math.pow(v, al); })); c.stroke();
      c.strokeStyle = GOLD; line(c, pts(function (v) { return s * Math.pow(v, al); })); c.stroke();
      c.strokeStyle = ROPE; line(c, pts(function (v) { return nd * v; })); c.stroke();
      var ks = Math.pow(s / nd, 1 / (1 - al)); c.setLineDash([px(st, 3), px(st, 4)]); c.strokeStyle = 'rgba(234,246,248,.4)'; c.lineWidth = px(st, 1); line(c, [[X(ks), b], [X(ks), Y(Math.pow(ks, al))]]); c.stroke(); c.setLineDash([]);
      c.fillStyle = FOAM; c.beginPath(); c.arc(X(Math.min(k, KM)), Y(Math.pow(Math.min(k, KM), al)), px(st, 6), 0, 7); c.fill();
      text(st, 'output y', r, Y(Math.pow(KM, al)) - px(st, 8), BLUE, 'right'); text(st, 'investment sy', r, Y(s * Math.pow(KM, al)) - px(st, 8), GOLD, 'right'); text(st, 'break-even (n+δ)k', X(KM * 0.6), Y(nd * KM * 0.6) - px(st, 10), ROPE, 'right');
      text(st, 'capital per worker →', r, b + px(st, 18), MIST, 'right');
      var gx = wide ? lw + px(st, 30) : px(st, 40), gy = wide ? px(st, 20) : lh + px(st, 20), gw = W - gx - px(st, 12), gb = H - px(st, 30);
      axes(st, gx, gb, gx + gw, gb); axes(st, gx, gb, gx, gy);
      c.strokeStyle = BLUE; c.lineWidth = px(st, 2); line(c, hist.map(function (v, i) { return [gx + i / 300 * gw, gb - v / YM * (gb - gy)]; })); c.stroke();
      text(st, 'income per worker over time', gx + px(st, 6), gy + px(st, 4), BLUE);
      var css = (1 - s) * Math.pow(ks, al), cg = (1 - al) * Math.pow(Math.pow(al / nd, 1 / (1 - al)), al);
      read('Saving ' + (s * 100).toFixed(0) + '%: the steady state has income ' + Math.pow(ks, al).toFixed(2) + ' and consumption ' + css.toFixed(2) + ' per worker (the most possible, ' + cg.toFixed(2) + ', comes at the golden rule s = ' + Math.round(al * 100) + '%). ' + (Math.abs(k - ks) / ks > 0.05 ? 'The economy is still converging.' : 'The economy has arrived.'));
    };
  });

  /* ECON 3740: least squares and influential points */
  def('ECON3740', { gauge: 'Sample size', hint: 'Move your pointer to drag the red point', aria: 'A scatter plot with its least-squares line and confidence band; a draggable point shows how an outlier can tilt the fit.',
    note: 'Ordinary least squares picks the line that minimises the sum of squared vertical distances (the residuals), \\(\\hat\\beta = (X^\\top X)^{-1}X^\\top y\\). The shaded band is the 95% confidence interval for the fitted mean: it narrows like \\(1/\\sqrt n\\) as the sample grows and flares out at the ends. Because the errors are squared, one point far from the rest, especially at an extreme \\(x\\) (high leverage), can drag the whole line; the faint blue line is the fit without it.'
  }, function (st, g, read) {
    var R = rng(12), PTS = [], n = 20, o = [8.5, 1], ot = null, clock = 0;
    for (var i = 0; i < 120; i++) { var x = R() * 10, e = (R() + R() + R() - 1.5) * 1.4; PTS.push([x, 1 + 0.5 * x + e]); }
    onScroll(function () { var p = progress(st.cv); n = Math.round(6 + 114 * p * p); g(p, 'n = ' + n); });
    hover(st, function (p) { if (!p) { ot = null; return; } var B = plotBox(st, 46, 20, 20, 34); ot = [(p[0] - B.l) / (B.r - B.l) * 10, (B.b - p[1]) / (B.b - B.t) * 10]; });
    st.frame = function (dt) { clock += dt; var aim = ot || [8.5 + Math.sin(clock * 0.3), 3 + 3.5 * Math.sin(clock * 0.45)]; o[0] += (aim[0] - o[0]) * Math.min(1, dt * 5); o[1] += (aim[1] - o[1]) * Math.min(1, dt * 5); };
    function fit(d) { var m = d.length, sx = 0, sy = 0; d.forEach(function (p) { sx += p[0]; sy += p[1]; }); var mx = sx / m, my = sy / m, sxx = 0, sxy = 0;
      d.forEach(function (p) { sxx += (p[0] - mx) * (p[0] - mx); sxy += (p[0] - mx) * (p[1] - my); }); var b1 = sxy / sxx, b0 = my - b1 * mx, ss = 0, st2 = 0;
      d.forEach(function (p) { var r = p[1] - b0 - b1 * p[0]; ss += r * r; st2 += (p[1] - my) * (p[1] - my); });
      return { b0: b0, b1: b1, s: Math.sqrt(ss / (m - 2)), mx: mx, sxx: sxx, m: m, r2: 1 - ss / st2 }; }
    st.draw = function () {
      clear(st); var c = st.ctx, B = plotBox(st, 46, 20, 20, 34), X = function (v) { return B.l + v / 10 * (B.r - B.l); }, Y = function (v) { return B.b - v / 10 * (B.b - B.t); };
      var d = PTS.slice(0, n), all = d.concat([o.slice()]), f = fit(all), f0 = fit(d), tq = 1.96;
      var band = function (sg) { var out = []; for (var i = 0; i <= 50; i++) { var x = i / 5, se = f.s * Math.sqrt(1 / f.m + (x - f.mx) * (x - f.mx) / f.sxx); out.push([X(x), Y(f.b0 + f.b1 * x + sg * tq * se)]); } return out; };
      poly(c, band(1).concat(band(-1).reverse()), 'rgba(255,209,102,.16)');
      axes(st, B.l, B.b, B.r, B.b); axes(st, B.l, B.b, B.l, B.t);
      c.strokeStyle = 'rgba(234,246,248,.18)'; c.lineWidth = px(st, 1); all.forEach(function (p) { line(c, [[X(p[0]), Y(p[1])], [X(p[0]), Y(f.b0 + f.b1 * p[0])]]); c.stroke(); });
      c.fillStyle = BLUE; d.forEach(function (p) { c.beginPath(); c.arc(X(p[0]), Y(p[1]), px(st, 3.5), 0, 7); c.fill(); });
      c.strokeStyle = 'rgba(124,196,255,.55)'; c.lineWidth = px(st, 1.5); line(c, [[X(0), Y(f0.b0)], [X(10), Y(f0.b0 + f0.b1 * 10)]]); c.stroke();
      c.strokeStyle = GOLD; c.lineWidth = px(st, 2.5); line(c, [[X(0), Y(f.b0)], [X(10), Y(f.b0 + f.b1 * 10)]]); c.stroke();
      c.fillStyle = ROPE; c.beginPath(); c.arc(X(o[0]), Y(o[1]), px(st, 6), 0, 7); c.fill();
      var se1 = f.s / Math.sqrt(f.sxx);
      text(st, 'ŷ = ' + f.b0.toFixed(2) + ' + ' + f.b1.toFixed(3) + 'x   (slope s.e. ' + se1.toFixed(3) + ')   R² = ' + f.r2.toFixed(2), B.l + px(st, 8), B.t + px(st, 6), FOAM, 'left', 12);
      read('With ' + n + ' points the slope is ' + f.b1.toFixed(3) + ' ± ' + (1.96 * se1).toFixed(3) + ' (the truth is 0.5); without the red point it would be ' + f0.b1.toFixed(3) + '. Scroll for a bigger sample, and drag the red point to the edges to see leverage.');
    };
  });

  /* ECON 3710: the Edgeworth box and general equilibrium */
  def('ECON3710', { gauge: 'A’s taste for x', hint: 'Move your pointer to set the starting endowment', aria: 'An Edgeworth box with two consumers: indifference curves through the endowment, the contract curve, and the competitive equilibrium on the price line.',
    note: 'Two people, two goods, a fixed total: the Edgeworth box. A is measured from the bottom-left corner and B from the top-right, so every point is a way to split everything. From the endowment (red), trades inside the lens between their indifference curves make both better off; the purple contract curve is where no further trade helps anyone (Pareto efficiency, where their marginal rates of substitution match). A competitive price line through the endowment lands the economy on that curve: the first welfare theorem.'
  }, function (st, g, read) {
    var XT = 10, YT = 10, a = 0.5, bb = 0.4, w = [7, 2], wt = null, clock = 0;
    onScroll(function () { var p = progress(st.cv); a = 0.2 + 0.6 * p; g(p, a.toFixed(2)); });
    function geo() { var s = Math.min(st.W - px(st, 80), st.H - px(st, 50)); return { s: s, l: (st.W - s) / 2, t: px(st, 24) }; }
    hover(st, function (p) { if (!p) { wt = null; return; } var gg = geo(); wt = [Math.max(0.3, Math.min(9.7, (p[0] - gg.l) / gg.s * XT)), Math.max(0.3, Math.min(9.7, (gg.t + gg.s - p[1]) / gg.s * YT))]; });
    st.frame = function (dt) { clock += dt; var aim = wt || [6.5 + 2 * Math.sin(clock * 0.3), 2.5 + 1.5 * Math.sin(clock * 0.41)]; w[0] += (aim[0] - w[0]) * Math.min(1, dt * 5); w[1] += (aim[1] - w[1]) * Math.min(1, dt * 5); };
    st.draw = function () {
      clear(st); var c = st.ctx, gg = geo(), P = function (x, y) { return [gg.l + x / XT * gg.s, gg.t + gg.s - y / YT * gg.s]; };
      c.strokeStyle = MIST; c.lineWidth = px(st, 1.5); c.strokeRect(gg.l, gg.t, gg.s, gg.s);
      var al = a / (1 - a), be = bb / (1 - bb), cc = [];
      for (var i = 0; i <= 100; i++) { var x = i / 100 * XT, y = be * YT * x / (al * (XT - x) + be * x); cc.push(P(x, y)); }
      c.strokeStyle = PURPLE; c.lineWidth = px(st, 2); line(c, cc); c.stroke();
      var uA = Math.pow(w[0], a) * Math.pow(w[1], 1 - a), uB = Math.pow(XT - w[0], bb) * Math.pow(YT - w[1], 1 - bb);
      var icA = function (u, col, wd) { var o = []; for (var i = 1; i <= 200; i++) { var x = i / 200 * XT, y = Math.pow(u / Math.pow(x, a), 1 / (1 - a)); if (y <= YT) o.push(P(x, y)); } c.strokeStyle = col; c.lineWidth = wd; line(c, o); c.stroke(); };
      var icB = function (u, col, wd) { var o = []; for (var i = 1; i <= 200; i++) { var x = i / 200 * XT, y = Math.pow(u / Math.pow(x, bb), 1 / (1 - bb)); if (y <= YT) o.push(P(XT - x, YT - y)); } c.strokeStyle = col; c.lineWidth = wd; line(c, o); c.stroke(); };
      icA(uA, 'rgba(124,196,255,.8)', px(st, 1.6)); icB(uB, 'rgba(255,209,102,.8)', px(st, 1.6));
      var p = (a * w[1] + bb * (YT - w[1])) / (XT - a * w[0] - bb * (XT - w[0])), m = p * w[0] + w[1], xs = a * m / p, ys = (1 - a) * m;
      var e0 = P(0, m), e1 = P(m / p, 0); c.save(); c.beginPath(); c.rect(gg.l, gg.t, gg.s, gg.s); c.clip(); c.strokeStyle = 'rgba(234,246,248,.55)'; c.lineWidth = px(st, 1.2); line(c, [e0, e1]); c.stroke(); c.restore();
      icA(Math.pow(xs, a) * Math.pow(ys, 1 - a), 'rgba(124,196,255,.35)', px(st, 1)); icB(Math.pow(XT - xs, bb) * Math.pow(YT - ys, 1 - bb), 'rgba(255,209,102,.35)', px(st, 1));
      var W0 = P(w[0], w[1]), Q = P(xs, ys); c.fillStyle = ROPE; c.beginPath(); c.arc(W0[0], W0[1], px(st, 6), 0, 7); c.fill(); c.fillStyle = FOAM; c.beginPath(); c.arc(Q[0], Q[1], px(st, 6), 0, 7); c.fill();
      text(st, 'endowment', W0[0] + px(st, 8), W0[1] + px(st, 16), ROPE); text(st, 'equilibrium', Q[0] + px(st, 8), Q[1] - px(st, 8), FOAM);
      text(st, 'A', gg.l - px(st, 14), gg.t + gg.s + px(st, 4), BLUE, 'center', 13); text(st, 'B', gg.l + gg.s + px(st, 14), gg.t + px(st, 4), GOLD, 'center', 13);
      text(st, 'contract curve', P(8, be * YT * 8 / (al * 2 + be * 8))[0] + px(st, 8), P(8, be * YT * 8 / (al * 2 + be * 8))[1] + px(st, 4), PURPLE);
      read('At a price of ' + p.toFixed(2) + ' units of y per x, A trades from (' + w[0].toFixed(1) + ', ' + w[1].toFixed(1) + ') to (' + xs.toFixed(1) + ', ' + ys.toFixed(1) + '), and both end up better off on the contract curve. Scroll to change A’s tastes; move your pointer to change who starts with what.');
    };
  });

  /* FIN 2000: diversification and the efficient frontier */
  def('FIN2000', { gauge: 'Correlation', aria: 'Risk against expected return for portfolios of three assets: the efficient frontier, the tangency portfolio, and the capital market line from the risk-free rate.',
    note: 'Mixing assets that don&rsquo;t move together cancels some of their risk: portfolio variance is \\(w^\\top\\Sigma w\\), so the lower the correlations, the further the whole cloud of possible portfolios (the dots, each a random long-only mix) bulges to the left. The upper edge is the efficient frontier: nothing offers more return for the same risk. Adding a risk-free asset turns it into a straight line, the capital market line, touching the frontier at the tangency portfolio with the highest Sharpe ratio. (Made-up assets, for illustration.)'
  }, function (st, g, read) {
    var MU = [0.05, 0.09, 0.13], SG = [0.08, 0.15, 0.24], rf = 0.03, rho = 0.3, R = rng(17), W = [];
    for (var i = 0; i < 700; i++) { var e = [-Math.log(R()), -Math.log(R()), -Math.log(R())], s = e[0] + e[1] + e[2]; W.push([e[0] / s, e[1] / s, e[2] / s]); }
    onScroll(function () { var p = progress(st.cv); rho = Math.round((-0.4 + 1.3 * p) * 20) / 20; g(p, 'ρ = ' + rho.toFixed(2)); st.redraw(); });
    function cov() { var C = []; for (var i = 0; i < 3; i++) { C.push([]); for (var j = 0; j < 3; j++) C[i].push((i === j ? 1 : rho) * SG[i] * SG[j]); } return C; }
    function inv3(m) { var a = m[0][0], b = m[0][1], c = m[0][2], d = m[1][0], e = m[1][1], f = m[1][2], g2 = m[2][0], h = m[2][1], k = m[2][2], A = e * k - f * h, B = -(d * k - f * g2), Cc = d * h - e * g2, det = a * A + b * B + c * Cc;
      return [[A / det, -(b * k - c * h) / det, (b * f - c * e) / det], [B / det, (a * k - c * g2) / det, -(a * f - c * d) / det], [Cc / det, -(a * h - b * g2) / det, (a * e - b * d) / det]]; }
    function mv(M, v) { return M.map(function (r) { return r[0] * v[0] + r[1] * v[1] + r[2] * v[2]; }); }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    st.draw = function () {
      clear(st); var c = st.ctx, B = plotBox(st, 50, 20, 20, 34), SM = 0.28, RM = 0.16, X = function (v) { return B.l + v / SM * (B.r - B.l); }, Y = function (v) { return B.b - v / RM * (B.b - B.t); };
      var C = cov(), Ci = inv3(C), one = [1, 1, 1], ci1 = mv(Ci, one), cim = mv(Ci, MU), Aa = dot(one, ci1), Bb = dot(one, cim), Cq = dot(MU, cim), D = Aa * Cq - Bb * Bb;
      axes(st, B.l, B.b, B.r, B.b); axes(st, B.l, B.b, B.l, B.t);
      W.forEach(function (w) { var r = dot(w, MU), v = dot(w, mv(C, w)); c.fillStyle = 'rgba(255,209,102,.35)'; c.beginPath(); c.arc(X(Math.sqrt(v)), Y(r), px(st, 2), 0, 7); c.fill(); });
      var front = []; for (var i = 0; i <= 120; i++) { var mu = 0.01 + 0.15 * i / 120, v = (Aa * mu * mu - 2 * Bb * mu + Cq) / D; if (Math.sqrt(v) < SM) front.push([X(Math.sqrt(v)), Y(mu)]); }
      c.strokeStyle = BLUE; c.lineWidth = px(st, 2.2); line(c, front); c.stroke();
      var ex = MU.map(function (m) { return m - rf; }), wt = mv(Ci, ex), sw = wt[0] + wt[1] + wt[2]; wt = wt.map(function (v) { return v / sw; });
      var tr = dot(wt, MU), ts = Math.sqrt(dot(wt, mv(C, wt))), sh = (tr - rf) / ts;
      c.strokeStyle = GREEN; c.lineWidth = px(st, 1.8); line(c, [[X(0), Y(rf)], [X(SM), Y(rf + sh * SM)]]); c.stroke();
      c.fillStyle = FOAM; c.beginPath(); c.arc(X(ts), Y(tr), px(st, 6), 0, 7); c.fill(); text(st, 'tangency', X(ts) + px(st, 8), Y(tr) + px(st, 16), FOAM);
      MU.forEach(function (m, i) { c.fillStyle = ROPE; c.beginPath(); c.arc(X(SG[i]), Y(m), px(st, 5), 0, 7); c.fill(); text(st, 'asset ' + (i + 1), X(SG[i]) + px(st, 8), Y(m) + px(st, 4), ROPE); });
      text(st, 'efficient frontier', front.length ? front[front.length - 1][0] - px(st, 4) : B.r, front.length ? front[front.length - 1][1] - px(st, 8) : B.t, BLUE, 'right');
      text(st, 'capital market line', X(0.03) + px(st, 4), Y(rf + sh * 0.03) - px(st, 10), GREEN);
      text(st, 'risk (σ) →', B.r, B.b + px(st, 18), MIST, 'right'); text(st, '↑ expected return', B.l + px(st, 6), B.t + px(st, 4), MIST);
      var wmin = ci1.map(function (v) { return v / Aa; }), smin = Math.sqrt(1 / Aa);
      read('With every pair correlated at ' + rho.toFixed(2) + ', the least risky mix has σ = ' + (smin * 100).toFixed(1) + '% (the safest single asset has 8%), and the tangency portfolio earns a Sharpe ratio of ' + sh.toFixed(2) + ' with weights ' + wt.map(function (v) { return Math.round(v * 100) + '%'; }).join(' / ') + '. Scroll to change the correlation.');
    };
  });

  /* ACCT 1220: the accounting equation, one transaction at a time */
  def('ACCT1220', { gauge: 'Transaction', aria: 'A balance sheet as two stacked columns, assets against liabilities plus equity, staying equal as a new business records each transaction.',
    note: 'Double-entry bookkeeping keeps one identity true after every transaction: \\(\\text{Assets} = \\text{Liabilities} + \\text{Equity}\\). Every entry has a debit and a credit of the same size, so either both sides grow, both shrink, or one account swaps with another on the same side. Revenue and expenses flow through retained earnings, which is why profit shows up as equity. Scroll through a new business&rsquo;s first few transactions.'
  }, function (st, g, read) {
    var ACC = [['Cash', 'A', '#7cc4ff'], ['Receivables', 'A', '#5fd3b0'], ['Inventory', 'A', '#c39bff'], ['Equipment', 'A', '#8fb1bd'], ['Bank loan', 'L', '#ff6a55'], ['Payables', 'L', '#ff8a5c'], ['Share capital', 'E', '#ffd166'], ['Retained earnings', 'E', '#eaf6f8']];
    var TX = [['Start-up', {}, ''], ['Owners invest $50k', { 0: 50, 6: 50 }, 'Dr Cash 50 / Cr Share capital 50'], ['Borrow $20k from the bank', { 0: 20, 4: 20 }, 'Dr Cash 20 / Cr Bank loan 20'], ['Buy equipment for $30k cash', { 3: 30, 0: -30 }, 'Dr Equipment 30 / Cr Cash 30'],
      ['Buy $15k of stock on credit', { 2: 15, 5: 15 }, 'Dr Inventory 15 / Cr Payables 15'], ['Sell stock costing $10k for $18k on account', { 1: 18, 2: -10, 7: 8 }, 'Dr Receivables 18 / Cr Revenue 18;  Dr COGS 10 / Cr Inventory 10'],
      ['Collect $12k from customers', { 0: 12, 1: -12 }, 'Dr Cash 12 / Cr Receivables 12'], ['Pay suppliers $9k', { 0: -9, 5: -9 }, 'Dr Payables 9 / Cr Cash 9'], ['Pay $4k of wages', { 0: -4, 7: -4 }, 'Dr Wages expense 4 / Cr Cash 4'], ['Record $3k of depreciation', { 3: -3, 7: -3 }, 'Dr Depreciation 3 / Cr Equipment 3']];
    var k = 0, bal = ACC.map(function () { return 0; }), shown = bal.slice();
    function target() { var b = ACC.map(function () { return 0; }); for (var i = 1; i <= k; i++) for (var a in TX[i][1]) b[a] += TX[i][1][a]; return b; }
    onScroll(function () { var p = progress(st.cv); k = Math.min(TX.length - 1, Math.floor(p * TX.length)); g(p, k + ' of ' + (TX.length - 1)); bal = target(); });
    st.frame = function (dt) { shown = shown.map(function (v, i) { return v + (bal[i] - v) * Math.min(1, dt * 5); }); };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, b = H - px(st, 30), t = px(st, 70), sc = (b - t) / 90, cw = Math.min(px(st, 150), W * 0.2), x1 = W * 0.3 - cw / 2, x2 = W * 0.3 + cw * 0.8;
      [[x1, 'A', 'Assets'], [x2, 'LE', 'Liabilities + equity']].forEach(function (col) { var y = b;
        ACC.forEach(function (a, i) { if (col[1].indexOf(a[1]) < 0) return; var v = Math.max(0, shown[i]); if (v < 0.05) return; var h = v * sc; y -= h;
          c.fillStyle = a[2]; c.globalAlpha = 0.8; c.fillRect(col[0], y, cw, h - 1); c.globalAlpha = 1; if (h > px(st, 14)) text(st, a[0] + ' ' + v.toFixed(0), col[0] + cw / 2, y + h / 2 + px(st, 4), DEEP, 'center'); });
        var tot = ACC.reduce(function (s, a, i) { return s + (col[1].indexOf(a[1]) >= 0 ? Math.max(0, shown[i]) : 0); }, 0);
        text(st, col[2], col[0] + cw / 2, b + px(st, 18), MIST, 'center'); text(st, '$' + tot.toFixed(0) + 'k', col[0] + cw / 2, b - tot * sc - px(st, 8), FOAM, 'center', 12); });
      axes(st, x1 - px(st, 20), b, x2 + cw + px(st, 20), b);
      var jx = W * 0.58, jy = px(st, 30);
      text(st, 'Journal', jx, jy, MIST); for (var i = 1; i < TX.length; i++) { var on = i <= k, cur = i === k;
        text(st, i + '. ' + TX[i][0], jx, jy + px(st, 10) + i * px(st, 22), cur ? GOLD : on ? FOAM : 'rgba(143,177,189,.35)', 'left', 12); }
      if (k) text(st, TX[k][2], jx, jy + px(st, 10) + TX.length * px(st, 22) + px(st, 8), GOLD);
      var A = bal.slice(0, 4).reduce(function (s, v) { return s + v; }, 0), LE = bal.slice(4).reduce(function (s, v) { return s + v; }, 0);
      read(k ? 'After “' + TX[k][0].toLowerCase() + '”: assets $' + A + 'k = liabilities $' + (bal[4] + bal[5]) + 'k + equity $' + (bal[6] + bal[7]) + 'k. It balances, as it must. Scroll for the next transaction.' : 'An empty balance sheet. Scroll to start recording transactions.');
      void LE;
    };
  });

  /* ECON 3100: subgame perfection by backward induction */
  def('ECON3100', { gauge: 'Backward induction', hint: 'Point at a node to see its subgame', controls: '<button class="chip" type="button" data-gt="entry" aria-pressed="true">Entry deterrence</button><button class="chip" type="button" data-gt="cent" aria-pressed="false">Centipede</button>',
    aria: 'Game trees solved by backward induction: each decision node is replaced by its best choice from the bottom up, revealing the subgame perfect equilibrium.',
    note: 'In a sequential game, a plan has to make sense at every point where it might be used, not just on the path that actually happens. Backward induction solves the last decisions first and works up, so every subgame is played optimally: a subgame perfect equilibrium. In the entry game, &ldquo;stay out or I&rsquo;ll fight&rdquo; is a Nash equilibrium, but the threat isn&rsquo;t credible: once the entrant is in, fighting hurts the incumbent too. In the centipede game the same logic unravels from the end, and the first player takes the small prize immediately, even though both could do far better by cooperating, a famous gap between theory and how people actually play.'
  }, function (st, g, read) {
    var game = 'entry', step = 0, hov = null, GM = {};
    GM.entry = { nodes: { r: { pl: 'Entrant', x: 0.5, y: 0.14, k: [['Out', 'o'], ['In', 'i']] }, i: { pl: 'Incumbent', x: 0.7, y: 0.5, k: [['Fight', 'f'], ['Accommodate', 'a']] },
      o: { pay: [0, 4], x: 0.28, y: 0.5 }, f: { pay: [-1, 1], x: 0.56, y: 0.86 }, a: { pay: [2, 2], x: 0.86, y: 0.86 } }, root: 'r', names: ['Entrant', 'Incumbent'] };
    var cn = { }, P = [[1, 0], [0, 2], [3, 1], [2, 4], [5, 3], [4, 6], [6, 5]];
    for (var i = 0; i < 6; i++) { cn['n' + i] = { pl: i % 2 ? 'P2' : 'P1', x: 0.08 + i * 0.155, y: 0.3, k: [['Take', 't' + i], ['Pass', i < 5 ? 'n' + (i + 1) : 'end']] }; cn['t' + i] = { pay: P[i], x: 0.08 + i * 0.155, y: 0.72 }; }
    cn.end = { pay: P[6], x: 0.08 + 6 * 0.155, y: 0.3 };
    GM.cent = { nodes: cn, root: 'n0', names: ['P1', 'P2'] };
    function order(G) { var out = []; (function walk(id) { var n = G.nodes[id]; if (n.k) { n.k.forEach(function (e) { walk(e[1]); }); out.push(id); } })(G.root); return out; }
    function solve(G, upto) { var ord = order(G), val = {}, pick = {}; for (var id in G.nodes) if (G.nodes[id].pay) val[id] = G.nodes[id].pay;
      ord.slice(0, upto).forEach(function (id) { var n = G.nodes[id], who = G.names.indexOf(n.pl), best = null; n.k.forEach(function (e) { if (!best || val[e[1]][who] > val[best[1]][who]) best = e; }); pick[id] = best[1]; val[id] = val[best[1]]; });
      return { val: val, pick: pick, n: ord.length }; }
    E.chips('[data-gt]', 'gt', function (k) { game = k; kick(); });
    function kick() { var p = progress(st.cv), G = GM[game], n = order(G).length; step = Math.min(n + 1, Math.floor(p * (n + 2))); g(p, step <= n ? step + ' of ' + n + ' nodes solved' : 'solved'); st.redraw(); }
    onScroll(kick);
    function geo() { return { l: px(st, 30), t: px(st, 20), w: st.W - px(st, 60), h: st.H - px(st, 40) }; }
    hover(st, function (p) { hov = null; if (p) { var gg = geo(), G = GM[game]; for (var id in G.nodes) { var n = G.nodes[id]; if (n.k && Math.hypot(p[0] - (gg.l + n.x * gg.w), p[1] - (gg.t + n.y * gg.h)) < px(st, 22)) hov = id; } } st.redraw(); });
    st.draw = function () {
      clear(st); var c = st.ctx, G = GM[game], gg = geo(), S = solve(G, step), P2 = function (id) { var n = G.nodes[id]; return [gg.l + n.x * gg.w, gg.t + n.y * gg.h]; };
      var sub = {}; if (hov) (function mark(id) { sub[id] = 1; var n = G.nodes[id]; if (n.k) n.k.forEach(function (e) { mark(e[1]); }); })(hov);
      var onPath = {}; if (step > S.n) { var id = G.root; while (G.nodes[id].k) { onPath[id] = 1; id = S.pick[id]; } onPath[id] = 1; }
      for (var a in G.nodes) { var n = G.nodes[a]; if (!n.k) continue; var pa = P2(a);
        n.k.forEach(function (e) { var pb = P2(e[1]), solved = a in S.pick, chosen = S.pick[a] === e[1];
          c.strokeStyle = solved ? (chosen ? GOLD : 'rgba(143,177,189,.18)') : 'rgba(143,177,189,.6)'; c.lineWidth = px(st, chosen ? 3.2 : 1.6);
          if (hov && !sub[a]) c.globalAlpha = 0.25; line(c, [pa, pb]); c.stroke(); c.globalAlpha = 1;
          text(st, e[0], (pa[0] + pb[0]) / 2 + px(st, 6), (pa[1] + pb[1]) / 2 - px(st, 4), chosen ? GOLD : MIST); }); }
      for (a in G.nodes) { n = G.nodes[a]; var p = P2(a), dim = hov && !sub[a] ? 0.3 : 1; c.globalAlpha = dim;
        if (n.k) { c.fillStyle = onPath[a] ? GOLD : n.pl === G.names[0] ? BLUE : ROPE; c.beginPath(); c.arc(p[0], p[1], px(st, 12), 0, 7); c.fill(); text(st, n.pl, p[0], p[1] - px(st, 18), FOAM, 'center');
          if (a in S.pick) text(st, '(' + S.val[a].join(', ') + ')', p[0], p[1] + px(st, 28), GOLD, 'center'); }
        else { c.fillStyle = onPath[a] ? 'rgba(255,209,102,.25)' : 'rgba(143,177,189,.12)'; c.fillRect(p[0] - px(st, 30), p[1] - px(st, 12), px(st, 60), px(st, 24)); text(st, '(' + n.pay.join(', ') + ')', p[0], p[1] + px(st, 4), FOAM, 'center', 12); }
        c.globalAlpha = 1; }
      if (hov) { var hp = P2(hov); c.strokeStyle = 'rgba(234,246,248,.4)'; c.setLineDash([px(st, 4), px(st, 4)]); c.strokeRect(hp[0] - px(st, 50), hp[1] - px(st, 34), gg.l + gg.w - hp[0] + px(st, 40), gg.t + gg.h - hp[1] + px(st, 30)); c.setLineDash([]); }
      text(st, 'payoffs (' + G.names.join(', ') + ')', gg.l, st.H - px(st, 8), MIST);
      var done = step > S.n;
      if (game === 'entry') read(done ? 'Subgame perfect equilibrium: the entrant goes In and the incumbent accommodates, (2, 2). “Stay out or I’ll fight” is also a Nash equilibrium, but the threat isn’t credible: once entry happens, fighting gives the incumbent 1 instead of 2.' : step === 0 ? 'Scroll to solve the tree from the bottom up.' : 'The incumbent’s choice is solved first: given entry, accommodating (2) beats fighting (1). Scroll on.');
      else read(done ? 'Unravelled from the end: every player takes at their first chance, so P1 takes immediately for (1, 0), though passing all the way would give (6, 5).' : step === 0 ? 'Scroll to solve the centipede from its last move backward.' : step + ' of ' + S.n + ' decisions solved, each one a take: at every node, taking beats what the other player would leave you. Scroll on.');
    };
  });

  /* ECON 4700: discrete dynamics: the cobweb model and the multiplier-accelerator */
  def('ECON4700', { gauge: 'Parameter', controls: '<button class="chip" type="button" data-dd="cob" aria-pressed="true">Cobweb market</button><button class="chip" type="button" data-dd="sam" aria-pressed="false">Multiplier–accelerator</button>',
    aria: 'Difference equations in economics: a cobweb price cycle converging or exploding, and the Samuelson multiplier-accelerator with its characteristic roots against the unit circle.',
    note: 'Economic time often moves in steps, so the models are difference equations. <b>Cobweb</b>: farmers plant this year based on last year&rsquo;s price, \\(q^s_t = d\\,p_{t-1}\\), and the price clears the market, \\(p_t = a - q^s_t\\); the price oscillates around equilibrium and settles only if supply is less responsive than demand (\\(d < 1\\)). <b>Multiplier&ndash;accelerator</b>: Samuelson&rsquo;s \\(Y_t = c(1+v)Y_{t-1} - cvY_{t-2} + G\\) is second order, and its behaviour is set by the roots of \\(\\lambda^2 - c(1+v)\\lambda + cv = 0\\): inside the unit circle the economy settles, complex roots make business cycles, and once \\(cv > 1\\) the cycles explode.'
  }, function (st, g, read) {
    var mode = 'cob', d = 0.8, v = 1, cc = 0.75, path = [], k = 0, acc = 0, lab = document.querySelector('#g-ECON4700 .k');
    function build() { path = []; if (mode === 'cob') { var p = 3; for (var i = 0; i < 40; i++) { path.push(p); p = 10 - d * p; } }
      else { var Y = [100, 104]; for (i = 2; i < 60; i++) Y.push(cc * (1 + v) * Y[i - 1] - cc * v * Y[i - 2] + 25); path = Y; } k = 1; acc = 0; }
    E.chips('[data-dd]', 'dd', function (m) { mode = m; kick(); });
    function kick() { var p = progress(st.cv); if (mode === 'cob') { var nd = Math.round((0.5 + 0.7 * p) * 100) / 100; lab.textContent = 'Supply response d'; g(p, 'd = ' + nd.toFixed(2)); if (nd !== d) d = nd; }
      else { var nv = Math.round(3 * p * 100) / 100; lab.textContent = 'Accelerator v'; g(p, 'v = ' + nv.toFixed(2)); v = nv; } build(); }
    onScroll(kick);
    st.frame = function (dt) { acc += dt; if (acc > (mode === 'cob' ? 0.45 : 0.12)) { acc = 0; k++; if (k > path.length + 8) k = 1; } };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, wide = W > H * 1.4, lw = wide ? W * 0.45 : W, lh = wide ? H : H * 0.5, n = Math.min(k, path.length);
      var l = px(st, 40), r = lw - px(st, 16), t = px(st, 20), b = lh - px(st, 26);
      var gx = wide ? lw + px(st, 40) : px(st, 40), gy = wide ? px(st, 20) : lh + px(st, 20), gw = W - gx - px(st, 14), gb = H - px(st, 26);
      if (mode === 'cob') {
        var X = function (q) { return l + q / 10 * (r - l); }, Y = function (p) { return b - p / 10 * (b - t); };
        axes(st, l, b, r, b); axes(st, l, b, l, t); c.lineWidth = px(st, 2);
        c.strokeStyle = BLUE; line(c, [[X(0), Y(10)], [X(10), Y(0)]]); c.stroke(); c.strokeStyle = GREEN; line(c, [[X(0), Y(0)], [X(10), Y(10 / d)]]); c.stroke();
        text(st, 'demand', X(1), Y(9) - px(st, 6), BLUE); text(st, 'supply (last year’s price)', X(Math.min(9.8, 9 * d)), Y(Math.min(9.8, 9)) - px(st, 8), GREEN, 'right');
        var pts = []; for (var i = 0; i < n - 1; i++) { var p0 = path[i], q = d * p0, p1 = path[i + 1]; if (Math.abs(p1) > 30) break; pts.push([X(q), Y(p0)], [X(q), Y(p1)]); }
        c.strokeStyle = GOLD; c.lineWidth = px(st, 1.6); c.save(); c.beginPath(); c.rect(l, t, r - l, b - t); c.clip(); line(c, pts); c.stroke(); c.restore();
        text(st, 'quantity →', r, b + px(st, 18), MIST, 'right'); text(st, '↑ price', l + px(st, 6), t + px(st, 4), MIST);
        var pe = 10 / (1 + d); axes(st, gx, gb, gx + gw, gb); axes(st, gx, gb, gx, gy);
        var GY = function (p) { return gb - Math.max(-2, Math.min(12, p)) / 12 * (gb - gy); };
        c.strokeStyle = 'rgba(234,246,248,.3)'; c.lineWidth = px(st, 1); line(c, [[gx, GY(pe)], [gx + gw, GY(pe)]]); c.stroke();
        c.strokeStyle = GOLD; c.lineWidth = px(st, 2); line(c, path.slice(0, n).map(function (p, i) { return [gx + i / 20 * gw, GY(p)]; }).filter(function (q) { return q[0] <= gx + gw; })); c.stroke();
        text(st, 'price each year', gx + px(st, 6), gy + px(st, 4), GOLD);
        read(d < 0.97 ? 'd = ' + d.toFixed(2) + ': supply reacts less than demand, so the price swings shrink toward the equilibrium ' + pe.toFixed(2) + '.' : d < 1.03 ? 'd ≈ 1: the price cycles forever between two values.' : 'd = ' + d.toFixed(2) + ': supply over-reacts and the price swings grow every year.');
      } else {
        var bb = cc * (1 + v), D = bb * bb - 4 * cc * v, roots = D >= 0 ? [[(bb + Math.sqrt(D)) / 2, 0], [(bb - Math.sqrt(D)) / 2, 0]] : [[bb / 2, Math.sqrt(-D) / 2], [bb / 2, -Math.sqrt(-D) / 2]], mod = Math.max(Math.hypot(roots[0][0], roots[0][1]), Math.hypot(roots[1][0], roots[1][1]));
        var R = Math.min(r - l, b - t) * 0.32, cx = (l + r) / 2, cy = (t + b) / 2;
        axes(st, cx - R * 1.5, cy, cx + R * 1.5, cy); axes(st, cx, cy + R * 1.5, cx, cy - R * 1.5);
        c.strokeStyle = MIST; c.lineWidth = px(st, 1.5); c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke(); text(st, 'unit circle', cx + R * 0.72, cy - R * 0.78, MIST);
        roots.forEach(function (z) { c.fillStyle = mod < 1 ? GREEN : ROPE; c.beginPath(); c.arc(cx + Math.max(-1.45, Math.min(1.45, z[0])) * R, cy - Math.max(-1.45, Math.min(1.45, z[1])) * R, px(st, 7), 0, 7); c.fill(); });
        text(st, 'characteristic roots (c = ' + cc + ')', l, t + px(st, 4), FOAM);
        var Ye = 25 / (1 - cc); axes(st, gx, gb, gx + gw, gb); axes(st, gx, gb, gx, gy);
        var GY2 = function (y) { return (gb + gy) / 2 - Math.max(-1, Math.min(1, (y - Ye) / 12)) * (gb - gy) / 2; };
        c.strokeStyle = 'rgba(234,246,248,.3)'; c.lineWidth = px(st, 1); line(c, [[gx, GY2(Ye)], [gx + gw, GY2(Ye)]]); c.stroke();
        c.strokeStyle = GOLD; c.lineWidth = px(st, 2); line(c, path.slice(0, n).map(function (y, i) { return [gx + i / 59 * gw, GY2(y)]; })); c.stroke();
        text(st, 'national income', gx + px(st, 6), gy + px(st, 4), GOLD);
        read('v = ' + v.toFixed(2) + ': roots ' + (D < 0 ? 'complex, so income cycles, ' : 'real, so no cycles, ') + (mod < 1 ? 'inside the unit circle, so it settles (|λ| = ' + mod.toFixed(2) + ').' : 'outside the unit circle, so it explodes (|λ| = ' + mod.toFixed(2) + ').') + ' Scroll to strengthen the accelerator.');
      }
    };
    build();
  });

})();
