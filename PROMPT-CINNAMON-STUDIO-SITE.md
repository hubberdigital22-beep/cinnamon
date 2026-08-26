# MASTER PROMPT — SITE IMERSIVO CINNAMON STUDIO
### Condotel · Orla de Palmas – TO · Experiência scroll-driven nível Awwwards

> **Como usar:** abra o Claude Code na pasta do projeto (com `Assets/` acessível) e cole este documento inteiro como primeira mensagem. Ele é auto-suficiente: contém missão, regras de marca, stack, design system, estrutura seção a seção, catálogo de efeitos, ordem de execução e checklist de aceite. Os apêndices trazem o mapeamento técnico da referência, prompts para gerar os assets que faltam e a lista de dados a confirmar.

---

## 1. MISSÃO

Você é um **creative developer premiado**, com domínio de GSAP/ScrollTrigger, direção de arte arquitetônica e engenharia front-end de alta performance.

Construa a experiência digital do **CINNAMON STUDIO** — um condotel (condomínio-hotel) de alto padrão na Orla de Palmas – TO, com studios inteligentes de **29,92 m²**.

**Isto NÃO é um site de imobiliária. Não é um folder digital. Não é um template.**
É uma **exposição arquitetônica interativa**: o visitante não navega, ele *chega* ao empreendimento. A cada rolagem, uma camada do projeto se revela — o céu de Palmas, a torre, o studio, o detalhe, o potencial.

Referências de linguagem: Apple Keynote · Aman Resorts · Foster + Partners · velaarmon.com (mapeado no Apêndice A).
Princípio central: **narrativa acima de informação**. Cada animação tem propósito. Cada transição é cinematográfica. Luxo se comunica por **contenção**, não por excesso.

Idioma do site: **português (pt-BR)**.

---

## 2. REGRAS INEGOCIÁVEIS DE MARCA

Extraídas do folder oficial da marca (`Assets/GABARITO-FOLDER-...pdf`). **Nada fora disto.**

### 2.1 Paleta — travada
```css
:root{
  --dark:     #22231f;            /* fundo dominante — quase-preto esverdeado da marca */
  --dark-2:   #171816;            /* profundidade / contraste de blocos */
  --dark-3:   #2c2d28;            /* superfícies elevadas, cards */
  --cream:    #f3eee5;            /* texto sobre dark */
  --cream-2:  #f0eadc;            /* fundo do bloco claro (papel do folder) */
  --tan:      #b7a48e;            /* acento: hairlines, eyebrows, números, CTA */
  --tan-soft: rgba(183,164,142,.28);
  --cream-60: rgba(243,238,229,.62);
  --cream-40: rgba(243,238,229,.40);
}
```
- Site **dominantemente escuro**. Texto creme. Acentos tan.
- **Exatamente um** bloco claro (`--cream-2`, texto `--dark`) no meio da página, como respiro editorial — espelha o miolo do folder.
- Proibido: azul, verde, gradientes coloridos, dourado metálico brilhante, sombras coloridas. As fotos trazem a cor.
- **Ignore a paleta branca/dourada de qualquer referência externa.** A referência serve para *movimento e layout*, não para cor.

### 2.2 Tipografia — travada
- **Montserrat** (Google Fonts) e nada mais. Pesos: 200, 300, 400, 500, 600.
- **Wordmark** "CINNAMON": Montserrat **200/300 caps**, `letter-spacing: .28em`. Abaixo, alinhado à direita, "STUDIO": 300 caps, tamanho ~28% do principal, `letter-spacing: .5em`. Reproduzir sempre assim — o logo do folder é fino e espaçado, nunca bold.
- **Display / títulos de capítulo**: Montserrat 300 (fino!) caps ou sentence-case, `clamp(2.6rem, 8vw, 8rem)`, `line-height: .98`, `letter-spacing: -.005em`. O peso fino em tamanho gigante é a assinatura da marca.
- **Eyebrow / micro-label**: Montserrat 500 caps, `font-size: .68rem`, `letter-spacing: .28em`, cor `--tan`.
- **Números** (m², stats): Montserrat 200, tamanho gigante, `letter-spacing: -.02em`.
- **Corpo**: Montserrat 300, `1.02–1.12rem`, `line-height: 1.75`, cor `--cream-60`.

