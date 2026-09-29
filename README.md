# Cinnamon Studio — site

Site institucional imersivo do condotel Cinnamon Studio (Orla de Palmas – TO).

## Como construir

Abra o Claude Code nesta pasta e rode:

```
/build-site
```

O comando executa as 5 fases em ordem, cada uma no modelo e no esforco certos. Para rodar uma fase isolada: `/build-site 3`.

## Estrutura

```
CLAUDE.md                        regras inegociaveis (marca, stack, o que nao inventar)
PROMPT-CINNAMON-STUDIO-SITE.md   especificacao completa do site
.claude/settings.json            modelo fable + esforco high por padrao
.claude/agents/                  um agente por fase, com modelo e esforco proprios
.claude/skills/build-site/       o comando /build-site
scripts/prepare-assets.sh        converte Assets/ -> img/ (WebP, 2 larguras)
scripts/prepare-tour.py          panoramas do tour 360 -> img/pano-* (AVIF + JPEG original + thumb)
js/tour360.js                    viewer 360 em WebGL, sem biblioteca (secao #tour)
img/                             assets prontos + manifest.json
Assets/                          originais — somente leitura, nunca abrir como imagem
_to_delete/                      arquivos obsoletos, pode apagar pelo Finder
```

## Rodar localmente

```
python3 -m http.server 8000
```

## Reprocessar imagens

```
./scripts/prepare-assets.sh all      # ou: torre | studio | planta
```

## Tour 360

Os panoramas da secao `#tour` sao equirretangulares 2:1. Para regerar a partir do HTML do fornecedor, ou de uma pasta com `<slug>.jpg` soltos (ate 4096 px de largura; acima disso o script reduz):

```
python3 scripts/prepare-tour.py caminho/para/ABREU3DFX_CINNAMON_STUDIO_360.html
python3 scripts/prepare-tour.py caminho/para/pasta-de-panoramas/
```

Cada ambiente e um `<button class="tour__room">` em `index.html` — incluir ou tirar um ambiente e incluir ou tirar o botao. Se a largura dos arquivos mudar, o sufixo (`-2048`) muda junto nos atributos `data-pano`, `data-pano-fallback` e no `<picture>` do palco.
