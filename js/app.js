(function () {
  'use strict';
  var S = window.SITE, GL = window.CrujaGL, gsap = window.gsap, ST = window.ScrollTrigger;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var mobile = window.innerWidth < 700 || !fine;
  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: S.currency || 'BRL' });
  var PLACEHOLDER_WA = '5500000000000';
  var IMG = function (n) { return 'assets/img/' + n + '.webp'; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var products = S.products, byId = {};
  products.forEach(function (p) { byId[p.id] = p; });
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  $$('[data-brand]').forEach(function (e) { e.textContent = S.brand; });
  $$('[data-handle]').forEach(function (e) { e.textContent = S.instagramHandle; });
  $('#insta-link').href = S.instagramUrl; $('#year').textContent = new Date().getFullYear();
  document.title = S.brand + ' — Você não está preparado para essa crocância';

  /* ---------- Menu mobile ---------- */
  var burger = $('#burger'), nav = $('#nav');
  function closeNav() { nav.classList.remove('on'); burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', function () { var on = nav.classList.toggle('on'); burger.setAttribute('aria-expanded', on); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeNav(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
  window.addEventListener('scroll', function () { $('#header').classList.toggle('is-solid', window.scrollY > 40); }, { passive: true });

  /* ---------- Cards estáticos (sem WebGL / movimento reduzido) ---------- */
  $('#flv-static').innerHTML = products.map(function (p) {
    return '<article class="scard" data-id="' + esc(p.id) + '" style="--c:' + p.bg + ';--ink:' + p.ink + '"><img src="' + IMG(p.photo) + '" alt="Batata chips sabor ' + esc(p.name) + '" loading="lazy" width="600" height="600">' +
      '<h3>' + esc(p.name) + '</h3><p>' + esc(p.desc) + '</p><strong>' + brl.format(p.price) + '</strong></article>';
  }).join('');

  /* ---------- Título da crocância ---------- */
  $('#crunch-title').innerHTML = 'VOCÊ NÃO ESTÁ PREPARADO PARA ESSA CROCÂNCIA.'.split(' ').map(function (w) {
    return '<span class="w' + (/^CROC/.test(w) ? ' hot' : '') + '" aria-hidden="true">' + w + '</span>';
  }).join('');

  /* ---------- Mockups (UI em miniatura dentro dos dispositivos) ---------- */
  function buildMockups() {
    var bagImg = '<img class="mini__photo" src="' + IMG('box') + '" alt="">';
    var chips = '<img class="mini__chip" style="left:640px;top:150px;width:120px" src="' + IMG('seasoned') + '" alt=""><img class="mini__chip" style="left:580px;top:610px;width:96px" src="' + IMG('macro') + '" alt="">';
    $('#laptop-screen').innerHTML = '<div class="mini mini--d"><div class="mini__bar">' + esc(S.brand) + '<span><b>Crocância</b><b>Sabores</b></span></div>' +
      '<h3 class="mini__t">VOCÊ NÃO<br>ESTÁ<br>PREPARADO.</h3><p class="mini__p">Conheça todos os sabores.</p><div class="mini__b">Quero experimentar →</div>' + chips + bagImg + '</div>';
    $('#phone-screen').innerHTML = '<div class="mini mini--m"><div class="mini__bar">' + esc(S.brand) + '</div>' +
      '<h3 class="mini__t">VOCÊ NÃO<br>ESTÁ<br>PREPARADO.</h3><p class="mini__p">Conheça todos os sabores.</p><div class="mini__b">Ver sabores →</div>' + bagImg + '</div>';
    function fit() {
      $('#laptop-screen').style.setProperty('--k', ($('#laptop-screen').clientWidth / 1280).toFixed(4));
      $('#phone-screen').style.setProperty('--k', ($('#phone-screen').clientWidth / 390).toFixed(4));
    }
    fit(); window.addEventListener('resize', fit);
    if (window.ResizeObserver) { var ro = new ResizeObserver(fit); ro.observe($('#laptop-screen')); ro.observe($('#phone-screen')); }
  }

  /* ---------- Sabores (um por vez) ---------- */
  var flvEl = $('#sabores'), cur = -1, flvSt = null, imgFront = $('#flv-img-a'), imgBack = $('#flv-img-b'), useGL = false;
  $('#flv-tot').textContent = String(products.length).padStart(2, '0');
  $('#flv-dots').innerHTML = products.map(function (p, i) { return '<button type="button" data-i="' + i + '" aria-label="Sabor ' + esc(p.name) + '">' + (i + 1) + '</button>'; }).join('');
  function fillPanel(p, i) {
    $('#flv-num').textContent = String(i + 1).padStart(2, '0'); $('#flv-tag').textContent = p.tag || '';
    $('#flv-name').textContent = p.name; $('#flv-desc').textContent = p.desc; $('#flv-price').textContent = brl.format(p.price); $('#flv-size').textContent = p.size || '';
    $('#flv-bgtext').textContent = p.name; 
    $$('#flv-dots button').forEach(function (b, k) { if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }
  function showFlavor(i, instant) {
    if (i === cur) return; var first = cur < 0; cur = i; var p = products[i];
    var colors = { '--fg': p.ink, '--bgc': p.bg, '--ac': p.accent };
    if (first || instant) { fillPanel(p, i); gsap.set(flvEl, colors); imgFront.src = IMG(p.photo); if (useGL) GL.setFlavor(i); return; }
    gsap.to(flvEl, Object.assign({ duration: .8 }, colors));
    if (useGL) {
      gsap.to(GL.state.flavor, { spin: '+=' + (Math.PI * 2), duration: 1.1, ease: 'power3.inOut' });
      gsap.delayedCall(.45, function () { GL.setFlavor(i); });
    }
    var els = $$('.flv__kicker, .flv__name, .flv__desc, .flv__price, .flv__buy', $('#flv-panel'));
    gsap.timeline()
      .to(els, { y: -26, opacity: 0, duration: .22, stagger: .025, ease: 'power2.in' })
      .add(function () { fillPanel(p, i); })
      .fromTo(els, { y: 44, opacity: 0 }, { y: 0, opacity: 1, duration: .55, stagger: .06, ease: 'power3.out' });
    imgBack.src = IMG(p.photo);
    gsap.fromTo(imgBack, { opacity: 0, scale: 1.5, rotation: 6 }, { opacity: 1, scale: 1.15, rotation: 0, duration: .9, ease: 'power3.out', onComplete: function () { imgFront.src = IMG(p.photo); gsap.set(imgBack, { opacity: 0 }); } });
    gsap.fromTo('#flv-bgtext', { yPercent: 25, opacity: 0 }, { yPercent: 0, opacity: .22, duration: .9, ease: 'power3.out' });
    gsap.fromTo('#flv-price', { scale: 1.35, transformOrigin: '0 100%' }, { scale: 1, duration: .6, ease: 'back.out(3)', delay: .3 });
  }
  $('#flv-dots').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; var i = +b.dataset.i;
    if (flvSt) window.scrollTo({ top: flvSt.start + (i + .5) / products.length * (flvSt.end - flvSt.start), behavior: 'smooth' }); else showFlavor(i, true);
  });

  /* ---------- Rolagem: uma parte entra na outra ---------- */
  function setupScroll() {
    gsap.registerPlugin(ST);
    var bar = $('.progress'); /* barra de progresso: escreve só no próprio elemento (nada em :root, que refaz o estilo da página toda) */
    ST.create({ start: 0, end: 'max', onUpdate: function (s) { bar.style.transform = 'scaleX(' + s.progress.toFixed(4) + ')'; } });
    var n = products.length;

    /* 1 → 2: a foto da crocância abre em amarelo e entra nos sabores */
    var cT = gsap.timeline({ scrollTrigger: { trigger: '#crocancia', start: 'top top', end: '+=260%', pin: '#crunch-pin', scrub: 1, anticipatePin: 1,
      onUpdate: function (s) { GL.state.crunch.p = s.progress; } } });
    /* mergulho: a câmera entra na foto, atravessa o título e "cai" dentro dos sabores */
    cT.fromTo('#crunch-photo img', { scale: 1.05 }, { scale: 6, xPercent: -6, yPercent: -4, ease: 'power2.in', duration: 1 }, 0)
      .to('#scroll-hint', { opacity: 0, duration: .06 }, 0)
      .fromTo('.crunch__title .w', { opacity: 0, y: 70, rotation: 5 }, { opacity: 1, y: 0, rotation: 0, stagger: .07, duration: .2, ease: 'power3.out' }, .04)
      .to('.crunch__title', { scale: 5, opacity: 0, ease: 'power2.in', duration: .3 }, .56)
      .fromTo('#veil1', { scale: 0 }, { scale: 1.55, ease: 'power2.in', duration: .2 }, .8);

    /* chegada nos sabores: a cena "emerge" de dentro, crescendo ao entrar na tela */
    gsap.fromTo('.flv__photo, #flv-panel', { scale: .78, opacity: 0 }, { scale: 1, opacity: 1, ease: 'power3.out',
      scrollTrigger: { trigger: '#sabores', start: 'top 85%', end: 'top top', scrub: true } });

    /* 3 → 4: sabores, um por vez, e o preto fecha por baixo */
    flvSt = ST.create({ trigger: '#sabores', start: 'top top', end: function () { return '+=' + Math.round(window.innerHeight * n * .85); }, pin: '#flv-pin', anticipatePin: 1,
      onUpdate: function (s) { showFlavor(clamp(Math.floor(s.progress * n), 0, n - 1)); } });
    showFlavor(0, true);
    /* a tela escurece por inteiro antes do texto aparecer (sem borda de círculo cortando a frase) */
    gsap.fromTo('#veil3', { opacity: 0 }, { opacity: 1, ease: 'none',
      scrollTrigger: { trigger: '#sabores', start: function () { return flvSt.end - window.innerHeight * .6; }, end: function () { return flvSt.end - window.innerHeight * .1; }, scrub: true, invalidateOnRefresh: true } });
    var vt = $('#veil3-text'), ci = 0;
    vt.innerHTML = vt.textContent.trim().split(/\s+/).map(function (w) {
      return '<span class="w' + (/^s[óo]\.?$/i.test(w) ? ' hot' : '') + '">' + w.split('').map(function (c) { return '<span class="ch" style="--i:' + (ci++) + '">' + c + '</span>'; }).join('') + '</span>';
    }).join('');
    gsap.timeline({ scrollTrigger: { trigger: '#sabores', start: function () { return flvSt.end - window.innerHeight * .08; }, end: function () { return flvSt.end; }, scrub: 1, invalidateOnRefresh: true } })
      .set(vt, { opacity: 1 })
      .fromTo('#veil3-text .ch', { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'power2.out', stagger: { each: .05 }, duration: .6 })
      .fromTo('#veil3-text .hot .ch', { scale: 1 }, { scale: 1.18, yoyo: true, repeat: 1, ease: 'power2.inOut', stagger: .12, duration: .3 }, '>-0.1');

    /* 4: notebook e celular se abrem em 3D */
    var mT = gsap.timeline({ scrollTrigger: { trigger: '#mockups', start: 'top top', end: '+=150%', pin: '#mock-pin', scrub: 1, anticipatePin: 1 } });
    mT.fromTo('#laptop', { rotationY: -34, rotationX: 18, scale: .8 }, { rotationY: 10, rotationX: -3, scale: 1, ease: 'none', duration: 1 }, 0)
      .fromTo('#phone', { rotationY: 40, rotationX: 8, y: 140 }, { rotationY: -16, rotationX: -2, y: -20, ease: 'none', duration: 1 }, 0)
      .fromTo('.mock__ring', { rotation: 0, scale: .8 }, { rotation: 120, scale: 1.1, ease: 'none', duration: 1 }, 0)
      .fromTo('.mock__tag', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, stagger: .12, duration: .2, ease: 'back.out(3)' }, .45);
    $$('.mock__chip').forEach(function (el) { mT.fromTo(el, { y: -parseFloat(el.dataset.depth) }, { y: parseFloat(el.dataset.depth), ease: 'none', duration: 1 }, 0); });

    /* revelações */
    $$('.rv').forEach(function (el) { gsap.from(el, { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } }); });
  }

  if (!reduce && fine) {
    document.addEventListener('mousemove', function (e) {
      if (GL) { GL.state.mouse.x = e.clientX / window.innerWidth * 2 - 1; GL.state.mouse.y = e.clientY / window.innerHeight * 2 - 1; }
    });
  }

  /* ---------- Abertura + inicialização ---------- */
  var finished = false;
  function step() {}
  var fontsP = (document.fonts && document.fonts.ready) ? document.fonts.ready.then(step) : (step(), Promise.resolve());
  var loadP = new Promise(function (r) { if (document.readyState === 'complete') r(); else window.addEventListener('load', r); }).then(step);
  var glP;
  /* no celular e tablet o 3D é pesado demais: usa a versão leve (fotos, sem partes fixas) */
  if (reduce || mobile || !window.WebGLRenderingContext || !GL) glP = Promise.resolve({ ok: false }).then(function (r) { step(); return r; });
  else glP = GL.init({ canvas: $('#gl'), products: products, brand: S.brand, mobile: mobile, anchors: { crunch: $('#crunch-anchor'), flavor: $('#flv-anchor') } }).then(function (r) { step(); return r; });

  function finish(r) {
    if (finished) return; finished = true;
    var ok3d = !!(r && r.ok); useGL = ok3d;
    if (!ok3d || reduce) root.classList.add('static');
    buildMockups();
    products.forEach(function (p) { var im = new Image(); im.decoding = 'async'; im.src = IMG(p.photo); if (im.decode) im.decode().catch(function () {}); });
    root.classList.add('ready');
    if (ok3d && !reduce) { setupScroll(); setTimeout(function () { ST.refresh(); }, 300); }
  }
  Promise.all([fontsP, loadP, glP]).then(function (res) { finish(res[2]); });

})();
