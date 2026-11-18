/* Options sandbox: price any European or American call or put live.
   European prices and Greeks are Black-Scholes in closed form; American
   ones come from a Cox-Ross-Rubinstein tree, averaged over N and N + 1 steps
   to cancel the tree's odd-even wobble. */
(function () {
  var root = document.getElementById('sb-options');
  if (!root || !window.Sandbox || !window.Viz) return;
  var V = Viz, SB = Sandbox, FOAM = V.FOAM, MIST = V.MIST, DEEP = V.DEEP, ACC = '#ff6a55';
  var DEF = { put: false, amer: false, S: 100, K: 100, sig: 0.20, T: 0.5, r: 0.04 };
  var P = Object.assign({}, DEF);
  var X0 = 40, X1 = 160, NPTS = 121;

  /* ---------- Pricing ---------- */
  function euro(S, K, T, r, sig, put) {
    var b = V.bsm(S, K, T, r, sig);
    return put ? b.put : b.call;
  }
  function euroGreeks(S, K, T, r, sig, put) {
    var sq = Math.sqrt(T), d1 = (Math.log(S / K) + (r + sig * sig / 2) * T) / (sig * sq), d2 = d1 - sig * sq;
    var nd1 = V.pdf(d1), disc = K * Math.exp(-r * T);
    var price = put ? disc * V.N(-d2) - S * V.N(-d1) : S * V.N(d1) - disc * V.N(d2);
    return {
      price: price,
      delta: put ? V.N(d1) - 1 : V.N(d1),
      gamma: nd1 / (S * sig * sq),
      vega: S * nd1 * sq / 100,
      theta: (-S * nd1 * sig / (2 * sq) + (put ? r * disc * V.N(-d2) : -r * disc * V.N(d2))) / 365,
      rho: (put ? -T * disc * V.N(-d2) : T * disc * V.N(d2)) / 100,
      itm: put ? V.N(-d2) : V.N(d2)
    };
  }
  // one CRR tree; returns the price and the nodes needed for delta, gamma and theta
  var pw = new Float64Array(1);
  function tree(S, K, T, r, sig, put, amer, N) {
    var dt = T / N, u = Math.exp(sig * Math.sqrt(dt)), p = (Math.exp(r * dt) - 1 / u) / (u - 1 / u), q = 1 - p, disc = Math.exp(-r * dt);
    if (pw.length < 2 * N + 1) pw = new Float64Array(2 * N + 1);
    for (var k = -N; k <= N; k++) pw[k + N] = S * Math.pow(u, k);
    var v = new Float64Array(N + 1), j, n, s, ex, c, n1, n2;
    for (j = 0; j <= N; j++) { s = pw[2 * j]; v[j] = put ? Math.max(K - s, 0) : Math.max(s - K, 0); }
    for (n = N - 1; n >= 0; n--) {
      for (j = 0; j <= n; j++) {
        c = disc * (p * v[j + 1] + q * v[j]);
        if (amer) { s = pw[2 * j - n + N]; ex = put ? K - s : s - K; if (ex > c) c = ex; }
        v[j] = c;
      }
      if (n === 2) n2 = [v[0], v[1], v[2]];
      if (n === 1) n1 = [v[0], v[1]];
    }
    var Su = S * u, Sd = S / u, Suu = Su * u, Sdd = Sd / u;
    return {
      price: v[0],
      delta: (n1[1] - n1[0]) / (Su - Sd),
      gamma: ((n2[2] - n2[1]) / (Suu - S) - (n2[1] - n2[0]) / (S - Sdd)) / ((Suu - Sdd) / 2),
      theta: (n2[1] - v[0]) / (2 * dt) / 365
    };
  }
  function tree2(S, K, T, r, sig, put, amer, N) {
    var a = tree(S, K, T, r, sig, put, amer, N), b = tree(S, K, T, r, sig, put, amer, N + 1);
    return { price: (a.price + b.price) / 2, delta: (a.delta + b.delta) / 2, gamma: (a.gamma + b.gamma) / 2, theta: (a.theta + b.theta) / 2 };
  }
  // an American call on a stock with no dividends is never exercised early, so it is the European call
  function isTree() { return P.amer && P.put; }
  function priceAt(S) { return isTree() ? tree2(S, P.K, P.T, P.r, P.sig, true, true, 90).price : euro(S, P.K, P.T, P.r, P.sig, P.put); }
  function payoff(S) { return P.put ? Math.max(P.K - S, 0) : Math.max(S - P.K, 0); }

  /* ---------- State: targets, and the eased copies that get drawn ---------- */
  var T = { curve: new Float64Array(NPTS), pay: new Float64Array(NPTS), ytop: 1, S: P.S, V: 0, delta: 0, K: P.K, bnd: X0 };
  var D = { curve: new Float64Array(NPTS), pay: new Float64Array(NPTS), ytop: null, S: null, V: null, delta: null, K: null, bnd: null };
  var G = null;
  function sx(i) { return X0 + (X1 - X0) * i / (NPTS - 1); }

  function recompute(curveToo) {
    var i, s;
    if (curveToo) {
      var top = 0;
      for (i = 0; i < NPTS; i++) {
        s = sx(i);
        T.curve[i] = priceAt(s);
        T.pay[i] = payoff(s);
        top = Math.max(top, T.curve[i], T.pay[i]);
      }
      T.ytop = Math.max(5, top * 1.06);
      // the early-exercise boundary: below it the American put is worth exactly its payoff
      T.bnd = X0;
      if (isTree()) for (i = 0; i < NPTS; i++) { s = sx(i); if (s < P.K && T.curve[i] - (P.K - s) < 2e-3) T.bnd = s; }
    }
    var eu = euroGreeks(P.S, P.K, P.T, P.r, P.sig, P.put);
    if (isTree()) {
      var a = tree2(P.S, P.K, P.T, P.r, P.sig, true, true, 400);
      var up = tree2(P.S, P.K, P.T, P.r, P.sig + 0.005, true, true, 400).price, dn = tree2(P.S, P.K, P.T, P.r, P.sig - 0.005, true, true, 400).price;
      var ru = tree2(P.S, P.K, P.T, P.r + 0.0025, P.sig, true, true, 400).price, rd = tree2(P.S, P.K, P.T, Math.max(0, P.r - 0.0025), P.sig, true, true, 400).price;
      G = { price: a.price, delta: a.delta, gamma: a.gamma, theta: a.theta, vega: (up - dn), rho: (ru - rd) / ((P.r + 0.0025 - Math.max(0, P.r - 0.0025)) * 100), itm: eu.itm, euro: eu.price };
    } else {
      G = eu; G.euro = eu.price;
    }
    T.S = P.S; T.V = G.price; T.delta = G.delta; T.K = P.K;
    report();
    vw.kick();
  }

  /* ---------- Controls ---------- */
  var ctl = root.querySelector('.sb-controls');
  var money = function (v) { return '$' + v.toFixed(2); };
  function days(t) { var d = Math.round(t * 365); return d < 120 ? d + ' days' : (t * 12).toFixed(1) + ' months'; }
  var cType = SB.chips(ctl, { label: 'Option', value: 'call', options: [{ v: 'call', label: 'Call' }, { v: 'put', label: 'Put' }], onChange: function (v) { P.put = v === 'put'; recompute(true); } });
  var cEx = SB.chips(ctl, { label: 'Exercise', value: 'eu', options: [{ v: 'eu', label: 'European' }, { v: 'am', label: 'American' }], onChange: function (v) { P.amer = v === 'am'; recompute(true); } });
  var sS = SB.slider(ctl, { label: 'Spot price <i>S</i>', min: 50, max: 150, step: 0.5, value: P.S, fmt: function (v) { return '$' + v.toFixed(v % 1 ? 1 : 0); }, onInput: function (v) { P.S = v; recompute(false); } });
  var sK = SB.slider(ctl, { label: 'Strike <i>K</i>', min: 50, max: 150, step: 1, value: P.K, fmt: function (v) { return '$' + v; }, onInput: function (v) { P.K = v; recompute(true); } });
  var sV = SB.slider(ctl, { label: 'Volatility <i>&sigma;</i>', min: 5, max: 80, step: 1, value: P.sig * 100, fmt: function (v) { return v + '%'; }, onInput: function (v) { P.sig = v / 100; recompute(true); } });
  var sT = SB.slider(ctl, { label: 'Time to expiry <i>T</i>', min: 0.02, max: 2, step: 0.01, value: P.T, fmt: days, onInput: function (v) { P.T = v; recompute(true); } });
  var sR = SB.slider(ctl, { label: 'Risk-free rate <i>r</i>', min: 0, max: 10, step: 0.25, value: P.r * 100, fmt: function (v) { return v.toFixed(2) + '%'; }, onInput: function (v) { P.r = v / 100; recompute(true); } });
  SB.resetButton(ctl, function () {
    P = Object.assign({}, DEF);
    cType.set('call'); cEx.set('eu'); sS.set(P.S); sK.set(P.K); sV.set(P.sig * 100); sT.set(P.T); sR.set(P.r * 100);
    recompute(true);
  });

  /* ---------- Readouts ---------- */
  var setOut = SB.readouts(root.querySelector('.sb-out'), [
    { key: 'price', label: 'Price' },
    { key: 'delta', label: 'Delta &Delta;' },
    { key: 'gamma', label: 'Gamma &Gamma;' },
    { key: 'vega', label: 'Vega, per vol point' },
    { key: 'theta', label: 'Theta, per day' },
    { key: 'rho', label: 'Rho, per 1% rate' }
  ]);
  var readEl = root.querySelector('.sb-read');
  function sgn(v, d) { return (v < 0 ? '&minus;' : '') + Math.abs(v).toFixed(d); }
  function report() {
    setOut({
      price: money(G.price), delta: sgn(G.delta, 3), gamma: G.gamma.toFixed(4),
      vega: sgn(G.vega, 3), theta: sgn(G.theta, 3), rho: sgn(G.rho, 3)
    });
    var name = (P.amer ? 'American ' : 'European ') + (P.put ? 'put' : 'call');
    var intr = payoff(P.S), tv = Math.max(0, G.price - intr), s;
    s = 'The ' + name + ' is worth <b>' + money(G.price) + '</b>: <b>' + money(intr) + '</b> if exercised now, plus <b>' + money(tv) + '</b> of time value for the chance the stock moves further. ';
    if (P.amer && !P.put) s += 'With no dividends, exercising a call early never pays, so the American call is priced exactly like the European one. ';
    else if (isTree()) {
      var prem = G.price - G.euro;
      s += 'The right to exercise early adds <b>' + money(Math.max(0, prem)) + '</b> over the European put' +
        (T.bnd > X0 + 0.1 ? ', and it pays to exercise today if the stock is below about <b>$' + T.bnd.toFixed(0) + '</b>. ' : '. ');
    }
    s += 'It finishes in the money with risk-neutral probability <b>' + Math.round(G.itm * 100) + '%</b>, and loses <b>' + money(Math.abs(G.theta)) + '</b> a day to time decay.';
    readEl.innerHTML = s;
  }

  /* ---------- Drawing ---------- */
  var vw = SB.view(root.querySelector('canvas'), {
    height: function (w) { return w < 520 ? 300 : Math.min(420, Math.round(w * 0.58)); },
    draw: draw
  });

  function draw(c, w, h, dt) {
    var moving = SB.towardAll(D.curve, T.curve, dt, 12, 1e-3);
    moving = SB.towardAll(D.pay, T.pay, dt, 12, 1e-3) || moving;
    ['ytop', 'S', 'V', 'delta', 'K', 'bnd'].forEach(function (k) {
      D[k] = SB.toward(D[k], T[k], dt, 12);
      if (SB.near(D[k], T[k], 1e-3)) D[k] = T[k]; else moving = true;
    });
    var narrow = w < 520;
    var box = { x: narrow ? 40 : 52, y: 30, w: 0, h: 0 };
    box.w = w - box.x - 14; box.h = h - box.y - 36;
    var step = SB.niceStep(D.ytop, narrow ? 4 : 5), yt = [];
    for (var v = 0; v <= D.ytop + 1e-9; v += step) yt.push(v);
    var F = V.frame(c, box, [X0, X1], [0, D.ytop], {
      xticks: [40, 60, 80, 100, 120, 140, 160], yticks: yt,
      xfmt: function (t) { return '$' + t; }, yfmt: function (t) { return '$' + Math.round(t); }
    });
    var X = F.X, Y = F.Y, i;

    // time value: the gap between today's value and the payoff
    V.ga(c, 0.16);
    c.fillStyle = ACC;
    c.beginPath();
    for (i = 0; i < NPTS; i++) c[i ? 'lineTo' : 'moveTo'](X(sx(i)), Y(D.curve[i]));
    for (i = NPTS - 1; i >= 0; i--) c.lineTo(X(sx(i)), Y(D.pay[i]));
    c.closePath(); c.fill();

    // the early-exercise region of an American put, along the axis
    if (D.bnd > X0 + 0.5) {
      V.ga(c, 0.85);
      c.fillStyle = ACC;
      c.fillRect(X(X0), box.y + box.h - 4, X(D.bnd) - X(X0), 4);
      if (X(D.bnd) - X(X0) > 70) V.text(c, 'exercise early', X(X0) + 4, box.y + box.h - 9, { size: 10, color: FOAM });
    }

    // strike
    V.line(c, X(D.K), box.y + 4, X(D.K), box.y + box.h, MIST, { dash: [3, 4], alpha: 0.5 });
    V.text(c, 'K', X(D.K) + 4, box.y + 12, { size: 11, color: MIST });

    // payoff, then today's value
    polyline(c, D.pay, X, Y, MIST, 1.4, [5, 4], 0.9);
    polyline(c, D.curve, X, Y, ACC, 2.2, null, 1);

    // the current spot: value, and delta as the tangent
    var px = X(D.S), py = Y(D.V), half = (X1 - X0) * 0.09;
    c.save();
    c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
    V.line(c, X(D.S - half), Y(D.V - D.delta * half), X(D.S + half), Y(D.V + D.delta * half), FOAM, { width: 1.3, alpha: 0.75 });
    c.restore();
    V.line(c, px, py, px, box.y + box.h, FOAM, { dash: [2, 3], alpha: 0.35 });
    V.dot(c, px, py, 4.5, ACC, { halo: true });
    var lab = '$' + D.V.toFixed(2) + '   Δ ' + D.delta.toFixed(2).replace('-', '\u2212');
    // set the label above the curve, on the side its slope leaves open
    var right = D.delta < 0;
    V.text(c, lab, px + (right ? 14 : -14), Math.max(box.y + 12, py - 14), { size: 11, color: FOAM, align: right ? 'left' : 'right', weight: 500 });

    // legend
    var lx = box.x + 10, ly = box.y - 14;
    V.line(c, lx, ly, lx + 18, ly, ACC, { width: 2.2 });
    V.text(c, 'value today', lx + 24, ly + 4, { size: 10 });
    var lx2 = lx + (narrow ? 106 : 120);
    V.line(c, lx2, ly, lx2 + 18, ly, MIST, { width: 1.4, dash: [5, 4] });
    V.text(c, 'payoff at expiry', lx2 + 24, ly + 4, { size: 10 });
    if (!narrow) {
      var lx3 = lx2 + 150;
      V.ga(c, 0.3); c.fillStyle = ACC; c.fillRect(lx3, ly - 5, 14, 10);
      V.text(c, 'time value', lx3 + 20, ly + 4, { size: 10 });
    }
    V.ga(c, 1);
    return moving;
  }
  function polyline(c, arr, X, Y, color, width, dash, alpha) {
    V.ga(c, alpha);
    c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash || []);
    c.beginPath();
    for (var i = 0; i < NPTS; i++) c[i ? 'lineTo' : 'moveTo'](X(sx(i)), Y(arr[i]));
    c.stroke(); c.setLineDash([]);
  }

  recompute(true);
})();
