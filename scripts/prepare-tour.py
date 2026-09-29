#!/usr/bin/env python3
"""Cinnamon Studio - pipeline do tour 360.

Entrada: o HTML autocontido do fornecedor (panoramas equirretangulares
embutidos em base64) OU uma pasta com os equirretangulares soltos
(<slug>.jpg | .jpeg | .png). Saida em img/, por ambiente:

  pano-<slug>-<largura>.jpg    o original, byte a byte - fallback e fonte
  pano-<slug>-<largura>.avif   4:4:4 q80 - o que o site carrega
  pano-<slug>-thumb.webp       240x160 - recorte central (a vista inicial)

Por que AVIF aqui, e nao o WebP do resto do site: o panorama e ampliado
de 4 a 10 vezes na tela, entao o artefato de compressao amplia junto.
Medido no gourmet (JPEG original 776 KB): WebP q92 = 607 KB a 36,2 dB;
AVIF 4:4:4 q80 = 459 KB a 40,7 dB. O WebP so tem croma 4:2:0 e perde
justamente a textura de madeira e pedra que estes renders tem de sobra.

Uso:  python3 scripts/prepare-tour.py <arquivo.html | pasta>
"""
import base64
import io
import os
import re
import shutil
import subprocess
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "img")

MAX_W = 4096          # teto de textura seguro em GPU de celular
AVIF_Q = 80
THUMB = (240, 160)    # 2x dos 120x80 exibidos
# recorte do thumb: a janela 3:2 em torno do centro do equirretangular,
# que e para onde a camera aponta ao abrir o ambiente (yaw 0, pitch 0)
THUMB_W, THUMB_H = 0.375, 0.5

EMBUTIDO = re.compile(r'"([a-z0-9-]+)"\s*:\s*"data:image/jpeg;base64,([A-Za-z0-9+/=]+)"')


def fontes(entrada):
    """Devolve [(slug, bytes, e_jpeg)] a partir do HTML ou da pasta."""
    if os.path.isdir(entrada):
        achados = []
        for nome in sorted(os.listdir(entrada)):
            slug, ext = os.path.splitext(nome)
            if ext.lower() not in (".jpg", ".jpeg", ".png"):
                continue
            with open(os.path.join(entrada, nome), "rb") as fh:
                achados.append((slug.lower(), fh.read(), ext.lower() != ".png"))
        return achados
    with open(entrada, encoding="utf-8") as fh:
        html = fh.read()
    return [(slug, base64.b64decode(b64), True) for slug, b64 in EMBUTIDO.findall(html)]


def para_avif(jpg, avif):
    if shutil.which("avifenc"):
        subprocess.run(
            ["avifenc", "-q", str(AVIF_Q), "-y", "444", "-s", "3", "-j", "all", jpg, avif],
            check=True, stdout=subprocess.DEVNULL,
        )
    else:
        Image.open(jpg).save(avif, "AVIF", quality=AVIF_Q, subsampling="4:4:4", speed=3)


def kb(caminho):
    return "%d KB" % round(os.path.getsize(caminho) / 1024)


def main():
    if len(sys.argv) != 2 or not os.path.exists(sys.argv[1]):
        sys.exit(__doc__)
    itens = fontes(sys.argv[1])
    if not itens:
        sys.exit("ERRO: nenhum panorama encontrado em %s" % sys.argv[1])
    os.makedirs(OUT, exist_ok=True)

    for slug, dados, e_jpeg in itens:
        im = Image.open(io.BytesIO(dados))
        w, h = im.size
        if abs(w / h - 2) > 0.01:
            print("  ! %s: %dx%d nao e equirretangular 2:1 - ignorado" % (slug, w, h))
            continue

        intocado = e_jpeg and w <= MAX_W
        if not intocado:
            im = im.convert("RGB")
            if w > MAX_W:
                im = im.resize((MAX_W, MAX_W // 2), Image.LANCZOS)
                w, h = im.size

        base = os.path.join(OUT, "pano-%s-%d" % (slug, w))
        if intocado:
            with open(base + ".jpg", "wb") as fh:
                fh.write(dados)
        else:
            im.save(base + ".jpg", "JPEG", quality=95, subsampling=0, optimize=True)
        para_avif(base + ".jpg", base + ".avif")

        cw, ch = round(w * THUMB_W), round(h * THUMB_H)
        x0, y0 = (w - cw) // 2, (h - ch) // 2
        thumb = os.path.join(OUT, "pano-%s-thumb.webp" % slug)
        im.convert("RGB").crop((x0, y0, x0 + cw, y0 + ch)).resize(THUMB, Image.LANCZOS) \
            .save(thumb, "WEBP", quality=80, method=6)

        print("  %-18s %dx%d  jpg %s  avif %s  thumb %s" % (
            slug, w, h, kb(base + ".jpg"), kb(base + ".avif"), kb(thumb)), flush=True)

    subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "manifest.py"), OUT], check=True)
    print("pronto -> img/")


if __name__ == "__main__":
    main()
