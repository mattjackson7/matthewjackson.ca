/* Hero: a Monte Carlo simulation of geometric Brownian motion,
   dS = mu S dt + sigma S dW, drawn across a pool of lane ropes.
   The random shocks are fixed once, so changing sigma reshapes the
   same paths instead of rolling new ones. */
(function () {
  var canvas = document.getElementById('water');
  var hero = document.getElementById('top');
  var sigmaOut = document.getElementById('sigma');
  var hint = document.getElementById('hint');
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  if (!canvas || !hero) return;

  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover)').matches;
  if (!canHover && hint) hint.hidden = true;

  var PATHS = 64;       // number of simulated paths
  var STEPS = 260;      // time steps across the width of the page
  var MU = 0.07;        // annual drift
  var BASE_SIGMA = 0.22;
  var DRAW_MS = 4200;   // how long the opening swim takes
  var LANES = 9;        // an odd count keeps the starting level mid-lane

  var FOAM = '#eaf6f8';
  var ROPE = '#ff6a55';
  var HIGHLIGHT = {};
  [3, 17, 29, 44, 57].forEach(function (i) { HIGHLIGHT[i] = true; });

  // standard normal shocks (Box-Muller), generated once
  function gauss() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  var shocks = new Float32Array(PATHS * STEPS);
  for (var s = 0; s < shocks.length; s++) shocks[s] = gauss();

  var w = 0, h = 0, dpr = 1;
  var sigma = BASE_SIGMA, target = BASE_SIGMA;
  var shown = reduceMotion ? STEPS : 0;
  var startTime = 0, raf = 0;

  // lane ropes are drawn once per resize onto a hidden canvas
  var lanes = document.createElement('canvas');

  function drawLanes() {
    lanes.width = canvas.width;
    lanes.height = canvas.height;
    var l = lanes.getContext('2d');
    l.setTransform(dpr, 0, 0, dpr, 0, 0);
    var endZone = Math.min(140, w * 0.1);
    for (var n = 1; n < LANES; n++) {
      var y = Math.round((h * n) / LANES) + 0.5;
      for (var x = 6, i = 0; x < w; x += 14, i++) {
        var atEnd = x < endZone || x > w - endZone;
        var red = atEnd && i % 2 === 0;
        l.globalAlpha = atEnd ? 0.6 : 0.2;
        l.fillStyle = red ? ROPE : FOAM;
        l.beginPath();
        l.arc(x, y, 2.2, 0, Math.PI * 2);
        l.fill();
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.drawImage(lanes, 0, 0, w, h);

    var dt = 1 / STEPS;
    var drift = (MU - 0.5 * sigma * sigma) * dt;
    var vol = sigma * Math.sqrt(dt);
    var y0 = h * 0.5;
    var scale = Math.min(h, 860) * 0.62;
    var xs = w / STEPS;
    var last = Math.min(STEPS, Math.floor(shown));
    var heads = [];

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < PATHS; i++) {
        var hi = !!HIGHLIGHT[i];
        if ((pass === 1) !== hi) continue;
        ctx.beginPath();
        ctx.moveTo(0, y0);
        var acc = 0, x = 0, y = y0;
        var base = i * STEPS;
        for (var k = 0; k < last; k++) {
          acc += drift + vol * shocks[base + k];
          x = (k + 1) * xs;
          y = y0 - acc * scale;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = hi ? ROPE : FOAM;
        ctx.globalAlpha = hi ? 0.9 : 0.12;
        ctx.lineWidth = hi ? 1.8 : 1;
        ctx.stroke();
        if (hi && last > 0) heads.push(x, y);
      }
    }

    // the expected path, exp(mu t)
    if (last > 0) {
      ctx.beginPath();
      ctx.moveTo(0, y0);
      for (var m = 0; m < last; m++) {
        ctx.lineTo((m + 1) * xs, y0 - MU * (m + 1) * dt * scale);
      }
      ctx.setLineDash([6, 7]);
      ctx.strokeStyle = FOAM;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // swimmer heads
    ctx.globalAlpha = 1;
    for (var d = 0; d < heads.length; d += 2) {
      ctx.fillStyle = FOAM;
      ctx.beginPath();
      ctx.arc(heads[d], heads[d + 1], 4.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ROPE;
      ctx.beginPath();
      ctx.arc(heads[d], heads[d + 1], 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    raf = 0;
    if (!startTime) startTime = now;
    if (shown < STEPS) {
      shown = STEPS * ease(Math.min(1, (now - startTime) / DRAW_MS));
    }
    var diff = target - sigma;
    if (reduceMotion || Math.abs(diff) < 0.0005) sigma = target;
    else sigma += diff * 0.12;

    render();
    if (sigmaOut) sigmaOut.textContent = sigma.toFixed(2);
    if (shown < STEPS || sigma !== target) raf = requestAnimationFrame(frame);
  }

  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLanes();
    kick();
  }

  // pointer height sets volatility: top of the hero is stormy, bottom is calm
  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    var y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    target = 0.08 + (1 - y) * 0.5;
    kick();
  });
  hero.addEventListener('pointerleave', function () {
    target = BASE_SIGMA;
    kick();
  });

  if (window.ResizeObserver) new ResizeObserver(resize).observe(hero);
  else window.addEventListener('resize', resize);
  resize();
})();
