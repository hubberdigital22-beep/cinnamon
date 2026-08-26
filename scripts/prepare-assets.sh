#!/usr/bin/env bash
# Cinnamon Studio - pipeline de assets
# Converte os originais de Assets/ para img/ em WebP, 2 larguras, nomes sem espaco.
# Uso:  ./scripts/prepare-assets.sh [torre|studio|planta|all]
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/Assets"
OUT="$ROOT/img"
GROUP="${1:-all}"
mkdir -p "$OUT"

# --- detecta o conversor disponivel -----------------------------------------
ENGINE=""
for c in cwebp magick convert; do command -v "$c" >/dev/null 2>&1 && { ENGINE="$c"; break; }; done
if [ -z "$ENGINE" ] && python3 -c "from PIL import Image" >/dev/null 2>&1; then ENGINE="python"; fi
if [ -z "$ENGINE" ] && command -v sips >/dev/null 2>&1; then ENGINE="sips"; fi
[ -z "$ENGINE" ] && { echo "ERRO: nenhum conversor encontrado (cwebp/magick/convert/Pillow/sips)"; exit 1; }
echo "engine: $ENGINE"

# resize_to <origem> <destino.webp> <largura> <qualidade>
resize_to() {
  local in="$1" out="$2" w="$3" q="$4"
  case "$ENGINE" in
    cwebp)   cwebp -quiet -q "$q" -resize "$w" 0 "$in" -o "$out" ;;
    magick)  magick "$in" -resize "${w}x>" -quality "$q" -strip "$out" ;;
    convert) convert "$in" -resize "${w}x>" -quality "$q" -strip "$out" ;;
    python)  python3 - "$in" "$out" "$w" "$q" <<'PY'
import sys
from PIL import Image
src, dst, w, q = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src)
im = im.convert("RGB") if im.mode in ("P", "RGBA", "LA") else im
if im.width > w:
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
im.save(dst, "WEBP", quality=q, method=5)
PY
             ;;
    sips)    out="${out%.webp}.jpg"
             cp "$in" "$out.tmp" && sips -Z "$w" -s format jpeg -s formatOptions "$q" "$out.tmp" --out "$out" >/dev/null 2>&1
             rm -f "$out.tmp" ;;
  esac
}

# emit <origem> <slug> <largura-grande> <largura-pequena>
emit() {
  local in="$1" slug="$2" big="${3:-1920}" small="${4:-960}"
  [ -f "$in" ] || { echo "  ! ausente: $in"; return; }
  resize_to "$in" "$OUT/$slug-$big.webp" "$big" 78
  resize_to "$in" "$OUT/$slug-$small.webp" "$small" 72
  local s1 s2
  s1=$(du -h "$OUT/$slug-$big.webp" 2>/dev/null | cut -f1)
  s2=$(du -h "$OUT/$slug-$small.webp" 2>/dev/null | cut -f1)
  printf "  %-18s %6s / %6s\n" "$slug" "${s1:-?}" "${s2:-?}"
}

EXT="$SRC/WhatsApp Unknown 2026-08-25 at 15.33.17"
INT="$SRC/RENDER-studio"
PLA="$SRC/PLANTA STUDIO"

if [ "$GROUP" = "torre" ] || [ "$GROUP" = "all" ]; then
  echo "[torre] fachadas"
  emit "$EXT/WhatsApp Image 2026-08-21 at 12.18.08.jpeg"     torre-angulo-01
  emit "$EXT/WhatsApp Image 2026-08-21 at 12.18.10 (2).jpeg" torre-frontal
  emit "$EXT/WhatsApp Image 2026-08-21 at 12.18.09.jpeg"     torre-02
  emit "$EXT/WhatsApp Image 2026-08-21 at 12.18.09 (1).jpeg" torre-03
  emit "$EXT/WhatsApp Image 2026-08-21 at 12.18.09 (2).jpeg" torre-04
  emit "$EXT/WhatsApp Image 2026-08-21 at 12.18.09 (3).jpeg" torre-05
  emit "$EXT/WhatsApp Image 2026-08-21 at 12.18.10.jpeg"     torre-06
  emit "$EXT/WhatsApp Image 2026-08-21 at 12.18.10 (1).jpeg" torre-07
fi

if [ "$GROUP" = "studio" ] || [ "$GROUP" = "all" ]; then
  echo "[studio] interiores"
  emit "$INT/STUDIO 01.png" studio-01
  emit "$INT/STUDIO 02.png" studio-02
  emit "$INT/studio 3a.png" studio-03
  emit "$INT/STUDIO 04.png" studio-04
  emit "$INT/STUDIO 05.png" studio-05
  emit "$INT/STUDIO 06.png" studio-06
  emit "$INT/B1.png"        banho-01
  emit "$INT/B2.png"        banho-02
fi

if [ "$GROUP" = "planta" ] || [ "$GROUP" = "all" ]; then
  echo "[planta] plantas humanizadas"
  emit "$PLA/PLANTA STUDIO4k.png"    planta     2600 1300
  emit "$PLA/PLANTA STUDIO-inter.png" planta-alt 2600 1300
fi

python3 "$ROOT/scripts/manifest.py" "$OUT"
echo "pronto -> img/"
