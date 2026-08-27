/* ============================================================
   CINNAMON STUDIO — menu.js
   Drawer de navegação: painel de 1/3 da largura entrando pela
   direita, sobre um scrim clicável. Compartilhado entre o index
   imersivo e as páginas editoriais.
   Vanilla, sem dependência: funciona mesmo se o CDN do GSAP
   falhar — e a tag <script> dele vem ANTES da do CDN, senão o
   defer o faria esperar o bundle inteiro. Quem exibe o botão é
   o bootstrap inline do <head> (html.has-menu, antes do 1º
   paint); sem JS a classe não entra e a navegação fica no rodapé.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var btn = document.querySelector('[data-menu-toggle]');
  var overlay = document.getElementById('menu-overlay');
  if (!btn || !overlay) return;

  /* o bootstrap do <head> já pôs a classe; repetimos para o caso de
     esta página não ter o inline (fallback inofensivo) */
  root.classList.add('has-menu');

  var panel = overlay.querySelector('.menu-panel') || overlay;
  var lastFocus = null;

  /* duração do slide do painel (CSS: .62s) — o hidden só volta depois
     que a transição termina, senão o drawer some sem animar */
  var SAIDA = 640;
  /* estado próprio: `overlay.hidden` só volta a true no fim da saída, então
     usá-lo como estado deixava o botão morto por 640ms depois de fechar */
  var aberto = false;
  var saidaTimer = null;

  function lenis() {
    return (window.CINNAMON && window.CINNAMON.lenis) || null;
  }

  function focaveis() {
    return Array.prototype.slice.call(
      panel.querySelectorAll('a[href], button:not([disabled])')
    ).filter(function (el) { return el.offsetParent !== null; });
  }

  function open() {
    if (aberto) return;
    aberto = true;
    if (saidaTimer) { window.clearTimeout(saidaTimer); saidaTimer = null; }
    lastFocus = document.activeElement;
    overlay.hidden = false;
    overlay.removeAttribute('aria-hidden');
    /* o painel sai de translateX(100%): a transição só roda se esse estado
       inicial for calculado ANTES da classe entrar. Um reflow forçado faz
       isso na hora — o duplo requestAnimationFrame de antes dependia de
       frames, e com o rAF suspenso (aba em 2º plano, app minimizado no
       celular) o drawer ficava logicamente aberto e visualmente ausente,
       com o scroll travado. */
    void overlay.offsetWidth;
    overlay.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    root.classList.add('menu-open');
    var l = lenis();
    if (l && l.stop) l.stop();
    var alvos = focaveis();
    if (alvos.length) alvos[0].focus();
  }

  function close() {
    if (!aberto) return;
    aberto = false;
    overlay.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    root.classList.remove('menu-open');
    var l = lenis();
    if (l && l.start) l.start();
    /* aria-hidden imediato: sem isso o leitor de tela ainda alcança o
       painel durante os 640ms de saída, com o foco já de volta na página */
    overlay.setAttribute('aria-hidden', 'true');
    saidaTimer = window.setTimeout(function () {
      overlay.hidden = true;
      saidaTimer = null;
    }, SAIDA);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  btn.addEventListener('click', function () {
    if (aberto) { close(); } else { open(); }
  });

  /* botão "Fechar" E o scrim — ambos marcados com data-menu-close */
  Array.prototype.forEach.call(
    overlay.querySelectorAll('[data-menu-close]'),
    function (el) { el.addEventListener('click', close); }
  );

  document.addEventListener('keydown', function (ev) {
    if (!aberto) return;
    if (ev.key === 'Escape') { close(); return; }
    /* foco preso no painel enquanto o drawer está aberto */
    if (ev.key !== 'Tab') return;
    var alvos = focaveis();
    if (!alvos.length) return;
    var primeiro = alvos[0];
    var ultimo = alvos[alvos.length - 1];
    if (ev.shiftKey && document.activeElement === primeiro) {
      ev.preventDefault();
      ultimo.focus();
    } else if (!ev.shiftKey && document.activeElement === ultimo) {
      ev.preventDefault();
      primeiro.focus();
    }
  });

  /* toque dado antes deste arquivo carregar (bootstrap do <head>):
     abre agora, para o botão nunca parecer morto */
  window.__menuPronto = true;
  if (window.__menuPendente) {
    window.__menuPendente = false;
    open();
  }

  /* link clicado → fecha (âncoras na mesma página não recarregam) */
  panel.addEventListener('click', function (ev) {
    if (ev.target.closest && ev.target.closest('a')) close();
  });
})();
