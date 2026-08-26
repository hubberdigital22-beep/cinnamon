/* ============================================================
   CINNAMON STUDIO — sections.js  (fase 4)
   Preloader real (contador sincronizado com o preload das
   cenas do hero, teto de 4s, saída em clip-path) + corpo do
   site: reveals mascarados, count-up, parallax, galeria
   horizontal pinada, marquee em 2 direções, morph do fundo
   no bloco claro e finale com glow + círculo da marca.

   Regras: só transform/opacity (exceções nomeadas da spec:
   clip-path mask reveal, stroke-dashoffset do círculo e o
   morph de backgroundColor do body — §6.00/§7/§8).
   Estados iniciais sempre via gsap.set — sem JS a página é
   100% legível. Reduced-motion: nada roda (o HTML estático
   já mostra tudo, inclusive os números finais).
   ============================================================ */
(function () {
  'use strict';

  var C = window.CINNAMON;
  if (!C || !window.gsap || !window.ScrollTrigger) return;

  var DARK = '#22231f';
  var CREAM2 = '#f0eadc';

  function q(sel, el) { return (el || document).querySelector(sel); }
  function qa(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }

  /* ------------------------------------------------------------
     Split por LETRA (wordmark do preloader e do finale).
     Reusa as classes .word-mask/.word do CSS da fase 2/3.
     Só para elementos de texto puro; a11y via aria-label.
     ------------------------------------------------------------ */
  function splitLetters(el) {
    if (!el) return [];
    /* wordmark agora é o logo oficial em curvas: cada letra já é um <path>,
       então não há o que dividir — devolve os paths para o mesmo stagger. */
    if (el.namespaceURI === 'http://www.w3.org/2000/svg') return qa('.logo__ltr', el);
    if (el.dataset.split === 'letters') return qa('.word', el);
    var text = el.textContent.trim();
    if (!text) return [];
    el.setAttribute('aria-label', text);
    var frag = document.createDocumentFragment();
    for (var i = 0; i < text.length; i++) {
      var mask = document.createElement('span');
      mask.className = 'word-mask';
      mask.setAttribute('aria-hidden', 'true');
      var ch = document.createElement('span');
      ch.className = 'word';
      ch.textContent = text.charAt(i);
      mask.appendChild(ch);
      frag.appendChild(mask);
    }
    el.textContent = '';
    el.appendChild(frag);
    el.dataset.split = 'letters';
    return qa('.word', el);
  }

  /* hairline animável sobre a borda de um item de lista:
     a borda do CSS fica transparente (estático) e um span
     .hairline entra no lugar para o reveal com scaleX. */
  function ensureLine(li, edge) {
    var cls = 'hairline--' + edge;
    var existing = li.querySelector('.' + cls);
    if (existing) return existing;
    var s = document.createElement('span');
    s.className = 'hairline ' + cls;
    s.setAttribute('aria-hidden', 'true');
    s.style.cssText = 'position:absolute;left:0;right:0;' +
      (edge === 'top' ? 'top:-1px;' : 'bottom:-1px;');
    li.appendChild(s);
    return s;
  }

  /* ============================================================
     00 · PRELOADER — contador real + saída em máscara
     Fora do matchMedia: precisa decidir na hora do load.
     ============================================================ */
  (function initPreloader() {
    var pre = q('.preloader');
    if (!pre) return;

    /* reduced-motion: o preloader não aparece */
    if (C.reducedMotion) {
      pre.style.display = 'none';
      return;
    }

    /* O preloader só faz sentido cobrindo a página ANTES de ela aparecer.
       Se o JS chegou atrasado (rede lenta: o hero já está visível faz
       tempo), se é revisita na mesma sessão (reload no meio da navegação)
       ou se o usuário já rolou — cobrir de escuro e teleportar ao topo é
       pior do que não ter preloader (era a "tela preta" do QA mobile). */
    var skip = false;
    try { if (sessionStorage.getItem('cinnamon-intro')) skip = true; } catch (e) {}
    if (!skip && window.scrollY > document.documentElement.clientHeight * 0.5) skip = true;
    if (!skip && window.performance && performance.getEntriesByType) {
      var paint = performance.getEntriesByType('paint')[0];
      if (paint && performance.now() - paint.startTime > 700) skip = true;
    }
    if (skip) {
      pre.style.display = 'none';
      return;
    }
    try { sessionStorage.setItem('cinnamon-intro', '1'); } catch (e) {}

    /* celular espera menos: metade dos frames e teto de 2.6s — a chegada
       continua coreografada, mas ninguém fica olhando barra de progresso */
    var preDesktop = window.matchMedia('(min-width: 1024px)').matches;

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    /* trava o scroll enquanto o preloader está na tela */
    var htmlEl = document.documentElement;
    var lockedNative = false;
    if (C.lenis) {
      C.lenis.stop();
    } else {
      htmlEl.style.overflow = 'hidden';
      lockedNative = true;
    }

    var fill = q('.preloader__bar-fill', pre);
    var count = q('.preloader__count', pre);
    var letters = splitLetters(q('.wordmark__main', pre));
    var sub = q('.wordmark__sub', pre);

    gsap.set(pre, { clipPath: 'inset(0% 0% 0% 0%)' });
    if (fill) gsap.set(fill, { scaleX: 0 });
    if (letters.length) gsap.set(letters, { autoAlpha: 0 });
    if (sub) gsap.set(sub, { autoAlpha: 0 });

    /* wordmark desenhado com fade escalonado por letra */
    var intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (letters.length) intro.to(letters, { autoAlpha: 1, duration: 0.9, stagger: 0.06 }, 0.1);
    if (sub) intro.to(sub, { autoAlpha: 1, duration: 0.9 }, 0.75);

    var display = { v: 0 };
    function render() {
      if (fill) fill.style.transform = 'scaleX(' + display.v + ')';
      if (count) count.textContent = 'Compondo a chegada — ' + Math.round(display.v * 100) + '%';
    }

    /* preload REAL: capa estática + a abertura da sequência do hero
       (o hero.js baixa todos; o contador espera só o começo).
       Mesmo breakpoint do gsap.matchMedia do hero — e a MESMA capa
       que o <picture> escolheu (960 no celular). */
    var seqDir = 'img/hero-seq/' + (
      (!preDesktop &&
       document.documentElement.clientHeight > document.documentElement.clientWidth &&
       document.documentElement.clientWidth < 600) ? 'm' : '1280') + '/';
    var ASSETS = [window.matchMedia('(max-width: 768px)').matches
      ? 'img/ext-baixo-960.webp'
      : 'img/ext-baixo-1920.webp'];
    var WAIT_FRAMES = preDesktop ? 24 : 12;
    for (var fi = 1; fi <= WAIT_FRAMES; fi++) {
      ASSETS.push(seqDir + 'f_' + ('00' + fi).slice(-3) + '.webp');
    }
    var total = ASSETS.length;
    var loaded = 0;
    var finished = false;
    var t0 = Date.now();
    var MIN_MS = preDesktop ? 1100 : 900;       /* respiro mínimo p/ o wordmark */
    var failsafe = setTimeout(finish, preDesktop ? 4000 : 2600); /* teto duro */

    /* rede de segurança independente de rAF: se a aba carregar em 2º plano,
       a timeline de saída não avança e o scroll ficaria travado para sempre.
       Este setTimeout roda mesmo com rAF suspenso e libera tudo na marra. */
    function destravaScroll() {
      if (C.lenis && C.lenis.isStopped) C.lenis.start();
      if (C.lenis && C.lenis.resize) C.lenis.resize();
      if (lockedNative) htmlEl.style.removeProperty('overflow');
      if (pre && pre.style.display !== 'none' && finished) pre.style.display = 'none';
    }
    setTimeout(destravaScroll, 6500);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) setTimeout(destravaScroll, 2500);
    });

    function onAsset() {
      loaded++;
      if (finished) return;
      if (loaded >= total) {
        finish();
      } else {
        gsap.to(display, {
          v: loaded / total, duration: 0.5, ease: 'power2.out',
          overwrite: true, onUpdate: render
        });
      }
    }

    ASSETS.forEach(function (asset) {
      var im = new Image();
      if (asset.indexOf(' ') > -1) { im.sizes = '100vw'; im.srcset = asset; }
      else { im.src = asset; }
      if (im.decode) im.decode().then(onAsset, onAsset);
      else { im.onload = onAsset; im.onerror = onAsset; }
    });

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(failsafe);
      gsap.killTweensOf(display);

      var hold = Math.max(0, MIN_MS - (Date.now() - t0)) / 1000;
      var out = gsap.timeline({ delay: hold });
      out.to(display, { v: 1, duration: 0.4, ease: 'power1.out', onUpdate: render });
      out.add(function () {
        window.scrollTo(0, 0);
        if (C.playHeroIntro) C.playHeroIntro(); /* hero já em movimento */
      });
      /* saída: máscara vertical 1.2s (efeito da spec §6.00) */
      out.to(pre, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.2, ease: 'expo.out' }, '+=0.1');
      out.add(function () {
        pre.style.display = 'none';
        if (C.lenis) C.lenis.start();
        if (lockedNative) htmlEl.style.removeProperty('overflow');
        window.scrollTo(0, 0);
        ScrollTrigger.refresh();
      });
    }
  })();

  /* ============================================================
     SEÇÕES 02–09 — tudo dentro de gsap.matchMedia()
     ============================================================ */
  var mm = gsap.matchMedia();

  mm.add(
    {
      desktop: '(min-width: 1024px)',
      mobile: '(max-width: 1023.98px)',
      reduce: '(prefers-reduced-motion: reduce)'
    },
    function (ctx) {
      /* reduce: sem pin, scrub, parallax, marquee, count-up —
         o HTML estático já mostra tudo nos valores finais */
      if (ctx.conditions.reduce) return;
      return build(ctx.conditions.desktop);
    }
  );

  function build(isDesktop) {
    var split = C.splitWords || function (el) { return el ? [el] : []; };
    var counters = [];  /* restaura os números no cleanup */
    var cleanups = [];

    function onEnter(trigger, fn, start) {
      var s = start || 'top 80%';
      /* mobile: o flick cobre 2–3 telas num gesto — revelar em 80% deixa
         o usuário rolando por conteúdo ainda invisível. Perto da borda
         (92%) o reveal dispara assim que o elemento aponta na tela. */
      if (!isDesktop && s !== 'top bottom') {
        var m = /^top (\d+(?:\.\d+)?)%$/.exec(s);
        if (m && parseFloat(m[1]) < 92) s = 'top 92%';
      }
      ScrollTrigger.create({ trigger: trigger, start: s, once: true, onEnter: fn });
    }

    /* count-up: só o nó de texto (preserva <sup>/.unidade),
       1.8s ease out, formato pt-BR com vírgula */
    function countUp(el, value, delay) {
      var node = el && el.firstChild;
      if (!node || node.nodeType !== 3 || isNaN(value)) return;
      counters.push({ node: node, text: value.toFixed(2).replace('.', ',') });
      var proxy = { v: 0 };
      node.nodeValue = '0,00';
      gsap.to(proxy, {
        v: value, duration: 1.8, delay: delay || 0, ease: 'power3.out',
        onUpdate: function () { node.nodeValue = proxy.v.toFixed(2).replace('.', ','); }
      });
    }

    /* ---------------- 02 · O PROJETO ---------------- */
    var projHead = q('#projeto .section-head');
    if (projHead) {
      var prEyebrow = q('.eyebrow', projHead);
      var prWords = split(q('.display-2', projHead));
      var prLead = q('.projeto__lead', projHead);
      if (prEyebrow) gsap.set(prEyebrow, { autoAlpha: 0, y: 24 });
      if (prWords.length) gsap.set(prWords, { yPercent: 115 });
      if (prLead) gsap.set(prLead, { autoAlpha: 0, y: 30 });
      /* 'top bottom' (e não o 'top 80%' padrão): emenda com a saída do hero.
         No 80% o título só entrava ~180px depois, prolongando o vão escuro. */
      onEnter(projHead, function () {
        var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        if (prEyebrow) tl.to(prEyebrow, { autoAlpha: 1, y: 0, duration: 0.8 }, 0);
        if (prWords.length) tl.to(prWords, { yPercent: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out' }, 0.1);
        if (prLead) tl.to(prLead, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.45);
      }, 'top bottom');
    }

    var stats = q('#projeto .stats');
    if (stats) {
      var statItems = qa('.stat', stats);
      gsap.set(statItems, { autoAlpha: 0, y: 34 });
      onEnter(stats, function () {
        gsap.to(statItems, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease: 'power3.out' });
        statItems.forEach(function (item, i) {
          var num = item.querySelector('.stat__num[data-count]');
          if (!num) return;
          countUp(num, parseFloat(num.getAttribute('data-count').replace(',', '.')), 0.15 + i * 0.08);
        });
      });
    }

    /* ---------------- 03 · A TORRE ---------------- */
    var arq = q('#arquitetura');
    if (arq) {
      var aEyebrow = q('#arquitetura > .container > .eyebrow');
      if (aEyebrow) {
        gsap.set(aEyebrow, { autoAlpha: 0, y: 24 });
        onEnter(aEyebrow, function () {
          gsap.to(aEyebrow, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' });
        }, 'top 85%');
      }

      var tHero = q('.torre__hero', arq);
      if (tHero) {
        /* parallax fullbleed — a imagem viaja ~12% mais devagar
           (folga de inset:-12% reservada no CSS) */
        var tMedia = q('.torre__media', tHero);
        if (tMedia) {
          gsap.set(tMedia, { willChange: 'transform' });
          /* parallax + zoom contínuo enquanto atravessa a viewport */
          gsap.fromTo(tMedia, { yPercent: 6, scale: 1 }, {
            yPercent: -6, scale: 1.14, ease: 'none',
            scrollTrigger: { trigger: tHero, start: 'top bottom', end: 'bottom top', scrub: true }
          });
        }
        var tCard = q('.torre__card', tHero);
        if (tCard) {
          var tEyebrow = q('.eyebrow', tCard);
          var tWords = split(q('.display-2', tCard));
          var tCap = q('.caption', tCard);
          if (tEyebrow) gsap.set(tEyebrow, { autoAlpha: 0, y: 24 });
          if (tWords.length) gsap.set(tWords, { yPercent: 115 });
          if (tCap) gsap.set(tCap, { autoAlpha: 0, y: 26 });
          onEnter(tCard, function () {
            var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
            if (tEyebrow) tl.to(tEyebrow, { autoAlpha: 1, y: 0, duration: 0.8 }, 0);
            if (tWords.length) tl.to(tWords, { yPercent: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out' }, 0.1);
            if (tCap) tl.to(tCap, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.5);
          }, 'top 85%');
        }
      }

      /* faixa de 3 imagens: clip-path mask reveal + scale 1.14→1 */
      qa('.torre__faixa figure', arq).forEach(function (fig) {
        var frame = q('.frame', fig);
        var img = frame && q('img', frame);
        var cap = q('figcaption', fig);
        if (!frame || !img) return;
        gsap.set(frame, { clipPath: 'inset(100% 0% 0% 0%)' });
        gsap.set(img, { scale: 1.14, transition: 'none' }); /* pausa a transition de hover do CSS */
        if (cap) gsap.set(cap, { autoAlpha: 0, y: 18 });
        onEnter(fig, function () {
          gsap.to(frame, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.out' });
          gsap.to(img, { scale: 1, duration: 1.4, ease: 'expo.out', clearProps: 'transform,transition' });
          if (cap) gsap.to(cap, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.35 });
        }, 'top 82%');
      });
    }

    /* ---------------- 04 · PLANTA INTELIGENTE ---------------- */
    var planta = q('#studio');
    if (planta) {
      var pTexto = q('.planta__texto', planta);
      if (pTexto) {
        var pEyebrow = q('.eyebrow', pTexto);
        var pWords = split(q('.display-2', pTexto));
        var pNum = q('.planta__num', pTexto);
        var pSub = q('.planta__sub', pTexto);
        var pCap = q('.planta__caption', pTexto);
        var lis = qa('.planta__lista li', pTexto);

        /* hairlines reais no lugar das bordas da lista (scaleX staggered) */
        var lines = [];
        lis.forEach(function (li, i) {
          gsap.set(li, { position: 'relative', borderTopColor: 'transparent' });
          lines.push(ensureLine(li, 'top'));
          if (i === lis.length - 1) {
            gsap.set(li, { borderBottomColor: 'transparent' });
            lines.push(ensureLine(li, 'bottom'));
          }
        });

        if (pEyebrow) gsap.set(pEyebrow, { autoAlpha: 0, y: 24 });
        if (pWords.length) gsap.set(pWords, { yPercent: 115 });
        [pNum, pSub, pCap].forEach(function (el) {
          if (el) gsap.set(el, { autoAlpha: 0, y: 30 });
        });
        if (lis.length) gsap.set(lis, { autoAlpha: 0, y: 16 });
        if (lines.length) gsap.set(lines, { scaleX: 0 });

        onEnter(pTexto, function () {
          var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
          if (pEyebrow) tl.to(pEyebrow, { autoAlpha: 1, y: 0, duration: 0.8 }, 0);
          if (pWords.length) tl.to(pWords, { yPercent: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out' }, 0.1);
          if (pNum) tl.to(pNum, { autoAlpha: 1, y: 0, duration: 1 }, 0.35);
          if (pSub) tl.to(pSub, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.5);
          if (pCap) tl.to(pCap, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.6);
          if (lis.length) tl.to(lis, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.7);
          lines.forEach(function (line, i) {
            tl.to(line, { scaleX: 1, duration: 1.1, ease: 'expo.out' }, 0.7 + i * 0.08);
          });
          /* número gigante 29,92 — sem splitWords (tem span filho) */
          if (pNum && pNum.firstChild) {
            countUp(pNum, parseFloat((pNum.firstChild.nodeValue || '').replace(',', '.')), 0.35);
          }
        });
      }

      var pFig = q('.planta__figura', planta);
      if (pFig) {
        var pFrame = q('.planta__frame', pFig);
        var pImg = pFrame && q('img', pFrame);
        var pLeg = q('.planta__legenda', pFig);
        if (pFrame && pImg) {
          gsap.set(pFrame, { clipPath: 'inset(100% 0% 0% 0%)' });
          gsap.set(pImg, { scale: 1.12, transition: 'none' });
          if (pLeg) gsap.set(pLeg, { autoAlpha: 0, y: 14 });
          onEnter(pFig, function () {
            gsap.to(pFrame, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.out' });
            gsap.to(pImg, { scale: 1, duration: 1.4, ease: 'expo.out', clearProps: 'transform,transition' });
            if (pLeg) gsap.to(pLeg, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.4 });
          }, 'top 78%');
        }
      }
    }

    /* ---------------- 05 · GALERIA ----------------
       Desktop: scroll horizontal pinado (x do track mapeado ao
       scroll vertical). Mobile: scroll-snap nativo — sem GSAP. */
    var galeria = q('.galeria');
    if (galeria) {
      var gHead = q('.section-head', galeria);
      if (gHead) {
        var gEyebrow = q('.eyebrow', gHead);
        var gWords = split(q('.display-2', gHead));
        if (gEyebrow) gsap.set(gEyebrow, { autoAlpha: 0, y: 24 });
        if (gWords.length) gsap.set(gWords, { yPercent: 115 });
        onEnter(galeria, function () {
          if (gEyebrow) gsap.to(gEyebrow, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' });
          if (gWords.length) gsap.to(gWords, { yPercent: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out', delay: 0.1 });
        }, 'top 75%');
      }

      var track = q('.galeria__track', galeria);
      /* o pin horizontal roda em TODOS os breakpoints (decisão do cliente:
         mobile com o mesmo efeito do desktop). Sem JS/reduced fica o snap. */
      if (track) {
        gsap.set(track, { overflowX: 'visible', scrollSnapType: 'none', willChange: 'transform' });

        /* as imagens andam por TRANSFORM no pin — o lazy nativo só as
           buscaria quando já entrassem na tela, aparecendo "de repente"
           (flagrado no QA mobile). Uma tela antes do pin, todas viram
           eager e chegam prontas para o scrub. */
        var gLazy = qa('img[loading="lazy"]', track);
        if (gLazy.length) {
          ScrollTrigger.create({
            trigger: galeria,
            start: 'top 300%',
            once: true,
            onEnter: function () {
              gLazy.forEach(function (im) { im.loading = 'eager'; });
            }
          });
        }

        /* a imagem é dimensionada pela ALTURA que sobra depois do menu,
           do título e da legenda — assim título e descrição cabem sempre.
           O título usa clamp com vw, então só medindo dá para acertar. */
        function fitGaleria() {
          var head = q('.section-head', galeria);
          var item = q('.galeria__item', galeria);
          var cap = item && item.querySelector('figcaption');
          if (!item) return;
          var csSec = getComputedStyle(galeria);
          var usado =
            parseFloat(csSec.paddingTop) + parseFloat(csSec.paddingBottom) +
            (head ? head.getBoundingClientRect().height + parseFloat(getComputedStyle(head).marginBottom) : 0) +
            (cap ? cap.getBoundingClientRect().height + parseFloat(getComputedStyle(cap).marginTop) : 0);
          var livre = document.documentElement.clientHeight - usado - 12; /* folga */
          /* a altura também é limitada pela largura máxima do card
             (3:2), senão em telas baixas e estreitas o frame estoura */
          var vw = document.documentElement.clientWidth;
          var maxW = vw <= 768 ? vw * 0.86 : Math.min(vw * 0.62, 880);
          var h = Math.max(180, Math.min(livre, maxW / 1.5, 620));
          galeria.style.setProperty('--galeria-media-h', Math.round(h) + 'px');
        }
        fitGaleria();
        /* refreshInit (não refresh): mexe no layout, então tem de rodar
           ANTES de o ScrollTrigger medir pins — senão o tamanho da página
           fica errado e o scroll não alcança o fim */
        ScrollTrigger.addEventListener('refreshInit', fitGaleria);
        cleanups.push(function () {
          ScrollTrigger.removeEventListener('refreshInit', fitGaleria);
          galeria.style.removeProperty('--galeria-media-h');
        });
        var dist = function () {
          return Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
        };
        gsap.to(track, {
          x: function () { return -dist(); },
          ease: 'none',
          scrollTrigger: {
            trigger: galeria,
            start: 'top top', /* seção em tela cheia, conteúdo centrado pelo CSS */
            end: function () { return '+=' + dist(); },
            pin: galeria,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true
          }
        });
        /* zoom contínuo NAS IMGS (dentro do overflow:hidden do frame):
           não invade o gap entre itens; o hover do CSS agora é no frame.
           Só no desktop: no celular são 6 camadas extras animando junto
           com o pin — efeito sutil, custo alto nas GPUs móveis. */
        var gImgs = isDesktop ? qa('.galeria__frame img', track) : [];
        if (gImgs.length) {
          gsap.fromTo(gImgs, { scale: 1.12 }, {
            scale: 1, ease: 'none',
            scrollTrigger: {
              trigger: galeria,
              start: 'top top',
              end: function () { return '+=' + dist(); },
              scrub: 1,
              invalidateOnRefresh: true
            }
          });
        }
      }
    }

    /* ---------------- 06 · MARQUEE + BLOCO CLARO ---------------- */
    var marquee = q('.marquee');
    if (marquee) {
      /* fundo dark próprio: a faixa continua legível enquanto o
         body faz morph para o creme atrás dela */
      gsap.set(marquee, { backgroundColor: DARK });
      var rows = qa('.marquee__row', marquee);
      if (rows.length === 2) {
        /* cada fileira já tem 2 cópias idênticas no HTML →
           wrap seamless em -50%/0. Lento: 75s/90s por volta. */
        var mq1 = gsap.fromTo(rows[0], { xPercent: 0 }, { xPercent: -50, duration: 75, ease: 'none', repeat: -1 });
        var mq2 = gsap.fromTo(rows[1], { xPercent: -50 }, { xPercent: 0, duration: 90, ease: 'none', repeat: -1 });
        /* fora da tela o marquee dorme — duas fileiras gigantes animando
           a sessão inteira era frame roubado do scroll (pior no celular) */
        mq1.pause(); mq2.pause();
        ScrollTrigger.create({
          trigger: marquee,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: function (self) {
            if (self.isActive) { mq1.play(); mq2.play(); }
            else { mq1.pause(); mq2.pause(); }
          }
        });
        var mqPause = function () {
          gsap.to([mq1, mq2], { timeScale: 0, duration: 0.5, ease: 'power2.out', overwrite: true });
        };
        var mqPlay = function () {
          gsap.to([mq1, mq2], { timeScale: 1, duration: 0.7, ease: 'power2.out', overwrite: true });
        };
        marquee.addEventListener('mouseenter', mqPause);
        marquee.addEventListener('mouseleave', mqPlay);
        cleanups.push(function () {
          marquee.removeEventListener('mouseenter', mqPause);
          marquee.removeEventListener('mouseleave', mqPlay);
        });
      }
    }

    var bloco = q('.bloco-claro');
    if (bloco) {
      /* morph do fundo do body ao entrar/sair do bloco claro (§8) —
         exceção única de propriedade não-transform, prevista na spec.
         Animar background do body repinta a viewport a cada frame:
         no celular o morph é mais curto (metade dos repaints). */
      var MORPH = isDesktop ? 0.8 : 0.4;
      var toLight = function () {
        gsap.to(document.body, { backgroundColor: CREAM2, duration: MORPH, ease: 'power2.out', overwrite: 'auto' });
      };
      var toDark = function () {
        gsap.to(document.body, { backgroundColor: DARK, duration: MORPH, ease: 'power2.out', overwrite: 'auto' });
      };
      ScrollTrigger.create({
        trigger: bloco,
        start: 'top 65%',
        /* volta ao escuro assim que o fim do bloco passa de 3/4 da tela —
           em 'bottom 35%' a seção Estrutura chegava com o fundo ainda creme */
        end: 'bottom 75%',
        onEnter: toLight,
        onEnterBack: toLight,
        onLeave: toDark,
        onLeaveBack: toDark
      });
      cleanups.push(function () {
        gsap.killTweensOf(document.body);
        gsap.set(document.body, { clearProps: 'backgroundColor' });
      });

      var bEyebrow = q('.eyebrow', bloco);
      var bWords = split(q('.display-2', bloco));
      var pilares = qa('.pilar', bloco);
      if (bEyebrow) gsap.set(bEyebrow, { autoAlpha: 0, y: 24 });
      if (bWords.length) gsap.set(bWords, { yPercent: 115 });
      pilares.forEach(function (p) {
        var num = q('.pilar__num', p);
        var line = q('.hairline', p);
        var h3 = q('h3', p);
        var txt = q('h3 + p', p);
        if (num) gsap.set(num, { autoAlpha: 0, y: 26 });
        if (line) gsap.set(line, { scaleX: 0 });
        if (h3) gsap.set(h3, { autoAlpha: 0, y: 20 });
        if (txt) gsap.set(txt, { autoAlpha: 0, y: 20 });
      });
      onEnter(bloco, function () {
        var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        if (bEyebrow) tl.to(bEyebrow, { autoAlpha: 1, y: 0, duration: 0.8 }, 0);
        if (bWords.length) tl.to(bWords, { yPercent: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out' }, 0.1);
        pilares.forEach(function (p, i) {
          var at = 0.5 + i * 0.14;
          var num = q('.pilar__num', p);
          var line = q('.hairline', p);
          var h3 = q('h3', p);
          var txt = q('h3 + p', p);
          if (num) tl.to(num, { autoAlpha: 1, y: 0, duration: 0.8 }, at);
          if (line) tl.to(line, { scaleX: 1, duration: 1, ease: 'expo.out' }, at + 0.05);
          if (h3) tl.to(h3, { autoAlpha: 1, y: 0, duration: 0.8 }, at + 0.12);
          if (txt) tl.to(txt, { autoAlpha: 1, y: 0, duration: 0.8 }, at + 0.18);
        });
      }, 'top 70%');
    }

    /* ---------------- 07 · ESTRUTURA & SERVIÇOS ---------------- */
    var estrutura = q('#estrutura');
    if (estrutura) {
      var eHead = q('.section-head', estrutura);
      if (eHead) {
        var eEyebrow = q('.eyebrow', eHead);
        var eWords = split(q('.display-2', eHead));
        if (eEyebrow) gsap.set(eEyebrow, { autoAlpha: 0, y: 24 });
        if (eWords.length) gsap.set(eWords, { yPercent: 115 });
        onEnter(eHead, function () {
          if (eEyebrow) gsap.to(eEyebrow, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' });
          if (eWords.length) gsap.to(eWords, { yPercent: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out', delay: 0.1 });
        });
      }
      var cards = qa('.servico', estrutura);
      if (cards.length) {
        /* transition:none estático evita briga com o hover do CSS;
           clearProps devolve a micro-interação ao fim do reveal */
        gsap.set(cards, { autoAlpha: 0, y: 32, transition: 'none' });
        onEnter(q('.servicos', estrutura), function () {
          gsap.to(cards, {
            autoAlpha: 1, y: 0, duration: 1, stagger: 0.07, ease: 'power3.out',
            clearProps: 'transform,transition'
          });
        }, 'top 82%');
      }
    }

    /* ---------------- 08 · LOCALIZAÇÃO ---------------- */
    var localHero = q('.local__hero');
    if (localHero) {
      var lMedia = q('.local__media', localHero);
      if (lMedia) {
        gsap.set(lMedia, { willChange: 'transform' });
        gsap.fromTo(lMedia, { yPercent: 6, scale: 1 }, {
          yPercent: -6, scale: 1.14, ease: 'none',
          scrollTrigger: { trigger: localHero, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }
      var lCard = q('.local__card', localHero);
      if (lCard) {
        var lWords = split(q('.display-3', lCard));
        gsap.set(lCard, { autoAlpha: 0, y: 44 });
        if (lWords.length) gsap.set(lWords, { yPercent: 115 });
        onEnter(lCard, function () {
          var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
          tl.to(lCard, { autoAlpha: 1, y: 0, duration: 1.1 }, 0);
          if (lWords.length) tl.to(lWords, { yPercent: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out' }, 0.25);
        }, 'top 78%');
      }
    }

    /* ---------------- 09 · FINALE ---------------- */
    var finale = q('.finale');
    if (finale) {
      var glow = q('.finale__glow', finale);
      var ringWrap = q('.ring--finale', finale);
      var ringCircle = ringWrap && ringWrap.querySelector('circle');
      var fLetters = splitLetters(q('.wordmark__main', q('.wordmark', finale)));
      var fSub = q('.wordmark .wordmark__sub', finale);
      var tagline = q('.finale__tagline', finale);
      var cta = q('.cta-major', finale);

      if (fLetters.length) gsap.set(fLetters, { yPercent: 115 });
      if (fSub) gsap.set(fSub, { autoAlpha: 0, y: 18 });
      if (tagline) gsap.set(tagline, { autoAlpha: 0, y: 26 });
      if (cta) gsap.set(cta, { autoAlpha: 0 }); /* sem y: o magnético do ui.js usa x/y */
      if (glow) gsap.set(glow, { opacity: 0 });

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

      onEnter(finale, function () {
        var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        if (ringCircle) {
          /* desenho por stroke-dashoffset até a fresta de 2% */
          tl.to(ringCircle, { attr: { 'stroke-dashoffset': 2 }, duration: 2.4, ease: 'power2.inOut' }, 0);
          if (spin) tl.add(function () { spin.play(); }, 1.2);
        }
        if (fLetters.length) tl.to(fLetters, { yPercent: 0, duration: 1.1, stagger: 0.05, ease: 'expo.out' }, 0.1);
        if (fSub) tl.to(fSub, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.7);
        if (glow) tl.to(glow, { opacity: 0.18, duration: 1.4, ease: 'power2.out' }, 0.5);
        if (tagline) tl.to(tagline, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.85);
        if (cta) tl.to(cta, { autoAlpha: 1, duration: 1 }, 1.05);
      }, 'top 65%');
    }

    /* cleanup do contexto — o matchMedia reverte tweens/sets;
       aqui só o que ele não cobre */
    return function () {
      cleanups.forEach(function (fn) { fn(); });
      counters.forEach(function (c) { c.node.nodeValue = c.text; });
    };
  }
})();
