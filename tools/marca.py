#!/usr/bin/env python3
"""Firma con la marca MR el arte del sistema (herramienta común: Trabajo LOGO/marca/marca.py).

  python3 tools/marca.py            firma lo que falte (anota lo firmado en tools/marcadas.json para no firmar dos veces)
  python3 tools/marca.py --cajas    solo imprime la caja del brillo animado de cada escena (para `marca` en module/themes.mjs)

La portada se ve recortada «a cubrir» la pantalla, así que la marca de las escenas no va en la esquina de la imagen
sino en la de la zona que se ve en cualquier pantalla de proporción 1,6 a 2,0 (portátiles y monitores panorámicos).
Retrato por defecto: esquina. Token (figura con alfa): discreta en la manga.
"""
import json, sys
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ.parent.parent / "Trabajo LOGO" / "marca"))
import marca  # noqa: E402

REGISTRO = RAIZ / "tools" / "marcadas.json"
ANCHO_ESCENA = 1920   # module/themes.mjs: toda escena mide 1920 de ancho y conserva la proporción de su imagen


def zona_segura(w, h, estrecha=1.6, ancha=2.0):
    """Rectángulo (x, y, ancho, alto) de la imagen que queda a la vista con el encuadre «cubrir» en pantallas de esas proporciones."""
    ar = w / h
    cx = (1 - estrecha / ar) / 2 if ar > estrecha else 0
    cy = (1 - ar / ancha) / 2 if ar < ancha else 0
    x, y = round(w * cx), round(h * cy)
    return x, y, w - 2 * x, h - 2 * y


def firmar_escena(im):
    x, y, w, h = zona_segura(*im.size)
    trozo = marca.esquina(im.crop((x, y, x + w, y + h)))
    im = im.copy(); im.paste(trozo, (x, y)); return im


def caja_escena(w, h):
    """Caja del brillo animado en coordenadas de la escena de Foundry (1920 × alto proporcional)."""
    k = ANCHO_ESCENA / w
    x, y, sw, sh = (round(v * k) for v in zona_segura(w, h))
    bx, by, bw, bh = marca.caja_animada(sw, sh)
    return [x + bx, y + by, bw, bh]


def main():
    hechas = set(json.loads(REGISTRO.read_text())) if REGISTRO.exists() else set()
    escenas = sorted((RAIZ / "assets" / "scenes").glob("*.webp"))
    if "--cajas" in sys.argv:
        for f in escenas:
            print(f.stem, caja_escena(*Image.open(f).size))
        return
    trabajos = [(f, firmar_escena) for f in escenas]
    trabajos += [(RAIZ / "assets" / "portrait.webp", marca.esquina), (RAIZ / "assets" / "token.webp", marca.hombro)]
    for f, firmar in trabajos:
        rel = str(f.relative_to(RAIZ))
        if rel in hechas: continue
        firmar(Image.open(f)).save(f, "WEBP", quality=90, method=6)
        hechas.add(rel); print("firmada", rel)
    REGISTRO.write_text(json.dumps(sorted(hechas), indent=1, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