### 2.3 Motivo gráfico
O folder usa um **grande arco/círculo** atrás da torre. Reproduza esse motivo: um círculo hairline `--tan-soft` de 60–90vw, cortado pela borda, girando lentamente ou revelado por `stroke-dashoffset` em 2 momentos da página (hero e finale). Sutil, nunca decorativo demais.

### 2.4 Copy oficial (usar literalmente)
- Slogan: **"SEU ESPAÇO. SEU RITMO."**
- Assinatura: "Studios inteligentes para quem vive em movimento."
- Selo: "STUDIOS DE 29,92 M² | PALMAS – TO"
- "29,92 M²" · "Sacada com 7,48 m²" · "Studio com 22,44 m²"
- "INTELIGÊNCIA ESPACIAL" · "AMBIENTES INTEGRADOS" · "CONFORTO E PRATICIDADE" · "USO INTELIGENTE DO ESPAÇO"
- "ARQUITETURA CONTEMPORÂNEA" — "Linhas que equilibram solidez e leveza."
- "PLANTA INTELIGENTE" — "Um espaço planejado para render mais em cada metro."
- "CONFORTO E PRATICIDADE" — "Cada ambiente pensado para simplificar sua rotina."

Tom: contido, curto, sem exclamação, sem jargão de corretor, sem promessa de rentabilidade numérica.

---

## 3. STACK

**Site estático, zero build, zero dependência quebrável** — a escolha é deliberada para não travar o desenvolvimento:

```
index.html
/css/style.css
/js/lenis-setup.js  /js/hero.js  /js/sections.js  /js/ui.js
/img/…            (assets processados)
```

- **GSAP 3 + ScrollTrigger** via CDN (`cdn.jsdelivr.net/npm/gsap@3/...`).
- **Lenis** via CDN — smooth scroll inercial, sincronizado com ScrollTrigger (`lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker.add`).
- Split-text **implementado à mão** (wrap de palavras/linhas em `<span>` com `overflow:hidden`) — não usar plugins pagos do GSAP (SplitText/ScrollSmoother são licenciados).
- Fontes: Google Fonts com `preconnect` + `display=swap`.
- Roda com `python3 -m http.server` ou deploy direto na Vercel/Netlify como estático.

**Proibido:** Bootstrap, jQuery, bibliotecas de componentes, frameworks CSS, qualquer dependência além de GSAP + ScrollTrigger + Lenis.
*(Se o time exigir React depois, a migração é trivial — mantenha a lógica de animação isolada nos módulos JS.)*

---

## 4. DESIGN SYSTEM

**Grid:** 12 colunas, `max-width: 1440px`, gutter 24px, margens laterais `clamp(24px, 6vw, 120px)`.
**Ritmo vertical:** seções com `padding-block: clamp(120px, 22vh, 260px)`. Respiro generoso é obrigatório — o vazio é parte do luxo.
**Hairlines:** `1px solid var(--tan-soft)` — usadas como divisores editoriais, sempre animadas com `scaleX: 0 → 1`, origem à esquerda.
**Raio de borda:** 0 (tudo reto) — exceto avatares/círculos. Arquitetura contemporânea é ortogonal.
**Tokens de movimento:**
```
--ease-out: cubic-bezier(.16,1,.3,1)   /* expo.out */
--dur-fast: .6s   --dur: .9s   --dur-slow: 1.4s
stagger padrão: .06s
```

**Cursor customizado (desktop ≥1024px):** ponto de 6px `--tan` + anel de 32px `1px solid var(--tan-soft)` com interpolação lerp (~0.12). Anel expande para 60px e o ponto some sobre links/CTAs/imagens. `mix-blend-mode: difference` opcional sobre imagens claras. Ocultar totalmente em touch.

