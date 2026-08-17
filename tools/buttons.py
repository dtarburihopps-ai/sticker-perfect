# -*- coding: utf-8 -*-
"""
Готовит картинки уровня «пуговицы» и считает шестнадцать мест в ящике.

Уровень на два признака: 4 формы на 4 цвета, все 16 сочетаний. Разложить
можно двумя правильными способами — по форме или по цвету, — и игра не
подсказывает, каким именно. Она вообще молчит, пока раскладка не сойдётся.

    python tools/buttons.py

Скрипт режет лист пуговиц, центрует каждую в общем квадрате, печатает
строки для levels.js и рисует tools/buttons-preview.png.
"""

import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
REF = os.path.join(BASE, "рефы", "ур5")
IMG = os.path.join(BASE, "images")

BOX_FILE = "f4f53f2b-4afe-4d13-97c3-4b179cb75a77.png"
SHEET_FILE = "88c23abf-b6c2-4bf9-8806-9b446bb072a8.png"

# ---------------------------------------------------------------
#  Геометрия ящика
# ---------------------------------------------------------------
#
# ВСЕ числа — пиксели исходной картинки ящика (971 x 1619). Отсеки сняты
# по дну: стенки нарисованы толстыми и видны сверху, пуговица лежит
# на дне, а не на стенке.

CELLS = [
    (118, 415, 470, 770),      # левый верхний
    (500, 415, 855, 770),      # правый верхний
    (118, 820, 470, 1175),     # левый нижний
    (500, 820, 855, 1175),     # правый нижний
]

PAD = 14                       # воздух вокруг пуговицы внутри её четвертинки

# Порядок на листе: строки — формы, столбцы — цвета
SHAPES = ["circle", "flower", "square", "heart"]
COLOURS = ["yellow", "coral", "violet", "graphite"]

CUT_THRESHOLD = 18             # порог вырезания фона листа


def cut(name, thresh=CUT_THRESHOLD):
    """Убирает фон картинки, сохраняя белую обводку наклеек."""
    src = Image.open(os.path.join(REF, name)).convert("RGB")
    w, h = src.size

    work = src.copy()
    MARK = (255, 0, 255)
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(work, corner, MARK, thresh=thresh)

    mask = Image.new("L", (w, h), 255)
    px_work, px_mask = work.load(), mask.load()
    for y in range(h):
        for x in range(w):
            if px_work[x, y] == MARK:
                px_mask[x, y] = 0

    out = src.convert("RGBA")
    out.putalpha(mask.filter(ImageFilter.GaussianBlur(0.5)))
    return out


def bands(values, gap=20):
    out, run = [], None
    for i, v in enumerate(values):
        if v > 3 and run is None:
            run = i
        elif v <= 3 and run is not None:
            if i - run > gap:
                out.append((run, i))
            run = None
    if run is not None:
        out.append((run, len(values)))
    return out


