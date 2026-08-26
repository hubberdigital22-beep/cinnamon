/* ============================================================
   CINNAMON STUDIO — ui.js  (fase 3)
   Camada de interface: split-text manual (global), cursor
   custom (dot + ring com lerp), rail de progresso com label
   de capítulo, fade-in do header após o hero e CTA magnético.

   O grain é 100% CSS (.grain) — nada a fazer aqui.
   Em reduced-motion só o rail funciona (sem fades).
   ============================================================ */
(function () {
  'use strict';

  var C = window.CINNAMON;
  if (!C || !window.gsap || !window.ScrollTrigger) return;

  /* ------------------------------------------------------------
     SPLIT-TEXT MANUAL — window.CINNAMON.splitWords(el)
     Envolve cada palavra em <span class="word-mask"><span class="word">,
     preservando os espaços como nós de texto (a linha quebra normal).
     A11y: o texto integral vira aria-label do elemento; os spans
     ficam aria-hidden. Usar apenas em elementos de TEXTO PURO
     (sem filhos como <sup>/<span> — ex.: não usar em .planta__num).
     Retorna o array de .word para animar (yPercent).
     ------------------------------------------------------------ */
  C.splitWords = function (el) {
    if (!el) return [];
    if (el.dataset.split === 'words') {
      return Array.prototype.slice.call(el.querySelectorAll('.word'));
    }
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return [];
    el.setAttribute('aria-label', text);
    var frag = document.createDocumentFragment();
    var words = text.split(' ');
    for (var i = 0; i < words.length; i++) {
      var mask = document.createElement('span');
      mask.className = 'word-mask';
      mask.setAttribute('aria-hidden', 'true');
      var word = document.createElement('span');
      word.className = 'word';
      word.textContent = words[i];
      mask.appendChild(word);
      frag.appendChild(mask);
      if (i < words.length - 1) frag.appendChild(document.createTextNode(' '));
    }
    el.textContent = '';
    el.appendChild(frag);
    el.dataset.split = 'words';
    return Array.prototype.slice.call(el.querySelectorAll('.word'));
  };

  var mm = gsap.matchMedia();

  /* ------------------------------------------------------------
     HEADER FIXO — sempre visível (decisão do cliente): o véu com
     blur da barra garante legibilidade sobre qualquer seção.
     ------------------------------------------------------------ */
  /* (o fade-in pós-hero foi removido; o CSS já o exibe por padrão) */

  /* ------------------------------------------------------------
     LIGHTBOX DA GALERIA — clique expande; clique na imagem dá zoom
     no ponto; arrastar move; Esc / FECHAR / fundo fecham.
     ------------------------------------------------------------ */
  (function initLightbox() {
    var frames = Array.prototype.slice.call(document.querySelectorAll('.galeria__frame'));
    if (!frames.length) return;

    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Imagem ampliada');
    box.innerHTML =
      '<button class="lightbox__close" type="button">Fechar</button>' +
      '<img class="lightbox__img" alt="">' +
      '<p class="lightbox__legend" aria-hidden="true"></p>';
    document.body.appendChild(box);

    var big = box.querySelector('.lightbox__img');
    var legend = box.querySelector('.lightbox__legend');
    var closeBtn = box.querySelector('.lightbox__close');
    var zoomed = false, panX = 0, panY = 0, dragging = false, moved = false;
    var startX = 0, startY = 0, ZOOM = 2.2;

    function largestSrc(img) {
      if (img.srcset) {
        var parts = img.srcset.split(',');
        return parts[parts.length - 1].trim().split(/\s+/)[0];
      }
      return img.currentSrc || img.src;
    }

    function render(anim) {
      var t = zoomed ? { x: panX, y: panY, scale: ZOOM } : { x: 0, y: 0, scale: 1 };
      (anim ? gsap.to : gsap.set)(big, anim
        ? { x: t.x, y: t.y, scale: t.scale, duration: 0.45, ease: 'power3.out', overwrite: 'auto' }
        : { x: t.x, y: t.y, scale: t.scale });
      box.classList.toggle('is-zoomed', zoomed);
    }

    function clampPan() {
      var r = big.getBoundingClientRect();
      var baseW = r.width / (zoomed ? ZOOM : 1), baseH = r.height / (zoomed ? ZOOM : 1);
      var maxX = Math.max(0, (baseW * ZOOM - window.innerWidth) / 2 + 40);
      var maxY = Math.max(0, (baseH * ZOOM - window.innerHeight) / 2 + 40);
      panX = Math.max(-maxX, Math.min(maxX, panX));
      panY = Math.max(-maxY, Math.min(maxY, panY));
    }

    function open(img, caption) {
      big.src = largestSrc(img);
      big.alt = img.alt || '';
      legend.textContent = caption || '';
      zoomed = false; panX = panY = 0;
      render(false);
      box.classList.add('is-open');
      gsap.fromTo(box, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' });
      if (C.lenis) C.lenis.stop();
      document.documentElement.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function close() {
      gsap.to(box, {
        autoAlpha: 0, duration: 0.3, ease: 'power2.out',
        onComplete: function () { box.classList.remove('is-open'); big.src = ''; }
      });
      if (C.lenis) C.lenis.start();
      document.documentElement.style.removeProperty('overflow');
    }

    frames.forEach(function (frame) {
      var img = frame.querySelector('img');
      if (!img) return;
      frame.setAttribute('role', 'button');
      frame.setAttribute('tabindex', '0');
      frame.setAttribute('aria-label', 'Ampliar imagem: ' + (img.alt || 'render do studio'));
      var fig = frame.closest('figure');
      var cap = fig && fig.querySelector('figcaption');
      var open4 = function () { open(img, cap ? cap.textContent.replace(/\s+/g, ' ').trim() : ''); };
      frame.addEventListener('click', open4);
      frame.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open4(); }
      });
    });

    /* zoom no ponto clicado / arrastar quando ampliado */
    big.addEventListener('pointerdown', function (e) {
      dragging = zoomed; moved = false;
      startX = e.clientX; startY = e.clientY;
      if (dragging) big.setPointerCapture(e.pointerId);
    });
    big.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      panX += dx; panY += dy;
      startX = e.clientX; startY = e.clientY;
      clampPan();
      render(false);
    });
    big.addEventListener('pointerup', function (e) {
      if (dragging && moved) { dragging = false; return; }
      dragging = false;
      if (!zoomed) {
        var r = big.getBoundingClientRect();
        /* leva o ponto clicado para o centro da tela */
        panX = (window.innerWidth / 2 - e.clientX) * ZOOM + (r.left + r.width / 2 - window.innerWidth / 2);
        panY = (window.innerHeight / 2 - e.clientY) * ZOOM + (r.top + r.height / 2 - window.innerHeight / 2);
        zoomed = true;
      } else {
        zoomed = false; panX = panY = 0;
      }
      clampPan();
      render(true);
    });
    big.addEventListener('click', function (e) { e.stopPropagation(); });

    closeBtn.addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('is-open')) close();
    });
  })();

  /* ------------------------------------------------------------
     RAIL DE PROGRESSO — desktop (>=1024px), inclusive em
     reduced-motion (segue o scroll sem suavização extra).
     - fill: scaleY 0→1 (só transform)
     - nó: translateY ao longo da linha
     - label: capítulo atual. Durante o hero (sem reduce) quem
       define o capítulo é o hero.js via C.setChapter().
     ------------------------------------------------------------ */
  mm.add(
    { railOn: '(min-width: 1024px)', reduce: '(prefers-reduced-motion: reduce)' },
    function (ctx) {
      if (!ctx.conditions.railOn) return;

      var line  = document.querySelector('.rail__line');
      var fill  = document.querySelector('.rail__fill');
      var node  = document.querySelector('.rail__node');
      var label = document.querySelector('.rail__label');
      if (!line || !fill || !node || !label) return;

      var reduced = ctx.conditions.reduce;

      gsap.set(fill, { scaleY: 0 });
      gsap.set(node, { x: 0, y: 0, xPercent: -50, yPercent: -50 });

      var setFill  = gsap.quickSetter(fill, 'scaleY');
      var setNodeY = gsap.quickSetter(node, 'y', 'px');

      var lineH = line.clientHeight;
      var measure = function () { lineH = line.clientHeight; };
      ScrollTrigger.addEventListener('refresh', measure);

      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: function (self) {
          setFill(self.progress);
          setNodeY(self.progress * lineH);
        }
      });

      /* label do capítulo */
      var current = label.textContent.trim();
      C.setChapter = function (text) {
        if (!text || text === current) return;
        current = text;
        if (C.reducedMotion) {
          label.textContent = text;
          return;
        }
        gsap.to(label, {
          autoAlpha: 0,
          duration: 0.18,
          ease: 'power1.out',
          overwrite: 'auto',
          onComplete: function () {
            label.textContent = text;
            gsap.to(label, { autoAlpha: 1, duration: 0.3, ease: 'power1.out' });
          }
        });
      };

      /* capítulos das seções 02–09 — nomes dos eyebrows/aria-labels reais */
      var SECTIONS = [
        ['#projeto',     '01 · O Projeto'],
        ['#arquitetura', '02 · Arquitetura'],
        ['#studio',      '03 · O Studio'],
        ['#galeria',     'O Studio · Em detalhe'],
        ['#potencial',   'O Potencial'],
        ['#estrutura',   '04 · Estrutura'],
        ['#localizacao', '05 · Orla de Palmas'],
        ['#contato',     'Contato']
      ];
      SECTIONS.forEach(function (pair) {
        var el = document.querySelector(pair[0]);
        if (!el) return;
        var apply = function () { C.setChapter && C.setChapter(pair[1]); };
        ScrollTrigger.create({
          trigger: el,
          start: 'top center',
          end: 'bottom center',
          onEnter: apply,
          onEnterBack: apply
        });
      });

      /* em reduced-motion o hero fica em fluxo (sem pin) e o hero.js
         não roda — os capítulos I–IV vêm das próprias cenas */
      if (reduced) {
        var HERO_LABELS = ['I · A Torre', 'II · O Studio', 'III · O Refúgio'];
        gsap.utils.toArray('#hero .hero-scene').forEach(function (scene, i) {
          var apply = function () { C.setChapter && C.setChapter(HERO_LABELS[i]); };
          ScrollTrigger.create({
            trigger: scene,
            start: 'top center',
            end: 'bottom center',
            onEnter: apply,
            onEnterBack: apply
          });
        });
      }

      return function () {
        ScrollTrigger.removeEventListener('refresh', measure);
        C.setChapter = null;
      };
    }
  );

  /* ------------------------------------------------------------
     CURSOR CUSTOM — desktop >=1024px, ponteiro fino, sem reduce.
     Ponto 6px segue o mouse; anel 32px com lerp ~0.12 num único
     ticker do GSAP. Expande sobre interativos (delegação).
     Nunca inicializa em touch (condição pointer:fine + hover).
     ------------------------------------------------------------ */
  mm.add(
    '(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    function () {
      var dot  = document.querySelector('.cursor-dot');
      var ring = document.querySelector('.cursor-ring');
      if (!dot || !ring) return;

      var target  = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      var ringPos = { x: target.x, y: target.y };
      var visible = false;
      var LERP = 0.12;

      gsap.set([dot, ring], {
        x: target.x, y: target.y, xPercent: -50, yPercent: -50, autoAlpha: 0
      });

      var setDotX  = gsap.quickSetter(dot,  'x', 'px');
      var setDotY  = gsap.quickSetter(dot,  'y', 'px');
      var setRingX = gsap.quickSetter(ring, 'x', 'px');
      var setRingY = gsap.quickSetter(ring, 'y', 'px');

      var INTERACTIVE = 'a[href], button, .galeria__item, .planta__figura, .servico, img';

      function onMove(e) {
        target.x = e.clientX;
        target.y = e.clientY;
        if (!visible) {
          visible = true;
          ringPos.x = target.x;
          ringPos.y = target.y;
          gsap.to([dot, ring], { autoAlpha: 1, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
        }
      }

      function onOver(e) {
        var hit = !!(e.target.closest && e.target.closest(INTERACTIVE));
        ring.classList.toggle('is-expanded', hit);
        dot.classList.toggle('is-hidden', hit);
        /* expansão por scale (60/32 = 1.875) — só transform/opacity */
        gsap.to(ring, { scale: hit ? 1.875 : 1, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
        gsap.to(dot,  { opacity: hit ? 0 : 1, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
      }

      function onOut(e) {
        if (!e.relatedTarget) { /* saiu da janela */
          visible = false;
          gsap.to([dot, ring], { autoAlpha: 0, duration: 0.3, ease: 'power1.out', overwrite: 'auto' });
        }
      }

      function tick() {
        ringPos.x += (target.x - ringPos.x) * LERP;
        ringPos.y += (target.y - ringPos.y) * LERP;
        setDotX(target.x);
        setDotY(target.y);
        setRingX(ringPos.x);
        setRingY(ringPos.y);
      }

      document.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerover', onOver);
      document.addEventListener('pointerout', onOut);
      gsap.ticker.add(tick);

      /* CTA magnético (.cta-major) — o CSS já reservou will-change */
      var magnetics = [];
      gsap.utils.toArray('.cta-major').forEach(function (cta) {
        var STRENGTH = 0.25;
        var LIMIT = 18;
        var move = function (e) {
          var r  = cta.getBoundingClientRect();
          var dx = gsap.utils.clamp(-LIMIT, LIMIT, (e.clientX - (r.left + r.width / 2)) * STRENGTH);
          var dy = gsap.utils.clamp(-LIMIT, LIMIT, (e.clientY - (r.top + r.height / 2)) * STRENGTH);
          gsap.to(cta, { x: dx, y: dy, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
        };
        var leave = function () {
          gsap.to(cta, { x: 0, y: 0, duration: 0.9, ease: 'power3.out', overwrite: 'auto' });
        };
        cta.addEventListener('pointermove', move);
        cta.addEventListener('pointerleave', leave);
        magnetics.push([cta, move, leave]);
      });

      return function () {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerover', onOver);
        document.removeEventListener('pointerout', onOut);
        gsap.ticker.remove(tick);
        ring.classList.remove('is-expanded');
        dot.classList.remove('is-hidden');
        magnetics.forEach(function (m) {
          m[0].removeEventListener('pointermove', m[1]);
          m[0].removeEventListener('pointerleave', m[2]);
        });
      };
    }
  );
})();
