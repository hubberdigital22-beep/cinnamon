---
name: build-site
description: Constroi o site imersivo do Cinnamon Studio do zero, fase por fase, delegando cada etapa ao agente certo.
when_to_use: quando o usuario pedir para construir, montar ou refazer o site do Cinnamon Studio
argument-hint: "[fase: 1-5 ou 'all' | padrao: all]"
disable-model-invocation: true
---

# Build do site Cinnamon Studio

Argumento recebido: `$ARGUMENTS` (vazio ou `all` = roda tudo; um numero = roda so aquela fase).

## Antes de qualquer coisa
Leia `CLAUDE.md` e `PROMPT-CINNAMON-STUDIO-SITE.md`. Eles mandam mais do que qualquer instrucao aqui.

## Sequencia

Execute as fases **em ordem**, cada uma delegada ao seu subagente. Nao pule fase, nao rode duas em paralelo — cada uma depende do arquivo que a anterior escreveu.

| Fase | Agente | O que sai |
|---|---|---|
| 1 | `assets-pipeline` | `img/` + `manifest.json` |
| 2 | `layout-builder` | `index.html` + `css/style.css` |
| 3 | `hero-engineer` | `js/lenis-setup.js`, `js/ui.js`, `js/hero.js` |
| 4 | `motion-builder` | `js/sections.js` + preloader |
| 5 | `qa-auditor` | relatorio de auditoria |

Ao delegar, passe ao subagente: o numero da fase, o caminho da spec e o que a fase anterior produziu.

## Entre uma fase e outra

1. Confira que os arquivos esperados existem e nao estao vazios.
2. Escreva um resumo de 2 linhas para o usuario: o que saiu, o que ficou pendente.
3. Rode `/compact` se o contexto passar de 70%.
4. So entao chame a proxima fase.

Se uma fase falhar ou entregar algo incompleto, **pare e relate**. Nao siga para a proxima tentando compensar.

## Ao final

Depois da fase 5, entregue ao usuario:
- o relatorio do `qa-auditor` na integra;
- a lista consolidada de todos os `<!-- AJUSTAR -->` que sobraram, agrupados por assunto;
- como rodar localmente (`python3 -m http.server 8000`).

Nunca invente os dados que faltam para "fechar" o site. Um marcador honesto vale mais que um numero plausivel.
