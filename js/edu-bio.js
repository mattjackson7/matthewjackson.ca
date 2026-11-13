/* Education: one demo per biology and chemistry course. Loaded after education.js, which exposes EDU (the helpers). */
(function () {
  'use strict';
  var E = window.EDU; if (!E) return;
  var px = E.px, text = E.text, axes = E.axes, clear = E.clear, onScroll = E.onScroll, progress = E.progress, hover = E.hover, rng = E.rng, def = E.def;
  var FOAM = E.FOAM, MIST = E.MIST, ROPE = E.ROPE, DEEP = E.DEEP, BLUE = '#7cc4ff', GOLD = '#ffd166', GREEN = '#5fd3b0', PURPLE = '#c39bff';
  function line(c, pts) { c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); }

  /* BIOL 1070: a tree of life growing by speciation and extinction */
  def('BIOL1070', { gauge: 'Time', aria: 'A branching tree of species through time: lineages split and go extinct, with a mass extinction partway through.',
    note: 'Biodiversity as a birth&ndash;death process: every living lineage splits into two species at some rate and goes extinct at another, and the tree of life is what&rsquo;s left. Most branches end (extinction is the fate of almost every species that has lived), and the survivors&rsquo; ancestry traces back through just a few deep lines. Partway through, a mass extinction wipes out most lineages at once; the survivors then radiate to fill the empty space, as mammals did after the dinosaurs.'
  }, function (st, g, read) {
    var T = 10, L, lam = 0.62, mu = 0.32, dt = 0.02, tm = 6;
    for (var seed = 31; seed < 400; seed++) {
      var R = rng(seed); L = [{ b: 0, d: T, p: -1 }];
      for (var t = 0; t < T; t += dt) {
        var n = L.length;
        for (var i = 0; i < n; i++) { var l = L[i]; if (l.d < T || l.b > t) continue;
          if (Math.abs(t - tm) < dt / 2 && R() < 0.75) { l.d = t; continue; }
          var live = L.filter(function (q) { return q.d >= T && q.b <= t; }).length;
          if (R() < mu * dt) l.d = t; else if (live < 90 && R() < lam * dt) { L.push({ b: t, d: T, p: i }); } }
      }
      var end = L.filter(function (q) { return q.d >= T; }).length, early = L.filter(function (q) { return q.b < 1.5; }).length;
      if (end >= 25 && early >= 3 && L.length < 400) break;
    }
    // order tips by depth-first walk so branches don't cross
    var kids = L.map(function () { return []; }); L.forEach(function (l, i) { if (l.p >= 0) kids[l.p].push(i); });
    var y = 0; (function walk(i) { var ks = kids[i].slice().sort(function (a, b) { return L[b].b - L[a].b; }); var half = Math.floor(ks.length / 2);
      ks.slice(0, half).forEach(walk); L[i].y = y++; ks.slice(half).forEach(walk); })(0);
    var now = 0;
    onScroll(function () { var p = progress(st.cv); now = T * p; g(p, (now * 10).toFixed(0) + ' Myr'); st.redraw(); });
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, l0 = px(st, 20), r0 = W - px(st, 20), t0 = px(st, 20), b0 = H * 0.78, Y = function (v) { return t0 + v / (y - 1) * (b0 - t0); }, X = function (v) { return l0 + v / T * (r0 - l0); };
      if (now > tm) { c.fillStyle = 'rgba(255,106,85,.12)'; c.fillRect(X(tm) - px(st, 3), t0, px(st, 6), b0 - t0); text(st, 'mass extinction', X(tm), t0 - px(st, 6), ROPE, 'center'); }
      L.forEach(function (l, i) { if (l.b > now) return; var end = Math.min(l.d, now), alive = l.d >= T || l.d > now;
        c.strokeStyle = alive ? GREEN : 'rgba(143,177,189,.35)'; c.lineWidth = px(st, alive ? 1.8 : 1.1);
        line(c, [[X(l.b), Y(l.y)], [X(end), Y(l.y)]]); c.stroke();
        if (l.p >= 0) { line(c, [[X(l.b), Y(L[l.p].y)], [X(l.b), Y(l.y)]]); c.stroke(); }
        if (!alive) { c.fillStyle = 'rgba(255,106,85,.6)'; c.beginPath(); c.arc(X(end), Y(l.y), px(st, 2), 0, 7); c.fill(); } });
      c.strokeStyle = 'rgba(234,246,248,.4)'; c.lineWidth = px(st, 1); line(c, [[X(now), t0], [X(now), b0]]); c.stroke();
      // species count through time
      var gb = H - px(st, 20), gt = b0 + px(st, 18), mx = 1, pts = [];
      for (var k = 0; k <= 200; k++) { var tt = k / 200 * now, cnt = L.filter(function (q) { return q.b <= tt && q.d > tt; }).length; mx = Math.max(mx, cnt); pts.push([tt, cnt]); }
      var M = Math.max(30, mx); c.strokeStyle = GREEN; c.lineWidth = px(st, 1.8); line(c, pts.map(function (q) { return [X(q[0]), gb - q[1] / M * (gb - gt)]; })); c.stroke();
      text(st, 'living species', l0, gt - px(st, 2), GREEN);
      var living = L.filter(function (q) { return q.b <= now && q.d > now; }).length, ever = L.filter(function (q) { return q.b <= now; }).length;
      read((now * 10).toFixed(0) + ' million years in: ' + living + ' living species, out of ' + ever + ' that have ever existed. ' + (now > tm && now < tm + 1.5 ? 'The mass extinction has just cut the tree back.' : 'Scroll to let time pass.'));
    };
  });

  /* BIOL 1080: blood glucose and insulin through a day */
  def('BIOL1080', { gauge: 'Time of day', controls: '<button class="chip" type="button" data-gl="ok" aria-pressed="true">Healthy</button><button class="chip" type="button" data-gl="t2" aria-pressed="false">Insulin resistant</button><button class="chip" type="button" data-gl="t1" aria-pressed="false">No insulin</button>',
    aria: 'Blood glucose and insulin through a day with three meals, for a healthy person, someone insulin resistant, and someone making no insulin.',
    note: 'Blood sugar is held near 90 mg/dL by negative feedback: a meal raises glucose, the pancreas releases insulin, and insulin makes tissues take glucose up, which switches the insulin back off. This is a simplified version of the Bergman minimal model. In type 2 diabetes the tissues respond weakly to insulin, so the pancreas pumps out more and glucose still climbs higher and falls slower; in type 1 there is no insulin at all, so each meal stacks on the last.'
  }, function (st, g, read) {
    var type = 'ok', now = 0, data = {};
    function sim(type) {
      var p1 = 0.003, p2 = 0.03, p3 = type === 't2' ? 1e-5 : 4e-5, Gb = 90, Ib = 10, nI = 0.12, k = type === 't1' ? 0 : type === 't2' ? 0.08 : 0.05, G = Gb, X = 0, I = Ib, out = [];
      var meals = [[480, 90], [780, 110], [1140, 120]], tau = 35;
      for (var t = 0; t < 1440; t++) { var Ra = 0; meals.forEach(function (m) { var u = t - m[0]; if (u > 0) Ra += m[1] * u / (tau * tau) * Math.exp(-u / tau); });
        G += -(p1 + X) * G + p1 * Gb + Ra; X += -p2 * X + p3 * (I - Ib); I += -nI * (I - Ib) + k * Math.max(0, G - Gb); out.push([G, I]); }
      return out;
    }
    ['ok', 't2', 't1'].forEach(function (k) { data[k] = sim(k); });
    E.chips('[data-gl]', 'gl', function (k) { type = k; st.redraw(); });
    onScroll(function () { var p = progress(st.cv, 0.9, 0.3); now = Math.floor(1439 * p); g(p, Math.floor(now / 60) + ':' + ('0' + now % 60).slice(-2)); st.redraw(); });
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, l = px(st, 50), r = W - px(st, 16), mid = H * 0.62, t1 = px(st, 20), b2 = H - px(st, 26);
      var X = function (t) { return l + t / 1440 * (r - l); }, YG = function (v) { return mid - (v - 50) / 200 * (mid - t1); }, YI = function (v) { return b2 - v / 50 * (b2 - mid - px(st, 26)); };
      c.fillStyle = 'rgba(95,211,176,.08)'; c.fillRect(l, YG(140), r - l, YG(70) - YG(140)); text(st, 'normal range', r - px(st, 4), YG(140) + px(st, 14), GREEN, 'right');
      axes(st, l, mid, r, mid); axes(st, l, b2, r, b2);
      [480, 780, 1140].forEach(function (m, i) { c.fillStyle = 'rgba(255,209,102,.7)'; c.beginPath(); c.arc(X(m), mid + px(st, 10), px(st, 4), 0, 7); c.fill(); text(st, ['breakfast', 'lunch', 'dinner'][i], X(m), mid + px(st, 24), GOLD, 'center'); });
      ['ok', 't2', 't1'].forEach(function (k) { if (k === type) return; c.strokeStyle = 'rgba(143,177,189,.25)'; c.lineWidth = px(st, 1); line(c, data[k].map(function (q, t) { return [X(t), YG(q[0])]; })); c.stroke(); });
      var d = data[type].slice(0, now + 1);
      c.strokeStyle = ROPE; c.lineWidth = px(st, 2.4); line(c, d.map(function (q, t) { return [X(t), YG(q[0])]; })); c.stroke();
      c.strokeStyle = BLUE; c.lineWidth = px(st, 2); line(c, d.map(function (q, t) { return [X(t), YI(q[1])]; })); c.stroke();
      var cur = data[type][now]; c.fillStyle = ROPE; c.beginPath(); c.arc(X(now), YG(cur[0]), px(st, 5), 0, 7); c.fill();
      text(st, 'glucose (mg/dL)', l, t1 - px(st, 4), ROPE); text(st, 'insulin', l, mid + px(st, 44), BLUE);
      for (var h = 0; h <= 24; h += 6) text(st, h + ':00', X(h * 60), b2 + px(st, 16), MIST, 'center');
      var peak = Math.max.apply(0, data[type].map(function (q) { return q[0]; }));
      read({ ok: 'Healthy', t2: 'Insulin resistant', t1: 'No insulin' }[type] + ': glucose is ' + cur[0].toFixed(0) + ' mg/dL at ' + Math.floor(now / 60) + ':' + ('0' + now % 60).slice(-2) + ', peaking at ' + peak.toFixed(0) + ' over the day. Scroll through the day.');
    };
  });

  /* CHEM 1040: titrating an acid */
  def('CHEM1040', { gauge: 'Base added', controls: '<button class="chip" type="button" data-ac="weak" aria-pressed="true">Acetic acid (weak)</button><button class="chip" type="button" data-ac="strong" aria-pressed="false">HCl (strong)</button>',
    aria: 'A titration curve: pH against volume of sodium hydroxide added, with the buffer region, half-equivalence point and equivalence point, and the flask turning pink at the end point.',
    note: 'Adding sodium hydroxide to 25 mL of 0.1 M acid, with pH found by solving the charge balance exactly. A weak acid like acetic acid buffers: once some of it has been neutralised, the mixture of HA and A\\(^-\\) resists pH change, and halfway to the equivalence point \\(\\text{pH} = \\text{p}K_a\\) (4.76), the Henderson&ndash;Hasselbalch equation. At equivalence the pH shoots up past 7 (the acetate is itself a weak base), and phenolphthalein turns the flask pink. A strong acid has no buffer region and its jump is centred on 7.'
  }, function (st, g, read) {
    var acid = 'weak', vb = 0, Ka = Math.pow(10, -4.76);
    function pH(v, a) { var Ca = 0.1 * 25 / (25 + v), Na = 0.1 * v / (25 + v), lo = -14, hi = 0;
      for (var i = 0; i < 60; i++) { var m = (lo + hi) / 2, h = Math.pow(10, m), A = a === 'weak' ? Ca * Ka / (Ka + h) : Ca, f = h + Na - 1e-14 / h - A; if (f > 0) hi = m; else lo = m; } return -(lo + hi) / 2; }
    E.chips('[data-ac]', 'ac', function (k) { acid = k; st.redraw(); });
    onScroll(function () { var p = progress(st.cv); vb = 50 * p; g(p, vb.toFixed(1) + ' mL'); st.redraw(); });
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, fw = Math.min(W * 0.26, px(st, 220)), l = fw + px(st, 60), r = W - px(st, 16), t = px(st, 20), b = H - px(st, 30);
      var X = function (v) { return l + v / 50 * (r - l); }, Y = function (p) { return b - p / 14 * (b - t); }, cur = pH(vb, acid);
      if (acid === 'weak') { c.fillStyle = 'rgba(95,211,176,.1)'; c.fillRect(X(3), t, X(22) - X(3), b - t); text(st, 'buffer region', X(12.5), t + px(st, 14), GREEN, 'center'); }
      axes(st, l, b, r, b); axes(st, l, b, l, t);
      for (var p = 0; p <= 14; p += 2) text(st, String(p), l - px(st, 8), Y(p) + px(st, 4), MIST, 'right');
      c.strokeStyle = 'rgba(234,246,248,.3)'; c.lineWidth = px(st, 1.4); var pts = []; for (var i = 0; i <= 300; i++) { var v = i / 300 * 50; pts.push([X(v), Y(pH(v, acid))]); } line(c, pts); c.stroke();
      c.strokeStyle = PURPLE; c.lineWidth = px(st, 2.4); line(c, pts.filter(function (q, i) { return i / 300 * 50 <= vb; })); c.stroke();
      c.setLineDash([px(st, 3), px(st, 4)]); c.strokeStyle = 'rgba(255,209,102,.6)'; c.lineWidth = px(st, 1);
      line(c, [[X(25), b], [X(25), t]]); c.stroke(); if (acid === 'weak') { line(c, [[X(12.5), b], [X(12.5), Y(4.76)], [l, Y(4.76)]]); c.stroke(); } c.setLineDash([]);
      text(st, 'equivalence (pH ' + pH(25, acid).toFixed(2) + ')', X(25) + px(st, 6), Y(pH(25, acid)) + px(st, 4), GOLD);
      if (acid === 'weak') text(st, 'pH = pKa at half-way', X(12.5) + px(st, 6), Y(4.76) + px(st, 16), GOLD);
      c.fillStyle = ROPE; c.beginPath(); c.arc(X(vb), Y(cur), px(st, 6), 0, 7); c.fill();
      text(st, 'NaOH added (mL) →', r, b + px(st, 18), MIST, 'right'); text(st, 'pH', l + px(st, 6), t + px(st, 4), MIST);
      // the flask
      var fx = px(st, 20), fy = H * 0.2, fh = H * 0.6, pink = 1 / (1 + Math.pow(10, 9.1 - cur)), lvl = fh * (0.45 + 0.35 * vb / 50);
      c.strokeStyle = MIST; c.lineWidth = px(st, 2); c.beginPath(); c.moveTo(fx + fw * 0.38, fy); c.lineTo(fx + fw * 0.38, fy + fh * 0.35); c.lineTo(fx, fy + fh); c.lineTo(fx + fw, fy + fh); c.lineTo(fx + fw * 0.62, fy + fh * 0.35); c.lineTo(fx + fw * 0.62, fy); c.stroke();
      c.save(); c.beginPath(); c.moveTo(fx + fw * 0.38, fy); c.lineTo(fx + fw * 0.38, fy + fh * 0.35); c.lineTo(fx, fy + fh); c.lineTo(fx + fw, fy + fh); c.lineTo(fx + fw * 0.62, fy + fh * 0.35); c.lineTo(fx + fw * 0.62, fy); c.clip();
      c.fillStyle = 'rgba(' + Math.round(150 + 105 * pink) + ',' + Math.round(200 - 140 * pink) + ',' + Math.round(220 - 40 * pink) + ',' + (0.25 + 0.45 * pink).toFixed(2) + ')'; c.fillRect(fx, fy + fh - lvl, fw, lvl); c.restore();
      text(st, 'pH ' + cur.toFixed(2), fx + fw / 2, fy + fh + px(st, 20), FOAM, 'center', 13);
      read((acid === 'weak' ? 'Acetic acid' : 'Hydrochloric acid') + ' with ' + vb.toFixed(1) + ' mL of base: pH ' + cur.toFixed(2) + '. ' + (vb < 24 ? (acid === 'weak' && vb > 3 ? 'In the buffer region the pH barely moves.' : 'Still acidic.') : vb < 26 ? 'At the equivalence point the pH jumps.' : 'Past the end point: excess base, and the indicator has turned pink.') + ' Scroll to add more.');
    };
  });

  /* BIOL 1090: osmosis across a membrane */
  def('BIOL1090', { gauge: 'Solute on the right', aria: 'A U-tube split by a semipermeable membrane: water crosses toward the side with more solute until the height difference balances the osmotic pressure.',
    note: 'A membrane that lets water through but not the dissolved particles. Water moves to the side with more solute (where it is effectively less concentrated) until the extra height of liquid pushes back hard enough: that pressure is the osmotic pressure, \\(\\Pi = iMRT\\) (van &rsquo;t Hoff). It is why red blood cells swell and burst in pure water, shrivel in seawater, and why plants stay rigid.'
  }, function (st, g, read) {
    var R = rng(6), cs = 0.5, dh = 0, P = [], acc = 0;
    for (var i = 0; i < 150; i++) P.push({ x: R(), y: R(), side: i < 75 ? 0 : 1, s: false });
    for (i = 0; i < 40; i++) P.push({ x: R(), y: R(), side: 1, s: true });
    onScroll(function () { var p = progress(st.cv); cs = p; g(p, (p * 100).toFixed(0) + '%'); });
    st.frame = function (dt) {
      var target = 0.42 * cs; dh += (target - dh) * Math.min(1, dt * 0.8);
      var nS = Math.round(40 * cs);
      P.forEach(function (q, i) { q.x += (R() - 0.5) * dt * 0.6; q.y += (R() - 0.5) * dt * 0.6; q.hidden = q.s && (i - 150) >= nS;
        if (q.y < 0) q.y = -q.y; if (q.y > 1) q.y = 2 - q.y;
        if (q.x < 0) q.x = -q.x;
        if (q.x > 1) { if (!q.s && q.y > 0.55 && R() < (q.side === 0 ? 0.5 + cs * 0.4 : 0.5 - cs * 0.4)) { q.side = 1 - q.side; q.x = 2 - q.x; } else q.x = 2 - q.x; } });
    };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, cx = W / 2, tw = Math.min(W * 0.18, px(st, 140)), b = H - px(st, 24);
      var colL = [cx - tw * 1.5, cx - tw * 0.05], colR = [cx + tw * 0.05, cx + tw * 1.5];
      c.fillStyle = 'rgba(124,196,255,.15)';
      var yl = H * 0.25 + dh * H * 0.22, yr = H * 0.25 - dh * H * 0.22;
      c.fillRect(colL[0], yl, colL[1] - colL[0], b - yl); c.fillRect(colR[0], yr, colR[1] - colR[0], b - yr);
      c.strokeStyle = MIST; c.lineWidth = px(st, 2); [colL, colR].forEach(function (cl) { line(c, [[cl[0], H * 0.08], [cl[0], b], [cl[1], b], [cl[1], H * 0.08]]); c.stroke(); });
      c.strokeStyle = GOLD; c.setLineDash([px(st, 3), px(st, 3)]); line(c, [[cx, H * 0.45], [cx, b]]); c.stroke(); c.setLineDash([]);
      text(st, 'membrane', cx, H * 0.45 - px(st, 8), GOLD, 'center');
      P.forEach(function (q) { if (q.hidden) return; var cl = q.side ? colR : colL, top = q.side ? yr : yl, y = top + q.y * (b - top), x = q.side ? cl[0] + q.x * (cl[1] - cl[0]) : cl[1] - q.x * (cl[1] - cl[0]);
        c.fillStyle = q.s ? GOLD : 'rgba(124,196,255,.85)'; c.beginPath(); c.arc(x, y, px(st, q.s ? 4.5 : 2.4), 0, 7); c.fill(); });
      if (dh > 0.01) { c.strokeStyle = ROPE; c.lineWidth = px(st, 1.5); line(c, [[colR[1] + px(st, 14), yr], [colR[1] + px(st, 14), yl]]); c.stroke(); text(st, 'osmotic pressure', colR[1] + px(st, 20), (yl + yr) / 2, ROPE); }
      text(st, 'pure water', (colL[0] + colL[1]) / 2, b + px(st, 18), BLUE, 'center'); text(st, 'water + solute', (colR[0] + colR[1]) / 2, b + px(st, 18), GOLD, 'center');
      read(cs < 0.02 ? 'Equal on both sides, so water crosses both ways equally and the levels stay level.' : 'Water is crossing into the solute side, raising it until the extra height pushes back as hard as osmosis pulls. Scroll to add more solute.');
    };
  });

  /* CHEM 1050: a zinc-copper cell, from battery to electrolysis */
  def('CHEM1050', { gauge: 'Applied voltage', aria: 'A zinc-copper electrochemical cell: electrons flow through the wire, ions move through the solutions and salt bridge, and the electrodes dissolve or plate; past 1.10 V the cell runs backwards as an electrolytic cell.',
    note: 'A Daniell cell: zinc gives up electrons more readily than copper, \\(E^\\circ_{\\text{cell}} = E^\\circ_{\\text{Cu}} - E^\\circ_{\\text{Zn}} = 0.34 - (-0.76) = 1.10\\) V. Left alone it is a battery (galvanic): zinc oxidises and dissolves at the anode, electrons run through the wire, and copper ions plate onto the cathode, while the salt bridge lets ions drift to keep both sides neutral. Push back with an outside voltage and the current slows; past 1.10 V it reverses and the cell becomes electrolytic, driving the non-spontaneous reaction: copper dissolves and zinc plates, which is how rechargeable batteries charge and how metals are electroplated. Since \\(\\Delta G = -nFE\\), the sign of the net voltage is the sign of spontaneity.'
  }, function (st, g, read) {
    var Vapp = 0, I = 0, R = rng(8), el = [], ions = [], zn = 1, cu = 1, clock = 0;
    for (var i = 0; i < 26; i++) el.push(R());
    for (i = 0; i < 26; i++) ions.push({ side: i < 13 ? 0 : 1, x: R(), y: 0.3 + 0.7 * R(), life: 1 });
    onScroll(function () { var p = progress(st.cv); Vapp = 2 * p; g(p, Vapp.toFixed(2) + ' V'); });
    st.frame = function (dt) {
      clock += dt; var target = (1.1 - Vapp) / 0.6; I += (target - I) * Math.min(1, dt * 3);
      el = el.map(function (u) { return ((u + I * dt * 0.18) % 1 + 1) % 1; });
      zn = Math.max(0.35, Math.min(1.6, zn - I * dt * 0.01)); cu = Math.max(0.35, Math.min(1.6, cu + I * dt * 0.01));
      ions.forEach(function (q) { q.x += (R() - 0.5) * dt * 0.3; q.y += (R() - 0.5) * dt * 0.3; q.x = Math.max(0.02, Math.min(0.98, q.x)); q.y = Math.max(0.3, Math.min(0.98, q.y));
        // galvanic: Cu2+ drifts to its electrode and plates; Zn2+ appears at the zinc
        var toward = I > 0 ? (q.side === 1 ? 1 : 0) : (q.side === 0 ? 1 : 0);
        if (toward) { var ex = q.side === 0 ? 0.22 : 0.78; q.x += (ex - q.x) * Math.abs(I) * dt * 0.8; if (Math.abs(q.x - ex) < 0.04) { q.x = ex; q.y = 0.3 + 0.7 * R(); q.x = (q.side === 0 ? 0.22 : 0.78) + (R() - 0.5) * 0.1; q.side = 1 - q.side; q.x = q.side === 0 ? 0.22 : 0.78; q.fresh = 1; } }
        if (q.fresh) q.fresh = Math.max(0, q.fresh - dt); });
    };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, bw = W * 0.3, bh = H * 0.4, by = H * 0.42, lx = W * 0.12, rx = W - W * 0.12 - bw, sol = by + bh * 0.25;
      var bx = function (side) { return side ? rx : lx; };
      [0, 1].forEach(function (s) { c.fillStyle = s ? 'rgba(124,196,255,.18)' : 'rgba(143,177,189,.12)'; c.fillRect(bx(s), sol, bw, by + bh - sol); c.strokeStyle = MIST; c.lineWidth = px(st, 2);
        line(c, [[bx(s), by], [bx(s), by + bh], [bx(s) + bw, by + bh], [bx(s) + bw, by]]); c.stroke(); });
      // salt bridge
      c.strokeStyle = 'rgba(255,209,102,.5)'; c.lineWidth = px(st, 14); c.lineCap = 'round'; line(c, [[lx + bw * 0.8, sol + px(st, 30)], [lx + bw * 0.8, by - px(st, 10)], [rx + bw * 0.2, by - px(st, 10)], [rx + bw * 0.2, sol + px(st, 30)]]); c.stroke(); c.lineCap = 'butt';
      text(st, 'salt bridge', W / 2, by - px(st, 22), GOLD, 'center');
      // electrodes
      var ez = lx + bw * 0.22, ec = rx + bw * 0.78, ew = px(st, 16);
      c.fillStyle = '#9aa7b0'; c.fillRect(ez - ew * zn / 2, H * 0.14, ew * zn, by + bh * 0.85 - H * 0.14);
      c.fillStyle = '#d98a5c'; c.fillRect(ec - ew * cu / 2, H * 0.14, ew * cu, by + bh * 0.85 - H * 0.14);
      text(st, 'Zn', ez, by + bh + px(st, 18), FOAM, 'center', 13); text(st, 'Cu', ec, by + bh + px(st, 18), FOAM, 'center', 13);
      text(st, I >= 0 ? 'anode (oxidation)' : 'cathode (reduction)', ez, by + bh + px(st, 36), MIST, 'center'); text(st, I >= 0 ? 'cathode (reduction)' : 'anode (oxidation)', ec, by + bh + px(st, 36), MIST, 'center');
      // wire and source
      var wy = H * 0.08, path = [[ez, H * 0.14], [ez, wy], [ec, wy], [ec, H * 0.14]];
      c.strokeStyle = MIST; c.lineWidth = px(st, 2); line(c, path); c.stroke();
      c.fillStyle = DEEP; c.strokeStyle = Vapp > 0.02 ? GOLD : MIST; c.fillRect(W / 2 - px(st, 46), wy - px(st, 14), px(st, 92), px(st, 28)); c.strokeRect(W / 2 - px(st, 46), wy - px(st, 14), px(st, 92), px(st, 28));
      text(st, Vapp > 0.02 ? 'supply ' + Vapp.toFixed(2) + ' V' : 'load', W / 2, wy + px(st, 4), Vapp > 0.02 ? GOLD : MIST, 'center');
      var segs = [[ez, H * 0.14, ez, wy], [ez, wy, ec, wy], [ec, wy, ec, H * 0.14]], lens = segs.map(function (s) { return Math.hypot(s[2] - s[0], s[3] - s[1]); }), tot = lens.reduce(function (a, b) { return a + b; });
      c.fillStyle = BLUE; el.forEach(function (u) { var d = u * tot, k = 0; while (k < 2 && d > lens[k]) { d -= lens[k]; k++; } var s = segs[k], f = d / lens[k]; if (Math.abs(I) < 0.02) return; c.beginPath(); c.arc(s[0] + (s[2] - s[0]) * f, s[1] + (s[3] - s[1]) * f, px(st, 3), 0, 7); c.fill(); });
      text(st, 'e⁻ ' + (I > 0.02 ? '→' : I < -0.02 ? '←' : ''), W / 2, wy + px(st, 34), BLUE, 'center');
      // ions
      ions.forEach(function (q) { var x = bx(q.side) + q.x * bw, y = sol + (q.y - 0.3) / 0.7 * (by + bh - sol - px(st, 6)) + px(st, 3);
        c.fillStyle = q.side ? BLUE : '#c8d3da'; c.globalAlpha = q.fresh ? 1 : 0.8; c.beginPath(); c.arc(x, y, px(st, 4.5), 0, 7); c.fill(); c.globalAlpha = 1; });
      text(st, 'Zn²⁺', lx + bw * 0.6, by + bh - px(st, 8), MIST, 'center'); text(st, 'Cu²⁺', rx + bw * 0.4, by + bh - px(st, 8), BLUE, 'center');
      var E = 1.1 - Vapp;
      text(st, 'net ' + (E >= 0 ? '+' : '') + E.toFixed(2) + ' V   ΔG = ' + (-2 * 96.485 * E).toFixed(0) + ' kJ/mol', W / 2, H - px(st, 10), FOAM, 'center', 12);
      read(Math.abs(E) < 0.03 ? 'At 1.10 V the outside voltage exactly balances the cell: no current flows (this is how the cell voltage is measured).' : E > 0 ? 'Galvanic: zinc dissolves, copper plates, and the cell pushes current through the load' + (Vapp > 0.02 ? ', slowed by the opposing ' + Vapp.toFixed(2) + ' V.' : '.') : 'Electrolytic: the supply forces the reaction backwards, plating zinc and dissolving copper (recharging the cell).');
    };
  });
  /* BIOC 2580: the citric acid cycle, turning */
  def('BIOC2580', { gauge: 'Acetyl-CoA supply', aria: 'The citric acid cycle as a turning wheel: acetyl groups join oxaloacetate, molecules travel round the ring, and carbon dioxide, NADH, FADH2 and GTP fly off at their steps.',
    note: 'The citric acid (Krebs) cycle, the hub of metabolism in the mitochondria. Each two-carbon acetyl group from food joins four-carbon oxaloacetate to make six-carbon citrate. Going round, two carbons leave as CO\\(_2\\) and the energy is captured as three NADH, one FADH\\(_2\\) and one GTP, before oxaloacetate is regenerated to accept the next acetyl. The NADH and FADH\\(_2\\) then feed the electron transport chain, which makes most of the cell&rsquo;s ATP. Scrolling feeds it faster.'
  }, function (st, g, read) {
    var NODES = [['citrate', 6], ['isocitrate', 6], ['α-ketoglutarate', 5], ['succinyl-CoA', 4], ['succinate', 4], ['fumarate', 4], ['malate', 4], ['oxaloacetate', 4]];
    var OUT = { 1: [['CO₂', '#8fb1bd'], ['NADH', BLUE]], 2: [['CO₂', '#8fb1bd'], ['NADH', BLUE]], 3: [['GTP', GOLD]], 4: [['FADH₂', GREEN]], 6: [['NADH', BLUE]] };
    var mols = [], flies = [], tally = { 'CO₂': 0, NADH: 0, 'FADH₂': 0, GTP: 0 }, rate = 0.5, spawn = 0, inflow = [];
    onScroll(function () { var p = progress(st.cv); rate = 0.15 + 1.1 * p; g(p, rate.toFixed(2) + ' per second'); });
    st.frame = function (dt) {
      spawn += dt * rate; if (spawn > 1 && mols.length < 10) { spawn = 0; inflow.push({ t: 0 }); }
      inflow.forEach(function (f) { f.t += dt * 0.8; if (f.t >= 1) { f.done = true; mols.push({ a: 0, last: 0 }); } }); inflow = inflow.filter(function (f) { return !f.done; });
      mols.forEach(function (m) { m.a += dt * 0.09; var k = Math.floor(m.a * 8); if (k !== m.last) { m.last = k; (OUT[k] || []).forEach(function (o, j) { flies.push({ a: k / 8, t: 0, name: o[0], col: o[1], j: j }); }); } });
      mols = mols.filter(function (m) { return m.a < 1; });
      flies.forEach(function (f) { f.t += dt * 0.7; if (f.t >= 1 && !f.done) { f.done = true; tally[f.name]++; } }); flies = flies.filter(function (f) { return !f.done; });
    };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, cx = W * 0.42, cy = H * 0.55, R = Math.min(W * 0.25, H * 0.34);
      var pos = function (a) { var th = -Math.PI / 2 + a * 2 * Math.PI; return [cx + Math.cos(th) * R, cy + Math.sin(th) * R]; };
      c.strokeStyle = 'rgba(95,211,176,.35)'; c.lineWidth = px(st, 10); c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
      NODES.forEach(function (n, i) { var p = pos(i / 8), out = [cx + (p[0] - cx) * 1.28, cy + (p[1] - cy) * 1.2]; c.fillStyle = '#1c5a73'; c.beginPath(); c.arc(p[0], p[1], px(st, 9), 0, 7); c.fill();
        text(st, n[0], out[0], out[1] + px(st, 4), FOAM, p[0] < cx - 5 ? 'right' : p[0] > cx + 5 ? 'left' : 'center'); text(st, n[1] + 'C', p[0], p[1] + px(st, 4), MIST, 'center', 9); });
      // incoming acetyl-CoA
      var entry = pos(0); inflow.forEach(function (f) { var x = cx - R * 1.3 + (entry[0] - (cx - R * 1.3)) * f.t, y = cy - R * 1.15 + (entry[1] - (cy - R * 1.15)) * f.t;
        for (var k = 0; k < 2; k++) { c.fillStyle = GOLD; c.beginPath(); c.arc(x + k * px(st, 7), y, px(st, 4), 0, 7); c.fill(); } });
      text(st, 'acetyl-CoA (2C) in', cx - R * 1.3, cy - R * 1.15 - px(st, 12), GOLD, 'center');
      mols.forEach(function (m) { var p = pos(m.a), nC = NODES[Math.min(7, Math.floor(m.a * 8))][1];
        for (var k = 0; k < nC; k++) { var a = k / nC * 2 * Math.PI + m.a * 9; c.fillStyle = GREEN; c.beginPath(); c.arc(p[0] + Math.cos(a) * px(st, 7), p[1] + Math.sin(a) * px(st, 7), px(st, 3.6), 0, 7); c.fill(); } });
      var tx = W - px(st, 150), ty = px(st, 40), order = ['CO₂', 'NADH', 'FADH₂', 'GTP'], cols = { 'CO₂': '#8fb1bd', NADH: BLUE, 'FADH₂': GREEN, GTP: GOLD };
      flies.forEach(function (f) { var p = pos(f.a), dest = [tx + px(st, 10), ty + order.indexOf(f.name) * px(st, 28)], e = f.t * f.t * (3 - 2 * f.t), mx = (p[0] + dest[0]) / 2 + (f.j ? 30 : -30);
        var x = (1 - e) * (1 - e) * p[0] + 2 * (1 - e) * e * mx + e * e * dest[0], y = (1 - e) * (1 - e) * p[1] + 2 * (1 - e) * e * (p[1] - px(st, 60)) + e * e * dest[1];
        c.fillStyle = f.col; c.beginPath(); c.arc(x, y, px(st, 5), 0, 7); c.fill(); text(st, f.name, x + px(st, 8), y - px(st, 6), f.col); });
      order.forEach(function (k, i) { c.fillStyle = cols[k]; c.beginPath(); c.arc(tx + px(st, 10), ty + i * px(st, 28), px(st, 6), 0, 7); c.fill(); text(st, k + '  ' + tally[k], tx + px(st, 24), ty + i * px(st, 28) + px(st, 4), FOAM, 'left', 12); });
      var turns = tally.GTP;
      read(turns ? turns + ' turns so far: ' + tally['CO₂'] + ' CO₂, ' + tally.NADH + ' NADH, ' + tally['FADH₂'] + ' FADH₂ and ' + tally.GTP + ' GTP, the same 2 : 3 : 1 : 1 ratio every turn. Scroll to feed it faster.' : 'Acetyl groups are joining oxaloacetate. Scroll to feed the cycle faster.');
    };
  });
  /* MBG 2040: genetic drift */
  def('MBG2040', { gauge: 'Population size', aria: 'Allele frequencies in fourteen populations drifting at random over generations until each one fixes or loses the allele; smaller populations drift faster.',
    note: 'Genetics without selection: each generation&rsquo;s gene copies are a random sample of the last (the Wright&ndash;Fisher model), so allele frequencies wander by chance alone. Every line is a separate population starting at 50%. Small populations drift fast and soon lose or fix the allele, typically within about \\(4N\\) generations; large ones barely move. Hardy&ndash;Weinberg equilibrium assumes an infinite population for exactly this reason, and drift is why small, isolated populations lose genetic diversity.'
  }, function (st, g, read) {
    var N = 50, G = 300, runs = [], gen = 0, acc = 0, lastN = 0;
    function binom(n, p, R) { if (n > 60) { var m = n * p, s = Math.sqrt(n * p * (1 - p)), z = Math.sqrt(-2 * Math.log(1 - R())) * Math.cos(2 * Math.PI * R()); return Math.max(0, Math.min(n, Math.round(m + s * z))); } var k = 0; for (var i = 0; i < n; i++) if (R() < p) k++; return k; }
    function sim() { var R = rng(N * 7 + 3); runs = []; for (var r = 0; r < 14; r++) { var p = 0.5, a = [p]; for (var t = 0; t < G; t++) { p = binom(2 * N, p, R) / (2 * N); a.push(p); } runs.push(a); } gen = 0; }
    onScroll(function () { var p = progress(st.cv); N = Math.round(5 * Math.pow(200, p)); g(p, 'N = ' + N); if (N !== lastN) { lastN = N; sim(); } });
    st.frame = function (dt) { acc += dt; if (acc > 0.025) { acc = 0; gen = gen < G ? gen + 1 : (gen > G + 60 ? 0 : gen + 1); } };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, l = px(st, 46), r = W - px(st, 16), t = px(st, 20), b = H - px(st, 30), X = function (v) { return l + v / G * (r - l); }, Y = function (v) { return b - v * (b - t); };
      axes(st, l, b, r, b); axes(st, l, b, l, t); text(st, '100%', l - px(st, 6), t + px(st, 4), MIST, 'right'); text(st, '50%', l - px(st, 6), Y(0.5) + px(st, 4), MIST, 'right'); text(st, '0', l - px(st, 6), b, MIST, 'right');
      var gg = Math.min(gen, G), fix = 0, lost = 0;
      runs.forEach(function (a, i) { c.strokeStyle = ['#7cc4ff', '#5fd3b0', '#c39bff', '#ffd166', '#ff8a5c', '#eaf6f8', '#8fb1bd'][i % 7]; c.globalAlpha = 0.75; c.lineWidth = px(st, 1.5);
        line(c, a.slice(0, gg + 1).map(function (v, t2) { return [X(t2), Y(v)]; })); c.stroke(); c.globalAlpha = 1; if (a[gg] === 1) fix++; if (a[gg] === 0) lost++; });
      text(st, 'generations →', r, b + px(st, 18), MIST, 'right'); text(st, 'allele frequency', l + px(st, 6), t + px(st, 4), MIST);
      read('Population of ' + N + ', generation ' + gg + ': ' + fix + ' of 14 populations have fixed the allele and ' + lost + ' have lost it, by chance alone. Scroll for larger populations.');
    };
  });

  /* BIOM 3200: a map of neurons passing spikes */
  def('BIOM3200', { gauge: 'Background input', hint: 'Point at (or tap) a neuron to fire it', controls: '<button class="chip" type="button" data-nn="bal" aria-pressed="true">With inhibition</button><button class="chip" type="button" data-nn="exc" aria-pressed="false">No inhibition</button>',
    aria: 'A network of neurons: spikes travel along axons to other cells, excitatory ones pushing them toward firing and inhibitory ones holding them back; the trace shows one neuron’s membrane voltage.',
    note: 'A small network of neurons. Each cell body adds up its inputs; when its membrane voltage crosses threshold it fires an all-or-nothing action potential, resets, and is briefly refractory. The spike travels down the axon (the moving dots) and, at each synapse, nudges the next neuron toward firing (excitatory, blue) or away from it (inhibitory, red). Scrolling raises the background input, the random synaptic chatter every real neuron receives. With inhibition, activity stays in check; switch it off and a few spikes can cascade through the whole network, which is roughly what happens in a seizure.'
  }, function (st, g, read) {
    var R = rng(23), N = 46, NE = [], ED = [], spikes = [], drive = 0.4, mode = 'bal', sel = 0, trace = [], clock = 0, fired = [];
    for (var tries = 0; NE.length < N && tries < 5000; tries++) { var x = 0.04 + 0.92 * R(), y = 0.06 + 0.88 * R(); if (NE.every(function (n) { return Math.hypot((n.x - x) * 1.6, n.y - y) > 0.11; })) NE.push({ x: x, y: y, v: R() * 0.5, ref: 0, inh: R() < 0.22, flash: 0 }); }
    NE.forEach(function (n, i) { var d = NE.map(function (m, j) { return [Math.hypot((m.x - n.x) * 1.6, m.y - n.y), j]; }).filter(function (q) { return q[1] !== i; }).sort(function (a, b) { return a[0] - b[0]; });
      d.slice(0, 3 + Math.floor(R() * 2)).forEach(function (q) { ED.push({ a: i, b: q[1], len: q[0], bend: (R() - 0.5) * 0.08 }); }); });
    var out = NE.map(function () { return []; }); ED.forEach(function (e, k) { out[e.a].push(k); });
    E.chips('[data-nn]', 'nn', function (k) { mode = k; });
    onScroll(function () { var p = progress(st.cv); drive = 0.1 + 1.1 * p; g(p, Math.round(drive * 100) + '%'); });
    function fire(i) { var n = NE[i]; if (n.ref > 0) return; n.v = 0; n.ref = 0.25; n.flash = 1; fired.push(clock); out[i].forEach(function (k) { spikes.push({ e: k, t: 0 }); }); }
    var lastHov = -1;
    hover(st, function (p) { if (!p) { lastHov = -1; return; } var best = -1, bd = 1e9; NE.forEach(function (n, i) { var d = Math.hypot(n.x * st.W - p[0], n.y * st.H - p[1]); if (d < bd) { bd = d; best = i; } });
      if (bd < px(st, 26)) { sel = best; if (best !== lastHov) fire(best); lastHov = best; } });
    st.frame = function (dt) {
      dt = Math.min(dt, 0.05); clock += dt;
      NE.forEach(function (n, i) { n.flash = Math.max(0, n.flash - dt * 3); if (n.ref > 0) { n.ref -= dt; return; } var z = Math.sqrt(-2 * Math.log(1 - R())) * Math.cos(2 * Math.PI * R()); n.v += (drive * 1.05 - 1.2 * n.v) * dt + 0.45 * Math.sqrt(dt) * z; if (n.v >= 1) fire(i); });
      for (var k = spikes.length - 1; k >= 0; k--) { var s = spikes[k], e = ED[s.e]; s.t += dt * 0.45 / e.len;
        if (s.t >= 1) { var src = NE[e.a], tgt = NE[e.b], w = src.inh ? (mode === 'bal' ? -0.9 : 0) : 0.42; if (tgt.ref <= 0) { tgt.v += w; if (tgt.v >= 1) fire(e.b); if (tgt.v < -0.6) tgt.v = -0.6; } spikes.splice(k, 1); } }
      trace.push(NE[sel].ref > 0.2 ? 1.6 : NE[sel].v); if (trace.length > 300) trace.shift();
      fired = fired.filter(function (t) { return t > clock - 1; });
    };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, P = function (n) { return [n.x * W, n.y * H]; };
      ED.forEach(function (e) { var a = P(NE[e.a]), b = P(NE[e.b]), mx = (a[0] + b[0]) / 2 - (b[1] - a[1]) * e.bend * 4, my = (a[1] + b[1]) / 2 + (b[0] - a[0]) * e.bend * 4;
        c.strokeStyle = NE[e.a].inh ? 'rgba(255,106,85,.16)' : 'rgba(124,196,255,.16)'; c.lineWidth = px(st, 1.2); c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(mx, my, b[0], b[1]); c.stroke(); e.m = [mx, my]; });
      spikes.forEach(function (s) { var e = ED[s.e], a = P(NE[e.a]), b = P(NE[e.b]), t = s.t, x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * e.m[0] + t * t * b[0], y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * e.m[1] + t * t * b[1];
        var inh = NE[e.a].inh, col = inh ? (mode === 'bal' ? '255,106,85' : '143,177,189') : '255,209,102';
        c.fillStyle = 'rgba(' + col + ',.25)'; c.beginPath(); c.arc(x, y, px(st, 6), 0, 7); c.fill(); c.fillStyle = 'rgb(' + col + ')'; c.beginPath(); c.arc(x, y, px(st, 2.6), 0, 7); c.fill(); });
      NE.forEach(function (n, i) { var p = P(n), base = n.inh ? [255, 106, 85] : [124, 196, 255], k = 0.35 + 0.45 * Math.max(0, Math.min(1, n.v)) + 0.6 * n.flash;
        if (n.flash > 0) { c.fillStyle = 'rgba(255,209,102,' + (n.flash * 0.35).toFixed(2) + ')'; c.beginPath(); c.arc(p[0], p[1], px(st, 9 + 14 * n.flash), 0, 7); c.fill(); }
        c.fillStyle = 'rgb(' + base.map(function (v) { return Math.round(Math.min(255, v * k)); }).join(',') + ')'; c.beginPath(); c.arc(p[0], p[1], px(st, 7), 0, 7); c.fill();
        if (i === sel) { c.strokeStyle = FOAM; c.lineWidth = px(st, 1.5); c.beginPath(); c.arc(p[0], p[1], px(st, 11), 0, 7); c.stroke(); } });
      // voltage trace of the ringed neuron
      var tw = Math.min(W * 0.3, px(st, 260)), th = px(st, 70), tx = W - tw - px(st, 10), ty = H - th - px(st, 10);
      c.fillStyle = 'rgba(7,34,46,.85)'; c.fillRect(tx, ty, tw, th); c.strokeStyle = 'rgba(143,177,189,.3)'; c.lineWidth = px(st, 1); c.strokeRect(tx, ty, tw, th);
      c.setLineDash([px(st, 3), px(st, 3)]); c.beginPath(); c.moveTo(tx, ty + th * 0.3); c.lineTo(tx + tw, ty + th * 0.3); c.stroke(); c.setLineDash([]);
      c.strokeStyle = GOLD; c.lineWidth = px(st, 1.5); line(c, trace.map(function (v, i) { return [tx + i / 300 * tw, ty + th - (Math.max(-0.6, v) + 0.6) / 2.3 * th]; })); c.stroke();
      text(st, 'ringed neuron (dashed: threshold)', tx + px(st, 6), ty + px(st, 12), MIST);
      var rate = fired.length / N;
      read(fired.length + ' spikes in the last second (' + rate.toFixed(1) + ' per neuron). ' + (mode === 'exc' && rate > 2 ? 'Without inhibition the activity is running away through the network.' : mode === 'bal' ? 'Inhibitory cells (red) keep the activity sparse.' : 'Inhibition is off: watch for cascades.') + ' Scroll to raise the background input; point at a neuron to fire it.');
    };
  });

  /* MCB 2050: the lac operon */
  def('MCB2050', { gauge: 'Lactose', controls: '<button class="chip" type="button" data-glu="no" aria-pressed="true">No glucose</button><button class="chip" type="button" data-glu="yes" aria-pressed="false">Glucose present</button>',
    aria: 'The lac operon: a repressor on the operator blocks RNA polymerase; lactose pulls the repressor off and polymerases transcribe the lac genes into mRNA.',
    note: 'Gene regulation in <em>E. coli</em>&rsquo;s lac operon, the classic switch. The genes for digesting lactose (lacZ, lacY, lacA) are blocked by a repressor sitting on the operator. Lactose (as allolactose) binds the repressor and pulls it off, so RNA polymerase can transcribe. But if glucose is around, the cell prefers it: cAMP is low, the CAP activator falls off, and transcription stays weak even with lactose (catabolite repression). Two inputs, one logic gate: on only for lactose AND NOT glucose.'
  }, function (st, g, read) {
    var lac = 0, glu = false, pols = [], mrna = [], R = rng(9), occ = 1, spawn = 0;
    E.chips('[data-glu]', 'glu', function (k) { glu = k === 'yes'; });
    onScroll(function () { var p = progress(st.cv); lac = p; g(p, (p * 100).toFixed(0) + '%'); });
    function expr() { var free = 1 - 1 / (1 + Math.pow(lac / 0.3, 3)); return free * (glu ? 0.08 : 1); }
    st.frame = function (dt) {
      var free = 1 - 1 / (1 + Math.pow(lac / 0.3, 3)); occ += ((1 - free) - occ) * Math.min(1, dt * 3);
      spawn += dt * expr() * 1.6; if (spawn > 1) { spawn = 0; pols.push({ x: 0 }); }
      pols.forEach(function (p) { p.x += dt * 0.12; if (p.x > 1 && !p.done) { p.done = true; mrna.push({ x: 0.55 + R() * 0.4, y: 0, vy: 0.08 + R() * 0.05, a: 1 }); } });
      pols = pols.filter(function (p) { return p.x < 1.05; });
      mrna.forEach(function (m) { m.y += m.vy * dt; m.a -= dt * 0.15; }); mrna = mrna.filter(function (m) { return m.a > 0; });
    };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, dy = H * 0.62, l = px(st, 20), r = W - px(st, 20), X = function (u) { return l + u * (r - l); };
      c.strokeStyle = MIST; c.lineWidth = px(st, 5); line(c, [[l, dy], [r, dy]]); c.stroke();
      var seg = [[0.02, 0.13, 'CAP site', GOLD], [0.13, 0.25, 'promoter', GREEN], [0.25, 0.33, 'operator', ROPE], [0.35, 0.6, 'lacZ', BLUE], [0.61, 0.8, 'lacY', BLUE], [0.81, 0.97, 'lacA', BLUE]];
      seg.forEach(function (s) { c.fillStyle = s[3]; c.globalAlpha = 0.35; c.fillRect(X(s[0]), dy - px(st, 9), X(s[1]) - X(s[0]), px(st, 18)); c.globalAlpha = 1; text(st, s[2], (X(s[0]) + X(s[1])) / 2, dy + px(st, 30), s[3], 'center'); });
      if (!glu) { c.fillStyle = GOLD; c.beginPath(); c.ellipse(X(0.075), dy - px(st, 22), px(st, 22), px(st, 13), 0, 0, 7); c.fill(); text(st, 'CAP', X(0.075), dy - px(st, 18), DEEP, 'center'); }
      var ry = dy - px(st, 24) - (1 - occ) * H * 0.3; c.fillStyle = ROPE; c.globalAlpha = 0.4 + 0.6 * occ; c.beginPath(); c.ellipse(X(0.29), ry, px(st, 26), px(st, 16), 0, 0, 7); c.fill(); c.globalAlpha = 1;
      text(st, 'repressor', X(0.29), ry - px(st, 22), ROPE, 'center');
      for (var i = 0; i < Math.round(lac * 10); i++) { c.fillStyle = PURPLE; var a = i * 0.9, x = X(0.29) + Math.cos(a) * px(st, 60), y = ry - px(st, 30) + Math.sin(a) * px(st, 30) - (1 - occ) * 0; c.beginPath(); c.arc(x, y, px(st, 4), 0, 7); c.fill(); }
      if (lac > 0.05) text(st, 'lactose', X(0.29) + px(st, 70), ry - px(st, 34), PURPLE);
      pols.forEach(function (p) { var x = X(0.18 + p.x * 0.79); c.fillStyle = GREEN; c.beginPath(); c.ellipse(x, dy, px(st, 14), px(st, 11), 0, 0, 7); c.fill();
        c.strokeStyle = 'rgba(234,246,248,.7)'; c.lineWidth = px(st, 1.5); c.beginPath(); for (var k = 0; k <= 20; k++) { var u = k / 20, xx = x - u * Math.min(p.x, 0.6) * (r - l) * 0.35, yy = dy - px(st, 14) - u * px(st, 30) + Math.sin(u * 12) * px(st, 3); k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); });
      mrna.forEach(function (m) { c.strokeStyle = 'rgba(234,246,248,' + m.a.toFixed(2) + ')'; c.lineWidth = px(st, 1.5); c.beginPath(); for (var k = 0; k <= 24; k++) { var xx = X(m.x) + k * px(st, 3), yy = dy - px(st, 60) - m.y * H + Math.sin(k * 0.8) * px(st, 3); k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); });
      var e = expr(); c.fillStyle = 'rgba(95,211,176,.2)'; c.fillRect(px(st, 20), px(st, 20), px(st, 160), px(st, 12)); c.fillStyle = GREEN; c.fillRect(px(st, 20), px(st, 20), px(st, 160) * e, px(st, 12)); text(st, 'expression ' + Math.round(e * 100) + '%', px(st, 190), px(st, 31), GREEN);
      read((lac < 0.15 ? 'No lactose: the repressor sits on the operator and blocks transcription.' : glu ? 'Lactose has freed the operator, but with glucose present CAP is off, so transcription stays weak.' : 'Lactose has pulled the repressor off and CAP is bound: the lac genes are being transcribed.') + ' Scroll to add lactose.');
    };
  });

  /* NUTR 3210: energy in, energy out, and where the difference goes */
  def('NUTR3210', { gauge: 'Daily intake change', aria: 'Energy flowing into a body as food and out as heat and activity; the difference is stored, the body changes size, and weight settles at a new equilibrium.',
    note: 'Energy balance: food energy comes in (carbohydrate, fat and protein), and energy leaves as resting metabolism, the heat of digestion, and activity. Any difference is stored or drawn from body tissue, about 7,700 kcal per kilogram. But a larger body burns more, so the gap closes as weight changes: weight settles at a new equilibrium about 1 kg for every 22 kcal/day of lasting change, with a time constant near a year. The old straight-line rule (dashed) badly overstates long-term change, which is why diets plateau.'
  }, function (st, g, read) {
    var dI = -300, W0 = 80, Wt = 80, day = 0, R = rng(4), food = [], heat = [], hist = [], spawnF = 0, spawnH = 0, lastI = null;
    onScroll(function () { var p = progress(st.cv); dI = Math.round((-600 + 1200 * p) / 25) * 25; g(p, (dI > 0 ? '+' : '') + dI + ' kcal/day'); if (dI !== lastI) { lastI = dI; Wt = W0; day = 0; hist = []; } });
    st.frame = function (dt) {
      day += dt * 60; if (day > 3 * 365) { day = 0; Wt = W0; hist = []; }
      Wt += (dI - 22 * (Wt - W0)) / 7700 * dt * 60; hist.push([day, Wt]);
      var intake = 2600 + dI, out = 2600 + 22 * (Wt - W0);
      spawnF += dt * intake / 500; while (spawnF > 1) { spawnF--; food.push({ t: 0, k: Math.floor(R() * 3), y: R() }); }
      spawnH += dt * out / 500; while (spawnH > 1) { spawnH--; heat.push({ t: 0, y: R(), x: R() }); }
      food.forEach(function (f) { f.t += dt * 0.6; }); food = food.filter(function (f) { return f.t < 1; }); heat.forEach(function (h) { h.t += dt * 0.5; }); heat = heat.filter(function (h) { return h.t < 1; });
    };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, wide = W > H * 1.4, lw = wide ? W * 0.42 : W, lh = wide ? H : H * 0.5, cx = lw * 0.55, cy = lh * 0.55, sc = Math.min(lw, lh) / 300, wf = Math.sqrt(Wt / W0);
      // body
      c.fillStyle = 'rgba(95,211,176,.22)'; c.strokeStyle = GREEN; c.lineWidth = px(st, 2);
      c.beginPath(); c.arc(cx, cy - 92 * sc, 20 * sc, 0, 7); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(cx, cy, 34 * sc * wf * wf, 66 * sc, 0, 0, 7); c.fill(); c.stroke();
      var fatW = 34 * sc * (wf * wf - 1); if (Math.abs(fatW) > 0.5) text(st, Wt > W0 ? 'stored' : 'drawn down', cx, cy + 82 * sc, GOLD, 'center');
      var FC = [GOLD, ROPE, PURPLE];
      food.forEach(function (f) { var x = px(st, 10) + (cx - px(st, 10)) * f.t, y = cy - 40 * sc + f.y * 60 * sc; c.fillStyle = FC[f.k]; c.globalAlpha = 1 - f.t * 0.6; c.beginPath(); c.arc(x, y, px(st, 3.5), 0, 7); c.fill(); });
      heat.forEach(function (h) { var x = cx + 20 * sc + (lw - cx) * h.t, y = cy - 50 * sc + h.y * 90 * sc - h.t * 30 * sc; c.strokeStyle = 'rgba(255,106,85,' + (0.8 - h.t * 0.8).toFixed(2) + ')'; c.lineWidth = px(st, 1.5);
        c.beginPath(); for (var k = 0; k < 6; k++) { var xx = x + k * px(st, 2), yy = y + Math.sin(k + h.t * 10) * px(st, 2); k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); });
      c.globalAlpha = 1;
      text(st, 'food in: ' + (2600 + dI) + ' kcal/day', px(st, 10), px(st, 22), GOLD); text(st, 'heat + activity out: ' + (2600 + 22 * (Wt - W0)).toFixed(0), lw - px(st, 10), px(st, 22), ROPE, 'right');
      text(st, 'carbs · fat · protein', px(st, 10), px(st, 40), MIST);
      // weight curve
      var gx = wide ? lw + px(st, 56) : px(st, 56), gy = wide ? px(st, 20) : lh + px(st, 16), gw = W - gx - px(st, 14), gb = H - px(st, 26), D = 3 * 365, eq = dI / 22;
      var X = function (d) { return gx + d / D * gw; }, Y = function (w) { return gb - (w - 50) / 60 * (gb - gy); };
      axes(st, gx, gb, gx + gw, gb); axes(st, gx, gb, gx, gy);
      for (var w = 60; w <= 100; w += 20) text(st, w + ' kg', gx - px(st, 6), Y(w) + px(st, 4), MIST, 'right');
      for (var y = 0; y <= 3; y++) text(st, 'year ' + y, X(y * 365), gb + px(st, 16), MIST, 'center');
      c.setLineDash([px(st, 5), px(st, 5)]); c.strokeStyle = 'rgba(143,177,189,.6)'; c.lineWidth = px(st, 1.4); c.save(); c.beginPath(); c.rect(gx, gy, gw, gb - gy); c.clip(); line(c, [[X(0), Y(W0)], [X(D), Y(W0 + dI * D / 7700)]]); c.stroke(); c.restore(); c.setLineDash([]);
      c.strokeStyle = 'rgba(255,209,102,.5)'; c.lineWidth = px(st, 1); line(c, [[X(0), Y(W0 + eq)], [X(D), Y(W0 + eq)]]); c.stroke();
      c.strokeStyle = GREEN; c.lineWidth = px(st, 2.6); line(c, hist.map(function (q) { return [X(q[0]), Y(q[1])]; })); c.stroke();
      text(st, 'new equilibrium ' + (W0 + eq).toFixed(1) + ' kg', gx + gw, Y(W0 + eq) - px(st, 8), GOLD, 'right');
      read('Day ' + Math.round(day) + ': ' + Wt.toFixed(1) + ' kg. ' + (dI === 0 ? 'In balance, so nothing changes.' : 'As weight changes, so does the energy burned, and the gap closes: it levels off ' + Math.abs(eq).toFixed(1) + ' kg ' + (dI < 0 ? 'lighter' : 'heavier') + ', not the ' + Math.abs(dI * D / 7700).toFixed(0) + ' kg the straight-line rule predicts.') + ' Scroll to change the intake.');
    };
  });
  /* BIOC 3560: enzyme kinetics as molecules */
  def('BIOC3560', { gauge: 'Substrate', controls: '<button class="chip" type="button" data-inh="none" aria-pressed="true">No inhibitor</button><button class="chip" type="button" data-inh="comp" aria-pressed="false">Competitive</button><button class="chip" type="button" data-inh="non" aria-pressed="false">Non-competitive</button>',
    aria: 'A simulation of enzymes and substrate molecules: substrates diffuse into active sites, are converted and released; the measured rate against substrate concentration traces the Michaelis-Menten curve.',
    note: 'Enzymes, molecule by molecule. Substrates (green) wander until one lands in a free active site, sits there while it is converted, and leaves as product (white). At low concentration the enzymes mostly wait, so the rate rises with substrate; at high concentration every active site is always busy and the rate saturates: the Michaelis&ndash;Menten curve \\(v = V_{\\max}[S]/(K_m + [S])\\), which you trace by scrolling (the dots are rates actually measured from the simulation). A competitive inhibitor (red) occupies the active site itself, so flooding with substrate can outcompete it; a non-competitive one binds elsewhere and switches the enzyme off whatever the substrate, lowering \\(V_{\\max}\\).'
  }, function (st, g, read) {
    var R = rng(13), NE = 9, ENZ = [], S = [], INH = [], nS = 40, mode = 'none', made = 0, rate = 0, bins = { none: {}, comp: {}, non: {} }, tAcc = 0, prod = [];
    for (var i = 0; i < NE; i++) ENZ.push({ x: (i % 3 + 0.5) / 3, y: (Math.floor(i / 3) + 0.5) / 3, a: R() * 6.28, sub: null, t: 0, inh: null, it: 0 });
    for (i = 0; i < 160; i++) S.push({ x: R(), y: R(), vx: 0, vy: 0, on: false });
    for (i = 0; i < 14; i++) INH.push({ x: R(), y: R(), on: false });
    E.chips('[data-inh]', 'inh', function (k) { mode = k; ENZ.forEach(function (e) { if (e.inh != null) { INH[e.inh].on = false; e.inh = null; } }); });
    onScroll(function () { var p = progress(st.cv); nS = Math.round(4 + 150 * p * p); g(p, nS + ' molecules'); });
    function site(e) { return [e.x + Math.cos(e.a) * 0.055, e.y + Math.sin(e.a) * 0.055]; }
    function back(e) { return [e.x - Math.cos(e.a) * 0.055, e.y - Math.sin(e.a) * 0.055]; }
    st.frame = function (dt) {
      dt = Math.min(dt, 0.05);
      ENZ.forEach(function (e) { e.a += dt * 0.25; });
      var walk = function (q, s) { q.x += (R() - 0.5) * dt * s * 3; q.y += (R() - 0.5) * dt * s * 3; if (q.x < 0) q.x = -q.x; if (q.x > 1) q.x = 2 - q.x; if (q.y < 0) q.y = -q.y; if (q.y > 1) q.y = 2 - q.y; };
      S.forEach(function (q, i) { if (i >= nS || q.on) return; walk(q, 0.9);
        ENZ.forEach(function (e) { if (q.on || e.sub != null || (mode === 'comp' && e.inh != null)) return; var s = site(e); if (Math.hypot(q.x - s[0], q.y - s[1]) < 0.045) { e.sub = i; e.t = 0; q.on = true; } }); });
      INH.forEach(function (q, i) { if (mode === 'none' || q.on) return; walk(q, 0.9);
        ENZ.forEach(function (e) { if (q.on || e.inh != null) return; var s = mode === 'comp' ? site(e) : back(e); if (mode === 'comp' && e.sub != null) return; if (Math.hypot(q.x - s[0], q.y - s[1]) < 0.045) { e.inh = i; e.it = 0; q.on = true; } }); });
      ENZ.forEach(function (e) {
        if (e.inh != null) { e.it += dt; var s0 = mode === 'comp' ? site(e) : back(e); INH[e.inh].x = s0[0]; INH[e.inh].y = s0[1]; if (e.it > 2.5) { INH[e.inh].on = false; INH[e.inh].x += (R() - 0.5) * 0.08; e.inh = null; } }
        if (e.sub != null) { var q = S[e.sub], s = site(e); q.x = s[0]; q.y = s[1]; if (!(mode === 'non' && e.inh != null)) e.t += dt;
          if (e.t > 0.7) { prod.push({ x: s[0], y: s[1], t: 0, vx: Math.cos(e.a) * 0.25, vy: Math.sin(e.a) * 0.25 }); q.on = false; q.x = R(); q.y = R(); e.sub = null; made++; } }
      });
      prod.forEach(function (p) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; }); prod = prod.filter(function (p) { return p.t < 1; });
      tAcc += dt; if (tAcc > 1) { rate = rate * 0.6 + made / tAcc * 0.4; made = 0; tAcc = 0; var b = Math.round(nS / 8) * 8; bins[mode][b] = bins[mode][b] == null ? rate : bins[mode][b] * 0.7 + rate * 0.3; }
    };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, wide = W > H * 1.4, bw = wide ? Math.min(W * 0.55, H * 1.3) : W, bh = wide ? H : H * 0.6, P = function (q) { return [q.x * bw, q.y * bh]; }, er = Math.min(bw, bh) * 0.06;
      c.strokeStyle = 'rgba(143,177,189,.25)'; c.lineWidth = px(st, 1); c.strokeRect(0.5, 0.5, bw - 1, bh - 1);
      ENZ.forEach(function (e) { var p = P(e), a = e.a, off = mode === 'non' && e.inh != null; c.fillStyle = off ? 'rgba(124,196,255,.25)' : 'rgba(124,196,255,.6)';
        c.beginPath(); c.moveTo(p[0], p[1]); c.arc(p[0], p[1], er, a + 0.5, a - 0.5 + 2 * Math.PI); c.closePath(); c.fill(); });
      S.forEach(function (q, i) { if (i >= nS) return; var p = P(q); c.fillStyle = GREEN; c.beginPath(); c.arc(p[0], p[1], px(st, 3.4), 0, 7); c.fill(); });
      if (mode !== 'none') INH.forEach(function (q) { var p = P(q); c.fillStyle = ROPE; c.beginPath(); c.arc(p[0], p[1], px(st, 3.6), 0, 7); c.fill(); });
      prod.forEach(function (q) { var p = P(q); c.fillStyle = 'rgba(234,246,248,' + (1 - q.t).toFixed(2) + ')'; c.beginPath(); c.arc(p[0], p[1], px(st, 3), 0, 7); c.fill(); });
      // measured curve
      var gx = wide ? bw + px(st, 50) : px(st, 50), gy = wide ? px(st, 26) : bh + px(st, 20), gw = W - gx - px(st, 14), gb = H - px(st, 26), VM = NE / 0.7 * 1.1;
      var X = function (s) { return gx + s / 160 * gw; }, Y = function (v) { return gb - v / VM * (gb - gy); };
      axes(st, gx, gb, gx + gw, gb); axes(st, gx, gb, gx, gy);
      c.setLineDash([px(st, 3), px(st, 4)]); c.strokeStyle = 'rgba(234,246,248,.3)'; c.lineWidth = px(st, 1); line(c, [[gx, Y(NE / 0.7)], [gx + gw, Y(NE / 0.7)]]); c.stroke(); c.setLineDash([]);
      text(st, 'Vmax: every site busy', gx + gw, Y(NE / 0.7) - px(st, 6), MIST, 'right');
      [['none', BLUE], ['comp', ROPE], ['non', PURPLE]].forEach(function (m) { var ks = Object.keys(bins[m[0]]).map(Number).sort(function (a, b) { return a - b; });
        if (ks.length > 1) { c.strokeStyle = m[1]; c.globalAlpha = m[0] === mode ? 0.9 : 0.3; c.lineWidth = px(st, 1.5); line(c, ks.map(function (k) { return [X(k), Y(bins[m[0]][k])]; })); c.stroke(); }
        ks.forEach(function (k) { c.fillStyle = m[1]; c.beginPath(); c.arc(X(k), Y(bins[m[0]][k]), px(st, 3.5), 0, 7); c.fill(); }); c.globalAlpha = 1; });
      c.fillStyle = GOLD; c.beginPath(); c.arc(X(nS), Y(rate), px(st, 6), 0, 7); c.fill();
      text(st, 'measured rate (products per second)', gx + px(st, 6), gy - px(st, 8), FOAM); text(st, 'substrate →', gx + gw, gb + px(st, 16), MIST, 'right');
      var busy = ENZ.filter(function (e) { return e.sub != null; }).length;
      read(nS + ' substrate molecules: ' + busy + ' of ' + NE + ' active sites busy, about ' + rate.toFixed(1) + ' products a second.' + (mode === 'comp' ? ' The competitive inhibitor blocks active sites, but enough substrate wins them back.' : mode === 'non' ? ' Inhibited enzymes (faded) stall no matter how much substrate there is.' : '') + ' Scroll to add substrate; each dot is a measured rate.');
    };
  });
  /* BIOM 3090: drugs at the receptor */
  def('BIOM3090', { gauge: 'Drug concentration', controls: '<button class="chip" type="button" data-rx="ag" aria-pressed="true">Full agonist</button><button class="chip" type="button" data-rx="ant" aria-pressed="false">+ competitive antagonist</button><button class="chip" type="button" data-rx="part" aria-pressed="false">Partial agonist</button>',
    aria: 'Drug molecules binding receptors on a cell membrane: agonists switch receptors on and send a signal into the cell, antagonists block them, partial agonists switch them on weakly; the response against concentration traces a dose-response curve.',
    note: 'Pharmacology starts with binding chemistry. A drug binds its receptor reversibly, \\(D + R \\rightleftharpoons DR\\), so the fraction of receptors occupied follows \\([D]/([D] + K_D)\\), and the dose&ndash;response curve is an S-shape on a log scale. An agonist both binds and activates (affinity and efficacy). A competitive antagonist binds without activating, so it shifts the curve to the right: more agonist restores the full response. A partial agonist activates only weakly even when every receptor is occupied, so its maximum response is lower, and it can even dampen a full agonist. The dots are responses measured from the simulation as you scroll.'
  }, function (st, g, read) {
    var R = rng(19), NR = 12, REC = [], D = [], A = [], nD = 10, mode = 'ag', resp = 0, sig = [], bins = { ag: {}, ant: {}, part: {} }, tAcc = 0, eff = { ag: 1, ant: 1, part: 0.35 };
    for (var i = 0; i < NR; i++) REC.push({ x: (i + 0.5) / NR, b: null, kind: null, t: 0 });
    for (i = 0; i < 220; i++) D.push({ x: R(), y: R(), on: false });
    for (i = 0; i < 30; i++) A.push({ x: R(), y: R(), on: false });
    E.chips('[data-rx]', 'rx', function (k) { mode = k; REC.forEach(function (r) { if (r.b) { r.b.on = false; r.b = null; } }); });
    onScroll(function () { var p = progress(st.cv); nD = Math.round(2 * Math.pow(100, p)); g(p, nD + ' molecules'); });
    st.frame = function (dt) {
      dt = Math.min(dt, 0.05); var mem = 0.82;
      var walk = function (q) { q.x += (R() - 0.5) * dt * 2.4; q.y += (R() - 0.5) * dt * 2.4; if (q.x < 0) q.x += 1; if (q.x > 1) q.x -= 1; if (q.y < 0) q.y = -q.y; if (q.y > mem) q.y = 2 * mem - q.y; };
      var tryBind = function (q, kind) { REC.forEach(function (r) { if (q.on || r.b) return; if (Math.abs(q.x - r.x) < 0.035 && q.y > mem - 0.06) { r.b = q; r.kind = kind; r.t = 0; q.on = true; } }); };
      D.forEach(function (q, i) { if (i >= nD || q.on) return; walk(q); tryBind(q, 'D'); });
      if (mode === 'ant') A.forEach(function (q) { if (q.on) return; walk(q); tryBind(q, 'A'); });
      REC.forEach(function (r) { if (!r.b) return; r.t += dt; r.b.x = r.x; r.b.y = mem - 0.02;
        var active = r.kind === 'D' && (mode !== 'part' || R() < eff.part);
        if (active && R() < dt * 1.5) sig.push({ x: r.x, t: 0 });
        if (r.t > (r.kind === 'A' ? 3.5 : 1.6)) { r.b.on = false; r.b.y -= 0.06; r.b = null; } });
      sig.forEach(function (s) { s.t += dt; }); sig = sig.filter(function (s) { return s.t < 1; });
      var on = REC.filter(function (r) { return r.b && r.kind === 'D'; }).length * (mode === 'part' ? eff.part : 1) / NR;
      resp = resp * (1 - dt) + on * dt; tAcc += dt;
      if (tAcc > 1) { tAcc = 0; var b = Math.round(Math.log(nD) / Math.log(10) * 8) / 8; bins[mode][b] = bins[mode][b] == null ? resp : bins[mode][b] * 0.6 + resp * 0.4; }
    };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, wide = W > H * 1.4, bw = wide ? W * 0.52 : W, bh = wide ? H : H * 0.58, mem = 0.82;
      c.fillStyle = 'rgba(95,211,176,.1)'; c.fillRect(0, mem * bh, bw, bh - mem * bh); text(st, 'inside the cell', px(st, 8), bh - px(st, 8), GREEN);
      c.strokeStyle = GREEN; c.lineWidth = px(st, 3); line(c, [[0, mem * bh], [bw, mem * bh]]); c.stroke();
      REC.forEach(function (r) { var x = r.x * bw, y = mem * bh, act = r.b && r.kind === 'D'; c.fillStyle = act ? (mode === 'part' ? 'rgba(255,209,102,.55)' : GOLD) : r.b ? ROPE : '#1c5a73';
        c.beginPath(); c.moveTo(x - px(st, 10), y + px(st, 14)); c.lineTo(x - px(st, 10), y - px(st, 4)); c.lineTo(x - px(st, 4), y - px(st, 4)); c.lineTo(x - px(st, 4), y + px(st, 4)); c.lineTo(x + px(st, 4), y + px(st, 4)); c.lineTo(x + px(st, 4), y - px(st, 4)); c.lineTo(x + px(st, 10), y - px(st, 4)); c.lineTo(x + px(st, 10), y + px(st, 14)); c.closePath(); c.fill(); });
      sig.forEach(function (s) { c.fillStyle = 'rgba(255,209,102,' + (1 - s.t).toFixed(2) + ')'; c.beginPath(); c.arc(s.x * bw, mem * bh + px(st, 18) + s.t * (bh * (1 - mem) - px(st, 24)), px(st, 3), 0, 7); c.fill(); });
      D.forEach(function (q, i) { if (i >= nD) return; c.fillStyle = mode === 'part' ? PURPLE : BLUE; c.beginPath(); c.arc(q.x * bw, q.y * bh, px(st, 3.5), 0, 7); c.fill(); });
      if (mode === 'ant') A.forEach(function (q) { c.fillStyle = ROPE; c.beginPath(); c.rect(q.x * bw - px(st, 3), q.y * bh - px(st, 3), px(st, 6), px(st, 6)); c.fill(); });
      // dose-response
      var gx = wide ? bw + px(st, 50) : px(st, 50), gy = wide ? px(st, 26) : bh + px(st, 22), gw = W - gx - px(st, 14), gb = H - px(st, 26);
      var X = function (lg) { return gx + lg / 2.4 * gw; }, Y = function (v) { return gb - v / 0.8 * (gb - gy); };
      axes(st, gx, gb, gx + gw, gb); axes(st, gx, gb, gx, gy);
      [['ag', BLUE], ['ant', ROPE], ['part', PURPLE]].forEach(function (m) { var ks = Object.keys(bins[m[0]]).map(Number).sort(function (a, b) { return a - b; });
        if (ks.length > 1) { c.strokeStyle = m[1]; c.globalAlpha = m[0] === mode ? 0.9 : 0.35; c.lineWidth = px(st, 1.6); line(c, ks.map(function (k) { return [X(k), Y(bins[m[0]][k])]; })); c.stroke(); }
        ks.forEach(function (k) { c.fillStyle = m[1]; c.globalAlpha = m[0] === mode ? 1 : 0.35; c.beginPath(); c.arc(X(k), Y(bins[m[0]][k]), px(st, 3.5), 0, 7); c.fill(); }); c.globalAlpha = 1; });
      c.fillStyle = GOLD; c.beginPath(); c.arc(X(Math.log(nD) / Math.LN10), Y(resp), px(st, 6), 0, 7); c.fill();
      text(st, 'response (share of receptors switched on)', gx + px(st, 6), gy - px(st, 8), FOAM); text(st, 'drug concentration (log) →', gx + gw, gb + px(st, 16), MIST, 'right');
      read({ ag: 'Full agonist', ant: 'Agonist with a competitive antagonist (red squares)', part: 'Partial agonist' }[mode] + ' at ' + nD + ' molecules: ' + Math.round(resp * 100) + '% of maximum signalling. ' + (mode === 'ant' ? 'The antagonist holds receptors without switching them on, so the curve shifts right.' : mode === 'part' ? 'Even with every receptor bound, the response stays low.' : 'Scroll up the concentration to trace the S-shaped curve.'));
    };
  });
})();
