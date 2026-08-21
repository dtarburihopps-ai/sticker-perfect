# -*- coding: utf-8 -*-
"""
Готовит картинки уровня «вендинг» и считает места на полках.

Уровень устроен как холодильник: у каждого места свой товар. Но подсказки
в игре нет ни одной — ни затравок, ни надписей. Игрок понимает, куда что
идёт, только по размеру: свой товар заполняет ячейку целиком, чужой
в неё не влезает или болтается.

    python tools/vending.py

Скрипт вырезает товар с листов, приводит его к одному размеру внутри
вида, собирает слой стекла, печатает строки для levels.js и рисует
tools/vending-preview.png.
"""

import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
REF = os.path.join(BASE, "рефы", "ур3")
IMG = os.path.join(BASE, "images")

# ---------------------------------------------------------------
#  Геометрия автомата
# ---------------------------------------------------------------
#
# ВСЕ числа — пиксели в рефы/ур3/автомат.png (971 x 1619). Сняты по самой
# картинке: у стекла изнутри есть тёмный кант, он и есть край зоны.
# Полки — по светлым доскам между отсеками.

ZONE_L, ZONE_R = 151, 684            # куда можно ставить товар по ширине
SHELVES = [                          # просветы полок: потолок и пол отсека
    (169, 357),
    (377, 546),
    (570, 745),
    (767, 904),
    (930, 1195),
]

GLASS = (160, 1197)                  # стекло по вертикали, для слоя поверх товара

# Что на какой полке и сколько штук в ряду. Ряд делится на равные ячейки
# без остатка, поэтому крайние предметы прижаты к стенкам.
#
# Порядок по величине задан Дашей: батончик мельче всех, дальше банка,
# потом пакетик и чипсы, бутылка крупнее всех.
PLAN = [
    ("bar",    "батончики2.png", 7),
    ("can",    "банки.png",      6),
    ("chips",  "чипсы.png",      4),
    ("pouch",  "пакетики2.png",  5),
    ("bottle", "бутылки2.png",   5),
]

CUT_THRESHOLD = 24                   # порог вырезания фона листов

# Стекло: слой поверх товара. Числа — прозрачность в самом PNG; в игре
# он дополнительно гасится до 0.30 в style.css, класс .overlay.
GLASS_TINT = (150, 190, 210, 80)
GLASS_SHEEN = (255, 255, 255, 88)


def cut(name):
    """Убирает фон листа, сохраняя белую обводку наклеек."""
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
    return out


def split(sheet):
    """Режет лист на предметы по пустым колонкам и приводит их к одному размеру.

    Одинаковый размер обязателен: предметы стоят в ряд встык, и разница
    в пару пикселей читается как кривой ряд."""
    alpha = sheet.split()[3].load()
    w, h = sheet.size

    runs, run = [], None
    for x in range(w):
        ink = sum(1 for y in range(0, h, 4) if alpha[x, y] > 60)
        if ink > 0 and run is None:
            run = x
        elif ink == 0 and run is not None:
            if x - run > 30:
                runs.append((run, x))
            run = None
    if run is not None and w - run > 30:
        runs.append((run, w))

    pieces = []
    for left, right in runs:
        piece = sheet.crop((left, 0, right, h))
        pieces.append(piece.crop(piece.getbbox()))

    size = (max(p.width for p in pieces), max(p.height for p in pieces))
    return [p.resize(size, Image.LANCZOS) for p in pieces]


print("Картинки:")

machine = Image.open(os.path.join(REF, "автомат.png")).convert("RGB")
machine.save(os.path.join(IMG, "vending.png"))
BG_W, BG_H = machine.size
print("  %-20s %4d x %-4d" % ("vending.png", BG_W, BG_H))

# --- товар -----------------------------------------------------

goods = {}
for kind, sheet_name, count in PLAN:
    pieces = split(cut(sheet_name))
    goods[kind] = pieces
    for i, piece in enumerate(pieces):
        piece.save(os.path.join(IMG, "vend-%s-%d.png" % (kind, i + 1)))
    print("  %-20s %4d x %-4d  x%d дизайнов, мест %d"
          % ("vend-%s-*.png" % kind, pieces[0].width, pieces[0].height,
             len(pieces), count))

