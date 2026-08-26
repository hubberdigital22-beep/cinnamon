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
