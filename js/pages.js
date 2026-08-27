/* ============================================================
   CINNAMON STUDIO — pages.js
   Motor de reveals das páginas editoriais. Gêmeo do sections.js:
   MESMAS curvas, distâncias e staggers do index —
     eyebrow  autoAlpha 0 / y 24  → power3.out .8s
     título   word-mask yPercent 115 → 0, expo.out 1.1s, stagger .06
     corpo    autoAlpha 0 / y 30 → power3.out
     listas   autoAlpha 0 / y 28 → power3.out .9s, stagger .06
     stats    autoAlpha 0 / y 34 → stagger .08 + count-up
   Estados iniciais só via gsap.set: sem JS a página nasce visível.
   Reduced motion: nada anima (mesma política do index).
   ============================================================ */
(function () {
  'use strict';

  var C = window.CINNAMON;
  if (!C || !window.gsap || !window.ScrollTrigger) return;
  if (C.reducedMotion) return;

  var split = C.splitWords || function (el) { return el ? [el] : []; };
  var isDesktop = C.isDesktop;

  function qa(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function q(sel, el) { return (el || document).querySelector(sel); }

  /* mesma regra do sections.js: no touch o flick pula telas — revelar
     perto da borda para o conteúdo nunca chegar invisível */
  function onEnter(trigger, fn, start) {
    var s = start || 'top 80%';
    if (!isDesktop && s !== 'top bottom') {
      var m = /^top (\d+(?:\.\d+)?)%$/.exec(s);
      if (m && parseFloat(m[1]) < 92) s = 'top 92%';
    }
    ScrollTrigger.create({ trigger: trigger, start: s, once: true, onEnter: fn });
  }

  /* count-up dos stats — respeita o nº de casas decimais do valor
     original (data-decimals), vírgula como separador */
  function countUp(el, delay) {
    var value = parseFloat(String(el.getAttribute('data-count')).replace(',', '.'));
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    if (isNaN(value)) return;
    var node = el.firstChild;
    if (!node || node.nodeType !== 3) return;
    var proxy = { v: 0 };
    gsap.to(proxy, {
      v: value, duration: 1.6, delay: delay || 0, ease: 'power2.out',
      onUpdate: function () { node.nodeValue = proxy.v.toFixed(decimals).replace('.', ','); }
    });
  }

  /* ---------- hero — intro na carga, como a chegada do index ---------- */
  (function heroIntro() {
    var hero = q('.page-hero');
    if (!hero) return;
    var eyebrow = q('.eyebrow', hero);
    var words = split(q('h1', hero));
    var lead = q('.page-hero__lead', hero);
    var ctas = qa('.cta-row > *', hero);
    var aviso = q('.page-aviso');

    if (eyebrow) gsap.set(eyebrow, { autoAlpha: 0, y: 24 });
    if (words.length) gsap.set(words, { yPercent: 115 });
    if (lead) gsap.set(lead, { autoAlpha: 0, y: 30 });
    if (ctas.length) gsap.set(ctas, { autoAlpha: 0, y: 24 });
    if (aviso) gsap.set(aviso, { autoAlpha: 0 });

    var tl = gsap.timeline({ delay: 0.15 });
    if (eyebrow) tl.to(eyebrow, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.05);
    if (words.length) tl.to(words, { yPercent: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out' }, 0.15);
    if (lead) tl.to(lead, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 0.55);
    if (ctas.length) tl.to(ctas, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.7);
    if (aviso) tl.to(aviso, { autoAlpha: 1, duration: 0.8, ease: 'power2.out' }, 0.9);
  })();

  /* ---------- seções — section-head + conteúdo em stagger ---------- */
  qa('.page .section').forEach(function (sec) {
    var head = q('.section-head', sec);
    if (head) {
      var eyebrow = q('.eyebrow', head);
      var titulo = q('.display-2', head) || q('.display-3', head);
      var words = split(titulo);
      if (eyebrow) gsap.set(eyebrow, { autoAlpha: 0, y: 24 });
      if (words.length) gsap.set(words, { yPercent: 115 });
      /* NUNCA usar o .section-head como trigger: nas variantes de trilho ele
         é display:contents e não gera caixa — getBoundingClientRect() devolve
         top 0/height 0, o start nasce ultrapassado e o reveal dispara na
         carga, com once:true matando o trigger. O título (ou o eyebrow,
         em seções sem h2) é grid item e tem caixa nas duas larguras. */
      var alvo = titulo || eyebrow || sec;
      onEnter(alvo, function () {
        var tl = gsap.timeline();
        if (eyebrow) tl.to(eyebrow, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.05);
        if (words.length) tl.to(words, { yPercent: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out' }, 0.12);
      });
    }

    /* corpo e acentos — um grupo por seção, stagger curto */
    var flow = qa('.sec-body, .nota, .fonte, .ressalva, .sec-cta, .golden, .sec__lado, .sec__aberto, .prova__legenda', sec);
    if (flow.length) {
      gsap.set(flow, { autoAlpha: 0, y: 30 });
      onEnter(flow[0], function () {
        gsap.to(flow, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' });
      });
    }

    /* listas — item a item */
    [
      '.chips > li', '.numlist > li', '.credenciais > li',
      '.args > li', '.banned > li', '.timeline > li',
      '.tabela .tabela__linha', '.faq-list details', '.form > *'
    ].forEach(function (sel) {
      var itens = qa(sel, sec);
      if (!itens.length) return;
      gsap.set(itens, { autoAlpha: 0, y: 28 });
      onEnter(itens[0], function () {
        gsap.to(itens, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.06, ease: 'power3.out' });
      });
    });

    /* stats — mesma coreografia do #projeto do index */
    var stats = q('.stats', sec);
    if (stats) {
      var statItems = qa('.stat', stats);
      gsap.set(statItems, { autoAlpha: 0, y: 34 });
      onEnter(stats, function () {
        gsap.to(statItems, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease: 'power3.out' });
        statItems.forEach(function (item, i) {
          var n = item.querySelector('.stat__n[data-count]');
          if (n) countUp(n, 0.15 + i * 0.08);
        });
      });
    }
  });

  /* ---------- prancha — parallax do render (= torre__hero da home) ---------- */
  qa('.prancha').forEach(function (prancha) {
    var midia = q('.prancha__media', prancha);
    if (!midia) return;
    gsap.set(midia, { willChange: 'transform' });
    gsap.fromTo(midia, { yPercent: 6, scale: 1 }, {
      yPercent: -6, scale: 1.14, ease: 'none',
      scrollTrigger: { trigger: prancha, start: 'top bottom', end: 'bottom top', scrub: true }
    });
    var legenda = q('.prancha__legenda', prancha);
    if (legenda) {
      gsap.set(legenda, { autoAlpha: 0 });
      onEnter(prancha, function () {
        gsap.to(legenda, { autoAlpha: 1, duration: 0.9, ease: 'power2.out', delay: 0.5 });
      }, 'top 65%');
    }
  });

  /* ---------- prova — a imagem entra como anexo, sem parallax ---------- */
  qa('.prova').forEach(function (prova) {
    var frame = q('.prova__frame', prova);
    if (!frame) return;
    gsap.set(frame, { autoAlpha: 0, y: 40 });
    onEnter(prova, function () {
      gsap.to(frame, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out' });
    }, 'top 82%');
  });

  /* ---------- banda clara — morph do fundo do body (§8 do sections.js) ----
     Exceção única de propriedade não-transform, já prevista na spec da home:
     sem o morph a emenda superior da banda creme pisca --dark na entrada.
     No celular o morph é mais curto — metade dos repaints. */
  (function bandaClara() {
    var banda = q('.section--claro');
    if (!banda) return;
    var DARK = '#22231f';
    var CREAM2 = '#f0eadc';
    var MORPH = isDesktop ? 0.8 : 0.4;
    var paraClaro = function () {
      gsap.to(document.body, { backgroundColor: CREAM2, duration: MORPH, ease: 'power2.out', overwrite: 'auto' });
    };
    var paraEscuro = function () {
      gsap.to(document.body, { backgroundColor: DARK, duration: MORPH, ease: 'power2.out', overwrite: 'auto' });
    };
    ScrollTrigger.create({
      trigger: banda,
      start: 'top 65%',
      end: 'bottom 75%',
      onEnter: paraClaro,
      onEnterBack: paraClaro,
      onLeave: paraEscuro,
      onLeaveBack: paraEscuro
    });
  })();

  /* ---------- .serie — eixo desenhado pelo scroll ----------
     Substitui as bordas por item de .numlist/.timeline por um eixo único
     que cresce com a rolagem. Sem JS o CSS já entrega o eixo inteiro. */
  qa('.serie').forEach(function (serie) {
    var eixo = q('.serie__eixo', serie);
    var itens = qa('.numlist > li, .timeline > li', serie);
    if (eixo) {
      gsap.fromTo(eixo, { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: serie, start: 'top 72%', end: 'bottom 60%', scrub: 0.5 }
      });
    }
    itens.forEach(function (li) {
      var ponto = q('.numlist__n', li) || li;
      gsap.set(ponto, { opacity: 0.25 });
      ScrollTrigger.create({
        trigger: li, start: 'top 70%', once: true,
        onEnter: function () {
          gsap.to(ponto, { opacity: 1, duration: 0.7, ease: 'power2.out' });
        }
      });
    });
  });

  /* ---------- finale — coreografia idêntica à da home (§ sections.js) ----
     anel desenhado por stroke-dashoffset + giro lento, wordmark letra a
     letra, glow, e então as frases desta página. */
  (function finale() {
    var fin = q('.page .finale');
    if (!fin) return;

    var glow = q('.finale__glow', fin);
    var ringCircle = q('.ring--finale circle', fin);
    var wordmarkMain = q('.wordmark .wordmark__main', fin);
    /* cada letra é um <path class="logo__ltr"> — só alcançável porque o SVG
       do finale é inline (um <use> esconderia tudo numa shadow tree) */
    var letras = wordmarkMain ? qa('.logo__ltr', wordmarkMain) : [];
    var sub = q('.wordmark .wordmark__sub', fin);
    var titulo = q('.finale__titulo', fin);
    var palavras = split(titulo);
    var texto = q('.finale__texto', fin);
    var cta = q('.cta-major', fin);

    if (glow) gsap.set(glow, { opacity: 0 });
    if (letras.length) gsap.set(letras, { yPercent: 115 });
    if (sub) gsap.set(sub, { autoAlpha: 0, y: 18 });
    if (palavras.length) gsap.set(palavras, { yPercent: 115 });
    if (texto) gsap.set(texto, { autoAlpha: 0, y: 26 });
    if (cta) gsap.set(cta, { autoAlpha: 0 }); /* sem y: o magnético do ui.js usa x/y */

    var spin = null;
    if (ringCircle) {
      ringCircle.setAttribute('pathLength', '100');
      gsap.set(ringCircle, { attr: { 'stroke-dasharray': 100, 'stroke-dashoffset': 100 } });
      if (isDesktop) {
        spin = gsap.to(ringCircle, {
          rotation: 360, svgOrigin: '50 50', duration: 160, ease: 'none', repeat: -1, paused: true
        });
      }
    }

    onEnter(fin, function () {
      var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (ringCircle) {
        tl.to(ringCircle, { attr: { 'stroke-dashoffset': 2 }, duration: 2.4, ease: 'power2.inOut' }, 0);
        if (spin) tl.add(function () { spin.play(); }, 1.2);
      }
      if (letras.length) tl.to(letras, { yPercent: 0, duration: 1.1, stagger: 0.05, ease: 'expo.out' }, 0.1);
      if (sub) tl.to(sub, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.7);
      if (glow) tl.to(glow, { opacity: 0.18, duration: 1.4, ease: 'power2.out' }, 0.5);
      if (palavras.length) tl.to(palavras, { yPercent: 0, duration: 1, stagger: 0.05, ease: 'expo.out' }, 0.85);
      if (texto) tl.to(texto, { autoAlpha: 1, y: 0, duration: 0.9 }, 1.0);
      if (cta) tl.to(cta, { autoAlpha: 1, duration: 1 }, 1.15);
    }, 'top 65%');
  })();

})();
