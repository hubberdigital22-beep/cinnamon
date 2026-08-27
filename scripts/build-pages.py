#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera as páginas editoriais (03 a 09, mais a landing 01) a partir de
content/paginas/*.json. A página 02 (Home) NÃO é gerada aqui — ela já
existe como index.html, o site imersivo de uma página.

Regra inegociável: nenhuma string de copy é escrita neste arquivo.
Todo texto vem do JSON. O único texto literal aqui é HTML estrutural
(rótulos de navegação, atributos) e o lint de frases proibidas, que
existe para IMPEDIR publicação, não para publicar.

Uso:  python3 scripts/build-pages.py
"""
import json
import html
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'content')
PAGINAS = os.path.join(CONTENT, 'paginas')

WHATSAPP = "https://wa.me/5563999718064"  # oficial: Denyse Xavier (CRECI 6089/TO) — investidor e cliente final

# slug do arquivo (JSON) -> slug da URL publicada
URL_SLUG = {
    '01-landing-captacao': 'landing',
    '03-o-ativo': 'o-ativo',
    '04-servicos': 'os-servicos',
    '05-a-conta': 'a-conta',
    '06-palmas': 'palmas',
    '07-riscos': 'riscos',
    '08-area-imobiliaria': 'area-da-imobiliaria',
    '09-evento-rio': 'evento-rio',
}
# 02-home fica de fora: já é o index.html existente.

NAV_ORDER = ['landing', 'o-ativo', 'os-servicos', 'a-conta', 'palmas', 'riscos',
             'area-da-imobiliaria', 'evento-rio']
NAV_LABEL = {
    'landing': 'Material', 'o-ativo': 'O Ativo', 'os-servicos': 'Serviços',
    'a-conta': 'A Conta', 'palmas': 'Palmas', 'riscos': 'Riscos',
    'area-da-imobiliaria': 'Imobiliária', 'evento-rio': 'Evento Rio',
}

PAGINAS_COM_FORM = {'landing', 'evento-rio'}  # únicas com <form> real (POST /api/lead)

# O formulário fica DESLIGADO enquanto o Kommo não tiver endpoint e chave.
# Motivo (27/08/2026): /api/lead só faz print() no log da Function, e o
# projeto está no plano Hobby, onde esse log não é retido — quem preenchia
# sumia sem deixar rastro, e a caixa de consentimento prometia um
# descadastramento impossível de honrar sobre um dado que não existe.
# Enquanto isso o CTA vai para o WhatsApp da corretora responsável.
# Para religar: FORM_ATIVO = True, rodar o build e subir.
FORM_ATIVO = False


def desligar_form(markup, titulo, cta, nota=''):
    """Comenta o <form> e põe o WhatsApp no lugar, preservando id="form"
    (todas as âncoras /landing#form continuam caindo em pé)."""
    if FORM_ATIVO:
        return markup
    # '--' fecharia o comentário HTML antes da hora
    preservado = markup.replace('--', '- -').strip()
    return '''
<section class="section" id="form"><div class="container">
  <div class="section-head">
    <h2 class="display-2">%s</h2>
  </div>
  <p class="sec-body">Enquanto o cadastro on-line não entra no ar, o material
  completo é enviado pelo WhatsApp, direto com a corretora responsável.</p>
  <p class="sec-cta"><a class="cta-btn" href="%s" rel="noopener">%s</a></p>
  <p class="fonte">Denyse Xavier · CRECI 6089/TO%s</p>
</div></section>
<!-- FORMULÁRIO DESLIGADO em 27/08/2026 — aguardando endpoint e chave do Kommo.
     O markup abaixo está intacto: religar é trocar FORM_ATIVO para True em
     scripts/build-pages.py e rodar o build. Não editar por aqui.
%s
-->''' % (esc(titulo), esc_attr(WHATSAPP), esc(cta), esc(nota), preservado)

# O logo oficial (curvas) vive inline no index.html — extraímos o sprite de lá
# na hora do build para as páginas usarem EXATAMENTE o mesmo desenho, sem
# duplicar as curvas neste arquivo.
_INDEX_HTML = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
_m = re.search(r'<svg class="logo-sprite".*?</svg>', _INDEX_HTML, re.S)
if not _m:
    raise SystemExit('sprite do logo (.logo-sprite) não encontrado no index.html')
LOGO_SPRITE = _m.group(0)

# ---------- MAPA DE VARIANTES ----------
# Saída do painel de design (3 direções independentes -> 3 juízes com lentes
# distintas -> síntese). Cada seção do deck recebe uma variante e, quando ela
# usa imagem, o asset + recorte + alt. A chave é o TÍTULO LITERAL da copy: se
# o deck mudar um título, o build falha e a decisão volta a ser consciente.
MAPA = {
    'landing': [
        ('O capital começa a produzir em um terço do tempo', 'capitular', None, None, None),
        ('510 studios de 29,92 m² na orla da Graciosa', 'prancha', 'ext-frontal', '50% 38%',
         'Fachada do Cinnamon Studio vista de frente, com as duas alas em ângulo, a lâmina vertical de madeira ao centro e as varandas iluminadas sobre o térreo envidraçado.'),
        ('R$ 16.711 o metro quadrado, num trecho que negocia a R$ 19.000', 'lastro', None, None, None),
        ('Nada está à venda nesta página', 'claro', None, None, None),
        ('Números — sempre com a fonte visível ao lado', 'quiet', None, None, None),
        ('Credenciais', 'ficha', None, None, None),
        ('Perguntas frequentes', 'quiet', None, None, None),
    ],
    'o-ativo': [
        ('O empreendimento', 'ficha', None, None, None),
        ('O que vem dentro dos 29,92 m²', 'prova', 'planta-alt', '50% 50%',
         'Planta humanizada do studio vista de cima — sacada com poltronas e mesa redonda à esquerda, cama de casal ao centro, cozinha linear ao fundo e banheiro com box de vidro à direita.'),
        ('Preço e formas de pagamento', 'lastro', None, None, None),
        ('As primeiras cinquenta unidades à vista são entregues mobiliadas', 'claro', None, None, None),
        # era 'lastro'; com a seção da mobília bloqueada saindo do ar, esta passa
        # a ser o limite da página — o bloco em que ela fala contra si mesma
        ('A vaga de garagem não acompanha a unidade', 'claro', None, None, None),
        ('O que ainda não está definido', 'ficha', None, None, None),
        ('Perguntas frequentes', 'quiet', None, None, None),
    ],
    'os-servicos': [
        ('A operação que separa diária de hotel de anúncio em aplicativo', 'capitular', None, None, None),
        ('Água, energia e internet que não dependem da cidade', 'ficha', None, None, None),
        ('Áreas que pagam aluguel em vez de custar rateio', 'prova', 'ext-esquina', '42% 56%',
         'Esquina do embasamento do Cinnamon Studio ao anoitecer, com o letreiro iluminado, o lounge envidraçado e o deck da piscina.'),
        ('Para a estadia que dura quinze dias, não duas noites', 'quiet', None, None, None),
        ('O prédio como destino, não só como endereço', 'prancha', 'ext-terreo', '50% 62%',
         'Térreo do Cinnamon Studio visto da rua, com a piscina de borda de vidro e o paisagismo junto à calçada.'),
        ('Robôs entregadores, integrados ao elevador e à fechadura', 'lastro', None, None, None),
        ('O que ficou e o que foi cortado', 'claro', None, None, None),
        ('Perguntas frequentes', 'quiet', None, None, None),
    ],
    'a-conta': [
        ('O concorrente deste investimento não é outro studio. É a renda fixa.', 'capitular', None, None, None),
        ('O que decide esta conta', 'lastro', None, None, None),
        ('Não publicamos projeção de receita — ainda', 'quiet', None, None, None),
        ('Não há rentabilidade garantida, pool prometido nem recompra', 'claro', None, None, None),
        ('Números — sempre com a fonte visível ao lado', 'quiet', None, None, None),
        ('Perguntas frequentes', 'ficha', None, None, None),
    ],
    'palmas': [
        ('323.625 habitantes, e o número de famílias cresceu 72,61% em catorze anos', 'capitular', None, None, None),
        ('4.435 unidades lançadas e velocidade de venda de 78,85%', 'lastro', None, None, None),
        ('49 hotéis, 1.982 unidades e ocupação média de 69,19%', 'ficha', None, None, None),
        ('Orla da Graciosa: onde a cidade negocia a R$ 19.000 o metro quadrado', 'prancha', 'ext-orla', '50% 44%',
         'Fachada frontal do Cinnamon Studio na hora azul, com palmeiras na entrada e o letreiro aceso no alto da torre.'),
        ('Onde este mercado é frágil', 'claro', None, None, None),
        ('Números — sempre com a fonte visível ao lado', 'quiet', None, None, None),
        ('Credenciais', 'ficha', None, None, None),
        ('Perguntas frequentes', 'quiet', None, None, None),
    ],
    'riscos': [
        ('A obra pode atrasar', 'contraste', None, None, None),
        ('São 510 unidades entrando num mercado que já tem estoque', 'lastro', None, None, None),
        ('A receita da unidade é variável e não está projetada', 'contraste', None, None, None),
        ('O memorial de incorporação ainda não está registrado', 'ficha', None, None, None),
        ('O condomínio pode vir mais alto do que se espera', 'contraste', None, None, None),
        ('O comprador local é minoria', 'lastro', None, None, None),
        ('Imóvel não tem liquidez de título', 'claro', None, None, None),
        ('Perguntas frequentes', 'quiet', None, None, None),
    ],
    'area-da-imobiliaria': [
        ('A tipologia mais líquida da cidade, no trecho mais caro dela', 'capitular', None, None, None),
        ('Quatro frases que você pode dizer sem medo', 'quiet', None, None, None),
        ('As cinco frases que fazem você perder o credenciamento', 'contraste', None, None, None),
        ('Material que faz o trabalho difícil por você', 'ficha', None, None, None),
        ('Três passos', 'quiet', None, None, None),
        ('Ainda não há venda — nem para você', 'claro', None, None, None),
        ('Números — sempre com a fonte visível ao lado', 'quiet', None, None, None),
        ('Credenciais', 'ficha', None, None, None),
        ('Perguntas frequentes', 'quiet', None, None, None),
    ],
    'evento-rio': [
        ('O projeto, aberto', 'capitular', None, None, None),
        ('Saia do Rio credenciado, com o material e o seu link', 'quiet', None, None, None),
        ('Venha para conferir, não para decidir', 'prancha', 'ext-noite', '50% 58%',
         'Chegada noturna ao Cinnamon Studio — hóspedes e carros sob o letreiro, com o piso molhado refletindo as luzes.'),
        ('Porque o comprador deste produto não mora em Palmas', 'lastro', None, None, None),
        ('Do Rio até o lançamento em Palmas', 'claro', None, None, None),
        ('Números — sempre com a fonte visível ao lado', 'quiet', None, None, None),
        ('Credenciais', 'ficha', None, None, None),
        ('Perguntas frequentes', 'quiet', None, None, None),
    ],
}

# ---------- versão por conteúdo ----------
# O ?v= fixo deixava o navegador servir CSS/JS velhos depois de cada
# alteração — bug fantasma caro de diagnosticar. O hash do próprio arquivo
# muda sozinho quando o conteúdo muda, e só então.
def _ver(caminho):
    import hashlib
    try:
        with open(os.path.join(ROOT, caminho), 'rb') as fh:
            return hashlib.sha1(fh.read()).hexdigest()[:8]
    except OSError:
        return '0'


V_CSS = _ver('css/style.css')
V_MENU = _ver('js/menu.js')
V_LENIS = _ver('js/lenis-setup.js')
V_UI = _ver('js/ui.js')
V_PAGES = _ver('js/pages.js')
V_FORMS = _ver('js/forms.js')


# ---------- resolvedor de imagens ----------
# Emite <picture> responsivo com as dimensões REAIS do manifest — a razão
# largura/altura viaja no HTML, então o navegador reserva a caixa antes de
# baixar o arquivo: zero CLS (regra de CLAUDE.md). Os pares variam de nome
# (-960/-1920, mas planta é 1300/2600 e planta-alt 1100/2200), por isso o
# resolvedor agrupa pelo sufixo numérico em vez de assumir "-1920".
_MANIFEST = json.load(open(os.path.join(ROOT, 'img', 'manifest.json'), encoding='utf-8'))

_VARIANTES = {}
for _k, _v in _MANIFEST.items():
    _m = re.match(r'^(.*)-(\d+)\.webp$', _k)
    if _m:
        _VARIANTES.setdefault(_m.group(1), []).append((int(_m.group(2)), _k, _v))
for _b in _VARIANTES:
    _VARIANTES[_b].sort()


def media(asset, alt, classe='', object_position=None, lazy=True, sizes='100vw'):
    """<picture> com fallback mobile e dimensões do manifest."""
    if asset in (None, '', 'nenhum'):
        return ''
    vs = _VARIANTES.get(asset)
    if not vs:
        raise SystemExit('asset desconhecido: %r (não está em img/manifest.json)' % asset)
    peq = vs[0][1]
    grd = vs[-1][1]
    dados = vs[-1][2]
    estilo = ' style="object-position:%s;"' % esc_attr(object_position) if object_position else ''
    return (
        '<picture%s>'
        '<source media="(max-width: 768px)" srcset="/img/%s">'
        '<img src="/img/%s" width="%d" height="%d" sizes="%s" alt="%s"%s%s decoding="async">'
        '</picture>'
    ) % (
        ' class="%s"' % esc_attr(classe) if classe else '',
        esc_attr(peq), esc_attr(grd), dados['w'], dados['h'], esc_attr(sizes), esc(alt),
        ' loading="lazy"' if lazy else ' fetchpriority="high"',
        estilo,
    )


# O finale da home anima o wordmark LETRA A LETRA (cada letra é um <path>
# com classe .logo__ltr) e desenha o anel por stroke-dashoffset. Isso exige
# o SVG inline: um <use href="#logo-cinnamon"> cria shadow tree e os paths
# ficam inalcançáveis para o querySelectorAll. Por isso extraímos do index
# o bloco completo do wordmark do finale, em vez de referenciar o sprite.
_mf = re.search(
    r'<div class="finale__inner container">\s*(<p class="wordmark">.*?</p>)',
    _INDEX_HTML, re.S)
if not _mf:
    raise SystemExit('wordmark do finale não encontrado no index.html')
FINALE_WORDMARK = _mf.group(1)

# anel — mesmo motivo de círculo do hero e do finale da home
RING_FINALE = ('<svg class="ring ring--finale" viewBox="0 0 100 100" aria-hidden="true" '
               'focusable="false"><circle cx="50" cy="50" r="49.5" fill="none" '
               'stroke="currentColor" stroke-width="0.35"/></svg>')

WORDMARK_SVG = ('<svg class="wordmark__art" viewBox="82.91 446.67 912.09 185.09" '
                'aria-hidden="true" focusable="false"><use href="#logo-cinnamon"/></svg>')

# Menu global — gêmeo do markup do index.html (mudou lá, muda aqui).
# Numeração segue o Copy Deck: 02 = Home = index.
MENU_ITEMS = [
    ('02', 'Início', '/'),
    ('01', 'Material', '/landing'),
    ('03', 'O Ativo', '/o-ativo'),
    ('04', 'Os Serviços', '/os-servicos'),
    ('05', 'A Conta', '/a-conta'),
    ('06', 'Palmas', '/palmas'),
    ('07', 'Riscos', '/riscos'),
    ('08', 'Área da Imobiliária', '/area-da-imobiliaria'),
    ('09', 'Evento Rio', '/evento-rio'),
]


def render_menu(active_slug):
    itens = []
    for _num, label, href in MENU_ITEMS:
        cur = ' aria-current="page"' if href == '/' + active_slug else ''
        itens.append('<li><a href="%s"%s>%s</a></li>' % (href, cur, esc(label)))
    return '''<div class="menu-overlay" id="menu-overlay" hidden>
    <div class="menu-overlay__scrim" data-menu-close aria-hidden="true"></div>
    <aside class="menu-panel" role="dialog" aria-modal="true" aria-label="Menu de navegação">
      <div class="menu-overlay__bar">
        <span class="wordmark" aria-hidden="true">%s</span>
        <button class="header-menu-btn" type="button" data-menu-close>Fechar</button>
      </div>
      <nav aria-label="Páginas do site"><ul class="menu-list">%s</ul></nav>
      <div class="menu-overlay__foot">
        <p class="menu-overlay__tag">Seu espaço. Seu ritmo.</p>
        <a class="cta-link" href="%s" rel="noopener">Entre em contato</a>
      </div>
    </aside>
  </div>''' % (WORDMARK_SVG, ''.join(itens), WHATSAPP)


CTA_STATIC = {
    'Falar com um consultor': WHATSAPP,
    'Baixar a ficha técnica em PDF': WHATSAPP,  # AJUSTAR: sem pipeline de PDF ainda
    'Reportar material não oficial': WHATSAPP,
    'Ver a lista completa de serviços': '/os-servicos',
    'Ver o capítulo de riscos': '/riscos',
    'Receber o estudo de mercado': '/landing#form',
    'Receber a projeção quando ela existir': '/landing#form',
    'Quero receber a projeção quando ela sair': '/landing#form',
    'Entrar na lista da projeção': '/landing#form',
    'Ver o que estará no estande': '#estande',
    'Ver o material antes de decidir': '#o-que-vem-no-credenciamento',
}


_NBSP = '\u00a0'
# espaço inseparável entre número e unidade/símbolo. Não altera o texto que
# o leitor vê — impede a quebra tipográfica que separa "29,92" de "m²" ou
# deixa "R$" órfão no fim da linha.
_RE_UNIDADE = re.compile(r'(\d)\s+(m²|m2|km|ha|h|min|meses|mês|anos|ano|unidades|studios|vezes|páginas|hotéis|habitantes)\b')
_RE_MOEDA = re.compile(r'\bR\$\s+(?=\d)')


def tipografia(s):
    s = _RE_UNIDADE.sub(lambda m: m.group(1) + _NBSP + m.group(2), s)
    s = _RE_MOEDA.sub('R$' + _NBSP, s)
    return s


def esc(s):
    """escapa E aplica as travas tipográficas — usado para texto visível"""
    return html.escape(tipografia(s or ''), quote=True)


def esc_attr(s):
    """escapa sem tocar em espaços — para href, id e valores de CSS"""
    return html.escape(s or '', quote=True)


def cta_href(texto, slug):
    if texto == 'Receber o material completo':
        return '#form' if slug in PAGINAS_COM_FORM else '/landing#form'
    if texto == 'Ver de onde vem cada número':
        return '#numeros'
    if texto == 'Garantir meu acesso':
        return '#form'
    if texto == 'Credenciar minha imobiliária':
        return '#credenciamento' if slug == 'area-da-imobiliaria' else '/area-da-imobiliaria#credenciamento'
    return CTA_STATIC.get(texto, '#')


# Antes havia aqui uma LINT_EXCECOES liberando a tabela de preços na página
# 03, com o argumento de que a seção carrega a ressalva do próprio deck.
# REVOGADA em 27/08/2026: o levantamento jurídico do dia é explícito —-
# divulgar tabela antes do registro do memorial é OFERECER unidade, que é
# o que a Lei 4.591/64 art. 32 proíbe, ressalva junto ou não. A copy segue
# escrita no deck e volta ao ar no dia seguinte ao registro.
LINT_EXCECOES = set()

# Blocos que o deck traz prontos mas que NÃO podem ir ao ar ainda. Mora
# aqui, e não em content/, de propósito: content/ é local (fora do repo
# público) e some num re-fatiamento do deck — a trava tem de sobreviver a
# isso. Chave: (slug, título literal da seção).
BLOQUEIO_PUBLICACAO = {
    ('o-ativo', 'Preço e formas de pagamento'):
        'Lei 4.591/64 art. 32 — memorial de incorporação não registrado. '
        'Destrava no dia do registro.',
}

# Itens soltos de lista suprimidos, por trecho identificador da frase.
# Mesma lógica de durabilidade do BLOQUEIO_PUBLICACAO acima.
ARGUMENTOS_SUPRIMIDOS = {
    ('area-da-imobiliaria', 'cinquenta unidades'):
        'Quantidade não confirmada: a call de 14/08 e o Dossiê de 27/08 '
        'atrelam a mobília à modalidade à vista inteira (300 un.), não a 50. '
        'Não entregar ao corretor um número que a fonte não sustenta.',
}


# Âncoras semânticas: seções que um CTA aponta por nome. Sem isto a seção
# só tem o id numerado (s-NN), que muda de número quando outra seção entra
# ou sai — foi assim que três CTAs viraram link morto. Chave: (slug, título
# literal da seção); o valor substitui o id numerado.
ANCORAS = {
    ('landing', 'tipo:numeros'): 'numeros',
    ('evento-rio', 'O projeto, aberto'): 'estande',
    ('area-da-imobiliaria', 'Material que faz o trabalho difícil por você'):
        'o-que-vem-no-credenciamento',
}


def aplicar_ancoras(slug, doc, blocos):
    """Troca o id numerado pelo semântico nas seções do mapa ANCORAS.
    Falha o build se um título do mapa não existir mais no deck — assim a
    âncora nunca morre em silêncio."""
    titulos = {}
    n = 0
    for b in blocos:
        if b['tipo'] in ('abertura', 'microcopy', 'nota_interna', 'fechamento',
                         'status', 'trava') or b.get('bloqueado'):
            continue
        n += 1
        t = (b.get('titulo') or '').strip()
        if t:
            titulos.setdefault(t, '%02d' % n)
        # blocos sem título (números, credenciais, faq) são endereçáveis
        # pelo tipo — a banda de stats da landing é um deles
        titulos.setdefault('tipo:' + b['tipo'], '%02d' % n)
    for (sl, titulo), ancora in ANCORAS.items():
        if sl != slug:
            continue
        num = titulos.get(titulo)
        if num is None:
            raise SystemExit(
                'ÂNCORA ÓRFÃ em %s: nenhuma seção casa com a chave %r.\n'
                'O deck mudou — atualize ANCORAS em build-pages.py, '
                'senão o CTA que aponta para #%s vira link morto.'
                % (slug, titulo, ancora))
        doc = doc.replace('id="s-%s"' % num, 'id="%s"' % ancora, 1)
    return doc


def lint_ancoras(slug, doc):
    """Nenhum href="#alvo" pode apontar para um id que não existe.
    Ignora markup comentado (o <form> desligado mora num comentário)."""
    vis = re.sub(r'<!--.*?-->', ' ', doc, flags=re.S)
    ids = set(re.findall(r'id="([^"]+)"', vis))
    mortas = sorted({h for h in re.findall(r'href="#([^"]+)"', vis)
                     if h and h not in ids})
    if mortas:
        raise SystemExit(
            'ÂNCORA MORTA em %s: %s\n'
            'O CTA aponta para uma seção que não existe na página. '
            'Ou registre o destino em ANCORAS, ou corrija o href em CTA_STATIC.'
            % (slug, ', '.join('#' + m for m in mortas)))


def aplicar_politica(slug, blocos):
    """Poda os blocos travados para publicação ANTES de renderizar.
    Devolve a lista de supressões aplicadas, para o relatório do build."""
    aplicadas = []
    for b in blocos:
        titulo = (b.get('titulo') or '').strip()
        motivo = BLOQUEIO_PUBLICACAO.get((slug, titulo))
        if motivo:
            b['bloqueado'] = True
            aplicadas.append('seção "%s" — %s' % (titulo, motivo))
        for filho in b.get('blocos', []) or []:
            if filho.get('tipo') != 'argumentos':
                continue
            mantidos = []
            for item in filho.get('itens', []):
                frase = item.get('frase') or ''
                alvo = next((m for (sl, tr), m in ARGUMENTOS_SUPRIMIDOS.items()
                             if sl == slug and tr in frase), None)
                if alvo:
                    aplicadas.append('frase "%s…" — %s' % (frase[:46], alvo))
                else:
                    mantidos.append(item)
            filho['itens'] = mantidos
    return aplicadas


def _tokens(valor):
    """Quebra o valor composto em pedaços realmente procuráveis. Comparar a
    string inteira ('R$ 600.000 tabela · R$ 500.000 à vista · …') nunca casa
    com a copy, que cita um valor de cada vez — o lint passava sempre."""
    toks = set(re.findall(r'R\$\s?[\d.]+(?:,\d{2})?', valor or ''))
    if not toks:
        toks.add(valor)
    return {t for t in toks if t}


def carregar_lint():
    np = json.load(open(os.path.join(CONTENT, 'nao-publicar.json'), encoding='utf-8'))
    proibidas = set()
    for item in np.get('frases_que_descredenciam', []):
        if item.get('frase'):
            proibidas.add(item['frase'].strip('"“”'))
    banidas_dados = json.load(open(os.path.join(CONTENT, 'dados.json'), encoding='utf-8'))
    valores_bloqueados = []
    for v in banidas_dados.values():
        if not v.get('citavel', True):
            valores_bloqueados.extend(_tokens(v['valor']))
    return proibidas, sorted(set(valores_bloqueados))


def lint_html(texto_visivel, proibidas, valores_bloqueados, slug):
    erros = []
    for frase in proibidas:
        if frase and frase in texto_visivel:
            erros.append('frase que descredencia corretor encontrada: %r' % frase)
    for valor in valores_bloqueados:
        if valor and valor in texto_visivel and (slug, valor) not in LINT_EXCECOES:
            erros.append('dado marcado citavel:false encontrado: %r' % valor)
    if erros:
        raise SystemExit('LINT FALHOU em %s:\n  - %s' % (slug, '\n  - '.join(erros)))


# ---------- render de cada tipo de bloco ----------
# Gramática visual do index: cada seção é
#   <section class="section sec sec--VARIANTE" id="s-NN">
#     <div class="container">
#       <div class="section-head"> [ NN · eyebrow ] + display-2 </div>
#       conteúdo…
# O CSS (§22) reposiciona os mesmos elementos por variante; os reveals
# (js/pages.js) miram .section-head, .sec-body e as listas.

def _secnum(n):
    return '%02d' % n


def r_abertura(b, slug, is_hero, numero=None):
    tag = 'h1' if is_hero else 'h2'
    out = ['<section class="page-hero"><div class="container">']
    # "rotulo" (hero__lbl) é rótulo editorial do deck — nunca vai para a tela.
    e = b.get('eyebrow') or ''
    if e:
        out.append('<p class="eyebrow">%s</p>' % esc(e))
    if b.get('headline'):
        out.append('<%s class="display-2">%s</%s>' % (tag, esc(b['headline']), tag))
    if b.get('sub'):
        out.append('<p class="page-hero__lead caption">%s</p>' % esc(b['sub']))
    btns = b.get('botoes') or []
    if btns:
        out.append('<div class="cta-row">')
        for i, btn in enumerate(btns):
            href = cta_href(btn['texto'], slug)
            rel = ' rel="noopener"' if href.startswith('http') else ''
            primario = btn.get('peso') == 'primario' or i == 0
            cls = 'cta-btn' if primario else 'cta-link'
            out.append('<a class="%s" href="%s"%s>%s</a>' % (cls, esc_attr(href), rel, esc(btn['texto'])))
        out.append('</div>')
    out.append('</div></section>')
    return ''.join(out)


def _head(n, eyebrow, titulo):
    """cabeçalho padrão: eyebrow + display-2. Sem numeração — o `n` continua
    servindo só para o id âncora da seção."""
    out = ['<div class="section-head">']
    if eyebrow:
        out.append('<p class="eyebrow">%s</p>' % esc(eyebrow))
    if titulo:
        out.append('<h2 class="display-2">%s</h2>' % esc(titulo))
    out.append('</div>')
    return ''.join(out)


def _notas(b):
    """NÃO emite nada. `por_que` e `trava` são nota da Hubber para quem
    desenvolve — no deck vêm em serifa, e a legenda do próprio documento diz
    que serifa "não entra no site". O `trava` chega a nomear pendências
    internas ("confirmar com o Ruy") e o `por_que` discute decisões que o
    cliente ainda precisa tomar. Ficam como comentário HTML, na convenção
    AJUSTAR do CLAUDE.md, para quem for reavaliar bloco a bloco."""
    out = []
    for chave in ('por_que', 'trava'):
        if b.get(chave):
            texto = re.sub(r'--+', '- -', b[chave])  # não fechar o comentário
            out.append('<!-- AJUSTAR: nota interna do deck (%s), fora da tela. '
                       'Se for copy pública, mova para "corpo" no JSON: %s -->'
                       % (chave, texto))
    return ''.join(out)


def _prova_fonte(b):
    out = []
    if b.get('fonte'):
        out.append('<p class="fonte">Fonte · %s</p>' % esc(b['fonte']))
    if b.get('ressalva'):
        out.append('<p class="ressalva">%s</p>' % esc(b['ressalva']))
    return ''.join(out)


def _aninhados(b, slug, variante):
    out = []
    for nested in b.get('blocos', []):
        fn = RENDER.get(nested['tipo'])
        if fn:
            html = fn(nested, slug)
            # nas variantes de série o eixo é desenhado pelo scroll
            if nested['tipo'] in ('variaveis', 'passos', 'linha_do_tempo', 'kit_credenciamento'):
                html = ('<div class="serie"><span class="serie__eixo" aria-hidden="true"></span>%s</div>' % html)
            out.append(html)
    return ''.join(out)


def _corpo(b, slug, variante):
    out = []
    if b.get('corpo'):
        out.append('<p class="sec-body">%s</p>' % esc(b['corpo']))
    if b.get('itens'):
        out.append('<ul class="chips">%s</ul>' % ''.join('<li>%s</li>' % esc(i) for i in b['itens']))
    out.append(_aninhados(b, slug, variante))
    return ''.join(out)


def _cta(b, slug):
    if not b.get('cta'):
        return ''
    href = cta_href(b['cta'], slug)
    return '<p class="sec-cta"><a class="cta-link" href="%s">%s</a></p>' % (esc_attr(href), esc(b['cta']))


def _abre(variante, n, extra=''):
    claro = ' section--claro' if variante == 'claro' else ''
    return ('<section class="section%s sec sec--%s" id="s-%s"%s><div class="container">'
            % (claro, variante, _secnum(n), extra))


def r_secao(b, slug, n, variante='quiet', asset=None, pos=None, alt=None):
    eyebrow, titulo = b.get('eyebrow'), b.get('titulo')

    # ---- prancha: imagem full-bleed com scrim e card (= torre__hero) ----
    if variante == 'prancha':
        depois = _corpo(b, slug, variante) + _notas(b) + _prova_fonte(b) + _cta(b, slug)
        return (
            '<section class="section sec sec--prancha" id="s-%s">'
            '<figure class="prancha">'
            '<div class="prancha__media">%s</div>'
            '<div class="prancha__scrim" aria-hidden="true"></div>'
            '<figcaption class="prancha__card container">%s'
            '<p class="prancha__legenda">Imagem meramente ilustrativa.</p>'
            '</figcaption></figure>'
            '%s</section>'
        ) % (
            _secnum(n),
            media(asset, alt, object_position=pos),
            _head(n, eyebrow, titulo),
            ('<div class="container sec__depois">%s</div>' % depois) if depois.strip() else '',
        )

    # ---- prova: imagem dentro da coluna, legenda fixa ao lado ----
    if variante == 'prova':
        return (
            '%s%s'
            '<div class="sec__corpo">%s%s%s</div>'
            '<figure class="prova"><div class="prova__frame">%s</div></figure>'
            '<div class="prova__legenda">'
            '<span class="rotulo">Imagem meramente ilustrativa.</span>%s</div>'
            '</div></section>'
        ) % (
            _abre(variante, n), _head(n, eyebrow, titulo),
            _corpo(b, slug, variante), _notas(b), _cta(b, slug),
            media(asset, alt, object_position=pos),
            _prova_fonte(b),
        )

    # ---- contraste: o balanço risco / mitigação ----
    if variante == 'contraste':
        par = ''
        if b.get('risco') or b.get('mitigacao'):
            par = ('<div class="sec__par">'
                   '<div class="sec__lado sec__lado--a"><span>Risco</span><p>%s</p></div>'
                   '<div class="sec__lado sec__lado--b"><span>Mitigação</span><p>%s</p></div>'
                   '</div>') % (esc(b.get('risco') or ''), esc(b.get('mitigacao') or ''))
        aberto = ''
        if b.get('em_aberto'):
            aberto = ('<div class="sec__aberto"><span>Ainda em aberto</span><p>%s</p></div>'
                      % esc(b['em_aberto']))
        return '%s%s%s%s%s%s%s%s</div></section>' % (
            _abre(variante, n), _head(n, eyebrow, titulo),
            _corpo(b, slug, variante), par, aberto,
            _notas(b), _prova_fonte(b), _cta(b, slug))

    # ---- lastro: afirmação à esquerda, prova grudada à direita ----
    if variante == 'lastro':
        # append na ordem do deck: risco -> mitigacao -> em_aberto. O prepend
        # anterior invertia e a Mitigação aparecia antes do Risco.
        pares = ''.join(
            '<div class="nota"><span>%s</span><p>%s</p></div>' % (esc(r), esc(b[c]))
            for c, r in (('risco', 'Risco'), ('mitigacao', 'Mitigação'), ('em_aberto', 'Ainda em aberto'))
            if b.get(c))
        aside = pares + _notas(b) + _prova_fonte(b)
        return (
            '%s<div class="sec__main">%s%s%s</div>'
            '<aside class="sec__aside">%s</aside></div></section>'
        ) % (_abre(variante, n), _head(n, eyebrow, titulo),
             _corpo(b, slug, variante), _cta(b, slug), aside)

    # ---- ficha: cabeçalho-índice fixo + corpo corrido ----
    if variante == 'ficha':
        extra_notas = ''.join(
            '<div class="nota"><span>%s</span><p>%s</p></div>' % (esc(r), esc(b[c]))
            for c, r in (('risco', 'Risco'), ('mitigacao', 'Mitigação'), ('em_aberto', 'Ainda em aberto'))
            if b.get(c))
        return '%s%s<div class="sec__corpo">%s%s%s%s%s</div></div></section>' % (
            _abre(variante, n), _head(n, eyebrow, titulo),
            _corpo(b, slug, variante), extra_notas, _notas(b),
            _prova_fonte(b), _cta(b, slug))

    # ---- quiet · capitular · claro: trilho editorial ----
    extra_notas = ''.join(
        '<div class="nota"><span>%s</span><p>%s</p></div>' % (esc(r), esc(b[c]))
        for c, r in (('risco', 'Risco'), ('mitigacao', 'Mitigação'), ('em_aberto', 'Ainda em aberto'))
        if b.get(c))
    return '%s%s%s%s%s%s%s</div></section>' % (
        _abre(variante, n),
        _head(n, eyebrow, titulo),
        _corpo(b, slug, variante), extra_notas, _notas(b),
        _prova_fonte(b), _cta(b, slug))


def r_numlist(b, slug):
    out = ['<ul class="numlist">']
    for it in b['itens']:
        out.append('<li><span class="numlist__n">%s</span><div>' % esc(it.get('n') or ''))
        if it.get('titulo'):
            out.append('<h3>%s</h3>' % esc(it['titulo']))
        if it.get('texto'):
            out.append('<p>%s</p>' % esc(it['texto']))
        if it.get('fonte'):
            out.append('<p class="fonte">Fonte · %s</p>' % esc(it['fonte']))
        if it.get('ressalva'):
            out.append('<p class="ressalva">%s</p>' % esc(it['ressalva']))
        out.append('</div></li>')
    out.append('</ul>')
    return ''.join(out)


def r_args(b, slug, banido):
    lst = 'banned' if banido else 'args'
    frase = 'banned__frase' if banido else 'args__frase'
    nota = 'banned__nota' if banido else 'args__nota'
    out = ['<ul class="%s">' % lst]
    for it in b['itens']:
        out.append('<li><p class="%s">%s</p>' % (frase, esc(it.get('frase'))))
        if it.get('nota'):
            out.append('<p class="%s">%s</p>' % (nota, esc(it['nota'])))
        out.append('</li>')
    out.append('</ul>')
    return ''.join(out)


def r_golden(b, slug):
    return '<p class="ressalva golden">%s</p>' % esc(b['texto'])


def r_tl(b, slug):
    out = ['<ol class="timeline">']
    for it in b['itens']:
        out.append('<li>')
        if it.get('marco'):
            out.append('<h3>%s</h3>' % esc(it['marco']))
        if it.get('texto'):
            out.append('<p>%s</p>' % esc(it['texto']))
        out.append('</li>')
    out.append('</ol>')
    return ''.join(out)


def r_tabela(b, slug):
    out = ['<div class="tabela">']
    for linha in b['linhas']:
        if len(linha) >= 2:
            out.append('<div class="tabela__linha"><p class="tabela__chave">%s</p>'
                       '<p class="tabela__valor">%s</p></div>' % (esc(linha[0]), esc(linha[1])))
    out.append('</div>')
    return ''.join(out)


_NUM_RE = re.compile(r'^(\d{1,3}(?:,\d{1,2})?)(?![\d.])')


def _stat_num(valor):
    """Embrulha o prefixo numérico animável para o count-up do pages.js.
    Números com ponto de milhar (R$ 10.164) e datas (26.09) ficam
    estáticos — o regex bloqueia dígito/ponto na sequência."""
    m = _NUM_RE.match(valor or '')
    if not m:
        return esc(valor)
    bruto = m.group(1)
    decimais = len(bruto.split(',')[1]) if ',' in bruto else 0
    resto = valor[m.end():]
    return ('<span class="stat__n" data-count="%s" data-decimals="%d">%s</span>%s'
            % (esc(bruto), decimais, esc(bruto), esc(resto)))


def r_numeros(b, slug, n=None, variante='quiet'):
    # sem numeração, uma banda de stats não tem cabeçalho nenhum — como a
    # do #projeto na home, que vive sob o head da própria seção
    # o "rotulo" do JSON ("Números — sempre com a fonte visível ao lado") é
    # instrução editorial do deck, não copy de tela: entra só o fólio.
    corpo = ['<ul class="stats">']
    for it in b['itens']:
        corpo.append('<li class="stat"><span class="stat__num">%s</span>'
                     '<span class="stat__label">%s</span>' % (_stat_num(it.get('valor')), esc(it.get('rotulo'))))
        if it.get('fonte'):
            corpo.append('<span class="stat__fonte">%s</span>' % esc(it['fonte']))
        corpo.append('</li>')
    corpo.append('</ul>')
    corpo = ''.join(corpo)
    if variante == 'ficha':
        return '%s<div class="sec__corpo">%s</div></div></section>' % (
            _abre(variante, n), corpo)
    return '%s%s</div></section>' % (_abre(variante, n), corpo)


def r_credenciais(b, slug, n=None, variante='ficha'):
    lista = '<ul class="credenciais">%s</ul>' % ''.join('<li>%s</li>' % esc(i) for i in b['itens'])
    head = _head(n, 'Credenciais', None)
    if variante == 'ficha':
        return '%s%s<div class="sec__corpo">%s</div></div></section>' % (
            _abre(variante, n), head, lista)
    return '%s%s%s</div></section>' % (_abre(variante, n), head, lista)


def r_faq(b, slug, n=None, variante='quiet'):
    lista = '<div class="faq-list">%s</div>' % ''.join(
        '<details><summary>%s</summary><p>%s</p></details>' % (esc(it['pergunta']), esc(it['resposta']))
        for it in b['itens'])
    head = _head(n, None, 'Perguntas frequentes')
    if variante == 'ficha':
        return '%s%s<div class="sec__corpo">%s</div></div></section>' % (
            _abre(variante, n), head, lista)
    return '%s%s%s</div></section>' % (_abre(variante, n), head, lista)


def r_micro(b, slug):
    return ''  # microcopy vira o <form> real — nunca HTML solto


def r_foot(b, slug):
    """Fechamento IDÊNTICO ao finale da home — glow, anel, wordmark em curvas
    e cta-major —, trocando só as frases pelas desta página."""
    out = ['<section class="finale" aria-label="Fechamento">',
           '<span class="finale__glow" aria-hidden="true"></span>',
           RING_FINALE,
           '<div class="finale__inner container">',
           FINALE_WORDMARK]
    if b.get('titulo'):
        out.append('<h2 class="display-3 finale__titulo">%s</h2>' % esc(b['titulo']))
    if b.get('texto'):
        out.append('<p class="finale__texto caption">%s</p>' % esc(b['texto']))
    if b.get('cta'):
        href = cta_href(b['cta'], slug)
        rel = ' rel="noopener"' if href.startswith('http') else ''
        out.append('<a class="cta-major" href="%s"%s>%s</a>' % (esc_attr(href), rel, esc(b['cta'])))
    out.append('</div></section>')
    return ''.join(out)


def r_kit(b, slug):
    out = ['<dl class="tabela">']
    for it in b['itens']:
        out.append('<div class="tabela__linha"><dt class="tabela__chave">%s</dt>'
                   '<dd class="tabela__valor">%s</dd></div>' % (esc(it['chave']), esc(it['valor'])))
    out.append('</dl>')
    return ''.join(out)


def r_nota(b, slug):
    return ''  # nota_interna: nunca vai para o HTML publicado


RENDER = {
    'variaveis': r_numlist,
    'passos': r_numlist,
    'argumentos': lambda b, s: r_args(b, s, False),
    'frases_proibidas': lambda b, s: r_args(b, s, True),
    'regra_de_ouro': r_golden,
    'linha_do_tempo': r_tl,
    'tabela': r_tabela,
    'microcopy': r_micro,
    'nota_interna': r_nota,
    'kit_credenciamento': r_kit,
}


def get_micro(blocos, campo_nome):
    for b in blocos:
        if b['tipo'] == 'microcopy':
            for it in b['itens']:
                if it['campo'] == campo_nome:
                    return it['texto']
    return None


def render_form_landing(blocos, n):
    """Página 01 — form label/campos/consent/sucesso, literais do deck."""
    consent = get_micro(blocos, 'form consent') or ''
    sucesso = get_micro(blocos, 'form sucesso') or ''
    markup = '''
<section class="section" id="form"><div class="container">
  <div class="section-head">
    <h2 class="display-2">%s</h2>
  </div>
  <form class="form" method="POST" action="/api/lead" data-form="lead">
    <input type="hidden" name="origem" value="landing">
    <div class="form__campo"><label for="lf-nome">Nome</label><input id="lf-nome" name="nome" autocomplete="name" required></div>
    <div class="form__campo"><label for="lf-email">E-mail</label><input id="lf-email" type="email" name="email" autocomplete="email" required></div>
    <div class="form__campo"><label for="lf-whats">WhatsApp</label><input id="lf-whats" name="whatsapp" autocomplete="tel" required></div>
    <div class="form__campo">
      <label for="lf-perfil">Você é investidor ou corretor?</label>
      <select id="lf-perfil" name="perfil" required>
        <option value="">Selecione</option>
        <option value="investidor">Investidor</option>
        <option value="corretor">Corretor</option>
      </select>
    </div>
    <label class="form__consent"><input type="checkbox" name="consentimento" required><span>%s</span></label>
    <button class="form__submit" type="submit">Receber o material completo</button>
    <p class="form__msg" data-role="msg" hidden></p>
    <p class="fonte" hidden data-role="sucesso">%s</p>
  </form>
</div></section>''' % (esc(get_micro(blocos, 'form label') or 'Para onde enviamos'),
                        esc(consent), esc(sucesso))
    return desligar_form(
        markup,
        get_micro(blocos, 'form label') or 'Para onde enviamos',
        'Receber o material completo')


def render_form_evento(blocos, n):
    """Página 09 — primeiro campo ramifica corretor/investidor, campos literais do deck."""
    consent = get_micro(blocos, 'form consent') or get_micro(blocos, 'disclaimer rodape') or ''
    primeiro = get_micro(blocos, 'form primeiro campo') or ''
    markup = '''
<section class="section" id="form"><div class="container">
  <div class="section-head">
    <h2 class="display-2">Cadastro para o evento</h2>
  </div>
  <form class="form" method="POST" action="/api/lead" data-form="lead">
    <input type="hidden" name="origem" value="evento-rio">
    <div class="form__campo">
      <label for="ev-perfil">%s</label>
      <select id="ev-perfil" name="perfil" required>
        <option value="">Selecione</option>
        <option value="corretor">Corretor</option>
        <option value="investidor">Investidor</option>
      </select>
    </div>
    <div class="form__campo"><label for="ev-nome">Nome</label><input id="ev-nome" name="nome" autocomplete="name" required></div>
    <div class="form__campo"><label for="ev-email">E-mail</label><input id="ev-email" type="email" name="email" autocomplete="email"></div>
    <div class="form__campo"><label for="ev-whats">WhatsApp</label><input id="ev-whats" name="whatsapp" autocomplete="tel" required></div>
    <div class="form__campo"><label for="ev-creci">CRECI (se corretor)</label><input id="ev-creci" name="creci"></div>
    <div class="form__campo"><label for="ev-imob">Imobiliária (se corretor)</label><input id="ev-imob" name="imobiliaria"></div>
    <div class="form__campo"><label for="ev-cidade">Cidade (se investidor)</label><input id="ev-cidade" name="cidade"></div>
    <button class="form__submit" type="submit">Garantir meu acesso</button>
    <p class="form__msg" data-role="msg" hidden></p>
    <p class="fonte">%s</p>
  </form>
</div></section>''' % (esc(primeiro), esc(consent))
    return desligar_form(
        markup, 'Cadastro para o evento', 'Garantir meu acesso',
        ' · o credenciamento de corretor é confirmado por este mesmo canal')


PAGE_HEAD_EXTRA = {
    'area-da-imobiliaria': '''
<section class="section sec sec--quiet" id="credenciamento"><div class="container">
  <div class="section-head">
    <p class="eyebrow">Credenciamento</p>
    <h2 class="display-2">Fale com a incorporação para credenciar sua imobiliária</h2>
  </div>
  <p class="sec-body">O formulário de cadastro (CNPJ, CRECI, corretores) ainda não tem os
  campos definidos no Copy Deck — para não inventar copy de formulário, o credenciamento
  começa por contato direto até esse fluxo ser desenhado.</p>
  <p class="sec-cta"><a class="cta-btn" href="%s" rel="noopener">Falar sobre credenciamento</a></p>
  <p class="fonte">AJUSTAR: trocar pelo formulário Kommo quando Thiago enviar o endpoint —
  decisão de 27/08: corretor NÃO é atendido individual (cadastro → grupo/canal coletivo);
  o WhatsApp aqui é interino. Validação de CRECI: upload manual com conferência humana.</p>
</div></section>''' % esc_attr(WHATSAPP),
}


def _chave(b):
    """como uma seção é identificada no MAPA"""
    t = b['tipo']
    if t == 'secao':
        return b.get('titulo') or ''
    if t == 'numeros':
        return b.get('rotulo') or 'Números'
    if t == 'credenciais':
        return 'Credenciais'
    if t == 'faq':
        return 'Perguntas frequentes'
    return None


def lint_ritmo(slug, escolhidas, imagens):
    """Regra em prosa não vira ritmo; regra que quebra o build, sim."""
    erros = []
    if imagens > 3:
        erros.append('%d imagens grandes (máximo 3 por página)' % imagens)
    claros = [v for v in escolhidas if v == 'claro']
    if len(claros) > 1:
        erros.append('%d bandas claras (máximo 1: dois morphs de fundo disputam o mesmo tween)' % len(claros))
    for i in range(1, len(escolhidas)):
        if escolhidas[i] == escolhidas[i - 1]:
            erros.append('variante %r repetida em seções consecutivas (%d e %d)'
                         % (escolhidas[i], i, i + 1))
    if erros:
        raise SystemExit('RITMO FALHOU em %s:\n  - %s' % (slug, '\n  - '.join(erros)))

    # Aviso, não erro: o painel de design propôs proibir variantes de coluna
    # fixa adjacentes, mas o próprio mapa dele viola isso em o-ativo — e a
    # proibição não se sustenta, porque position:sticky é limitado pelo bloco
    # que o contém: a âncora da seção A solta antes de a de B começar. Fica
    # como sinal de monotonia de layout para revisão humana.
    fixas = {'lastro', 'ficha', 'prova'}
    avisos = []
    for i in range(1, len(escolhidas)):
        if escolhidas[i] in fixas and escolhidas[i - 1] in fixas:
            avisos.append('%s → %s (seções %d e %d)'
                          % (escolhidas[i - 1], escolhidas[i], i, i + 1))
    return avisos


def build_page(fname):
    slug_json = fname[:-5]
    slug = URL_SLUG[slug_json]
    d = json.load(open(os.path.join(PAGINAS, fname), encoding='utf-8'))
    blocos = d['blocos']
    supressoes = aplicar_politica(slug, blocos)

    mapa = MAPA.get(slug)
    if mapa is None:
        raise SystemExit('sem mapa de variantes para a página %r' % slug)
    por_titulo = {m[0]: m for m in mapa}

    body_parts = []
    fechamento_html = ''
    hero_done = False
    sec_n = 0
    escolhidas = []
    imagens = 0

    for b in blocos:
        if b['tipo'] == 'abertura' and not hero_done:
            body_parts.append(r_abertura(b, slug, is_hero=True, numero=d.get('numero')))
            hero_done = True
            body_parts.append('<div id="conteudo"></div>')
            status = d.get('status') or ''
            if status and status != 'Pronto para desenvolver':
                # metadado de workflow do deck ("Revisão jurídica antes de
                # subir") — sinal para a equipe, nunca texto para o visitante
                body_parts.append('<!-- STATUS DO DECK: %s -->' % esc(status))
            continue
        if b['tipo'] == 'microcopy':
            continue  # vira o <form> real — nunca HTML solto
        if b['tipo'] == 'nota_interna':
            continue  # nunca vai para o HTML publicado
        if b['tipo'] == 'fechamento':
            fechamento_html = r_foot(b, slug)  # finale é sempre o último ato
            continue

        if b.get('bloqueado'):
            # `sec--gated` no deck: bloco que o próprio documento trava para
            # publicação (o bônus de mobília, cuja quantidade está em
            # divergência e é citavel:false em content/dados.json)
            body_parts.append('<!-- BLOQUEADO NO DECK, fora do ar: %s -->'
                              % esc((b.get('titulo') or '').replace('--', '- -')))
            continue

        chave = _chave(b)
        if chave is None:
            raise SystemExit('tipo de bloco sem renderer no nível da página: %s (%s)'
                             % (b['tipo'], slug))
        entrada = por_titulo.get(chave)
        if entrada is None:
            raise SystemExit(
                'seção sem variante no MAPA — %s: %r\n'
                'O deck mudou: escolha a variante conscientemente em vez de deixar o build adivinhar.'
                % (slug, chave))
        _, variante, asset, pos, alt = entrada

        sec_n += 1
        escolhidas.append(variante)
        if asset:
            imagens += 1

        if b['tipo'] == 'secao':
            body_parts.append(r_secao(b, slug, sec_n, variante, asset, pos, alt))
        elif b['tipo'] == 'numeros':
            body_parts.append(r_numeros(b, slug, sec_n, variante))
        elif b['tipo'] == 'credenciais':
            body_parts.append(r_credenciais(b, slug, sec_n, variante))
        elif b['tipo'] == 'faq':
            body_parts.append(r_faq(b, slug, sec_n, variante))

    avisos = lint_ritmo(slug, escolhidas, imagens)
    avisos += ['TRAVA DE PUBLICAÇÃO · ' + x for x in supressoes]

    if slug == 'landing':
        sec_n += 1
        body_parts.append(render_form_landing(blocos, sec_n))
    if slug == 'evento-rio':
        sec_n += 1
        body_parts.append(render_form_evento(blocos, sec_n))
    if slug in PAGE_HEAD_EXTRA:
        body_parts.append(PAGE_HEAD_EXTRA[slug])
    if fechamento_html:
        body_parts.append(fechamento_html)

    nav_links = []
    for sl in NAV_ORDER:
        cls = ' aria-current="page"' if sl == slug else ''
        nav_links.append('<a href="/%s"%s>%s</a>' % (sl, cls, esc(NAV_LABEL[sl])))

    titulo_pagina = d.get('titulo') or ''

    # O que o WhatsApp mostra no preview NÃO pode ser a nota interna do deck
    # ("Destino do QR code do estande. Captar lead qualificado. NÃO vender.").
    # Usa o h1 e a linha de apoio — copy já aprovada para a tela.
    corpo_html = ''.join(body_parts)
    _h1 = re.search(r'<h1[^>]*>(.*?)</h1>', corpo_html, re.S)
    _ld = re.search(r'class="page-hero__lead[^"]*">(.*?)</p>', corpo_html, re.S)

    def _texto(m, limite):
        if not m:
            return ''
        t = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', m.group(1))).strip()
        t = html.unescape(t)
        if len(t) <= limite:
            return t
        corte = t[:limite].rsplit(' ', 1)[0]
        return corte.rstrip(' ,;:—-') + '…'

    compartilha_titulo = _texto(_h1, 92) or titulo_pagina
    compartilha_desc = _texto(_ld, 155) or (d.get('funcao') or '')
    html_doc = TEMPLATE.format(
        titulo=esc(titulo_pagina),
        descricao=esc(d.get('funcao') or ''),
        compartilha_titulo=esc(compartilha_titulo),
        compartilha_desc=esc(compartilha_desc),
        slug=slug,
        sprite=LOGO_SPRITE,
        v_css=V_CSS, v_menu=V_MENU, v_lenis=V_LENIS,
        v_ui=V_UI, v_pages=V_PAGES, v_forms=V_FORMS,
        menu=render_menu(slug),
        body=corpo_html,
        nav_links=''.join(nav_links),
    )
    html_doc = aplicar_ancoras(slug, html_doc, blocos)
    lint_ancoras(slug, html_doc)
    return slug, html_doc, escolhidas, imagens, avisos


TEMPLATE = '''<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cinnamon Studio · {titulo}</title>
  <meta name="description" content="{compartilha_desc}">
  <meta name="theme-color" content="#22231f">
  <meta name="robots" content="noindex">
  <!-- AJUSTAR: remover noindex quando o memorial de incorporação estiver
       registrado e a comercialização, autorizada (Lei 4.591/64 art. 32). -->
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/svg+xml" href="/img/favicon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/img/favicon-16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/img/favicon-180.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Cinnamon Studio">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:title" content="{compartilha_titulo}">
  <meta property="og:description" content="{compartilha_desc}">
  <meta property="og:url" content="https://www.cinnamonstudio.com.br/{slug}">
  <meta property="og:image" content="https://www.cinnamonstudio.com.br/img/og-cinnamon.jpg">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Wordmark Cinnamon Studio sobre a fachada da torre ao entardecer.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{compartilha_titulo}">
  <meta name="twitter:description" content="{compartilha_desc}">
  <meta name="twitter:image" content="https://www.cinnamonstudio.com.br/img/og-cinnamon.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@200;300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css?v={v_css}">

  <!-- O hambúrguer NÃO pode depender de rede: /js/menu.js é <script defer>
       e, atrás do bundle do CDN, deixava o header sem botão o download
       inteiro em 4G frio. Esta linha roda antes do primeiro paint. Sem JS
       a classe não entra e a navegação segue pelo rodapé. -->
  <script>
    document.documentElement.classList.add('has-menu');
    document.addEventListener('click', function (ev) {{
      if (window.__menuPronto) return;
      var alvo = ev.target && ev.target.closest && ev.target.closest('[data-menu-toggle]');
      if (alvo) window.__menuPendente = true;
    }}, true);
  </script>

  <!-- Meta Pixel — 1953789878618915 (Cinnamon Studio).
       Fim do <head>, depois do CSS e das preconnects: o snippet injeta o
       script como async, então a conexão com o connect.facebook.net não
       disputa banda com o primeiro paint.
       AJUSTAR: sob a LGPD, disparar PageView antes do consentimento é
       decisão do cliente com o jurídico. Se precisar consentir antes,
       mover o fbq('track','PageView') para depois do aceite. -->
  <script>
  !function(f,b,e,v,n,t,s)
  {{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)}};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '1953789878618915');
  fbq('track', 'PageView');
  </script>
</head>
<body class="page">

  <noscript><img height="1" width="1" style="display:none" alt=""
    src="https://www.facebook.com/tr?id=1953789878618915&amp;ev=PageView&amp;noscript=1"></noscript>

  {sprite}

  <!-- grain global de filme — mesmo do index (o CSS o desliga no mobile) -->
  <div class="grain" aria-hidden="true"></div>

  <!-- cursor customizado — a lógica vive em js/ui.js; sem JS não aparece -->
  <div class="cursor-ring" aria-hidden="true"></div>
  <div class="cursor-dot" aria-hidden="true"></div>

  <header class="site-header">
    <a href="/" class="wordmark" aria-label="Cinnamon Studio — página inicial">
      {wordmark}
    </a>
    <!-- "Entre em contato" vive no rodapé do drawer -->
    <button class="header-menu-btn" type="button" data-menu-toggle
            aria-expanded="false" aria-controls="menu-overlay"><span class="menu-icon" aria-hidden="true"><span></span><span></span><span></span></span><span class="header-menu-btn__txt">Menu</span></button>
  </header>

  {menu}

  <main class="page">
    {body}
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="site-footer__top">
        <p class="wordmark">
          {wordmark}
          <span class="sr-only">Cinnamon Studio</span>
        </p>
        <nav class="footer-nav" aria-label="Navegação do rodapé">
          <a href="/#projeto">O Projeto</a>
          <a href="/#studio">O Studio</a>
          <a href="/#estrutura">Estrutura</a>
          <a href="/#potencial">Potencial</a>
          <a href="/#contato">Contato</a>
          <a href="https://www.instagram.com/cinnamonstudiobr/" rel="noopener">Instagram</a>
        </nav>
      </div>
      <p class="eyebrow" style="margin-top:2.4rem;">Para investidor e corretor</p>
      <nav class="footer-nav" aria-label="Material completo para investidor e corretor" style="margin-top:1rem;">{nav_links}</nav>
      <div class="site-footer__legal">
        <p>© 2026 Cinnamon Studio · Palmas – TO</p>
        <p>Incorporação: Smart Studios SPE Ltda · CNPJ 68.632.814/0001-82</p>
        <p>Intermediação: Denyse Xavier · CRECI 6089/TO</p>
        <p>Q Orla 14 – Graciosa, Avenida Parque, Quadra 01, Lote 01, s/n · CEP 77.026-035 · Palmas/TO</p>
        <!-- AJUSTAR: incluir nº do memorial de incorporação quando registrado -->
        <p>Imagens meramente ilustrativas. Memorial de incorporação não registrado — não há oferta, reserva ou venda de unidades (Lei 4.591/64, art. 32).</p>
      </div>
    </div>
  </footer>

  <script defer src="/js/menu.js?v={v_menu}"></script>
  <script defer src="https://cdn.jsdelivr.net/combine/npm/gsap@3.15.0/dist/gsap.min.js,npm/gsap@3.15.0/dist/ScrollTrigger.min.js,npm/lenis@1.3.26/dist/lenis.min.js"></script>
  <script defer src="/js/lenis-setup.js?v={v_lenis}"></script>
  <script defer src="/js/ui.js?v={v_ui}"></script>
  <script defer src="/js/pages.js?v={v_pages}"></script>
  <script defer src="/js/forms.js?v={v_forms}"></script>
</body>
</html>
'''.replace('{whatsapp}', WHATSAPP).replace('{wordmark}', WORDMARK_SVG)


def main():
    proibidas, valores_bloqueados = carregar_lint()
    gerados = []
    for fname in sorted(os.listdir(PAGINAS)):
        slug_json = fname[:-5]
        if slug_json not in URL_SLUG:
            continue
        slug, doc, variantes, imgs, avisos = build_page(fname)
        # a lista .banned (página 08) CITA de propósito as frases e o número
        # disputado, para explicar por que são proibidos — é a única
        # exceção deliberada: em qualquer outro lugar do site, essas
        # mesmas strings seguem barradas.
        doc_para_lint = re.sub(r'<ul class="banned">.*?</ul>', '', doc, flags=re.S)
        texto_visivel = re.sub(r'<[^>]+>', ' ', doc_para_lint)
        lint_html(texto_visivel, proibidas, valores_bloqueados, slug)
        # a contagem tem de olhar o documento montado: blocos injetados
        # depois do laço (PAGE_HEAD_EXTRA) escapavam do lint_ritmo
        n_claras = doc.count('section--claro')
        if n_claras > 1:
            raise SystemExit('RITMO FALHOU em %s: %d bandas claras (máximo 1 — '
                             'dois morphs de fundo disputam o mesmo tween)' % (slug, n_claras))
        out_path = os.path.join(ROOT, slug + '.html')
        open(out_path, 'w', encoding='utf-8').write(doc)
        gerados.append((slug, len(doc), variantes, imgs, avisos))
    for slug, size, variantes, imgs, avisos in gerados:
        print('%-22s %6d B  %d img  %s' % (slug, size, imgs, ' '.join(v[:4] for v in variantes)))
        for a in avisos:
            print('%-22s   aviso · coluna fixa adjacente: %s' % ('', a))
    print('%d páginas geradas, lint OK.' % len(gerados))


if __name__ == '__main__':
    main()
