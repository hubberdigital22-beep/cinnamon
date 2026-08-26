/* ============================================================
   CINNAMON STUDIO — lenis-setup.js  (fase 3)
   Base de movimento: html.has-js, flags globais, Lenis
   sincronizado com ScrollTrigger, âncoras internas e
   ScrollTrigger.refresh() com debounce no resize.

   Regras: reduced-motion => sem Lenis (scroll nativo) e
   classe html.is-reduced (o CSS mantém o hero em fluxo).
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;

  /* Sem GSAP/ScrollTrigger (CDN indisponível) a página segue
     100% legível no layout sem JS — não adicionamos has-js. */
  if (!window.gsap || !window.ScrollTrigger) return;

  var mqReduce  = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqDesktop = window.matchMedia('(min-width: 1024px)');

  /* gancho de CSS: empilha as cenas do hero, exibe cursor etc. */
  root.classList.add('has-js');
  root.classList.toggle('is-reduced', mqReduce.matches);

  /* flags e utilitários globais — ui.js registra splitWords/setChapter,
     hero.js registra playHeroIntro */
  window.CINNAMON = {
    reducedMotion: mqReduce.matches,
    isDesktop: mqDesktop.matches,
    lenis: null,
    splitWords: null,
    setChapter: null,
    playHeroIntro: null
  };

  gsap.registerPlugin(ScrollTrigger);

  /* o preloader real (contador + saída em máscara) vive em sections.js */

  /* ---------- Lenis — sincronização canônica ---------- */
  function startLenis() {
    if (window.CINNAMON.lenis || typeof window.Lenis !== 'function') return;
    var lenis = new Lenis();
    lenis.on('scroll', ScrollTrigger.update);
    window.CINNAMON.lenis = lenis;
    /* o scroll-behavior:smooth do CSS conflita com o scroll do Lenis */
    root.style.scrollBehavior = 'auto';
  }

  function stopLenis() {
    if (!window.CINNAMON.lenis) return;
    window.CINNAMON.lenis.destroy();
    window.CINNAMON.lenis = null;
    root.style.removeProperty('scroll-behavior');
  }

  /* um único ticker: alimenta o raf do Lenis quando ele existe */
  gsap.ticker.add(function (time) {
    if (window.CINNAMON.lenis) window.CINNAMON.lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  if (!mqReduce.matches) startLenis();

  /* troca ao vivo da preferência de movimento */
  mqReduce.addEventListener('change', function (e) {
    window.CINNAMON.reducedMotion = e.matches;
    root.classList.toggle('is-reduced', e.matches);
    if (e.matches) stopLenis();
    else startLenis();
    ScrollTrigger.refresh();
  });

  mqDesktop.addEventListener('change', function (e) {
    window.CINNAMON.isDesktop = e.matches;
  });

  /* ---------- âncoras internas roteadas pelo Lenis ---------- */
  document.addEventListener('click', function (ev) {
    var link = ev.target.closest && ev.target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute('href').slice(1);
    if (!id) return;
    var target = document.getElementById(id);
    if (!target || !window.CINNAMON.lenis) return; /* sem Lenis: nativo */
    ev.preventDefault();
    if (id === 'hero') window.CINNAMON.lenis.scrollTo(0);
    else window.CINNAMON.lenis.scrollTo(target, { offset: 0 });
  });

  /* ---------- Lenis re-mede o limite sempre que a página muda de altura ----
     Pins do ScrollTrigger e imagens tardias ESTICAM o documento depois do
     load — inclusive sem refresh do ScrollTrigger no meio. Sem re-medir,
     o Lenis trava o scroll antes do fim da página. O ResizeObserver pega
     TODA mudança de altura do body, venha de onde vier. */
  function lenisResize() {
    if (window.CINNAMON.lenis && window.CINNAMON.lenis.resize) {
      window.CINNAMON.lenis.resize();
    }
  }
  ScrollTrigger.addEventListener('refresh', lenisResize);
  if (window.ResizeObserver) {
    var roTimer = null;
    new ResizeObserver(function () {
      if (roTimer) clearTimeout(roTimer);
      roTimer = setTimeout(lenisResize, 120);
    }).observe(document.body);
  }

  /* ---------- refresh com debounce no resize (~200ms) ---------- */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resizeTimer = null;
      ScrollTrigger.refresh();
    }, 200);
  });
})();
