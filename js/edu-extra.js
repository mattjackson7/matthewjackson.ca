/* Education: demos for computing and elective courses. Loaded after education.js, which exposes EDU (the helpers). */
(function () {
  'use strict';
  var E = window.EDU; if (!E) return;
  var px = E.px, text = E.text, axes = E.axes, clear = E.clear, onScroll = E.onScroll, progress = E.progress, hover = E.hover, rng = E.rng, def = E.def;
  var FOAM = E.FOAM, MIST = E.MIST, ROPE = E.ROPE, DEEP = E.DEEP, BLUE = '#7cc4ff', GOLD = '#ffd166', GREEN = '#5fd3b0', PURPLE = '#c39bff', ORANGE = '#ff8a5c';
  function line(c, pts) { c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); }

  /* CIS 1200: a ripple-carry adder */
  def('CIS1200', { gauge: 'Inputs', aria: 'Two four-bit binary numbers added by a chain of full adders, with the carry rippling from right to left.',
    note: 'Inside every processor, addition is built from logic gates. A full adder takes two bits and a carry-in and outputs a sum bit (an XOR of the three) and a carry-out (set when at least two are 1). Chain four of them and the carry ripples from the lowest bit to the highest, which is why this design, the ripple-carry adder, gets slower as numbers get wider; real chips use carry-lookahead tricks to break the chain.'
  }, function (st, g, read) {
    var A = 0, B = 0, t = 0, lastK = -1;
    onScroll(function () { var p = progress(st.cv), k = Math.min(255, Math.floor(p * 256)); if (k !== lastK) { lastK = k; A = (k * 7 + 3) % 16; B = (k * 11 + 5) % 16; t = 0; } g(p, A + ' + ' + B); });
    st.frame = function (dt) { t += dt; };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, n = 4, bw = Math.min(W / 6, px(st, 140)), narrow = bw < px(st, 84), lm = narrow ? px(st, 44) : 0, gap = (W - n * bw - lm) / (n + (narrow ? 0 : 1)), y0 = Math.max(H * 0.36, px(st, 112)), bh = Math.max(H * 0.24, px(st, 44));
      var carry = [0], sum = [];
      for (var i = 0; i < n; i++) { var a = A >> i & 1, b = B >> i & 1, ci = carry[i]; sum.push(a ^ b ^ ci); carry.push((a & b) | (ci & (a ^ b))); }
      for (i = 0; i < n; i++) {
        var x = W - gap - (i + 1) * bw - i * gap, ready = t > 0.5 + i * 0.6, a2 = A >> i & 1, b2 = B >> i & 1;
        c.fillStyle = ready ? 'rgba(255,138,92,.2)' : 'rgba(143,177,189,.08)'; c.strokeStyle = ready ? ORANGE : MIST; c.lineWidth = px(st, 2); c.fillRect(x, y0, bw, bh); c.strokeRect(x, y0, bw, bh);
        text(st, narrow ? 'FA' : 'full adder', x + bw / 2, y0 + bh / 2 + px(st, 4), MIST, 'center');
        [[a2, x + bw * 0.3, 'A' + i], [b2, x + bw * 0.7, 'B' + i]].forEach(function (q) { c.strokeStyle = q[0] ? GOLD : 'rgba(143,177,189,.4)'; c.lineWidth = px(st, 3); line(c, [[q[1], y0 - px(st, 50)], [q[1], y0]]); c.stroke();
          text(st, String(q[0]), q[1], y0 - px(st, 58), q[0] ? GOLD : MIST, 'center', 15); text(st, q[2], q[1], y0 - px(st, 78), MIST, 'center'); });
        var sOn = ready && sum[i]; c.strokeStyle = sOn ? GOLD : 'rgba(143,177,189,.4)'; line(c, [[x + bw / 2, y0 + bh], [x + bw / 2, y0 + bh + px(st, 44)]]); c.stroke();
        text(st, ready ? String(sum[i]) : '?', x + bw / 2, y0 + bh + px(st, 64), ready ? (sum[i] ? GOLD : FOAM) : MIST, 'center', 16); text(st, 'S' + i, x + bw / 2, y0 + bh + px(st, 82), MIST, 'center');
        var cOn = t > 0.5 + i * 0.6 + 0.3 && carry[i + 1], cx0 = x, cx1 = x - gap;
        c.strokeStyle = cOn ? ROPE : 'rgba(143,177,189,.3)'; c.lineWidth = px(st, 3); line(c, [[cx0, y0 + bh / 2], [cx1, y0 + bh / 2]]); c.stroke();
        if (t > 0.5 + i * 0.6 && t < 0.8 + i * 0.6 + 0.3 && carry[i + 1]) { var f = Math.min(1, (t - 0.5 - i * 0.6) / 0.3); c.fillStyle = ROPE; c.beginPath(); c.arc(cx0 + (cx1 - cx0) * f, y0 + bh / 2, px(st, 5), 0, 7); c.fill(); }
      }
      var done = t > 0.5 + n * 0.6, total = A + B, cout = carry[n];
      if (narrow) { text(st, 'carry', lm * 0.5, y0 - px(st, 22), MIST, 'center'); text(st, 'out', lm * 0.5, y0 - px(st, 8), MIST, 'center'); } else text(st, 'carry out', gap * 0.5, y0 + bh / 2 - px(st, 10), MIST, 'center'); text(st, done ? String(cout) : '?', narrow ? lm * 0.5 : gap * 0.5, y0 + bh / 2 + px(st, narrow ? 34 : 20), done && cout ? ROPE : MIST, 'center', 16);
      var bin = function (v, w) { var s = ''; for (var i = w - 1; i >= 0; i--) s += v >> i & 1; return s; };
      text(st, bin(A, 4) + ' + ' + bin(B, 4) + ' = ' + (done ? bin(total, 5) : '…'), px(st, 12), px(st, 22), FOAM, 'left', 13);
      read(A + ' + ' + B + (done ? ' = ' + total + ' (' + bin(total, 5) + ' in binary). The carry rippled through ' + carry.slice(1).filter(Boolean).length + ' stage' + (carry.slice(1).filter(Boolean).length === 1 ? '' : 's') + '.' : ': the carry is still rippling left.') + ' Scroll for new numbers.');
    };
  });

  /* CIS 1500: sorting algorithms racing */
  def('CIS1500', { gauge: 'List size', aria: 'Four sorting algorithms sorting the same shuffled list side by side, counting comparisons.',
    note: 'The same shuffled list, sorted four ways. Bubble and insertion sort compare neighbours and need about \\(n^2/2\\) comparisons; merge sort splits the list in half, sorts each half and merges, and quicksort partitions around a pivot, both about \\(n\\log_2 n\\). For 10 items that barely matters; for 100 it is the difference between roughly 5,000 comparisons and 700, which is the whole point of algorithm analysis.'
  }, function (st, g, read) {
    var n = 30, algos = [], acc = 0, wait = 0;
    function* bubble(a, s) { for (var i = 0; i < a.length; i++) for (var j = 0; j < a.length - 1 - i; j++) { s.c++; s.hl = [j, j + 1]; yield; if (a[j] > a[j + 1]) { var t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; } } }
    function* insertion(a, s) { for (var i = 1; i < a.length; i++) { var j = i; while (j > 0) { s.c++; s.hl = [j - 1, j]; yield; if (a[j - 1] > a[j]) { var t = a[j]; a[j] = a[j - 1]; a[j - 1] = t; j--; } else break; } } }
    function* merge(a, s, lo, hi) { lo = lo || 0; hi = hi == null ? a.length : hi; if (hi - lo < 2) return; var m = (lo + hi) >> 1; yield* merge(a, s, lo, m); yield* merge(a, s, m, hi);
      var L = a.slice(lo, m), R = a.slice(m, hi), i = 0, j = 0, k = lo; while (i < L.length && j < R.length) { s.c++; s.hl = [k, m + j]; yield; a[k++] = L[i] <= R[j] ? L[i++] : R[j++]; } while (i < L.length) a[k++] = L[i++]; while (j < R.length) a[k++] = R[j++]; }
    function* quick(a, s, lo, hi) { lo = lo || 0; hi = hi == null ? a.length - 1 : hi; if (lo >= hi) return; var p = a[hi], i = lo;
      for (var j = lo; j < hi; j++) { s.c++; s.hl = [j, hi]; yield; if (a[j] < p) { var t = a[i]; a[i] = a[j]; a[j] = t; i++; } } var t2 = a[i]; a[i] = a[hi]; a[hi] = t2; yield* quick(a, s, lo, i - 1); yield* quick(a, s, i + 1, hi); }
    function reset() { var R = rng(n), base = []; for (var i = 0; i < n; i++) base.push(i + 1); for (i = n - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = base[i]; base[i] = base[j]; base[j] = t; }
      algos = [['Bubble sort', bubble], ['Insertion sort', insertion], ['Merge sort', merge], ['Quicksort', quick]].map(function (q) { var a = base.slice(), s = { c: 0, hl: [], done: false }; return { name: q[0], a: a, s: s, it: q[1](a, s) }; }); wait = 0; }
    onScroll(function () { var p = progress(st.cv), nn = Math.round(8 + 72 * p); g(p, 'n = ' + nn); if (nn !== n) { n = nn; reset(); } });
    st.frame = function (dt) { acc += dt * Math.max(20, n * 3); var steps = Math.floor(acc); acc -= steps;
      algos.forEach(function (al) { for (var k = 0; k < steps && !al.s.done; k++) if (al.it.next().done) { al.s.done = true; al.s.hl = []; } });
      if (algos.every(function (al) { return al.s.done; })) { wait += dt; if (wait > 2.5) reset(); } };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, cols = W > px(st, 700) ? 4 : 2, rows = 4 / cols, pw = W / cols, ph = H / rows, max = Math.max.apply(0, algos.map(function (a) { return a.s.c; })) || 1;
      algos.forEach(function (al, k) { var x0 = (k % cols) * pw + px(st, 10), y0 = Math.floor(k / cols) * ph + px(st, 30), w = pw - px(st, 20), h = ph - px(st, 70), bw = w / n;
        text(st, al.name, x0, y0 - px(st, 10), al.s.done ? GREEN : FOAM, 'left', 12);
        al.a.forEach(function (v, i) { var on = al.s.hl.indexOf(i) >= 0; c.fillStyle = on ? GOLD : al.s.done ? GREEN : 'rgba(124,196,255,.7)'; c.fillRect(x0 + i * bw + 0.5, y0 + h - v / n * h, Math.max(1, bw - 1), v / n * h); });
        text(st, al.s.c.toLocaleString() + ' comparisons' + (al.s.done ? ' ✓' : ''), x0, y0 + h + px(st, 18), al.s.c === max && al.s.done ? ROPE : MIST); });
      read('Sorting ' + n + ' items: ' + algos.map(function (a) { return a.name.toLowerCase() + ' ' + a.s.c; }).join(', ') + ' comparisons. n²/2 = ' + Math.round(n * n / 2) + ', n log₂ n = ' + Math.round(n * Math.log(n) / Math.LN2) + '. Scroll for a longer list.');
    };
    reset();
  });

  /* PSYC 1000: classical conditioning (Rescorla-Wagner) */
  def('PSYC1000', { gauge: 'Learning rate', aria: 'Classical conditioning trial by trial: a tone paired with food builds an association that then extinguishes when the food stops, following the Rescorla-Wagner model.',
    note: 'Pavlov&rsquo;s conditioning, as modelled by Rescorla and Wagner: on each trial the association \\(V\\) between a tone and food moves a fraction of the way toward what actually happened, \\(\\Delta V = \\alpha\\beta(\\lambda - V)\\). Learning is fastest when the surprise \\(\\lambda - V\\) is largest, so the curve rises steeply and then levels off. When the food stops (\\(\\lambda = 0\\)), the same rule drives extinction. Prediction error like this turned out to be what dopamine neurons signal.'
  }, function (st, g, read) {
    var ab = 0.2, trial = 0, ph = 0, NA = 20, NX = 16, V = [0];
    function build() { V = [0]; for (var i = 0; i < NA + NX; i++) { var lam = i < NA ? 1 : 0; V.push(V[i] + ab * (lam - V[i])); } }
    onScroll(function () { var p = progress(st.cv), nab = Math.round((0.05 + 0.45 * p) * 100) / 100; g(p, 'αβ = ' + nab.toFixed(2)); if (nab !== ab) { ab = nab; build(); trial = 0; ph = 0; } });
    st.frame = function (dt) { ph += dt / 1.1; if (ph >= 1) { ph = 0; trial++; if (trial > NA + NX + 2) trial = 0; } };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, wide = W > H * 1.4, aw = wide ? W * 0.36 : W, ah = wide ? H : H * 0.45, tr = Math.min(trial, NA + NX - 1), acq = tr < NA, v = V[tr], cx = aw / 2, cy = ah * 0.5;
      // the trial: tone, then food (or not), then the response
      if (ph < 0.75) for (var k = 1; k <= 3; k++) { var r = (ph * 4 + k * 0.3) % 1; c.strokeStyle = 'rgba(124,196,255,' + (1 - r).toFixed(2) + ')'; c.lineWidth = px(st, 2); c.beginPath(); c.arc(cx - aw * 0.22, cy - ah * 0.15, px(st, 10) + r * px(st, 40), -0.8, 0.8); c.stroke(); }
      text(st, '♪ tone', cx - aw * 0.3, cy - ah * 0.15 + px(st, 4), BLUE, 'center', 14);
      if (acq && ph > 0.35) { c.fillStyle = GOLD; c.beginPath(); c.ellipse(cx + aw * 0.2, cy - ah * 0.12, px(st, 26), px(st, 10), 0, 0, 7); c.fill(); text(st, 'food', cx + aw * 0.2, cy - ah * 0.12 - px(st, 18), GOLD, 'center'); }
      if (!acq) text(st, 'no food', cx + aw * 0.2, cy - ah * 0.12, MIST, 'center');
      var drops = Math.round(v * 8); for (k = 0; k < drops; k++) { var dy = ((ph * 1.6 + k / 8) % 1); c.fillStyle = 'rgba(234,246,248,.75)'; c.beginPath(); c.arc(cx - px(st, 30) + k * px(st, 8), cy + ah * 0.12 + dy * ah * 0.2, px(st, 3), 0, 7); c.fill(); }
      text(st, 'salivation', cx, cy + ah * 0.42, MIST, 'center');
      text(st, (acq ? 'acquisition' : 'extinction') + ', trial ' + (tr + 1), cx, px(st, 22), acq ? GREEN : ROPE, 'center', 12);
      // learning curve
      var gx = wide ? aw + px(st, 40) : px(st, 40), gy = wide ? px(st, 24) : ah + px(st, 20), gw = W - gx - px(st, 14), gb = H - px(st, 26), N = NA + NX;
      var X = function (i) { return gx + i / N * gw; }, Y = function (vv) { return gb - vv * (gb - gy); };
      c.fillStyle = 'rgba(255,106,85,.07)'; c.fillRect(X(NA), gy, X(N) - X(NA), gb - gy);
      axes(st, gx, gb, gx + gw, gb); axes(st, gx, gb, gx, gy);
      c.strokeStyle = PURPLE; c.lineWidth = px(st, 2.2); line(c, V.slice(0, tr + 2).map(function (vv, i) { return [X(i), Y(vv)]; })); c.stroke();
      V.slice(0, tr + 2).forEach(function (vv, i) { c.fillStyle = PURPLE; c.beginPath(); c.arc(X(i), Y(vv), px(st, 3), 0, 7); c.fill(); });
      text(st, 'association V', gx + px(st, 6), gy + px(st, 4), PURPLE); text(st, 'extinction', X(NA) + px(st, 6), gy + px(st, 18), ROPE); text(st, 'trials →', gx + gw, gb + px(st, 16), MIST, 'right');
      read('Trial ' + (tr + 1) + ': association ' + (v * 100).toFixed(0) + '% ' + (acq ? 'and climbing, fastest while the food is still a surprise.' : 'and fading now that the tone no longer predicts food.') + ' Scroll to change how fast it learns.');
    };
    build();
  });

  /* LING 1000: vowels and formants */
  def('LING1000', { gauge: 'Speaker', hint: 'Move your pointer around the vowel chart', aria: 'A vowel chart of the first two formant frequencies, a side view of the tongue, and the spectrum of the vowel under the pointer.',
    note: 'Vowels are shaped by the tongue. The vocal tract resonates at a few frequencies called formants, and the first two pin down the vowel: F1 rises as the tongue lowers and the jaw opens, F2 rises as the tongue moves forward. So the acoustic chart lines up with the articulation chart phoneticians use, with [i] (heed) high and front, [u] (who&rsquo;d) high and back, and [&#593;] (father) low. Shorter vocal tracts (women, children) shift every formant up, yet listeners still hear the same vowels: speaker normalisation. Formant values are typical North American English averages.'
  }, function (st, g, read) {
    var V = [['i', 'heed', 270, 2290], ['ɪ', 'hid', 390, 1990], ['ɛ', 'head', 530, 1840], ['æ', 'had', 660, 1720], ['ʌ', 'hud', 640, 1190], ['ɑ', 'father', 730, 1090], ['ɔ', 'hawed', 570, 840], ['ʊ', 'hood', 440, 1020], ['u', "who'd", 300, 870]];
    var sp = 1, spName = 'man', pt = [500, 1500], tgt = null, clock = 0;
    onScroll(function () { var p = progress(st.cv); sp = 1 + 0.32 * p; spName = sp < 1.1 ? 'adult man' : sp < 1.22 ? 'adult woman' : 'child'; g(p, spName); });
    function geo() { var wide = st.W > st.H * 1.4, cw = wide ? st.W * 0.5 : st.W, ch = wide ? st.H : st.H * 0.55; return { wide: wide, l: px(st, 50), r: cw - px(st, 16), t: px(st, 26), b: ch - px(st, 26), cw: cw, ch: ch }; }
    function XY(gg, f1, f2) { return [gg.r - (f2 - 600) / 2600 * (gg.r - gg.l), gg.t + (f1 - 200) / 900 * (gg.b - gg.t)]; }
    hover(st, function (p) { if (!p) { tgt = null; return; } var gg = geo(); if (p[0] > gg.cw) return; tgt = [200 + (p[1] - gg.t) / (gg.b - gg.t) * 900, 600 + (gg.r - p[0]) / (gg.r - gg.l) * 2600]; });
    st.frame = function (dt) { clock += dt; var k = Math.floor(clock / 1.6) % V.length, aim = tgt || [V[k][2] * sp, V[k][3] * sp]; pt[0] += (aim[0] - pt[0]) * Math.min(1, dt * 4); pt[1] += (aim[1] - pt[1]) * Math.min(1, dt * 4); };
    st.draw = function () {
      clear(st); var c = st.ctx, gg = geo(), W = st.W, H = st.H;
      c.strokeStyle = 'rgba(143,177,189,.3)'; c.lineWidth = px(st, 1); c.strokeRect(gg.l, gg.t, gg.r - gg.l, gg.b - gg.t);
      text(st, '← F2 (front)', gg.l, gg.t - px(st, 8), MIST); text(st, 'F1 ↓ (open)', gg.r, gg.b + px(st, 16), MIST, 'right');
      var near = null, nd = 1e9;
      V.forEach(function (v) { var p = XY(gg, v[2] * sp, v[3] * sp), d = Math.hypot((pt[0] - v[2] * sp) / 900, (pt[1] - v[3] * sp) / 2600); if (d < nd) { nd = d; near = v; }
        c.fillStyle = 'rgba(195,155,255,.25)'; c.beginPath(); c.arc(p[0], p[1], px(st, 14), 0, 7); c.fill(); text(st, v[0], p[0], p[1] + px(st, 5), FOAM, 'center', 15); });
      var hp = XY(gg, near[2] * sp, near[3] * sp); c.strokeStyle = GOLD; c.lineWidth = px(st, 2); c.beginPath(); c.arc(hp[0], hp[1], px(st, 16), 0, 7); c.stroke();
      var cur = XY(gg, pt[0], pt[1]); c.fillStyle = ROPE; c.beginPath(); c.arc(cur[0], cur[1], px(st, 6), 0, 7); c.fill();
      // tongue and spectrum
      var ox = gg.wide ? gg.cw + px(st, 30) : px(st, 30), oy = gg.wide ? px(st, 20) : gg.ch + px(st, 10), ow = W - ox - px(st, 14), oh = (gg.wide ? H : H - gg.ch) - px(st, 30);
      var mh = oh * 0.48, mw = Math.min(ow * 0.5, mh * 1.3), mx = ox, my = oy + px(st, 10), height = 1 - (pt[0] / sp - 250) / 520, front = (pt[1] / sp - 800) / 1550;
      c.strokeStyle = MIST; c.lineWidth = px(st, 2); c.beginPath(); c.moveTo(mx + mw, my + mh * 0.25); c.quadraticCurveTo(mx + mw * 0.4, my - mh * 0.05, mx + mw * 0.05, my + mh * 0.4); c.lineTo(mx + mw * 0.05, my + mh); c.stroke();
      var tx = mx + mw * (0.3 + 0.45 * front), ty = my + mh * (0.25 + 0.5 * (1 - height));
      c.fillStyle = 'rgba(255,106,85,.55)'; c.beginPath(); c.moveTo(mx + mw * 0.05, my + mh); c.quadraticCurveTo(tx - mw * 0.25, ty, tx, ty); c.quadraticCurveTo(tx + mw * 0.2, ty + mh * 0.05, mx + mw * 0.95, my + mh); c.closePath(); c.fill();
      text(st, 'tongue', tx, ty + px(st, 16), ROPE, 'center'); text(st, 'lips →', mx + mw, my + mh * 0.25 - px(st, 6), MIST, 'right');
      var sx = ox, sy = my + mh + px(st, 34), sw = ow, sh = oh - mh - px(st, 44); axes(st, sx, sy + sh, sx + sw, sy + sh);
      c.strokeStyle = BLUE; c.lineWidth = px(st, 2); c.beginPath();
      for (var i = 0; i <= 200; i++) { var f = i / 200 * 4000, a = 0;
        [[pt[0], 90], [pt[1], 120], [2500 * sp, 160]].forEach(function (F) { a += 1 / Math.sqrt(Math.pow(1 - f * f / (F[0] * F[0]), 2) + Math.pow(F[1] * f / (F[0] * F[0]), 2)); });
        var y = sy + sh - Math.min(1, Math.log(1 + a) / 3.2) * sh; i ? c.lineTo(sx + i / 200 * sw, y) : c.moveTo(sx, y); } c.stroke();
      text(st, 'F1 ' + Math.round(pt[0]) + ' Hz   F2 ' + Math.round(pt[1]) + ' Hz', sx, sy - px(st, 8), BLUE); text(st, 'frequency →', sx + sw, sy + sh + px(st, 16), MIST, 'right');
      read('Closest vowel: [' + near[0] + '] as in “' + near[1] + '” (' + spName + '). F1 ' + Math.round(pt[0]) + ' Hz, F2 ' + Math.round(pt[1]) + ' Hz: the tongue is ' + (height > 0.65 ? 'high' : height > 0.35 ? 'mid' : 'low') + ' and ' + (front > 0.55 ? 'front.' : front > 0.3 ? 'central.' : 'back.') + ' Scroll for a different speaker.');
    };
  });

  /* IPS 3000: angular momentum, the subject of my science communication videos */
  def('IPS3000', { gauge: 'Arms', aria: 'A spinning figure seen from above pulling its weighted arms in and speeding up, with angular momentum constant and kinetic energy rising.',
    note: 'My project in this course was a set of short explainer videos on momentum and rotation, so here is their central idea. A spinning skater (or someone on an office chair holding weights) has angular momentum \\(L = I\\omega\\), and with no outside twist \\(L\\) can&rsquo;t change. Pulling the weights in shrinks the moment of inertia \\(I\\), so the spin \\(\\omega\\) must rise to compensate. The kinetic energy \\(\\tfrac12 I\\omega^2 = L^2/2I\\) goes up too, and that energy comes from the work your arms do pulling inward against the spin.'
  }, function (st, g, read) {
    var r = 1, rs = 1, th = 0, I0 = 0.8, m = 1, L = (I0 + 2 * m) * 1.2, hist = [];
    onScroll(function () { var p = progress(st.cv); r = 1 - 0.75 * p; g(p, r > 0.85 ? 'out' : r < 0.35 ? 'pulled in' : 'pulling in'); });
    st.frame = function (dt) { rs += (r - rs) * Math.min(1, dt * 4); var I = I0 + 2 * m * rs * rs, w = L / I; th += w * dt; hist.push(w); if (hist.length > 240) hist.shift(); };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, wide = W > H * 1.3, aw = wide ? W * 0.5 : W, ah = wide ? H : H * 0.55, cx = aw / 2, cy = ah / 2, R = Math.min(aw, ah) * 0.38;
      var I = I0 + 2 * m * rs * rs, w = L / I, KE = 0.5 * I * w * w, KE0 = 0.5 * L * L / (I0 + 2 * m);
      c.strokeStyle = 'rgba(143,177,189,.18)'; c.lineWidth = px(st, 1); c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
      for (var k = 0; k < 2; k++) { var a = th + k * Math.PI, hx = cx + Math.cos(a) * R * rs, hy = cy + Math.sin(a) * R * rs;
        c.strokeStyle = MIST; c.lineWidth = px(st, 5); line(c, [[cx, cy], [hx, hy]]); c.stroke(); c.fillStyle = GOLD; c.beginPath(); c.arc(hx, hy, px(st, 11), 0, 7); c.fill();
        for (var j = 1; j < 10; j++) { var aa = a - j * w * 0.025; c.fillStyle = 'rgba(255,209,102,' + (0.3 - j * 0.03).toFixed(2) + ')'; c.beginPath(); c.arc(cx + Math.cos(aa) * R * rs, cy + Math.sin(aa) * R * rs, px(st, 9), 0, 7); c.fill(); } }
      c.fillStyle = BLUE; c.beginPath(); c.arc(cx, cy, px(st, 22), 0, 7); c.fill(); c.fillStyle = DEEP; c.beginPath(); c.arc(cx + Math.cos(th) * px(st, 12), cy + Math.sin(th) * px(st, 12), px(st, 5), 0, 7); c.fill();
      var gx = wide ? aw + px(st, 20) : px(st, 20), gy = wide ? px(st, 30) : ah + px(st, 20), gw = W - gx - px(st, 14), bh = px(st, 16);
      [['moment of inertia I', I / (I0 + 2 * m), BLUE], ['spin rate ω', w / (L / I0) , ROPE], ['angular momentum L', 1, GREEN], ['kinetic energy', KE / (0.5 * L * L / I0), GOLD]].forEach(function (b, i) {
        var y = gy + i * px(st, 46); text(st, b[0], gx, y, FOAM); c.fillStyle = 'rgba(143,177,189,.15)'; c.fillRect(gx, y + px(st, 8), gw, bh); c.fillStyle = b[2]; c.fillRect(gx, y + px(st, 8), gw * Math.min(1, b[1]), bh); });
      read('Arms at ' + Math.round(rs * 100) + '% of full reach: spinning ' + (w / (L / (I0 + 2 * m))).toFixed(2) + '× faster than with arms out, with the same angular momentum and ' + (KE / KE0).toFixed(2) + '× the kinetic energy. Scroll to pull the weights in.');
    };
  });
})();
