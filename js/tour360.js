/* ============================================================
   CINNAMON STUDIO — tour360.js
   Experiência 360° (#tour): os panoramas equirretangulares das
   áreas comuns desenhados em WebGL, sem biblioteca — um quad de
   tela cheia e a projeção resolvida no fragment shader, a mesma
   técnica do arquivo entregue pela ABREU3DFX.

   As cenas vêm do HTML: cada .tour__room é um ambiente (data-pano,
   data-pano-fallback, data-alt). Nada de conteúdo mora aqui.

   O que muda em relação ao arquivo original:
   - os panoramas saem do base64 e viram arquivos com cache (AVIF,
     com o JPEG original de reserva);
   - nada é baixado antes de a seção se aproximar da tela, e só se
     desenha quando algo muda (o original redesenhava 60x por s);
   - shader em highp + amostragem bicúbica: o panorama é ampliado
     de 4 a 10 vezes, e em mediump a imagem "treme" no celular;
   - arrasto 1:1 com o dedo nos dois eixos, inércia e pinça;
   - em fluxo a rolagem vertical é da página; a tela cheia devolve
     o gesto inteiro ao panorama.

   Vanilla, sem dependência: abre mesmo se o CDN do GSAP falhar.
   Reduced-motion: sem inércia, sem zoom suave, sem fade de cena.
   Sem WebGL: o panorama plano, trocado pelos mesmos botões.
   ============================================================ */