**Navegação:** sem navbar pesada.
- Topo: apenas o wordmark pequeno à esquerda (fixo, fade-in após o hero) e, à direita, o CTA "Falar com um consultor" em micro-label com hairline embaixo.
- **Rail de progresso** fixo à direita (desktop): linha vertical hairline de ~40vh, nó `--tan` que desce conforme o scroll e label do capítulo atual em micro-label vertical/horizontal ("I · O CÉU", "II · A TORRE"…). Copiado da referência.
- Navegação real = âncoras no footer. O scroll é a navegação.
- Mobile: sem rail, sem cursor; wordmark + botão WhatsApp flutuante discreto no rodapé da viewport.

**Grain global:** overlay `position:fixed; inset:0; pointer-events:none;` com SVG `feTurbulence` em data-URI, `opacity: .045`, `mix-blend-mode: overlay`. Sempre presente — é o que dá textura de filme.

---

## 5. ASSETS — PIPELINE OBRIGATÓRIO (primeiro passo do build)

Fonte: `Assets/`. **Nunca referencie caminhos com espaço ou acento.** Copie e renomeie para `/img/`:

| Origem | Destino | Uso |
|---|---|---|
| `WhatsApp Unknown ... 15.33.17/...12.18.08.jpeg` | `torre-angulo-01.webp` | Hero cena II · Arquitetura |
| `WhatsApp Unknown ... 15.33.17/...12.18.10 (2).jpeg` | `torre-frontal.webp` | Seção arquitetura / localização |
| demais 6 arquivos da pasta `15.33.17` | `torre-02…07.webp` | galeria externa / parallax |
| `RENDER-studio/STUDIO 01.png` | `studio-01.webp` | Hero cena III · O Studio |
| `RENDER-studio/STUDIO 02.png` | `studio-02.webp` | galeria |
| `RENDER-studio/studio 3a.png` | `studio-03.webp` | galeria |
| `RENDER-studio/STUDIO 04/05/06.png` | `studio-04…06.webp` | galeria |
| `RENDER-studio/B1.png` | `banho-01.webp` | Hero cena IV · O Refúgio |
| `RENDER-studio/B2.png` | `banho-02.webp` | galeria |
| `PLANTA STUDIO/PLANTA STUDIO4k.png` | `planta.webp` (máx 2200px) | Seção Planta Inteligente |
| `PLANTA STUDIO/PLANTA STUDIO-inter.png` | `planta-alt.webp` | alternativa |

**Processamento (use `sips`/`cwebp`/`ffmpeg`/Pillow — o que estiver disponível):**
1. Exportar **WebP** em 2 larguras: `-1920` (q≈78) e `-960` (q≈72). Servir com `<img srcset>` + `sizes`.
2. Teto de peso: 400 KB por imagem (planta: até 800 KB).
3. Gerar uma versão **LQIP** (blur 20px, 24px de largura, base64 inline) para cada imagem do hero — evita flash branco.
4. Não usar o `.pdf`/`.ai` no site (só referência de marca). Não abrir os `.rar`.
5. **Não baixar imagens de bancos externos.** O que faltar, ou é gerado por CSS/canvas, ou é gerado com os prompts do Apêndice B.

**Cena I (o céu):** não existe foto aérea da orla. Construa em **CSS/canvas**: gradiente do `--dark` (topo) a tons quentes areia/tan no horizonte, com 2–3 camadas de "nuvens" em `radial-gradient` desfocado se movendo em velocidades diferentes (parallax) + grain. Zero imagem externa.

---

## 6. ESTRUTURA DA EXPERIÊNCIA

### 00 · PRELOADER
Fundo `--dark`. Wordmark CINNAMON STUDIO ao centro, desenhado com fade escalonado por letra.
Hairline `--tan` que cresce de 0 a 100% da largura de um bloco de 240px.
Contador em micro-label: **"COMPONDO A CHEGADA — 0%"** → 100%, sincronizado com o preload real das 4 cenas do hero.
Saída: `clip-path` vertical (inset 0 0 0 0 → 0 0 100% 0) em 1.2s `--ease-out`, revelando o hero já em movimento.
Nunca travar mais de 4s: se o preload demorar, libere mesmo assim.

### 01 · HERO — "A CHEGADA" (pinado, 400vh)
`ScrollTrigger` com `pin: true`, `scrub: 1`, `end: "+=400%"`.
Quatro cenas em **crossfade + Ken Burns** (scale 1.0 → 1.08, translateY ±3%) controladas por `scrub`. Nunca autoplay: a descida é do usuário.

