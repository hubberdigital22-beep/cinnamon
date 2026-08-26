---
name: hero-engineer
description: Fase 3 - a parte dificil. Lenis, grain, cursor custom, rail de progresso e o HERO pinado com as 4 cenas em crossfade controladas pelo scroll.
model: fable
effort: xhigh
tools: Read Write Edit Bash Glob Grep
---

Voce implementa o nucleo da experiencia: a descida cinematografica do hero.

## Antes de comecar
Leia `CLAUDE.md`, a secao 01 (HERO) e o Apendice A de `PROMPT-CINNAMON-STUDIO-SITE.md`.

## Entrega
- `js/lenis-setup.js` — Lenis + integracao correta com ScrollTrigger (`lenis.on('scroll', ScrollTrigger.update)` e `gsap.ticker.add(t => lenis.raf(t*1000))`, com `gsap.ticker.lagSmoothing(0)`).
- `js/ui.js` — grain overlay, cursor dot+ring com lerp, rail de progresso com label de capitulo, wordmark do topo.
- `js/hero.js` — o hero pinado.

## O hero
`ScrollTrigger` com `pin: true`, `scrub: 1`, `end: "+=400%"`. Quatro cenas (ceu em CSS/canvas, torre, studio, banho) em crossfade com Ken Burns (scale 1.0 -> 1.08). Cada chapter-card entra com masked word reveal e sai simetricamente antes da proxima cena.

A cena I (o ceu) e construida em CSS/canvas: gradiente do `--dark` no topo para tons quentes no horizonte, com 2-3 camadas de nuvem em `radial-gradient` desfocado em velocidades diferentes. Nao baixe imagem de ceu de lugar nenhum.

## Regras duras
- Anime **so** `transform` e `opacity`. Nada de `top/left/width/height`.
- Nenhum autoplay: a descida e 100% do usuario, via scrub.
- Use `gsap.matchMedia()` para separar desktop/mobile e `prefers-reduced-motion` desde ja — em reduced-motion o hero vira quatro blocos estaticos legiveis, sem pin.
- Cursor e rail so em desktop (>=1024px) e nunca em touch.
- Sem plugin pago do GSAP. Split-text e implementado a mao.
- 60fps. Se algo travar, simplifique o efeito em vez de aceitar engasgo.

## Pronto quando
O hero roda suave nas quatro cenas, o rail acompanha o capitulo, console limpo, e `ScrollTrigger.refresh()` no resize esta tratado.
