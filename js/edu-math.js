/* Education: one demo per mathematics course. Loaded after education.js, which exposes EDU (the helpers). */
(function () {
  'use strict';
  var E = window.EDU; if (!E) return;
  var px = E.px, text = E.text, axes = E.axes, clear = E.clear, onScroll = E.onScroll, progress = E.progress, hover = E.hover, rng = E.rng, def = E.def;
  var FOAM = E.FOAM, MIST = E.MIST, ROPE = E.ROPE, DEEP = E.DEEP, BLUE = '#7cc4ff', GOLD = '#ffd166', GREEN = '#5fd3b0', PURPLE = '#c39bff';

  /* MATH 1080: a difference equation, the logistic map */
  def('MATH1080', { gauge: 'Growth rate r', aria: 'The logistic map: a cobweb diagram of a population model on the left and its bifurcation diagram on the right, with the current growth rate marked.',
    note: 'A population model from the course&rsquo;s difference equations: next year&rsquo;s population is \\(x_{n+1} = r\\,x_n(1 - x_n)\\), growth held back by crowding. The cobweb on the left iterates it by bouncing between the curve and the line \\(y = x\\). For small \\(r\\) it settles to one value; past \\(r = 3\\) it flips between two, then four, eight&hellip; doubling ever faster until, near \\(r \\approx 3.57\\), it becomes chaotic. The right-hand diagram plots where it settles for every \\(r\\).'
  }, function (st, g, read) {
    var r = 2.8, x = 0.2, path = [], acc = 0, bif = null;
    function buildBif(w, h) {
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var c = cv.getContext('2d'), img = c.createImageData(w, h);
      for (var i = 0; i < w; i++) { var rr = 2.5 + 1.5 * i / (w - 1), y = 0.5; for (var k = 0; k < 300; k++) y = rr * y * (1 - y);
        for (k = 0; k < 220; k++) { y = rr * y * (1 - y); var j = Math.floor((1 - y) * (h - 1)), q = (j * w + i) * 4; img.data[q] = 195; img.data[q + 1] = 155; img.data[q + 2] = 255; img.data[q + 3] = Math.min(255, img.data[q + 3] + 70); } }
      c.putImageData(img, 0, 0); return cv;
    }
    onScroll(function () { var p = progress(st.cv); var nr = Math.round((2.6 + 1.4 * p) * 1000) / 1000; g(p, 'r = ' + nr.toFixed(3)); if (nr !== r) { r = nr; x = 0.2; path = [[0.2, 0]]; } });
    st.frame = function (dt) { acc += dt; if (acc > 0.12) { acc = 0; var y = r * x * (1 - x); path.push([x, y], [y, y]); x = y; if (path.length > 120) path.splice(0, 2); } };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, wide = W > H * 1.5, s = wide ? Math.min(H - px(st, 40), W * 0.42) : Math.min(W - px(st, 40), H * 0.5), ox = px(st, 30), oy = px(st, 10) + s;
      var P = function (a, b) { return [ox + a * s, oy - b * s]; };
      axes(st, ox, oy, ox + s, oy); axes(st, ox, oy, ox, oy - s);
      c.strokeStyle = 'rgba(234,246,248,.3)'; c.lineWidth = px(st, 1); c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + s, oy - s); c.stroke();
      c.strokeStyle = PURPLE; c.lineWidth = px(st, 2); c.beginPath(); for (var i = 0; i <= 100; i++) { var a = i / 100, q = P(a, r * a * (1 - a)); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } c.stroke();
      c.strokeStyle = GOLD; c.lineWidth = px(st, 1.2); c.beginPath(); path.forEach(function (pt, i) { var q = P(pt[0], pt[1]); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke();
      text(st, 'xₙ →', ox + s, oy + px(st, 16), MIST, 'right'); text(st, 'xₙ₊₁', ox + px(st, 6), oy - s + px(st, 12), MIST);
      var bx = wide ? ox + s + px(st, 40) : ox, by = wide ? px(st, 10) : oy + px(st, 30), bw = W - bx - px(st, 10), bh = wide ? s : H - by - px(st, 26);
      if (!bif || bif.width !== Math.round(bw) || bif.height !== Math.round(bh)) bif = buildBif(Math.round(bw), Math.round(bh));
      c.drawImage(bif, bx, by);
      var rx = bx + (r - 2.5) / 1.5 * bw; c.strokeStyle = ROPE; c.lineWidth = px(st, 1.5); c.beginPath(); c.moveTo(rx, by); c.lineTo(rx, by + bh); c.stroke();
      text(st, 'r = 2.5', bx, by + bh + px(st, 16), MIST); text(st, '4', bx + bw, by + bh + px(st, 16), MIST, 'right'); text(st, 'where it settles', bx + px(st, 4), by + px(st, 14), PURPLE);
      read('r = ' + r.toFixed(3) + ': ' + (r < 3 ? 'the population settles to a single value, ' + (1 - 1 / r).toFixed(3) + '.' : r < 3.449 ? 'it alternates between two values.' : r < 3.544 ? 'it cycles through four values.' : r < 3.5699 ? 'it is still periodic, but doubling fast.' : 'chaos, apart from narrow windows of order.') + ' Scroll to raise r.');
    };
  });

  /* MATH 1210: Taylor polynomials and radius of convergence */
  def('MATH1210', { gauge: 'Degree', hint: 'Move your pointer left and right to move the centre', controls: '<button class="chip" type="button" data-tf="sin" aria-pressed="true">sin x</button><button class="chip" type="button" data-tf="log" aria-pressed="false">ln(1 + x)</button><button class="chip" type="button" data-tf="rat" aria-pressed="false">1 / (1 + x²)</button>',
    aria: 'A function and its Taylor polynomial about a point, with the interval where the series converges shaded.',
    note: 'A Taylor polynomial matches a function&rsquo;s value and first \\(n\\) derivatives at one point, \\(f(x) \\approx \\sum_{k\\le n} f^{(k)}(a)(x-a)^k/k!\\). For \\(\\sin x\\) adding terms works everywhere. For \\(\\ln(1+x)\\) it only works within distance \\(1+a\\) of the centre, out to the singularity at \\(x=-1\\). The surprise is \\(1/(1+x^2)\\): smooth on the whole real line, yet its series still fails beyond \\(\\sqrt{1+a^2}\\), because it blows up at \\(x = \\pm i\\) in the complex plane, a preview of complex analysis.'
  }, function (st, g, read) {
    var fn = 'sin', n = 3, a = 0, at = null, clock = 0;
    E.chips('[data-tf]', 'tf', function (k) { fn = k; a = 0; });
    onScroll(function () { var p = progress(st.cv); n = 1 + Math.floor(p * 18); g(p, 'n = ' + n); });
    hover(st, function (p) { at = p ? (p[0] / st.W - 0.5) * 12 : null; });
    st.frame = function (dt) { clock += dt; var lo = fn === 'log' ? -0.6 : -4, aim = at != null ? Math.max(lo, Math.min(4, at)) : (fn === 'log' ? 0.4 + 0.6 * Math.sin(clock * 0.4) : 1.6 * Math.sin(clock * 0.35)); a += (aim - a) * Math.min(1, dt * 5); };
    function f(x) { return fn === 'sin' ? Math.sin(x) : fn === 'log' ? (x > -1 ? Math.log(1 + x) : NaN) : 1 / (1 + x * x); }
    function coeffs() {   // Taylor coefficients about a
      var c = [];
      if (fn === 'sin') for (var k = 0; k <= n; k++) { var d = [Math.sin(a), Math.cos(a), -Math.sin(a), -Math.cos(a)][k % 4], f2 = 1; for (var j = 2; j <= k; j++) f2 *= j; c.push(d / f2); }
      else if (fn === 'log') { c.push(Math.log(1 + a)); for (k = 1; k <= n; k++) c.push(Math.pow(-1, k + 1) / (k * Math.pow(1 + a, k))); }
      else { // 1/(1+x^2) = [1/(x-i) - 1/(x+i)]/(2i); 1/(x-z) = -sum (x-a)^k/(z-a)^(k+1)
        for (k = 0; k <= n; k++) { var A = cdiv([1, 0], cpow([-a, 1], k + 1)), Bc = cdiv([1, 0], cpow([-a, -1], k + 1)); c.push((Bc[1] - A[1]) / 2); } }
      return c;
    }
    function cpow(z, k) { var r = [1, 0]; for (var i = 0; i < k; i++) r = [r[0] * z[0] - r[1] * z[1], r[0] * z[1] + r[1] * z[0]]; return r; }
    function cdiv(u, v) { var d = v[0] * v[0] + v[1] * v[1]; return [(u[0] * v[0] + u[1] * v[1]) / d, (u[1] * v[0] - u[0] * v[1]) / d]; }
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, sx = W / 12, sy = H / (fn === 'sin' ? 4.2 : 4.6), ox = W / 2, oy = fn === 'rat' ? H * 0.72 : H / 2;
      var X = function (x) { return ox + x * sx; }, Y = function (y) { return oy - y * sy; }, cf = coeffs();
      var R = fn === 'sin' ? Infinity : fn === 'log' ? 1 + a : Math.sqrt(1 + a * a);
      if (isFinite(R)) { c.fillStyle = 'rgba(195,155,255,.09)'; c.fillRect(X(a - R), 0, 2 * R * sx, H); text(st, 'converges here', X(a), px(st, 18), PURPLE, 'center'); }
      axes(st, 0, oy, W, oy); axes(st, ox, H, ox, 0);
      c.strokeStyle = 'rgba(234,246,248,.75)'; c.lineWidth = px(st, 2); c.beginPath(); var first = true;
      for (var i = 0; i <= 600; i++) { var x = -6 + 12 * i / 600, y = f(x); if (!isFinite(y) || Math.abs(y) > 6) { first = true; continue; } if (first) { c.moveTo(X(x), Y(y)); first = false; } else c.lineTo(X(x), Y(y)); } c.stroke();
      c.strokeStyle = PURPLE; c.lineWidth = px(st, 2.4); c.beginPath(); first = true;
      for (i = 0; i <= 600; i++) { x = -6 + 12 * i / 600; var s = 0, h = x - a, hp = 1; for (var k = 0; k < cf.length; k++) { s += cf[k] * hp; hp *= h; } if (!isFinite(s) || Math.abs(s) > 8) { first = true; continue; } if (first) { c.moveTo(X(x), Y(s)); first = false; } else c.lineTo(X(x), Y(s)); } c.stroke();
      c.fillStyle = ROPE; c.beginPath(); c.arc(X(a), Y(f(a)), px(st, 6), 0, 7); c.fill();
      read('Degree ' + n + ' about x = ' + a.toFixed(2) + (isFinite(R) ? ': the series only converges within ' + R.toFixed(2) + ' of the centre' + (fn === 'rat' ? ', the distance to the complex poles at ±i.' : ', the distance to the singularity at −1.') : ': it converges everywhere, and more terms hug the curve further out.') + ' Scroll for more terms.');
    };
  });

  /* MATH 2000: Cantor's diagonal argument */
  def('MATH2000', { gauge: 'Rows listed', aria: 'A list of infinite binary sequences with the diagonal highlighted; flipping each diagonal digit builds a sequence that differs from every row.',
    note: 'Cantor&rsquo;s proof that the real numbers cannot be listed. Suppose someone hands you a complete list of infinite binary sequences (every real number between 0 and 1 has one). Walk down the diagonal and flip each digit: the new sequence differs from row 1 in digit 1, from row 2 in digit 2, and from every row somewhere, so it was never on the list. No list can be complete: there are strictly more reals than whole numbers, even though both are infinite.'
  }, function (st, g, read) {
    var R = rng(9), rows = [], M = 14, n = 1, t = 0;
    for (var i = 0; i < M; i++) { var r = []; for (var j = 0; j < 22; j++) r.push(R() < 0.5 ? 0 : 1); rows.push(r); }
    onScroll(function () { var p = progress(st.cv); n = 1 + Math.min(M - 1, Math.floor(p * M)); g(p, n + ' of ∞'); st.redraw(); });
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, ch = (H - px(st, 70)) / (M + 1), cw = Math.min(ch * 0.9, (W - px(st, 90)) / 22), x0 = px(st, 70), y0 = px(st, 24);
      var fs = Math.max(9, Math.min(14, cw / st.d * 0.75));
      for (var i = 0; i < M; i++) {
        var y = y0 + i * ch + ch * 0.7; text(st, i < n ? 'row ' + (i + 1) : '', x0 - px(st, 12), y, MIST, 'right');
        if (i >= n) continue;
        for (var j = 0; j < 22; j++) { var on = i === j; if (on) { c.fillStyle = 'rgba(255,209,102,.25)'; c.fillRect(x0 + j * cw, y0 + i * ch, cw, ch); }
          text(st, String(rows[i][j]), x0 + j * cw + cw / 2, y, on ? GOLD : 'rgba(234,246,248,.75)', 'center', fs); }
        text(st, '…', x0 + 22 * cw + px(st, 6), y, MIST);
      }
      text(st, '⋮', x0 + cw * 2, y0 + n * ch + ch * 0.55, MIST);
      var yN = y0 + (n + 1.2) * ch + ch * 0.7; text(st, 'new', x0 - px(st, 12), yN, ROPE, 'right');
      for (j = 0; j < n; j++) { c.fillStyle = 'rgba(255,106,85,.2)'; c.fillRect(x0 + j * cw, yN - ch * 0.7, cw, ch); text(st, String(1 - rows[j][j]), x0 + j * cw + cw / 2, yN, ROPE, 'center', fs); }
      text(st, '…', x0 + n * cw + px(st, 4), yN, MIST);
      read('The new sequence flips the gold diagonal digits, so it differs from row ' + (n === 1 ? '1' : '1 to row ' + n) + ' already, and will differ from every row however far the list goes. Scroll to list more rows.');
    };
  });

  /* MATH 2200: a surface, its tangent plane and gradient */
  def('MATH2200', { gauge: 'Surface', hint: 'Move your pointer over the surface to move the point', aria: 'A rotating 3D surface with the tangent plane and gradient arrow at a point that follows the pointer.',
    note: 'A function of two variables is a surface. Near any smooth point it looks flat: the tangent plane \\(z \\approx f(a,b) + f_x(a,b)(x-a) + f_y(a,b)(y-b)\\), built from the two partial derivatives. The gradient \\(\\nabla f = (f_x, f_y)\\) points straight uphill and its length is the slope that way; at a peak, pit or saddle it vanishes and the tangent plane is level, which is how you find extrema.'
  }, function (st, g, read) {
    var FS = [['peaks', function (x, y) { return 0.9 * Math.exp(-((x - 0.5) * (x - 0.5) + y * y) * 2) - 0.6 * Math.exp(-((x + 0.6) * (x + 0.6) + (y - 0.5) * (y - 0.5)) * 3); }],
      ['saddle', function (x, y) { return 0.45 * (x * x - y * y); }], ['ripple', function (x, y) { var r = Math.hypot(x, y); return 0.35 * Math.cos(4 * r) * Math.exp(-r); }],
      ['monkey saddle', function (x, y) { return 0.4 * (x * x * x - 3 * x * y * y); }]];
    var fi = 0, pt = [0.3, -0.2], tgt = null, rot = 0.6, clock = 0;
    onScroll(function () { var p = progress(st.cv); fi = Math.min(FS.length - 1, Math.floor(p * FS.length)); g(p, FS[fi][0]); });
    hover(st, function (p) { tgt = p ? [(p[0] / st.W - 0.5) * 2.6, (0.5 - p[1] / st.H) * 2.6] : null; });
    st.frame = function (dt) { clock += dt; rot += dt * 0.15; var aim = tgt || [0.8 * Math.cos(clock * 0.5), 0.8 * Math.sin(clock * 0.37)]; aim = aim.map(function (v) { return Math.max(-1, Math.min(1, v)); });
      pt[0] += (aim[0] - pt[0]) * Math.min(1, dt * 5); pt[1] += (aim[1] - pt[1]) * Math.min(1, dt * 5); };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, f = FS[fi][1], n = 34, G = [], view = { rot: rot, el: 0.5, cx: W / 2, cy: H * 0.56, s: Math.min(W, H * 1.6) * 0.32 };
      for (var i = 0; i <= n; i++) { G.push([]); for (var j = 0; j <= n; j++) { var x = -1.2 + 2.4 * j / n, y = -1.2 + 2.4 * i / n, z = f(x, y); G[i].push([x, y, z, z]); } }
      E.mesh(st, G, view, function (v, sh) { var k = Math.max(0, Math.min(1, (v + 0.9) / 1.8)); return E.rgb([60 + 135 * k, 50 + 105 * k, 110 + 145 * k], sh); });
      var h = 1e-4, fx = (f(pt[0] + h, pt[1]) - f(pt[0] - h, pt[1])) / (2 * h), fy = (f(pt[0], pt[1] + h) - f(pt[0], pt[1] - h)) / (2 * h), z0 = f(pt[0], pt[1]);
      var cr = Math.cos(view.rot), sr = Math.sin(view.rot), ce = Math.cos(view.el), se = Math.sin(view.el);
      var P = function (q) { var x = q[0] * cr - q[1] * sr, y = q[0] * sr + q[1] * cr; return [view.cx + view.s * x, view.cy - view.s * (q[2] * ce - y * se)]; };
      var d = 0.32, corners = [[-d, -d], [d, -d], [d, d], [-d, d]].map(function (o) { return P([pt[0] + o[0], pt[1] + o[1], z0 + fx * o[0] + fy * o[1] + 0.01]); });
      c.fillStyle = 'rgba(255,209,102,.35)'; c.strokeStyle = GOLD; c.lineWidth = px(st, 1.5); c.beginPath(); corners.forEach(function (q, i) { i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); c.fill(); c.stroke();
      var gl = Math.hypot(fx, fy), sc = gl > 1e-6 ? Math.min(0.45, gl * 0.4) / gl : 0, a0 = P([pt[0], pt[1], z0 + 0.01]), a1 = P([pt[0] + fx * sc, pt[1] + fy * sc, z0 + (fx * fx + fy * fy) * sc + 0.01]);
      c.strokeStyle = ROPE; c.lineWidth = px(st, 3); c.beginPath(); c.moveTo(a0[0], a0[1]); c.lineTo(a1[0], a1[1]); c.stroke();
      c.fillStyle = ROPE; c.beginPath(); c.arc(a0[0], a0[1], px(st, 5), 0, 7); c.fill();
      text(st, '∇f = (' + fx.toFixed(2) + ', ' + fy.toFixed(2) + ')', px(st, 12), px(st, 22), ROPE, 'left', 12);
      read('On the ' + FS[fi][0] + ' surface at (' + pt[0].toFixed(2) + ', ' + pt[1].toFixed(2) + '): steepest slope ' + gl.toFixed(2) + (gl < 0.05 ? ', nearly a critical point, so the tangent plane is almost level.' : ' in the direction of the red arrow.') + ' Scroll for another surface.');
    };
  });

  /* MATH 2210: vector fields, curl and divergence */
  def('MATH2210', { gauge: 'Field', hint: 'Move your pointer to place the paddle wheel', aria: 'Particles flowing through a vector field, with a paddle wheel that spins where the field has curl and a ring that grows where it has divergence.',
    note: 'A vector field assigns an arrow to every point; here particles drift along it. Divergence, \\(\\nabla\\cdot\\mathbf F\\), measures how much flow leaves a point (the ring around the wheel swells at a source and shrinks at a sink). Curl, \\(\\nabla\\times\\mathbf F\\), measures local spinning, which the paddle wheel feels. A whirlpool has curl everywhere, a source has none; Green&rsquo;s and Stokes&rsquo; theorems turn the totals of these inside a region into a single integral around its edge.'
  }, function (st, g, read) {
    var FS = [['rotation', function (x, y) { return [-y, x]; }], ['source', function (x, y) { return [x, y]; }], ['shear', function (x, y) { return [y, 0]; }],
      ['saddle', function (x, y) { return [x, -y]; }], ['vortex', function (x, y) { var r2 = x * x + y * y + 0.05; return [-y / r2 * 0.4, x / r2 * 0.4]; }], ['swirl in', function (x, y) { return [-y - 0.6 * x, x - 0.6 * y]; }]];
    var fi = 0, P = [], R = rng(2), wheel = [0.4, 0.3], tgt = null, ang = 0, ring = 1, clock = 0;
    var XR = 2.4; for (var i = 0; i < 420; i++) P.push([(R() * 2 - 1) * XR, R() * 2.4 - 1.2, R() * 3]);
    onScroll(function () { var p = progress(st.cv); fi = Math.min(FS.length - 1, Math.floor(p * FS.length)); g(p, FS[fi][0]); });
    hover(st, function (p) { tgt = p ? [(p[0] - st.W / 2) / (st.H / 2.6), -(p[1] - st.H / 2) / (st.H / 2.6)] : null; });
    function divcurl(x, y) { var f = FS[fi][1], h = 1e-3, a = f(x + h, y), b = f(x - h, y), c = f(x, y + h), d = f(x, y - h); return [(a[0] - b[0] + c[1] - d[1]) / (2 * h), (a[1] - b[1] - c[0] + d[0]) / (2 * h)]; }
    st.frame = function (dt) {
      clock += dt; var f = FS[fi][1];
      P.forEach(function (q) { var v = f(q[0], q[1]), s = Math.hypot(v[0], v[1]), k = s > 2 ? 2 / s : 1; q[0] += v[0] * k * dt * 0.5; q[1] += v[1] * k * dt * 0.5; q[2] += dt;
        XR = st.W / st.H * 1.3; if (Math.abs(q[0]) > XR || Math.abs(q[1]) > 1.3 || q[2] > 4 || Math.hypot(q[0], q[1]) < 0.02) { q[0] = (R() * 2 - 1) * XR; q[1] = R() * 2.4 - 1.2; q[2] = 0; } });
      var aim = tgt || [0.55 * Math.cos(clock * 0.3), 0.45 * Math.sin(clock * 0.41)]; wheel[0] += (aim[0] - wheel[0]) * Math.min(1, dt * 5); wheel[1] += (aim[1] - wheel[1]) * Math.min(1, dt * 5);
      var dc = divcurl(wheel[0], wheel[1]); ang += dc[1] / 2 * dt; ring += (1 + Math.max(-0.6, Math.min(1.5, dc[0] * 0.35)) - ring) * Math.min(1, dt * 3);
    };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, S = H / 2.6, f = FS[fi][1], T = function (x, y) { return [W / 2 + x * S, H / 2 - y * S]; }, nx = Math.ceil(W / S * 2.5);
      c.strokeStyle = 'rgba(195,155,255,.3)'; c.lineWidth = px(st, 1);
      for (var i = -nx; i <= nx; i++) for (var j = -6; j <= 6; j++) { var x = i / 5, y = j / 5, v = f(x, y), m = Math.hypot(v[0], v[1]); if (m < 1e-6) continue; var k = 0.13 / Math.max(m, 0.6), a = T(x, y), b = T(x + v[0] * k, y + v[1] * k); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
      P.forEach(function (q) { var a = T(q[0], q[1]); c.fillStyle = 'rgba(124,196,255,' + Math.min(1, q[2], 4 - q[2]).toFixed(2) + ')'; c.beginPath(); c.arc(a[0], a[1], px(st, 2), 0, 7); c.fill(); });
      var w = T(wheel[0], wheel[1]), R0 = px(st, 18);
      c.strokeStyle = GOLD; c.lineWidth = px(st, 2.5); c.beginPath(); for (i = 0; i < 4; i++) { var an = ang + i * Math.PI / 2; c.moveTo(w[0], w[1]); c.lineTo(w[0] + Math.cos(an) * R0, w[1] - Math.sin(an) * R0); } c.stroke();
      c.strokeStyle = 'rgba(255,106,85,.8)'; c.lineWidth = px(st, 1.5); c.beginPath(); c.arc(w[0], w[1], R0 * 1.4 * ring, 0, 7); c.stroke();
      var dc = divcurl(wheel[0], wheel[1]);
      text(st, 'div = ' + dc[0].toFixed(2) + '   curl = ' + dc[1].toFixed(2), px(st, 12), px(st, 22), FOAM, 'left', 12);
      read('The ' + FS[fi][0] + ' field: at the wheel, ' + (Math.abs(dc[1]) > 0.05 ? 'curl ' + dc[1].toFixed(2) + ' spins it ' + (dc[1] > 0 ? 'anticlockwise' : 'clockwise') : 'no curl, so it does not spin') + ', and ' + (Math.abs(dc[0]) > 0.05 ? 'divergence ' + dc[0].toFixed(2) + ' means flow is ' + (dc[0] > 0 ? 'spreading out.' : 'converging.') : 'no divergence.') + ' Scroll for another field.');
    };
  });

  /* MATH 3260: analytic continuation round a branch point */
  def('MATH3260', { gauge: 'Path', controls: '<button class="chip" type="button" data-cf="log" aria-pressed="true">log z</button><button class="chip" type="button" data-cf="sqrt" aria-pressed="false">√z</button>',
    aria: 'Analytic continuation: a chain of discs of convergence carrying a power series around the branch point at zero, beside the Riemann surface it climbs.',
    note: 'A power series only converges in a disc reaching out to the nearest singularity. But re-expanding it about a new centre inside that disc gives a new disc that can reach further, and chaining discs carries the function anywhere the singularities allow: analytic continuation. Do it once around the branch point at 0 and you come back to where you started with a different answer: \\(\\log z\\) gains \\(2\\pi i\\) on every lap, and \\(\\sqrt z\\) changes sign, returning only after two laps. The function was never multi-valued on the right space, its Riemann surface (right), where each lap climbs to a new sheet.'
  }, function (st, g, read) {
    var fn = 'log', th = 0, ths = 0, rot = 0.5;
    E.chips('[data-cf]', 'cf', function (k) { fn = k; });
    onScroll(function () { var p = progress(st.cv); th = p * 4 * Math.PI; g(p, (th / (2 * Math.PI)).toFixed(2) + ' laps'); });
    st.frame = function (dt) { ths += (th - ths) * Math.min(1, dt * 4); rot += dt * 0.12; };
    function height(r, t) { return fn === 'log' ? t / (4 * Math.PI) * 1.6 - 0.8 : 0.75 * Math.sqrt(r) * Math.cos(t / 2); }
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, wide = W > H * 1.4, lw = wide ? W * 0.45 : W, lh = wide ? H : H * 0.5, S = Math.min(lw, lh) / 3.4, cx = lw / 2, cy = lh / 2, step = 0.7;
      var T = function (x, y) { return [cx + x * S, cy - y * S]; };
      axes(st, cx - 1.6 * S, cy, cx + 1.6 * S, cy); axes(st, cx, cy + 1.6 * S, cx, cy - 1.6 * S);
      var nd = Math.floor(ths / step);
      for (var k = 0; k <= nd; k++) { var a = k * step, p = T(Math.cos(a), Math.sin(a)), lap = Math.floor(a / (2 * Math.PI));
        c.strokeStyle = k === nd ? 'rgba(234,246,248,.75)' : lap ? 'rgba(195,155,255,.22)' : 'rgba(124,196,255,.22)'; c.lineWidth = px(st, k === nd ? 1.6 : 1); if (k === nd) c.setLineDash([px(st, 4), px(st, 4)]); c.beginPath(); c.arc(p[0], p[1], S, 0, 7); c.stroke(); c.setLineDash([]);
        c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(p[0], p[1], px(st, 3), 0, 7); c.fill(); }
      c.strokeStyle = GOLD; c.lineWidth = px(st, 2.5); c.beginPath(); for (var i = 0; i <= 100; i++) { var t = ths * i / 100, q = T(Math.cos(t), Math.sin(t)); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } c.stroke();
      var e = T(Math.cos(ths), Math.sin(ths)); c.fillStyle = ROPE; c.beginPath(); c.arc(e[0], e[1], px(st, 6), 0, 7); c.fill();
      c.strokeStyle = ROPE; c.lineWidth = px(st, 2); c.beginPath(); c.moveTo(cx - px(st, 6), cy - px(st, 6)); c.lineTo(cx + px(st, 6), cy + px(st, 6)); c.moveTo(cx + px(st, 6), cy - px(st, 6)); c.lineTo(cx - px(st, 6), cy + px(st, 6)); c.stroke();
      text(st, 'branch point', cx + px(st, 10), cy + px(st, 16), ROPE);
      text(st, 'each disc: where one power series converges', px(st, 10), px(st, 20), MIST);
      // Riemann surface
      var gx = wide ? lw : 0, gy = wide ? 0 : lh, gw = wide ? W - lw : W, gh = wide ? H : H - lh, G = [], view = { rot: rot, el: 0.35, cx: gx + gw / 2, cy: gy + gh / 2, s: Math.min(gw, gh) * 0.36 };
      var NR = 8, NT = 96;
      for (i = 0; i <= NR; i++) { G.push([]); for (var j = 0; j <= NT; j++) { var r = 0.15 + 1.2 * i / NR, tt = 4 * Math.PI * j / NT; G[i].push([r * Math.cos(tt), r * Math.sin(tt), height(r, tt), tt]); } }
      E.mesh(st, G, view, function (v, sh) { return E.rgb(v < 2 * Math.PI ? [124, 196, 255] : [195, 155, 255], sh * 0.85); });
      var cr = Math.cos(view.rot), sr = Math.sin(view.rot), ce = Math.cos(view.el), se = Math.sin(view.el);
      var Pp = function (x, y, z) { var X = x * cr - y * sr, Y = x * sr + y * cr; return [view.cx + view.s * X, view.cy - view.s * (z * ce - Y * se)]; };
      c.strokeStyle = GOLD; c.lineWidth = px(st, 2.5); c.beginPath(); for (i = 0; i <= 120; i++) { t = ths * i / 120; var q2 = Pp(Math.cos(t), Math.sin(t), height(1, t) + 0.02); i ? c.lineTo(q2[0], q2[1]) : c.moveTo(q2[0], q2[1]); } c.stroke();
      var e2 = Pp(Math.cos(ths), Math.sin(ths), height(1, ths) + 0.02); c.fillStyle = ROPE; c.beginPath(); c.arc(e2[0], e2[1], px(st, 6), 0, 7); c.fill();
      text(st, 'Riemann surface of ' + (fn === 'log' ? 'log z' : '√z'), gx + px(st, 10), gy + px(st, 20), MIST);
      var laps = ths / (2 * Math.PI), val = fn === 'log' ? 'log z = ' + (ths).toFixed(2) + 'i' : '√z = ' + Math.cos(ths / 2).toFixed(2) + (Math.sin(ths / 2) >= 0 ? ' + ' : ' − ') + Math.abs(Math.sin(ths / 2)).toFixed(2) + 'i';
      text(st, 'continued to z = e^(' + ths.toFixed(2) + 'i):  ' + val, px(st, 10), lh - px(st, 12), FOAM, 'left', 12);
      read(fn === 'log' ? 'Starting from log 1 = 0 and continuing ' + laps.toFixed(2) + ' laps round the origin, ' + (laps > 0.98 ? 'we are back at z = 1 but log z now reads ' + (2 * Math.round(laps)) + 'πi: a different branch.' : 'each new disc re-expands the series about a new centre.') + ' Scroll to keep going.'
        : 'Starting from √1 = 1: ' + (Math.abs(laps - 1) < 0.05 ? 'after one lap we are back at z = 1 with √z = −1.' : Math.abs(laps - 2) < 0.05 ? 'after two laps √z is back to +1: the surface closes up.' : 'continuing ' + laps.toFixed(2) + ' laps round the origin.') + ' Scroll to keep going.');
    };
  });

  /* MATH 2270: slope fields */
  def('MATH2270', { gauge: 'Equation', hint: 'Point anywhere to start a solution there', aria: 'A slope field for a first-order differential equation, with solution curves through the pointer.',
    note: 'A first-order equation \\(y\\prime = f(x, y)\\) gives a slope at every point; drawing them all shows every solution at once, and a solution through any starting point just follows the arrows (here traced with Runge&ndash;Kutta). The logistic equation has two equilibria, one attracting and one repelling; \\(y\\prime = x - y^2\\) is a Riccati equation with no elementary solution; and \\(y\\prime = -y + \\sin x\\) is linear, so every solution forgets where it started and locks onto the same steady oscillation.'
  }, function (st, g, read) {
    var FS = [['y′ = y(1 − y)', function (x, y) { return y * (1 - y); }, 0.5], ['y′ = x − y²', function (x, y) { return x - y * y; }, 0], ['y′ = −y + 2 sin x', function (x, y) { return -y + 2 * Math.sin(x); }, 0], ['y′ = sin(xy)', function (x, y) { return Math.sin(x * y); }, 0]];
    var fi = 0, pt = null, clock = 0;
    onScroll(function () { var p = progress(st.cv); fi = Math.min(FS.length - 1, Math.floor(p * FS.length)); g(p, FS[fi][0]); st.redraw(); });
    hover(st, function (p) { pt = p; st.redraw(); });
    st.frame = function (dt) { clock += dt; };
    function trace(f, x, y, dir) { var out = [[x, y]], h = 0.03 * dir; for (var i = 0; i < 500; i++) { var k1 = f(x, y), k2 = f(x + h / 2, y + h / 2 * k1), k3 = f(x + h / 2, y + h / 2 * k2), k4 = f(x + h, y + h * k3); y += h / 6 * (k1 + 2 * k2 + 2 * k3 + k4); x += h; if (Math.abs(y) > 6 || Math.abs(x) > 7) break; out.push([x, y]); } return out; }
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, sx = W / 12, sy = H / 6.4, f = FS[fi][1], T = function (x, y) { return [W / 2 + x * sx, H / 2 - (y - FS[fi][2]) * sy]; };
      axes(st, 0, T(0, 0)[1], W, T(0, 0)[1]); axes(st, W / 2, H, W / 2, 0);
      c.strokeStyle = 'rgba(195,155,255,.45)'; c.lineWidth = px(st, 1.2);
      for (var i = -12; i <= 12; i++) for (var j = -7; j <= 7; j++) { var x = i / 2, y = j / 2.3 + FS[fi][2], m = f(x, y), L = 0.18 / Math.sqrt(1 + m * m * sx * sx / (sy * sy)), a = T(x - L, y - L * m), b = T(x + L, y + L * m); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
      var starts = []; for (i = -3; i <= 3; i++) starts.push([-5.8, i * 0.9 + FS[fi][2]]);
      starts.forEach(function (s0) { var tr = trace(f, s0[0], s0[1], 1); c.strokeStyle = 'rgba(124,196,255,.35)'; c.lineWidth = px(st, 1.2); c.beginPath(); tr.forEach(function (q, i) { var p = T(q[0], q[1]); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.stroke(); });
      var p0 = pt ? [(pt[0] - W / 2) / sx, -(pt[1] - H / 2) / sy + FS[fi][2]] : [-2 + Math.sin(clock * 0.3), FS[fi][2] + 0.8];
      var tr = trace(f, p0[0], p0[1], -1).reverse().concat(trace(f, p0[0], p0[1], 1));
      c.strokeStyle = GOLD; c.lineWidth = px(st, 2.5); c.beginPath(); tr.forEach(function (q, i) { var p = T(q[0], q[1]); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.stroke();
      var a0 = T(p0[0], p0[1]); c.fillStyle = ROPE; c.beginPath(); c.arc(a0[0], a0[1], px(st, 6), 0, 7); c.fill();
      text(st, FS[fi][0], px(st, 12), px(st, 22), FOAM, 'left', 12);
      read(FS[fi][0] + ': the gold curve is the solution through (' + p0[0].toFixed(2) + ', ' + p0[1].toFixed(2) + '). Scroll for another equation.');
    };
  });

  /* MATH 3100: phase plane and limit cycles */
  def('MATH3100', { gauge: 'Nonlinearity μ', hint: 'Point anywhere to launch a trajectory', aria: 'Phase portrait of the Van der Pol oscillator: trajectories from inside and outside spiral onto the same closed loop, the limit cycle.',
    note: 'The Van der Pol oscillator, \\(\\ddot x - \\mu(1 - x^2)\\dot x + x = 0\\), written as a system in the phase plane. Linearising at the origin gives eigenvalues with positive real part, so it is an unstable spiral; far out, the damping turns positive. Every trajectory, from inside or out, is drawn onto one closed orbit, a limit cycle: a self-sustained oscillation like a heartbeat or a valve radio. Small \\(\\mu\\) gives a near-circle; large \\(\\mu\\) gives sudden relaxation jumps.'
  }, function (st, g, read) {
    var mu = 1, trajs = [], R = rng(8), clock = 0, last = null;
    function f(s) { return [s[1], mu * (1 - s[0] * s[0]) * s[1] - s[0]]; }
    function rk(s, h) { var k1 = f(s), k2 = f([s[0] + h / 2 * k1[0], s[1] + h / 2 * k1[1]]), k3 = f([s[0] + h / 2 * k2[0], s[1] + h / 2 * k2[1]]), k4 = f([s[0] + h * k3[0], s[1] + h * k3[1]]); return [s[0] + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), s[1] + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])]; }
    function add(s) { trajs.push({ s: s, path: [s.slice()] }); if (trajs.length > 10) trajs.shift(); }
    for (var i = 0; i < 6; i++) add([(R() - 0.5) * 7, (R() - 0.5) * 7]);
    onScroll(function () { var p = progress(st.cv), nm = Math.round((0.1 + 3.9 * p) * 20) / 20; g(p, 'μ = ' + nm.toFixed(2)); if (nm !== mu) { mu = nm; trajs.forEach(function (t) { t.path = [t.s.slice()]; }); } });
    function S() { return Math.min(st.W / 9, st.H / (2 * (2 + mu * 0.9) + 1)); }
    hover(st, function (p) { if (!p) return; var s = S(), q = [(p[0] - st.W / 2) / s, -(p[1] - st.H / 2) / s]; if (last && Math.hypot(q[0] - last[0], q[1] - last[1]) < 0.4) return; last = q; add(q); });
    st.frame = function (dt) { clock += dt; trajs.forEach(function (t) { for (var k = 0; k < 4; k++) { t.s = rk(t.s, Math.min(dt, 0.04) * 0.6); } t.path.push(t.s.slice()); if (t.path.length > 700) t.path.shift(); });
      if (clock > 5) { clock = 0; add([(R() - 0.5) * 8, (R() - 0.5) * 8]); } };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, s = S(), T = function (q) { return [W / 2 + q[0] * s, H / 2 - q[1] * s]; };
      axes(st, 0, H / 2, W, H / 2); axes(st, W / 2, H, W / 2, 0);
      c.strokeStyle = 'rgba(195,155,255,.22)'; c.lineWidth = px(st, 1);
      for (var i = -8; i <= 8; i++) for (var j = -6; j <= 6; j++) { var q = [i * 0.5, j * (0.5 + mu * 0.25)], v = f(q), m = Math.hypot(v[0], v[1]) || 1, a = T(q), b = T([q[0] + v[0] / m * 0.2, q[1] + v[1] / m * 0.2]); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
      trajs.forEach(function (t, k) { c.strokeStyle = k === trajs.length - 1 ? GOLD : 'rgba(124,196,255,.7)'; c.lineWidth = px(st, 1.8); c.beginPath(); t.path.forEach(function (q, i) { var p = T(q); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.stroke();
        var e = T(t.s); c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(e[0], e[1], px(st, 4), 0, 7); c.fill(); });
      text(st, 'x →', W - px(st, 8), H / 2 + px(st, 16), MIST, 'right'); text(st, 'ẋ', W / 2 + px(st, 8), px(st, 16), MIST);
      var disc = mu * mu - 4; text(st, 'origin: eigenvalues ' + (disc < 0 ? (mu / 2).toFixed(2) + ' ± ' + (Math.sqrt(-disc) / 2).toFixed(2) + 'i (unstable spiral)' : ((mu + Math.sqrt(disc)) / 2).toFixed(2) + ', ' + ((mu - Math.sqrt(disc)) / 2).toFixed(2) + ' (unstable node)'), px(st, 12), px(st, 22), FOAM, 'left', 12);
      read('μ = ' + mu.toFixed(2) + ': every trajectory ends up on the same closed loop, ' + (mu < 0.8 ? 'nearly a circle of radius 2.' : mu < 2 ? 'now visibly distorted.' : 'with slow drifts and sudden jumps (relaxation oscillations).') + ' Scroll to change μ.');
    };
  });

  /* MATH 3130: the symmetry group of a square */
  def('MATH3130', { gauge: 'Product', hint: 'Point at a cell in the table to see it', aria: 'The eight symmetries of a square and their Cayley table; a product is animated by applying one symmetry then another.',
    note: 'The eight ways to move a square onto itself (four rotations and four reflections) form the dihedral group \\(D_4\\). Doing one and then another is again one of the eight, so the multiplication table on the right closes up, every element has an inverse, and the identity sits on the diagonal exactly where an element meets its inverse. The table is not symmetric: rotating then reflecting is not reflecting then rotating, so the group is non-abelian, the smallest example being \\(D_3\\).'
  }, function (st, g, read) {
    // elements as 2x2 integer matrices: r^k then reflections s r^k
    var NAMES = ['e', 'r', 'r²', 'r³', 's', 'sr', 'sr²', 'sr³'], M = [];
    var rot = function (k) { var c = Math.round(Math.cos(k * Math.PI / 2)), s = Math.round(Math.sin(k * Math.PI / 2)); return [c, -s, s, c]; }, mul = function (a, b) { return [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3]]; };
    for (var k = 0; k < 4; k++) M.push(rot(k)); for (k = 0; k < 4; k++) M.push(mul([1, 0, 0, -1], rot(k)));
    var idx = function (m) { for (var i = 0; i < 8; i++) if (M[i].every(function (v, j) { return v === m[j]; })) return i; return -1; };
    var TBL = []; for (var i = 0; i < 8; i++) { TBL.push([]); for (var j = 0; j < 8; j++) TBL[i].push(idx(mul(M[i], M[j]))); }   // row i, column j: do j first, then i
    var cell = [1, 4], hov = null, t = 0;
    var COLS = ['#eaf6f8', '#7cc4ff', '#5fd3b0', '#c39bff', '#ffd166', '#ff8a5c', '#ff6a55', '#8fb1bd'];
    onScroll(function () { var p = progress(st.cv), n = Math.min(63, Math.floor(p * 64)); if (!hov) { cell = [Math.floor(n / 8), n % 8]; t = 0; } g(p, NAMES[cell[0]] + ' · ' + NAMES[cell[1]]); });
    function geo() { var ts = Math.min(st.H - px(st, 50), st.W * 0.48), x0 = st.W - ts - px(st, 10); return { ts: ts, x0: x0, y0: px(st, 30), c: ts / 9 }; }
    hover(st, function (p) { if (!p) { hov = null; return; } var gg = geo(), i = Math.floor((p[1] - gg.y0) / gg.c) - 1, j = Math.floor((p[0] - gg.x0) / gg.c) - 1; if (i >= 0 && i < 8 && j >= 0 && j < 8 && (!hov || hov[0] !== i || hov[1] !== j)) { hov = [i, j]; cell = [i, j]; t = 0; } });
    st.frame = function (dt) { t += dt; if (t > 4.2) t = 0; };
    function lerp(a, b, u) { return a.map(function (v, i) { return v + (b[i] - v) * u; }); }
    st.draw = function () {
      clear(st); var c = st.ctx, gg = geo(), i = cell[0], j = cell[1];
      // table
      for (var a = 0; a < 8; a++) { text(st, NAMES[a], gg.x0 + gg.c / 2, gg.y0 + (a + 1.65) * gg.c, MIST, 'center'); text(st, NAMES[a], gg.x0 + (a + 1.5) * gg.c, gg.y0 + gg.c * 0.65, MIST, 'center'); }
      for (a = 0; a < 8; a++) for (var b = 0; b < 8; b++) { var v = TBL[a][b], on = a === i && b === j; c.fillStyle = COLS[v]; c.globalAlpha = on ? 1 : (a === i || b === j ? 0.5 : 0.22); c.fillRect(gg.x0 + (b + 1) * gg.c + 1, gg.y0 + (a + 1) * gg.c + 1, gg.c - 2, gg.c - 2); c.globalAlpha = 1;
        text(st, NAMES[v], gg.x0 + (b + 1.5) * gg.c, gg.y0 + (a + 1.65) * gg.c, on ? DEEP : 'rgba(7,34,46,.8)', 'center'); }
      text(st, 'first ↓ … then ←', gg.x0, gg.y0 - px(st, 10), MIST);
      // the square, animated: apply column element, then row element
      var sw = gg.x0 - px(st, 30), cx = sw / 2 + px(st, 10), cy = st.H / 2, R = Math.min(sw, st.H) * 0.28;
      var u1 = Math.min(1, Math.max(0, (t - 0.4) / 1.2)), u2 = Math.min(1, Math.max(0, (t - 2) / 1.2));
      var part = function (m, u) {   // a rotation turns through its angle; a reflection flips about its axis
        if (m[0] * m[3] - m[1] * m[2] > 0) { var th = Math.atan2(m[2], m[0]) * u; return [Math.cos(th), -Math.sin(th), Math.sin(th), Math.cos(th)]; }
        var al = Math.atan2(m[2], m[0]) / 2, ca = Math.cos(al), sa = Math.sin(al), k = Math.cos(Math.PI * u);
        return mul(mul([ca, -sa, sa, ca], [1, 0, 0, k]), [ca, sa, -sa, ca]); };
      var Mt = u2 > 0 ? mul(part(M[i], u2), M[j]) : part(M[j], u1);
      var corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]], lbl = ['1', '2', '3', '4'], ccol = [ROPE, GOLD, GREEN, BLUE];
      c.strokeStyle = 'rgba(143,177,189,.35)'; c.setLineDash([px(st, 4), px(st, 4)]); c.strokeRect(cx - R, cy - R, 2 * R, 2 * R); c.setLineDash([]);
      var P = corners.map(function (q) { return [cx + R * (Mt[0] * q[0] + Mt[1] * q[1]), cy - R * (Mt[2] * q[0] + Mt[3] * q[1])]; });
      c.fillStyle = 'rgba(124,196,255,.15)'; c.strokeStyle = BLUE; c.lineWidth = px(st, 2); c.beginPath(); P.forEach(function (q, k) { k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); c.fill(); c.stroke();
      P.forEach(function (q, k) { c.fillStyle = ccol[k]; c.beginPath(); c.arc(q[0], q[1], px(st, 9), 0, 7); c.fill(); text(st, lbl[k], q[0], q[1] + px(st, 4), DEEP, 'center', 11); });
      text(st, (t < 2 ? 'first ' + NAMES[j] : 'then ' + NAMES[i]) + '  →  ' + NAMES[TBL[i][j]], cx, st.H - px(st, 16), FOAM, 'center', 12);
      var comm = TBL[i][j] === TBL[j][i];
      read(NAMES[j] + ' followed by ' + NAMES[i] + ' is ' + NAMES[TBL[i][j]] + (comm ? '; in the other order it is the same.' : ', but in the other order it is ' + NAMES[TBL[j][i]] + ': the group is not commutative.') + ' (r turns 90° anticlockwise, s flips top to bottom.)');
    };
  });
})();
