# -*- coding: utf-8 -*-
"""
Готовит картинки уровня «холодильник» и считает координаты мест.

Зачем нужен: в levels.js стоят числа вроде x: 0.2065 — это доли от размера
фона. Подобрать их руками невозможно, а без этого файла и пересчитать
нельзя. Хочешь подвинуть банки или добавить ряд — меняешь константы
внизу и запускаешь:

    python tools/level1.py

Скрипт перевырезает картинки в images/ и напечатает готовые строки,
которые остаётся вставить в levels.js.
"""

import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
REF = os.path.join(BASE, "рефы", "ур 1")
IMG = os.path.join(BASE, "images")

# ---------------------------------------------------------------
#  Геометрия холодильника
# ---------------------------------------------------------------
#
# ВСЕ числа — пиксели в images/fridge.png (717 x 1265), то есть УЖЕ
# в обрезанном фоне, а не в исходном холодильнике. Это важно: доли
# считаются от fridge.png, и смешивать две системы нельзя.
# Посмотреть координаты на картинке: python tools/grid.py

CROP = (75, 95, 792, 1360)      # чем фон вырезан из исходного холодильника

SHELF1 = 360                    # верхняя полка: линия, на которой стоят банки
CEILING = 113                   # потолок камеры: выше банки не ставятся
SHELF1_L, SHELF1_R = 65, 660    # края верхней полки

SHELF2 = 627                    # вторая полка: на ней стоят тарелки
PLATE_W = 275                   # ширина тарелки
PLATE_X = [77, 372]             # левые края тарелок
PLATE_INSIDE = 0.40             # доля высоты тарелки, на которой лежит еда
PLATE_INNER = 0.80              # какая часть тарелки отводится под кусочки

DRAWER_TOP, DRAWER_BOTTOM = 915, 1127
DRAWER_LEFT = (95, 345)         # левый ящик: от и до
DRAWER_RIGHT = (368, 618)       # правый ящик
DRAWER_FLOOR = 1105             # дно ящика: на нём стоят овощи
DRAWER_PAD = 30                 # запас вокруг слоя передней стенки

COLA_COLUMNS = 4                # сколько колонок банок на верхней полке
PRODUCE_COLUMNS = 4             # сколько овощей в ряд в ящике
PRODUCE_ROWS = 2
SLICE_OVERLAP = 0.35            # насколько кусочки арбуза заходят друг на друга
HALF_WIDTH = 240                # ширина половины арбуза

CUT_THRESHOLD = 24              # порог вырезания фона; больше — съедает обводку
PLATE_STRIP = 4                 # сколько раз срезать обводку у тарелки


def cut(name, out_name, strip=0):
    """Вырезает бежевый фон вокруг стикера, сохраняя белую обводку."""
    src = Image.open(os.path.join(REF, name)).convert("RGB")
    w, h = src.size

    work = src.copy()
    MARK = (255, 0, 255)
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(work, corner, MARK, thresh=CUT_THRESHOLD)

    mask = Image.new("L", (w, h), 255)
    px_work, px_mask = work.load(), mask.load()
    for y in range(h):
        for x in range(w):
            if px_work[x, y] == MARK:
                px_mask[x, y] = 0

    out = src.convert("RGBA")
    out.putalpha(mask.filter(ImageFilter.GaussianBlur(0.5)))

    # У тарелки обводка не нужна: она часть холодильника, а не наклейка
    for _ in range(strip):
        alpha = out.split()[3].filter(ImageFilter.MinFilter(9))
        out.putalpha(alpha)

    out = out.crop(out.getbbox())
    out.save(os.path.join(IMG, out_name))
    print("  %-18s %4d x %-4d" % (out_name, out.width, out.height))
    return out


print("Картинки:")
fridge_src = Image.open(os.path.join(REF, "пустой холодильник.png")).convert("RGBA")
fridge = fridge_src.crop(CROP)
fridge.save(os.path.join(IMG, "fridge.png"))
print("  %-18s %4d x %-4d" % ("fridge.png", fridge.width, fridge.height))

FW, FH = fridge.size

cola = cut("кола2.png", "cola.png")
pepper = cut("перец.png", "pepper.png")
orange = cut("апельсин.png", "orange.png")
plate = cut("тарелка.png", "plate.png", strip=PLATE_STRIP)
half = cut("арбуз половина.png", "melon-half.png")
melon_slice = cut("арбуз кусочек.png", "melon-slice.png")

front_box = (DRAWER_LEFT[0] - DRAWER_PAD, DRAWER_TOP,
             DRAWER_RIGHT[1] + DRAWER_PAD, DRAWER_BOTTOM + 26)
fridge.crop(front_box).save(os.path.join(IMG, "drawers-front.png"))
print("  %-18s %4d x %-4d" % ("drawers-front.png",
                              front_box[2] - front_box[0], front_box[3] - front_box[1]))


