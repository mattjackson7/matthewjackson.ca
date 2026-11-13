/* Fig. 4 in 3D: the round-off double full rebuilt from one phone clip, drawn as a person.
   window.TUMBLE3D (from tumble3d-data.js): X = 69 frames x 21 points (m; x along the run, y up, z across),
   the 15 joints plus ears, heels, chest and navel; vars = the seven plotted variables.
   Tumble3D.mount(canvas) returns { render(t), resize() }. Needs three.js (r128). */
(function () {
  var D = window.TUMBLE3D; if (!D || !window.THREE) return;
  var THREE = window.THREE, NF = D.X.length, DT = 1 / 30, T0 = D.t0;
  window.Tumble3D = { mount: function (cv) {
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 2, 0.05, 80), up = new THREE.Vector3(0, 1, 0);
    scene.add(new THREE.HemisphereLight(0xdff4ff, 0x0b2a36, 0.95));
    var sun = new THREE.DirectionalLight(0xffffff, 0.75); sun.position.set(2, 6, 5); scene.add(sun);
    // the floor: a dark sprung floor with metre marks along the run
    var x0 = 1e9, x1 = -1e9;
    D.X.forEach(function (J) { J.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); }); });
    scene.fog = new THREE.Fog(0x07222e, 7, 16);   // the floor fades into the page
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 30, 30), new THREE.MeshLambertMaterial({ color: 0x0f3b4f }));
    floor.rotation.x = -Math.PI / 2; floor.position.set((x0 + x1) / 2, 0, 0); scene.add(floor);
    var lineMat = new THREE.LineBasicMaterial({ color: 0xeaf6f8, transparent: true, opacity: 0.28 });
    function gl(a, b) { scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a[0], 0.002, a[1]), new THREE.Vector3(b[0], 0.002, b[1])]), lineMat)); }
    gl([x0 - 3, -0.9], [x1 + 3, -0.9]); gl([x0 - 3, 0.9], [x1 + 3, 0.9]);
    for (var m = Math.ceil(x0); m <= Math.floor(x1); m++) gl([m, -0.9], [m, -0.75]);
    // centre of mass (segment masses) and its path: the whole pass faint, the part travelled bright
    var MW = [0.081, 0.1385, 0.1385, 0.022, 0.022, 0.014, 0.014, 0.1985, 0.1985, 0.0733, 0.0733, 0.0305, 0.0305, 0.0073, 0.0073];
    var sw = MW.reduce(function (a, b) { return a + b; }, 0);
    function com(J) { var c = [0, 0, 0]; for (var j = 0; j < 15; j++) for (var k = 0; k < 3; k++) c[k] += MW[j] * J[j][k] / sw; return c; }
    var CM = D.X.map(com);
    var pathAll = new THREE.Line(new THREE.BufferGeometry().setFromPoints(CM.map(function (c) { return new THREE.Vector3(c[0], c[1], c[2]); })), new THREE.LineDashedMaterial({ color: 0xffd166, dashSize: 0.06, gapSize: 0.08, transparent: true, opacity: 0.3 }));
    pathAll.computeLineDistances(); scene.add(pathAll);
    var pathGeo = new THREE.BufferGeometry(), pathPos = new Float32Array(NF * 2 * 3);
    pathGeo.setAttribute('position', new THREE.BufferAttribute(pathPos, 3));
    var path = new THREE.Line(pathGeo, new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.85 })); scene.add(path);
    var comDot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd166, depthTest: false })); comDot.renderOrder = 5; scene.add(comDot);
    var shadow = new THREE.Mesh(new THREE.CircleGeometry(0.32, 28), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }));
    shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
  // ---- a person-shaped figure driven by the same joints: tapered limbs, a torso that twists between hips and shoulders,
  //      head turned by the nose and ears, hands, shoes; shirt and shorts as in the video ----
  var PCOL = { skin: 0xd9a682, shirt: 0x8f9aa6, shorts: 0x1b2129, shoe: 0xf2f4f5, hair: 0x2a1d17 };
  function pmat(c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.0 }); }
  var PM = { skin: pmat(PCOL.skin), shirt: pmat(PCOL.shirt), shorts: pmat(PCOL.shorts), shoe: pmat(PCOL.shoe), hair: pmat(PCOL.hair) };
  function makePerson() {
    var g = new THREE.Group(), parts = {};
    // limb pieces: [name, radius at the near end, radius at the far end, material]
    function seg(name, r0, r1, m) { var geo = new THREE.CylinderGeometry(r1, r0, 1, 18, 1, true); var me = new THREE.Mesh(geo, PM[m]); g.add(me); parts[name] = me; }
    function ball(name, r, m) { var me = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), PM[m]); g.add(me); parts[name] = me; }
    ['L', 'R'].forEach(function (s) {
      seg(s + 'sleeve', 0.058, 0.05, 'shirt'); seg(s + 'ua', 0.047, 0.04, 'skin'); seg(s + 'fa', 0.039, 0.03, 'skin');
      seg(s + 'shortsleg', 0.092, 0.078, 'shorts'); seg(s + 'th', 0.075, 0.056, 'skin'); seg(s + 'sn', 0.054, 0.036, 'skin');
      ball(s + 'sh', 0.058, 'shirt'); ball(s + 'el', 0.04, 'skin'); ball(s + 'kn', 0.056, 'skin'); ball(s + 'an', 0.038, 'skin');
      var hand = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), PM.skin); g.add(hand); parts[s + 'hand'] = hand;
      var shoe = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), PM.shoe); g.add(shoe); parts[s + 'shoe'] = shoe;
      seg(s + 'upper', 0.047, 0.05, 'shoe'); ball(s + 'heelb', 0.042, 'shoe');
    });
    seg('neck', 0.055, 0.05, 'skin');
    var head = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), PM.skin); g.add(head); parts.head = head;
    var hair = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), PM.hair); g.add(hair); parts.hair = hair;
    var nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), PM.skin); g.add(nose); parts.nose = nose;
    // torso: rings of points between the hips and the shoulders, re-shaped every frame
    var RINGS = 13, SEGS = 28, pos = new Float32Array((RINGS * SEGS + 2) * 3), col = new Float32Array((RINGS * SEGS + 2) * 3), idx = [];
    for (var r = 0; r < RINGS - 1; r++) for (var q = 0; q < SEGS; q++) {
      var a = r * SEGS + q, b = r * SEGS + (q + 1) % SEGS, c = a + SEGS, d = b + SEGS; idx.push(a, b, c, b, d, c);
    }
    var bot = RINGS * SEGS, top = bot + 1;
    for (q = 0; q < SEGS; q++) { idx.push(bot, (q + 1) % SEGS, q); idx.push(top, (RINGS - 1) * SEGS + q, (RINGS - 1) * SEGS + (q + 1) % SEGS); }
    var tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.setIndex(idx);
    var torso = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })); g.add(torso); parts.torso = torso;
    var cShirt = new THREE.Color(PCOL.shirt), cShorts = new THREE.Color(PCOL.shorts);
    for (r = 0; r < RINGS; r++) for (q = 0; q < SEGS; q++) { var cc = r / (RINGS - 1) < 0.34 ? cShorts : cShirt; col.set([cc.r, cc.g, cc.b], (r * SEGS + q) * 3); }
    col.set([cShorts.r, cShorts.g, cShorts.b], bot * 3); col.set([cShirt.r, cShirt.g, cShirt.b], top * 3);
    scene.add(g); g.visible = false;
    return { g: g, parts: parts, RINGS: RINGS, SEGS: SEGS };
  }
  var _a = new THREE.Vector3(), _b = new THREE.Vector3(), _u = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
  function placeSeg(me, a, b) { _a.subVectors(b, a); var L = _a.length(); me.position.copy(a).addScaledVector(_a, 0.5); me.scale.set(1, Math.max(L, 1e-4), 1); me.quaternion.setFromUnitVectors(up, _a.normalize()); }
  function orient(me, x, y, z) { _m.makeBasis(x, y, z); me.quaternion.setFromRotationMatrix(_m); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function posePerson(F, P) {
    var p = F.parts, full = P.length > 15;
    var sm = P[1].clone().add(P[2]).multiplyScalar(0.5), hm = P[7].clone().add(P[8]).multiplyScalar(0.5);
    var u = sm.clone().sub(hm).normalize(), rs = P[2].clone().sub(P[1]), rh = P[8].clone().sub(P[7]);
    var shW = rs.length(), hipW = rh.length();
    function perp(v) { return v.clone().addScaledVector(u, -v.dot(u)).normalize(); }
    var rS = perp(rs), rH = perp(rh);
    // torso rings: (height along the spine 0..1, half-width, front depth, back depth), from below the hips to the top of the shoulders
    var PROF = [[-0.16, 0.6, 0.0, 0.0], [-0.12, 0.88, 0.07, 0.08], [-0.04, 1.0, 0.095, 0.105], [0.06, 1.0, 0.1, 0.105], [0.18, 0.92, 0.095, 0.09], [0.32, 0.8, 0.09, 0.08],
                [0.45, 0.8, 0.1, 0.085], [0.58, 0.86, 0.115, 0.09], [0.72, 0.93, 0.12, 0.095], [0.84, 0.98, 0.11, 0.095], [0.94, 0.96, 0.09, 0.085], [1.02, 0.78, 0.065, 0.065], [1.07, 0.35, 0.03, 0.03]];
    var L = sm.distanceTo(hm), pos = p.torso.geometry.attributes.position, S = F.SEGS;
    for (var r = 0; r < F.RINGS; r++) {
      var pr = PROF[r], t = pr[0], s = smooth(Math.max(0, Math.min(1, (t - 0.1) / 0.8)));
      var rr = rH.clone().multiplyScalar(1 - s).addScaledVector(rS, s).normalize(), ff = new THREE.Vector3().crossVectors(u, rr);
      var half = (hipW / 2 + 0.085) * (1 - s) + (shW / 2 + 0.035) * s, w = half * pr[1];
      var c = hm.clone().addScaledVector(u, t * L);
      for (var q = 0; q < S; q++) {
        var th = q / S * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th), dep = sn > 0 ? pr[2] : pr[3];
        pos.setXYZ(r * S + q, c.x + rr.x * w * cs + ff.x * dep * sn, c.y + rr.y * w * cs + ff.y * dep * sn, c.z + rr.z * w * cs + ff.z * dep * sn);
      }
    }
    var cb = hm.clone().addScaledVector(u, -0.17 * L), ct = hm.clone().addScaledVector(u, 1.08 * L);
    pos.setXYZ(F.RINGS * S, cb.x, cb.y, cb.z); pos.setXYZ(F.RINGS * S + 1, ct.x, ct.y, ct.z);
    pos.needsUpdate = true; p.torso.geometry.computeVertexNormals(); p.torso.geometry.computeBoundingSphere();
    var fS = new THREE.Vector3().crossVectors(u, rS);
    // arms (short sleeves) and legs (shorts)
    ['L', 'R'].forEach(function (sd, k) {
      var S0 = P[1 + k], E = P[3 + k], W = P[5 + k], Hh = P[7 + k], K = P[9 + k], A = P[11 + k], T = P[13 + k];
      var sOut = S0.clone().addScaledVector(rS, (k ? 1 : -1) * 0.01);
      p[sd + 'sh'].position.copy(sOut);
      var sl = sOut.clone().lerp(E, 0.38); placeSeg(p[sd + 'sleeve'], sOut, sl); placeSeg(p[sd + 'ua'], sl, E); p[sd + 'el'].position.copy(E);
      placeSeg(p[sd + 'fa'], E, W);
      var fd = W.clone().sub(E).normalize(), hc = W.clone().addScaledVector(fd, 0.06), side = new THREE.Vector3().crossVectors(fd, fS);
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
      p[sd + 'hand'].position.copy(hc); p[sd + 'hand'].scale.set(0.045, 0.075, 0.022); orient(p[sd + 'hand'], side, fd, new THREE.Vector3().crossVectors(side, fd));
      var Hin = Hh.clone().addScaledVector(u, 0.02), mid = Hin.clone().lerp(K, 0.45);
      placeSeg(p[sd + 'shortsleg'], Hin, mid); placeSeg(p[sd + 'th'], mid, K); p[sd + 'kn'].position.copy(K);
      placeSeg(p[sd + 'sn'], K, A); p[sd + 'an'].position.copy(A);
      // shoe: from the heel to past the toes (heel solved in the new solve; otherwise set behind the ankle)
      var heel = full ? P[17 + k] : A.clone().addScaledVector(T.clone().sub(A), -0.3).addScaledVector(K.clone().sub(A).normalize(), -0.03);
      var tip = T.clone().addScaledVector(T.clone().sub(heel).normalize(), 0.03), fl = tip.distanceTo(heel), fdir = tip.clone().sub(heel).normalize();
      var sideF = new THREE.Vector3().crossVectors(fdir, K.clone().sub(A)).normalize(), upF = new THREE.Vector3().crossVectors(sideF, fdir).normalize();
      // the shoe body runs heel to toe; the upper joins it to the ankle, so the foot stays on whatever the angle
      var sc = p[sd + 'shoe'], cen = heel.clone().lerp(tip, 0.55); sc.position.copy(cen); sc.scale.set(0.046, fl / 2 + 0.01, 0.04);
      orient(sc, sideF, fdir, upF);
      p[sd + 'heelb'].position.copy(heel).addScaledVector(fdir, 0.03);
      placeSeg(p[sd + 'upper'], A.clone().addScaledVector(K.clone().sub(A).normalize(), 0.03), heel.clone().lerp(tip, 0.3));
      p[sd + 'an'].visible = false;
    });
    // neck and head: turned by the nose and ears when they were placed
    var headC, hf, hu;
    if (full) {
      var em = P[15].clone().add(P[16]).multiplyScalar(0.5); headC = em.clone().lerp(P[0], 0.25);
      hu = headC.clone().sub(sm).normalize(); hf = P[0].clone().sub(em); hf.addScaledVector(hu, -hf.dot(hu)).normalize();
    } else {
      hu = P[0].clone().sub(sm).normalize(); hf = fS.clone().addScaledVector(hu, -fS.dot(hu)).normalize(); headC = P[0].clone().addScaledVector(hf, -0.07);
    }
    var hr = new THREE.Vector3().crossVectors(hu, hf).normalize();
    var neckTop = headC.clone().addScaledVector(hu, -0.06).addScaledVector(hf, -0.015);
    placeSeg(p.neck, sm.clone().addScaledVector(u, -0.02), neckTop);
    p.head.position.copy(headC); p.head.scale.set(0.078, 0.105, 0.092); orient(p.head, hr, hu, hf);
    p.hair.position.copy(headC).addScaledVector(hu, 0.008).addScaledVector(hf, -0.008); p.hair.scale.set(0.082, 0.108, 0.096); orient(p.hair, hr, hu, hf);
    p.hair.rotateX(-0.35);
    p.nose.position.copy(headC).addScaledVector(hf, 0.09).addScaledVector(hu, -0.01);
  }

    var person = makePerson(); person.g.visible = true;
    function jointsAt(t) {
      var f = Math.max(0, Math.min(NF - 1, (t - T0) / DT)), i = Math.min(NF - 2, Math.floor(f)), e = f - i, A = D.X[i], B = D.X[i + 1];
      return A.map(function (p, k) { var q = B[k]; return new THREE.Vector3(p[0] + (q[0] - p[0]) * e, p[1] + (q[1] - p[1]) * e, p[2] + (q[2] - p[2]) * e); });
    }
    var orbit = 0, camT = null, W = 0, H = 0;
    function resize() {
      var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      if (w !== W || h !== H) { W = w; H = h; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    }
    // drag sideways to walk the camera around you
    var drag = null;
    cv.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' || e.isPrimary) drag = { x: e.clientX, o: orbit }; });
    window.addEventListener('pointermove', function (e) { if (drag) orbit = Math.max(-1.3, Math.min(1.3, drag.o - (e.clientX - drag.x) * 0.006)); });
    window.addEventListener('pointerup', function () { drag = null; });
    function render(t) {
      resize();
      var P = jointsAt(t), c = com(P.map(function (v) { return [v.x, v.y, v.z]; }));
      posePerson(person, P);
      comDot.position.set(c[0], c[1], c[2]); shadow.position.set(c[0], 0.003, c[2]);
      var f = Math.max(0, Math.min(NF - 1, (t - T0) / DT)), n = 0;
      for (var i = 0; i <= Math.floor(f); i++) { pathPos.set(CM[i], 3 * n); n++; }
      pathPos.set(c, 3 * n); n++; pathGeo.setDrawRange(0, n); pathGeo.attributes.position.needsUpdate = true; pathGeo.computeBoundingSphere();
      // follow from the side (the phone's side), a little above, eased
      var want = new THREE.Vector3(c[0], Math.max(0.95, c[1] * 0.6 + 0.45), 0);
      camT = camT ? camT.lerp(want, 0.12) : want.clone();
      var r = W < 560 ? 6.4 : 5.6;
      cam.position.set(camT.x + Math.sin(orbit) * r, camT.y + 0.55, camT.z + Math.cos(orbit) * r); cam.lookAt(camT);
      renderer.render(scene, cam);
    }
    return { render: render, resize: resize };
  } };
})();