| # | Cena | Imagem | Eyebrow | Título | Caption |
|---|---|---|---|---|---|
| I | O CÉU | céu CSS/canvas | — | **CINNAMON STUDIO** (wordmark) + "Seu espaço. Seu ritmo." | "Studios inteligentes para quem vive em movimento." + hint "ROLE" com linha animada |
| II | A TORRE | `torre-angulo-01` | I · A TORRE | **Arquitetura Contemporânea** | "Linhas que equilibram solidez e leveza, na Orla de Palmas." |
| III | O STUDIO | `studio-01` | II · O STUDIO | **Inteligência Espacial** | "29,92 m² planejados para render mais em cada metro." |
| IV | O REFÚGIO | `banho-01` | III · O REFÚGIO | **Conforto e Praticidade** | "Cada ambiente pensado para simplificar sua rotina." |

Cada card: eyebrow (fade+y), título com **masked word reveal** (palavras entram de baixo, `overflow:hidden`, stagger .06), hairline `scaleX`, caption (fade+y). Saída simétrica antes da próxima cena. Posição: canto inferior esquerdo, margem generosa — nunca centralizado sobre o ponto focal da imagem.
Scrim: gradiente `--dark` de baixo para cima (0 → 85%) garantindo legibilidade sempre.
O motivo círculo hairline aparece na cena I e some na II.
Ao final, a cena IV escurece para `--dark` e "pousa" na seção 02.
**Mobile:** hero reduzido a 220vh, mesmas cenas, sem parallax de camadas, títulos menores.

### 02 · O PROJETO — `[ 01 · O PROJETO ]`
Headline display: **"Um condotel para quem vive em movimento."**
Parágrafo curto (2–3 linhas) sobre o conceito: studio inteligente + operação hoteleira + endereço na orla. `<!-- AJUSTAR: texto institucional final -->`
Linha de **stats com count-up** (dispara ao entrar na viewport, 1.8s, easing out):
- **29,92** m² — STUDIO + SACADA
- **7,48** m² — SACADA
- **22,44** m² — STUDIO
- **PALMAS – TO** — ORLA (sem contador)
`<!-- AJUSTAR: nº de unidades, nº de pavimentos, prazo de entrega — inserir como 4º/5º stat quando confirmados -->`

### 03 · A TORRE — `[ 02 · ARQUITETURA ]`
Imagem fullbleed `torre-frontal` com **parallax** (a imagem se move ~12% mais devagar que o scroll, via `yPercent`).
Texto sobreposto à esquerda: eyebrow "ARQUITETURA CONTEMPORÂNEA", título display, caption oficial do folder.
Abaixo, faixa de 3 imagens externas menores em grid assimétrico (2/3 + 1/3 alternando), cada uma com **mask reveal** (clip-path de baixo para cima) + `scale 1.06 → 1`.

### 04 · PLANTA INTELIGENTE — `[ 03 · O STUDIO ]`
Layout 2 colunas (desktop): esquerda = texto, direita = planta.
- Número gigante **29,92 M²** em Montserrat 200 com count-up.
- Sub: "Sacada com 7,48 m² · Studio com 22,44 m²".
- Lista com hairlines animadas: AMBIENTES INTEGRADOS · CONFORTO E PRATICIDADE · USO INTELIGENTE DO ESPAÇO.
- Planta com reveal mascarado + leve zoom no hover; **hotspots opcionais**: pontos `--tan` pulsando sobre cozinha/sacada/banho que revelam micro-label ao hover. Se implementar, coordenadas em % (não pixels).
Legenda: "Imagem meramente ilustrativa."

### 05 · GALERIA IMERSIVA
**Scroll horizontal pinado** (desktop): 6–8 renders internos deslizam horizontalmente enquanto a seção fica pinada (`xPercent` mapeado ao scroll vertical). Cada imagem tem legenda micro-label ("COZINHA INTEGRADA", "ESTAR E DORMIR", "HOME OFFICE", "BANHEIRO", "SACADA").
Hover: `scale 1.04` + legenda sobe. Cursor vira "ARRASTE"/"VER".
**Mobile:** vira carrossel com scroll-snap nativo (sem GSAP), 1.15 imagem por tela.

