# CINNAMON STUDIO — Regras do Projeto

Site imersivo scroll-driven do condotel **Cinnamon Studio**, Orla de Palmas – TO.
Especificação completa: `PROMPT-CINNAMON-STUDIO-SITE.md` na raiz — leia antes de escrever código.

## Marca — inviolável

Paleta (nenhuma cor fora desta lista):
```
--dark #22231f   --dark-2 #171816   --dark-3 #2c2d28
--cream #f3eee5  --cream-2 #f0eadc
--tan #b7a48e    --tan-soft rgba(183,164,142,.28)
```

Fonte: **Montserrat**, só ela. Pesos 200/300/400/500/600.
- Títulos display: peso **200/300** em tamanho gigante. **Nunca bold.**
- Wordmark CINNAMON: 200/300 caps, `letter-spacing: .28em`; "STUDIO" abaixo, à direita, `.5em`.
- Eyebrow/micro-label: 500 caps, `.68rem`, `.28em`, cor `--tan`.

Proibido: azul, verde, dourado metálico, gradiente colorido, `border-radius` (exceto círculos), sombra colorida, emoji, ícone de biblioteca genérica.

## Stack — travada

HTML + CSS + JS vanilla. GSAP 3 + ScrollTrigger + Lenis via CDN. Nada além disso.
Sem React, sem Tailwind, sem bundler, sem jQuery, sem plugin pago do GSAP (SplitText/ScrollSmoother são licenciados).
Anime apenas `transform` e `opacity`.

## Assets — regra de contexto

Os arquivos em `Assets/` têm de 3 a 42 MB. **Nunca abra um PNG/JPEG original com a ferramenta de leitura de imagem** — estoura o contexto em duas leituras.
Converta sempre via shell (`scripts/prepare-assets.sh`). Para inspecionar visualmente, use só as versões `-960` em `img/`.
Nunca escreva dentro de `Assets/`. Nunca abra os `.rar`, o `.ai` ou o `.pdf`.

## Conteúdo — nunca inventar

Não invente e não estime: nº de unidades, nº de pavimentos, prazo de entrega, endereço completo, lista de áreas comuns, rentabilidade, incorporadora, CRECI, telefone, Instagram.
Onde faltar dado, deixe `<!-- AJUSTAR: o que falta -->` no HTML. Um marcador é sempre melhor que um número plausível.
Rodapé e planta levam "Imagens meramente ilustrativas."

## Copy oficial (literal — não reescrever, não traduzir)

- "SEU ESPAÇO. SEU RITMO." / "Studios inteligentes para quem vive em movimento."
- "29,92 m²" · "Sacada com 7,48 m²" · "Studio com 22,44 m²"
- "INTELIGÊNCIA ESPACIAL" · "AMBIENTES INTEGRADOS" · "CONFORTO E PRATICIDADE" · "USO INTELIGENTE DO ESPAÇO"
- "Linhas que equilibram solidez e leveza."
- "Um espaço planejado para render mais em cada metro."
- "Cada ambiente pensado para simplificar sua rotina."

Idioma do site: **pt-BR**. Termos técnicos no código em inglês; todo texto visível em português.

## Qualidade — não negociável

- `prefers-reduced-motion` desliga pin, scrub, parallax, marquee e Ken Burns.
- Zero CLS: `width`/`height` ou `aspect-ratio` em toda imagem. `loading="lazy"` fora do hero.
- Console limpo. Lighthouse mobile: Performance ≥ 85, Acessibilidade ≥ 95.
- Um único `<h1>` (hero). `alt` descritivo real em toda imagem.
