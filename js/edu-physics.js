/* Education: one small demo per physics course. Loaded after education.js, which exposes EDU (the helpers). */
(function () {
  'use strict';
  var E = window.EDU; if (!E) return;
  var px = E.px, text = E.text, axes = E.axes, clear = E.clear, onScroll = E.onScroll, progress = E.progress, hover = E.hover, rng = E.rng;
  var FOAM = E.FOAM, MIST = E.MIST, ROPE = E.ROPE, DEEP = E.DEEP, BLUE = '#7cc4ff', GOLD = '#ffd166', GREEN = '#5fd3b0', PURPLE = '#c39bff';
  var def = E.def;

  /* PHYS 1080: Poiseuille flow in a pipe */
  def('PHYS1080', { gauge: 'Pipe radius', aria: 'Fluid flowing through a pipe with a parabolic velocity profile; narrowing the pipe cuts the flow by the fourth power of the radius.',
    note: 'Viscous fluid in a pipe sticks to the walls and moves fastest down the middle, in a parabola, \\(v(r) = \\tfrac{\\Delta P}{4\\eta L}(R^2 - r^2)\\). Adding it up over the cross-section gives Poiseuille&rsquo;s law, \\(Q = \\pi R^4 \\Delta P / 8\\eta L\\): flow goes as the radius to the fourth power, so an artery narrowed by a fifth carries well under half the blood at the same pressure. That fourth power is why the body controls blood flow by tightening vessels.'
  }, function (st, g, read) {
    var R = 1, Rs = 1, N = 220, P = [], rnd = rng(4);
    for (var i = 0; i < N; i++) P.push([rnd(), rnd() * 2 - 1]);
    onScroll(function () { var p = progress(st.cv); R = 1 - 0.6 * p; g(p, (R * 100).toFixed(0) + '% of full'); });
    st.frame = function (dt) { Rs += (R - Rs) * Math.min(1, dt * 5); P.forEach(function (q) { q[0] += 0.22 * Rs * Rs * (1 - q[1] * q[1]) * dt; if (q[0] > 1) { q[0] -= 1; q[1] = rnd() * 2 - 1; } }); };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, wide = W > H * 1.5, pw = wide ? W * 0.62 : W, ph = wide ? H : H * 0.58, cy = ph / 2, hr = ph * 0.42 * Rs, x0 = px(st, 10), x1 = pw - px(st, 10);
      c.fillStyle = 'rgba(143,177,189,.12)'; c.fillRect(x0, 0, x1 - x0, cy - hr); c.fillRect(x0, cy + hr, x1 - x0, ph - cy - hr);
      c.strokeStyle = MIST; c.lineWidth = px(st, 2); c.beginPath(); c.moveTo(x0, cy - hr); c.lineTo(x1, cy - hr); c.moveTo(x0, cy + hr); c.lineTo(x1, cy + hr); c.stroke();
      P.forEach(function (q) { var v = 1 - q[1] * q[1]; c.fillStyle = 'rgba(124,196,255,' + (0.35 + 0.6 * v).toFixed(2) + ')'; c.beginPath(); c.arc(x0 + q[0] * (x1 - x0), cy + q[1] * hr * 0.96, px(st, 2.4), 0, 7); c.fill(); });
      // velocity profile arrows
      var ax = x0 + (x1 - x0) * 0.12; c.strokeStyle = GOLD; c.lineWidth = px(st, 1.5); c.beginPath();
      for (var k = -8; k <= 8; k++) { var y = k / 8, len = (1 - y * y) * Rs * Rs * (x1 - x0) * 0.22; c.moveTo(ax, cy + y * hr); c.lineTo(ax + len, cy + y * hr); } c.stroke();
      c.beginPath(); for (k = -40; k <= 40; k++) { y = k / 40; var xx = ax + (1 - y * y) * Rs * Rs * (x1 - x0) * 0.22; k === -40 ? c.moveTo(xx, cy + y * hr) : c.lineTo(xx, cy + y * hr); } c.stroke();
      text(st, 'velocity profile', ax, cy - hr - px(st, 8), GOLD);
      // Q against R
      var gx = wide ? pw + px(st, 40) : px(st, 40), gy = wide ? px(st, 30) : ph + px(st, 24), gw = W - gx - px(st, 12), b = H - px(st, 26);
      axes(st, gx, b, gx + gw, b); axes(st, gx, b, gx, gy);
      c.strokeStyle = BLUE; c.lineWidth = px(st, 2); c.beginPath(); for (k = 0; k <= 100; k++) { var r = k / 100, X = gx + r * gw, Y = b - Math.pow(r, 4) * (b - gy); k ? c.lineTo(X, Y) : c.moveTo(X, Y); } c.stroke();
      c.fillStyle = ROPE; c.beginPath(); c.arc(gx + Rs * gw, b - Math.pow(Rs, 4) * (b - gy), px(st, 6), 0, 7); c.fill();
      text(st, 'flow rate Q ∝ R⁴', gx + px(st, 6), gy + px(st, 4), BLUE); text(st, 'radius →', gx + gw, b + px(st, 16), MIST, 'right');
      read('At ' + (R * 100).toFixed(0) + '% of the radius the pipe carries ' + (Math.pow(R, 4) * 100).toFixed(1) + '% of the flow, and the centreline is moving at ' + (R * R * 100).toFixed(0) + '% of its old speed. Scroll to narrow it.');
    };
  });
  /* PHYS 1070: Doppler effect */
  def('PHYS1070', { hint: 'Move your pointer (or tap) to move the source', aria: 'A sound source emitting circular wavefronts that bunch up ahead of it as it moves; an ear on the right hears the shifted pitch.',
    note: 'Each wavefront spreads from wherever the source was when it was emitted, so a moving source crowds its fronts ahead and spaces them out behind. A listener in front hears a higher pitch, \\(f\\prime = f\\,/\\,(1 - v_r/c)\\), where \\(v_r\\) is how fast the source approaches: the drop in pitch as an ambulance passes. Moving faster than the waves would stack them into a shock wave.'
  }, function (st, g, read) {
    var src = [0.4, 0.5], tgt = null, waves = [], clock = 0, lastEmit = 0, T = 0.6, vr = 0, ear = [0.9, 0.5];
    hover(st, function (p) { tgt = p ? [p[0] / st.W, p[1] / st.H] : null; });
    st.frame = function (dt) {
      clock += dt; var c = 0.22, aim = tgt || [0.42 + 0.3 * Math.sin(clock * 0.55), 0.5 + 0.12 * Math.sin(clock * 0.9)];
      var dx = aim[0] - src[0], dy = (aim[1] - src[1]) * st.H / st.W, d = Math.hypot(dx, dy), vmax = 0.8 * c, step = Math.min(d, vmax * dt, d * Math.min(1, dt * 3));
      var vx = d ? dx / d * step / Math.max(dt, 1e-3) : 0, vy = d ? dy / d * step / Math.max(dt, 1e-3) : 0;
      if (d) { src[0] += dx / d * step; src[1] += dy / d * step * st.W / st.H; }
      var ex = ear[0] - src[0], ey = (ear[1] - src[1]) * st.H / st.W, el = Math.hypot(ex, ey) || 1; vr = (vx * ex + vy * ey) / el / c;
      if (clock - lastEmit > T) { lastEmit = clock; waves.push([src[0], src[1], clock]); }
      waves = waves.filter(function (w) { return (clock - w[2]) * c < 1.6; });
      st.c = c;
    };
    st.draw = function () {
      clear(st); var cx = st.ctx, W = st.W, H = st.H, c = st.c || 0.22;
      waves.forEach(function (w) { var r = (clock - w[2]) * c * W; cx.strokeStyle = 'rgba(124,196,255,' + (Math.min(1, (clock - w[2]) * 2.5) * Math.max(0, 0.6 - r / W * 0.4)).toFixed(3) + ')'; cx.lineWidth = px(st, 1.4); cx.beginPath(); cx.arc(w[0] * W, w[1] * H, r, 0, 7); cx.stroke(); });
      cx.fillStyle = ROPE; cx.beginPath(); cx.arc(src[0] * W, src[1] * H, px(st, 8), 0, 7); cx.fill();
      cx.fillStyle = GOLD; cx.beginPath(); cx.arc(ear[0] * W, ear[1] * H, px(st, 7), 0, 7); cx.fill();
      text(st, 'listener', ear[0] * W, ear[1] * H + px(st, 22), GOLD, 'center');
      var f = 1 / (1 - vr); text(st, 'pitch heard: ' + f.toFixed(2) + '× the source', W - px(st, 12), px(st, 22), FOAM, 'right', 12);
      read('The source is ' + (vr > 0.05 ? 'approaching the listener at ' + (vr * 100).toFixed(0) + '% of the wave speed, so the pitch rises.' : vr < -0.05 ? 'moving away at ' + (-vr * 100).toFixed(0) + '% of the wave speed, so the pitch drops.' : 'barely moving toward or away from the listener.'));
    };
  });

  /* PHYS 2180: a bridge driven at resonance (after the driven oscillator lab) */
  def('PHYS2180', { gauge: 'Wave frequency', aria: 'A suspension bridge deck shaken by waves of changing frequency; near each natural frequency one vibration mode grows large.',
    note: 'The driven, damped oscillator from the lab, scaled up to a bridge. A deck pinned at both ends has a ladder of natural modes, the \\(n\\)th with \\(n\\) half-waves along its length and frequency \\(n\\omega_1\\). Waves hitting a pier push it at their own frequency, and each mode answers like the lab&rsquo;s oscillator, \\(A_n \\propto 1/\\sqrt{(\\omega_n^2-\\omega^2)^2 + \\gamma^2\\omega^2}\\). Sweep through and the deck switches shape as each resonance takes over. Engineers add damping so no peak is tall enough to matter.'
  }, function (st, g, read) {
    var w = 0.6, ws = 0.6, t = 0, gam = 0.09, xp = 0.3, M = 5;
    function resp(w) { var out = []; for (var n = 1; n <= M; n++) { var wn = n, b = Math.sin(n * Math.PI * xp); out.push([b / Math.sqrt((wn * wn - w * w) * (wn * wn - w * w) + gam * gam * w * w), Math.atan2(gam * w, wn * wn - w * w)]); } return out; }
    function total(w) { return resp(w).reduce(function (s, r) { return s + Math.abs(r[0]); }, 0); }
    var big = 0; for (var k = 0; k <= 500; k++) big = Math.max(big, total(0.3 + 5 * k / 500));
    onScroll(function () { var p = progress(st.cv); w = 0.3 + 4.9 * p; g(p, 'ω = ' + w.toFixed(2) + ' ω₁'); });
    st.frame = function (dt) { ws += (w - ws) * Math.min(1, dt * 4); t += dt * 2.2; };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, x0 = px(st, 40), x1 = W - px(st, 40), deckY = H * 0.36, water = H * 0.5, R = resp(ws), amp = H * 0.12;
      var y = function (x) { var s = 0; for (var n = 1; n <= M; n++) s += R[n - 1][0] * Math.sin(n * Math.PI * x) * Math.cos(ws * t - R[n - 1][1]); return s / big * 3; };
      // water waves arriving
      c.strokeStyle = 'rgba(124,196,255,.5)'; c.lineWidth = px(st, 1.5); c.beginPath();
      for (var i = 0; i <= 200; i++) { var X = i / 200 * W, Y = water + px(st, 6) * Math.sin(ws * t - X / W * ws * 9); i ? c.lineTo(X, Y) : c.moveTo(X, Y); } c.stroke();
      // towers and cable
      var tw = [x0 + (x1 - x0) * 0.0, x1]; c.strokeStyle = MIST; c.lineWidth = px(st, 4); tw.forEach(function (x) { c.beginPath(); c.moveTo(x, water); c.lineTo(x, deckY - H * 0.2); c.stroke(); });
      var pier = x0 + xp * (x1 - x0); c.lineWidth = px(st, 3); c.strokeStyle = GOLD; c.beginPath(); c.moveTo(pier, water + px(st, 4)); c.lineTo(pier, deckY + y(xp) * amp); c.stroke();
      var cable = function (x) { var u = (x - x0) / (x1 - x0); return deckY - H * 0.2 + H * 0.17 * 4 * u * (1 - u); };
      c.strokeStyle = 'rgba(143,177,189,.7)'; c.lineWidth = px(st, 1.5); c.beginPath(); for (i = 0; i <= 60; i++) { X = x0 + i / 60 * (x1 - x0); i ? c.lineTo(X, cable(X)) : c.moveTo(X, cable(X)); } c.stroke();
      c.lineWidth = px(st, 1); c.beginPath(); for (i = 1; i < 24; i++) { X = x0 + i / 24 * (x1 - x0); c.moveTo(X, cable(X)); c.lineTo(X, deckY + y(i / 24) * amp); } c.stroke();
      c.strokeStyle = ROPE; c.lineWidth = px(st, 4); c.beginPath(); for (i = 0; i <= 120; i++) { var u = i / 120; X = x0 + u * (x1 - x0); Y = deckY + y(u) * amp; i ? c.lineTo(X, Y) : c.moveTo(X, Y); } c.stroke();
      text(st, 'waves push this pier', pier + px(st, 8), water + px(st, 20), GOLD);
      // response spectrum
      var b = H - px(st, 26), top = Math.max(H * 0.62, water + px(st, 46)), gx = px(st, 40), gw = W - px(st, 80);
      axes(st, gx, b, gx + gw, b);
      c.strokeStyle = BLUE; c.lineWidth = px(st, 2); c.beginPath(); for (i = 0; i <= 400; i++) { var ww = 0.3 + 4.9 * i / 400; X = gx + i / 400 * gw; Y = b - Math.min(1, total(ww) / big) * (b - top); i ? c.lineTo(X, Y) : c.moveTo(X, Y); } c.stroke();
      c.fillStyle = ROPE; c.beginPath(); c.arc(gx + (ws - 0.3) / 4.9 * gw, b - Math.min(1, total(ws) / big) * (b - top), px(st, 6), 0, 7); c.fill();
      for (var n = 1; n <= M; n++) text(st, 'mode ' + n, gx + (n - 0.3) / 4.9 * gw, b + px(st, 16), MIST, 'center');
      text(st, 'how hard the deck shakes', gx, top - px(st, 8), BLUE);
      var dom = 0; R.forEach(function (r, i) { if (Math.abs(r[0]) > Math.abs(R[dom][0])) dom = i; });
      var nearest = Math.round(ws), near = Math.abs(ws - nearest) < 0.15 && nearest >= 1 && nearest <= M;
      read(near ? 'Right on mode ' + nearest + ': the deck swings in ' + nearest + ' half-wave' + (nearest > 1 ? 's' : '') + ' and the motion is large.' : 'Between resonances the deck barely moves; mode ' + (dom + 1) + ' is the biggest part of the motion. Scroll to sweep the frequency.');
    };
  });
  /* PHYS 2310: an orbit that changes smoothly */
  def('PHYS2310', { gauge: 'Orbital energy', hint: 'Tap or click to relaunch from your pointer', aria: 'A satellite orbiting a planet whose orbit stretches smoothly from a circle to an ellipse to an escape as you scroll.',
    note: 'Gravity, \\(F = GMm/r^2\\), with the orbit set by the satellite&rsquo;s energy. Scrolling fires a gentle engine along the direction of motion, and the dashed path is where the satellite would go if the engine stopped now. At the circular speed \\(\\sqrt{GM/r}\\) the orbit is a circle; adding energy stretches it into an ellipse with the planet at one focus (Kepler&rsquo;s first law), and once the total energy reaches zero, at \\(\\sqrt 2\\) times circular speed, it never comes back.'
  }, function (st, g, read) {
    var r0 = 0.55, k = 1, s, trail = [], pred = [], tick = 0, Et = 0;
    function launch(x, y, kk) { var r = Math.hypot(x, y), v = kk / Math.sqrt(r); s = [x, y, -y / r * v, x / r * v]; trail = []; }
    function En(q) { return 0.5 * (q[2] * q[2] + q[3] * q[3]) - 1 / Math.hypot(q[0], q[1]); }
    function step(q, dt, thrust) {
      var d = Math.hypot(q[0], q[1]), ax = -q[0] / (d * d * d), ay = -q[1] / (d * d * d), v = Math.hypot(q[2], q[3]) || 1;
      if (thrust) { var a = Math.max(-1.2, Math.min(1.2, (Et - En(q)) * 2)) / Math.max(v, 0.3); ax += a * q[2] / v; ay += a * q[3] / v; }
      q[2] += ax * dt; q[3] += ay * dt; q[0] += q[2] * dt; q[1] += q[3] * dt;
    }
    function predict() { var q = s.slice(), a0 = Math.atan2(q[1], q[0]), turned = 0, prev = a0; pred = [];
      for (var i = 0; i < 9000; i++) { for (var j = 0; j < 2; j++) step(q, 0.002, false); var d = Math.hypot(q[0], q[1]); if (d < 0.06 || d > 4) break; if (i % 4 === 0) pred.push([q[0], q[1]]);
        var an = Math.atan2(q[1], q[0]), da = an - prev; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; turned += da; prev = an; if (Math.abs(turned) > 2 * Math.PI) break; } }
    launch(-r0, 0, 1);
    onScroll(function () { var p = progress(st.cv); k = 0.6 + 0.9 * p; Et = 0.5 * k * k / r0 - 1 / r0; g(p, Et < -0.02 ? 'bound' : 'escaping'); });
    st.cv.addEventListener('pointerdown', function (e) { var r = st.cv.getBoundingClientRect(), S = Math.min(st.W, st.H) / 2.2, x = ((e.clientX - r.left) * st.d - st.W / 2) / S, y = ((e.clientY - r.top) * st.d - st.H / 2) / S;
      if (Math.hypot(x, y) > 0.15) launch(x, y, Math.sqrt(Math.max(0.05, 2 * (Et + 1 / Math.hypot(x, y)))) * Math.sqrt(Math.hypot(x, y))); });
    st.frame = function (dt) {
      for (var i = 0; i < Math.round(Math.min(dt, 0.04) / 0.0005); i++) step(s, 0.0005, true);
      var d = Math.hypot(s[0], s[1]); if (d < 0.07 || d > 3.6) launch(-r0, 0, Math.min(k, 1.3));
      trail.push([s[0], s[1]]); if (trail.length > 500) trail.shift();
      if (tick++ % 4 === 0) predict();
    };
    st.draw = function () {
      clear(st); var c = st.ctx, S = Math.min(st.W, st.H) / 2.2, P = function (q) { return [st.W / 2 + q[0] * S, st.H / 2 + q[1] * S]; };
      c.fillStyle = BLUE; c.beginPath(); c.arc(st.W / 2, st.H / 2, px(st, 14), 0, 7); c.fill();
      c.setLineDash([px(st, 4), px(st, 5)]); c.strokeStyle = 'rgba(255,209,102,.6)'; c.lineWidth = px(st, 1.4); c.beginPath(); pred.forEach(function (q, i) { var p = P(q); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.stroke(); c.setLineDash([]);
      for (var i = 1; i < trail.length; i++) { var a = P(trail[i - 1]), b = P(trail[i]); c.strokeStyle = 'rgba(255,106,85,' + (i / trail.length * 0.8).toFixed(3) + ')'; c.lineWidth = px(st, 2); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
      var e = P(s); c.fillStyle = ROPE; c.beginPath(); c.arc(e[0], e[1], px(st, 6), 0, 7); c.fill();
      var E = En(s), r = Math.hypot(s[0], s[1]), ecc = E < 0 ? Math.sqrt(Math.max(0, 1 + 2 * E * Math.pow(s[0] * s[3] - s[1] * s[2], 2))) : 1;
      text(st, 'energy ' + E.toFixed(2) + (E < 0 ? ',  eccentricity ' + ecc.toFixed(2) : ',  unbound'), px(st, 12), px(st, 22), FOAM, 'left', 12);
      read(E >= 0 ? 'Total energy above zero: the satellite is escaping, and will be relaunched.' : ecc < 0.05 ? 'A near-circular orbit.' : 'An ellipse with eccentricity ' + ecc.toFixed(2) + ', the planet at one focus. Scroll to add or remove energy.');
    };
  });
  /* PHYS 2340: induction */
  def('PHYS2340', { gauge: 'Magnet', aria: 'A bar magnet moving through a coil; the induced voltage trace only moves while the magnet moves.',
    note: 'Faraday&rsquo;s law: the voltage around the coil is the rate the magnetic flux through it changes, \\(\\mathcal E = -\\,d\\Phi_B/dt\\). Scrolling pushes the magnet through the coil. Hold still and nothing happens however strong the field; move faster and the pulse grows; the sign flips as the magnet leaves (Lenz&rsquo;s law: the induced current always opposes the change).'
  }, function (st, g, read) {
    var xm = -2.6, tgt = -2.6, buf = new Float32Array(260), bi = 0, emf = 0;
    function Phi(x) { return 1 / Math.pow(1 + x * x, 1.5); }
    function dPhi(x) { return -3 * x / Math.pow(1 + x * x, 2.5); }
    onScroll(function () { var p = progress(st.cv); tgt = -2.6 + 5.2 * p; g(p, tgt < -0.3 ? 'coming in' : tgt > 0.3 ? 'going out' : 'inside'); });
    st.frame = function (dt) {
      var nx = xm + (tgt - xm) * Math.min(1, dt * 6), v = dt ? (nx - xm) / dt : 0; xm = nx; emf = -dPhi(xm) * v;
      buf[bi++ % buf.length] = emf;
    };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, ay = H * 0.33, S = W / 7, cx = W / 2;
      // coil
      c.strokeStyle = 'rgba(255,209,102,.8)'; c.lineWidth = px(st, 2);
      for (var i = -4; i <= 4; i++) { c.beginPath(); c.ellipse(cx + i * px(st, 8), ay, px(st, 10), H * 0.16, 0, 0, 7); c.stroke(); }
      // magnet
      var mx = cx + xm * S, mw = S * 1.1, mh = H * 0.08;
      c.fillStyle = ROPE; c.fillRect(mx, ay - mh / 2, mw / 2, mh); c.fillStyle = BLUE; c.fillRect(mx - mw / 2, ay - mh / 2, mw / 2, mh);
      text(st, 'N', mx + mw / 4, ay + px(st, 4), DEEP, 'center', 12); text(st, 'S', mx - mw / 4, ay + px(st, 4), DEEP, 'center', 12);
      // trace
      var b = H - px(st, 30), top = H * 0.62, mid = (b + top) / 2, n = buf.length;
      axes(st, px(st, 40), mid, W - px(st, 10), mid);
      c.strokeStyle = GOLD; c.lineWidth = px(st, 2); c.beginPath();
      for (i = 0; i < n; i++) { var v = buf[(bi + i) % n], x = px(st, 40) + i / n * (W - px(st, 50)), y = mid - Math.max(-1, Math.min(1, v / 3)) * (b - top) / 2; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      text(st, 'induced voltage', px(st, 40), top - px(st, 6), GOLD); text(st, 'time →', W - px(st, 10), mid + px(st, 16), MIST, 'right');
      read(Math.abs(emf) > 0.05 ? 'The flux through the coil is ' + (emf * xm < 0 ? 'rising' : 'falling') + ', so a voltage is induced.' : 'The magnet is still, so the flux is steady and there is no voltage, even with the magnet inside the coil. Scroll to move it.');
    };
  });

  /* PHYS 4240: fermions and bosons */
  def('PHYS4240', { gauge: 'Temperature', aria: 'Ten fermions and ten bosons on the same ladder of energy levels, with the Fermi-Dirac, Bose-Einstein and Boltzmann occupation curves at the same temperature.',
    note: 'Quantum statistics: identical fermions obey Pauli exclusion, so each state holds at most one and they fill a ladder from the bottom (Fermi&ndash;Dirac, \\(\\bar n = 1/(e^{(\\epsilon-\\mu)/kT}+1)\\)). Bosons can share, \\(\\bar n = 1/(e^{(\\epsilon-\\mu)/kT}-1)\\), and once cold enough they crowd into the single lowest state: Bose&ndash;Einstein condensation. The curves on the right are the same distributions with the chemical potential \\(\\mu\\) solved so each holds ten particles; hot enough, both approach the classical Boltzmann curve.'
  }, function (st, g, read) {
    var L = 14, N = 10, kT = 1, nf = [], nb = [], mf = 0, mb = 0;
    function solve(sign) {
      var lo = sign > 0 ? -60 : -400, hi = sign > 0 ? 60 : -1e-9;
      for (var it = 0; it < 80; it++) { var mu = (lo + hi) / 2, s = 0; for (var i = 0; i < L; i++) s += 1 / (Math.exp((i - mu) / kT) + sign); if (s > N) hi = mu; else lo = mu; }
      var m = (lo + hi) / 2, out = []; for (i = 0; i < L; i++) out.push(1 / (Math.exp((i - m) / kT) + sign)); return [out, m];
    }
    onScroll(function () { var p = progress(st.cv); kT = 0.08 * Math.pow(60, p); g(p, 'kT = ' + kT.toFixed(2) + ' level gaps'); var a = solve(1), b = solve(-1); nf = a[0]; mf = a[1]; nb = b[0]; mb = b[1]; st.redraw(); });
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, wide = W > px(st, 700), top = px(st, 46), bot = H - px(st, 26), dy = (bot - top) / (L - 1), r = Math.max(px(st, 2.5), Math.min(px(st, 7), dy * 0.36));
      var lw = wide ? W * 0.27 : W * 0.46;
      [[nf, 'Fermions', BLUE, 0], [nb, 'Bosons', GOLD, 1]].forEach(function (s) {
        var x0 = px(st, 10) + s[3] * (lw + px(st, 20)), x1 = x0 + lw;
        text(st, s[1], x0, px(st, 22), s[2], 'left', 12);
        for (var i = 0; i < L; i++) {
          var y = bot - i * dy; c.strokeStyle = 'rgba(143,177,189,.35)'; c.lineWidth = px(st, 1); c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
          var n = s[0][i] || 0, whole = Math.floor(n + 1e-9), frac = n - whole, maxd = Math.floor((lw - r * 2) / (r * 2.6));
          for (var k = 0; k <= whole && k < maxd; k++) { var al = k < whole ? 1 : frac; if (al < 0.03) continue;
            c.fillStyle = s[2]; c.globalAlpha = al; c.beginPath(); c.arc(x0 + r * 2 + k * r * 2.6, y - r - px(st, 1), r, 0, 7); c.fill(); c.globalAlpha = 1; }
        }
      });
      if (!wide) { read('At kT = ' + kT.toFixed(2) + ': the ground state holds ' + (nb[0] || 0).toFixed(1) + ' of 10 bosons and at most one fermion. Scroll to heat it.'); return; }
      // occupation curves
      var gx = 2 * lw + px(st, 70), gw = W - gx - px(st, 12), b = bot, gt = top, ym = 3;
      axes(st, gx, b, gx + gw, b); axes(st, gx, b, gx, gt);
      var X = function (e) { return gx + e / (L - 1) * gw; }, Y = function (n) { return b - Math.min(ym, n) / ym * (b - gt); };
      [[function (e) { return 1 / (Math.exp((e - mf) / kT) + 1); }, BLUE, 'Fermi–Dirac'], [function (e) { return 1 / (Math.exp((e - mb) / kT) - 1); }, GOLD, 'Bose–Einstein'],
        [function (e) { var z = 0; for (var i = 0; i < L; i++) z += Math.exp(-i / kT); return N * Math.exp(-e / kT) / z; }, MIST, 'Boltzmann']].forEach(function (f, j) {
        c.strokeStyle = f[1]; c.lineWidth = px(st, 2); c.beginPath(); var first = true;
        for (var i = 0; i <= 300; i++) { var e = i / 300 * (L - 1), n = f[0](e); if (!isFinite(n)) continue; if (first) { c.moveTo(X(e), Y(n)); first = false; } else c.lineTo(X(e), Y(n)); } c.stroke();
        text(st, f[2], gx + gw, gt + px(st, 4 + 16 * j), f[1], 'right');
      });
      for (var i = 0; i < L; i++) { c.fillStyle = BLUE; c.beginPath(); c.arc(X(i), Y(nf[i]), px(st, 3.5), 0, 7); c.fill(); c.fillStyle = GOLD; c.beginPath(); c.arc(X(i), Y(nb[i]), px(st, 3.5), 0, 7); c.fill(); }
      c.setLineDash([px(st, 3), px(st, 4)]); c.strokeStyle = 'rgba(234,246,248,.3)'; c.lineWidth = px(st, 1); c.beginPath(); c.moveTo(gx, Y(1)); c.lineTo(gx + gw, Y(1)); c.stroke(); c.setLineDash([]);
      text(st, 'n̄ per state (cut at 3)', gx + px(st, 6), gt - px(st, 12), MIST); text(st, 'energy (level number) →', gx + gw, b + px(st, 16), MIST, 'right');
      read('At kT = ' + kT.toFixed(2) + ' level spacings the ground state holds ' + (nb[0] || 0).toFixed(1) + ' of the 10 bosons but at most one fermion; the fermions fill up to level ' + nf.filter(function (v) { return v > 0.5; }).length + '. Scroll to heat it.');
    };
  });
  /* PHYS 3130: spherical harmonics and drum modes */
  def('PHYS3130', { gauge: 'Mode', controls: '<button class="chip" type="button" data-sh="sph" aria-pressed="true">Spherical harmonics</button><button class="chip" type="button" data-sh="drum" aria-pressed="false">Circular drum (Bessel)</button>',
    aria: 'Rotating 3D plots of spherical harmonics, or of the vibration modes of a circular drum built from Bessel functions.',
    note: 'Separating Laplace&rsquo;s equation in spherical coordinates gives the spherical harmonics \\(Y_\\ell^m(\\theta,\\phi) \\propto P_\\ell^m(\\cos\\theta)\\,e^{im\\phi}\\), the angular shapes behind atomic orbitals, multipole fields and gravity maps (drawn here as surfaces whose distance from the centre is \\(|Y_\\ell^m|\\), blue where positive and red where negative). In cylindrical coordinates the radial part becomes Bessel&rsquo;s equation, and a drum skin clamped at its rim vibrates in modes \\(J_m(j_{mn} r/a)\\cos(m\\theta)\\), where \\(j_{mn}\\) is the \\(n\\)th zero of \\(J_m\\); unlike a string, the overtones are not whole multiples of the fundamental.'
  }, function (st, g, read) {
    var mode = 'sph', idx = 0, rot = 0, t = 0;
    var SPH = [[0, 0], [1, 0], [1, 1], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2], [3, 3], [4, 0], [4, 2], [4, 3], [4, 4], [5, 3], [6, 4]];
    var DRUM = [[0, 1, 2.4048], [1, 1, 3.8317], [2, 1, 5.1356], [0, 2, 5.5201], [3, 1, 6.3802], [1, 2, 7.0156], [4, 1, 7.5883], [2, 2, 8.4172], [0, 3, 8.6537], [3, 2, 9.7610], [1, 3, 10.1735]];
    function plm(l, m, x) { var pmm = 1, s = Math.sqrt(Math.max(0, 1 - x * x)), f = 1; for (var i = 1; i <= m; i++) { pmm *= -f * s; f += 2; } if (l === m) return pmm;
      var p1 = x * (2 * m + 1) * pmm; if (l === m + 1) return p1; var p2; for (var ll = m + 2; ll <= l; ll++) { p2 = (x * (2 * ll - 1) * p1 - (ll + m - 1) * pmm) / (ll - m); pmm = p1; p1 = p2; } return p1; }
    function J(m, x) { var s = 0, term; for (var k = 0; k < 30; k++) { term = Math.pow(-1, k) * Math.pow(x / 2, 2 * k + m) / (fact(k) * fact(k + m)); s += term; if (Math.abs(term) < 1e-12 && k > m) break; } return s; }
    function fact(n) { var f = 1; for (var i = 2; i <= n; i++) f *= i; return f; }
    var list = function () { return mode === 'sph' ? SPH : DRUM; };
    E.chips('[data-sh]', 'sh', function (k) { mode = k; kick(); });
    function kick() { var p = progress(st.cv), L = list(); idx = Math.min(L.length - 1, Math.floor(p * L.length)); var m = L[idx];
      g(p, mode === 'sph' ? 'ℓ = ' + m[0] + ', m = ' + m[1] : 'm = ' + m[0] + ', n = ' + m[1]); }
    onScroll(kick);
    st.frame = function (dt) { rot += dt * 0.35; t += dt; };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, G = [], view = { rot: rot, el: 0.42, cx: W / 2, cy: H / 2, s: Math.min(W, H) * 0.4 };
      if (mode === 'sph') {
        var l = SPH[idx][0], m = SPH[idx][1], NT = 36, NP = 64, mx = 1e-9, raw = [];
        for (var i = 0; i <= NT; i++) { raw.push([]); for (var j = 0; j <= NP; j++) { var th = i / NT * Math.PI, ph = j / NP * 2 * Math.PI, v = plm(l, m, Math.cos(th)) * Math.cos(m * ph); raw[i].push(v); mx = Math.max(mx, Math.abs(v)); } }
        for (i = 0; i <= NT; i++) { G.push([]); for (j = 0; j <= NP; j++) { th = i / NT * Math.PI; ph = j / NP * 2 * Math.PI; var r = Math.abs(raw[i][j]) / mx;
          G[i].push([r * Math.sin(th) * Math.cos(ph), r * Math.sin(th) * Math.sin(ph), r * Math.cos(th), raw[i][j] / mx]); } }
        view.s *= 1.15;
        E.mesh(st, G, view, function (v, sh) { return E.rgb(v >= 0 ? [124, 196, 255] : [255, 106, 85], sh); });
        text(st, 'Y' + '(ℓ=' + l + ', m=' + m + ')', px(st, 12), px(st, 22), FOAM, 'left', 12);
        read('The ℓ = ' + l + ', m = ' + m + ' spherical harmonic: ' + (l - m) + ' nodal circle' + (l - m === 1 ? '' : 's') + ' of latitude and ' + m + ' nodal great circle' + (m === 1 ? '' : 's') + ' through the poles. Scroll for higher ℓ.');
      } else {
        var d = DRUM[idx], NR = 18, NA = 56, osc = Math.cos(t * 2.4 * d[2] / 2.4048);
        for (i = 0; i <= NR; i++) { G.push([]); for (j = 0; j <= NA; j++) { var rr = i / NR, a = j / NA * 2 * Math.PI, z = J(d[0], d[2] * rr) * Math.cos(d[0] * a);
          G[i].push([rr * Math.cos(a), rr * Math.sin(a), 0.45 * z * osc, z * osc]); } }
        view.el = 0.62; view.cy = H * 0.55; view.s = Math.min(W * 0.42, H * 0.62);
        E.mesh(st, G, view, function (v, sh) { var k = Math.min(1, Math.abs(v) * 2.2); return E.rgb(v >= 0 ? [40 + 84 * k, 80 + 116 * k, 110 + 145 * k] : [60 + 195 * k, 60 + 46 * k, 70 + 15 * k], sh); });
        text(st, 'J' + d[0] + ' mode, zero ' + d[1] + ':  frequency ' + (d[2] / 2.4048).toFixed(3) + '× fundamental', px(st, 12), px(st, 22), FOAM, 'left', 12);
        read('Drum mode m = ' + d[0] + ', n = ' + d[1] + ': ' + d[0] + ' nodal diameter' + (d[0] === 1 ? '' : 's') + ' and ' + (d[1] - 1) + ' nodal circle' + (d[1] === 2 ? '' : 's') + ' inside the rim, ringing at ' + (d[2] / 2.4048).toFixed(3) + '× the fundamental. Scroll for more modes.');
      }
    };
  });
  /* PHYS 4040: identical particles and exchange */
  def('PHYS4040', { gauge: 'States', aria: 'Joint probability density of two particles in a harmonic trap, for distinguishable particles, bosons and fermions; fermions vanish on the diagonal.',
    note: 'Two particles in the same harmonic trap, each in a superposition so the density sloshes. Each square is the joint probability \\(|\\psi(x_1,x_2)|^2\\): the diagonal is where the two are at the same place. Identical particles must have a wave function symmetric (bosons) or antisymmetric (fermions) under swapping them, \\(\\psi_\\pm = [u(x_1)v(x_2) \\pm v(x_1)u(x_2)]/\\sqrt2\\). With no force between them, bosons still bunch onto the diagonal and fermions are exactly zero there: the Pauli exclusion principle, and the &ldquo;exchange force&rdquo; behind chemical bonds, magnetism and the stability of matter.'
  }, function (st, g, read) {
    var PAIRS = [[0, 1], [0, 2], [1, 2], [0, 3], [1, 3], [2, 3]], pi = 0, t = 0, n = 64, X = 4.2, phi = [], offs = [], probs = [0, 0, 0];
    for (var k = 0; k < 5; k++) { phi.push(new Float64Array(n)); }
    var H = [function () { return 1; }, function (x) { return 2 * x; }, function (x) { return 4 * x * x - 2; }, function (x) { return 8 * x * x * x - 12 * x; }, function (x) { return 16 * Math.pow(x, 4) - 48 * x * x + 12; }];
    for (k = 0; k < 5; k++) { var nrm = 1 / Math.sqrt(Math.pow(2, k) * [1, 1, 2, 6, 24][k] * Math.sqrt(Math.PI)); for (var i = 0; i < n; i++) { var x = -X + 2 * X * i / (n - 1); phi[k][i] = nrm * H[k](x) * Math.exp(-x * x / 2); } }
    for (k = 0; k < 3; k++) { var cv = document.createElement('canvas'); cv.width = n; cv.height = n; offs.push(cv); }
    onScroll(function () { var p = progress(st.cv); pi = Math.min(PAIRS.length - 1, Math.floor(p * PAIRS.length)); g(p, 'n = ' + PAIRS[pi][0] + ' & ' + PAIRS[pi][1]); });
    st.frame = function (dt) { t += dt * 1.2; };
    st.draw = function () {
      var a = PAIRS[pi][0], b = PAIRS[pi][1], ur = [], ui = [], vr = [], vi = [];
      for (var i = 0; i < n; i++) { // u = (phi_a + e^{-it} phi_{a+1})/sqrt2, v likewise
        ur.push((phi[a][i] + Math.cos(t) * phi[a + 1][i]) / Math.SQRT2); ui.push(-Math.sin(t) * phi[a + 1][i] / Math.SQRT2);
        vr.push((phi[b][i] + Math.cos(t) * phi[b + 1][i]) / Math.SQRT2); vi.push(-Math.sin(t) * phi[b + 1][i] / Math.SQRT2); }
      var dx = 2 * X / (n - 1), mx = 0, D = [new Float64Array(n * n), new Float64Array(n * n), new Float64Array(n * n)], close = [0, 0, 0], tot = [0, 0, 0];
      for (var p = 0; p < n; p++) for (var q = 0; q < n; q++) {
        var r1 = ur[p] * vr[q] - ui[p] * vi[q], i1 = ur[p] * vi[q] + ui[p] * vr[q], r2 = vr[p] * ur[q] - vi[p] * ui[q], i2 = vr[p] * ui[q] + vi[p] * ur[q];
        var dd = [r1 * r1 + i1 * i1, ((r1 + r2) * (r1 + r2) + (i1 + i2) * (i1 + i2)) / 2, ((r1 - r2) * (r1 - r2) + (i1 - i2) * (i1 - i2)) / 2];
        for (var k = 0; k < 3; k++) { D[k][p * n + q] = dd[k]; mx = Math.max(mx, dd[k]); tot[k] += dd[k]; if (Math.abs(p - q) * dx < 0.6) close[k] += dd[k]; }
      }
      clear(st); var c = st.ctx, W = st.W, Hh = st.H, sz = Math.min((W - px(st, 40)) / 3, Hh - px(st, 70)), gap = (W - 3 * sz) / 4;
      ['Distinguishable', 'Bosons (+)', 'Fermions (−)'].forEach(function (name, k) {
        var o = offs[k], oc = o.getContext('2d'), img = oc.createImageData(n, n);
        for (var i = 0; i < n * n; i++) { var v = Math.sqrt(D[k][i] / mx), pI = (n - 1 - Math.floor(i / n)) * n + (i % n);
          img.data[pI * 4] = 7 + v * 225; img.data[pI * 4 + 1] = 34 + v * 175; img.data[pI * 4 + 2] = 46 + v * 209; img.data[pI * 4 + 3] = 255; }
        oc.putImageData(img, 0, 0);
        var x0 = gap + k * (sz + gap), y0 = px(st, 34); c.imageSmoothingEnabled = true; c.drawImage(o, x0, y0, sz, sz);
        c.setLineDash([px(st, 3), px(st, 4)]); c.strokeStyle = 'rgba(255,106,85,.6)'; c.lineWidth = px(st, 1); c.beginPath(); c.moveTo(x0, y0 + sz); c.lineTo(x0 + sz, y0); c.stroke(); c.setLineDash([]);
        var tight = sz < px(st, 130);
        text(st, name, x0, px(st, 22), [FOAM, GOLD, BLUE][k], 'left', tight ? 10 : 12);
        probs[k] = close[k] / tot[k];
        text(st, (tight ? 'close: ' : 'close together: ') + Math.round(probs[k] * 100) + '%', x0, y0 + sz + px(st, 18), MIST);
      });
      text(st, 'x₁ →', gap + sz, px(st, 34) + sz + px(st, 34), MIST, 'right');
      read('Particles in levels ' + a + ' and ' + b + ' (each mixed with the next level up). Chance of being within 0.6 of each other: ' + Math.round(probs[0] * 100) + '% if distinguishable, ' + Math.round(probs[1] * 100) + '% as bosons, ' + Math.round(probs[2] * 100) + '% as fermions. Scroll for other levels.');
    };
  });
  /* PHYS 3400: chaos in the double pendulum */
  def('PHYS3400', { gauge: 'Starting angle', aria: 'Two double pendulums released a thousandth of a radian apart; at large angles their paths diverge completely.',
    note: 'Two pendulums released a thousandth of a radian apart, integrated from Lagrange&rsquo;s equations with fourth-order Runge&ndash;Kutta. Started low, the motion is regular and they stay together. Started high, the system is chaotic: the tiny difference grows exponentially until the two have nothing in common, even though every step is perfectly deterministic.'
  }, function (st, g, read) {
    var a0 = 2, A = [], B = [], trA = [], trB = [], t = 0;
    function reset() { A = [a0, a0, 0, 0]; B = [a0 + 0.001, a0, 0, 0]; trA = []; trB = []; t = 0; }
    function f(s) {
      var t1 = s[0], t2 = s[1], w1 = s[2], w2 = s[3], d = t1 - t2, G = 9.81, den = 3 - Math.cos(2 * d);
      return [w1, w2,
        (-G * 3 * Math.sin(t1) - G * Math.sin(t1 - 2 * t2) - 2 * Math.sin(d) * (w2 * w2 + w1 * w1 * Math.cos(d))) / den,
        (2 * Math.sin(d) * (w1 * w1 * 2 + G * 2 * Math.cos(t1) + w2 * w2 * Math.cos(d))) / den];
    }
    function rk(s, h) { var k1 = f(s), k2 = f(s.map(function (v, i) { return v + h / 2 * k1[i]; })), k3 = f(s.map(function (v, i) { return v + h / 2 * k2[i]; })), k4 = f(s.map(function (v, i) { return v + h * k3[i]; }));
      return s.map(function (v, i) { return v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]); }); }
    onScroll(function () { var p = progress(st.cv), na = Math.round((0.3 + 2.6 * p) * 20) / 20; g(p, (na * 180 / Math.PI).toFixed(0) + '°'); if (na !== a0) { a0 = na; reset(); } });
    st.frame = function (dt) { var n = Math.round(Math.min(dt, 0.04) / 0.002); for (var i = 0; i < n; i++) { A = rk(A, 0.002); B = rk(B, 0.002); } t += n * 0.002; if (t > 30) reset(); };
    function tip(s, ox, oy, L) { return [[ox + L * Math.sin(s[0]), oy + L * Math.cos(s[0])], [ox + L * (Math.sin(s[0]) + Math.sin(s[1])), oy + L * (Math.cos(s[0]) + Math.cos(s[1]))]]; }
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, L = Math.min(H, W) * 0.22, ox = W / 2, oy = H * 0.5;
      [[A, trA, BLUE], [B, trB, ROPE]].forEach(function (s) {
        var p = tip(s[0], ox, oy, L); s[1].push(p[1]); if (s[1].length > 240) s[1].shift();
        c.strokeStyle = s[2]; c.globalAlpha = 0.35; c.lineWidth = px(st, 1.2); c.beginPath(); s[1].forEach(function (q, i) { i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke(); c.globalAlpha = 1;
        c.lineWidth = px(st, 2.5); c.beginPath(); c.moveTo(ox, oy); c.lineTo(p[0][0], p[0][1]); c.lineTo(p[1][0], p[1][1]); c.stroke();
        c.fillStyle = s[2]; c.beginPath(); c.arc(p[0][0], p[0][1], px(st, 6), 0, 7); c.arc(p[1][0], p[1][1], px(st, 6), 0, 7); c.fill();
      });
      var sep = Math.hypot(A[0] - B[0], A[1] - B[1]);
      text(st, 'difference: ' + sep.toExponential(1) + ' rad', px(st, 12), px(st, 22), FOAM, 'left', 12);
      read('Released from ' + (a0 * 180 / Math.PI).toFixed(0) + '°, ' + t.toFixed(0) + ' s in, the two are ' + (sep < 0.01 ? 'still moving together.' : sep < 0.5 ? 'starting to come apart.' : 'completely different.') + ' Scroll to change the starting angle.');
    };
    reset();
  });

  /* NANO 3600: Ising model */
  def('NANO3600', { gauge: 'Temperature', aria: 'A grid of magnetic spins under Metropolis Monte Carlo cooling from disorder into large ordered domains as you scroll.',
    note: 'The Ising model, which I wrote a Monte Carlo code for in this course: each site is a spin, up or down, that wants to match its neighbours. The Metropolis algorithm flips spins at random, always accepting flips that lower the energy and accepting the rest with probability \\(e^{-\\Delta E/kT}\\). Scrolling cools it: above the critical temperature \\(T_c = 2/\\ln(1+\\sqrt2) \\approx 2.27\\) the spins are disordered; below it, domains form, grow and merge, and the magnet magnetises.'
  }, function (st, g, read) {
    var NX = 72, NY = 44, S = new Int8Array(NX * NY), T = 3.5, R = rng(3), off = document.createElement('canvas'), oc, img, mag = 0, acc = 0;
    off.width = NX; off.height = NY; oc = off.getContext('2d'); img = oc.createImageData(NX, NY);
    for (var i = 0; i < S.length; i++) S[i] = R() < 0.5 ? 1 : -1;
    onScroll(function () { var p = progress(st.cv, 0.95, 0.35); T = 3.6 - 2.5 * p; g(p, 'T = ' + T.toFixed(2) + (Math.abs(T - 2.27) < 0.08 ? ' (critical)' : '')); });
    st.frame = function (dt) {
      acc += dt; if (acc < 1 / 15) return; acc = 0;   // a steady 15 updates a second, not a flicker
      var e4 = Math.exp(-4 / T), e8 = Math.exp(-8 / T), n = NX * NY * (T < 2.27 ? 3 : 1);
      for (var k = 0; k < n; k++) {
        var i = (R() * NX) | 0, j = (R() * NY) | 0, s = S[j * NX + i];
        var nb = S[j * NX + (i + 1) % NX] + S[j * NX + (i + NX - 1) % NX] + S[((j + 1) % NY) * NX + i] + S[((j + NY - 1) % NY) * NX + i], dE = 2 * s * nb;
        if (dE <= 0 || (dE === 4 ? R() < e4 : R() < e8)) S[j * NX + i] = -s;
      }
    };
    st.draw = function () {
      var m = 0; for (var i = 0; i < S.length; i++) { m += S[i]; var up = S[i] > 0; img.data[i * 4] = up ? 124 : 13; img.data[i * 4 + 1] = up ? 196 : 52; img.data[i * 4 + 2] = up ? 255 : 71; img.data[i * 4 + 3] = 255; }
      mag = Math.abs(m) / S.length; oc.putImageData(img, 0, 0);
      clear(st); var c = st.ctx; c.imageSmoothingEnabled = false;
      var sc = Math.min(st.W / NX, st.H / NY), w = NX * sc, h = NY * sc; c.drawImage(off, (st.W - w) / 2, (st.H - h) / 2, w, h);
      read('T = ' + T.toFixed(2) + ' (critical ≈ 2.27): ' + (T < 2.1 ? 'cold, so domains grow and merge.' : T < 2.45 ? 'near the critical point, with domains of every size.' : 'hot, so thermal noise wins.') + ' Net magnetisation ' + Math.round(mag * 100) + '%. Scroll to cool it.');
    };
  });
  /* PHYS 3000: multi-slit interference */
  def('PHYS3000', { gauge: 'Slits', hint: 'Move your pointer up and down to change the wavelength', aria: 'Light waves passing through a set of slits and interfering, with the brightness pattern on a screen; more slits sharpen the bright fringes.',
    note: 'Huygens: every slit acts as a new source, and where crests from different slits meet they add, where a crest meets a trough they cancel. Bright fringes sit where the path difference is a whole number of wavelengths, \\(d\\sin\\theta = m\\lambda\\). Two slits give soft cosine fringes; with \\(N\\) slits the principal maxima stay put but narrow as \\(1/N\\), with \\(N-2\\) faint ones in between, which is how a diffraction grating spreads light into a sharp spectrum. Longer (redder) wavelengths spread the fringes further apart.'
  }, function (st, g, read) {
    var N = 2, lam = 550, lt = null, t = 0, off = document.createElement('canvas'), oc = off.getContext('2d'), img = null;
    function wl(l) { var r = 0, gg = 0, b = 0; if (l < 440) { r = (440 - l) / 60; b = 1; } else if (l < 490) { gg = (l - 440) / 50; b = 1; } else if (l < 510) { gg = 1; b = (510 - l) / 20; } else if (l < 580) { r = (l - 510) / 70; gg = 1; } else if (l < 645) { r = 1; gg = (645 - l) / 65; } else r = 1; return [r, gg, b]; }
    onScroll(function () { var p = progress(st.cv); N = 1 + Math.min(7, Math.floor(p * 8)); g(p, N + (N > 1 ? ' slits' : ' slit')); });
    hover(st, function (p) { lt = p ? 400 + 300 * Math.max(0, Math.min(1, p[1] / st.H)) : null; });
    st.frame = function (dt) { t += dt * 6; lam += ((lt || 550) - lam) * Math.min(1, dt * 5); };
    st.draw = function () {
      var W = st.W, H = st.H, cell = Math.max(2, Math.round(px(st, 3))), cw = Math.ceil(W / cell), ch = Math.ceil(H / cell);
      if (off.width !== cw || off.height !== ch) { off.width = cw; off.height = ch; img = oc.createImageData(cw, ch); }
      var col = wl(lam), lpx = (12 + (lam - 400) / 300 * 12) * st.d / cell, k = 2 * Math.PI / lpx, xb = Math.round(cw * 0.2), dsl = 4.2 * 18 * st.d / cell, src = [];
      for (var s = 0; s < N; s++) { var yc = ch / 2 + (s - (N - 1) / 2) * dsl; src.push(yc - 0.6, yc + 0.6); }
      var screen = new Float32Array(ch), sm = 0;
      for (var y = 0; y < ch; y++) {
        var re = 0, im = 0, xs = cw - 1;
        for (s = 0; s < src.length; s++) { var r = Math.hypot(xs - xb, y - src[s]); re += Math.cos(k * r) / Math.sqrt(r); im += Math.sin(k * r) / Math.sqrt(r); }
        screen[y] = re * re + im * im; sm = Math.max(sm, screen[y]);
        for (var x = 0; x < cw; x++) {
          var v, i4 = (y * cw + x) * 4;
          if (x < xb) v = Math.cos(k * (x - xb) - t);
          else if (x === xb) { var open = false; for (s = 0; s < src.length; s++) if (Math.abs(y - src[s]) < 1.2) open = true; v = open ? 0 : -9; }
          else { var a = 0; for (s = 0; s < src.length; s++) { r = Math.hypot(x - xb, y - src[s]); a += Math.cos(k * r - t) / Math.sqrt(r + 1); } v = a * 2.2 / Math.sqrt(src.length); }
          if (v === -9) { img.data[i4] = 143; img.data[i4 + 1] = 177; img.data[i4 + 2] = 189; img.data[i4 + 3] = 255; continue; }
          var bri = Math.max(0, Math.min(1, 0.5 + 0.5 * v)) * (x < xb ? 0.6 : 1);
          img.data[i4] = 7 + col[0] * 220 * bri; img.data[i4 + 1] = 34 + col[1] * 200 * bri; img.data[i4 + 2] = 46 + col[2] * 200 * bri; img.data[i4 + 3] = 255;
        }
      }
      oc.putImageData(img, 0, 0); clear(st); var c = st.ctx; c.imageSmoothingEnabled = true; c.drawImage(off, 0, 0, cw * cell, ch * cell);
      // intensity on the screen, drawn at the right edge
      var sw = px(st, 70); c.fillStyle = 'rgba(7,34,46,.85)'; c.fillRect(W - sw, 0, sw, H);
      c.strokeStyle = 'rgb(' + [col[0] * 255, col[1] * 255, col[2] * 255].map(Math.round).join(',') + ')'; c.lineWidth = px(st, 2); c.beginPath();
      for (y = 0; y < ch; y++) { var xx = W - sw + px(st, 4) + screen[y] / sm * (sw - px(st, 8)); y ? c.lineTo(xx, y * cell) : c.moveTo(xx, y * cell); } c.stroke();
      text(st, 'screen', W - sw / 2, H - px(st, 10), MIST, 'center');
      text(st, Math.round(lam) + ' nm', px(st, 12), px(st, 22), FOAM, 'left', 12);
      read(N === 1 ? 'One slit: a single broad diffraction spread. Scroll for more slits.' : N + ' slits at ' + Math.round(lam) + ' nm: the bright fringes sit where d sin θ = mλ' + (N > 2 ? ', with ' + (N - 2) + ' faint maxima between each pair.' : '.') + ' Move your pointer to change colour.');
    };
  });
  /* PHYS 3510: transmission lines on the Smith chart */
  def('PHYS3510', { gauge: 'Line length', hint: 'Point inside the chart to choose the load', aria: 'A Smith chart showing the load reflection coefficient, which rotates toward the source as the line gets longer, beside the standing wave on the line.',
    note: 'From my transmission-lines poster in this lab. A mismatched load reflects part of every wave, \\(\\Gamma_L = (Z_L - Z_0)/(Z_L + Z_0)\\), and the reflection beats against the incoming wave to make a standing-wave pattern whose peak-to-trough ratio is the VSWR, \\((1+|\\Gamma|)/(1-|\\Gamma|)\\). Seen from the source a length \\(\\ell\\) away, the reflection rotates by \\(4\\pi\\ell/\\lambda\\), so the impedance the source sees changes along the line, repeating every half wavelength. The Smith chart maps every possible impedance into a disc so that rotation is literally a circle.'
  }, function (st, g, read) {
    var GL = [0.45, 0.25], tgt = null, ell = 0.125, clock = 0;
    onScroll(function () { var p = progress(st.cv); ell = 0.5 * p; g(p, 'ℓ = ' + ell.toFixed(3) + ' λ'); });
    function geo() { var R = Math.min(st.H * 0.42, st.W * 0.23); return { cx: R + px(st, 24), cy: st.H / 2, R: R }; }
    hover(st, function (p) { if (!p) { tgt = null; return; } var gg = geo(), x = (p[0] - gg.cx) / gg.R, y = -(p[1] - gg.cy) / gg.R, m = Math.hypot(x, y); if (m > 1.15) return; if (m > 0.97) { x *= 0.97 / m; y *= 0.97 / m; } tgt = [x, y]; });
    st.frame = function (dt) { clock += dt; var aim = tgt || [0.5 * Math.cos(clock * 0.3), 0.35 * Math.sin(clock * 0.47)]; GL[0] += (aim[0] - GL[0]) * Math.min(1, dt * 6); GL[1] += (aim[1] - GL[1]) * Math.min(1, dt * 6); };
    function cdiv(a, b) { var d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }
    st.draw = function () {
      clear(st); var c = st.ctx, gg = geo(), W = st.W, H = st.H, S = function (z) { return [gg.cx + z[0] * gg.R, gg.cy - z[1] * gg.R]; };
      c.save(); c.beginPath(); c.arc(gg.cx, gg.cy, gg.R, 0, 7); c.clip();
      c.strokeStyle = 'rgba(143,177,189,.28)'; c.lineWidth = px(st, 1);
      [0, 0.2, 0.5, 1, 2, 5].forEach(function (r) { c.beginPath(); c.arc(gg.cx + gg.R * r / (1 + r), gg.cy, gg.R / (1 + r), 0, 7); c.stroke(); });
      [0.2, 0.5, 1, 2, 5].forEach(function (x) { [1, -1].forEach(function (sg) { c.beginPath(); c.arc(gg.cx + gg.R, gg.cy - sg * gg.R / x, gg.R / x, 0, 7); c.stroke(); }); });
      c.beginPath(); c.moveTo(gg.cx - gg.R, gg.cy); c.lineTo(gg.cx + gg.R, gg.cy); c.stroke(); c.restore();
      c.strokeStyle = MIST; c.lineWidth = px(st, 1.5); c.beginPath(); c.arc(gg.cx, gg.cy, gg.R, 0, 7); c.stroke();
      var m = Math.hypot(GL[0], GL[1]), a0 = Math.atan2(GL[1], GL[0]), rot = 4 * Math.PI * ell, Gin = [m * Math.cos(a0 - rot), m * Math.sin(a0 - rot)];
      c.setLineDash([px(st, 3), px(st, 4)]); c.strokeStyle = 'rgba(255,209,102,.5)'; c.beginPath(); c.arc(gg.cx, gg.cy, m * gg.R, 0, 7); c.stroke(); c.setLineDash([]);
      c.strokeStyle = GOLD; c.lineWidth = px(st, 2.5); c.beginPath(); c.arc(gg.cx, gg.cy, m * gg.R, -a0, -a0 + rot, false); c.stroke();
      var pL = S(GL), pI = S(Gin); c.fillStyle = ROPE; c.beginPath(); c.arc(pL[0], pL[1], px(st, 6), 0, 7); c.fill(); c.fillStyle = BLUE; c.beginPath(); c.arc(pI[0], pI[1], px(st, 6), 0, 7); c.fill();
      text(st, 'load', pL[0] + px(st, 9), pL[1] - px(st, 6), ROPE); text(st, 'seen from source', pI[0] + px(st, 9), pI[1] + px(st, 14), BLUE);
      var ZL = cdiv([1 + GL[0], GL[1]], [1 - GL[0], -GL[1]]), Zi = cdiv([1 + Gin[0], Gin[1]], [1 - Gin[0], -Gin[1]]), vswr = (1 + m) / (1 - m);
      // standing wave along the line
      var gx = gg.cx + gg.R + px(st, 50), gw = W - gx - px(st, 14), b = H - px(st, 34), mid = H * 0.52, A = (b - mid) * 0.45, n = 300;
      if (gw > px(st, 120)) {
        axes(st, gx, mid, gx + gw, mid);
        c.strokeStyle = 'rgba(124,196,255,.45)'; c.lineWidth = px(st, 1.2);
        [1, -1].forEach(function (sg) { c.beginPath(); for (var i = 0; i <= n; i++) { var z = (1 - i / n) * 0.75, ph = -4 * Math.PI * z, mag = Math.hypot(1 + m * Math.cos(a0 + ph), m * Math.sin(a0 + ph)), x = gx + i / n * gw, y = mid - sg * mag * A; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); });
        c.strokeStyle = BLUE; c.lineWidth = px(st, 2); c.beginPath();
        for (var i = 0; i <= n; i++) { var z = (1 - i / n) * 0.75, bz = 2 * Math.PI * z, re = Math.cos(bz + clock * 3) + m * Math.cos(-bz + clock * 3 + a0), x = gx + i / n * gw, y = mid - re * A; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
        c.fillStyle = ROPE; c.fillRect(gx + gw - px(st, 4), mid - px(st, 14), px(st, 8), px(st, 28));
        text(st, 'standing wave on the last ¾ λ, load at right', gx, px(st, 26), MIST);
        text(st, 'VSWR ' + (isFinite(vswr) ? vswr.toFixed(2) : '∞'), gx, px(st, 46), FOAM, 'left', 12);
      }
      var f = function (z) { return z[0].toFixed(2) + (z[1] >= 0 ? ' + ' : ' − ') + Math.abs(z[1]).toFixed(2) + 'j'; };
      read('Z_L = (' + f(ZL) + ') Z₀, |Γ| = ' + m.toFixed(2) + '. Through ' + ell.toFixed(3) + ' λ of line the source sees (' + f(Zi) + ') Z₀. Scroll to lengthen the line; point in the chart to change the load.');
    };
  });
  /* PHYS 4180: radiation: a shaken charge, a dipole antenna, a relativistic charge */
  def('PHYS4180', { gauge: 'Speed', controls: '<button class="chip" type="button" data-em="shake" aria-pressed="false">Shake a charge</button><button class="chip" type="button" data-em="dipole" aria-pressed="true">Dipole antenna</button><button class="chip" type="button" data-em="fast" aria-pressed="false">Near light speed</button>',
    aria: 'Electric field lines: kinks from a shaken charge, closed loops detaching from an oscillating dipole antenna, or the flattened field of a charge moving near the speed of light.',
    note: 'Three faces of the same physics, all from the retarded potentials. <b>Shake a charge</b>: the news of its acceleration travels out at \\(c\\), so field lines kink and the kink is radiation. <b>Dipole antenna</b>: an oscillating dipole&rsquo;s field lines are the contours of \\(\\sin^2\\theta\\,[\\cos(\\omega t - kr)/kr - \\sin(\\omega t - kr)]\\); near the antenna they snap back each half cycle, but beyond about a wavelength they pinch off into closed loops and leave for good, strongest broadside and zero along the axis (the \\(\\sin^2\\theta\\) pattern). <b>Near light speed</b>: a charge moving steadily doesn&rsquo;t radiate, but its field, \\(E \\propto (1-\\beta^2)/(1-\\beta^2\\sin^2\\theta)^{3/2}\\), is squeezed toward the plane perpendicular to its motion as \\(\\beta \\to 1\\): field lines bunch so that \\(\\tan\\theta\\prime = \\gamma\\tan\\theta\\).'
  }, function (st, g, read) {
    var mode = 'dipole', q = [0.5, 0.5], tgt = null, hist = [], clock = 0, c0 = 0.28, beta = 0.5, xq = 0.2, lab = document.querySelector('#g-PHYS4180 .k');
    function kick() { var p = progress(st.cv); if (mode === 'fast') { beta = 0.97 * p; lab.textContent = 'Speed'; g(p, 'v = ' + beta.toFixed(2) + ' c'); } else if (mode === 'dipole') { lab.textContent = 'Frequency'; st.k = 0.6 + 1.6 * p; g(p, (st.k / 0.6).toFixed(1) + '×'); } else { lab.textContent = '—'; g(0, ''); } }
    st.k = 1;
    E.chips('[data-em]', 'em', function (k) { mode = k; hist = []; kick(); });
    onScroll(kick);
    hover(st, function (p) { tgt = p ? [p[0] / st.W, p[1] / st.H] : null; });
    st.frame = function (dt) {
      clock += dt;
      if (mode === 'shake') {
        var aim = tgt || [0.5 + 0.12 * Math.sign(Math.sin(clock * 1.3)) * Math.min(1, Math.abs(Math.sin(clock * 1.3)) * 3), 0.5];
        var asp = st.W / Math.max(1, st.H), dx = aim[0] - q[0], dy = (aim[1] - q[1]) / asp, d = Math.hypot(dx, dy), step = Math.min(d, 0.6 * c0 * dt, d * Math.min(1, dt * 5));
        if (d) { q[0] += dx / d * step; q[1] += dy / d * step * asp; }
        hist.push([clock, q[0], q[1]]); while (hist.length > 2 && hist[1][0] < clock - 5) hist.shift();
      }
      if (mode === 'fast') { xq += dt * 0.12 * Math.max(0.15, beta); if (xq > 1.15) xq = -0.15; }
    };
    function at(tr) { if (!hist.length) return q; if (tr <= hist[0][0]) return [hist[0][1], hist[0][2]];
      for (var i = hist.length - 1; i > 0; i--) if (hist[i - 1][0] <= tr) { var a = hist[i - 1], b = hist[i], f = (tr - a[0]) / Math.max(1e-6, b[0] - a[0]); return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
      return [hist[0][1], hist[0][2]]; }
    function contours(F, nx, ny, cell, levels, c) {   // marching squares on a grid of values
      for (var j = 0; j < ny - 1; j++) for (var i = 0; i < nx - 1; i++) {
        var a = F[j * nx + i], b = F[j * nx + i + 1], d = F[(j + 1) * nx + i], e = F[(j + 1) * nx + i + 1]; if (isNaN(a + b + d + e)) continue;
        for (var L = 0; L < levels.length; L++) { var v = levels[L], pts = [];
          if ((a > v) !== (b > v)) pts.push([i + (v - a) / (b - a), j]); if ((b > v) !== (e > v)) pts.push([i + 1, j + (v - b) / (e - b)]);
          if ((d > v) !== (e > v)) pts.push([i + (v - d) / (e - d), j + 1]); if ((a > v) !== (d > v)) pts.push([i, j + (v - a) / (d - a)]);
          for (var k = 0; k + 1 < pts.length; k += 2) { c.moveTo(pts[k][0] * cell, pts[k][1] * cell); c.lineTo(pts[k + 1][0] * cell, pts[k + 1][1] * cell); } }
      }
    }
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H;
      if (mode === 'dipole') {
        var cell = Math.max(3, Math.round(px(st, 5))), nx = Math.ceil(W / cell) + 1, ny = Math.ceil(H / cell) + 1, F = new Float32Array(nx * ny), sc = st.k * 9 / H, wt = clock * 1.6, cx = W / 2, cy = H / 2;
        for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) { var x = (i * cell - cx) * sc, y = (j * cell - cy) * sc, r = Math.hypot(x, y), s2 = r ? x * x / (r * r) : 0;
          F[j * nx + i] = r < 0.35 ? NaN : s2 * (Math.cos(wt - r) / r - Math.sin(wt - r)); }
        var lv = []; for (var k = -7; k <= 7; k++) if (k) lv.push(k * 0.14);
        c.strokeStyle = 'rgba(124,196,255,.7)'; c.lineWidth = px(st, 1.3); c.beginPath(); contours(F, nx, ny, cell, lv, c); c.stroke();
        var amp = Math.cos(wt) * px(st, 16); c.strokeStyle = MIST; c.lineWidth = px(st, 3); c.beginPath(); c.moveTo(cx, cy - px(st, 20)); c.lineTo(cx, cy + px(st, 20)); c.stroke();
        c.fillStyle = amp > 0 ? ROPE : BLUE; c.beginPath(); c.arc(cx, cy - px(st, 20), px(st, 5) + Math.abs(amp) * 0.25, 0, 7); c.fill();
        c.fillStyle = amp > 0 ? BLUE : ROPE; c.beginPath(); c.arc(cx, cy + px(st, 20), px(st, 5) + Math.abs(amp) * 0.25, 0, 7); c.fill();
        read('An oscillating dipole: close in, the lines snap back each half cycle; beyond about a wavelength they pinch off into loops that travel outward, strongest sideways and zero along the antenna. Scroll to change the frequency.');
      } else if (mode === 'fast') {
        var gam = 1 / Math.sqrt(1 - beta * beta), qx = xq * W, qy = H / 2, n = 28, maxR = Math.hypot(W, H);
        c.strokeStyle = 'rgba(124,196,255,.65)'; c.lineWidth = px(st, 1.2); c.beginPath();
        for (var k2 = 0; k2 < n; k2++) { var th = (k2 + 0.5) / n * 2 * Math.PI, tp = Math.atan2(gam * Math.sin(th), Math.cos(th)); c.moveTo(qx + Math.cos(tp) * px(st, 12), qy + Math.sin(tp) * px(st, 12)); c.lineTo(qx + Math.cos(tp) * maxR, qy + Math.sin(tp) * maxR); }
        c.stroke(); c.fillStyle = ROPE; c.beginPath(); c.arc(qx, qy, px(st, 9), 0, 7); c.fill();
        c.strokeStyle = GOLD; c.lineWidth = px(st, 2); c.beginPath(); c.moveTo(qx + px(st, 14), qy); c.lineTo(qx + px(st, 44), qy); c.stroke();
        text(st, 'γ = ' + gam.toFixed(2), px(st, 12), px(st, 22), FOAM, 'left', 12);
        read('At ' + beta.toFixed(2) + ' c (γ = ' + gam.toFixed(2) + '), the field is ' + (gam > 2 ? 'squeezed into a thin pancake perpendicular to the motion.' : gam > 1.15 ? 'visibly flattened sideways.' : 'almost the ordinary radial Coulomb field.') + ' Scroll to speed it up.');
      } else {
        var nn = 22, mR = Math.hypot(W, H), stp = px(st, 5);
        c.strokeStyle = 'rgba(124,196,255,.6)'; c.lineWidth = px(st, 1.2);
        for (var kk = 0; kk < nn; kk++) {
          var a = (kk + 0.5) / nn * 2 * Math.PI, ca = Math.cos(a), sa = Math.sin(a); c.beginPath();
          for (var rr = px(st, 12); rr < mR; rr += stp) { var pp = at(clock - rr / (c0 * W)), xx = pp[0] * W + ca * rr, yy = pp[1] * H + sa * rr; rr === px(st, 12) ? c.moveTo(xx, yy) : c.lineTo(xx, yy); }
          c.stroke();
        }
        c.fillStyle = ROPE; c.beginPath(); c.arc(q[0] * W, q[1] * H, px(st, 9), 0, 7); c.fill();
        read(tgt ? 'Each jerk of the charge sends a kink outward at the speed of light; beyond it, the lines still point at where the charge used to be.' : 'Left alone, the charge jumps back and forth and radiates pulses. Move your pointer to push it yourself.');
      }
    };
  });
  /* PHYS 4130: the chart of nuclides, with the nucleus itself decaying beside it */
  def('PHYS4130', { gauge: 'Starting nucleus', hint: 'Point at any nucleus to watch it decay', aria: 'A chart of nuclides coloured by decay mode, predicted from the semi-empirical mass formula, beside a picture of the nucleus emitting alpha and beta particles step by step.',
    note: 'Every square is a nucleus with \\(Z\\) protons and \\(N\\) neutrons, coloured by how the liquid-drop model, the semi-empirical mass formula \\(B = a_VA - a_SA^{2/3} - a_C\\tfrac{Z(Z-1)}{A^{1/3}} - a_A\\tfrac{(N-Z)^2}{A} + \\delta\\), says it decays: a nucleus decays if some neighbour is more tightly bound. On the right is the nucleus itself (protons red, neutrons blue). An \\(\\alpha\\) decay throws out two protons and two neutrons, moving two squares down and left; \\(\\beta^-\\) turns a neutron into a proton, emitting an electron and an antineutrino, one square up and left; \\(\\beta^+\\) does the reverse. It is only a model, so some squares disagree with real data (uranium-238&rsquo;s chain stops at lead-210 here rather than lead-206), but it finds the valley of stability and the shape of the heavy decay chains.'
  }, function (st, g, read) {
    var EL = 'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm'.split(' ');
    var ZM = 100, NM = 160, mode = {}, start = [92, 146], chain = [], ci = 0, u = 0, hov = null, nuc = null, STEP = 2.8;
    function B(Z, A) { if (A < 1 || Z < 0 || Z > A) return 0; var N = A - Z, d = 11.2 / Math.sqrt(A) * (Z % 2 === 0 && N % 2 === 0 ? 1 : Z % 2 && N % 2 ? -1 : 0);
      return 15.5 * A - 17 * Math.pow(A, 2 / 3) - 0.695 * Z * (Z - 1) / Math.pow(A, 1 / 3) - 22 * (N - Z) * (N - Z) / A + d; }   // coefficients fitted to known stable isobars
    function decay(Z, N) {
      var A = Z + N, b0 = B(Z, A); if (A < 4) return null;
      if (b0 - B(Z, A - 1) < 0 || (Z > 1 && b0 - B(Z - 1, A - 1) < 0)) return null;
      var qm = B(Z + 1, A) - b0 + 0.782, qp = B(Z - 1, A) - b0 - 0.782, qa = Z > 2 ? B(Z - 2, A - 4) + 28.296 - b0 : -1;
      if (qm > 0 && qm >= qp) return 'b-'; if (qp > 0) return 'b+'; if (qa > 2.5 && Z > 82) return 'a'; return 's';
    }
    for (var Z = 1; Z <= ZM; Z++) for (var N = 0; N <= NM; N++) { var m = decay(Z, N); if (m) mode[Z + ',' + N] = m; }
    function layout(z, n) {   // nucleons packed in a disc, protons chosen at random
      var A = z + n, R = rng(z * 1000 + n), pts = [], idx = [];
      for (var i = 0; i < A; i++) { var r = Math.sqrt((i + 0.5) / A), a = i * 2.39996; pts.push({ x: r * Math.cos(a), y: r * Math.sin(a), p: false }); idx.push(i); }
      for (i = A - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
      for (i = 0; i < z; i++) pts[idx[i]].p = true;
      return { z: z, n: n, pts: pts };
    }
    function build(z, n) { chain = [[z, n]]; for (var i = 0; i < 40; i++) { var m = mode[z + ',' + n]; if (!m || m === 's') break; if (m === 'a') { z -= 2; n -= 2; } else if (m === 'b-') { z++; n--; } else { z--; n++; } chain.push([z, n]); } ci = 0; u = 0; nuc = layout(chain[0][0], chain[0][1]); pick(); }
    var em = [];   // the nucleons taking part in the current step
    function pick() {
      em = []; if (ci >= chain.length - 1) return; var m = mode[chain[ci][0] + ',' + chain[ci][1]], dir = ci * 2.1 + 0.6, dx = Math.cos(dir), dy = Math.sin(dir);
      var order = nuc.pts.map(function (p, i) { return [p.x * dx + p.y * dy, i]; }).sort(function (a, b) { return b[0] - a[0]; });
      var want = m === 'a' ? { p: 2, n: 2 } : m === 'b-' ? { p: 0, n: 1 } : { p: 1, n: 0 };
      order.forEach(function (o) { var p = nuc.pts[o[1]]; if (p.p && want.p > 0) { want.p--; em.push(o[1]); } else if (!p.p && want.n > 0) { want.n--; em.push(o[1]); } });
      st.dir = [dx, dy]; st.m = m;
    }
    var STARTS = [[92, 146], [92, 143], [90, 142], [94, 145], [95, 146], [88, 138], [86, 136], [84, 126], [27, 33], [53, 78], [55, 82], [19, 21]];
    function nm(z, n) { return EL[z - 1] + '-' + (z + n); }
    onScroll(function () { var p = progress(st.cv), s = STARTS[Math.min(STARTS.length - 1, Math.floor(p * STARTS.length))]; g(p, nm(s[0], s[1])); if (!hov && (s[0] !== start[0] || s[1] !== start[1])) { start = s; build(s[0], s[1]); } });
    function geo() { var wide = st.W > st.H * 1.4, cwid = wide ? st.W * 0.6 : st.W, chh = wide ? st.H : st.H * 0.58, cs = Math.min((cwid - px(st, 40)) / (NM + 1), (chh - px(st, 40)) / (ZM + 1));
      return { wide: wide, cs: cs, x0: px(st, 30), y0: chh - px(st, 24), px0: wide ? cwid + px(st, 10) : 0, py0: wide ? 0 : chh, pw: wide ? st.W - cwid - px(st, 10) : st.W, ph: wide ? st.H : st.H - chh }; }
    hover(st, function (p) { if (!p) { if (hov) { hov = null; build(start[0], start[1]); } return; } var gg = geo(), n = Math.round((p[0] - gg.x0) / gg.cs - 0.5), z = Math.round((gg.y0 - p[1]) / gg.cs - 0.5);
      if (mode[z + ',' + n] && (!hov || hov[0] !== z || hov[1] !== n)) { hov = [z, n]; build(z, n); } });
    st.frame = function (dt) {
      u += dt / STEP;
      if (u >= 1) { u = 0; if (ci < chain.length - 1) { ci++; nuc = layout(chain[ci][0], chain[ci][1]); pick(); } else { ci = 0; nuc = layout(chain[0][0], chain[0][1]); pick(); } }
    };
    var COL = { s: [234, 246, 248], 'b-': [124, 196, 255], 'b+': [255, 106, 85], a: [255, 209, 102] }, SYM = { 'b-': 'β⁻', 'b+': 'β⁺', a: 'α' };
    function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
    st.draw = function () {
      clear(st); var c = st.ctx, gg = geo(), cs = gg.cs, P = function (z, n) { return [gg.x0 + (n + 0.5) * cs, gg.y0 - (z + 0.5) * cs]; };
      [2, 8, 20, 28, 50, 82, 126].forEach(function (mg) { c.strokeStyle = 'rgba(143,177,189,.15)'; c.lineWidth = px(st, 1); c.beginPath();
        if (mg <= ZM) { c.moveTo(gg.x0, gg.y0 - (mg + 0.5) * cs); c.lineTo(gg.x0 + (NM + 1) * cs, gg.y0 - (mg + 0.5) * cs); }
        c.moveTo(gg.x0 + (mg + 0.5) * cs, gg.y0); c.lineTo(gg.x0 + (mg + 0.5) * cs, gg.y0 - (ZM + 1) * cs); c.stroke(); });
      for (var k in mode) { var zz = +k.split(',')[0], nn = +k.split(',')[1], col = COL[mode[k]]; c.fillStyle = 'rgba(' + col.join(',') + ',' + (mode[k] === 's' ? 0.95 : 0.5) + ')'; c.fillRect(gg.x0 + nn * cs, gg.y0 - (zz + 1) * cs, Math.max(1, cs - 0.5), Math.max(1, cs - 0.5)); }
      c.strokeStyle = FOAM; c.lineWidth = px(st, 2); c.beginPath(); chain.slice(0, ci + 1).forEach(function (q, i) { var p = P(q[0], q[1]); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
      var mv = ease((u - 0.35) / 0.6), cur = P(chain[ci][0], chain[ci][1]);
      if (ci < chain.length - 1) { var nx = P(chain[ci + 1][0], chain[ci + 1][1]); cur = [cur[0] + (nx[0] - cur[0]) * mv, cur[1] + (nx[1] - cur[1]) * mv]; c.lineTo(cur[0], cur[1]); }
      c.stroke(); c.strokeStyle = ROPE; c.lineWidth = px(st, 2.5); c.beginPath(); c.arc(cur[0], cur[1], px(st, 8), 0, 7); c.stroke();
      text(st, 'neutrons N →', gg.x0 + (NM + 1) * cs, gg.y0 + px(st, 16), MIST, 'right'); text(st, '↑ protons Z', gg.x0 + px(st, 4), gg.y0 - (ZM + 1) * cs + px(st, 4), MIST);
      var lx = gg.x0 + (NM - 40) * cs, ly = gg.y0 - px(st, 70);
      [['stable', 's'], ['β⁻', 'b-'], ['β⁺ / capture', 'b+'], ['α', 'a']].forEach(function (L, i) { c.fillStyle = 'rgb(' + COL[L[1]].join(',') + ')'; c.fillRect(lx, ly + i * px(st, 16) - px(st, 8), px(st, 9), px(st, 9)); text(st, L[0], lx + px(st, 14), ly + i * px(st, 16), MIST); });
      // the nucleus
      var A = nuc.z + nuc.n, pcx = gg.px0 + gg.pw / 2, pcy = gg.py0 + gg.ph / 2, Rn = Math.min(gg.pw, gg.ph) * 0.26, rb = Math.max(px(st, 1.6), Rn / Math.sqrt(A) * 0.95), m = st.m, out = ease((u - 0.3) / 0.7), dir = st.dir || [1, 0], last = ci >= chain.length - 1;
      var isEm = {}; em.forEach(function (i) { isEm[i] = true; });
      var cen = [0, 0]; if (m === 'a' && em.length) { em.forEach(function (i) { cen[0] += nuc.pts[i].x / em.length; cen[1] += nuc.pts[i].y / em.length; }); }
      nuc.pts.forEach(function (p, i) {
        var x = p.x, y = p.y, isP = p.p;
        if (!last && isEm[i]) {
          if (m === 'a') { var cl = Math.min(1, out * 3), tx = cen[0] + (x - cen[0]) * 0.35, ty = cen[1] + (y - cen[1]) * 0.35; x += (tx - x) * cl + dir[0] * out * 1.6; y += (ty - y) * cl + dir[1] * out * 1.6; }
          else if (out > 0.25) isP = m === 'b-';
        }
        c.fillStyle = isP ? ROPE : BLUE; c.strokeStyle = DEEP; c.lineWidth = px(st, 0.8); c.beginPath(); c.arc(pcx + x * Rn, pcy + y * Rn, rb, 0, 7); c.fill(); c.stroke();
      });
      if (!last && (m === 'b-' || m === 'b+') && out > 0.25 && em.length) {
        var o = nuc.pts[em[0]], f = (out - 0.25) / 0.75, ex = pcx + (o.x + dir[0] * f * 2.2) * Rn, ey = pcy + (o.y + dir[1] * f * 2.2) * Rn;
        c.fillStyle = m === 'b-' ? GOLD : '#ff8a5c'; c.beginPath(); c.arc(ex, ey, Math.max(px(st, 3), rb * 0.6), 0, 7); c.fill(); text(st, m === 'b-' ? 'e⁻' : 'e⁺', ex + px(st, 8), ey - px(st, 6), m === 'b-' ? GOLD : '#ff8a5c');
        var vx = pcx + (o.x - dir[1] * f * 2.2) * Rn, vy = pcy + (o.y + dir[0] * f * 2.2) * Rn; c.strokeStyle = 'rgba(234,246,248,.6)'; c.lineWidth = px(st, 1); c.beginPath(); c.arc(vx, vy, px(st, 3), 0, 7); c.stroke(); text(st, m === 'b-' ? 'ν̄' : 'ν', vx + px(st, 7), vy + px(st, 4), MIST);
      }
      if (!last && m === 'a' && out > 0.2) { text(st, 'α', pcx + (cen[0] + dir[0] * out * 1.6) * Rn + px(st, 14), pcy + (cen[1] + dir[1] * out * 1.6) * Rn, GOLD, 'left', 13); }
      text(st, nm(nuc.z, nuc.n), pcx, gg.py0 + px(st, 24), FOAM, 'center', 14);
      text(st, nuc.z + ' protons, ' + nuc.n + ' neutrons', pcx, gg.py0 + px(st, 42), MIST, 'center');
      text(st, last ? 'stable' : m === 'a' ? 'α decay: emits ⁴He' : m === 'b-' ? 'β⁻: n → p + e⁻ + ν̄' : 'β⁺: p → n + e⁺ + ν', pcx, gg.py0 + gg.ph - px(st, 16), last ? FOAM : 'rgb(' + COL[m].join(',') + ')', 'center', 12);
      read(chain.map(function (q, i) { return (i ? ' →' + SYM[mode[chain[i - 1][0] + ',' + chain[i - 1][1]]] + ' ' : '') + nm(q[0], q[1]); }).join('') + (chain.length > 1 ? ' (stable).' : ' is stable.'));
    };
    build(92, 146);
  });
  /* PHYS 4150: band gap, carriers moving in the crystal, Brillouin zones */
  def('PHYS4150', { gauge: 'Temperature', controls: '<button class="chip" type="button" data-ss="bands" aria-pressed="false">Bands</button><button class="chip" type="button" data-ss="crystal" aria-pressed="true">In the crystal</button><button class="chip" type="button" data-ss="bz" aria-pressed="false">Brillouin zones</button>',
    aria: 'A semiconductor: electrons excited across the band gap and drifting through the crystal with the holes they leave, or the Brillouin zones of square and hexagonal lattices.',
    note: 'In a semiconductor the valence band is full and the conduction band empty, separated by a gap \\(E_g\\). Heat frees a few electrons, in numbers going as \\(e^{-E_g/2kT}\\); each leaves a hole in the bond it came from, and under an applied field the electrons drift one way while the holes, hopping from bond to bond, drift the other, so both carry current (the scale is exaggerated: silicon at room temperature has \\(kT \\approx E_g/45\\)). The Brillouin zones come from the reciprocal lattice: draw the perpendicular bisector of the line to every lattice point, and the \\(n\\)th zone is everything reached by crossing \\(n-1\\) of those planes from the centre. Electrons are Bragg-reflected at the zone edges, which is what opens the gaps.'
  }, function (st, g, read) {
    var kT = 0.08, view = 'crystal', R = rng(5), n = 90, u = [], px0 = [], ph = [], clock = 0, ne = 0, zones = 4, hov = null;
    for (var i = 0; i < n; i++) { u.push(R()); px0.push(R()); ph.push(R() * 6.28); }
    var NXc = 16, NYc = 8, el = [], ho = [], flow = 0;
    var lab = document.querySelector('#g-PHYS4150 .k');
    function kick() { var p = progress(st.cv); if (view === 'bz') { zones = 1 + Math.min(7, Math.floor(p * 8)); lab.textContent = 'Zones'; g(p, zones + ' zone' + (zones > 1 ? 's' : '')); }
      else { kT = 0.02 + 0.25 * p; lab.textContent = 'Temperature'; g(p, 'kT = ' + kT.toFixed(3) + ' E_g'); } st.redraw(); }
    E.chips('[data-ss]', 'ss', function (k) { view = k; kick(); });
    onScroll(kick);
    hover(st, function (p) { hov = p; st.redraw(); });
    st.frame = function (dt) {
      clock += dt; if (view !== 'crystal') return;
      var f = Math.exp(-0.5 / kT), target = Math.round(f * NXc * NYc * 1.6);
      if (el.length < target && R() < dt * 6) { var a = Math.floor(R() * NXc), b = Math.floor(R() * NYc); el.push({ x: a + 0.5, y: b + 0.3 }); ho.push({ i: a, j: b }); }
      el.forEach(function (e) { e.x -= dt * 0.9 + (R() - 0.5) * dt * 3; e.y += (R() - 0.5) * dt * 3; e.y = Math.max(0, Math.min(NYc - 0.01, e.y)); if (e.x < 0) { e.x += NXc; flow++; } });
      ho.forEach(function (h) { if (R() < dt * 2.5) { var r = R(); if (r < 0.55) h.i++; else if (r < 0.7) h.i--; else if (r < 0.85) h.j++; else h.j--; h.j = Math.max(0, Math.min(NYc - 1, h.j)); if (h.i >= NXc) h.i -= NXc; if (h.i < 0) h.i += NXc; } });
      for (var k = el.length - 1; k >= 0; k--) { var h = ho[k]; if (Math.hypot(el[k].x - (h.i + 0.5), el[k].y - (h.j + 0.5)) < 0.45 && R() < (el.length > target ? 0.6 : 0.05)) { el.splice(k, 1); ho.splice(k, 1); } }
    };
    function bz(lat) { // zone index for each pixel of a square region
      var Gs = [], a1 = lat === 'sq' ? [1, 0] : [1, 0], a2 = lat === 'sq' ? [0, 1] : [0.5, Math.sqrt(3) / 2];
      for (var i = -5; i <= 5; i++) for (var j = -5; j <= 5; j++) { if (!i && !j) continue; var G = [i * a1[0] + j * a2[0], i * a1[1] + j * a2[1]]; if (Math.hypot(G[0], G[1]) < 3.6) Gs.push(G); }
      return function (x, y) { var c = 1; for (var k = 0; k < Gs.length; k++) { var G = Gs[k]; if (x * G[0] + y * G[1] > (G[0] * G[0] + G[1] * G[1]) / 2) c++; } return c; };
    }
    var Z = { sq: bz('sq'), hex: bz('hex') }, ZC = [[124, 196, 255], [195, 155, 255], [255, 209, 102], [95, 211, 176], [255, 138, 92], [143, 177, 189], [124, 160, 220], [220, 150, 200]];
    var off = document.createElement('canvas'), oc = off.getContext('2d');
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H;
      if (view === 'bz') {
        var sz = Math.min((W - px(st, 40)) / 2, H - px(st, 50)), res = Math.round(sz / Math.max(1, px(st, 2))), hz = null;
        off.width = res; off.height = res;
        [['sq', 'Square lattice'], ['hex', 'Hexagonal lattice']].forEach(function (L, k) {
          var img = oc.createImageData(res, res), x0 = px(st, 10) + k * (sz + px(st, 20)), y0 = px(st, 36), sc = 4.2 / res;
          for (var y = 0; y < res; y++) for (var x = 0; x < res; x++) { var q = Z[L[0]]((x - res / 2) * sc, (res / 2 - y) * sc), i4 = (y * res + x) * 4;
            var col = q <= zones ? ZC[(q - 1) % ZC.length] : [7, 34, 46], kk = q <= zones ? (q % 2 ? 0.75 : 0.5) : 1; img.data[i4] = col[0] * kk; img.data[i4 + 1] = col[1] * kk; img.data[i4 + 2] = col[2] * kk; img.data[i4 + 3] = 255; }
          oc.putImageData(img, 0, 0); c.imageSmoothingEnabled = false; c.drawImage(off, x0, y0, sz, sz);
          text(st, L[1], x0, px(st, 22), FOAM, 'left', 12);
          if (hov && hov[0] > x0 && hov[0] < x0 + sz && hov[1] > y0 && hov[1] < y0 + sz) hz = Z[L[0]]((hov[0] - x0 - sz / 2) / sz * 4.2, (sz / 2 - (hov[1] - y0)) / sz * 4.2);
        });
        read(hz ? 'Zone ' + hz + ': reached by crossing ' + (hz - 1) + ' Bragg plane' + (hz === 2 ? '' : 's') + ' from the centre. Every zone has the same area.' : 'The first ' + zones + ' Brillouin zone' + (zones > 1 ? 's' : '') + '. Point at a region to count the planes crossed; scroll for more zones.');
        return;
      }
      var f = Math.exp(-0.5 / kT);
      if (view === 'bands') {
        var bw = Math.min(W * 0.62, W - px(st, 120)), x0 = px(st, 30), vbT = H * 0.62, vbB = H - px(st, 20), cbT = px(st, 20), cbB = H * 0.32;
        c.fillStyle = 'rgba(124,196,255,.08)'; c.fillRect(x0, vbT, bw, vbB - vbT); c.fillRect(x0, cbT, bw, cbB - cbT);
        c.strokeStyle = 'rgba(124,196,255,.4)'; c.strokeRect(x0, vbT, bw, vbB - vbT); c.strokeRect(x0, cbT, bw, cbB - cbT);
        text(st, 'conduction band', x0 + bw + px(st, 10), (cbT + cbB) / 2, BLUE); text(st, 'valence band', x0 + bw + px(st, 10), (vbT + vbB) / 2, BLUE);
        c.setLineDash([px(st, 3), px(st, 4)]); c.strokeStyle = GOLD; c.beginPath(); c.moveTo(x0, (cbB + vbT) / 2); c.lineTo(x0 + bw, (cbB + vbT) / 2); c.stroke(); c.setLineDash([]);
        text(st, 'Fermi level', x0 + bw + px(st, 10), (cbB + vbT) / 2 + px(st, 4), GOLD);
        ne = 0;
        for (var i = 0; i < n; i++) {
          var exc = u[i] < f, cols = 18, row = Math.floor(i / cols), col = i % cols, gx = x0 + (col + 0.5) / cols * bw, gy = vbT + (row + 0.5) / 5 * (vbB - vbT);
          if (exc) { ne++; var jx = x0 + ((px0[i] + clock * 0.05 * (i % 2 ? 1 : -1)) % 1 + 1) % 1 * bw, jy = cbT + (cbB - cbT) * (0.3 + 0.4 * (0.5 + 0.5 * Math.sin(clock * 2 + ph[i])));
            c.fillStyle = BLUE; c.beginPath(); c.arc(jx, jy, px(st, 4), 0, 7); c.fill(); c.strokeStyle = ROPE; c.lineWidth = px(st, 1.5); c.beginPath(); c.arc(gx, gy, px(st, 4), 0, 7); c.stroke(); }
          else { c.fillStyle = 'rgba(124,196,255,.8)'; c.beginPath(); c.arc(gx, gy, px(st, 4), 0, 7); c.fill(); }
        }
        read(ne ? ne + ' of ' + n + ' electrons have crossed the gap, each leaving a hole (red rings). Scroll to heat it further.' : 'Cold: every electron is stuck in the full valence band, so nothing conducts. Scroll to heat it.');
        return;
      }
      // in the crystal: atoms on a grid, electrons drifting left, holes hopping right
      var cw = (W - px(st, 40)) / NXc, chh = (H - px(st, 60)) / NYc, X0 = px(st, 20), Y0 = px(st, 30), P = function (x, y) { return [X0 + x * cw, Y0 + y * chh]; };
      c.strokeStyle = 'rgba(143,177,189,.25)'; c.lineWidth = px(st, 2);
      for (var a = 0; a < NXc; a++) for (var b = 0; b < NYc; b++) { var p = P(a + 0.5, b + 0.5); c.beginPath(); if (a < NXc - 1) { c.moveTo(p[0], p[1]); c.lineTo(p[0] + cw, p[1]); } if (b < NYc - 1) { c.moveTo(p[0], p[1]); c.lineTo(p[0], p[1] + chh); } c.stroke(); }
      for (a = 0; a < NXc; a++) for (b = 0; b < NYc; b++) { p = P(a + 0.5, b + 0.5); c.fillStyle = '#1c5a73'; c.beginPath(); c.arc(p[0], p[1], Math.min(cw, chh) * 0.22, 0, 7); c.fill(); }
      ho.forEach(function (h) { var p = P(h.i + 0.5, h.j + 0.5); c.strokeStyle = ROPE; c.lineWidth = px(st, 2); c.beginPath(); c.arc(p[0], p[1], Math.min(cw, chh) * 0.3, 0, 7); c.stroke(); });
      el.forEach(function (e) { var p = P(e.x, e.y); c.fillStyle = BLUE; c.beginPath(); c.arc(p[0], p[1], px(st, 4.5), 0, 7); c.fill(); });
      text(st, 'applied field →   electrons drift ←, holes drift →', W - px(st, 14), H - px(st, 12), MIST, 'right');
      read(el.length ? el.length + ' free electrons (blue) and ' + ho.length + ' holes (red rings). Electrons wander against the field; holes hop from atom to atom with it. Scroll to change the temperature.' : 'Cold: no free carriers, so no current. Scroll to heat it.');
    };
  });
  /* PHYS 4500: the normal Zeeman effect seen through a Fabry-Perot etalon (the lab) */
  def('PHYS4500', { gauge: 'Magnetic field', controls: '<span class="lbl">Polariser</span><button class="chip" type="button" data-zp="none" aria-pressed="true">None</button><button class="chip" type="button" data-zp="pi" aria-pressed="false">0° (π)</button><button class="chip" type="button" data-zp="sigma" aria-pressed="false">90° (σ)</button>',
    aria: 'Fabry-Pérot interference rings of the red cadmium line splitting into triplets as the magnetic field rises, beside the energy-level diagram of the transitions.',
    note: 'One of my labs: the red cadmium line (643.8 nm) through a Fabry&ndash;P&eacute;rot etalon makes rings like the photos we took. In a magnetic field the upper (\\({}^1D_2\\)) and lower (\\({}^1P_1\\)) levels split into their \\(m\\) sublevels by \\(\\mu_B B\\,m\\), and since transitions only allow \\(\\Delta m = 0, \\pm1\\), the nine possible lines land on just three energies: every ring becomes a triplet with spacing \\(\\Delta\\nu = \\mu_B B/h \\approx 14\\) GHz per tesla. A polariser picks them apart: viewed across the field, the unshifted \\(\\pi\\) line is polarised along \\(B\\) and the shifted \\(\\sigma\\) lines across it.'
  }, function (st, g, read) {
    var B = 0, pol = 'none', off = document.createElement('canvas'), oc = off.getContext('2d');
    E.chips('[data-zp]', 'zp', function (k) { pol = k; st.redraw(); });
    onScroll(function () { var p = progress(st.cv); B = 1.2 * p; g(p, 'B = ' + B.toFixed(2) + ' T'); st.redraw(); });
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, sz = Math.min(H - px(st, 20), W * 0.55), res = Math.round(sz / Math.max(1, px(st, 2))), FSR = 50, sh = 14 * B / FSR, F = 60;
      var comps = []; if (pol !== 'sigma') comps.push([0, 1]); if (pol !== 'pi') comps.push([-sh, 0.5], [sh, 0.5]);
      off.width = res; off.height = res; var img = oc.createImageData(res, res), ph0 = 0.3;
      for (var y = 0; y < res; y++) for (var x = 0; x < res; x++) {
        var r2 = (Math.pow(x - res / 2, 2) + Math.pow(y - res / 2, 2)) / Math.pow(res / 2, 2), q = r2 * 7, I = 0;
        for (var k = 0; k < comps.length; k++) { var s = Math.sin(Math.PI * (ph0 - q + comps[k][0])); I += comps[k][1] / (1 + F * s * s); }
        I = Math.min(1, I) * Math.exp(-r2 * 0.6); var i4 = (y * res + x) * 4; img.data[i4] = 20 + 235 * I; img.data[i4 + 1] = 8 + 30 * I; img.data[i4 + 2] = 12 + 40 * I; img.data[i4 + 3] = 255;
      }
      oc.putImageData(img, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(off, px(st, 10), (H - sz) / 2, sz, sz);
      // level diagram
      var gx = sz + px(st, 50), gw = W - gx - px(st, 14);
      if (gw > px(st, 160)) {
        var up = H * 0.26, lo = H * 0.74, sp = B * px(st, 14) / 1.2 * 1.6, lv = function (y, m, w0) { return [gx + w0 + (m + 2) * gw * 0.16, y - m * sp]; };
        text(st, '¹D₂', gx, up - px(st, 30), FOAM, 'left', 12); text(st, '¹P₁', gx, lo - px(st, 30), FOAM, 'left', 12);
        c.lineWidth = px(st, 2); c.strokeStyle = MIST;
        for (var m = -2; m <= 2; m++) { var p = lv(up, m, 0); c.beginPath(); c.moveTo(p[0] - gw * 0.06, p[1]); c.lineTo(p[0] + gw * 0.06, p[1]); c.stroke(); text(st, (m > 0 ? '+' : '') + m, p[0], p[1] - px(st, 6), MIST, 'center'); }
        for (m = -1; m <= 1; m++) { p = lv(lo, m, gw * 0.16); c.beginPath(); c.moveTo(p[0] - gw * 0.06, p[1]); c.lineTo(p[0] + gw * 0.06, p[1]); c.stroke(); text(st, (m > 0 ? '+' : '') + m, p[0], p[1] + px(st, 16), MIST, 'center'); }
        for (m = -2; m <= 2; m++) for (var m2 = -1; m2 <= 1; m2++) { var dm = m - m2; if (Math.abs(dm) > 1) continue; var on = dm === 0 ? pol !== 'sigma' : pol !== 'pi';
          var a = lv(up, m, 0), b = lv(lo, m2, gw * 0.16); c.strokeStyle = dm === 0 ? 'rgba(255,209,102,' + (on ? 0.85 : 0.12) + ')' : dm > 0 ? 'rgba(124,196,255,' + (on ? 0.85 : 0.12) + ')' : 'rgba(255,106,85,' + (on ? 0.85 : 0.12) + ')';
          c.lineWidth = px(st, 1.5); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
        text(st, 'Δm = 0 (π)', gx, H - px(st, 30), GOLD); text(st, 'Δm = ±1 (σ)', gx + px(st, 100), H - px(st, 30), BLUE);
      }
      read(B < 0.02 ? 'No field: one ring per order of interference. Scroll to switch the magnet on.' : 'B = ' + B.toFixed(2) + ' T splits each line by ' + (14 * B).toFixed(1) + ' GHz: ' + (pol === 'none' ? 'every ring becomes a triplet.' : pol === 'pi' ? 'the polariser passes only the unshifted π component.' : 'the polariser passes only the two shifted σ components.'));
    };
  });
})();