# --- стекло поверх товара --------------------------------------
#
# Тот же приём, что с передней стенкой ящиков в холодильнике: полупрозрачный
# слой сверху, и товар выглядит стоящим внутри, а не наклеенным на стекло.

glass = Image.new("RGBA", (ZONE_R - ZONE_L, GLASS[1] - GLASS[0]), (0, 0, 0, 0))
draw = ImageDraw.Draw(glass)
draw.rectangle([0, 0, glass.width, glass.height], fill=GLASS_TINT)
draw.polygon([(20, glass.height), (240, 0), (330, 0), (110, glass.height)],
             fill=GLASS_SHEEN)
glass.filter(ImageFilter.GaussianBlur(2)).save(os.path.join(IMG, "vending-glass.png"))
print("  %-20s %4d x %-4d" % ("vending-glass.png", glass.width, glass.height))


def fx(px):
    return px / float(BG_W)


def fy(px):
    return px / float(BG_H)


print("\n// --- цвет стены ---")
print("wall: '#%02X%02X%02X'," % machine.getpixel((6, 6)))

print("\n// --- товар ---")
print("// Ширина = ширина ячейки, высота = просвет полки. Картинка тянется")
print("// на разницу: щели в ряду видно сразу, а несколько процентов — нет.")
for i, (kind, _, count) in enumerate(PLAN):
    top, bottom = SHELVES[i]
    cell = (ZONE_R - ZONE_L) / float(count)
    natural = (bottom - top) / (goods[kind][0].height / float(goods[kind][0].width))
    print("%-7s { width: %.4f, height: %.4f },   // %d шт, растяжение %+.0f%%"
          % (kind + ":", fx(cell), fy(bottom - top), count,
             (cell / natural - 1) * 100))

print("\n// --- стекло ---")
print("overlays: [")
print("  { image: 'web/vending-glass.webp', x: %.4f, y: %.4f, width: %.4f }"
      % (fx(ZONE_L), fy(GLASS[0]), fx(ZONE_R - ZONE_L)))
print("],")

print("\n// --- места ---")
print("slots: [")
for i, (kind, _, count) in enumerate(PLAN):
    top, bottom = SHELVES[i]
    cell = (ZONE_R - ZONE_L) / float(count)
    for k in range(count):
        print("  { id: '%s-%d', sticker: '%s', x: %.4f, bottom: %.4f },"
              % (kind, k + 1, kind, fx(ZONE_L + cell * k), fy(bottom)))
print("],")

print("\n// --- полоса внизу: товар вперемешку ---")
print("tray: [")
order = []
for kind, _, count in PLAN:
    for k in range(count):
        order.append((kind, k % len(goods[kind]) + 1))

# перемешиваем так, чтобы соседние были разного вида: игрок листает полосу
# и должен видеть выбор, а не семь батончиков подряд
mixed, pools = [], {k: [o for o in order if o[0] == k] for k, _, _ in PLAN}
while any(pools.values()):
    for kind in list(pools):
        if pools[kind]:
            mixed.append(pools[kind].pop(0))
for kind, n in mixed:
    print("  { type: '%s', image: 'web/vend-%s-%d.webp' }," % (kind, kind, n))
print("],")
print("// всего предметов:", len(mixed))


# --- превью ---------------------------------------------------

preview = machine.convert("RGBA")
for i, (kind, _, count) in enumerate(PLAN):
    top, bottom = SHELVES[i]
    cell = (ZONE_R - ZONE_L) / float(count)
    for k in range(count):
        art = goods[kind][k % len(goods[kind])]
        art = art.resize((int(round(cell)), bottom - top), Image.LANCZOS)
        preview.alpha_composite(art, (int(round(ZONE_L + cell * k)), top))

overlay = Image.open(os.path.join(IMG, "vending-glass.png")).convert("RGBA")
faded = overlay.copy()
faded.putalpha(overlay.split()[3].point(lambda v: int(v * 0.30)))
preview.alpha_composite(faded, (ZONE_L, GLASS[0]))

preview.convert("RGB").save(os.path.join(HERE, "vending-preview.png"))
print("\nПревью: tools/vending-preview.png")
