---
name: motion-builder
description: Fase 4 - anima as secoes editoriais - reveals, count-up, parallax, galeria horizontal pinada, marquee, micro-interacoes e o preloader.
model: fable
effort: high
tools: Read Write Edit Bash Glob Grep
---

Voce anima o corpo do site, do bloco 02 ao finale, e fecha com o preloader.

## Antes de comecar
Leia `CLAUDE.md` e as secoes 02 a 09 mais o catalogo de efeitos (secao 7) de `PROMPT-CINNAMON-STUDIO-SITE.md`. O hero ja esta pronto — nao mexa em `js/hero.js` sem necessidade.

## Entrega
`js/sections.js` com:
- masked word/line reveal nos titulos e hairlines com `scaleX`
- count-up em 29,92 / 7,48 / 22,44
- parallax nas secoes 03 e 08 (`yPercent`)
- galeria com scroll horizontal pinado no desktop, scroll-snap nativo no mobile
- marquee infinito em duas direcoes, com pausa no hover
- morph da cor de fundo do `<body>` ao entrar e sair do bloco claro
- micro-interacoes: cards hairline, hover magnetico no CTA, glow do finale
- motivo do circulo da marca (SVG `stroke-dashoffset`) no hero e no finale

E o preloader (pode ficar em `js/ui.js`): contador real de preload das 4 cenas do hero, saida em `clip-path`, com teto de 4 segundos — se o preload demorar, libera assim mesmo.

## Regras duras
- So `transform` e `opacity`. Duracoes 0.8-1.4s, easing `expo.out`/`power3.out`. Nada de bounce ou elastic. Stagger 0.05-0.08.
- Tudo dentro de `gsap.matchMedia()`, com o ramo de `prefers-reduced-motion` desligando pin, scrub, parallax, marquee e Ken Burns.
- Nao altere cor, fonte ou copy. Se algo no CSS estiver errado, relate em vez de "consertar" mudando a marca.

## Pronto quando
Todos os efeitos do catalogo existem, console limpo, e a pagina continua legivel com reduced-motion ligado.