def split16(sheet):
    """Режет лист 4x4 и центрует каждую пуговицу в общем квадрате.

    Именно центрует, а не растягивает: пуговицы нарисованы с разбросом
    в пять процентов, и круг, растянутый на эти проценты, перестаёт быть
    кругом. Габарит при этом у всех одинаковый, а места — равные."""
    alpha = sheet.split()[3]
    px = alpha.load()
    w, h = sheet.size

    columns = bands([sum(1 for y in range(0, h, 4) if px[x, y] > 60) for x in range(w)])
    rows = bands([sum(1 for x in range(0, w, 4) if px[x, y] > 60) for y in range(h)])

    if len(columns) != 4 or len(rows) != 4:
        raise SystemExit("На листе найдено %d столбцов и %d строк вместо 4x4"
                         % (len(columns), len(rows)))

    pieces = []
    for top, bottom in rows:
        for left, right in columns:
            piece = sheet.crop((left, top, right, bottom))
            pieces.append(piece.crop(piece.getbbox()))

    side = max(max(p.width, p.height) for p in pieces)
    out = []
    for piece in pieces:
        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        canvas.alpha_composite(piece, ((side - piece.width) // 2,
                                       (side - piece.height) // 2))
        out.append(canvas)

    spread = (side - min(p.width for p in pieces), side - min(p.height for p in pieces))
    return out, side, spread


print("Картинки:")

box = Image.open(os.path.join(REF, BOX_FILE)).convert("RGB")
box.save(os.path.join(IMG, "buttons-box.png"))
BG_W, BG_H = box.size
print("  %-24s %4d x %-4d" % ("buttons-box.png", BG_W, BG_H))

pieces, side, spread = split16(cut(SHEET_FILE))

names = []
for r, shape in enumerate(SHAPES):
    for c, colour in enumerate(COLOURS):
        name = "%s-%s" % (shape, colour)
        pieces[r * 4 + c].save(os.path.join(IMG, "button-%s.png" % name))
        names.append(name)
print("  %-24s %4d x %-4d  x16  (разброс на листе %d x %d px)"
      % ("button-*.png", side, side, spread[0], spread[1]))


def fx(px):
    return px / float(BG_W)


def fy(px):
    return px / float(BG_H)


# Пуговица занимает четвертинку отсека без воздуха по краям
cw = (CELLS[0][2] - CELLS[0][0]) / 2.0
ch = (CELLS[0][3] - CELLS[0][1]) / 2.0
BUTTON = min(cw, ch) - PAD * 2

print("\n// --- цвет стола ---")
print("wall: '#%02X%02X%02X'," % box.getpixel((6, 6)))

print("\n// --- пуговицы ---")
print("// shape и colour — те два признака, по которым игрок сортирует.")
print("// Третьего признака у пуговиц нет нарочно: размер и число дырочек")
print("// у всех одинаковые, иначе сортировать начнут по ним.")
for name in names:
    shape, colour = name.split("-")
    print("'%s': { image: 'images/button-%s.png', width: %.4f, height: %.4f, shape: '%s', colour: '%s' },"
          % (name, name, fx(BUTTON), fy(BUTTON), shape, colour))

print("\nslotSize: { width: %.4f, height: %.4f }," % (fx(BUTTON), fy(BUTTON)))

print("\n// --- места: четыре отсека по четыре ---")
print("slots: [")
for i, (left, top, right, bottom) in enumerate(CELLS):
    box_w = (right - left) / 2.0
    box_h = (bottom - top) / 2.0
    for k in range(4):
        x = left + box_w * (k % 2) + (box_w - BUTTON) / 2
        y = top + box_h * (k // 2) + (box_h - BUTTON) / 2
        print("  { id: 'cell%d-%d', group: 'cell%d', x: %.4f, bottom: %.4f },"
              % (i + 1, k + 1, i + 1, fx(x), fy(y + BUTTON)))
print("],")

print("\n// --- полоса внизу: вперемешку ---")
shuffled = [names[i] for i in
            [5, 12, 3, 9, 0, 14, 7, 10, 2, 13, 4, 11, 6, 1, 15, 8]]
print("tray: [")
print("  " + ", ".join("'%s'" % n for n in shuffled[:4]) + ",")
print("  " + ", ".join("'%s'" % n for n in shuffled[4:8]) + ",")
print("  " + ", ".join("'%s'" % n for n in shuffled[8:12]) + ",")
print("  " + ", ".join("'%s'" % n for n in shuffled[12:]))
print("],")

print("\nпуговица на сцене %d px, на телефоне при 375 — %.0f px"
      % (BUTTON, BUTTON * 375.0 / BG_W))


# --- превью: оба правильных ответа --------------------------------

def render(pick, path):
    img = box.convert("RGBA")
    for i, (left, top, right, bottom) in enumerate(CELLS):
        box_w = (right - left) / 2.0
        box_h = (bottom - top) / 2.0
        for k in range(4):
            art = pieces[pick(i, k)].resize((int(BUTTON), int(BUTTON)), Image.LANCZOS)
            x = left + box_w * (k % 2) + (box_w - BUTTON) / 2
            y = top + box_h * (k // 2) + (box_h - BUTTON) / 2
            img.alpha_composite(art, (int(x), int(y)))
    img.convert("RGB").save(os.path.join(HERE, path))


render(lambda i, k: i * 4 + k, "buttons-preview.png")          # по форме
render(lambda i, k: k * 4 + i, "buttons-preview-colour.png")   # по цвету
print("Превью: tools/buttons-preview.png и buttons-preview-colour.png")