### 06 · O POTENCIAL — bloco claro `--cream-2` (o respiro)
Antes do bloco, **marquee infinito em 2 fileiras** com direções opostas: "SEU ESPAÇO · SEU RITMO · ORLA DE PALMAS · STUDIOS INTELIGENTES ·" — uma fileira preenchida, outra em outline (text-stroke), velocidade lenta (60–90s por volta), pausa no hover.
Bloco claro, texto `--dark`:
Headline: **"Beleza que hospeda. Patrimônio que rende."**
Três pilares numerados 01/02/03, cada um com hairline e 2 linhas:
- **01 Renda de condotel** — seu studio trabalha por você quando você não está.
- **02 Gestão profissional** — operação hoteleira completa, sem esforço do proprietário.
- **03 Endereço** — a Orla de Palmas como ativo.
`<!-- AJUSTAR: textos finais; NÃO incluir percentuais ou promessas de rentabilidade sem aprovação jurídica -->`

### 07 · ESTRUTURA & SERVIÇOS — `[ 04 · ESTRUTURA ]`
Volta ao dark. Grid de 4–8 **cards hairline** numerados (01…), cada um com título + 1 linha.
`<!-- AJUSTAR: lista oficial de áreas comuns e serviços. Placeholders: Lobby & Recepção · Gestão Hoteleira · Rooftop · Fitness · Coworking · Estacionamento -->`
Hover: borda `--tan-soft` → `--tan`, `translateY(-4px)`, número ganha opacidade. Transição .4s.
Se houver renders de áreas comuns depois, cada card recebe imagem de fundo revelada no hover (`clip-path`).

### 08 · LOCALIZAÇÃO — `[ 05 · ORLA DE PALMAS ]`
Render externo em fullbleed com parallax + scrim.
Card flutuante: "Orla de Palmas – TO" + 1 frase. `<!-- AJUSTAR: endereço e frase -->`
Opcional: lista de distâncias em micro-label (aeroporto, centro, praia) `<!-- AJUSTAR -->`. Sem mapa embed (quebra a estética); se for necessário, use um mapa estático estilizado em tons da marca.

### 09 · FINALE + FOOTER
Wordmark **CINNAMON STUDIO** gigante, letter-spacing largo, com **glow** radial `--tan` atrás (blur 120px, opacidade .18) e reveal por letra.
Tagline: "Seu espaço. Seu ritmo."
CTA único, grande, com **hover magnético**: **"Quero conhecer o projeto"** → `https://wa.me/55XXXXXXXXXXX` `<!-- AJUSTAR: número -->`.
Motivo círculo hairline reaparece, girando lentamente.
Footer minimalista: wordmark pequeno · âncoras (O Projeto · O Studio · Estrutura · Potencial · Contato) · Instagram `<!-- AJUSTAR -->` · "© 2026 Cinnamon Studio · Palmas – TO" · "Imagens meramente ilustrativas."

---

## 7. CATÁLOGO DE EFEITOS (todos devem existir)

| Efeito | Nome técnico | Onde |
|---|---|---|
| Preloader com % | preloader / progress counter | 00 |
| Scroll inercial | smooth scroll (Lenis) | global |
| Seção fixada com scrub | ScrollTrigger pin + scrub | hero, galeria |
| Descida cinematográfica | scroll-scrubbed scene sequence | hero |
| Zoom lento | Ken Burns | cenas hero |
| Título por máscara | masked word/line reveal (split-text) | todos os títulos |
| Linha que desenha | hairline scaleX reveal | divisores |
| Números contando | count-up counters | 02, 04 |
| Camadas em velocidades | multi-layer parallax | 03, 08, céu |
| Imagem revelada | clip-path mask reveal + scale | galerias |
| Faixa infinita | infinite marquee (2 direções) | 06 |
| Scroll lateral | horizontal pinned scroll | 05 |
| Granulado | film grain overlay (SVG feTurbulence) | global |
| Cursor | custom cursor dot + ring (lerp) | desktop |
| Trilho | side progress rail + chapter label | hero |
| Brilho | text glow | finale |
| Botão que atrai | magnetic hover | CTAs |
| Card que responde | border/elevation micro-interaction | 07 |
| Círculo da marca | SVG stroke-dashoffset draw + slow rotate | hero, finale |