(function () {
  'use strict';

  var stage = document.querySelector('[data-tour]');
  if (!stage) return;

  function q(sel) { return stage.querySelector(sel); }

  var canvas  = q('[data-tour-canvas]');
  var poster  = q('[data-tour-poster]');
  var titleEl = q('[data-tour-title]');
  var countEl = q('[data-tour-count]');
  var errorEl = q('[data-tour-error]');
  var fullBtn = q('[data-tour-full]');
  var rooms   = Array.prototype.slice.call(stage.querySelectorAll('.tour__room'));
  if (!canvas || !rooms.length) return;

  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* câmera — abertura, limites e passos do arquivo original (radianos;
     o fov é o vertical) */
  var FOV_START = 1.35, FOV_MIN = 0.55, FOV_MAX = 2.1;
  var PITCH_MAX = 1.38;
  var ZOOM_STEP = 0.16, WHEEL_STEP = 0.09, KEY_STEP = 0.12;
  var DPR_MAX = 2;
  var FRICTION = 0.92;   /* fração da velocidade que sobra a cada 1/60 s */
  var ZOOM_EASE = 0.2;
  var FADE = 450;        /* ms — igual à transição de opacity do canvas */

  var yaw = 0, pitch = 0, fov = FOV_START, fovTarget = FOV_START;
  var vYaw = 0, vPitch = 0;   /* rad/ms — velocidade do gesto */
  var solto = false;          /* só vira inércia depois que o ponteiro solta */

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function nome(room) { return room.querySelector('span').textContent; }

  /* ------------------------------------------------------------
     WEBGL — o raio de cada pixel é girado pela câmera e convertido
     em longitude/latitude, que são as coordenadas do panorama.
     ------------------------------------------------------------ */
  var VERT = 'attribute vec2 a;varying vec2 uv;void main(){uv=a;gl_Position=vec4(a,0.,1.);}';

  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'varying vec2 uv;',
    'uniform sampler2D pano;',
    'uniform mat3 view;',
    'uniform vec2 lens;',   /* (proporção, 1) * tan(fov / 2) */
    'uniform vec2 size;',   /* panorama, em texels */
    /* Catmull-Rom em 9 amostras bilineares: amplia com menos borrão e
       sem o serrilhado em losango do bilinear puro */
    '#ifdef BICUBIC',
    'vec3 amostra(vec2 t){',
    '  vec2 p=t*size,c=floor(p-.5)+.5,f=p-c;',
    '  vec2 w0=f*(-.5+f*(1.-.5*f));',
    '  vec2 w1=1.+f*f*(-2.5+1.5*f);',
    '  vec2 w2=f*(.5+f*(2.-1.5*f));',
    '  vec2 w3=f*f*(-.5+.5*f);',
    '  vec2 w12=w1+w2;',
    '  vec2 t0=(c-1.)/size,t3=(c+2.)/size,t12=(c+w2/w12)/size;',
    '  vec3 s=',
    '    texture2D(pano,vec2(t0.x,t0.y)).rgb*w0.x*w0.y+',
    '    texture2D(pano,vec2(t12.x,t0.y)).rgb*w12.x*w0.y+',
    '    texture2D(pano,vec2(t3.x,t0.y)).rgb*w3.x*w0.y+',
    '    texture2D(pano,vec2(t0.x,t12.y)).rgb*w0.x*w12.y+',
    '    texture2D(pano,vec2(t12.x,t12.y)).rgb*w12.x*w12.y+',
    '    texture2D(pano,vec2(t3.x,t12.y)).rgb*w3.x*w12.y+',
    '    texture2D(pano,vec2(t0.x,t3.y)).rgb*w0.x*w3.y+',
    '    texture2D(pano,vec2(t12.x,t3.y)).rgb*w12.x*w3.y+',
    '    texture2D(pano,vec2(t3.x,t3.y)).rgb*w3.x*w3.y;',
    '  return clamp(s,0.,1.);',
    '}',
    '#else',
    'vec3 amostra(vec2 t){return texture2D(pano,t).rgb;}',
    '#endif',
    'void main(){',
    '  vec3 d=view*normalize(vec3(uv*lens,-1.));',
    '  vec2 t=vec2(.5+atan(d.x,-d.z)/6.28318530718,acos(clamp(d.y,-1.,1.))/3.14159265359);',
    '  gl_FragColor=vec4(amostra(t),1.);',
    '}'
  ].join('\n');

  var gl = null, gl2 = false, uniforms = null, texture = null;
  var imagem = null;      /* a cena na GPU — reenviada se o contexto voltar */
  var perdido = false;

  function compila(tipo, fonte) {
    var s = gl.createShader(tipo);
    gl.shaderSource(s, fonte);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  /* monta programa, quad e textura; roda no início e a cada contexto restaurado */
  function monta() {
    /* sem highp no fragment shader a conta do bicúbico (t * 2048) não
       cabe na mantissa: nesses aparelhos fica o bilinear da GPU */
    var alta = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    var program = gl.createProgram();
    gl.attachShader(program, compila(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compila(gl.FRAGMENT_SHADER,
      (alta && alta.precision > 0 ? '#define BICUBIC\n' : '') + FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);

    var a = gl.getAttribLocation(program, 'a');
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);

    uniforms = {
      view: gl.getUniformLocation(program, 'view'),
      lens: gl.getUniformLocation(program, 'lens'),
      size: gl.getUniformLocation(program, 'size')
    };

    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  function potencia2(n) { return (n & (n - 1)) === 0; }

  function envia(img) {
    var w = img.naturalWidth, h = img.naturalHeight;
    imagem = img;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    /* a emenda do panorama fecha por REPEAT — que o WebGL 1 só aceita
       em textura potência de 2 (2048 e 4096 são) */
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,
      gl2 || (potencia2(w) && potencia2(h)) ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.uniform2f(uniforms.size, w, h);
  }

  function desenha() {
    if (!gl || perdido || !imagem) return;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    var pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
      gl.viewport(0, 0, pw, ph);
    }
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var abertura = Math.tan(fov / 2);
    /* Ry(yaw) * Rx(pitch), por colunas */
    gl.uniformMatrix3fv(uniforms.view, false, [
      cy, 0, -sy,
      sy * sp, cp, cy * sp,
      sy * cp, -sp, cy * cp
    ]);
    gl.uniform2f(uniforms.lens, w / h * abertura, abertura);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /* ------------------------------------------------------------
     QUADROS SOB DEMANDA — o rAF só existe enquanto há inércia,
     zoom em curso ou um gesto; parado e fora da tela, custo zero.
     ------------------------------------------------------------ */
  var raf = 0, anterior = 0, naTela = false;

  function avanca(dt) {
    var f = dt / (1000 / 60), vivo = false;
    if (solto) {
      yaw += vYaw * dt;
      pitch = clamp(pitch + vPitch * dt, -PITCH_MAX, PITCH_MAX);
      vYaw *= Math.pow(FRICTION, f);
      vPitch *= Math.pow(FRICTION, f);
      if (Math.abs(vYaw) + Math.abs(vPitch) < 0.00002) solto = false;
      else vivo = true;
    }
    if (fov !== fovTarget) {
      fov += (fovTarget - fov) * (1 - Math.pow(1 - ZOOM_EASE, f));
      if (Math.abs(fovTarget - fov) < 0.0005) fov = fovTarget;
      else vivo = true;
    }
    return vivo;
  }

  function quadro(agora) {
    raf = 0;
    var vivo = avanca(anterior ? Math.min(64, agora - anterior) : 0);
    desenha();
    anterior = vivo ? agora : 0;
    if (vivo) pede();
  }

  function pede() {
    if (!raf && gl && naTela) raf = window.requestAnimationFrame(quadro);
  }

  function gira(dYaw, dPitch) {
    yaw += dYaw;
    pitch = clamp(pitch + dPitch, -PITCH_MAX, PITCH_MAX);
    pede();
  }

  function aproxima(delta, direto) {
    fovTarget = clamp(fovTarget + delta, FOV_MIN, FOV_MAX);
    if (direto || mqReduce.matches) fov = fovTarget;
    pede();
  }

  /* ------------------------------------------------------------
     CENAS
     ------------------------------------------------------------ */
  var atual = 0, senha = 0;
  var avif = true;   /* no primeiro erro cai para o JPEG e não tenta de novo */

  function carrega(room) {
    var reserva = room.getAttribute('data-pano-fallback');
    var url = (avif && room.getAttribute('data-pano')) || reserva;
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { resolve(img); };
      img.onerror = function () {
        if (url === reserva) { reject(new Error('panorama indisponível: ' + url)); return; }
        avif = false;
        carrega(room).then(resolve, reject);
      };
      img.src = url;
    });
  }

  function espera(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
  }

  function falha() {
    stage.classList.remove('is-loading');
    if (errorEl) errorEl.hidden = false;
  }

  /* sai a cena atual em fade, entra a nova já com a câmera no ponto de partida */
  function mostra(room) {
    var minha = ++senha;
    var fade = imagem && !mqReduce.matches ? FADE : 0;
    stage.classList.add('is-loading');
    stage.classList.remove('is-live');
    if (errorEl) errorEl.hidden = true;
    Promise.all([carrega(room), espera(fade)]).then(function (r) {
      if (minha !== senha || !gl || perdido) return;
      envia(r[0]);
      yaw = pitch = 0;
      solto = false;
      fov = fovTarget = FOV_START;
      desenha();
      stage.classList.remove('is-loading');
      stage.classList.add('is-live');
    }).catch(function () {
      if (minha === senha) falha();
    });
  }

  /* sem WebGL: o panorama plano da cena, como o fallback do original */
  function plano(room) {
    if (!poster) return;
    var fonte = poster.parentNode.querySelector('source');
    if (fonte) fonte.srcset = room.getAttribute('data-pano');
    poster.src = room.getAttribute('data-pano-fallback');
    poster.alt = room.getAttribute('data-alt') || '';
  }

  function escolhe(i) {
    if (i === atual && (imagem || !gl)) return;
    atual = i;
    rooms.forEach(function (room, j) {
      if (j === i) room.setAttribute('aria-current', 'true');
      else room.removeAttribute('aria-current');
    });
    if (titleEl) titleEl.textContent = nome(rooms[i]);
    if (countEl) countEl.textContent = pad(i + 1) + ' / ' + pad(rooms.length);
    if (gl) mostra(rooms[i]);
    else plano(rooms[i]);
  }

  rooms.forEach(function (room, i) {
    if (room.getAttribute('aria-current') === 'true') atual = i;
    room.addEventListener('click', function () { escolhe(i); });
    /* o ponteiro chegou no thumb: a cena já vem vindo */
    room.addEventListener('pointerenter', function () {
      if (gl && i !== atual) carrega(room).catch(function () {});
    });
  });
  if (countEl) countEl.textContent = pad(atual + 1) + ' / ' + pad(rooms.length);

  /* ------------------------------------------------------------
     GESTOS — um ponteiro gira, dois dão pinça. O arrasto anda 1:1
     com o dedo: o ângulo por pixel sai da abertura atual, então a
     imagem não "foge" quando o zoom está fechado.
     ------------------------------------------------------------ */
  var ponteiros = {}, pinca = 0, ultimoGesto = 0;

  function ativos() { return Object.keys(ponteiros); }

  function distancia() {
    var ids = ativos();
    var a = ponteiros[ids[0]], b = ponteiros[ids[1]];
    return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    ponteiros[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ponteiro já solto */ }
    solto = false;
    vYaw = vPitch = 0;
    pinca = ativos().length === 2 ? distancia() : 0;
    ultimoGesto = e.timeStamp;
    stage.classList.add('is-touched');
  });

  canvas.addEventListener('pointermove', function (e) {
    var p = ponteiros[e.pointerId];
    if (!p) return;
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;

    var n = ativos().length;
    if (n === 2) {
      var d = distancia();
      if (pinca && d) aproxima(fovTarget * pinca / d - fovTarget, true);
      pinca = d;
      return;
    }
    if (n !== 1) return;
    /* em fluxo o dedo na vertical é da página (touch-action:pan-y): os
       poucos pixels que chegam antes de o navegador assumir a rolagem
       não podem inclinar a câmera a cada passada pela seção */
    if (!expandido && e.pointerType === 'touch') dy = 0;

    var k = 2 * Math.tan(fov / 2) / canvas.clientHeight;
    var dt = Math.max(1, e.timeStamp - ultimoGesto);
    ultimoGesto = e.timeStamp;
    /* velocidade suavizada: um único evento brusco não dispara a inércia */
    vYaw = vYaw * 0.6 + (dx * k / dt) * 0.4;
    vPitch = vPitch * 0.6 + (dy * k / dt) * 0.4;
    gira(dx * k, dy * k);
  });

  function solta(e) {
    if (!ponteiros[e.pointerId]) return;
    delete ponteiros[e.pointerId];
    pinca = 0;
    if (ativos().length) { vYaw = vPitch = 0; return; }
    /* sem inércia: gesto tomado pelo navegador (a página rolou), parada
       antes de soltar ou reduced-motion */
    solto = e.type === 'pointerup' && !mqReduce.matches && e.timeStamp - ultimoGesto <= 80;
    pede();
  }
  canvas.addEventListener('pointerup', solta);
  canvas.addEventListener('pointercancel', solta);

  var expandido = false;

  /* em fluxo a roda é da página. Dão zoom: a tela cheia e a pinça de
     trackpad, que chega como roda + ctrlKey */
  canvas.addEventListener('wheel', function (e) {
    if (!expandido && !e.ctrlKey) return;
    e.preventDefault();
    aproxima(e.ctrlKey ? e.deltaY * 0.01 : (e.deltaY > 0 ? WHEEL_STEP : -WHEEL_STEP));
  }, { passive: false });

  canvas.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowLeft') gira(KEY_STEP, 0);
    else if (k === 'ArrowRight') gira(-KEY_STEP, 0);
    else if (k === 'ArrowUp') gira(0, KEY_STEP);
    else if (k === 'ArrowDown') gira(0, -KEY_STEP);
    else if (k === '+' || k === '=') aproxima(-ZOOM_STEP);
    else if (k === '-' || k === '_') aproxima(ZOOM_STEP);
    else return;
    e.preventDefault();
  });

  Array.prototype.forEach.call(stage.querySelectorAll('[data-tour-zoom]'), function (btn) {
    var delta = btn.getAttribute('data-tour-zoom') === 'in' ? -ZOOM_STEP : ZOOM_STEP;
    btn.addEventListener('click', function () { aproxima(delta); });
  });

  /* ------------------------------------------------------------
     TELA CHEIA — Fullscreen API onde existe para elementos; no
     iPhone a classe .is-expanded fixa o palco sobre a página.
     ------------------------------------------------------------ */
  var nativa = !!(stage.requestFullscreen && document.fullscreenEnabled);

  function expande(sim) {
    if (sim === expandido) return;
    expandido = sim;
    stage.classList.toggle('is-expanded', sim);
    if (fullBtn) fullBtn.setAttribute('aria-label', sim ? 'Sair da tela cheia' : 'Tela cheia');
    var lenis = window.CINNAMON && window.CINNAMON.lenis;
    if (sim) {
      if (lenis) lenis.stop();
      document.documentElement.style.overflow = 'hidden';
    } else {
      if (lenis) lenis.start();
      document.documentElement.style.removeProperty('overflow');
      /* o "Fechar" some com a barra: o foco volta para quem abre */
      if (fullBtn && stage.contains(document.activeElement)) fullBtn.focus();
    }
    pede();
  }

  function alterna() {
    if (expandido) {
      if (document.fullscreenElement === stage) document.exitFullscreen();
      else expande(false);
    } else if (nativa) {
      stage.requestFullscreen().catch(function () { expande(true); });
    } else {
      expande(true);
    }
  }

  document.addEventListener('fullscreenchange', function () {
    expande(document.fullscreenElement === stage);
  });
  if (fullBtn) fullBtn.addEventListener('click', alterna);
  var closeBtn = q('[data-tour-close]');
  if (closeBtn) closeBtn.addEventListener('click', alterna);

  function focaveis() {
    return Array.prototype.slice.call(stage.querySelectorAll('button, canvas'))
      .filter(function (el) { return el.offsetParent !== null; });
  }

  document.addEventListener('keydown', function (e) {
    if (!expandido) return;
    if (e.key === 'Escape') { alterna(); return; }
    /* foco preso no palco enquanto ele cobre a página */
    if (e.key !== 'Tab') return;
    var alvos = focaveis();
    if (!alvos.length) return;
    var primeiro = alvos[0], ultimo = alvos[alvos.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  });

  /* ------------------------------------------------------------
     PARTIDA — o contexto WebGL e o primeiro panorama só nascem
     quando a seção está a uma tela de distância.
     ------------------------------------------------------------ */
  var partiu = false;

  function parte() {
    if (partiu) return;
    partiu = true;
    try {
      var opcoes = { alpha: false, antialias: false, powerPreference: 'high-performance' };
      gl = canvas.getContext('webgl2', opcoes);
      gl2 = !!gl;
      if (!gl) gl = canvas.getContext('webgl', opcoes);
      if (!gl) return;   /* fica o panorama plano */
      monta();
    } catch (err) {
      gl = null;
      falha();
      return;
    }
    stage.classList.add('is-webgl');
    mostra(rooms[atual]);
  }

  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    perdido = true;
    if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
  });
  canvas.addEventListener('webglcontextrestored', function () {
    perdido = false;
    try {
      monta();
      if (imagem) envia(imagem);
      pede();
    } catch (err) {
      falha();
    }
  });

  stage.classList.add('is-ready');

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entradas) {
      naTela = entradas[0].isIntersecting;
      if (!naTela) return;
      parte();
      pede();
    }, { rootMargin: '100% 0px' }).observe(stage);
  } else {
    naTela = true;
    parte();
  }

  if ('ResizeObserver' in window) new ResizeObserver(pede).observe(stage);
  else window.addEventListener('resize', pede);
  /* ao voltar para a aba o navegador pode ter descartado o quadro */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) pede();
  });
})();
