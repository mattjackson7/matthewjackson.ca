/* Scroll stories: a figure pinned beside a column of short steps. As each
   step scrolls past, the figure is redrawn as a pure function of scroll
   position, so scrolling down plays the math forward and scrolling up
   rewinds it. Nothing runs on a timer.

   Markup:
     <div class="story" data-scene="cholesky">
       <div class="stage"><canvas></canvas><p class="stage-cap"></p></div>
       <div class="steps"><div class="step">...</div> ...</div>
     </div>

   Scenes register themselves:
     Story.scene('cholesky', {
       draw: function (ctx, s) { ... },   // s = { w, h, step, p, t, steps }
       caption: function (s) { return 'html'; }  // optional
     });
   step is the step in view, p its progress from 0 to 1, t = step + p. */
(function () {
  var scenes = {};
  var stories = [];
  var raf = 0;

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function init(el) {
    var def = scenes[el.getAttribute('data-scene')];
    if (!def) return;
    var canvas = el.querySelector('.stage canvas');
    var cap = el.querySelector('.stage-cap');
    var steps = Array.prototype.slice.call(el.querySelectorAll('.step'));
    var story = { el: el, def: def, canvas: canvas, ctx: canvas.getContext('2d'), cap: cap, steps: steps,
      w: 0, h: 0, dpr: 1, t: -1, active: -1, capHtml: '' };
    stories.push(story);
    size(story);
  }

  function size(s) {
    s.dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = s.canvas.getBoundingClientRect();
    s.w = r.width;
    s.h = r.height;
    s.canvas.width = Math.round(s.w * s.dpr);
    s.canvas.height = Math.round(s.h * s.dpr);
    s.t = -1; // force a redraw
  }

  // where the reader is: the step under a line partway down the viewport
  function progress(s) {
    var narrow = window.innerWidth < 900;
    var line = window.innerHeight * (narrow ? 0.8 : 0.55);
    var t = 0;
    for (var i = 0; i < s.steps.length; i++) {
      var r = s.steps[i].getBoundingClientRect();
      if (line >= r.top) t = i + clamp((line - r.top) / r.height, 0, 1);
    }
    return clamp(t, 0, s.steps.length - 1e-4);
  }

  function render(s) {
    var r = s.el.getBoundingClientRect();
    if (r.bottom < -50 || r.top > window.innerHeight + 50) return;
    var t = progress(s);
    if (Math.abs(t - s.t) < 1e-4) return;
    s.t = t;
    var step = Math.floor(t), info = { w: s.w, h: s.h, step: step, p: t - step, t: t, steps: s.steps.length };
    if (step !== s.active) {
      s.steps.forEach(function (el, i) { el.classList.toggle('active', i === step); });
      s.active = step;
    }
    var c = s.ctx;
    c.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    c.clearRect(0, 0, s.w, s.h);
    c.save();
    s.def.draw(c, info);
    c.restore();
    if (s.cap && s.def.caption) {
      var html = s.def.caption(info) || '';
      if (html !== s.capHtml) { s.cap.innerHTML = html; s.capHtml = html; }
    }
  }

  function frame() {
    raf = 0;
    stories.forEach(render);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function start() {
    document.querySelectorAll('.story').forEach(init);
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', function () { stories.forEach(size); kick(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { stories.forEach(function (s) { s.t = -1; }); kick(); });
    kick();
  }

  window.Story = {
    scene: function (name, def) { scenes[name] = def; },
    start: start
  };
})();