---

## 8. FILOSOFIA DE MOVIMENTO

- **Lento e confiante.** Durações 0.8–1.4s. Easing `expo.out` / `power3.out`. Nada de bounce, nada de elastic.
- **Stagger curto** (.05–.08s) — elegância vem da precisão, não do atraso.
- **Nada entra sem sair.** Toda entrada tem contrapartida na saída durante o hero.
- **Uma ideia por tela.** Se dois elementos disputam atenção, um deles está errado.
- **60fps ou não existe.** Anime só `transform` e `opacity`. Nunca `top/left/width/height`. Use `will-change` com parcimônia e remova depois.
- **Transições entre seções**: a cor de fundo faz *morph* (`backgroundColor` animado no `<body>` por ScrollTrigger) ao entrar/sair do bloco claro — sem corte seco.

---

## 9. PERFORMANCE · ACESSIBILIDADE · SEO

- `prefers-reduced-motion: reduce` → desliga pin, scrub, parallax, marquee e Ken Burns; conteúdo estático e legível, sem quebra de layout.
- `loading="lazy"` + `decoding="async"` fora do hero. Preload apenas das 4 cenas do hero.
- Sem CLS: `width`/`height` ou `aspect-ratio` em toda imagem.
- `ScrollTrigger.refresh()` no `resize` com debounce; matchMedia (`gsap.matchMedia()`) para separar desktop/mobile.
- Meta Lighthouse: Performance ≥ 85 mobile, Acessibilidade ≥ 95.
- HTML semântico: um único `<h1>` (hero), `<section>` com `aria-label`, `alt` descritivo real em todas as imagens, foco visível (`:focus-visible` com outline `--tan`).
- SEO: `<title>Cinnamon Studio · Condotel na Orla de Palmas – TO</title>`, meta description com o slogan, Open Graph + Twitter Card usando `torre-frontal`, `theme-color: #22231f`, favicon SVG inline (monograma "C" fino `--tan` sobre `--dark`), `lang="pt-BR"`, JSON-LD `Residence`/`LocalBusiness` `<!-- AJUSTAR: dados -->`.
- Zero erros/warnings no console.

---

## 10. ORDEM DE EXECUÇÃO

1. **Assets** — pipeline do §5 completo antes de qualquer código.
2. **HTML** — documento inteiro com todo o copy final e comentários `<!-- AJUSTAR -->` nos pontos abertos.
3. **CSS** — tokens, tipografia, grid e layout de todas as seções. *A página precisa estar bonita e legível sem uma linha de JS.*
4. **Base JS** — Lenis + ScrollTrigger + grain + cursor + rail.
5. **Hero** — pin, scrub, cenas, chapter-cards.
6. **Seções** — reveals, counters, parallax, galeria horizontal, marquee, hovers.
7. **Preloader** — por último, quando já se sabe o que precisa pré-carregar.
8. **Responsivo + reduced-motion** via `gsap.matchMedia()`.
9. **QA** — checklist do §11, Lighthouse, teste em 360px / 768px / 1440px / 2560px.

Commite por etapa se houver git. Ao final, escreva um `README.md` curto: como rodar, onde trocar imagens, onde estão os `AJUSTAR`.

---

## 11. CHECKLIST DE ACEITE

