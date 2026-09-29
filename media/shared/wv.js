/* media/shared/wv.js — deterministic SVG helpers (RViz art-directed idiom). No randomness, no clocks. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  /* Perspective ROS grid: a floor plane seen from a low three-quarter camera. */
  function grid(svg, W, H, o) {
    o = o || {};
    var vx = o.vx != null ? o.vx : W * 0.5, vy = o.vy != null ? o.vy : H * 0.38;
    var g = el('g', { 'class': 'rosgrid', stroke: o.color || '#F2F5F7', 'stroke-width': 1.2, fill: 'none' }, svg);
    var n = o.cols || 26, spread = o.spread || W * 3.2;
    for (var i = 0; i <= n; i++) {
      var bx = vx - spread / 2 + (spread * i) / n;
      el('line', { x1: bx, y1: H + 40, x2: vx + (bx - vx) * 0.04, y2: vy + (H - vy) * 0.04, opacity: 0.16 }, g);
    }
    var rows = o.rows || 16;
    for (var j = 1; j <= rows; j++) {
      var t = Math.pow(j / rows, 2.1);
      var y = vy + (H + 40 - vy) * t;
      el('line', { x1: 0, y1: y, x2: W, y2: y, opacity: (0.05 + 0.2 * t).toFixed(3) }, g);
    }
    return g;
  }
  /* TF triad: unlabelled, desaturated RGB, >=16px. */
  function triad(parent, x, y, s) {
    var g = el('g', { 'class': 'triad', transform: 'translate(' + x + ',' + y + ')' }, parent);
    s = s || 34;
    el('line', { x1: 0, y1: 0, x2: s, y2: s * 0.28, stroke: '#D9707A', 'stroke-width': 3, opacity: 0.8 }, g);
    el('line', { x1: 0, y1: 0, x2: -s * 0.72, y2: s * 0.34, stroke: '#7FCB9C', 'stroke-width': 3, opacity: 0.8 }, g);
    el('line', { x1: 0, y1: 0, x2: 0, y2: -s, stroke: '#7AA7E0', 'stroke-width': 3, opacity: 0.8 }, g);
    return g;
  }
  var STROKE = { fill: 'none', stroke: '#F2F5F7', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
  function wire(parent, id, x, y, s, op) {
    var g = el('g', { id: id, transform: 'translate(' + x + ',' + y + ') scale(' + s + ')', opacity: op == null ? 1 : op }, parent);
    var w = el('g', STROKE, g);
    return { g: g, w: w };
  }
  function rover(parent, id, x, y, s, op) {
    var r = wire(parent, id, x, y, s, op), w = r.w;
    el('ellipse', { cx: 0, cy: 18, rx: 150, ry: 26, fill: 'rgba(0,0,0,.55)', stroke: 'none' }, r.g);
    el('polygon', { points: '-110,-10 40,-40 130,-10 -20,20' }, w);
    el('polyline', { points: '-110,-10 -110,-60 40,-90 130,-60 130,-10' }, w);
    el('polyline', { points: '-110,-60 -20,-30 130,-60' }, w);
    el('line', { x1: -20, y1: -30, x2: -20, y2: 20 }, w);
    el('line', { x1: 40, y1: -90, x2: 40, y2: -40, opacity: 0.35 }, w);
    [[-86, 8], [-6, 26], [96, 2], [20, -26]].forEach(function (p, i) {
      el('ellipse', { cx: p[0], cy: p[1], rx: 22, ry: 26, opacity: i === 3 ? 0.35 : 1 }, w);
    });
    el('ellipse', { cx: 20, cy: -66, rx: 26, ry: 9 }, w);
    el('line', { x1: -6, y1: -66, x2: -6, y2: -90 }, w);
    el('line', { x1: 46, y1: -66, x2: 46, y2: -90 }, w);
    el('ellipse', { cx: 20, cy: -90, rx: 26, ry: 9 }, w);
    return r.g;
  }
  function quadruped(parent, id, x, y, s, op) {
    var r = wire(parent, id, x, y, s, op), w = r.w;
    el('ellipse', { cx: 0, cy: 70, rx: 110, ry: 18, fill: 'rgba(0,0,0,.5)', stroke: 'none' }, r.g);
    el('polygon', { points: '-80,-40 60,-60 90,-40 -50,-20' }, w);
    el('polyline', { points: '-80,-40 -80,-18 -50,2 90,-18 90,-40' }, w);
    el('line', { x1: -50, y1: -20, x2: -50, y2: 2 }, w);
    el('polygon', { points: '90,-50 124,-56 132,-38 98,-32' }, w);
    [[-66, -8, -78, 26, -64, 66], [-40, 0, -28, 34, -44, 72], [70, -18, 58, 18, 74, 58], [86, -26, 100, 10, 88, 50]].forEach(function (l) {
      el('polyline', { points: l[0] + ',' + l[1] + ' ' + l[2] + ',' + l[3] + ' ' + l[4] + ',' + l[5] }, w);
    });
    return r.g;
  }
  function drone(parent, id, x, y, s, op) {
    var r = wire(parent, id, x, y, s, op), w = r.w;
    el('polygon', { points: '-26,0 0,-10 26,0 0,10' }, w);
    el('line', { x1: -26, y1: 0, x2: -96, y2: -18 }, w);
    el('line', { x1: 26, y1: 0, x2: 96, y2: -18 }, w);
    el('line', { x1: 0, y1: 10, x2: -40, y2: 36 }, w);
    el('line', { x1: 0, y1: -10, x2: 40, y2: -36 }, w);
    [[-96, -18], [96, -18], [-40, 36], [40, -36]].forEach(function (p) {
      el('ellipse', { cx: p[0], cy: p[1], rx: 40, ry: 10 }, w);
    });
    el('line', { x1: 0, y1: 10, x2: 0, y2: 26 }, w);
    return r.g;
  }
  function mast(parent, id, x, y, s, op) {
    var r = wire(parent, id, x, y, s, op), w = r.w;
    el('line', { x1: 0, y1: 0, x2: 0, y2: -210 }, w);
    el('polyline', { points: '-50,26 0,0 54,22' }, w);
    el('line', { x1: 0, y1: 0, x2: 6, y2: 38 }, w);
    el('rect', { x: -26, y: -250, width: 52, height: 40, rx: 6 }, w);
    el('circle', { cx: 0, cy: -230, r: 10 }, w);
    return r.g;
  }
  /* LaserScan ring: dotted ellipse of hit points, centred on (cx, cy). */
  function scanRing(parent, id, cx, cy, rx, ry, n, color) {
    var g = el('g', { id: id, transform: 'translate(' + cx + ',' + cy + ')' }, parent);
    var inner = el('g', { 'class': 'ring-inner' }, g);
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      var jitter = 1 + 0.035 * Math.sin(i * 7.3) + 0.02 * Math.cos(i * 3.1);
      el('circle', { cx: (Math.cos(a) * rx * jitter).toFixed(1), cy: (Math.sin(a) * ry * jitter).toFixed(1), r: 2.6, fill: color || '#3CFFB4' }, inner);
    }
    return inner;
  }
  /* WiseOS node: the one solid-shaded prism in the scene. */
  function prism(parent, id, x, y, s) {
    var g = el('g', { id: id, transform: 'translate(' + x + ',' + y + ') scale(' + (s || 1) + ')' }, parent);
    el('ellipse', { cx: 0, cy: 70, rx: 120, ry: 22, fill: 'rgba(60,255,180,.10)' }, g);
    el('polygon', { points: '-70,-20 0,-50 70,-20 0,10', fill: '#3CFFB4' }, g);
    el('polygon', { points: '-70,-20 0,10 0,80 -70,50', fill: '#1E7F5C' }, g);
    el('polygon', { points: '70,-20 0,10 0,80 70,50', fill: '#2BB585' }, g);
    return g;
  }
  /* Deterministic "EW static": short horizontal dashes on a seeded lattice. */
  function noise(parent, id, W, H, n, color) {
    var g = el('g', { id: id, stroke: color || '#F2F5F7', 'stroke-width': 2, 'stroke-linecap': 'round' }, parent);
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < n; i++) {
      var x = rnd() * W, y = rnd() * H, l = 6 + rnd() * 40;
      el('line', { x1: x.toFixed(1), y1: y.toFixed(1), x2: (x + l).toFixed(1), y2: y.toFixed(1), opacity: (0.08 + rnd() * 0.3).toFixed(2) }, g);
    }
    return g;
  }
  window.WV = { el: el, grid: grid, triad: triad, rover: rover, quadruped: quadruped, drone: drone, mast: mast, scanRing: scanRing, prism: prism, noise: noise };
})();