def fx(px):
    return px / FW


def fy(px):
    return px / FH


print("\n// --- stickers ---")

cola_h = (SHELF1 - CEILING) / 2.0 - 2
cola_w = cola_h * cola.width / cola.height
print("cola:   { width: %.4f, height: %.4f }," % (fx(cola_w), fy(cola_h)))

prod_w = (DRAWER_LEFT[1] - DRAWER_LEFT[0]) / float(PRODUCE_COLUMNS)
pepper_h = pepper.height * prod_w / pepper.width
orange_h = orange.height * prod_w / orange.width
limit = (DRAWER_FLOOR - DRAWER_TOP - 10) / float(PRODUCE_ROWS)
if pepper_h > limit:
    pepper_h = limit
if orange_h > limit:
    orange_h = limit
print("pepper: { width: %.4f, height: %.4f }," % (fx(prod_w), fy(pepper_h)))
print("orange: { width: %.4f, height: %.4f }," % (fx(prod_w), fy(orange_h)))

half_h = half.height * HALF_WIDTH / half.width
inner = PLATE_W * PLATE_INNER
step = inner / 3.0
slice_w = step * (1 + SLICE_OVERLAP)
slice_h = melon_slice.height * slice_w / melon_slice.width
print("half:   { width: %.4f, height: %.4f }," % (fx(HALF_WIDTH), fy(half_h)))
print("slice:  { width: %.4f, height: %.4f }," % (fx(slice_w), fy(slice_h)))

plate_h = plate.height * PLATE_W / plate.width
print("\n// --- decor: тарелки ---")
for x in PLATE_X:
    print("{ image: 'images/plate.png', x: %.4f, bottom: %.4f, width: %.4f }," %
          (fx(x), fy(SHELF2), fx(PLATE_W)))

print("\n// --- overlays: передняя стенка ящиков ---")
print("{ image: 'images/drawers-front.png', x: %.4f, y: %.4f, width: %.4f }," %
      (fx(front_box[0]), fy(front_box[1]), fx(front_box[2] - front_box[0])))

print("\n// --- slots: банки на верхней полке ---")
# блок из колонок стоит по центру левой половины полки
middle = (SHELF1_L + SHELF1_R) / 2.0
block = cola_w * COLA_COLUMNS
cola_x0 = SHELF1_L + ((middle - SHELF1_L) - block) / 2.0
for row in range(2):
    bottom = SHELF1 - row * cola_h
    for col in range(COLA_COLUMNS):
        sid = "cola-%s-%d" % ("low" if row == 0 else "high", col + 1)
        extra = "" if row == 0 else ", needs: 'cola-low-%d'" % (col + 1)
        seed = ", filled: true" if (row == 0 and col == 0) else ""
        print("{ id: '%s', sticker: 'cola', x: %.4f, bottom: %.4f%s%s }," %
              (sid, fx(cola_x0 + col * cola_w), fy(bottom), extra, seed))

print("\n// --- slots: овощи в ящиках ---")
for kind, bounds, height in (("pepper", DRAWER_LEFT, pepper_h),
                             ("orange", DRAWER_RIGHT, orange_h)):
    x0 = bounds[0] + ((bounds[1] - bounds[0]) - prod_w * PRODUCE_COLUMNS) / 2.0
    for row in range(PRODUCE_ROWS):
        for col in range(PRODUCE_COLUMNS):
            sid = "%s-%d-%d" % (kind, row + 1, col + 1)
            extra = "" if row == 0 else ", needs: '%s-%d-%d'" % (kind, row, col + 1)
            seed = ", filled: true" if (row == 0 and col == 0) else ""
            print("{ id: '%s', sticker: '%s', x: %.4f, bottom: %.4f%s%s }," %
                  (sid, kind, fx(x0 + col * prod_w), fy(DRAWER_FLOOR - row * height),
                   extra, seed))

print("\n// --- slots: арбуз на тарелках ---")
inside = SHELF2 - plate_h * PLATE_INSIDE
for name, px in (("left", PLATE_X[0]), ("right", PLATE_X[1])):
    x = px + (PLATE_W - HALF_WIDTH) / 2.0
    print("{ id: 'half-%s', sticker: 'half', group: 'plate-%s', x: %.4f, bottom: %.4f }," %
          (name, name, fx(x), fy(inside)))
for name, px in (("left", PLATE_X[0]), ("right", PLATE_X[1])):
    left = px + (PLATE_W - inner) / 2.0
    for i in range(3):
        x = left + step * (i + 0.5) - slice_w / 2.0
        print("{ id: 'slice-%s-%d', sticker: 'slice', group: 'plate-%s', x: %.4f, bottom: %.4f }," %
              (name, i + 1, name, fx(x), fy(inside)))
