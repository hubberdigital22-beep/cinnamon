/* ============================================================
   CINNAMON STUDIO — hero.js  (fase 3)
   "A CHEGADA" — hero pinado, 100% controlado pelo scroll.
   O vídeo oficial (torre → sacada → studio → banho) vira uma
   sequência de 120 frames WebP desenhada num <canvas> mapeado
   ao scrub — técnica da referência (Apêndice A). Sem autoplay,
   sem áudio. Os chapter-cards anotam os momentos do voo.

   Desktop:  pin + scrub 1 + end "+=400%", frames 1280w.
   Mobile:   mesmo roteiro, end "+=220%", frames 800w.
   Fallback: sem JS / reduced-motion / frames indisponíveis —
             as três cenas estáticas em fluxo continuam no HTML.

   Regra dura: anima apenas transform e opacity (+ o desenho do
   círculo por stroke-dashoffset, previsto na spec §2.3/§7).
   ============================================================ */
(function () {
  'use strict';

  var C = window.CINNAMON;
  if (!C || !window.gsap || !window.ScrollTrigger) return;

  var hero = document.querySelector('#hero');
  if (!hero) return;

  var HERO_LABELS = ['I · A Torre', 'II · O Studio', 'III · O Refúgio'];

  var mm = gsap.matchMedia();

  mm.add(
    {
      desktop: '(min-width: 1024px)',
      mobile: '(max-width: 1023.98px)',
      reduce: '(prefers-reduced-motion: reduce)'
    },
    function (ctx) {
      /* reduced-motion: sem pin, sem scrub, sem Ken Burns —
         o layout em fluxo do CSS resolve tudo */
      if (ctx.conditions.reduce) return;
      return build(ctx.conditions.desktop);
    }
  );

  function build(isDesktop) {
    var scenes = gsap.utils.toArray('.hero-scene', hero);
    if (scenes.length !== 3) return;

    var medias = scenes.map(function (s) { return s.querySelector('.hero-scene__media'); });
    var intro = hero.querySelector('.hero-intro');
    var introEls = intro ? Array.prototype.slice.call(intro.children) : [];
    var ringWrap = hero.querySelector('.ring--hero');
    var ringCircle = ringWrap && ringWrap.querySelector('circle');
    var hint = hero.querySelector('.scroll-hint');

    var split = C.splitWords || function (el) { return el ? [el] : []; };

    /* chapter-cards das três cenas (a torre também tem o seu) */
    var cards = scenes.map(function (scene) {
      var inner = scene.querySelector('.chapter-card__inner');
      return {
        eyebrow: inner.querySelector('.eyebrow'),
        words: split(inner.querySelector('.display')),
        hairline: inner.querySelector('.hairline'),
        caption: inner.querySelector('.caption')
      };
    });

    /* véu final: a cena IV escurece para --dark e "pousa" na seção 02.
       Criado via JS (camada exclusiva de animação); estilos estáticos
       direto no style para sobreviverem ao revert do matchMedia. */
    var veil = hero.querySelector('.hero-veil');
    if (!veil) {
      veil = document.createElement('div');
      veil.className = 'hero-veil';
      veil.setAttribute('aria-hidden', 'true');
      veil.style.cssText =
        'position:absolute;inset:0;z-index:5;pointer-events:none;background:#22231f;opacity:0;';
      hero.appendChild(veil);
    }

    /* ---------- sequência de frames do vídeo ----------
       O vídeo roda até o f_102 (fim do corredor). O corte interno dele
       para o banheiro é substituído pelo crossfade para a foto banho-01
       com zoom contínuo — os frames 103–120 nem são baixados. */
    var FRAMES = 102;
    /* celular em pé usa o recorte vertical (406x720, 1:1 com a tela);
       desktop e tablets/landscape usam o set 1280.
       clientWidth/Height (não innerWidth): medem o viewport de layout,
       estáveis com barra de rolagem e barra de endereço dinâmica. */
    var vpW = document.documentElement.clientWidth;
    var vpH = document.documentElement.clientHeight;
    var portrait = !isDesktop && vpH > vpW && vpW < 600;
    var seqDir = 'img/hero-seq/' + (portrait ? 'm' : '1280') + '/';
    var canvas = hero.querySelector('.hero-canvas');
    var cctx = canvas ? canvas.getContext('2d') : null;
    var fallbackImg = medias[0] ? medias[0].querySelector('img') : null;
    var frames = new Array(FRAMES);
    var frameOk = new Array(FRAMES);
    var curFrame = -1;
    var firstDraw = false;
    /* blur da abertura, desenhado DENTRO do canvas (ctx.filter):
       só custa quando um frame é redesenhado — nada de filter animado
       no compositor. Safari sem suporte cai para véu escuro puro. */
    var blurAmt = 12;
    var blurOk = false;
    if (cctx) {
      try { cctx.filter = 'blur(2px)'; blurOk = cctx.filter.indexOf('blur') > -1; cctx.filter = 'none'; } catch (e) {}
    }
    /* celular: cada redesenho com ctx.filter blur custa dezenas de ms nas
       GPUs móveis — bem no primeiro gesto de scroll. A vinheta escura
       sozinha já faz a abertura; o blur fica só no desktop. */
    if (!isDesktop) blurOk = false;
    if (!blurOk) blurAmt = 0;

    function frameSrc(i) {
      var n = String(i + 1);
      while (n.length < 3) n = '0' + n;
      return seqDir + 'f_' + n + '.webp';
    }

    function sizeCanvas() {
      if (!canvas || !medias[0]) return;
      var r = medias[0].getBoundingClientRect();
      if (!r.width || !r.height) return; /* aba oculta: mede 0, tenta no próximo refresh */
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      /* teto do backing: pintar acima de ~1.25x da fonte (720p) não adiciona
         nitidez — o CSS estica o resto — e rasterizar 3000px de canvas a cada
         frame é o que trava máquinas modestas */
      var maxW = isDesktop ? 1600 : 1080;
      var w = Math.min(Math.round(r.width * dpr), maxW);
      var h = Math.round(w * (r.height / r.width));
      if (!isDesktop && h > 780) { /* fonte tem 720 de altura: acima disso é só custo */
        h = 780;
        w = Math.round(h * (r.width / r.height));
      }
      canvas.width = Math.max(1, w);
      canvas.height = Math.max(1, h);
      if (cctx) {
        cctx.imageSmoothingEnabled = true;
        try { cctx.imageSmoothingQuality = 'high'; } catch (e) {}
      }
      curFrame = -1; /* força redesenho no novo tamanho */
      drawFrame(lastTarget);
    }

    function drawFrame(target) {
      if (!cctx) return;
      /* usa o frame pedido ou o carregado mais próximo abaixo/acima */
      var i = Math.max(0, Math.min(FRAMES - 1, Math.round(target)));
      if (!frameOk[i]) {
        var d = 1, found = -1;
        while (d < FRAMES) {
          if (i - d >= 0 && frameOk[i - d]) { found = i - d; break; }
          if (i + d < FRAMES && frameOk[i + d]) { found = i + d; break; }
          d++;
        }
        if (found < 0) return;
        i = found;
      }
      if (i === curFrame) return;
      curFrame = i;
      var im = frames[i];
      var cw = canvas.width, ch = canvas.height;
      var sc = Math.max(cw / im.naturalWidth, ch / im.naturalHeight); /* cover */
      var dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
      if (blurOk) cctx.filter = blurAmt > 0.2 ? 'blur(' + blurAmt + 'px)' : 'none';
      cctx.clearRect(0, 0, cw, ch);
      /* com blur, desenha levemente maior para as bordas borradas não vazarem */
      var pad = blurAmt > 0.2 ? blurAmt * 2 : 0;
      cctx.drawImage(im, (cw - dw) / 2 - pad, (ch - dh) / 2 - pad, dw + pad * 2, dh + pad * 2);
      if (blurOk) cctx.filter = 'none';
      if (!firstDraw) {
        firstDraw = true;
        if (fallbackImg) gsap.set(fallbackImg, { autoAlpha: 0 }); /* sem flash */
      }
    }

    var lastTarget = 0;
    function requestDraw(target) {
      lastTarget = target;
      drawFrame(target);
    }

    /* carrega em duas ondas: os primeiros 24 (o preloader espera por eles)
       e o resto em fila com concorrência limitada */
    (function loadFrames() {
      /* mobile: 4 em voo (não 6) — a banda que sobra vai para as imagens
         das seções que o lazy nativo está buscando ao mesmo tempo */
      var next = 0, INFLIGHT = isDesktop ? 6 : 4;
      function pump() {
        while (INFLIGHT > 0 && next < FRAMES) {
          (function (i) {
            INFLIGHT--;
            var im = new Image();
            im.decoding = 'async';
            /* cauda da sequência cede prioridade de rede ao que está na tela */
            if ('fetchPriority' in im) im.fetchPriority = i < 32 ? 'auto' : 'low';
            var done = function (ok) {
              if (ok && im.naturalWidth) { frames[i] = im; frameOk[i] = true;
                if (Math.round(lastTarget) === i || curFrame < 0) drawFrame(lastTarget);
              }
              INFLIGHT++;
              pump();
            };
            im.onload = function () {
              /* decodifica JÁ, fora da thread principal — sem isso o primeiro
                 drawImage de cada frame decodifica na hora e trava o scroll */
              if (im.decode) im.decode().then(function () { done(true); }, function () { done(true); });
              else done(true);
            };
            im.onerror = function () { done(false); };
            im.src = frameSrc(i);
          })(next++);
        }
      }
      pump();
    })();

    ScrollTrigger.addEventListener('refresh', sizeCanvas);
    sizeCanvas();

    /* ---------- estados iniciais (sempre via gsap.set) ---------- */
    /* cena 2 (studio) é "porta-card" transparente sobre o vídeo: fundo e
       mídia somem, só o chapter-card anima. */
    gsap.set(scenes[1], { autoAlpha: 1, backgroundImage: 'none' });
    (function () {
      var parts = [scenes[1].querySelector('.hero-scene__media'), scenes[1].querySelector('.hero-scene__scrim')];
      parts.forEach(function (el) { if (el) gsap.set(el, { display: 'none' }); });
    })();
    /* cena 3 (banho) é o destino do corte: a foto banho-01 entra no fim do
       vídeo com zoom contínuo — começa invisível, mídia e scrim ativos. */
    gsap.set(scenes[2], { autoAlpha: 0 });
    gsap.set(medias[2], {
      scale: 1, willChange: 'transform', force3D: true,
      transformOrigin: '50% 45%' /* mira a bancada/espelho no corte cover */
    });
    cards.forEach(function (p) {
      gsap.set(p.eyebrow, { autoAlpha: 0, y: 26 });
      gsap.set(p.words, { yPercent: 115 });
      gsap.set(p.hairline, { scaleX: 0 });
      gsap.set(p.caption, { autoAlpha: 0, y: 26 });
    });
    gsap.set(veil, { opacity: 0 });

    /* ---------- círculo hairline: desenho ao carregar + rotação ---------- */
    if (ringCircle) ringCircle.setAttribute('pathLength', '100');

    var introTl = null;
    function playHeroIntro() {
      if (introTl) introTl.kill();
      introTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      /* a saída do voo deixa o anel em autoAlpha 0 — restaura o descanso do CSS */
      if (ringWrap) gsap.set(ringWrap, { autoAlpha: 0.75 });
      if (ringCircle) {
        gsap.set(ringCircle, { attr: { 'stroke-dasharray': 100, 'stroke-dashoffset': 100 } });
        /* desenha até deixar uma fresta de 2% — é ela que torna a rotação visível */
        introTl.to(ringCircle, {
          attr: { 'stroke-dashoffset': 2 },
          duration: 2.6,
          ease: 'power2.inOut'
        }, 0);
      }
      if (introEls.length) {
        /* fromTo (não from): se a intro for reiniciada com os elementos ainda
           invisíveis (aba em 2º plano, rAF suspenso), um from gravaria 0 como
           destino e o wordmark ficaria preso invisível */
        introTl.fromTo(introEls,
          { autoAlpha: 0, y: 36 },
          { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.2);
      }
      return introTl;
    }
    /* FASE 4: o preloader pode chamar CINNAMON.playHeroIntro() ao revelar
       o hero ("já em movimento"). Até lá, roda no load. */
    C.playHeroIntro = playHeroIntro;
    playHeroIntro();

    /* aba que carrega em 2º plano: o rAF fica suspenso e a intro congela
       invisível no frame 0 — ao ficar visível com a página no topo, replay */
    function onVisible() {
      if (!document.hidden && window.scrollY < 8 && introTl && introTl.progress() < 1) {
        playHeroIntro();
      }
    }
    document.addEventListener('visibilitychange', onVisible);

    if (isDesktop && ringCircle) {
      gsap.to(ringCircle, {
        rotation: 360,
        svgOrigin: '50 50',
        duration: 160,
        ease: 'none',
        repeat: -1
      });
    }

    /* ---------- timeline mestra (scrub) ----------
       Unidades abstratas (~20) mapeadas ao pin inteiro. */
    var hintHidden = false;

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: isDesktop ? '+=400%' : '+=220%',
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        onUpdate: onHeroUpdate
      }
    });

    function cardIn(p, at) {
      tl.to(p.eyebrow, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, at)
        .to(p.words, { yPercent: 0, duration: 1.1, stagger: 0.07, ease: 'expo.out' }, at + 0.15)
        .to(p.hairline, { scaleX: 1, duration: 1, ease: 'power3.out' }, at + 0.45)
        .to(p.caption, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, at + 0.6);
    }

    /* saída simétrica: mesmos elementos, coreografia espelhada para cima */
    function cardOut(p, at) {
      tl.to(p.caption, { autoAlpha: 0, y: -20, duration: 0.55, ease: 'power2.in' }, at)
        .to(p.hairline, { scaleX: 0, duration: 0.6, ease: 'power3.in' }, at + 0.05)
        .to(p.words, { yPercent: -115, duration: 0.85, stagger: 0.06, ease: 'expo.in' }, at + 0.1)
        .to(p.eyebrow, { autoAlpha: 0, y: -20, duration: 0.55, ease: 'power2.in' }, at + 0.2);
    }

    /* O VOO — 120 frames do vídeo mapeados ao scrub (0 → 17.6 de 20;
       o fim reserva o pouso). Momentos do vídeo (10s → unidades):
       torre 0–3s (0–5.3) · sacada/janela ~3s (≈5.3) · living 3.5–6s
       (6.2–10.6) · quarto 6–7.5s · office 7.5–8.7s · banho 8.7–10s. */
    var seq = { f: 0 };
    tl.to(seq, {
      f: FRAMES - 1, duration: 15.2, ease: 'none',
      onUpdate: function () { requestDraw(seq.f); }
    }, 0);

    /* véu de abertura: a 1ª tela nasce coberta e desfocada; o scroll
       revela rápido — prédio limpo e nítido em ~18% do voo */
    var vinheta = hero.querySelector('.hero-vinheta');
    if (vinheta) {
      tl.fromTo(vinheta, { opacity: 1 }, { opacity: 0, duration: 3.2, ease: 'none' }, 0.3);
    }
    if (blurOk) {
      var blurProxy = { b: 12 };
      tl.fromTo(blurProxy, { b: 12 }, {
        b: 0, duration: 3.4, ease: 'none',
        onUpdate: function () {
          /* quantiza em passos de 0.5px: redesenha só quando muda de degrau */
          var q = Math.round(blurProxy.b * 2) / 2;
          if (q !== blurAmt) {
            blurAmt = q;
            curFrame = -1; /* força redesenho do frame atual com o novo blur */
            drawFrame(lastTarget);
          }
        }
      }, 0.3);
    }

    /* intro sai no início do voo. fromTo com immediateRender:false:
       um .to() gravaria como "início" o valor do momento em que o scrub
       cruza o ponto — se a intro ainda estivesse entrando, voltar ao topo
       restauraria esse meio-termo e os textos não reapareceriam. */
    if (introEls.length) {
      tl.fromTo(introEls,
        { autoAlpha: 1, y: 0 },
        { autoAlpha: 0, y: -44, duration: 0.9, stagger: 0.08, ease: 'power2.in', immediateRender: false },
        1.2);
    }
    if (ringWrap) {
      tl.fromTo(ringWrap,
        { autoAlpha: 0.75 }, /* opacidade de descanso do CSS */
        { autoAlpha: 0, duration: 0.8, ease: 'power1.in', immediateRender: false },
        1.8);
    }

    /* cards anotando o voo: torre → studio → refúgio */
    cardIn(cards[0], 1.6);
    cardOut(cards[0], 4.0);
    cardIn(cards[1], 6.8);
    /* o tour interno é longo (living → quarto → office, até ~15.2):
       o card acompanha quase até o corte do banheiro */
    cardOut(cards[1], 13.6);

    /* O BANHEIRO — o vídeo congela no corredor (f_102) e a foto banho-01
       assume no lugar do corte interno do vídeo, com o zoom levando o
       movimento adiante até o pouso. */
    tl.to(scenes[2], { autoAlpha: 1, duration: 1.0 }, 15.2);
    tl.fromTo(medias[2], { scale: 1.04 }, {
      scale: 1.22, duration: 4.8, ease: 'none', force3D: true
    }, 15.2);
    cardIn(cards[2], 16.4);
    cardOut(cards[2], 18.7);

    /* pouso: escurece a cena III — mas NÃO até o preto total. Em opacidade 1
       o hero virava um retângulo chapado e ainda precisava rolar os próprios
       100svh, criando uma tela inteira de vazio antes da seção 02. Parando em
       .55 a imagem segue perceptível enquanto o hero sai de cena.
       Termina em 20.0 = exatamente onde o pin solta. */
    tl.to(veil, { opacity: 0.55, duration: 2.4, ease: 'power1.in' }, 17.6);

    /* limites de capítulo = meio de cada crossfade
       (var hoisted: undefined até aqui — onHeroUpdate se protege) */
    var D = tl.duration();
    var marks = [5.3 / D, 15.7 / D];
    ScrollTrigger.update(); /* aplica o capítulo correto já no load */

    function onHeroUpdate(self) {
      var p = self.progress;

      /* hint "ROLE": some assim que a descida começa, volta no topo */
      if (hint) {
        if (p > 0.02 && !hintHidden) {
          hintHidden = true;
          gsap.to(hint, { autoAlpha: 0, y: 14, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
        } else if (p <= 0.02 && hintHidden) {
          hintHidden = false;
          gsap.to(hint, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
          /* de volta ao topo: a intro se reapresenta (wordmark, slogan,
             círculo redesenhado) — igual ao primeiro carregamento.
             Failsafe via setTimeout (independente de rAF): se a timeline
             não avançou — aba de fundo, rAF suspenso — salta para o fim,
             deixando os textos visíveis de qualquer jeito. */
          playHeroIntro();
          setTimeout(function () {
            if (introTl && introTl.progress() < 0.05 && window.scrollY < 60) {
              introTl.progress(1);
            }
          }, 2400);
        }
      }

      /* se o usuário desceu durante a intro de load, conclui na hora
         para o scrub capturar os valores finais corretos */
      if (p > 0.01 && introTl && introTl.progress() < 1) introTl.progress(1);

      /* capítulo no rail (ui.js só registra setChapter no desktop).
         Guarda: o ST pode disparar onUpdate durante a criação da
         timeline, antes de marks existir. */
      if (C.setChapter && marks) {
        var i = p < marks[0] ? 0 : p < marks[1] ? 1 : 2;
        C.setChapter(HERO_LABELS[i]);
      }
    }

    /* cleanup extra do matchMedia (tweens/sets/ST são revertidos por ele) */
    return function () {
      ScrollTrigger.removeEventListener('refresh', sizeCanvas);
      document.removeEventListener('visibilitychange', onVisible);
      if (introTl) introTl.kill();
      if (C.playHeroIntro === playHeroIntro) C.playHeroIntro = null;
    };
  }
})();
