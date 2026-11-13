/* Contact page: a string under tension, solved with the damped wave equation
   u_tt = c^2 u_xx - gamma u_t by finite differences. Moving the cursor (or a
   finger) through the string drags it, and letting go plucks it. It starts
   with one pluck so the page arrives ringing. */
(function () {
  var cv = document.getElementById('string');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ACCENT = '#ff6a55', MIST = '#8fb1bd';

  var N = 160;                 // points along the string
  var C2 = 0.24;               // c^2 dt^2 / dx^2, kept under 1 for stability
  var GAMMA = 0.006;           // damping per step
  var SUB = 4;                 // substeps per frame
  var GRAB = 26;               // px within which a pointer catches the string
  var u = new Float32Array(N), prev = new Float32Array(N), next = new Float32Array(N);
  var w = 0, h = 0, dpr = 1, raf = 0, visible = true;
  var pointer = null; // { i, y } while the string is caught

  function base() { return h * 0.55; }

  function pluck(at, amp) {
    for (var i = 1; i < N - 1; i++) {
      var x = i / (N - 1);
      u[i] = x < at ? amp * x / at : amp * (1 - x) / (1 - at);
      prev[i] = u[i];
    }
  }

  function step() {
    for (var i = 1; i < N - 1; i++) {
      next[i] = (2 - GAMMA) * u[i] - (1 - GAMMA) * prev[i] + C2 * (u[i - 1] - 2 * u[i] + u[i + 1]);
    }
    next[0] = 0; next[N - 1] = 0;
    // a caught string is held at the pointer, shaped like a pulled string
    if (pointer) {
      var k = pointer.i, y = pointer.y;
      for (i = 1; i < N - 1; i++) {
        var x = i / (N - 1), at = k / (N - 1);
        var shape = x < at ? x / at : (1 - x) / (1 - at);
        next[i] = next[i] * 0.6 + y * shape * 0.4;
      }
    }
    var t = prev; prev = u; u = next; next = t;
  }

  function energy() {
    var e = 0;
    for (var i = 0; i < N; i++) e += Math.abs(u[i] - prev[i]) + Math.abs(u[i]) * 0.01;
    return e;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var y0 = base(), dx = w / (N - 1);
    // the fixed ends
    ctx.fillStyle = MIST;
    ctx.fillRect(0, y0 - 10, 3, 20);
    ctx.fillRect(w - 3, y0 - 10, 3, 20);
    // the rest position
    ctx.strokeStyle = 'rgba(143,177,189,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(w, y0); ctx.stroke();
    // the string
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var i = 0; i < N; i++) {
      var y = y0 + u[i];
      if (i === 0) ctx.moveTo(0, y); else ctx.lineTo(i * dx, y);
    }
    ctx.stroke();
  }

  function frame() {
    raf = 0;
    for (var s = 0; s < SUB; s++) step();
    draw();
    if (visible && (pointer || energy() > 0.4)) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && !reduce) raf = requestAnimationFrame(frame); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = cv.getBoundingClientRect();
    w = r.width; h = r.height;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    draw();
    kick();
  }

  // the pointer catches the string when it passes close to it, and lets go
  // (plucking it) once it pulls too far or leaves
  window.addEventListener('pointermove', function (e) {
    if (reduce) return;
    var r = cv.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top - base();
    if (x < 4 || x > r.width - 4 || e.clientY < r.top || e.clientY > r.bottom) { pointer = null; return; }
    var i = Math.max(1, Math.min(N - 2, Math.round(x / r.width * (N - 1))));
    if (pointer) {
      if (Math.abs(y) > Math.min(90, h * 0.4)) { pointer = null; kick(); return; }
      pointer.i = i;
      pointer.y = y;
    } else if (Math.abs(y - u[i]) < GRAB) {
      pointer = { i: i, y: y };
    }
    kick();
  }, { passive: true });
  cv.parentElement.addEventListener('pointerleave', function () { pointer = null; kick(); });

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) kick();
    }).observe(cv);
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
  else window.addEventListener('resize', resize);

  resize();
  if (!reduce) { pluck(0.3, -46); kick(); } else draw();
})();
