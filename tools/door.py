# -*- coding: utf-8 -*-
"""
Готовит картинки уровня «дверца» и считает область, куда клеятся магниты.

Уровень устроен не так, как холодильник: заранее посчитанных мест здесь нет,
магнит клеится куда угодно. Поэтому скрипт считает не координаты мест,
а ОДНУ область двери (и две выемки в ней — ручка и защёлка) плюс размер
магнита. Всё остальное решает игра во время игры.

    python tools/door.py

Скрипт перевырезает картинки в images/, печатает готовые строки для
levels.js и рисует tools/door-preview.png — на нём видно, куда можно клеить.
"""

import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
REF = os.path.join(BASE, "рефы", "ур1")
IMG = os.path.join(BASE, "images")

# ---------------------------------------------------------------
#  Геометрия дверцы
# ---------------------------------------------------------------
#
# ВСЕ числа — пиксели в исходной картинке рефы/ур1/дверца.png (1122 x 1402).
# Сняты по тёмным контурным линиям самого рисунка, не на глаз.
# Доли для levels.js считаются уже от обрезанного фона door.png.

CROP = (130, 40, 990, 1402)     # чем фон вырезается из исходной дверцы

PANEL = (225, 167, 888, 1211)   # утопленная панель двери: слева, сверху, справа, снизу
HANDLE = (251, 405, 290, 770)   # ручка
LATCH = (724, 215, 847, 255)    # защёлка в правом верхнем углу

PANEL_PAD = 14                  # отступ от края панели: магнит не лезет на кант
HOLE_PAD = 16                   # запас вокруг ручки и защёлки

# Магниты. Размер задаётся не шириной, а стороной квадрата такой же площади:
# иначе высокий овал с котом выглядел бы вдвое крупнее звезды при одной ширине.
MAGNET_SIDE = 125               # сторона «равного квадрата», пиксели дверцы
                                # Было 150 — магниты сидели слишком тесно:
                                # свободного места оставалось мало, и попытка
                                # приклеить в занятое место слишком часто
                                # кончалась дрожанием вместо сдвига рядом
MAGNET_GAP = 10                 # невидимый зазор вокруг магнита, чтобы не липли встык

CUT_THRESHOLD = 10              # порог вырезания белого фона листа магнитов;
                                # больше — съедает белую обводку самих наклеек

# Затравка: магнит, который висит на двери с самого начала. Он показывает
# игроку, что это магниты и что дверь — рабочая поверхность.
# Имя с листа и центр магнита в пикселях дверцы.
SEED = ("cat", 430, 380)

# Порядок магнитов на листе: сверху слева направо, потом нижний ряд
MAGNET_NAMES = [
    "cat", "daisy", "photo", "heart", "egg",
    "toast", "tulip", "mug", "plant", "star",
]


def cut_sheet(name, threshold):
    """Убирает фон листа, оставляя белую обводку наклеек."""
    src = Image.open(os.path.join(REF, name)).convert("RGB")
    w, h = src.size

    work = src.copy()
    MARK = (255, 0, 255)
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(work, corner, MARK, thresh=threshold)

    mask = Image.new("L", (w, h), 255)
    px_work, px_mask = work.load(), mask.load()
    for y in range(h):
        for x in range(w):
            if px_work[x, y] == MARK:
                px_mask[x, y] = 0

    out = src.convert("RGBA")
    out.putalpha(mask.filter(ImageFilter.GaussianBlur(0.5)))
    return out


def bands(values, limit, gap):
    """Полосы, где чего-то есть: values — сколько непрозрачного в строке/столбце."""
    out, run = [], None
    for i, v in enumerate(values):
        if v > limit and run is None:
            run = i
        elif v <= limit and run is not None:
            if i - run > gap:
                out.append((run, i))
            run = None
    if run is not None and len(values) - run > gap:
        out.append((run, len(values)))
    return out


def split_sheet(sheet):
    """Режет лист на отдельные наклейки: сначала на ряды, потом каждый ряд на штуки."""
    alpha = sheet.split()[3].load()
    w, h = sheet.size

    rows = bands([sum(1 for x in range(0, w, 3) if alpha[x, y] > 60) for y in range(h)], 2, 40)

    pieces = []
    for top, bottom in rows:
        strip = sheet.crop((0, top, w, bottom))
        a = strip.split()[3].load()
        sh = bottom - top
        columns = bands(
            [sum(1 for y in range(0, sh, 3) if a[x, y] > 60) for x in range(w)], 2, 40)

        for left, right in columns:
            piece = strip.crop((left, 0, right, sh))
            pieces.append(piece.crop(piece.getbbox()))

    return pieces


print("Картинки:")

