/* Education: a term-by-term course map and small live demos from the courses.
   Every demo draws on a canvas sized to its box; animated ones only run while on screen. */
(function () {
  'use strict';
  var FOAM = '#eaf6f8', MIST = '#8fb1bd', LINE = 'rgba(143,177,189,0.22)', DEEP = '#07222e', ROPE = '#ff6a55';
  var MONO = '"IBM Plex Mono", ui-monospace, monospace';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- courses (grades left off on purpose) ---------- */
  var SUBJ = {
    phys: { name: 'Physics', c: '#7cc4ff', sec: 'physics' },
    math: { name: 'Mathematics and statistics', c: '#c39bff', sec: 'math' },
    econ: { name: 'Economics and finance', c: '#ffd166', sec: 'econ' },
    bio: { name: 'Biology and chemistry', c: '#5fd3b0', sec: 'bio' },
    cs: { name: 'Computing', c: '#ff8a5c', sec: 'beyond' },
    arts: { name: 'Electives', c: '#8fb1bd', sec: 'beyond' }
  };
  var C = [
    ['BIOL1070', 'Discovering Biodiversity (transfer credit)', 'F21'],
    ['BIOL1080', 'Biological Concepts of Health', 'F21'], ['CHEM1040', 'General Chemistry I', 'F21'], ['MATH1080', 'Elements of Calculus I', 'F21'],
    ['MATH1160', 'Linear Algebra I', 'F21'], ['PHYS1080', 'Physics for Life Sciences', 'F21'],
    ['BIOL1090', 'Introduction to Molecular and Cell Biology', 'W22'], ['CHEM1050', 'General Chemistry II', 'W22'], ['CIS1200', 'Introduction to Computing', 'W22'],
    ['MATH1210', 'Calculus II', 'W22'], ['PHYS1070', 'Physics for Life Sciences II', 'W22'],
    ['STAT2040', 'Statistics I', 'S22'],
    ['BIOC2580', 'Introduction to Biochemistry', 'F22'], ['MATH2000', 'Proofs, Sets, and Numbers', 'F22'], ['MATH2200', 'Advanced Calculus I', 'F22'],
    ['MBG2040', 'Foundations of Molecular Biology and Genetics', 'F22'], ['PSYC1000', 'Introduction to Psychology', 'F22'],
    ['BIOM3200', 'Biomedical Physiology', 'W23'], ['MATH2210', 'Advanced Calculus II', 'W23'], ['MATH3260', 'Complex Analysis', 'W23'],
    ['MCB2050', 'Molecular Biology of the Cell', 'W23'], ['NUTR3210', 'Fundamentals of Nutrition', 'W23'],
    ['ECON1050', 'Introductory Microeconomics', 'S23'], ['LING1000', 'Introduction to Linguistics', 'S23'],
    ['BIOC3560', 'Structure and Function in Biochemistry', 'F23'], ['BIOM3090', 'Principles of Pharmacology', 'F23'],
    ['MATH2270', 'Applied Differential Equations', 'F23'], ['PHYS2330', 'Electricity and Magnetism I', 'F23'],
    ['CIS1500', 'Introduction to Programming', 'W24'], ['MATH2130', 'Numerical Methods', 'W24'], ['PHYS2180', 'Experimental Techniques in Physics', 'W24'],
    ['PHYS2310', 'Mechanics I', 'W24'], ['PHYS2340', 'Electricity and Magnetism II', 'W24'],
    ['ECON1100', 'Introductory Macroeconomics', 'S24'], ['FIN2000', 'Introduction to Finance', 'S24'],
    ['ECON2310', 'Intermediate Microeconomics', 'F24'], ['MATH3130', 'Abstract Algebra', 'F24'], ['PHYS2240', 'Thermal Physics', 'F24'],
    ['PHYS3130', 'Mathematical Physics', 'F24'], ['PHYS3230', 'Quantum Mechanics I', 'F24'], ['PHYS3400', 'Advanced Mechanics', 'F24'],
    ['ECON3740', 'Introduction to Econometrics', 'W25'], ['MATH3100', 'Differential Equations II', 'W25'], ['NANO3600', 'Computational Methods in Materials Science', 'W25'],
    ['PHYS3000', 'Optics', 'W25'], ['PHYS4040', 'Quantum Mechanics II', 'W25'],
    ['ACCT1220', 'Introductory Financial Accounting', 'S25'], ['ECON2410', 'Intermediate Macroeconomics', 'S25'],
    ['ECON4700', 'Advanced Mathematical Economics', 'F25'], ['IPS3000', 'Science Communication', 'F25'], ['PHYS3510', 'Intermediate Laboratory', 'F25'],
    ['PHYS4180', 'Advanced Electromagnetic Theory', 'F25'], ['PHYS4240', 'Statistical Physics II', 'F25'],
    ['ECON3100', 'Game Theory', 'W26'], ['ECON3710', 'Advanced Microeconomics', 'W26'], ['PHYS4130', 'Subatomic Physics', 'W26'],
    ['PHYS4150', 'Solid State Physics', 'W26'], ['PHYS4500', 'Advanced Physics Laboratory', 'W26']
  ];
  // course -> the figure that demonstrates it (the hand-written ones on the page, or one built by def() in the edu-*.js files)
  var DEMO = { PHYS3230: 'qm', PHYS2330: 'field', PHYS2240: 'gas',
    MATH1160: 'linalg', MATH2130: 'numerics', STAT2040: 'clt' };
  ['PHYS1080', 'PHYS1070', 'PHYS2180', 'PHYS2310', 'PHYS2340', 'PHYS4240', 'PHYS3130', 'PHYS4040', 'PHYS3400', 'NANO3600', 'PHYS3000', 'PHYS3510', 'PHYS4180', 'PHYS4130', 'PHYS4150', 'PHYS4500']
    .forEach(function (k) { DEMO[k] = 'd-' + k; });
  ['ECON3100', 'ECON4700', 'ECON1050', 'ECON1100', 'ECON2310', 'ECON2410', 'ECON3740', 'ECON3710', 'FIN2000', 'ACCT1220'].forEach(function (k) { DEMO[k] = 'd-' + k; });
  ['BIOL1070', 'BIOL1080', 'CHEM1040', 'BIOL1090', 'CHEM1050', 'BIOC2580', 'MBG2040', 'BIOM3200', 'MCB2050', 'NUTR3210', 'BIOC3560', 'BIOM3090', 'CIS1200', 'CIS1500', 'PSYC1000', 'LING1000', 'IPS3000'].forEach(function (k) { DEMO[k] = 'd-' + k; });
  ['MATH1080', 'MATH1210', 'MATH2000', 'MATH2200', 'MATH2210', 'MATH3260', 'MATH2270', 'MATH3100', 'MATH3130'].forEach(function (k) { DEMO[k] = 'd-' + k; });
  function subjOf(code) {
    var p = code.replace(/[0-9]/g, '');
    if (p === 'PHYS' || p === 'NANO' || code === 'IPS3000') return 'phys';
    if (p === 'MATH' || p === 'STAT') return 'math';
    if (p === 'ECON' || p === 'FIN' || p === 'ACCT') return 'econ';
    if (p === 'CIS') return 'cs';
    if (p === 'PSYC' || p === 'LING' || p === 'IPS') return 'arts';
    return 'bio';
  }
  function pretty(code) { return code.replace(/([A-Z]+)([0-9]+)/, '$1 $2'); }
  var TERMS = ['F21', 'W22', 'S22', 'F22', 'W23', 'S23', 'F23', 'W24', 'S24', 'F24', 'W25', 'S25', 'F25', 'W26'];
  function termName(t) { return t === 'CR' ? 'Transfer credit' : ({ F: 'Fall', W: 'Winter', S: 'Summer' })[t[0]] + ' 20' + t.slice(1); }
  function termShort(t) { return t === 'CR' ? 'Credit' : ({ F: 'Fall', W: 'Win', S: 'Sum' })[t[0]] + ' ’' + t.slice(1); }


  /* ---------- scroll and pointer drivers ---------- */
  var scrollFns = [], ticking = false;
  function onScroll(fn) { scrollFns.push(fn); }
  function tick() { ticking = false; scrollFns.forEach(function (f) { f(); }); }
  function kick() { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  // 0 when the element's middle is near the bottom of the screen, 1 when it is near the top
  // scroll position through a demo, 0 to 1: empty the moment its gauge first comes fully into view
  // at the bottom of the screen, full just as the course title is about to pass under the top bar
  function progress(el, a, b) {
    var vh = window.innerHeight, fig = el.closest && el.closest('figure'),
        drv = fig && fig.querySelector('.drive'), ttl = fig && fig.querySelector('.demo-course');
    var p, start = 0, end = 0;
    if (drv && ttl && drv.offsetParent) {
      // how far the page still has to scroll to reach each point (both shrink as you scroll down)
      start = drv.getBoundingClientRect().bottom - vh; end = ttl.getBoundingClientRect().top - navH();
    }
    if (end > start + 40) p = clamp01(-start / (end - start));
    else {   // no gauge, or a demo too tall for the screen: the old window around the middle of the canvas
      var r = el.getBoundingClientRect(), m = r.top + r.height / 2;
      p = clamp01(((a || 0.85) * vh - m) / (((a || 0.85) - (b || 0.2)) * vh));
    }
    return p * p * (3 - 2 * p);
  }
  function navH() { var n = document.querySelector('.nav a.brand'); return n ? n.getBoundingClientRect().bottom + 12 : 64; }
  // a read-only gauge that shows what scrolling is doing
  function gauge(id) {
    var g = document.getElementById(id), out = g && g.querySelector('output');
    return function (p, txt) { if (!g) return; g.style.setProperty('--p', p.toFixed(3)); out.textContent = txt; };
  }
  // pointer (or finger) position over a canvas in device pixels, null once it leaves
  function hover(st, cb, tap) {
    var cv = st.cv;
    function pos(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * st.d, (e.clientY - r.top) * st.d]; }
    cv.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || e.buttons) cb(pos(e)); });
    cv.addEventListener('pointerdown', function (e) { var p = pos(e); if (tap) tap(p); cb(p); });
    cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') cb(null); });
  }

  /* ---------- prerequisite tree ----------
     Links are the prerequisites listed in the Guelph undergraduate calendar, kept only where both courses
     are on the transcript and the prerequisite came in an earlier term. */
  var PRE = {"FIN2000":["ECON1050","MATH1080","STAT2040"],"STAT2040":["MATH1080"],"MCB2050":["BIOC2580","MBG2040"],"NUTR3210":["BIOC2580"],"BIOC2580":["CHEM1050"],"BIOC3560":["BIOC2580"],"PHYS2180":["PHYS2330"],"PHYS2240":["MATH1210","PHYS1080"],"PHYS2310":["MATH2270","PHYS1080"],"PHYS2330":["MATH1210","PHYS1070"],"PHYS2340":["PHYS2330"],"PHYS3000":["PHYS2340","PHYS3130"],"PHYS3130":["MATH2200","PHYS2310","PHYS2340"],"PHYS3230":["MATH2270","PHYS2330"],"PHYS3400":["MATH2270","PHYS2310"],"PHYS3510":["PHYS2180"],"PHYS4040":["PHYS3230"],"PHYS4130":["PHYS4040"],"PHYS4150":["PHYS4040","PHYS4240"],"PHYS4180":["PHYS2340"],"PHYS4240":["PHYS2240","PHYS3230"],"PHYS4500":["PHYS3510"],"MBG2040":["BIOL1090"],"ECON2310":["ECON1050","MATH1080"],"ECON2410":["ECON1100","MATH1080"],"ECON3100":["ECON2310","ECON2410","MATH1210"],"ECON3710":["ECON2310","MATH1210"],"ECON3740":["ECON1100","ECON1050","STAT2040","MATH1210"],"ECON4700":["ECON3740"],"BIOM3090":["BIOC2580","BIOM3200"],"BIOM3200":["BIOC2580"],"NANO3600":["MATH2270","PHYS3230"],"MATH1210":["MATH1080"],"MATH2000":["MATH1080","MATH1160"],"MATH2130":["MATH1210"],"MATH2200":["MATH1210"],"MATH2210":["MATH2200"],"MATH2270":["MATH1160","MATH1210"],"MATH3100":["MATH2270","MATH1160"],"MATH3130":["MATH1160","MATH2000"],"MATH3260":["MATH2200"],"CHEM1050":["CHEM1040"]};
  // one-line summaries, paraphrased from the calendar descriptions
  var ABOUT = { "BIOL1070": "Evolution, ecology, and where the diversity of living things comes from.", "BIOL1080": "Human physiology as the biological basis of health and illness.", "CHEM1040": "Bonding, stoichiometry, equilibria, acids, bases and buffers, and a first look at organic chemistry.", "MATH1080": "Single-variable calculus, sequences, series and difference equations, built around models from biology.", "MATH1160": "Vectors, matrices, Gaussian elimination, determinants, eigenvalues and diagonalisation.", "PHYS1080": "Mechanics, fluids, diffusion, osmosis and heat, applied to living systems.", "BIOL1090": "Molecular and cell biology and genetics: structure and function, energy, and regulation.", "CHEM1050": "Thermodynamics (enthalpy and entropy), reaction rates, and electrochemistry.", "CIS1200": "Computer hardware and software, data organisation, and a first taste of programming.", "MATH1210": "Integration techniques, polar and parametric curves, Taylor polynomials, and the theory behind calculus.", "PHYS1070": "Waves, sound and hearing, optics and vision, circuits, and radiation and radioactivity.", "STAT2040": "Probability, distributions, confidence intervals, hypothesis tests and ANOVA.", "BIOC2580": "Proteins, nucleic acids, lipids and carbohydrates, enzymes, and how cells break molecules down for energy.", "MATH2000": "Writing proofs: sets, functions, relations, and how number systems are built from the ground up.", "MATH2200": "Series and convergence, Taylor’s theorem, and calculus of several variables: partial derivatives and gradients.", "MBG2040": "Inheritance, gene mapping, DNA replication, transcription and translation, mutation and repair.", "PSYC1000": "A survey of psychology, from neuroscience and perception to development and social behaviour.", "BIOM3200": "How mammalian organ systems work and work together: nerves, muscle, hormones, heart, lungs and kidneys.", "MATH2210": "Multiple integrals, vector fields, divergence and curl, and the theorems of Green and Stokes.", "MATH3260": "Calculus with complex numbers: analytic functions, contour integrals, Laurent series and residues.", "MCB2050": "Gene regulation, the cell cycle, and how cells build, ship and destroy their proteins.", "NUTR3210": "How nutrients are taken up and used, and what they do for growth and health.", "ECON1050": "Supply and demand, market structure, consumers and firms, and what happens when governments intervene.", "LING1000": "How language works: sounds, word structure, syntax, meaning, and language in society.", "BIOC3560": "How biochemical systems are regulated: oxygen transport, enzyme control, metabolism and membranes.", "BIOM3090": "How drugs move through the body and act on receptors, and their effects on the heart and nervous system.", "MATH2270": "Solving differential equations: linear systems, Laplace transforms, series solutions, and a first look at PDEs.", "PHYS2330": "Electric fields and potentials, Gauss’s law, Laplace’s equation, capacitors and circuits.", "CIS1500": "Programming fundamentals: control flow, data, program logic and testing.", "MATH2130": "Approximating solutions numerically: root finding, interpolation, numerical integration and ODE solvers.", "PHYS2180": "Lab work across mechanics, E&M, thermal and quantum physics, with a focus on data and error analysis.", "PHYS2310": "Oscillators, gravitation and orbits, special relativity, rotating frames, and rigid bodies.", "PHYS2340": "Magnetic fields, Biot–Savart and Ampère’s laws, induction, and AC circuits.", "ECON1100": "National income, unemployment, inflation, and monetary and fiscal policy.", "FIN2000": "Valuing assets, building portfolios, and risk versus return, from both the investor’s and the firm’s side.", "ECON2310": "How households and firms make choices under different market conditions.", "MATH3130": "Groups, subgroups and homomorphisms, then rings, ideals and quotient rings.", "PHYS2240": "Temperature, heat and work, entropy from counting states, and the Boltzmann distribution.", "PHYS3130": "The physicist’s toolkit: special functions, Fourier transforms, and Green’s functions.", "PHYS3230": "The Schrödinger equation, wave packets, the harmonic oscillator, angular momentum, and hydrogen.", "PHYS3400": "Lagrangian and Hamiltonian mechanics, least action, Poisson brackets, and the road to quantum mechanics.", "ECON3740": "Estimating economic models from data: least squares, and what goes wrong with real data.", "MATH3100": "Systems of ODEs by matrix methods, phase planes, stability, and limit cycles.", "NANO3600": "Simulating matter at small scales with Monte Carlo, molecular dynamics, and first-principles methods.", "PHYS3000": "Reflection, refraction, interference, diffraction and polarisation, through to fibres, imaging and lasers.", "PHYS4040": "Spin, many-particle systems, fermions and bosons, perturbation theory, and hydrogen’s fine structure.", "ACCT1220": "The accounting cycle and preparing financial statements.", "ECON2410": "Models of output, employment, prices and interest rates in closed and open economies.", "ECON4700": "The maths behind economic models (optimisation, comparative statics, linear algebra), then applying it.", "IPS3000": "Explaining science to non-specialists, in writing and out loud.", "PHYS3510": "Experiments across modern physics, optics, molecular physics and solid state.", "PHYS4180": "Maxwell’s equations in full: potentials and gauges, waves, multipoles, and Green’s functions.", "PHYS4240": "Grand canonical ensembles, quantum statistics, and transport.", "ECON3100": "Nash equilibrium in static and dynamic games, with complete and incomplete information.", "ECON3710": "Consumer and producer theory, general equilibrium, and welfare economics.", "PHYS4130": "Nuclei and particles: quarks, the fundamental interactions, symmetries, and nuclear models.", "PHYS4150": "Bonding in solids, energy bands, semiconductors and insulators.", "PHYS4500": "Advanced lab techniques in nuclear, solid state and molecular physics." };
  var NEXT = {};
  Object.keys(PRE).forEach(function (b) { PRE[b].forEach(function (a) { (NEXT[a] = NEXT[a] || []).push(b); }); });
  var BYCODE = {}; C.forEach(function (c) { BYCODE[c[0]] = c; });
  var LANES = [
    { subj: ['bio'], name: 'Biology & chemistry', short: 'Bio/chem', c: SUBJ.bio.c, w: 1.15 },
    { subj: ['phys'], name: 'Physics', short: 'Physics', c: SUBJ.phys.c, w: 1.45 },
    { subj: ['math'], name: 'Math & stats', short: 'Math', c: SUBJ.math.c, w: 1.1 },
    { subj: ['econ'], name: 'Econ & finance', short: 'Econ', c: SUBJ.econ.c, w: 1.1 },
    { subj: ['cs', 'arts'], name: 'Other', short: 'Other', c: SUBJ.arts.c, w: 0.9 }
  ];
  function laneOf(code) { var s = subjOf(code); for (var i = 0; i < LANES.length; i++) if (LANES[i].subj.indexOf(s) >= 0) return i; return 4; }
  function yearOf(ti) { return ti < 3 ? 1 : ti < 6 ? 2 : ti < 9 ? 3 : ti < 12 ? 4 : 5; }
  function termLong(t) { return termName(t) + ' · year ' + yearOf(TERMS.indexOf(t)); }

  (function () {
    var host = document.getElementById('tree'), head = document.getElementById('tree-head'), read = document.getElementById('tree-read'), leg = document.getElementById('cmap-legend');
    if (!host) return;
    var NS = 'http://www.w3.org/2000/svg', svg, nodes = {}, edges = [], rowY = [], H = 0, W = 0, nowLine, nowTag, pinned = null, lastW = 0;
    var DEF = 'Hover or tap a course to trace what it needed and what it led to.';
    function el(n, a, p) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
    function smooth(pts) {   // Catmull-Rom through pts as cubic Beziers
      var d = 'M' + pts[0][0] + ',' + pts[0][1];
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ',' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ',' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
      }
      return d;
    }

    function build() {
      W = host.clientWidth; if (!W) return; lastW = W;
      var narrow = W < 640, gut = narrow ? 30 : 74, nh = narrow ? 20 : 24, gap = narrow ? 4 : 6;
      var tw = LANES.reduce(function (s, l) { return s + l.w; }, 0), lx = [], lw = [], x = gut;
      LANES.forEach(function (l) { var w = (W - gut) * l.w / tw; lx.push(x); lw.push(w); x += w; });
      var nw = Math.min(narrow ? 999 : 84, Math.min.apply(0, lw) - 6);
      // group courses by lane and term, work out rows needed
      var cell = {}, rows = TERMS.map(function () { return 1; });
      C.forEach(function (c) { var k = laneOf(c[0]) + ':' + c[2]; (cell[k] = cell[k] || []).push(c[0]); });
      Object.keys(cell).forEach(function (k) {
        var li = +k.split(':')[0], ti = TERMS.indexOf(k.split(':')[1]), cols = Math.max(1, Math.floor((lw[li] - 4 + gap) / (nw + gap)));
        rows[ti] = Math.max(rows[ti], Math.ceil(cell[k].length / cols));
      });
      var y = 16; rowY = [];
      TERMS.forEach(function (t, ti) {
        var base = (t[0] === 'S' ? 0.62 : 1) * (narrow ? 70 : 92), h = Math.max(base, rows[ti] * (nh + gap) + 26);
        rowY.push({ top: y, mid: y + h / 2, h: h }); y += h;
      });
      H = y + 16;
      host.innerHTML = ''; nodes = {}; edges = [];
      svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Prerequisite tree of all sixty courses by term' }, host);
      // years: alternate bands, labels in the gutter
      var gYear = el('g', { 'class': 't-years' }, svg);
      [[0, 2], [3, 5], [6, 8], [9, 11], [12, 13]].forEach(function (r, yi) {
        var a = rowY[r[0]].top, b = rowY[r[1]].top + rowY[r[1]].h;
        if (yi % 2 === 0) el('rect', { x: 0, y: a, width: W, height: b - a, 'class': 't-band' }, gYear);
        var lab = el('text', { x: 2, y: a + 14, 'class': 't-year' }, gYear); lab.textContent = narrow ? 'Y' + (yi + 1) : 'Year ' + (yi + 1);
      });
      TERMS.forEach(function (t, ti) { var lab = el('text', { x: 2, y: rowY[ti].mid + 4, 'class': 't-term' }, gYear); lab.textContent = narrow ? t : termName(t).replace(' 20', ' ’'); });
      // streams: course count per lane and term, lightly smoothed
      var gStream = el('g', { 'class': 't-streams' }, svg);
      LANES.forEach(function (l, li) {
        var n = TERMS.map(function (t) { return (cell[li + ':' + t] || []).length; }), m = Math.max.apply(0, n.concat(4));
        var s = n.map(function (v, i) { return 0.5 * v + 0.25 * (n[i - 1] || 0) + 0.25 * (n[i + 1] || 0); });
        var cx = lx[li] + lw[li] / 2, half = function (v) { return v / m * lw[li] * 0.5; };
        var L = [[cx, 0]], R = [];
        s.forEach(function (v, i) { L.push([cx - half(v), rowY[i].mid]); R.unshift([cx + half(v), rowY[i].mid]); });
        L.push([cx, H]);
        var d = smooth(L) + ' L' + smooth([[cx, H]].concat(R, [[cx, 0]])).slice(1) + 'Z';
        el('path', { d: d, fill: l.c, 'class': 't-stream' }, gStream);
      });
      // nodes positions
      Object.keys(cell).forEach(function (k) {
        var li = +k.split(':')[0], t = k.split(':')[1], ti = TERMS.indexOf(t), list = cell[k];
        var cols = Math.max(1, Math.floor((lw[li] - 4 + gap) / (nw + gap))), nrow = Math.ceil(list.length / cols);
        list.forEach(function (code, i) {
          var r = Math.floor(i / cols), inRow = Math.min(cols, list.length - r * cols), cI = i - r * cols;
          nodes[code] = { code: code, x: lx[li] + lw[li] / 2 + (cI - (inRow - 1) / 2) * (nw + gap), y: rowY[ti].mid + (r - (nrow - 1) / 2) * (nh + gap), ti: ti, li: li };
        });
      });
      // edges under nodes
      var gEdge = el('g', { 'class': 't-edges' }, svg);
      Object.keys(PRE).forEach(function (b) {
        PRE[b].forEach(function (a) {
          var A = nodes[a], B = nodes[b], y1 = A.y + nh / 2, y2 = B.y - nh / 2, dy = (y2 - y1) * 0.5;
          var p = el('path', { d: 'M' + A.x + ',' + y1 + ' C' + A.x + ',' + (y1 + dy) + ' ' + B.x + ',' + (y2 - dy) + ' ' + B.x + ',' + y2, stroke: SUBJ[subjOf(a)].c, pathLength: 1, 'class': 't-edge' }, gEdge);
          edges.push({ a: a, b: b, el: p, y1: y1, y2: y2, last: -1 });
        });
      });
      var gNode = el('g', { 'class': 't-nodes' }, svg), fs = narrow ? Math.min(9, (nw - 6) / 8 / 0.6) : 10.5;
      C.forEach(function (c) {
        var n = nodes[c[0]], s = subjOf(c[0]), g = el('g', { 'class': 't-node' + (DEMO[c[0]] ? ' has-demo' : ''), transform: 'translate(' + n.x + ',' + n.y + ')', tabindex: 0, role: 'button',
          'aria-label': pretty(c[0]) + ', ' + c[1] + ', ' + termName(c[2]) }, gNode);
        g.style.setProperty('--c', SUBJ[s].c);
        el('rect', { x: -nw / 2, y: -nh / 2, width: nw, height: nh, rx: 3 }, g);
        var tx = el('text', { x: DEMO[c[0]] && !narrow ? -3 : 0, y: fs * 0.36, 'font-size': fs }, g); tx.textContent = narrow ? c[0] : pretty(c[0]);
        if (DEMO[c[0]]) el('circle', narrow ? { cx: nw / 2 - 1, cy: -nh / 2 + 1, r: 2.6 } : { cx: nw / 2 - 5, cy: 0, r: 2.4 }, g);
        n.el = g; n.s = s;
        g.addEventListener('mouseenter', function () { if (!pinned) focus(c[0]); });
        g.addEventListener('mouseleave', function () { if (!pinned) focus(null); });
        g.addEventListener('focus', function () { focus(c[0]); });
        g.addEventListener('click', function (e) { e.stopPropagation(); pinned = pinned === c[0] ? null : c[0]; focus(pinned || c[0]); });
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' && DEMO[c[0]]) goDemo(c[0]); });
      });
      nowLine = el('line', { x1: 0, x2: W, y1: -10, y2: -10, 'class': 't-now' }, svg);
      nowTag = el('text', { x: W - 2, y: -10, 'class': 't-nowtag' }, svg);
      // lane header, sticky above the tree
      head.style.gridTemplateColumns = gut + 'px ' + lw.map(function (w) { return w.toFixed(1) + 'px'; }).join(' ');
      head.innerHTML = '<span></span>' + LANES.map(function (l) { return '<span style="--c:' + l.c + '">' + (narrow ? l.short : l.name) + '</span>'; }).join('');
      update();
    }

    function goDemo(code) { showDemo(code, true); }
    function chain(code) {
      var up = {}, dn = {};
      (function u(c) { (PRE[c] || []).forEach(function (a) { if (!up[a]) { up[a] = 1; u(a); } }); })(code);
      (function d(c) { (NEXT[c] || []).forEach(function (b) { if (!dn[b]) { dn[b] = 1; d(b); } }); })(code);
      return { up: up, dn: dn };
    }
    function list(cs) { return cs.map(pretty).join(', '); }
    function focus(code, subj) {
      svg.classList.toggle('focus', !!(code || subj));
      var ch = code ? chain(code) : { up: {}, dn: {} };
      C.forEach(function (c) { var k = c[0], on = subj ? nodes[k].s === subj || (subj === 'arts' && nodes[k].s === 'cs') : k === code || ch.up[k] || ch.dn[k];
        nodes[k].el.classList.toggle('on', !!on); nodes[k].el.classList.toggle('sel', k === code); });
      edges.forEach(function (e) {
        var on = code && (((e.b === code || ch.up[e.b]) && ch.up[e.a]) || ((e.a === code || ch.dn[e.a]) && ch.dn[e.b]));
        e.el.classList.toggle('on', !!on);
      });
      if (!code) { read.innerHTML = subj ? '<b>' + SUBJ[subj].name + '</b>' : DEF; return; }
      var c = BYCODE[code], pre = PRE[code] || [], nxt = NEXT[code] || [];
      read.innerHTML = '<b style="color:' + SUBJ[subjOf(code)].c + '">' + pretty(code) + '</b> ' + c[1] + ' <span class="muted">· ' + termName(c[2]) + '</span>' +
        (ABOUT[code] ? '<span class="t-about">' + ABOUT[code] + '</span>' : '') +
        '<span class="muted t-links">' + (pre.length ? 'Built on ' + list(pre) : 'No prerequisites among these') + (nxt.length ? '; led to ' + list(nxt) + '.' : '.') + '</span>' +
        (DEMO[code] ? ' <button type="button" class="chip t-go">See the demo &darr;</button>' : '');
      var go = read.querySelector('.t-go'); if (go) go.addEventListener('click', function () { goDemo(code); });
    }
    host.addEventListener('click', function () { if (pinned) { pinned = null; focus(null); } });

    // scroll: grow the branches down to a line two thirds of the way down the screen
    function update() {
      if (!svg) return;
      var r = svg.getBoundingClientRect(), ys = reduce ? H + 1 : window.innerHeight * 0.66 - r.top;
      edges.forEach(function (e) {
        var p = Math.max(0, Math.min(1, (ys - e.y1) / Math.max(1, e.y2 - e.y1))); p = Math.round(p * 200) / 200;
        if (p !== e.last) { e.el.style.strokeDashoffset = 1 - p; e.last = p; }
      });
      C.forEach(function (c) { var n = nodes[c[0]]; n.el.classList.toggle('lit', ys >= n.y - 4); });
      var inside = ys > 0 && ys < H - 8 && !reduce;
      nowLine.setAttribute('y1', inside ? ys : -10); nowLine.setAttribute('y2', inside ? ys : -10);
      var ti = 0; for (var i = 0; i < rowY.length; i++) if (ys >= rowY[i].top) ti = i;
      if (svg.lastChild !== nowTag) svg.appendChild(nowTag);
      nowTag.setAttribute('y', inside ? (ys < 16 ? ys + 13 : ys - 5) : -10); nowTag.textContent = inside ? termLong(TERMS[ti]) : '';
    }

    onScroll(update);
    window.addEventListener('resize', function () { if (host.clientWidth !== lastW) build(); });
    read.innerHTML = DEF;

    // legend: subject counts; hovering one lights its courses
    Object.keys(SUBJ).forEach(function (k) {
      var n = C.filter(function (c) { return subjOf(c[0]) === k; }).length;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cmap-key'; b.style.setProperty('--c', SUBJ[k].c);
      b.innerHTML = '<i></i>' + SUBJ[k].name + ' <span>' + n + '</span>';
      var on = function () { if (!pinned) focus(null, k); }, off = function () { if (!pinned) focus(null); };
      b.addEventListener('mouseenter', on); b.addEventListener('focus', on); b.addEventListener('mouseleave', off); b.addEventListener('blur', off);
      b.addEventListener('click', function () { var t = document.getElementById(SUBJ[k].sec); if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); });
      leg.appendChild(b);
    });
    // "also taken" lists under each subject
    Array.prototype.forEach.call(document.querySelectorAll('.also'), function (box) {
      var keys = box.dataset.subj.split(','), l = C.filter(function (c) { return keys.indexOf(subjOf(c[0])) >= 0 && !DEMO[c[0]]; });
      if (!l.length) return;
      box.innerHTML = '<h3>' + (keys.length > 1 ? 'Courses' : 'Also taken') + '</h3><ul>' + l.map(function (c) {
        return '<li style="--c:' + SUBJ[subjOf(c[0])].c + '"><span>' + pretty(c[0]) + '</span>' + c[1] + '</li>';
      }).join('') + '</ul>';
    });
    build();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
  })();

  /* ---------- shared canvas helpers ---------- */
  function Stage(id, opts) {
    var cv = document.getElementById(id); if (!cv) return null;
    var st = { cv: cv, ctx: cv.getContext('2d'), W: 0, H: 0, d: 1, visible: false, running: false, frame: null, draw: null, dirty: true };
    function size() {
      var r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
      var w = Math.round(r.width * d), h = Math.round(r.height * d);
      if (w !== cv.width || h !== cv.height) { cv.width = w; cv.height = h; st.dirty = true; }
      st.W = w; st.H = h; st.d = d;
    }
    st.size = size;
    st.redraw = function () { st.dirty = true; if (!st.running && st.visible) loop(); };
    var last = 0;
    function loop(ts) {
      size();
      if (!st.W || !st.H) { st.running = false; last = 0; return; }   // hidden (a tab not chosen)
      var dt = last && ts ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts || 0;
      if (st.frame && st.visible && !reduce) st.frame(dt);
      if ((st.dirty || st.frame) && st.draw) { st.draw(); st.dirty = false; }
      if (st.frame && st.visible && !reduce) { st.running = true; requestAnimationFrame(loop); } else { st.running = false; last = 0; }
    }
    new IntersectionObserver(function (es) { st.visible = es[0].isIntersecting; if (st.visible && !st.running) loop(); }, { rootMargin: '80px' }).observe(cv);
    window.addEventListener('resize', function () { st.redraw(); });
    st.start = function () { if (!st.running) loop(); };
    return st;
  }
  function px(st, n) { return n * st.d; }
  function font(st, n, w) { return (w || 400) + ' ' + n * st.d + 'px ' + MONO; }
  // every label stays inside its canvas: too wide and it shrinks, near an edge and it slides back in
  function text(st, s, x, y, col, align, n) {
    var c = st.ctx, sz = n || 11; c.fillStyle = col || MIST; c.font = font(st, sz); c.textAlign = align || 'left';
    var m = c.getTransform ? c.getTransform() : null;
    if (m && m.a === 1 && m.d === 1 && !m.b && !m.c && !m.e && !m.f && st.W) {
      var mt = c.measureText(s), L = x - mt.actualBoundingBoxLeft, R = x + mt.actualBoundingBoxRight, lo = 2 * st.d, hi = st.W - 2 * st.d;
      if (R - L > hi - lo) { sz *= (hi - lo) / (R - L) * 0.98; c.font = font(st, sz); mt = c.measureText(s); L = x - mt.actualBoundingBoxLeft; R = x + mt.actualBoundingBoxRight; }
      if (L < lo) x += lo - L; else if (R > hi) x -= R - hi;
      var T = y - mt.actualBoundingBoxAscent, B = y + mt.actualBoundingBoxDescent;
      if (T < 1) y += 1 - T; else if (B > st.H - 1) y -= B - st.H + 1;
    }
    c.fillText(s, x, y);
  }
  function chips(sel, attr, cb) {
    var bs = document.querySelectorAll(sel);
    Array.prototype.forEach.call(bs, function (b) {
      b.addEventListener('click', function () { Array.prototype.forEach.call(bs, function (o) { o.setAttribute('aria-pressed', o === b); }); cb(b.dataset[attr]); });
    });
  }
  function axes(st, x0, y0, x1, y1) { var c = st.ctx; c.strokeStyle = LINE; c.lineWidth = px(st, 1); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0, y1); c.moveTo(x0, y0); c.lineTo(x1, y0); c.stroke(); }
  function clear(st) { st.ctx.clearRect(0, 0, st.W, st.H); }


  /* ---------- (2) quantum tunnelling: split-operator FFT; scrolling raises the barrier ---------- */
  (function () {
    var st = Stage('qm-cv'); if (!st) return;
    var N = 512, L = 320, dx = L / N, dt = 0.12, re = new Float64Array(N), im = new Float64Array(N), V = new Float64Array(N);
    var X = new Float64Array(N), K2 = new Float64Array(N), mask = new Float64Array(N), k0 = 1.6, E = k0 * k0 / 2, BW = 3.2, t = 0, best = 0, vb = 0.6;
    for (var i = 0; i < N; i++) { X[i] = -L / 2 + i * dx; var k = (i < N / 2 ? i : i - N) * 2 * Math.PI / L; K2[i] = k * k;
      var e = Math.min(i, N - 1 - i); mask[i] = e < 40 ? Math.pow(Math.sin(Math.PI / 2 * e / 40), 0.12) : 1; }
    function fft(r, m, inv) {
      for (var i = 1, j = 0; i < N; i++) { var bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { var a = r[i]; r[i] = r[j]; r[j] = a; a = m[i]; m[i] = m[j]; m[j] = a; } }
      for (var len = 2; len <= N; len <<= 1) {
        var ang = 2 * Math.PI / len * (inv ? 1 : -1), wr = Math.cos(ang), wi = Math.sin(ang);
        for (var s = 0; s < N; s += len) { var cr = 1, ci = 0;
          for (var q = 0; q < len / 2; q++) { var u = s + q, v = u + len / 2, tr = r[v] * cr - m[v] * ci, ti = r[v] * ci + m[v] * cr;
            r[v] = r[u] - tr; m[v] = m[u] - ti; r[u] += tr; m[u] += ti; var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
      }
      if (inv) for (var z = 0; z < N; z++) { r[z] /= N; m[z] /= N; }
    }
    var g = gauge('qm-drive');
    function setV() { for (var i = 0; i < N; i++) V[i] = X[i] >= 0 && X[i] < BW ? vb * E : 0; }
    onScroll(function () { var p = progress(st.cv); vb = 0.4 + 1.2 * p; setV(); g(p, vb.toFixed(2) + '× energy'); st.redraw(); });
    function reset() {
      var s = 9, x0 = -70, nrm = 0;
      for (var i = 0; i < N; i++) { var a = Math.exp(-Math.pow(X[i] - x0, 2) / (4 * s * s)); re[i] = a * Math.cos(k0 * X[i]); im[i] = a * Math.sin(k0 * X[i]); nrm += a * a * dx; }
      nrm = Math.sqrt(nrm); for (i = 0; i < N; i++) { re[i] /= nrm; im[i] /= nrm; } t = 0; best = 0; setV(); st.redraw();
    }
    function halfV() { for (var i = 0; i < N; i++) { if (!V[i]) continue; var a = -V[i] * dt / 2, c = Math.cos(a), s = Math.sin(a), r = re[i]; re[i] = r * c - im[i] * s; im[i] = r * s + im[i] * c; } }
    function step() {
      halfV(); fft(re, im, false);
      for (var i = 0; i < N; i++) { var a = -K2[i] / 2 * dt, c = Math.cos(a), s = Math.sin(a), r = re[i]; re[i] = r * c - im[i] * s; im[i] = r * s + im[i] * c; }
      fft(re, im, true); halfV();
      for (i = 0; i < N; i++) { re[i] *= mask[i]; im[i] *= mask[i]; }
      t += dt;
    }
    document.getElementById('qm-go').addEventListener('click', reset);
    st.cv.addEventListener('pointerdown', reset);
    st.frame = function () { for (var s = 0; s < 4; s++) step(); if (t > 135) reset(); };
    var read = document.getElementById('qm-read');
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, base = H * 0.82, sc = H * 0.62 / 0.09;
      var xs = function (x) { return (x + 120) / 240 * W; };
      var eY = base - H * 0.35, bY = base - H * 0.35 * vb;
      c.fillStyle = 'rgba(255,106,85,.18)'; c.fillRect(xs(0), bY, xs(BW) - xs(0), base - bY);
      c.strokeStyle = ROPE; c.lineWidth = px(st, 1.5); c.strokeRect(xs(0), bY, xs(BW) - xs(0), base - bY);
      c.setLineDash([px(st, 4), px(st, 5)]); c.strokeStyle = 'rgba(234,246,248,.35)'; c.lineWidth = px(st, 1);
      c.beginPath(); c.moveTo(0, eY); c.lineTo(W, eY); c.stroke(); c.setLineDash([]);
      text(st, 'packet energy', px(st, 10), eY - px(st, 6), MIST);
      axes(st, 0, base, W, base);
      c.beginPath(); c.moveTo(xs(X[0]), base);
      for (var i = 0; i < N; i++) { if (X[i] < -120 || X[i] > 120) continue; c.lineTo(xs(X[i]), base - (re[i] * re[i] + im[i] * im[i]) * sc); }
      c.lineTo(W, base); c.closePath(); c.fillStyle = 'rgba(124,196,255,.35)'; c.fill();
      c.strokeStyle = '#7cc4ff'; c.lineWidth = px(st, 1.6); c.beginPath(); var first = true;
      for (i = 0; i < N; i++) { if (X[i] < -120 || X[i] > 120) continue; var y = base - (re[i] * re[i] + im[i] * im[i]) * sc; if (first) { c.moveTo(xs(X[i]), y); first = false; } else c.lineTo(xs(X[i]), y); }
      c.stroke();
      c.strokeStyle = 'rgba(234,246,248,.35)'; c.lineWidth = px(st, 1); c.beginPath(); first = true;
      for (i = 0; i < N; i++) { if (X[i] < -120 || X[i] > 120) continue; var y2 = base - H * 0.1 - re[i] * sc * 0.06; if (first) { c.moveTo(xs(X[i]), y2); first = false; } else c.lineTo(xs(X[i]), y2); }
      c.stroke();
      var pt = 0, pr = 0; for (i = 0; i < N; i++) { var p = (re[i] * re[i] + im[i] * im[i]) * dx; if (X[i] >= BW) pt += p; else if (X[i] < 0) pr += p; }
      best = Math.max(best, pt / Math.max(1e-9, pt + pr));
      text(st, 'through the barrier: ' + Math.round(100 * (t > 70 ? best : pt)) + '%', W - px(st, 12), px(st, 22), FOAM, 'right', 12);
      read.textContent = 'A wave packet meets a barrier ' + vb.toFixed(2) + '× its energy. ' + (vb > 1 ? 'A classical particle would always bounce back.' : 'A classical particle would always get over.') + ' Scroll to change it; tap to send another.';
    };
    reset(); st.start();
  })();

  /* ---------- (3) field lines: scrolling morphs the second charge, the pointer carries a third ---------- */
  (function () {
    var st = Stage('field-cv'); if (!st) return;
    var p = 0, me = null, mySign = 1, g = gauge('field-drive');
    function charges() {
      var a = p * Math.PI / 2, d = 0.17, q2 = -Math.cos(2 * Math.PI * p), asp = st.H / st.W;
      var Q = [{ x: 0.5 - d * Math.cos(a) * asp, y: 0.5 - d * Math.sin(a), q: 1 }, { x: 0.5 + d * Math.cos(a) * asp, y: 0.5 + d * Math.sin(a), q: q2 }];
      if (me) Q.push({ x: me[0] / st.W, y: me[1] / st.H, q: 0.8 * mySign, me: true });
      return Q;
    }
    onScroll(function () { p = progress(st.cv); var q2 = -Math.cos(2 * Math.PI * p); g(p, (q2 >= 0 ? '+' : '−') + Math.abs(q2).toFixed(2) + ' q'); st.redraw(); });
    hover(st, function (pt) { me = pt; st.redraw(); }, function (pt) { if (me && Math.hypot(pt[0] - me[0], pt[1] - me[1]) < px(st, 30)) mySign = -mySign; });
    st.draw = function () {
      clear(st); var c = st.ctx, h = px(st, 2.5), R = px(st, 14), Q = charges();
      var P = function (q) { return [q.x * st.W, q.y * st.H]; };
      var E = function (x, y) { var ex = 0, ey = 0; for (var i = 0; i < Q.length; i++) { var pp = P(Q[i]), dx = x - pp[0], dy = y - pp[1], r2 = dx * dx + dy * dy + 1, r3 = r2 * Math.sqrt(r2); ex += Q[i].q * dx / r3; ey += Q[i].q * dy / r3; } return [ex, ey]; };
      var sink = function (x, y, sg) { for (var i = 0; i < Q.length; i++) { var pp = P(Q[i]); if (Q[i].q * sg < -0.05 && Math.hypot(x - pp[0], y - pp[1]) < R * Math.max(0.4, Math.sqrt(Math.abs(Q[i].q)))) return true; } return false; };
      var srcSign = Q.some(function (q) { return q.q > 0.05; }) ? 1 : -1;
      c.lineWidth = px(st, 1.1);
      Q.forEach(function (q) {
        if (q.q * srcSign <= 0.05) return; var pp = P(q), n = Math.max(2, Math.round(16 * Math.abs(q.q)));
        for (var k = 0; k < n; k++) {
          var a = (k + 0.5) / n * 2 * Math.PI, x = pp[0] + Math.cos(a) * R * 0.8, y = pp[1] + Math.sin(a) * R * 0.8;
          c.strokeStyle = q.me ? 'rgba(255,209,102,.6)' : 'rgba(124,196,255,.55)'; c.beginPath(); c.moveTo(x, y);
          for (var s = 0; s < 700; s++) {
            var e = E(x, y), m = Math.hypot(e[0], e[1]); if (m < 1e-12) break;
            x += srcSign * e[0] / m * h; y += srcSign * e[1] / m * h; c.lineTo(x, y);
            if (x < -50 || y < -50 || x > st.W + 50 || y > st.H + 50 || sink(x, y, srcSign)) break;
            if (s === 60) { var e2 = E(x, y), m2 = Math.hypot(e2[0], e2[1]), ax = srcSign * e2[0] / m2, ay = srcSign * e2[1] / m2;
              c.moveTo(x - ax * px(st, 6) - ay * px(st, 4), y - ay * px(st, 6) + ax * px(st, 4)); c.lineTo(x, y); c.lineTo(x - ax * px(st, 6) + ay * px(st, 4), y - ay * px(st, 6) - ax * px(st, 4)); c.moveTo(x, y); }
          }
          c.stroke();
        }
      });
      Q.forEach(function (q) {
        var pp = P(q), r = R * Math.max(0.35, Math.sqrt(Math.abs(q.q)));
        c.fillStyle = Math.abs(q.q) < 0.05 ? MIST : q.q > 0 ? ROPE : '#7cc4ff'; c.beginPath(); c.arc(pp[0], pp[1], r, 0, 7); c.fill();
        if (q.me) { c.strokeStyle = '#ffd166'; c.lineWidth = px(st, 2); c.beginPath(); c.arc(pp[0], pp[1], r + px(st, 4), 0, 7); c.stroke(); }
        c.strokeStyle = DEEP; c.lineWidth = px(st, 2.5); c.beginPath(); c.moveTo(pp[0] - r * 0.45, pp[1]); c.lineTo(pp[0] + r * 0.45, pp[1]);
        if (q.q > 0) { c.moveTo(pp[0], pp[1] - r * 0.45); c.lineTo(pp[0], pp[1] + r * 0.45); } c.stroke();
      });
      if (!me) text(st, 'move your pointer here to bring a charge', st.W - px(st, 12), st.H - px(st, 14), MIST, 'right');
    };
    st.redraw();
  })();

  /* ---------- (4) gas -> Maxwell-Boltzmann, with a piston driven by scrolling ---------- */
  (function () {
    var st = Stage('gas-cv'); if (!st) return;
    var N = 160, P = [], hist = new Float64Array(30), V0 = 1, R = 0.012, w = 1, wT = 1, g = gauge('gas-drive'), E0 = 1;
    function reset() { P = []; for (var i = 0; i < N; i++) { var a = Math.random() * 2 * Math.PI; P.push({ x: 0.05 + Math.random() * (w - 0.1), y: 0.05 + Math.random() * 0.9, vx: V0 * Math.cos(a), vy: V0 * Math.sin(a) }); }
      hist.fill(0); E0 = 1; st.redraw(); }
    document.getElementById('gas-reset').addEventListener('click', reset);
    onScroll(function () { var p = progress(st.cv); wT = 1 - 0.55 * p; g(p, 'volume ×' + wT.toFixed(2)); });
    var read = document.getElementById('gas-read');
    function msq() { var s = 0; P.forEach(function (p) { s += p.vx * p.vx + p.vy * p.vy; }); return s / N; }
    st.frame = function (dt) {
      var h = Math.min(dt, 1 / 30) * 0.35, G = 12;
      for (var s = 0; s < 2; s++) {
        // piston: moves toward its target no faster than the typical particle
        var dw = Math.max(-0.7 * h / 2, Math.min(0.7 * h / 2, wT - w)), u = dw / (h / 2); w += dw;
        P.forEach(function (p) { p.x += p.vx * h / 2; p.y += p.vy * h / 2;
          if (p.x < R) { p.x = R; p.vx = Math.abs(p.vx); }
          if (p.x > w - R) { p.x = w - R; if (p.vx > u) p.vx = 2 * u - p.vx; }
          if (p.y < R) { p.y = R; p.vy = Math.abs(p.vy); } if (p.y > 1 - R) { p.y = 1 - R; p.vy = -Math.abs(p.vy); } });
        var cells = {};
        P.forEach(function (p, i) { var k = Math.floor(p.x * G) + ',' + Math.floor(p.y * G); (cells[k] = cells[k] || []).push(i); });
        P.forEach(function (p, i) {
          var gx = Math.floor(p.x * G), gy = Math.floor(p.y * G);
          for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) {
            var L = cells[(gx + ox) + ',' + (gy + oy)]; if (!L) continue;
            L.forEach(function (j) { if (j <= i) return; var q = P[j], dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy;
              if (d2 > 4 * R * R || d2 === 0) return; var dvx = q.vx - p.vx, dvy = q.vy - p.vy, dot = dvx * dx + dvy * dy; if (dot >= 0) return;
              var k = dot / d2; p.vx += k * dx; p.vy += k * dy; q.vx -= k * dx; q.vy -= k * dy; });
          }
        });
      }
      for (var b = 0; b < hist.length; b++) hist[b] *= 0.97;
      P.forEach(function (p) { var v = Math.hypot(p.vx, p.vy), b2 = Math.floor(v / (3 * V0) * hist.length); if (b2 < hist.length) hist[b2] += 1; });
    };
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, wide = W > H * 1.6, bw = wide ? Math.min(H, W * 0.48) : W, bh = wide ? H : H * 0.55;
      var bx = 0, by = 0, hx = wide ? bw + px(st, 24) : 0, hy = wide ? 0 : bh + px(st, 10), hw = wide ? W - hx : W, hh = wide ? H : H - hy;
      c.strokeStyle = LINE; c.lineWidth = px(st, 1); c.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
      c.fillStyle = 'rgba(143,177,189,.08)'; c.fillRect(bx + w * bw, by, (1 - w) * bw, bh);
      c.fillStyle = ROPE; c.fillRect(bx + w * bw - px(st, 2), by, px(st, 4), bh);
      var vr = Math.sqrt(msq());
      P.forEach(function (p) { var v = Math.hypot(p.vx, p.vy) / V0; c.fillStyle = v > 1.6 ? ROPE : v > 0.8 ? '#ffd166' : '#7cc4ff';
        c.beginPath(); c.arc(bx + p.x * bw, by + p.y * bh, Math.max(px(st, 2.2), R * Math.min(bw, bh)), 0, 7); c.fill(); });
      var tot = 0; for (var i = 0; i < hist.length; i++) tot += hist[i];
      var base = hy + hh - px(st, 22), top = hy + px(st, 26), bwid = hw / hist.length, s2 = vr * vr / 2;
      var f = function (v) { return v / s2 * Math.exp(-v * v / (2 * s2)); }, peak = 1 / Math.sqrt(0.5) * Math.exp(-0.5) * 1.25 * 1.45;
      var dv = 3 * V0 / hist.length;
      for (i = 0; i < hist.length; i++) { var y = tot ? hist[i] / tot / dv : 0; c.fillStyle = 'rgba(124,196,255,.45)'; c.fillRect(hx + i * bwid + 1, base - Math.min(1, y / peak) * (base - top), bwid - 2, Math.min(1, y / peak) * (base - top)); }
      c.strokeStyle = '#ffd166'; c.lineWidth = px(st, 2); c.beginPath();
      for (i = 0; i <= 100; i++) { var v = i / 100 * 3 * V0, yy = base - Math.min(1, f(v) / peak) * (base - top); i ? c.lineTo(hx + i / 100 * hw, yy) : c.moveTo(hx, yy); } c.stroke();
      c.strokeStyle = ROPE; c.setLineDash([px(st, 3), px(st, 4)]); c.beginPath(); c.moveTo(hx + hw / 3, base); c.lineTo(hx + hw / 3, top); c.stroke(); c.setLineDash([]);
      axes(st, hx, base, hx + hw, base);
      text(st, 'speed →', hx + hw, base + px(st, 16), MIST, 'right');
      text(st, 'starting speed', hx + hw / 3 + px(st, 5), top + px(st, 4), ROPE);
      text(st, 'Maxwell–Boltzmann at this temperature', hx + hw - px(st, 4), top - px(st, 10), '#ffd166', 'right');
      read.textContent = '' + N + ' gas particles that all started at the same speed. Volume ×' + w.toFixed(2) + ', temperature ×' + (vr * vr).toFixed(2) + '. Scroll to move the piston.';
    };
    reset(); st.start();
  })();

  /* ---------- (5) linear algebra: scrolling walks through matrices, the pointer is a vector ---------- */
  (function () {
    var st = Stage('linalg-cv'); if (!st) return;
    var KEYS = [[1, 0, 0, 1, 'identity'], [1, 0, 1, 1, 'shear'], [1.6, 0, 0, 0.6, 'stretch'], [0.5, 0.866, -0.866, 0.5, 'rotation'], [0, 1, 1, 0, 'reflection']];
    var M = [1, 0, 0, 1], S = 1, v = null, g = gauge('linalg-drive'), name = 'identity';
    onScroll(function () {
      var p = progress(st.cv) * (KEYS.length - 1), i = Math.min(KEYS.length - 2, Math.floor(p)), f = p - i; f = f * f * (3 - 2 * f);
      for (var k = 0; k < 4; k++) M[k] = KEYS[i][k] + (KEYS[i + 1][k] - KEYS[i][k]) * f;
      name = f < 0.5 ? KEYS[i][4] : KEYS[i + 1][4]; g(p / (KEYS.length - 1), (f > 0.08 && f < 0.92 ? '→ ' : '') + name); st.redraw();
    });
    var read = document.getElementById('linalg-read');
    function O() { return [st.W / 2, st.H / 2]; }
    function toS(x, y) { var o = O(); return [o[0] + x * S, o[1] - y * S]; }
    hover(st, function (pt) { if (!pt) { v = null; } else { var o = O(); v = [(pt[0] - o[0]) / S, (o[1] - pt[1]) / S]; } st.redraw(); });
    function arrow(c, a, b, col, w) {
      var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, hd = px(st, 9);
      c.strokeStyle = col; c.fillStyle = col; c.lineWidth = px(st, w); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0] - ux * hd * 0.6, b[1] - uy * hd * 0.6); c.stroke();
      c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(b[0] - ux * hd - uy * hd * 0.5, b[1] - uy * hd + ux * hd * 0.5); c.lineTo(b[0] - ux * hd + uy * hd * 0.5, b[1] - uy * hd - ux * hd * 0.5); c.fill();
    }
    st.draw = function () {
      clear(st); var c = st.ctx; S = Math.min(st.W, st.H) / 7.5;
      var a = M[0], cc = M[1], b = M[2], d = M[3];
      var T = function (x, y) { return toS(a * x + b * y, cc * x + d * y); };
      c.lineWidth = px(st, 1);
      for (var k = -8; k <= 8; k++) { c.strokeStyle = 'rgba(143,177,189,.10)'; c.beginPath(); var p = toS(k, -8), q = toS(k, 8); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); p = toS(-8, k); q = toS(8, k); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); }
      for (k = -8; k <= 8; k++) { c.strokeStyle = k ? 'rgba(195,155,255,.35)' : 'rgba(195,155,255,.8)'; c.beginPath(); p = T(k, -8); q = T(k, 8); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); p = T(-8, k); q = T(8, k); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); }
      var det = a * d - b * cc;
      c.fillStyle = det >= 0 ? 'rgba(95,211,176,.25)' : 'rgba(255,106,85,.28)'; c.beginPath();
      [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(function (u, i) { var s = T(u[0], u[1]); i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); }); c.fill();
      var tr = a + d, disc = tr * tr / 4 - det, ev = [];
      if (disc >= -1e-9) { var r = Math.sqrt(Math.max(0, disc)); [tr / 2 + r, tr / 2 - r].forEach(function (l, i) { if (i && r < 1e-6) return;
        var vx = Math.abs(b) > 1e-6 ? b : l - d, vy = Math.abs(b) > 1e-6 ? l - a : cc; if (Math.abs(vx) + Math.abs(vy) < 1e-6) { vx = i ? 0 : 1; vy = i ? 1 : 0; }
        var n = Math.hypot(vx, vy); ev.push([l, vx / n, vy / n]); }); }
      c.setLineDash([px(st, 5), px(st, 5)]); c.lineWidth = px(st, 1.5); c.strokeStyle = 'rgba(255,209,102,.55)';
      ev.forEach(function (e) { var p1 = toS(-9 * e[1], -9 * e[2]), p2 = toS(9 * e[1], 9 * e[2]); c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.stroke(); });
      c.setLineDash([]);
      var o = toS(0, 0);
      arrow(c, o, toS(a, cc), ROPE, 3); arrow(c, o, toS(b, d), '#7cc4ff', 3);
      text(st, 'Aî', toS(a, cc)[0] + px(st, 10), toS(a, cc)[1] - px(st, 8), ROPE, 'left', 12); text(st, 'Aĵ', toS(b, d)[0] + px(st, 10), toS(b, d)[1] - px(st, 8), '#7cc4ff', 'left', 12);
      var f = function (x) { return (Math.abs(x) < 0.005 ? 0 : x).toFixed(2); }, note = '';
      if (v) {
        var Av = [a * v[0] + b * v[1], cc * v[0] + d * v[1]], cr = v[0] * Av[1] - v[1] * Av[0], lv = Math.hypot(v[0], v[1]), lA = Math.hypot(Av[0], Av[1]);
        var par = lv > 0.2 && lA > 1e-6 && Math.abs(cr) / (lv * lA) < 0.06;
        arrow(c, o, toS(v[0], v[1]), 'rgba(234,246,248,.75)', 2); arrow(c, o, toS(Av[0], Av[1]), '#ffd166', par ? 3.5 : 2.5);
        text(st, 'v', toS(v[0], v[1])[0] + px(st, 8), toS(v[0], v[1])[1] + px(st, 14), FOAM, 'left', 12);
        text(st, 'Av', toS(Av[0], Av[1])[0] + px(st, 8), toS(Av[0], Av[1])[1] - px(st, 8), '#ffd166', 'left', 12);
        note = par ? ' Right now v is an eigenvector: A only stretches it, by ' + f((Av[0] * v[0] + Av[1] * v[1]) / (lv * lv)) + '.' : '';
      }
      text(st, 'A = [' + f(a) + '  ' + f(b) + ' ; ' + f(cc) + '  ' + f(d) + ']', px(st, 12), px(st, 22), FOAM, 'left', 12);
      text(st, 'det A = ' + f(det), px(st, 12), px(st, 40), det >= 0 ? '#5fd3b0' : ROPE, 'left', 12);
      text(st, ev.length ? 'λ = ' + ev.map(function (e) { return f(e[0]); }).join(', ') : 'no real eigenvectors (it rotates)', px(st, 12), px(st, 58), '#ffd166', 'left', 12);
      if (!v) text(st, 'point anywhere for a vector v', st.W - px(st, 12), st.H - px(st, 14), MIST, 'right');
      read.textContent = 'The plane under a ' + name + ' matrix. Scroll to change it.' + (note || (v ? ' Line v up with a dashed eigenvector and Av stays on it.' : ''));
    };
    st.redraw();
  })();

  /* ---------- (6) Euler vs RK4: scrolling sets the step size ---------- */
  (function () {
    var st = Stage('num-cv'); if (!st) return;
    var h = 0.3, t = 0, g = gauge('num-drive'), te = [], tr = [];
    function f(s) { return [s[1], -s[0]]; }
    function rk4(s, h) { var k1 = f(s), k2 = f([s[0] + h / 2 * k1[0], s[1] + h / 2 * k1[1]]), k3 = f([s[0] + h / 2 * k2[0], s[1] + h / 2 * k2[1]]), k4 = f([s[0] + h * k3[0], s[1] + h * k3[1]]);
      return [s[0] + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), s[1] + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])]; }
    function run() {   // both solvers from the start up to time t at the current step size
      var e = [1, 0], r = [1, 0], n = Math.floor(t / h); te = [e]; tr = [r];
      for (var i = 0; i < n; i++) { var d = f(e); e = [e[0] + h * d[0], e[1] + h * d[1]]; r = rk4(r, h); te.push(e); tr.push(r); if (Math.hypot(e[0], e[1]) > 3.4) { t = 0; return run(); } }
    }
    onScroll(function () { var p = progress(st.cv); h = 0.05 + 0.75 * p; g(p, 'h = ' + h.toFixed(2)); run(); st.redraw(); });
    st.frame = function (dt) { t += dt * 2.2; if (t > 40) t = 0; run(); };
    var read = document.getElementById('num-read');
    st.draw = function () {
      clear(st); var c = st.ctx, S = Math.min(st.W, st.H) / 7.4, o = [st.W / 2, st.H / 2];
      var P = function (s) { return [o[0] + s[0] * S, o[1] - s[1] * S]; };
      axes(st, o[0] - 3.5 * S, o[1], o[0] + 3.5 * S, o[1]); axes(st, o[0], o[1] + 3.5 * S, o[0], o[1] - 3.5 * S);
      text(st, 'position x', o[0] + 3.5 * S, o[1] + px(st, 16), MIST, 'right'); text(st, 'velocity', o[0] + px(st, 6), o[1] - 3.4 * S, MIST);
      c.strokeStyle = 'rgba(234,246,248,.4)'; c.setLineDash([px(st, 4), px(st, 5)]); c.lineWidth = px(st, 1); c.beginPath(); c.arc(o[0], o[1], S, 0, 7); c.stroke(); c.setLineDash([]);
      [[te, ROPE], [tr, '#c39bff']].forEach(function (gg) {
        c.strokeStyle = gg[1]; c.lineWidth = px(st, 2); c.beginPath(); gg[0].forEach(function (s, i) { var p = P(s); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.stroke();
        var p = P(gg[0][gg[0].length - 1]); c.fillStyle = gg[1]; c.beginPath(); c.arc(p[0], p[1], px(st, 6), 0, 7); c.fill();
      });
      var En = function (s) { return (s[0] * s[0] + s[1] * s[1]) / 2; };
      text(st, 'Euler: energy ×' + (En(te[te.length - 1]) / 0.5).toFixed(2), px(st, 12), px(st, 22), ROPE, 'left', 12);
      text(st, 'RK4: energy ×' + (En(tr[tr.length - 1]) / 0.5).toFixed(4), px(st, 12), px(st, 40), '#c39bff', 'left', 12);
      text(st, 'true orbit', o[0] + S * 0.72, o[1] - S * 0.78, 'rgba(234,246,248,.6)');
      read.textContent = 'A spring in the phase plane, step size ' + h.toFixed(2) + '. Dashed: the true orbit. Scroll for bigger steps.';
    };
    run(); st.start();
  })();

  /* ---------- (7) central limit theorem: scrolling grows the sample ---------- */
  (function () {
    var st = Stage('clt-cv'); if (!st) return;
    var NS = [1, 2, 3, 5, 8, 12, 20, 30], n = 1, B = 48, hist = new Float64Array(B), count = 0, acc = 0, g = gauge('clt-drive');
    function reset() { hist = new Float64Array(B); count = 0; st.redraw(); }
    onScroll(function () { var p = progress(st.cv), m = NS[Math.min(NS.length - 1, Math.floor(p * NS.length))]; g(p, 'n = ' + m); if (m !== n) { n = m; reset(); } });
    function draw1() { var s = 0; for (var i = 0; i < n; i++) s += -Math.log(1 - Math.random()); return s / n; }
    st.frame = function (dt) { acc += dt * 60; while (acc > 1) { acc -= 1; for (var i = 0; i < 14; i++) { var m = draw1(), b = Math.floor(m / 3 * B); if (b < B) hist[b]++; count++; } } if (count > 12000) reset(); };
    var read = document.getElementById('clt-read');
    st.draw = function () {
      clear(st); var c = st.ctx, W = st.W, H = st.H, wide = W > 560 * st.d, lw = wide ? W * 0.28 : W, lh = wide ? H : H * 0.32;
      var gx = wide ? lw + px(st, 30) : 0, gy = wide ? 0 : lh + px(st, 18), gw = W - gx, gh = H - gy;
      var b0 = lh - px(st, 24); axes(st, 0, b0, lw, b0); c.strokeStyle = '#ff8a5c'; c.lineWidth = px(st, 2); c.beginPath();
      for (var i = 0; i <= 60; i++) { var x = i / 60 * 4, y = b0 - Math.exp(-x) * (b0 - px(st, 30)); i ? c.lineTo(i / 60 * lw, y) : c.moveTo(0, y); } c.stroke();
      text(st, 'one draw: skewed', 0, px(st, 16), '#ff8a5c');
      var base = gy + gh - px(st, 24), top = gy + px(st, 30), dv = 3 / B, peak = Math.max(1.1, Math.sqrt(n / (2 * Math.PI)) * 1.25);
      for (i = 0; i < B; i++) { var d = count ? hist[i] / count / dv : 0, hh = Math.min(1, d / peak) * (base - top); c.fillStyle = 'rgba(195,155,255,.5)'; c.fillRect(gx + i / B * gw + 1, base - hh, gw / B - 2, hh); }
      if (n > 1) { c.strokeStyle = '#ffd166'; c.lineWidth = px(st, 2); c.beginPath();
        for (i = 0; i <= 150; i++) { var v = i / 150 * 3, z = Math.sqrt(n / (2 * Math.PI)) * Math.exp(-n * (v - 1) * (v - 1) / 2), yy = base - Math.min(1, z / peak) * (base - top); i ? c.lineTo(gx + i / 150 * gw, yy) : c.moveTo(gx, yy); } c.stroke();
        text(st, 'normal curve', gx + gw, gy + px(st, 16), '#ffd166', 'right'); }
      axes(st, gx, base, gx + gw, base);
      text(st, 'average of ' + n + (n > 1 ? ' draws' : ' draw'), gx, gy + px(st, 16), '#c39bff');
      for (i = 0; i <= 3; i++) text(st, String(i), gx + i / 3 * gw, base + px(st, 16), MIST, 'center');
      read.textContent = '' + count.toLocaleString() + ' averages of ' + n + (n > 1 ? ' draws each' : ' draw (just the source again)') + '. Scroll to average more draws at a time.';
    };
    reset(); st.start();
  })();

  /* ---------- one demo per course: def() builds a panel, the tabs switch between them ---------- */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function def(code, o, fn) {
    var c = BYCODE[code], sec = document.getElementById(SUBJ[subjOf(code)].sec); if (!c || !sec) return;
    var panel = document.createElement('div'); panel.className = 'dpanel'; panel.dataset.code = code;
    panel.innerHTML = '<figure class="figure demo" id="d-' + code + '"><p class="demo-course">' + pretty(code) + ' &middot; ' + c[1] + '</p>' +
      '<canvas id="cv-' + code + '" role="img" aria-label="' + o.aria + '"></canvas><div class="demo-controls">' +
      (o.gauge ? '<div class="drive" id="g-' + code + '"><span class="k">' + o.gauge + '</span><span class="track"><i></i></span><output></output><span class="how">scroll</span></div>' : '') +
      (o.hint ? '<span class="lbl hint">' + o.hint + '</span>' : '') + (o.controls || '') +
      '</div><figcaption><span id="rd-' + code + '"></span></figcaption></figure><p class="demo-note">' + o.note + '</p>';
    sec.insertBefore(panel, sec.querySelector('.also'));
    var st = Stage('cv-' + code), rd = document.getElementById('rd-' + code);
    fn(st, gauge('g-' + code), function (t) { rd.textContent = t; });
    if (st.frame) st.start(); else st.redraw();
  }
  function showDemo(code, scroll) {
    var panel = document.querySelector('.dpanel[data-code="' + code + '"]'); if (!panel) return;
    var sec = panel.parentNode;
    Array.prototype.forEach.call(sec.querySelectorAll('.dpanel'), function (p) { p.hidden = p !== panel; });
    Array.prototype.forEach.call(sec.querySelectorAll('.dtab'), function (b) { var on = b.dataset.code === code; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    kick();
    if (scroll) sec.querySelector('.dtabs').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  // a shaded 3D surface: G is a (rows+1) x (cols+1) grid of [x, y, z, value]; quads are painted far to near
  function mesh(st, G, view, color) {
    var c = st.ctx, cr = Math.cos(view.rot), sr = Math.sin(view.rot), ce = Math.cos(view.el), se = Math.sin(view.el), L = [0.4, -0.5, 0.75], q = [];
    var P = G.map(function (row) { return row.map(function (p) { var x = p[0] * cr - p[1] * sr, y = p[0] * sr + p[1] * cr;
      return [view.cx + view.s * x, view.cy - view.s * (p[2] * ce - y * se), y * ce + p[2] * se]; }); });
    for (var i = 0; i < G.length - 1; i++) for (var j = 0; j < G[i].length - 1; j++) {
      var a = G[i][j], b = G[i][j + 1], d = G[i + 1][j], e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      var n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], nl = Math.hypot(n[0], n[1], n[2]) || 1;
      var sh = 0.3 + 0.7 * Math.abs((n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / nl);
      q.push([(P[i][j][2] + P[i][j + 1][2] + P[i + 1][j][2] + P[i + 1][j + 1][2]) / 4, i, j, sh, (a[3] + b[3] + d[3] + G[i + 1][j + 1][3]) / 4]);
    }
    q.sort(function (u, v) { return v[0] - u[0]; });
    c.lineWidth = px(st, 0.6);
    q.forEach(function (t) { var i = t[1], j = t[2], col = color(t[4], t[3]); c.fillStyle = col; c.strokeStyle = col; c.beginPath();
      c.moveTo(P[i][j][0], P[i][j][1]); c.lineTo(P[i][j + 1][0], P[i][j + 1][1]); c.lineTo(P[i + 1][j + 1][0], P[i + 1][j + 1][1]); c.lineTo(P[i + 1][j][0], P[i + 1][j][1]); c.closePath(); c.fill(); c.stroke(); });
  }
  function rgb(h, k) { return 'rgb(' + Math.round(h[0] * k) + ',' + Math.round(h[1] * k) + ',' + Math.round(h[2] * k) + ')'; }
  window.EDU = { mesh: mesh, rgb: rgb, def: def, rng: rng, px: px, text: text, axes: axes, clear: clear, chips: chips, onScroll: onScroll, progress: progress, hover: hover, gauge: gauge,
    FOAM: FOAM, MIST: MIST, ROPE: ROPE, DEEP: DEEP, LINE: LINE };
  // after the per-subject scripts have run: wrap the hand-written figures as panels and give each section its tab row
  document.addEventListener('DOMContentLoaded', function () {
    Object.keys(DEMO).forEach(function (code) {
      var fig = document.getElementById(DEMO[code]); if (!fig || fig.parentNode.classList.contains('dpanel')) return;
      var panel = document.createElement('div'); panel.className = 'dpanel'; panel.dataset.code = code;
      var note = fig.nextElementSibling && fig.nextElementSibling.classList.contains('demo-note') ? fig.nextElementSibling : null;
      fig.parentNode.insertBefore(panel, fig); panel.appendChild(fig); if (note) panel.appendChild(note);
    });
    Array.prototype.forEach.call(document.querySelectorAll('section.block'), function (sec) {
      var panels = Array.prototype.slice.call(sec.querySelectorAll('.dpanel')); if (!panels.length) return;
      var order = C.map(function (c) { return c[0]; });
      panels.sort(function (a, b) { return order.indexOf(a.dataset.code) - order.indexOf(b.dataset.code); });
      var bar = document.createElement('div'); bar.className = 'dtabs'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'Courses');
      panels.forEach(function (p) {
        var code = p.dataset.code, b = document.createElement('button'); b.type = 'button'; b.className = 'dtab'; b.dataset.code = code; b.setAttribute('role', 'tab');
        b.style.setProperty('--c', SUBJ[subjOf(code)].c); b.title = BYCODE[code][1]; b.textContent = pretty(code);
        b.addEventListener('click', function () { showDemo(code); });
        bar.appendChild(b); sec.insertBefore(p, sec.querySelector('.also'));
      });
      bar.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; var bs = Array.prototype.slice.call(bar.children), i = bs.indexOf(document.activeElement);
        if (i < 0) return; var n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length]; n.focus(); n.click(); e.preventDefault();
      });
      sec.insertBefore(bar, panels[0]);
      var first = panels.filter(function (p) { return ['qm', 'linalg', 'cournot', 'enzyme'].indexOf(DEMO[p.dataset.code]) >= 0; })[0] || panels[0];
      showDemo(first.dataset.code);
    });
    kick();
  });

  kick();
})();
