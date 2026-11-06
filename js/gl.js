/* Cena 3D (Three.js): batatas realistas (textura de foto) + temperos, sincronizadas com a rolagem. */
(function () {
  'use strict';
  var THREE = window.THREE;
  var GL = window.CrujaGL = {
    ok: false,
    state: {
      mouse: { x: 0, y: 0 },
      hero: { p: 0, intro: 0 },
      flavor: { spin: 0, out: 0 },
      crunch: { p: 0 },
      burst: { t: 0, out: 0 }
    }
  };
  if (!THREE) return;

  var UNIT_H = 3.4, CAMZ = 12, FOV = 32, PI = Math.PI;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var smooth = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  function rnd(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function loadImg(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }

  /* ---------- Ambiente de estúdio (reflexos) ---------- */
  function makeEnv(renderer) {
    var pm = new THREE.PMREMGenerator(renderer), sc = new THREE.Scene();
    sc.add(new THREE.Mesh(new THREE.BoxGeometry(34, 34, 34), new THREE.MeshBasicMaterial({ color: 0x100804, side: THREE.BackSide })));
    function panel(w, h, c, x, y, z, k) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m);
    }
    panel(16, 7, 0xffffff, 0, 14, 4, 3.2); panel(6, 16, 0xff7a1a, 14, 1, 3, 4.5); panel(5, 14, 0xffc233, -14, 2, -4, 3.4);
    panel(12, 3, 0xffffff, 0, -3, 14, 1.8); panel(3, 9, 0xe8261b, -11, 0, 9, 2.8);
    var rt = pm.fromScene(sc, 0.03); pm.dispose(); return rt.texture;
  }

  /* ---------- Textura: recortes de foto real de batata + borda tostada ---------- */
  function photoTexture(img, sx, sy, size, seed, tint) {
    var S = 512, r = rnd(seed), c = document.createElement('canvas'); c.width = c.height = S; var x = c.getContext('2d');
    var base = x.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S * .6);
    base.addColorStop(0, tint[0]); base.addColorStop(.6, tint[1]); base.addColorStop(1, tint[2]); x.fillStyle = base; x.fillRect(0, 0, S, S);
    x.globalCompositeOperation = 'soft-light'; x.globalAlpha = .45; x.drawImage(img, sx, sy, size, size, 0, 0, S, S);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    /* borda mais tostada e miolo ligeiramente mais claro */
    var g = x.createRadialGradient(S / 2, S / 2, S * .18, S / 2, S / 2, S * .5);
    g.addColorStop(0, 'rgba(255,235,160,.10)'); g.addColorStop(.62, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(120,62,8,.62)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    /* cristais de sal e flocos de tempero */
    for (var i = 0; i < 260; i++) { x.fillStyle = 'rgba(255,255,245,' + (.35 + r() * .5) + ')'; x.beginPath(); x.arc(r() * S, r() * S, .7 + r() * 1.7, 0, PI * 2); x.fill(); }
    for (i = 0; i < 70; i++) { x.fillStyle = 'rgba(' + (150 + r() * 70 | 0) + ',' + (50 + r() * 50 | 0) + ',20,' + (.35 + r() * .4) + ')'; x.beginPath(); x.ellipse(r() * S, r() * S, 1.5 + r() * 3, 1 + r() * 2, r() * PI, 0, PI * 2); x.fill(); }
    var map = new THREE.CanvasTexture(c); map.encoding = THREE.sRGBEncoding; map.anisotropy = 4;
    var b = document.createElement('canvas'); b.width = b.height = S; var bx = b.getContext('2d');
    try { bx.filter = 'grayscale(1) contrast(1.15) blur(1.4px)'; } catch (e) {}
    bx.drawImage(c, 0, 0);
    return { map: map, bump: new THREE.CanvasTexture(b) };
  }
  function proceduralTexture(seed, c1, c2, c3) {
    var S = 512, c = document.createElement('canvas'); c.width = c.height = S; var x = c.getContext('2d'), r = rnd(seed);
    var g = x.createRadialGradient(S / 2, S / 2, 20, S / 2, S / 2, S * .56); g.addColorStop(0, c1); g.addColorStop(.65, c2); g.addColorStop(1, c3); x.fillStyle = g; x.fillRect(0, 0, S, S);
    for (var i = 0; i < 60; i++) { x.fillStyle = 'rgba(' + (120 + r() * 50 | 0) + ',' + (60 + r() * 40 | 0) + ',10,' + (.08 + r() * .14) + ')'; x.beginPath(); x.ellipse(r() * S, r() * S, 14 + r() * 50, 10 + r() * 34, r() * PI, 0, PI * 2); x.fill(); }
    for (i = 0; i < 320; i++) { x.fillStyle = 'rgba(255,250,235,' + (.4 + r() * .5) + ')'; x.beginPath(); x.arc(r() * S, r() * S, .8 + r() * 1.8, 0, PI * 2); x.fill(); }
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return { map: t, bump: t };
  }
  function spriteTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d');
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  }

  /* ---------- Forma da batata: ondulada (canelada), oval e levemente em concha ---------- */
  function chipGeometry(seed) {
    var g = new THREE.SphereGeometry(1, 72, 48), p = g.attributes.position, uv = g.attributes.uv, r = rnd(seed);
    var a1 = r() * 6.28, a2 = r() * 6.28, k1 = .03 + r() * .04, k2 = .015 + r() * .03;
    var freq = 25 + r() * 5, ph = r() * 6.28, amp = .06 + r() * .025, cup = .26 + r() * .12, bendY = .03 + .05 * r(), curl = (r() - .5) * .1;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i), th = Math.atan2(y, x), rad = Math.sqrt(x * x + y * y);
      var f = 1 + k1 * Math.sin(2 * th + a1) + k2 * Math.sin(3 * th + a2);
      var px = x * f * 1.12, py = y * f * .92;
      var sn = Math.sin(freq * py + ph), tri = (2 / PI) * Math.asin(sn);
      var ridge = amp * (.55 * sn + .45 * tri) * (1 - .35 * rad * rad);
      p.setXYZ(i, px, py, z * .045 + cup * px * px - bendY * py * py + curl * px * rad + ridge);
      uv.setXY(i, x * .5 + .5, y * .5 + .5);
    }
    g.computeVertexNormals(); return g;
  }

  /* ---------- Montagem de objetos ---------- */
  var chipGeos = [], chipTex = [], chipMats = [], sprite;
  function makeMat(tex, tint) {
    return new THREE.MeshStandardMaterial({ map: tex.map, color: tint || 0xffffff, roughness: .66, metalness: 0, side: THREE.FrontSide, envMapIntensity: .45 });
  }
  function makeSwarm(n, seed, cfg) {
    var r = rnd(seed), grp = new THREE.Group(), items = [];
    for (var i = 0; i < n; i++) {
      var m = new THREE.Mesh(chipGeos[(i * 3 + 1) % chipGeos.length], chipMats[(i * 2 + 1) % chipMats.length]);
      var z = cfg.zmin + r() * (cfg.zmax - cfg.zmin), a = r() * PI * 2, rad = cfg.rmin + r() * (cfg.rmax - cfg.rmin);
      var d = (z - cfg.zmin) / (cfg.zmax - cfg.zmin), size = (cfg.min + r() * (cfg.max - cfg.min)) * (.75 + d * .6), sq = .9 + r() * .2;
      m.scale.set(size * sq, size / sq, size); grp.add(m);
      var ea = r() * PI * 2, er = cfg.ex * (.5 + r() * .8), ff = .4 + r() * .7;
      items.push({ m: m, sq: sq, p0: new THREE.Vector3(Math.cos(a) * rad * cfg.sx, Math.sin(a) * rad * cfg.sy, z), p1: new THREE.Vector3(Math.cos(ea) * er * 1.3, Math.sin(ea) * er * .9, 2 + r() * 7),
        fx: Math.cos(ea) * ff, fy2: Math.sin(ea) * ff, axis: new THREE.Vector3(r() - .5, r() - .5, r() - .5).normalize(), spin: .25 + r() * .9, ph: r() * 6.28, fy: .5 + r(), depth: d, size: size });
    }
    grp.userData.items = items; return grp;
  }
  var PILE = [
    { p: [0, 0, 0], r: [.08, .12, .15], s: 1.5, g: 0, t: 0 },
    { p: [.78, .42, -.5], r: [-.12, .18, -.55], s: 1.25, g: 2, t: 1 },
    { p: [-.78, -.3, -.6], r: [.14, -.16, .85], s: 1.2, g: 4, t: 2 },
    { p: [.2, -.78, -.3], r: [-.1, .1, -.25], s: 1.05, g: 1, t: 3 }
  ];
  function makePile(tint) {
    var g = new THREE.Group(), mats = [];
    PILE.forEach(function (c, i) {
      var mat = makeMat(chipTex[(c.t * 2 + 1) % chipTex.length], tint); mats.push(mat);
      var m = new THREE.Mesh(chipGeos[c.g % chipGeos.length], mat);
      var K = .52; m.position.set(c.p[0] * K, c.p[1] * K, c.p[2] * K); m.rotation.set(c.r[0], c.r[1], c.r[2]); m.scale.setScalar(c.s * K); m.userData.base = { y: c.p[1] * K, i: i };
      g.add(m);
    });
    g.userData.mats = mats; return g;
  }
  function makePoints(n, radius, seed) {
    var r = rnd(seed), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), palette = [[1, .62, .15], [1, .85, .3], [.95, .25, .12], [1, 1, .9], [.3, .75, .3]];
    for (var i = 0; i < n; i++) {
      var a = r() * PI * 2, b = Math.acos(2 * r() - 1), rr = radius * Math.cbrt(r());
      pos[i * 3] = rr * Math.sin(b) * Math.cos(a) * 1.3; pos[i * 3 + 1] = rr * Math.sin(b) * Math.sin(a); pos[i * 3 + 2] = rr * Math.cos(b);
      col.set(palette[(r() * palette.length) | 0], i * 3);
    }
    var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ size: 3.2, map: sprite, vertexColors: true, transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false }));
  }
  function swarmUpdate(sw, t, s, spread, intro, mx, my) {
    var items = sw.userData.items;
    for (var i = 0; i < items.length; i++) {
      var it = items[i], d = it.depth, m = it.m;
      m.position.set(it.p0.x * spread * intro + Math.sin(t * it.fy * .6 + it.ph) * .2 - mx * (d - .2) * 1.1,
        it.p0.y * spread * intro + Math.cos(t * it.fy * .5 + it.ph) * .24 - s * (.5 + d * 2.4) + my * (d - .2) * .6, it.p0.z);
      m.quaternion.setFromAxisAngle(it.axis, t * it.spin * .6 + it.ph);
      var k = it.size * (.4 + .6 * intro); m.scale.set(k * it.sq, k / it.sq, k);
    }
  }
  function pileFloat(pile, t, k) {
    pile.children.forEach(function (m) { var b = m.userData.base; m.position.y = b.y + Math.sin(t * 1.1 + b.i * 1.7) * .04 * k; });
  }

  /* ---------- Inicialização ---------- */
  var R = {}; GL._R = R;
  GL.init = function (opts) {
    return new Promise(function (resolve) {
      try {
        var canvas = opts.canvas, products = opts.products, mobile = opts.mobile;
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !mobile && (window.devicePixelRatio || 1) < 1.5, alpha: true, powerPreference: 'high-performance' });
        renderer.setClearColor(0x000000, 0); renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
        R.basePR = Math.min(window.devicePixelRatio || 1, mobile ? 1.1 : 1.25); renderer.setPixelRatio(R.basePR);
        renderer.setSize(window.innerWidth, window.innerHeight);
        R.renderer = renderer; R.camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, .1, 100); R.camera.position.z = CAMZ;
        R.scene = new THREE.Scene(); R.scene.environment = makeEnv(renderer);
        var key = new THREE.DirectionalLight(0xff9a40, 1.7); key.position.set(5, 4, 6); R.scene.add(key);
        var rim = new THREE.PointLight(0xffc233, 1.5, 40); rim.position.set(-6, 3, -4); R.scene.add(rim);
        R.scene.add(new THREE.AmbientLight(0x553322, .7));

        Promise.all([loadImg('assets/img/macro.webp'), loadImg('assets/img/seasoned.webp')]).then(function (imgs) {
          sprite = spriteTexture();
          var mac = imgs[0], sea = imgs[1];
          if (mac && sea) {
            var W = mac.width, H = mac.height, sz = Math.min(W, H) * .5;
            var G = ['#ffeaa0', '#f6c64a', '#d9962a'], G2 = ['#fff3b5', '#efcb68', '#d2a03e'], G3 = ['#ffe28a', '#f0b03a', '#c98320'], O = ['#ffc25a', '#ee8f2a', '#b95a18'];
            chipTex = [photoTexture(mac, W * .04, H * .06, sz, 1, G), photoTexture(mac, W * .42, H * .12, sz, 2, G2), photoTexture(mac, W * .5, H * .45, sz, 3, G3), photoTexture(mac, W * .08, H * .5, sz, 4, G),
              photoTexture(sea, sea.width * .12, sea.height * .2, sea.width * .55, 5, O), photoTexture(sea, sea.width * .15, sea.height * .5, sea.width * .55, 6, O)];
          } else {
            chipTex = [proceduralTexture(1, '#ffe27a', '#f0b432', '#c98414'), proceduralTexture(2, '#ffc04a', '#e98a22', '#b8581a'), proceduralTexture(3, '#fff0a8', '#eec55c', '#c99a3a')];
          }
          for (var i = 0; i < 7; i++) chipGeos.push(chipGeometry(11 + i * 7));
          chipMats = chipTex.map(function (t) { return makeMat(t); });
          R.pileMats = products.map(function (p) { return PILE.map(function (c) { return makeMat(chipTex[(c.t * 2 + 1) % chipTex.length], p.chipTint ? new THREE.Color(p.chipTint) : 0xffffff); }); });
          var nH = mobile ? 12 : 20, nF = mobile ? 4 : 5, nB = mobile ? 14 : 26, nC = mobile ? 8 : 12, A = opts.anchors || {};
          R.products = products;
          function scene(anchor, extra) { var g = new THREE.Group(); g.visible = false; R.scene.add(g); var o = { g: g, el: anchor, cx: 0, cy: 0, unit: 1, s: 0 }; for (var k in extra) o[k] = extra[k]; return o; }
          if (A.hero) {
            var hp = makePile(), hs = makeSwarm(nH, 5, { zmin: -4, zmax: 5, rmin: 1.9, rmax: 4.8, sx: 1.55, sy: .95, min: .24, max: .66, ex: 8 }), hpts = makePoints(mobile ? 90 : 180, 4.6, 3);
            R.H = scene(A.hero, { pile: hp, swarm: hs, pts: hpts }); R.H.g.add(hp, hs, hpts);
          }
          if (A.flavor) {
            var fs = makeSwarm(nF, 9, { zmin: -3, zmax: 4, rmin: 2, rmax: 3.8, sx: 1.2, sy: 1, min: .2, max: .5, ex: 6 }), fpts = makePoints(mobile ? 40 : 70, 3.6, 4);
            R.F = scene(A.flavor, { swarm: fs, pts: fpts }); R.F.g.add(fs, fpts);
          }
          if (A.crunch) {
            var cs = makeSwarm(nC, 13, { zmin: -10, zmax: 4, rmin: .6, rmax: 4.2, sx: 1.7, sy: 1.05, min: .35, max: .95, ex: 7 }), cpts = makePoints(mobile ? 90 : 180, 6, 6);
            R.C = scene(A.crunch, { swarm: cs, pts: cpts }); R.C.g.add(cs, cpts);
          }
          if (A.burst) {
            var bp = makePile(), bs = makeSwarm(nB, 17, { zmin: -3, zmax: 3, rmin: .4, rmax: 1.4, sx: 1, sy: 1, min: .3, max: .8, ex: 11 }), bpts = makePoints(mobile ? 120 : 260, 5, 8);
            R.B = scene(A.burst, { pile: bp, swarm: bs, pts: bpts }); R.B.g.add(bp, bs, bpts);
          }
          /* aquecimento: compila shaders e envia texturas à GPU antes da primeira rolagem (evita engasgo) */
          try { chipTex.forEach(function (t) { renderer.initTexture(t.map); }); var vis = []; R.scene.traverse(function (n) { vis.push([n, n.visible]); n.visible = true; }); renderer.compile(R.scene, R.camera); vis.forEach(function (v) { v[0].visible = v[1]; }); } catch (e) {}
          GL.ok = true; resolve({ ok: true });
          window.addEventListener('resize', resize); resize(); requestAnimationFrame(frame);
        }).catch(function (e) { console.warn('Falha ao montar a cena 3D:', e); resolve({ ok: false }); });
      } catch (e) { console.warn('WebGL indisponível:', e); resolve({ ok: false }); }
    });
  };
  GL.setFlavor = function (i) {
    if (!R.F || !R.F.pile || !R.pileMats) return;
    R.F.pile.children.forEach(function (m, k) { m.material = R.pileMats[i][k]; });
  };

  var halfH = 1, halfW = 1;
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    R.renderer.setSize(w, h); R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
    halfH = Math.tan(FOV * PI / 360) * CAMZ; halfW = halfH * (w / h);
  }
  function place(o) {
    var r = o.el.getBoundingClientRect(), vh = window.innerHeight, vw = window.innerWidth;
    if (r.bottom < -vh * .5 || r.top > vh * 1.5 || r.height === 0) { o.g.visible = false; return false; }
    o.cx = ((r.left + r.width / 2) / vw * 2 - 1) * halfW; o.cy = -(((r.top + r.height / 2) / vh * 2 - 1)) * halfH;
    o.unit = (r.height / vh * 2 * halfH) / UNIT_H; o.s = ((r.top + r.height / 2) - vh / 2) / vh;
    o.g.position.set(o.cx, o.cy, 0); o.g.scale.setScalar(o.unit); o.g.visible = true; return true;
  }

  /* qualidade adaptativa: se o computador não der conta, reduz a resolução do 3D automaticamente */
  var lastT = 0, avg = 16, nF = 0, pr = 1;
  function adapt(now) {
    if (lastT) { var dt = Math.min(now - lastT, 200); avg += (dt - avg) * .08; }
    lastT = now; nF++;
    if (nF % 40 === 0) {
      if (avg > 24 && pr > .55) { pr = Math.max(.55, pr * .82); R.renderer.setPixelRatio(R.basePR * pr); R.renderer.setSize(window.innerWidth, window.innerHeight); }
      if (avg > 30 && pr <= .6) { for (var k in R) { if (R[k] && R[k].pts) R[k].pts.visible = false; } R.noPts = true; }
    }
  }
  var clock = new THREE.Clock(), mx = 0, my = 0, wasAny = false, skipOdd = false;
  function frame() {
    requestAnimationFrame(frame);
    var t = clock.getElapsedTime(), S = GL.state;
    mx += (S.mouse.x - mx) * .06; my += (S.mouse.y - my) * .06;
    var any = false, o, onlyFlavor = false;

    if (R.H && place(R.H)) {
      any = true; o = R.H; var I = easeOut(clamp(S.hero.intro, 0, 1)), hp = S.hero.p;
      o.g.position.y += hp * halfH * .35;
      o.pile.scale.setScalar((.5 + .5 * I) * (1 - hp * .25)); o.pile.position.y = (1 - I) * -2;
      o.pile.rotation.set(my * -.18 + hp * .4, Math.sin(t * .45) * .35 + mx * .5 + hp * PI * .9 + (1 - I) * -2.6, Math.sin(t * .6) * .06 + hp * .25);
      pileFloat(o.pile, t, 1);
      swarmUpdate(o.swarm, t, o.s, 1 + hp * 1.6, I, mx, my);
      o.pts.rotation.y = t * .05 + mx * .1; o.pts.position.y = -o.s * 1.2; o.pts.material.opacity = I;
    }
    if (R.F && place(R.F)) {
      any = true; onlyFlavor = true; o = R.F; var out = S.flavor.out;
      swarmUpdate(o.swarm, t, o.s * .5, 1 + out, 1, mx, my);
      o.pts.rotation.y = t * .06; o.pts.position.y = -o.s * .8;
    }
    if (R.C && place(R.C)) {
      onlyFlavor = false; o = R.C; var cp = S.crunch.p, items = o.swarm.userData.items;
      var fd = 1 - smooth(.8, .98, cp); /* no fim do mergulho as batatas somem: os sabores entram sem batata gigante na frente */
      o.g.visible = fd > .01; if (o.g.visible) any = true;
      for (var i = 0; i < items.length; i++) {
        var it = items[i], k = clamp(cp * 1.15 - it.depth * .12, 0, 1), z = -12 + k * 20 - it.ph * .2;
        it.m.position.set(it.p0.x * (.7 + k * .9) + Math.sin(t * .6 + it.ph) * .25 + mx * k * 1.5, it.p0.y * (.7 + k * .9) + Math.cos(t * .5 + it.ph) * .25, z);
        it.m.quaternion.setFromAxisAngle(it.axis, t * it.spin + it.ph * 3 + cp * 6);
        var sc0 = it.size * 1.05 * fd; it.m.scale.set(sc0 * it.sq, sc0 / it.sq, sc0);
      }
      o.pts.material.opacity = .95 * fd; o.pts.position.z = cp * 9 - 3; o.pts.rotation.z = t * .04 + cp * .6; o.pts.rotation.y = mx * .1;
      o.g.position.y = 0; o.g.scale.setScalar(Math.max(o.unit, .8) * .6);
    }
    if (R.B && place(R.B)) {
      any = true; o = R.B; var bt = S.burst.t, items2 = o.swarm.userData.items, bo = 1 - S.burst.out;
      var shake = bt < .4 ? smooth(0, .4, bt) : 0, e = easeOut(clamp((bt - .42) / .58, 0, 1));
      var sc = bt < .42 ? 1 + shake * .14 + Math.sin(t * 60) * .012 * shake : Math.max(0, 1 - (bt - .42) / .07);
      o.pile.scale.setScalar(sc);
      o.pile.position.set(Math.sin(t * 52) * .06 * shake, Math.cos(t * 47) * .05 * shake, 0);
      o.pile.rotation.set(Math.sin(t * 40) * .06 * shake, Math.sin(t * .6) * .15 + bt * .9, Math.sin(t * 55) * .07 * shake);
      o.pile.visible = sc > .01;
      for (var j = 0; j < items2.length; j++) {
        var q = items2[j]; q.m.visible = bt > .42;
        var zl = (q.p1.z - 2) * .75 * e, hh = Math.tan(FOV * PI / 360) * (CAMZ - zl * o.unit);
        q.m.position.set(q.fx * hh * (window.innerWidth / window.innerHeight) / o.unit * e + Math.sin(t * q.fy + q.ph) * .12 * e + mx * e * .6, q.fy2 * hh / o.unit * e + Math.cos(t * q.fy * .8 + q.ph) * .12 * e, zl);
        q.m.quaternion.setFromAxisAngle(q.axis, t * q.spin * 2.2 + q.ph);
        var kk = q.size * (.2 + e * .85) * bo; q.m.scale.set(kk * q.sq, kk / q.sq, kk);
      }
      o.pts.visible = bt > .42; o.pts.scale.setScalar(.3 + e * 1.6); o.pts.material.opacity = (1 - e * .35) * bo; o.pts.rotation.y = t * .1;
    }
    if (any) adapt(performance.now());
    skipOdd = !skipOdd;
    if (onlyFlavor && skipOdd) { wasAny = any; return; } /* sabores: cena decorativa a metade da taxa */
    if (any || wasAny) R.renderer.render(R.scene, R.camera); /* uma última vez para limpar a tela */
    wasAny = any;
  }
})();