door_src = Image.open(os.path.join(REF, "дверца.png")).convert("RGBA")
door = door_src.crop(CROP)
door.save(os.path.join(IMG, "door.png"))
print("  %-18s %4d x %-4d" % ("door.png", door.width, door.height))

DW, DH = door.size

sheet = cut_sheet("магниты.png", CUT_THRESHOLD)
pieces = split_sheet(sheet)

if len(pieces) != len(MAGNET_NAMES):
    raise SystemExit("На листе найдено %d наклеек, а имён %d — проверь порог резки"
                     % (len(pieces), len(MAGNET_NAMES)))

magnets = []
for name, piece in zip(MAGNET_NAMES, pieces):
    piece.save(os.path.join(IMG, "magnet-%s.png" % name))
    magnets.append((name, piece))
    print("  %-18s %4d x %-4d" % ("magnet-%s.png" % name, piece.width, piece.height))


def dx(px):
    return (px - CROP[0]) / float(DW)


def dy(px):
    return (px - CROP[1]) / float(DH)


# --- Область, куда можно клеить ---------------------------------

area = (PANEL[0] + PANEL_PAD, PANEL[1] + PANEL_PAD,
        PANEL[2] - PANEL_PAD, PANEL[3] - PANEL_PAD)

# Выемки. Ручка вырезается вместе с полоской слева от неё: между ручкой
# и кантом панели остаётся 26 пикселей — туда всё равно ничего не встанет.
holes = [
    (area[0], HANDLE[1] - HOLE_PAD, HANDLE[2] + HOLE_PAD, HANDLE[3] + HOLE_PAD),
    (LATCH[0] - HOLE_PAD, area[1], area[2], LATCH[3] + HOLE_PAD),
]

wall = door.convert("RGB").getpixel((2, 2))
print("\n// --- цвет стены ---")
print("wall: '#%02X%02X%02X'," % wall)

print("\n// --- область двери ---")
print("area: { x: %.4f, y: %.4f, width: %.4f, height: %.4f }," %
      (dx(area[0]), dy(area[1]), (area[2] - area[0]) / float(DW),
       (area[3] - area[1]) / float(DH)))

print("holes: [")
for hole in holes:
    print("  { x: %.4f, y: %.4f, width: %.4f, height: %.4f }," %
          (dx(hole[0]), dy(hole[1]), (hole[2] - hole[0]) / float(DW),
           (hole[3] - hole[1]) / float(DH)))
print("],")

print("\n// --- магниты ---")
for name, piece in magnets:
    ratio = piece.width / float(piece.height)
    # Сторона равного по площади квадрата — MAGNET_SIDE, отсюда ширина и высота
    width = MAGNET_SIDE * (ratio ** 0.5)
    height = width / ratio
    print("%-6s { image: 'images/magnet-%s.png', width: %.4f, height: %.4f }," %
          (name + ":", name, width / DW, height / DH))

print("\ngap: %.4f,   // невидимый зазор между магнитами" % (MAGNET_GAP / float(DW)))


def magnet_size(piece):
    """Ширина и высота магнита в пикселях дверцы."""
    ratio = piece.width / float(piece.height)
    width = MAGNET_SIDE * (ratio ** 0.5)
    return width, width / ratio


seed_name, seed_cx, seed_cy = SEED
seed_piece = dict(magnets)[seed_name]
seed_w, seed_h = magnet_size(seed_piece)

print("\n// --- затравка ---")
print("placed: [")
print("  { sticker: '%s', x: %.4f, y: %.4f }," %
      (seed_name, dx(seed_cx - seed_w / 2), dy(seed_cy - seed_h / 2)))
print("],")


# --- Превью: видно, куда можно клеить ---------------------------

preview = door.convert("RGBA")
paint = Image.new("RGBA", preview.size, (0, 0, 0, 0))
brush = ImageDraw.Draw(paint)

brush.rectangle([area[0] - CROP[0], area[1] - CROP[1],
                 area[2] - CROP[0], area[3] - CROP[1]],
                fill=(120, 200, 130, 70), outline=(60, 150, 80, 200), width=4)

for hole in holes:
    brush.rectangle([hole[0] - CROP[0], hole[1] - CROP[1],
                     hole[2] - CROP[0], hole[3] - CROP[1]],
                    fill=(220, 90, 90, 90), outline=(180, 40, 40, 200), width=4)

preview = Image.alpha_composite(preview, paint)

# Затравка — на своём настоящем месте: по превью видно, не мешает ли она
# ручке и не жмётся ли к краю
small = seed_piece.resize((int(seed_w), int(seed_h)), Image.LANCZOS)
preview.alpha_composite(small, (int(seed_cx - seed_w / 2) - CROP[0],
                                int(seed_cy - seed_h / 2) - CROP[1]))

preview.save(os.path.join(HERE, "door-preview.png"))
print("\nПревью: tools/door-preview.png")
