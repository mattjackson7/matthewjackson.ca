/* Risk page, live snapshot: reads data/risk-snapshot.json, which a GitHub
   Action rebuilds after every US close (scripts/risk_snapshot.py), and draws
   the portfolio's 99% VaR over the past year beside today's component VaR. */
(function () {
  var panel = document.getElementById('live-panel');
  if (!panel || !window.Viz || !window.Sandbox) return;
  var V = Viz, SB = Sandbox, FOAM = V.FOAM, MIST = V.MIST, ACC = '#ffb14e', ROPE = '#ff6a55';
  var asof = document.getElementById('live-asof'), stats = document.getElementById('live-stats');
  var cv = document.getElementById('live-chart'), read = document.getElementById('live-read');
  var tbody = panel.querySelector('#live-table tbody');
  var MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  var DAYS = 'Sun Mon Tue Wed Thu Fri Sat'.split(' ');

  function money(v) { return (v < 0 ? '&minus;' : '') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US'); }
  function kfmt(v) { return '$' + (Math.abs(v) >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : Math.round(v)); }
  function pct(v, d) { return (v < 0 ? '&minus;' : v > 0 ? '+' : '') + Math.abs(v * 100).toFixed(d == null ? 2 : d) + '%'; }
  function corrFmt(v) { var t = Math.abs(v).toFixed(2); return (v < 0 && t !== '0.00' ? '&minus;' : '') + t; }
  function day(s) { var p = s.split('-'); return +p[2] + ' ' + MONTHS[+p[1] - 1] + ' ' + p[0]; }
  function longDay(s) { var p = s.split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); return DAYS[d.getUTCDay()] + ' ' + day(s); }

  var D = null, hov = -1, geo = null;

  function fill() {
    var v = D.var, a = D.assets;
    var gen = new Date(D.generated.replace('Z', ':00Z'));
    asof.innerHTML = 'As of the close on <b>' + longDay(D.asOf) + '</b> &middot; rebuilt ' +
      (isNaN(gen) ? D.generated : gen.toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })) + ' &middot; ' + D.source;
    stats.innerHTML = [
      ['1-day VaR, 99%, EWMA', money(v.ewma99)],
      ['Expected shortfall, 99%', money(v.es99)],
      ['Historical VaR, last ' + v.histDays + ' days', money(v.hist99)],
      ['Last day&rsquo;s P&amp;L on $1M', money(D.pnl1d)],
      ['Average correlation, now / 2-year', corrFmt(D.corr.avgNow) + ' / ' + corrFmt(D.corr.avgLong)]
    ].map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('');
    tbody.innerHTML = a.map(function (x) {
      return '<tr><th scope="row">' + x.name + '</th><td class="m">' + x.ticker + '</td><td class="m">' + money(x.position) + '</td><td class="m">' + x.close.toFixed(2) +
        '</td><td class="m' + (x.change < 0 ? ' neg' : '') + '">' + pct(x.change) + '</td><td class="m">' + (x.volEwma * 100).toFixed(1) + '%</td><td class="m">' + (x.vol1y * 100).toFixed(1) +
        '%</td><td class="m">' + money(x.componentVar) + '</td></tr>';
    }).join('');
    read.innerHTML = summary();
  }

  function summary() {
    var v = D.var, s = D.series.var, n = s.length, ago = s[Math.max(0, n - 22)];
    var hedge = D.assets.filter(function (x) { return x.componentVar < 0; }).map(function (x) { return x.name.toLowerCase(); });
    var top = D.assets.slice().sort(function (p, q) { return q.componentVar - p.componentVar; })[0];
    var lo = Math.min.apply(null, s), hi = Math.max.apply(null, s);
    return 'On these closes, the EWMA model gives a 1% chance of losing more than <b>' + money(v.ewma99) + '</b> on the next day, ' +
      (Math.abs(v.ewma99 - ago) < 0.03 * ago ? 'about the same as' : v.ewma99 > ago ? 'up from' : 'down from') + ' ' + money(ago) + ' a month earlier; over the past year it has ranged from ' + money(lo) + ' to ' + money(hi) + '. ' +
      'The ' + top.name.toLowerCase() + ' position carries ' + Math.round(top.componentVar / v.ewma99 * 100) + '% of it. Held separately the four would add to ' + money(v.undiversified) + ', so diversification takes off ' + money(v.undiversified - v.ewma99) + '.' +
      (hedge.length ? ' Right now the ' + hedge.join(' and ') + (hedge.length > 1 ? ' positions act as hedges, with negative component VaRs.' : ' position acts as a hedge, with a negative component VaR.') : '');
  }

  var vw = SB.view(cv, {
    height: function (w) { return w < 640 ? 470 : 300; },
    draw: function (c, w, h) {
      if (!D) return false;
      var narrow = w < 640, s = D.series, n = s.var.length;
      // left (or top): VaR through the year
      var A = narrow ? { x: 46, y: 24, w: w - 56, h: 200 } : { x: 52, y: 24, w: w * 0.6 - 64, h: h - 58 };
      var top = SB.niceStep(Math.max.apply(null, s.var) * 1.12, 4), ymax = Math.ceil(Math.max.apply(null, s.var) * 1.12 / top) * top;
      var X = function (i) { return A.x + i / (n - 1) * A.w; }, Y = function (v) { return A.y + A.h - v / ymax * A.h; };
      for (var t = 0; t <= ymax + 1; t += top) {
        V.line(c, A.x, Y(t), A.x + A.w, Y(t), 'rgba(234,246,248,0.07)', { width: 1 });
        V.text(c, kfmt(t), A.x - 8, Y(t) + 4, { size: 10, color: MIST, align: 'right' });
      }
      var lastM = '';
      s.dates.forEach(function (d, i) {
        var m = d.slice(0, 7);
        if (m !== lastM && i > 4 && i < n - 8) {
          var p = d.split('-'), lab = MONTHS[+p[1] - 1] + (p[1] === '01' ? ' ' + p[0].slice(2) : '');
          if (!narrow || +p[1] % 2 === 1) V.text(c, lab, X(i), A.y + A.h + 16, { size: 10, color: MIST, align: 'center' });
        }
        lastM = m;
      });
      V.text(c, '1-day 99% VaR, EWMA', A.x, A.y - 10, { size: 10, color: MIST });
      c.beginPath();
      c.moveTo(X(0), Y(0));
      s.var.forEach(function (v, i) { c.lineTo(X(i), Y(v)); });
      c.lineTo(X(n - 1), Y(0)); c.closePath();
      V.ga(c, 1); c.fillStyle = 'rgba(255,177,78,0.08)'; c.fill();
      c.beginPath();
      s.var.forEach(function (v, i) { i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v)); });
      c.strokeStyle = ACC; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke();
      var k = hov >= 0 ? hov : n - 1;
      V.line(c, X(k), A.y, X(k), A.y + A.h, 'rgba(234,246,248,0.25)', { width: 1, dash: [3, 4] });
      V.dot(c, X(k), Y(s.var[k]), 4.5, ACC, { halo: true });
      var right = X(k) > A.x + A.w * 0.7;
      V.text(c, kfmt(s.var[k]) + (k === n - 1 ? ' tonight' : ' · ' + day(s.dates[k])), X(k) + (right ? -9 : 9), Math.max(A.y + 12, Y(s.var[k]) - 10), { size: 11, color: FOAM, align: right ? 'right' : 'left', weight: 500 });
      geo = { A: A, X: X, n: n };

      // right (or bottom): component VaR against standalone VaR
      var B = narrow ? { x: 92, y: A.y + A.h + 64, w: w - 104, h: h - (A.y + A.h + 64) - 20 } : { x: w * 0.6 + 70, y: 24, w: w * 0.4 - 80, h: h - 58 };
      var as = D.assets, lo = Math.min(0, Math.min.apply(null, as.map(function (x) { return x.componentVar; })));
      var hiV = Math.max.apply(null, as.map(function (x) { return x.standaloneVar; }));
      var W = function (v) { return B.x + (v - lo) / (hiV - lo) * B.w; }, rowH = B.h / as.length;
      V.text(c, 'Component VaR vs standalone', B.x - (narrow ? 82 : 60), B.y - 10, { size: 10, color: MIST });
      V.line(c, W(0), B.y, W(0), B.y + B.h, 'rgba(234,246,248,0.25)', { width: 1 });
      as.forEach(function (x, i) {
        var y = B.y + i * rowH + rowH * 0.22, bh = rowH * 0.5;
        V.text(c, x.ticker, B.x - 10, y + bh / 2 + 4, { size: 11, color: FOAM, align: 'right', weight: 500 });
        V.ga(c, 1);
        c.strokeStyle = 'rgba(234,246,248,0.35)'; c.lineWidth = 1;
        c.strokeRect(W(0) + 0.5, y + 0.5, W(x.standaloneVar) - W(0) - 1, bh - 1);
        var x0 = W(Math.min(0, x.componentVar)), x1 = W(Math.max(0, x.componentVar));
        c.fillStyle = x.componentVar < 0 ? ROPE : ACC;
        c.fillRect(x0, y + 3, Math.max(1, x1 - x0), bh - 6);
        var lab = kfmt(x.componentVar).replace('$-', '−$'), at = x.componentVar < 0 ? x0 - 6 : Math.max(x1, W(x.standaloneVar)) + 6;
        if (x.componentVar >= 0 && at > B.x + B.w - 30) V.text(c, lab, x1 - 6, y + bh / 2 + 4, { size: 10, color: '#07222e', align: 'right', weight: 600 });
        else if (x.componentVar < 0) V.text(c, lab, W(0) + 6, y + bh / 2 + 4, { size: 10, color: ROPE, weight: 600 });
        else V.text(c, lab, at, y + bh / 2 + 4, { size: 10, color: FOAM });
      });
      return false;
    }
  });

  function at(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function pickAt(p) {
    if (!geo) return;
    var A = geo.A, inside = p[0] >= A.x - 10 && p[0] <= A.x + A.w + 10 && p[1] >= A.y - 10 && p[1] <= A.y + A.h + 20;
    set(inside ? Math.round(Math.max(0, Math.min(1, (p[0] - A.x) / A.w)) * (geo.n - 1)) : -1);
  }
  function set(i) {
    if (i === hov) return;
    hov = i;
    if (D) read.innerHTML = i < 0 ? summary() : 'On the close of ' + longDay(D.series.dates[i]) + ', the next day&rsquo;s 99% VaR was <b>' + money(D.series.var[i]) + '</b>.';
    vw.kick();
  }
  cv.addEventListener('pointermove', function (e) { pickAt(at(e)); });
  cv.addEventListener('pointerdown', function (e) { pickAt(at(e)); });
  cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') set(-1); });
  cv.addEventListener('blur', function () { set(-1); });
  cv.addEventListener('keydown', function (e) {
    if (!D) return;
    var n = D.series.var.length;
    if (e.key === 'ArrowLeft') set(hov < 0 ? n - 2 : Math.max(0, hov - 1));
    else if (e.key === 'ArrowRight') set(hov < 0 ? n - 1 : Math.min(n - 1, hov + 1));
    else if (e.key === 'Escape') set(-1);
    else return;
    e.preventDefault();
  });

  fetch('data/risk-snapshot.json?d=' + new Date().toISOString().slice(0, 13), { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { D = d; fill(); vw.kick(); })
    .catch(function () { asof.textContent = 'The latest snapshot could not be loaded. Try refreshing the page.'; });
})();
