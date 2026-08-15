# -*- coding: utf-8 -*-
"""
Рисует линейку поверх фона холодильника — чтобы снимать координаты полок,
ящиков и тарелок для tools/level1.py.

    python tools/grid.py            вся картинка, шаг 50
    python tools/grid.py 850 1150   только полоса по высоте, шаг 25

Результат кладётся в tools/grid-preview.png.
"""

import os
import sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(os.path.dirname(HERE), "images")

img = Image.open(os.path.join(IMG, "fridge.png")).convert("RGB")
W, H = img.size

top = int(sys.argv[1]) if len(sys.argv) > 2 else 0
bottom = int(sys.argv[2]) if len(sys.argv) > 2 else H
step = 25 if len(sys.argv) > 2 else 50

draw = ImageDraw.Draw(img)

for y in range(top, bottom, step):
    strong = y % (step * 4) == 0
    draw.line([(0, y), (W, y)], fill=(220, 40, 40) if strong else (150, 190, 230))
    draw.text((4, y + 2), str(y), fill=(200, 20, 20))

for x in range(0, W, step):
    strong = x % (step * 4) == 0
    draw.line([(x, top), (x, bottom)], fill=(220, 40, 40) if strong else (150, 190, 230))
    draw.text((x + 3, top + 4), str(x), fill=(200, 20, 20))

out = os.path.join(HERE, "grid-preview.png")
img.crop((0, top, W, bottom)).save(out)
print("Картинка %d x %d, линейка от %d до %d" % (W, H, top, bottom))
print("Сохранено:", out)
