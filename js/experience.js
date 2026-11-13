/* Experience page: the timeline navigator, a role timeline that lights up the
   role being read (tap a bar to jump to it), and a skills network linking each
   role, and the projects, to the skills they used. */
(function () {
  var COLORS = { mfe: '#7cc4ff', nbf: '#ffb14e', dat: '#5fd3b0', ta: '#c39bff', bsc: '#ff6a55', proj: '#ff8fb8' };
  var ICONS = { mfe: 'cap', nbf: 'briefcase', dat: 'chip', ta: 'board', bsc: 'atom', proj: 'spark' };
  // dates as decimal years; the page runs newest first
  var ROLES = [
    { id: 'mfe', label: 'Western MFE', name: 'Western University, MFE', start: 2026.67, end: 2027.92 },
    { id: 'nbf', label: 'National Bank', name: 'National Bank Financial', start: 2026.33, end: 2026.67 },
    { id: 'dat', label: 'AI trainer', name: 'Data Annotation Tech', start: 2025.92, end: 2026.33 },
    { id: 'ta', label: 'Teaching', name: 'Teaching assistant, Guelph', start: 2023.67, end: 2025.33 },
    { id: 'bsc', label: 'Guelph BSc', name: 'BSc Honours Physics, Guelph', start: 2021.67, end: 2026.33 }
  ];
  var now = new Date();
  var NOW = now.getFullYear() + now.getMonth() / 12;
  var LONGEST = Math.max.apply(null, ROLES.map(function (r) { return r.end - r.start; }));
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- Navigator: a timeline, each role a bar as long as it lasted ---------- */
  if (window.PathNav) {
    PathNav.create({
      name: 'Timeline',
      sections: [{ id: 'overview', label: 'Overview' }]
        .concat(ROLES.map(function (r) { return { id: r.id, label: r.label }; }))
        .concat([{ id: 'skills', label: 'Skills' }]),
      cross: function () { return 0.1; },
      decor: function (d) {
        ROLES.forEach(function (r, i) {
          var a = d.a(i + 1), len = (r.end - r.start) / LONGEST;
          var p = d.toPx(a, 0.2), q = d.toPx(a, 0.2 + 0.72 * len);
          d.el('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: COLORS[r.id], 'stroke-opacity': 0.85, 'stroke-width': 5, 'stroke-linecap': 'round' }, d.g);
        });
      }
    });
  }

  /* ---------- The role timeline ---------- */
  var svg = document.getElementById('gantt');
  var active = null;
  if (svg) {
    var Y0 = 2021.5, Y1 = 2028.1, ROW = 48, TOP = 14, AXIS = 30;
    var bars = {};
    var el = function (tag, attrs, parent, text) {
      var n = document.createElementNS(NS, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      if (text) n.textContent = text;
      (parent || svg).appendChild(n);
      return n;
    };
    var draw = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      bars = {};
      var w = svg.getBoundingClientRect().width || 800;
      var h = TOP + ROLES.length * ROW + AXIS;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      svg.setAttribute('height', h);
      var L = 8, R = 12;
      var X = function (t) { return L + (t - Y0) / (Y1 - Y0) * (w - L - R); };
      for (var y = 2022; y <= 2028; y++) {
        el('line', { 'class': 'grid', x1: X(y), x2: X(y), y1: TOP - 6, y2: h - AXIS + 4 });
        el('text', { x: X(y), y: h - 8, 'text-anchor': 'middle' }, null, String(y));
      }
      ROLES.forEach(function (r, i) {
        var yy = TOP + i * ROW + 24, col = COLORS[r.id];
        var a = el('a', { href: '#' + r.id, 'class': 'gbar', 'data-id': r.id, 'aria-label': r.name, style: 'color:' + col });
        var x0 = X(r.start), x1 = X(r.end), right = x0 > w * 0.6;
        el('rect', { x: x0 - 4, y: yy - 20, width: Math.max(4, x1 - x0) + 8, height: 34, fill: 'transparent' }, a);
        el('rect', { 'class': 'bar', x: x0, y: yy, width: Math.max(6, x1 - x0), height: 10, rx: 5, style: 'fill:' + col }, a);
        var ix = right ? x1 - 16 : x0;
        var u = el('use', { href: '#i-' + ICONS[r.id], x: ix, y: yy - 21, width: 16, height: 16, color: col }, a);
        u.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#i-' + ICONS[r.id]);
        el('text', { 'class': 'lbl', x: right ? ix - 6 : ix + 22, y: yy - 8, 'text-anchor': right ? 'end' : 'start' }, a, r.name);
        bars[r.id] = a;
      });
      if (NOW > Y0 && NOW < Y1) {
        el('line', { x1: X(NOW), x2: X(NOW), y1: TOP - 6, y2: h - AXIS + 4, stroke: '#eaf6f8', 'stroke-dasharray': '3 4', 'stroke-opacity': 0.7 });
        el('text', { x: X(NOW) + 4, y: TOP, 'class': 'now' }, null, 'today');
      }
      setActive(active, true);
    };
    var setActive = function (id, force) {
      if (id === active && !force) return;
      active = id;
      for (var k in bars) bars[k].classList.toggle('on', k === id);
      svg.classList.toggle('has-on', !!id);
    };
    draw();
    window.addEventListener('resize', draw);
    // the role nearest the reading line is the active one
    var sections = ROLES.map(function (r) { return document.getElementById(r.id); });
    var onScroll = function () {
      var line = window.innerHeight * 0.45, best = null;
      sections.forEach(function (s, i) {
        var r = s.getBoundingClientRect();
        if (r.top < line && r.bottom > line * 0.4) best = ROLES[i].id;
      });
      setActive(best);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- The skills network ---------- */
  var cv = document.getElementById('skillnet');
  if (!cv || !window.Viz) return;
  var V = Viz, FOAM = V.FOAM, MIST = V.MIST;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var read = document.getElementById('skill-read');
  var LEFT = [
    { id: 'mfe', name: 'Western MFE' }, { id: 'nbf', name: 'National Bank' }, { id: 'dat', name: 'AI trainer' },
    { id: 'ta', name: 'Teaching' }, { id: 'bsc', name: 'Physics BSc' }, { id: 'proj', name: 'Projects' }
  ];
  var SKILLS = ['Python', 'PyTorch', 'NumPy / SciPy', 'Streamlit', 'SQL', 'Excel / VBA', 'PowerShell', 'Bloomberg',
    'Monte Carlo', 'Derivatives', 'Econometrics', 'Portfolio risk', 'Optimization', 'AI agents', 'LLM evaluation', 'Mathematics', 'Physics', 'Teaching'];
  var LINKS = {
    mfe: ['Econometrics', 'Derivatives', 'Bloomberg'],
    nbf: ['Python', 'Excel / VBA', 'PowerShell', 'Portfolio risk', 'AI agents'],
    dat: ['LLM evaluation', 'Mathematics', 'Physics', 'Python'],
    ta: ['Teaching', 'Mathematics', 'Physics'],
    bsc: ['Physics', 'Mathematics'],
    proj: ['Python', 'PyTorch', 'NumPy / SciPy', 'Streamlit', 'SQL', 'Monte Carlo', 'Derivatives', 'Portfolio risk', 'Optimization', 'Econometrics']
  };
  var w = 0, h = 0, dpr = 1, hover = null, auto = 0, t0 = 0, raf = 0, visible = false;
  var nodesL = [], nodesR = [], pulses = [], MARKS = {};
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = cv.getBoundingClientRect();
    w = r.width;
    var rowR = w < 520 ? 22 : 25;
    h = Math.max(LEFT.length * 50, SKILLS.length * rowR) + 30;
    cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var lx = 6, rx = w - (w < 520 ? 132 : 168);
    nodesL = LEFT.map(function (n, i) { return { n: n, x: lx, y: 15 + (i + 0.5) * (h - 30) / LEFT.length }; });
    nodesR = SKILLS.map(function (s, i) { return { s: s, x: rx, y: 15 + (i + 0.5) * (h - 30) / SKILLS.length }; });
  }
  function linkedSkills(id) { return LINKS[id] || []; }
  function rolesFor(skill) { return LEFT.filter(function (n) { return LINKS[n.id].indexOf(skill) >= 0; }).map(function (n) { return n.id; }); }
  function focus() { return hover || (reduce ? null : LEFT[auto % LEFT.length].id); }
  function drawNet(nowT) {
    var c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    var f = focus(), fSkill = f && f.indexOf('skill:') === 0 ? f.slice(6) : null, fRole = fSkill ? null : f;
    var litRoles = fSkill ? rolesFor(fSkill) : fRole ? [fRole] : [];
    var lw = w < 520 ? 104 : 128;
    // links
    nodesL.forEach(function (L) {
      LINKS[L.n.id].forEach(function (sk) {
        var R = nodesR[SKILLS.indexOf(sk)], on = litRoles.indexOf(L.n.id) >= 0 && (!fSkill || sk === fSkill);
        var x0 = L.x + lw, x1 = R.x - 6, mx = (x0 + x1) / 2;
        V.ga(c, on ? 0.9 : f ? 0.07 : 0.22);
        c.strokeStyle = COLORS[L.n.id];
        c.lineWidth = on ? 2 : 1;
        c.beginPath(); c.moveTo(x0, L.y); c.bezierCurveTo(mx, L.y, mx, R.y, x1, R.y); c.stroke();
        // a pulse travelling along each lit link
        if (on && !reduce) {
          var t = ((nowT / 1400) + (R.y / h)) % 1, u = 1 - t;
          var px = u * u * u * x0 + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * x1;
          var py = u * u * u * L.y + 3 * u * u * t * L.y + 3 * u * t * t * R.y + t * t * t * R.y;
          V.dot(c, px, py, 2.6, COLORS[L.n.id], {});
        }
      });
    });
    // role nodes
    nodesL.forEach(function (L) {
      var on = litRoles.indexOf(L.n.id) >= 0, col = COLORS[L.n.id];
      V.ga(c, f && !on ? 0.4 : 1);
      c.fillStyle = on ? col : 'rgba(13,52,71,0.9)';
      c.strokeStyle = col; c.lineWidth = 1.5;
      roundRect(c, L.x, L.y - 14, lw, 28, 14); c.fill(); c.stroke();
      V.text(c, L.n.name, L.x + 14, L.y + 1, { size: w < 520 ? 10.5 : 12, color: on ? '#07222e' : FOAM, base: 'middle', weight: 500, alpha: f && !on ? 0.5 : 1 });
    });
    // skill nodes
    var litSkills = fSkill ? [fSkill] : fRole ? linkedSkills(fRole) : [];
    nodesR.forEach(function (R) {
      var on = litSkills.indexOf(R.s) >= 0;
      var col = fRole ? COLORS[fRole] : FOAM;
      V.dot(c, R.x - 6, R.y, on ? 4 : 2.6, on ? col : MIST, { alpha: f && !on ? 0.4 : 1 });
      var mk = window.Icons && Icons.tool(R.s), ic = mk && (MARKS[mk[0]] || (MARKS[mk[0]] = Icons.path(mk[0])));
      if (ic) {
        var sz = w < 520 ? 13 : 15;
        c.save();
        c.translate(R.x + 2, R.y - sz / 2); c.scale(sz / 24, sz / 24);
        V.ga(c, f && !on ? 0.35 : on ? 1 : 0.8);
        c.strokeStyle = mk[1]; c.lineWidth = 1.8; c.lineCap = c.lineJoin = 'round';
        c.stroke(ic);
        c.restore();
      }
      V.text(c, R.s, R.x + (w < 520 ? 19 : 22), R.y + 1, { size: w < 520 ? 10 : 11.5, color: on ? FOAM : MIST, base: 'middle', weight: on ? 500 : 400, alpha: f && !on ? 0.45 : 1 });
    });
  }
  function roundRect(c, x, y, ww, hh, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + ww - r, y); c.arcTo(x + ww, y, x + ww, y + r, r);
    c.lineTo(x + ww, y + hh - r); c.arcTo(x + ww, y + hh, x + ww - r, y + hh, r);
    c.lineTo(x + r, y + hh); c.arcTo(x, y + hh, x, y + hh - r, r);
    c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
  }
  var tiles = [].slice.call(document.querySelectorAll('.tools li'));
  tiles.forEach(function (t) {
    var sk = t.getAttribute('data-skill');
    if (!sk) return;
    t.setAttribute('tabindex', '0');
    var dots = rolesFor(sk).map(function (id) { return '<i style="--r:' + COLORS[id] + '"></i>'; }).join('');
    t.insertAdjacentHTML('beforeend', '<span class="used" aria-hidden="true">' + dots + '</span>');
    function on() { hover = 'skill:' + sk; caption(); kick(); }
    t.addEventListener('pointerenter', on);
    t.addEventListener('focus', on);
    t.addEventListener('pointerleave', function () { hover = null; t0 = 0; caption(); kick(); });
    t.addEventListener('click', function () { on(); cv.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); });
  });
  function lightTiles(f) {
    var want = !f ? [] : f.indexOf('skill:') === 0 ? [f.slice(6)] : linkedSkills(f);
    tiles.forEach(function (t) {
      var on = want.indexOf(t.getAttribute('data-skill')) >= 0;
      t.classList.toggle('on', on);
    });
    [].forEach.call(document.querySelectorAll('.tools'), function (u) { u.classList.toggle('has-on', !!f && hover !== null); });
  }
  function caption() {
    lightTiles(focus());
    if (!read) return;
    var f = focus();
    if (!f) { read.textContent = 'Roles and projects on the left, skills on the right.'; return; }
    if (f.indexOf('skill:') === 0) {
      var sk = f.slice(6), rs = rolesFor(sk).map(function (id) { return LEFT.filter(function (n) { return n.id === id; })[0].name; });
      read.innerHTML = '<b>' + sk + '</b>: ' + rs.join(', ') + '.';
    } else {
      var n = LEFT.filter(function (x) { return x.id === f; })[0];
      read.innerHTML = '<b>' + n.name + '</b>: ' + linkedSkills(f).join(', ') + '.';
    }
  }
  function frame(nowT) {
    raf = 0;
    if (!t0) t0 = nowT;
    if (!hover && !reduce) {
      var a = Math.floor((nowT - t0) / 2600);
      if (a !== auto) { auto = a; caption(); }
    }
    drawNet(nowT);
    if (visible && !reduce) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function hit(e) {
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, lw = w < 520 ? 104 : 128;
    for (var i = 0; i < nodesL.length; i++) if (x >= nodesL[i].x && x <= nodesL[i].x + lw && Math.abs(y - nodesL[i].y) < 16) return nodesL[i].n.id;
    for (i = 0; i < nodesR.length; i++) if (x >= nodesR[i].x - 14 && Math.abs(y - nodesR[i].y) < 11) return 'skill:' + nodesR[i].s;
    return null;
  }
  cv.addEventListener('pointermove', function (e) { var hv = hit(e); if (hv !== hover) { hover = hv; caption(); kick(); } });
  cv.addEventListener('pointerleave', function () { hover = null; t0 = 0; caption(); kick(); });
  cv.addEventListener('pointerdown', function (e) { hover = hit(e); caption(); kick(); });
  layout();
  window.addEventListener('resize', function () { layout(); kick(); });
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(cv);
  } else visible = true;
  caption();
  kick();
})();
