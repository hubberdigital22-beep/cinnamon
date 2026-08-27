/* ============================================================
   CINNAMON STUDIO — forms.js
   Progressive enhancement dos formulários de captação (landing,
   evento-rio). Sem JS o <form method="POST" action="/api/lead">
   nativo continua funcionando — a Function redireciona de volta
   com ?enviado=1. Com JS, o envio vira fetch e a mensagem aparece
   sem recarregar a página. Vanilla, sem dependência.
   ============================================================ */
(function () {
  'use strict';

  function mostrarSucesso(form) {
    var msg = form.querySelector('[data-role="msg"]');
    var sucesso = form.querySelector('[data-role="sucesso"]');
    var texto = sucesso ? sucesso.textContent : 'Recebemos seu contato.';
    if (msg) {
      msg.textContent = texto;
      msg.dataset.state = 'ok';
      msg.hidden = false;
    }
    form.querySelectorAll('input, select, button, textarea').forEach(function (el) {
      el.disabled = true;
    });
  }

  function mostrarErro(form, texto) {
    var msg = form.querySelector('[data-role="msg"]');
    if (!msg) return;
    msg.textContent = texto || 'Não conseguimos enviar agora. Tente de novo em instantes.';
    msg.dataset.state = 'erro';
    msg.hidden = false;
  }

  document.querySelectorAll('form[data-form="lead"]').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = form.querySelector('.form__submit');
      if (btn) btn.disabled = true;

      var dados = {};
      new FormData(form).forEach(function (v, k) { dados[k] = v; });

      fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        body: JSON.stringify(dados)
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, json: j }; }); })
        .then(function (res) {
          if (res.ok && res.json.ok) {
            mostrarSucesso(form);
          } else {
            mostrarErro(form, res.json && res.json.erro);
            if (btn) btn.disabled = false;
          }
        })
        .catch(function () {
          mostrarErro(form);
          if (btn) btn.disabled = false;
        });
    });
  });

  if (/[?&]enviado=1\b/.test(window.location.search)) {
    document.querySelectorAll('form[data-form="lead"]').forEach(mostrarSucesso);
  }
})();