- [ ] Preloader com contador real e saída em máscara
- [ ] Hero pinado, 4 cenas em crossfade + Ken Burns, 100% controlado pelo scroll
- [ ] Chapter-cards com masked word reveal e saída simétrica
- [ ] Rail lateral atualizando o capítulo · cursor custom · grain global
- [ ] Count-up em 29,92 / 7,48 / 22,44
- [ ] Planta com reveal mascarado (+ hotspots, se implementados)
- [ ] Galeria horizontal pinada no desktop / snap no mobile
- [ ] Marquee em 2 direções + bloco claro com morph de background
- [ ] Cards hairline com micro-interação
- [ ] Finale com glow, CTA magnético e círculo da marca
- [ ] **Somente Montserrat. Somente a paleta do §2.1.** Wordmark fino e espaçado, nunca bold
- [ ] Todos os `<!-- AJUSTAR -->` presentes — nenhum dado inventado (nº de unidades, prazos, rentabilidade, endereço)
- [ ] "Imagens meramente ilustrativas" no rodapé e na planta
- [ ] Mobile fluido · reduced-motion · lazy loading · zero CLS
- [ ] Console limpo · roda em servidor estático simples

---
---

# APÊNDICE A — MAPEAMENTO TÉCNICO DA REFERÊNCIA (velaarmon.com)

Inspeção real do site, para você replicar o *mecanismo*, não a aparência.

**Stack detectada:** build Vite, bundle único de ~146 KB, **vanilla JS** (sem React/Webflow/Framer). **GSAP + ScrollTrigger** + **Lenis**. Fontes Clash Display / General Sans (Fontshare) + JetBrains Mono — *substituídas por Montserrat no nosso caso*.

**Hero:** `<canvas id="hero-canvas">` desenhando uma **sequência de 244 frames** `frames/frame_0001.webp … 0244.webp` (~44 MB) mapeada ao progresso do scroll — técnica "Apple scrollytelling". Nós **não** usamos isso (custo de banda e de produção); usamos crossfade de cenas estáticas, que entrega a mesma leitura narrativa. O Apêndice D traz a versão com vídeo, se um dia houver o asset.

**DOM raiz:** `#loader` → `.grain` → `#cursor-ring` + `#cursor-dot` → `#hero-rail` (`.rail-fill`, `.rail-node`, `.rail-label`) → `#scroll-hint` → `main#app`.

**Seções:** `#hero` (pinado) → `#whoweare` (headline + stats gigantes) → `#whoweserve` (4 cards hairline numerados) → `#approach` (3 pilares) → `#reviews` (marquee 2 fileiras de depoimentos) → `#consultation` → `#finale` (wordmark com glow + footer).

**Classes reveladoras da técnica:** `chapter-word-mask` / `chapter-word` (split-text mascarado), `reveal-line`, `hairline`, `marquee-mask` / `marquee-row`, `house-card`, `pin-spacer` (ScrollTrigger), `finale-wordmark`, `glow`.

**Navegação:** one-page por âncoras, sem navbar fixa; footer repete os links. Tema `#08080a`. Grain via SVG `feTurbulence` inline em data-URI.

---

# APÊNDICE B — PROMPTS PARA GERAR OS ASSETS QUE FALTAM

Use apenas se o cliente aprovar imagens geradas por IA. **Regras:** (1) só gerar ambientes que **realmente existem** no projeto aprovado — nunca inventar piscina, rooftop ou academia que não estão no memorial; (2) toda imagem gerada entra no site com a legenda "Imagem meramente ilustrativa"; (3) validar com o arquiteto antes de publicar.

### ESTILO GLOBAL (anexar a TODOS os prompts)
```
Ultra premium condotel tower on a lakefront promenade, contemporary Brazilian architecture,
curved wooden brise-soleil façade in warm walnut tone, dark bronze and graphite panels,
floor-to-ceiling glass with warm interior light, golden hour turning to blue hour,
warm amber and sand color palette, deep dark green-black shadows (#22231f), cream and tan accents,
photorealistic architectural visualization, cinematic lighting, volumetric light, soft shadows,
ray traced global illumination, ultra detailed, 8K, luxury real estate film,
clean uncluttered composition, generous negative space for typography, no text, no logos,
no watermark, no people crowds, smooth elegant camera movement.
```

### B1 · IMAGEM — Cena I do hero (o céu da orla)
```
Aerial view high above a large calm lake at golden hour, seen from above a thin layer of clouds,
warm amber sun low on the horizon, sand and tan tones fading into deep dark green-black at the top
of the frame, distant shoreline barely visible, atmospheric haze, no buildings in focus,
extremely minimal, vast negative space in the lower two thirds for typography.
[ESTILO GLOBAL]
```

