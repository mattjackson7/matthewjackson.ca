/* Shared by every page: the footer year and the site map.

   The site map is a full-screen 2D potential landscape with a well for each
   page, drawn as a contour map:

     V(r) = -sum_i exp(-|r - r_i|^2 / 2 sigma^2) + kappa |r|^2

   The wells sit on a ring, so the centre is a plateau between them. Open it
   with the Map button, the M key, or by dragging a page navigator outward;
   that same drag carries on into the map. Fling the particle: its release
   velocity is projected forward and it springs into the well nearest the
   projected point (ruling out wells well off its heading), then the browser
   goes to that page. Flinging it back into its own well cancels. */
(function () {
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var WELLS = [
    { page: 'home', href: 'index.html', name: 'Home' },
    { page: 'projects', href: 'projects.html', name: 'Projects' },
    { page: 'experience', href: 'experience.html', name: 'Experience' },
    { page: 'education', href: 'education.html', name: 'Education' },
    { page: 'results', href: 'results.html', name: 'Results' },
    { page: 'contact', href: 'contact.html', name: 'Contact' }
  ];
  var ANGLES = WELLS.map(function (w, i) { return 180 + i * 360 / WELLS.length; });
  var thisPage = document.body.getAttribute('data-page') || 'home';
  // the projects live under Projects, so a project page sits in that well
  var PARENT = { options: 'projects', risk: 'projects', optimizer: 'projects' };
  var HERE = Math.max(0, WELLS.findIndex(function (w) { return w.page === (PARENT[thisPage] || thisPage); }));
  var AT_HOME_PAGE = WELLS[HERE].page === thisPage; // false on a project page: its well leads up to the index

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var TAU = 0.22;                 // flick projection time (s)
  var OMEGA = 2 * Math.PI * 1.35; // spring natural frequency (rad/s)
  var ZETA = 0.8;                 // slightly underdamped, so flights curve and settle
  var VMAX = 4000;                // cap on carried velocity (px/s)
  var SLOP = 6;                   // px before a press becomes a drag
  var KAPPA = 0.16;               // strength of the confining bowl
  var FOAM = '#eaf6f8', MIST = '#8fb1bd', ROPE = '#ff6a55';

  /* ---------- DOM ---------- */
  var map = document.createElement('div');
  map.className = 'map';
  map.hidden = true;
  map.tabIndex = -1;
  map.setAttribute('role', 'dialog');
  map.setAttribute('aria-modal', 'true');
  map.setAttribute('aria-label', 'Site map');

  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');
  var contours = document.createElement('canvas');

  var eq = document.createElement('div');
  eq.className = 'map-eq';
  eq.setAttribute('aria-hidden', 'true');
  eq.innerHTML = '<div>\\(V(\\mathbf{r}) = -\\sum_i e^{-\\lVert \\mathbf{r} - \\mathbf{r}_i \\rVert^2 / 2\\sigma^2} + \\kappa \\lVert \\mathbf{r} \\rVert^2\\)</div>' +
    '<div class="map-read"></div>';
  var readout = eq.querySelector('.map-read');

  var hint = document.createElement('p');
  hint.className = 'map-hint';
  hint.textContent = 'Fling the particle toward a page, or tap one.';

  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'map-close';
  closeBtn.textContent = 'Close';

  var list = document.createElement('ol');
  list.className = 'map-wells';
  var buttons = WELLS.map(function (w, i) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'map-well' + (i === HERE ? ' here' : '');
    b.setAttribute('aria-label', w.group ? w.name + ', ' + w.group : w.name);
    var name = document.createElement('span');
    name.className = 'name';
    name.textContent = w.name;
    if (w.group) {
      var g = document.createElement('span');
      g.className = 'group';
      g.textContent = w.group;
      name.appendChild(g);
    }
    b.appendChild(name);
    li.appendChild(b);
    list.appendChild(li);
    return b;
  });

  map.appendChild(canvas);
  map.appendChild(list);
  map.appendChild(eq);
  map.appendChild(hint);
  map.appendChild(closeBtn);
  document.body.appendChild(map);

  /* ---------- Geometry and the potential ---------- */
  var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, rx = 1, ry = 1, sigma2 = 1;
  var pos = [];

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function potential(x, y) {
    var v = 0;
    for (var i = 0; i < pos.length; i++) {
      var dx = x - pos[i].x, dy = y - pos[i].y;
      v -= Math.exp(-(dx * dx + dy * dy) / (2 * sigma2));
    }
    var u = (x - cx) / rx, w = (y - cy) / ry;
    return v + KAPPA * (u * u + w * w);
  }

  function layout() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var narrow = W < 640;
    cx = W / 2;
    cy = H * 0.52;
    rx = Math.min(W * (narrow ? 0.3 : 0.33), 540);
    ry = Math.min(H * (narrow ? 0.29 : 0.3), 330);
    pos = WELLS.map(function (w, i) {
      var a = ANGLES[i] * Math.PI / 180;
      return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
    });
    var dmin = Infinity;
    for (var i = 0; i < pos.length; i++) {
      for (var j = i + 1; j < pos.length; j++) {
        dmin = Math.min(dmin, Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y));
      }
    }
    sigma2 = Math.pow(0.36 * dmin, 2);
    buttons.forEach(function (b, i) {
      b.style.left = pos[i].x + 'px';
      b.style.top = pos[i].y + 'px';
    });
    drawContours();
  }

  // marching squares over a coarse grid, drawn once per layout
  function drawContours() {
    contours.width = canvas.width;
    contours.height = canvas.height;
    var c = contours.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = W < 640 ? 7 : 9;
    var nx = Math.ceil(W / g) + 1, ny = Math.ceil(H / g) + 1;
    var v = new Float32Array(nx * ny);
    for (var j = 0; j < ny; j++) {
      for (var i = 0; i < nx; i++) v[j * nx + i] = potential(i * g, j * g);
    }
    // keep a small clear disc at each well floor, where contours get jagged
    c.save();
    c.beginPath();
    c.rect(0, 0, W, H);
    pos.forEach(function (q) { c.moveTo(q.x + 20, q.y); c.arc(q.x, q.y, 20, 0, Math.PI * 2); });
    c.clip('evenodd');
    c.lineWidth = 1;
    for (var k = 0; k < 16; k++) {
      var L = -0.85 + k * 0.1; // the floors sit near -0.9, so start just above them
      c.beginPath();
      for (j = 0; j < ny - 1; j++) {
        for (i = 0; i < nx - 1; i++) {
          var a = v[j * nx + i], b = v[j * nx + i + 1];
          var cc = v[(j + 1) * nx + i + 1], d = v[(j + 1) * nx + i];
          var idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (cc > L ? 2 : 0) | (d > L ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          var x = i * g, y = j * g;
          var top = [x + g * (L - a) / (b - a), y];
          var right = [x + g, y + g * (L - b) / (cc - b)];
          var bottom = [x + g * (L - d) / (cc - d), y + g];
          var left = [x, y + g * (L - a) / (d - a)];
          switch (idx) {
            case 1: case 14: seg(c, left, bottom); break;
            case 2: case 13: seg(c, bottom, right); break;
            case 3: case 12: seg(c, left, right); break;
            case 4: case 11: seg(c, top, right); break;
            case 6: case 9: seg(c, top, bottom); break;
            case 7: case 8: seg(c, left, top); break;
            case 5: seg(c, left, top); seg(c, bottom, right); break;
            case 10: seg(c, top, right); seg(c, left, bottom); break;
          }
        }
      }
      var depth = clamp(-L, 0, 1);
      c.strokeStyle = L < 0 ? FOAM : MIST;
      c.globalAlpha = L < 0 ? 0.07 + 0.2 * depth : 0.09;
      c.stroke();
    }
    c.restore();
  }
  function seg(c, p, q) { c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); }

  // the well nearest the projected landing point (p + v * TAU). Once the
  // particle is really moving, wells more than 60 degrees off its heading are
  // ruled out, so a flick never lands somewhere behind or beside its direction.
  function pick(px, py, vx, vy) {
    var speed = Math.hypot(vx, vy);
    var qx = px + vx * TAU, qy = py + vy * TAU;
    var best = -1, bd = Infinity;
    for (var i = 0; i < pos.length; i++) {
      if (speed > 300) {
        var dx = pos[i].x - px, dy = pos[i].y - py, dl = Math.hypot(dx, dy);
        if (dl > 24 && (dx * vx + dy * vy) / (dl * speed) < 0.5) continue;
      }
      var d = Math.pow(qx - pos[i].x, 2) + Math.pow(qy - pos[i].y, 2);
      if (d < bd) { bd = d; best = i; }
    }
    return best >= 0 ? best : pick(px, py, 0, 0);
  }

  /* ---------- State ---------- */
  // mode: 'rest' jiggles in a well, 'drag' follows the pointer,
  // 'fly' springs toward the target, 'hold' pauses a flight under a finger
  var isOpen = false, mode = 'rest', raf = 0, lastFrame = 0, closeTimer = 0;
  var here = HERE, target = -1, explicit = false, lastFocus = null, leaving = false;
  var p = { x: 0, y: 0 }, v = { x: 0, y: 0 }, proj = null;
  var noise = { x: 0, y: 0 }, trail = [];
  var press = null, samples = [], suppressClick = false;

  function gauss() {
    var a = 0, b = 0;
    while (a === 0) a = Math.random();
    while (b === 0) b = Math.random();
    return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
  }

  function open(opts) {
    opts = opts || {};
    if (isOpen) return;
    isOpen = true;
    leaving = false;
    clearTimeout(closeTimer);
    lastFocus = document.activeElement;
    map.hidden = false;
    layout();
    here = HERE;
    p = { x: pos[here].x, y: pos[here].y };
    v = { x: 0, y: 0 };
    noise = { x: 0, y: 0 };
    trail = [];
    target = -1;
    proj = null;
    mode = 'rest';
    void map.offsetWidth; // start the fade from transparent
    map.classList.add('open');

    if (opts.pointerId != null) {
      // a drag handed over from a page navigator keeps going here
      press = { id: opts.pointerId, x0: opts.x, y0: opts.y };
      beginDrag(opts.pointerId, opts.x, opts.y);
    }
    if (opts.keyboard) buttons[here].focus();
    else map.focus({ preventScroll: true });

    lastFrame = 0;
    raf = requestAnimationFrame(frame);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    press = null;
    cancelAnimationFrame(raf);
    raf = 0;
    map.classList.remove('open', 'dragging');
    closeTimer = setTimeout(function () { map.hidden = true; }, reduceMQ.matches ? 0 : 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function flyTo(i, isExplicit) {
    target = i;
    explicit = isExplicit;
    if (reduceMQ.matches) { p = { x: pos[i].x, y: pos[i].y }; arrive(); }
    else mode = 'fly';
  }

  function arrive() {
    p = { x: pos[target].x, y: pos[target].y };
    v = { x: 0, y: 0 };
    mode = 'rest';
    if (target === HERE && AT_HOME_PAGE) {
      // flinging back home cancels; tapping home just closes the map
      if (explicit) close();
      target = -1;
      return;
    }
    here = target;
    leaving = true;
    window.location.href = WELLS[target].href;
  }

  // coming back to a page from the browser's cache: make sure the map is shut
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && isOpen) { isOpen = false; map.classList.remove('open'); map.hidden = true; }
  });

  /* ---------- Animation ---------- */
  function frame(now) {
    raf = 0;
    if (!isOpen) return;
    var dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 1 / 60;
    lastFrame = now;

    if (mode === 'fly') {
      var q = pos[target];
      var ax = -OMEGA * OMEGA * (p.x - q.x) - 2 * ZETA * OMEGA * v.x;
      var ay = -OMEGA * OMEGA * (p.y - q.y) - 2 * ZETA * OMEGA * v.y;
      v.x += ax * dt; v.y += ay * dt;
      p.x += v.x * dt; p.y += v.y * dt;
      if (Math.hypot(p.x - q.x, p.y - q.y) < 2.5 && Math.hypot(v.x, v.y) < 30) arrive();
      if (!isOpen) return;
    } else if (mode === 'rest') {
      // thermal motion in the well, an Ornstein-Uhlenbeck process
      var theta = 6, amp = reduceMQ.matches || leaving ? 0 : 1.6;
      var k = amp * Math.sqrt(2 * theta * dt);
      noise.x += -theta * noise.x * dt + k * gauss();
      noise.y += -theta * noise.y * dt + k * gauss();
      p = { x: pos[here].x + noise.x, y: pos[here].y + noise.y };
    }

    trail.push({ x: p.x, y: p.y, t: now });
    while (trail.length && now - trail[0].t > 450) trail.shift();

    draw(now);
    raf = requestAnimationFrame(frame);
  }

  function draw(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.drawImage(contours, 0, 0, W, H);

    pos.forEach(function (q, i) {
      ctx.beginPath();
      ctx.arc(q.x, q.y, i === HERE ? 4 : 3, 0, Math.PI * 2);
      ctx.fillStyle = i === HERE ? ROPE : MIST;
      ctx.globalAlpha = i === HERE ? 1 : 0.8;
      ctx.fill();
    });

    var showTarget = (mode === 'drag' || mode === 'fly' || mode === 'hold' || leaving) && target >= 0;
    if (mode === 'drag' && proj) {
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = FOAM;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(proj.x, proj.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = FOAM;
      ctx.fill();
    }
    if (showTarget) {
      var g = pos[target];
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = ROPE;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    buttons.forEach(function (b, i) { b.classList.toggle('target', showTarget && i === target); });

    ctx.lineCap = 'round';
    for (var t = 1; t < trail.length; t++) {
      var age = (now - trail[t].t) / 450;
      ctx.globalAlpha = 0.7 * (1 - age);
      ctx.strokeStyle = ROPE;
      ctx.lineWidth = 2.4 * (1 - age) + 0.4;
      ctx.beginPath();
      ctx.moveTo(trail[t - 1].x, trail[t - 1].y);
      ctx.lineTo(trail[t].x, trail[t].y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = FOAM;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ROPE;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();

    var u = (p.x - cx) / rx, w = -(p.y - cy) / ry;
    var speed = Math.hypot(v.x / rx, v.y / ry);
    var text = 'r = (' + fmt(u) + ', ' + fmt(w) + ')   |v| = ' + speed.toFixed(2);
    if (showTarget) text += '   → ' + WELLS[target].name;
    readout.textContent = text;
  }
  function fmt(x) { return (x < 0 ? '−' : ' ') + Math.abs(x).toFixed(2); }

  /* ---------- Pointer ---------- */
  function velocity() {
    if (samples.length < 2) return { x: 0, y: 0 };
    var a = samples[0], b = samples[samples.length - 1];
    var dt = (b.t - a.t) / 1000;
    if (dt < 0.01) return { x: 0, y: 0 };
    return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
  }

  function beginDrag(id, x, y) {
    press.dragging = true;
    press.x0 = x;
    press.y0 = y;
    press.px = p.x;
    press.py = p.y;
    samples = [];
    mode = 'drag';
    map.classList.add('dragging');
    try { map.setPointerCapture(id); } catch (err) { /* pointer already gone */ }
  }

  function moveDrag(e) {
    p = {
      x: clamp(press.px + e.clientX - press.x0, 12, W - 12),
      y: clamp(press.py + e.clientY - press.y0, 12, H - 12)
    };
    samples.push({ t: e.timeStamp, x: p.x, y: p.y });
    while (samples.length && e.timeStamp - samples[0].t > 80) samples.shift();
    var vv = velocity();
    v = vv;
    proj = { x: p.x + vv.x * TAU, y: p.y + vv.y * TAU };
    target = pick(p.x, p.y, vv.x, vv.y);
  }

  map.addEventListener('pointerdown', function (e) {
    if (leaving || e.target.closest('.map-close')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (mode === 'fly') mode = 'hold';
    press = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dragging: false };
  });

  map.addEventListener('pointermove', function (e) {
    if (!press || e.pointerId !== press.id) return;
    if (!press.dragging) {
      if (Math.hypot(e.clientX - press.x0, e.clientY - press.y0) < SLOP) return;
      beginDrag(e.pointerId, e.clientX, e.clientY);
    }
    moveDrag(e);
  });

  function endPress(e, cancelled) {
    if (!press || e.pointerId !== press.id) return;
    map.classList.remove('dragging');
    if (press.dragging) {
      // velocity over the last 80ms of movement; zero if the pointer sat
      // still for a moment before lifting, so a deliberate placement doesn't fling
      var last = samples[samples.length - 1];
      var vv = !last || e.timeStamp - last.t > 100 ? { x: 0, y: 0 } : velocity();
      var s = Math.hypot(vv.x, vv.y);
      if (s > VMAX) { vv.x *= VMAX / s; vv.y *= VMAX / s; }
      v = vv;
      proj = null;
      flyTo(pick(p.x, p.y, vv.x, vv.y), false);
      if (!cancelled) {
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 60);
      }
    } else if (mode === 'hold') {
      mode = 'fly'; // a tap on a well (handled by click) may retarget it
    }
    press = null;
    samples = [];
  }
  map.addEventListener('pointerup', function (e) { endPress(e, false); });
  map.addEventListener('pointercancel', function (e) { endPress(e, true); });
  map.addEventListener('dragstart', function (e) { e.preventDefault(); });
  map.addEventListener('wheel', function (e) { e.preventDefault(); }, { passive: false });

  list.addEventListener('click', function (e) {
    var b = e.target.closest('.map-well');
    if (!b || suppressClick || leaving) return;
    flyTo(buttons.indexOf(b), true);
  });
  closeBtn.addEventListener('click', function () { close(); });

  /* ---------- Ways in ---------- */
  document.addEventListener('mapgesture', function (e) {
    e.preventDefault(); // tells the page navigator the map took the gesture
    open(e.detail);
  });

  document.querySelectorAll('.map-open').forEach(function (b) {
    b.hidden = false;
    b.addEventListener('click', function (e) { open({ keyboard: e.detail === 0 }); });
  });

  document.addEventListener('keydown', function (e) {
    if (isOpen) {
      if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        close();
      } else if (e.key === 'Tab') {
        var f = buttons.concat([closeBtn]);
        var i = f.indexOf(document.activeElement);
        e.preventDefault();
        var n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i + 1) % f.length;
        f[n].focus();
      }
      return;
    }
    if ((e.key === 'm' || e.key === 'M') && !e.metaKey && !e.ctrlKey && !e.altKey &&
        !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      open({ keyboard: true });
    }
  });

  window.addEventListener('resize', function () {
    if (!isOpen) return;
    layout();
    if (mode === 'rest') p = { x: pos[here].x, y: pos[here].y };
  });
})();
