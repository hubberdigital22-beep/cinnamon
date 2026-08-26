import json, os, sys
from PIL import Image
out = sys.argv[1]
data = {}
for f in sorted(os.listdir(out)):
    if not f.endswith((".webp", ".jpg")):
        continue
    p = os.path.join(out, f)
    try:
        im = Image.open(p)
    except Exception:
        continue
    w, h = im.size
    px = im.convert("RGB").resize((1, 1), Image.LANCZOS).getpixel((0, 0))
    data[f] = {
        "w": w, "h": h,
        "ratio": round(w / h, 4),
        "avg": "#%02x%02x%02x" % px,
        "kb": round(os.path.getsize(p) / 1024),
    }
with open(os.path.join(out, "manifest.json"), "w") as fh:
    json.dump(data, fh, indent=1, ensure_ascii=False)
print(f"manifest.json: {len(data)} imagens")