### B2 · VÍDEO 10s — "A Chegada" (descida do céu à torre)
```
Reference image: the provided Cinnamon Studio tower render — match proportions, curved wooden
balconies, dark side panels and rooftop signage exactly.
Scene: camera begins above the clouds at golden hour over a lakefront city, descends slowly and
continuously through thin cloud layers, the promenade and the lake revealing themselves, until the
tower emerges and the camera settles on a hero three-quarter view of the completed building.
Windows light up progressively as dusk falls. No cranes, no construction, no crowds.
Camera: single continuous cinematic descent, very slow, no cuts, Apple commercial pacing.
Duration: 10 seconds. Mood: arrival, calm, expensive.
[ESTILO GLOBAL]
```

### B3 · VÍDEO 10s — Walkthrough do studio
```
Reference image: the provided Cinnamon studio interior render — match the layout exactly:
grey stone kitchen cabinetry on the left, black stone countertop with LED strip, slatted wooden
ceiling, fluted wood wall with warm cove lighting, bed with light linen, round wooden bistro table,
integrated balcony at the end.
Scene: one continuous camera move entering from the door, gliding past the kitchen, past the desk,
reaching the bed and turning towards the balcony as the evening light comes in.
Lights and cove LEDs warm up gradually. No people.
Camera: single take, slow dolly, architectural visualization.
Duration: 10 seconds. Mood: calm, compact luxury, smart living.
[ESTILO GLOBAL]
```

### B4 · IMAGEM — Fachada noturna
```
Cinnamon Studio tower at blue hour, warm interior lights glowing behind every window, wooden
brise-soleil façade lit from below, illuminated rooftop signage, wet promenade reflecting the
tower, palm silhouettes, no cars, no crowds, elegant three-quarter angle, generous sky space
above for typography.
[ESTILO GLOBAL]
```

### B5 · IMAGEM — Lobby / recepção `<!-- só se existir no projeto -->`
```
Compact luxury condotel lobby, dark green-black walls, fluted wood panelling, cream stone floor,
brass hairline details, single reception desk, warm cove lighting, one designer armchair,
minimal, no people, wide negative space on the right.
[ESTILO GLOBAL]
```

### CONSISTÊNCIA (anexar a todos)
```
Maintain identical architectural language, materials, palette and lighting across every asset:
same tower, same wooden brise-soleil, same warm amber lighting, same dark green-black shadow tone.
Every frame must belong to the same project and be visually consistent for a scroll-driven website.
Avoid clutter, crowds, vehicles, logos, text and unrelated buildings.
```

---

# APÊNDICE C — DADOS A CONFIRMAR (todos marcados `<!-- AJUSTAR -->` no HTML)

1. Número de unidades e de pavimentos
2. Prazo/data de entrega e status da obra
3. Endereço completo e ponto de referência na orla
4. Lista oficial de áreas comuns e serviços do condotel
5. Texto institucional final (§02) e textos dos 3 pilares (§06)
6. Número de WhatsApp e Instagram oficiais
7. Incorporadora, número do memorial de incorporação e CRECI — **obrigatórios no rodapé** para material de venda de imóvel na planta
8. Se haverá menção a rentabilidade/pool hoteleiro (exige texto validado juridicamente — sem números não aprovados)

---

# APÊNDICE D — MÓDULO OPCIONAL: HERO COM VÍDEO CONTROLADO PELO SCROLL

Se no futuro existir o vídeo do B2:
- `<video muted playsinline preload="auto">` **sem autoplay**, `position: fixed` dentro do hero pinado.
- Mapear `scrollProgress → video.currentTime` via ScrollTrigger `onUpdate` (`video.currentTime = video.duration * self.progress`), com interpolação suave (lerp) para não engasgar.
- Codificar em **H.264 com keyframe a cada 1 frame** (`-g 1`) ou WebM, ≤ 6 MB, 1920×1080 — sem keyframes densos o seek trava.
- Fallback: em iOS de baixa potência e em `reduced-motion`, cair para a sequência de cenas estáticas já implementada.
- Manter os chapter-cards e o rail exatamente como estão.
