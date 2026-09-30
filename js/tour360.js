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
     com o JPEG original de reserva), decodificados fora da thread
     principal;
   - nada é baixado antes de a seção se aproximar da tela, e só se
     desenha quando algo muda (o original redesenhava 60x por s);
   - DOIS níveis de qualidade. Em movimento: um toque de textura
     por pixel e buffer enxuto, para o arrasto não engasgar nem em
     GPU integrada. Parado: bicúbico + nitidez na resolução cheia
     da tela — o panorama é ampliado de 4 a 10 vezes, e é parado
     que o olho cobra detalhe;
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
  var FRICTION = 0.92;   /* fração da velocidade que sobra a cada 1/60 s */
  var ZOOM_EASE = 0.2;
  var FADE = 450;        /* ms — igual à transição de opacity do canvas */

  /* orçamento de cada nível: teto de densidade e de pixels do buffer */
  var MOVENDO = { dpr: 2, pixels: 1.8e6 };
  var PARADO  = { dpr: 3, pixels: 6e6 };
  var REPOUSO = 180;     /* ms sem mudança até o quadro fino */
  var NITIDEZ = 1.2;     /* força da máscara de nitidez do quadro fino */

  var yaw = 0, pitch = 0, fov = FOV_START, fovTarget = FOV_START;
  var vYaw = 0, vPitch = 0;   /* rad/ms — velocidade do gesto */
  var solto = false;          /* só vira inércia depois que o ponteiro solta */

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function nome(room) { return room.querySelector('span').textContent; }
  function nada() {}

  /* ------------------------------------------------------------
     WEBGL — o raio de cada pixel é girado pela câmera e convertido
     em longitude/latitude, que são as coordenadas do panorama.
     ------------------------------------------------------------ */
  var VERT = 'attribute vec2 a;varying vec2 uv;void main(){uv=a;gl_Position=vec4(a,0.,1.);}';

  var CABECALHO = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'varying vec2 uv;',
    'uniform sampler2D pano;',
    'uniform mat3 view;',
    'uniform vec2 lens;',   /* (proporção, 1) * tan(fov / 2) */
    'vec2 coord(){',
    '  vec3 d=view*normalize(vec3(uv*lens,-1.));',
    '  return vec2(.5+atan(d.x,-d.z)/6.28318530718,acos(clamp(d.y,-1.,1.))/3.14159265359);',
    '}'
  ];

  /* em movimento: o bilinear da própria GPU, um toque por pixel */
  var FRAG_RAPIDO = CABECALHO.concat([
    'void main(){gl_FragColor=vec4(texture2D(pano,coord()).rgb,1.);}'
  ]).join('\n');

  /* parado: Catmull-Rom em 9 amostras (amplia sem o serrilhado em losango
     do bilinear) + máscara de nitidez travada nos vizinhos — realça a borda
     e nunca passa do pixel mais claro ou mais escuro ao redor, então não
     cria halo nas linhas de luz */
  var FRAG_FINO = CABECALHO.concat([
    'uniform vec2 size;',      /* panorama, em texels */
    'uniform float nitidez;',
    'vec3 bicubico(vec2 t){',
    '  vec2 p=t*size,c=floor(p-.5)+.5,f=p-c;',
    '  vec2 w0=f*(-.5+f*(1.-.5*f));',
    '  vec2 w1=1.+f*f*(-2.5+1.5*f);',
    '  vec2 w2=f*(.5+f*(2.-1.5*f));',
    '  vec2 w3=f*f*(-.5+.5*f);',
    '  vec2 w12=w1+w2;',
    '  vec2 t0=(c-1.)/size,t3=(c+2.)/size,t12=(c+w2/w12)/size;',
    '  return',
    '    texture2D(pano,vec2(t0.x,t0.y)).rgb*w0.x*w0.y+',
    '    texture2D(pano,vec2(t12.x,t0.y)).rgb*w12.x*w0.y+',
    '    texture2D(pano,vec2(t3.x,t0.y)).rgb*w3.x*w0.y+',
    '    texture2D(pano,vec2(t0.x,t12.y)).rgb*w0.x*w12.y+',
    '    texture2D(pano,vec2(t12.x,t12.y)).rgb*w12.x*w12.y+',
    '    texture2D(pano,vec2(t3.x,t12.y)).rgb*w3.x*w12.y+',
    '    texture2D(pano,vec2(t0.x,t3.y)).rgb*w0.x*w3.y+',
    '    texture2D(pano,vec2(t12.x,t3.y)).rgb*w12.x*w3.y+',
    '    texture2D(pano,vec2(t3.x,t3.y)).rgb*w3.x*w3.y;',
    '}',
    'void main(){',
    '  vec2 t=coord(),o=.75/size;',
    '  vec3 c=clamp(bicubico(t),0.,1.);',
    '  vec3 a=texture2D(pano,t+vec2(-o.x,-o.y)).rgb;',
    '  vec3 b=texture2D(pano,t+vec2(o.x,-o.y)).rgb;',
    '  vec3 d=texture2D(pano,t+vec2(-o.x,o.y)).rgb;',
    '  vec3 e=texture2D(pano,t+vec2(o.x,o.y)).rgb;',
    '  vec3 lo=min(c,min(min(a,b),min(d,e)));',
    '  vec3 hi=max(c,max(max(a,b),max(d,e)));',
    '  gl_FragColor=vec4(clamp(c+(c-(a+b+d+e)*.25)*nitidez,lo,hi),1.);',
    '}'
  ]).join('\n');

  var gl = null, gl2 = false, texture = null;
  var rapido = null, fino = null;   /* programas: { id, view, lens, size, nitidez } */
  var tamanho = [0, 0];             /* panorama na GPU, em texels */
  var temCena = false;
  var perdido = false;

  function compila(tipo, fonte) {
    var s = gl.createShader(tipo);
    gl.shaderSource(s, fonte);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function programa(frag) {
    var id = gl.createProgram();
    gl.attachShader(id, compila(gl.VERTEX_SHADER, VERT));
    gl.attachShader(id, compila(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(id, 0, 'a');   /* o mesmo quad serve aos dois programas */
    gl.linkProgram(id);
    if (!gl.getProgramParameter(id, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(id));
    return {
      id: id,
      view: gl.getUniformLocation(id, 'view'),
      lens: gl.getUniformLocation(id, 'lens'),
      size: gl.getUniformLocation(id, 'size'),
      nitidez: gl.getUniformLocation(id, 'nitidez')
    };
  }

  /* o mínimo para pôr imagem na tela: quad, textura e o programa leve.
     Roda no início e a cada contexto restaurado. */
  function monta() {
    fino = null;
    rapido = programa(FRAG_RAPIDO);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  /* o programa fino é o shader pesado de compilar: fica para um momento
     ocioso, em tarefa própria, e a cena já na tela ganha o acabamento
     assim que ele existe. Sem highp no fragment shader a conta do
     bicúbico (t * 2048) não cabe na mantissa — aí vale só o leve. */
  function montaFino() {
    if (!gl || perdido || fino) return;
    var alta = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (!alta || !alta.precision) return;
    try {
      fino = programa(FRAG_FINO);
      afina();
    } catch (err) {
      fino = null;
    }
  }

  function ocioso(fn) {
    if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 800 });
    else window.setTimeout(fn, 80);
  }

  function potencia2(n) { return (n & (n - 1)) === 0; }

  function envia(img) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    /* a emenda do panorama fecha por REPEAT — que o WebGL 1 só aceita
       em textura potência de 2 (2048 e 4096 são) */
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,
      gl2 || (potencia2(w) && potencia2(h)) ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    tamanho = [w, h];
    temCena = true;
    if (img.close) img.close();   /* ImageBitmap: a cópia da CPU já não serve */
  }

  function desenha(acabado) {
    if (!gl || perdido || !temCena) return;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;

    var p = acabado && fino ? fino : rapido;
    var nivel = acabado ? PARADO : MOVENDO;
    var escala = Math.min(window.devicePixelRatio || 1, nivel.dpr, Math.sqrt(nivel.pixels / (w * h)));
    var pw = Math.max(1, Math.round(w * escala)), ph = Math.max(1, Math.round(h * escala));
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
      gl.viewport(0, 0, pw, ph);
    }

    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var abertura = Math.tan(fov / 2);
    gl.useProgram(p.id);
    /* Ry(yaw) * Rx(pitch), por colunas */
    gl.uniformMatrix3fv(p.view, false, [
      cy, 0, -sy,
      sy * sp, cp, cy * sp,
      sy * cp, -sp, cy * cp
    ]);
    gl.uniform2f(p.lens, w / h * abertura, abertura);
    if (p === fino) {
      gl.uniform2f(p.size, tamanho[0], tamanho[1]);
      gl.uniform1f(p.nitidez, NITIDEZ);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /* ------------------------------------------------------------
     QUADROS SOB DEMANDA — o rAF só existe enquanto há inércia,
     zoom em curso ou um gesto; parado e fora da tela, custo zero.
     Toda mudança pede um quadro leve e rearma o relógio do quadro
     fino, que só sai depois de REPOUSO ms de sossego.
     ------------------------------------------------------------ */
  var raf = 0, anterior = 0, naTela = false;
  var acabado = false, relogio = 0;

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

  function agenda() {
    if (!raf && gl && naTela && !perdido) raf = window.requestAnimationFrame(quadro);
  }

  function quadro(agora) {
    raf = 0;
    var vivo = avanca(anterior ? Math.min(64, agora - anterior) : 0);
    desenha(acabado && !vivo);
    anterior = vivo ? agora : 0;
    if (vivo) pede();
  }

  function afina() {
    relogio = 0;
    acabado = true;
    agenda();
  }

  function pede() {
    acabado = false;
    if (relogio) window.clearTimeout(relogio);
    relogio = window.setTimeout(afina, REPOUSO);
    agenda();
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

  function endereco(room) {
    return (avif && room.getAttribute('data-pano')) || room.getAttribute('data-pano-fallback');
  }

  /* devolve o panorama JÁ decodificado. Subir para a GPU uma imagem crua
     decodifica na hora, na thread principal — era um engasgo de 200 ms no
     scroll ao chegar perto da seção. */
  function baixa(url) {
    if (window.createImageBitmap && window.fetch) {
      return window.fetch(url).then(function (r) {
        if (!r.ok) throw new Error(r.status + ' ' + url);
        return r.blob();
      }).then(function (blob) { return window.createImageBitmap(blob); });
    }
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        if (img.decode) img.decode().then(function () { resolve(img); }, function () { resolve(img); });
        else resolve(img);
      };
      img.onerror = function () { reject(new Error(url)); };
      img.src = url;
    });
  }

  function carrega(room) {
    var url = endereco(room);
    return baixa(url).catch(function (erro) {
      if (url === room.getAttribute('data-pano-fallback')) throw erro;
      avif = false;
      return carrega(room);
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
    var fade = temCena && !mqReduce.matches ? FADE : 0;
    stage.classList.add('is-loading');
    stage.classList.remove('is-live');
    if (errorEl) errorEl.hidden = true;
    Promise.all([carrega(room), espera(fade)]).then(function (r) {
      if (minha !== senha || !gl || perdido) { if (r[0].close) r[0].close(); return; }
      envia(r[0]);
      yaw = pitch = 0;
      solto = false;
      fov = fovTarget = FOV_START;
      acabado = true;
      desenha(true);
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
    if (i === atual && (temCena || !gl)) return;
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
    room.addEventListener('click', function () { tocou(); escolhe(i); });
    /* o ponteiro chegou no thumb: o arquivo já vem vindo para o cache */
    room.addEventListener('pointerenter', function () {
      if (gl && i !== atual && window.fetch) window.fetch(endereco(room)).catch(nada);
    });
  });
  if (countEl) countEl.textContent = pad(atual + 1) + ' / ' + pad(rooms.length);

  /* ------------------------------------------------------------
     PRIMEIRO GESTO — o indicador de arraste no centro do palco e a
     dica do canto existem para ensinar o gesto. Feito o primeiro,
     saem de cena e não voltam mais nesta sessão.
     Encostar o dedo não conta: no celular quem rola a página passa
     o dedo por cima do palco, e o indicador sumiria antes de ensinar
     qualquer coisa. Conta girar de fato, dar zoom, trocar de cena.
     ------------------------------------------------------------ */
  var CHAVE = 'cinnamon-tour-gesto';

  function tocou() {
    if (stage.classList.contains('is-touched')) return;
    stage.classList.add('is-touched');
    try { window.sessionStorage.setItem(CHAVE, '1'); } catch (err) { /* modo privado */ }
  }
  try {
    if (window.sessionStorage.getItem(CHAVE)) stage.classList.add('is-touched');
  } catch (err) { /* modo privado */ }

  /* ------------------------------------------------------------
     GESTOS — um ponteiro gira, dois dão pinça. O arrasto anda 1:1
     com o dedo: o ângulo por pixel sai da abertura atual, então a
     imagem não "foge" quando o zoom está fechado.
     ------------------------------------------------------------ */
  var ponteiros = {}, pinca = 0, ultimoGesto = 0;
  var percorrido = 0;   /* px girados no gesto em curso */

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
    percorrido = 0;
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
      if (pinca && d) { aproxima(fovTarget * pinca / d - fovTarget, true); tocou(); }
      pinca = d;
      return;
    }
    if (n !== 1) return;
    /* em fluxo o dedo na vertical é da página (touch-action:pan-y): os
       poucos pixels que chegam antes de o navegador assumir a rolagem
       não podem inclinar a câmera a cada passada pela seção */
    if (!expandido && e.pointerType === 'touch') dy = 0;

    percorrido += Math.abs(dx) + Math.abs(dy);
    if (percorrido > 12) tocou();

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
    tocou();
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
    tocou();
  });

  Array.prototype.forEach.call(stage.querySelectorAll('[data-tour-zoom]'), function (btn) {
    var delta = btn.getAttribute('data-tour-zoom') === 'in' ? -ZOOM_STEP : ZOOM_STEP;
    btn.addEventListener('click', function () { tocou(); aproxima(delta); });
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
     ATALHOS — todo link para #tour (o "360°" do cabeçalho, o do
     rodapé) leva o scroll ao PALCO, não ao topo da seção: o palco
     para inteiro na tela, com o centro dele no centro da área livre
     abaixo do header e sem o título por cima. Palco maior que a área
     livre (janela muito baixa): o topo dele encosta no header.
     O destino é um número, não um elemento: o Lenis desconta o
     scroll-margin de quem recebe um elemento, e aqui a conta é exata.
     Sem JS vale a âncora comum.
     ------------------------------------------------------------ */
  function posicaoDoPalco() {
    var barra = document.querySelector('.site-header');
    var topo = barra ? barra.getBoundingClientRect().bottom : 0;
    var doc = document.documentElement;
    var folga = Math.max(0, (doc.clientHeight - topo - stage.offsetHeight) / 2);
    var y = window.pageYOffset + stage.getBoundingClientRect().top - topo - folga;
    return Math.round(clamp(y, 0, doc.scrollHeight - doc.clientHeight));
  }

  function vaiAoPalco(e) {
    e.preventDefault();
    e.stopPropagation();   /* o lenis-setup.js trataria como âncora comum */
    parte();               /* o panorama começa a baixar durante a viagem */
    var lenis = window.CINNAMON && window.CINNAMON.lenis;
    if (lenis) {
      lenis.scrollTo(posicaoDoPalco(), {
        /* a página pode ter mudado de altura no caminho (pin, fonte):
           confere uma vez na chegada e corrige o que sobrou */
        onComplete: function () {
          var y = posicaoDoPalco();
          if (Math.abs(y - window.pageYOffset) > 1) lenis.scrollTo(y, { immediate: true, force: true });
        }
      });
    } else {
      window.scrollTo({ top: posicaoDoPalco(), behavior: mqReduce.matches ? 'auto' : 'smooth' });
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll('a[href="#tour"]'), function (link) {
    link.addEventListener('click', vaiAoPalco);
  });

  /* ------------------------------------------------------------
     PARTIDA — o contexto WebGL e o primeiro panorama só nascem
     quando a seção está a uma tela de distância. O trabalho vai em
     fatias (contexto + shader leve, depois o panorama já decodificado,
     depois o shader fino) para nenhuma delas segurar o scroll.
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
    ocioso(montaFino);
  }

  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    perdido = true;
    temCena = false;
    if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
  });
  canvas.addEventListener('webglcontextrestored', function () {
    perdido = false;
    try {
      monta();
      mostra(rooms[atual]);
      ocioso(montaFino);
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
