# -*- coding: utf-8 -*-
"""
Готовит картинки уровня «карандаши» и считает десять мест в коробке.

Уровень устроен третьим способом: места посчитаны, но карандаш в них
подходит любой. Правильно только одно — порядок от светлого к тёмному,
и проверяет его игра, а не место.

    python tools/pencils.py

Скрипт собирает фон (стол + крышка + коробка одной картинкой), режет
карандаши с листа Себастиана, приводит их к одному размеру и печатает
готовые строки для levels.js. Заодно рисует tools/pencils-preview.png —
на нём видно собранную коробку.
"""

import os
import random
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
REF = os.path.join(BASE, "рефы", "ур 4")
IMG = os.path.join(BASE, "images")

# ---------------------------------------------------------------
#  Геометрия сцены
# ---------------------------------------------------------------

BG_W, BG_H = 900, 1500          # фон уровня целиком
TABLE = (206, 186, 160)         # дерево стола
TABLE_DARK = (188, 166, 138)    # оно же в тени по краям

BOX_W = 740                     # ширина коробки на фоне
LID_W = 770                     # крышка ШИРЕ коробки: она надевается сверху
LID_TILT = 4.0                  # наклон крышки, градусы
LID_Y = 40                      # отступ крышки от верха фона
GAP = 40                        # просвет между крышкой и коробкой

# Область под карандаши. Числа — пиксели исходника «низ.png» (1536 x 1024),
# сняты по самой картинке. Доли считаются от ВЫРЕЗАННОГО спрайта: вместе
# с мягкой тенью он на 18 пикселей шире белой обводки, и если считать от
# обводки, вся область уезжает вправо и левый карандаш отходит от стенки.
BOX_SPRITE = (162, 121, 1382, 942)   # габарит спрайта после вырезания фона
BOX_VISUAL = (162, 1364)             # левый и правый край белой обводки, без тени

AREA_W = 1022                        # ширина области под карандаши
AREA_TOP, AREA_BOTTOM = 213, 876     # верх и низ области

PENCILS = 10                         # сколько карандашей помещается в ряд

CUT_THRESHOLD = 24              # порог вырезания фона рефов


def cut(name):
    """Убирает фон рефа, сохраняя белую обводку наклейки."""
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


def table(w, h):
    """Стол: тёплое дерево. Тёплое нарочно — коробка и карандаши холодно-серые,
    на сером столе они слились бы в одно пятно."""
    img = Image.new("RGB", (w, h), TABLE)
    draw = ImageDraw.Draw(img)

    random.seed(4)
    for _ in range(900):
        y = random.randint(0, h)
        x = random.randint(-200, w)
        length = random.randint(150, 700)
        k = random.uniform(0.15, 0.48)
        colour = tuple(int(TABLE[i] + (TABLE_DARK[i] - TABLE[i]) * k) for i in range(3))
        draw.line([(x, y), (x + length, y + random.randint(-1, 1))],
                  fill=colour, width=random.choice([1, 1, 2]))

    img = img.filter(ImageFilter.GaussianBlur(1.2))

    # мягкая тень к краям: взгляд остаётся в середине, где коробка
    light = Image.new("L", (w, h), 0)
    ImageDraw.Draw(light).ellipse([-w * 0.35, -h * 0.25, w * 1.35, h * 1.25], fill=255)
    light = light.filter(ImageFilter.GaussianBlur(160))

    return Image.composite(img, Image.new("RGB", (w, h), TABLE_DARK), light)


def shadow(size, blur, lift):
    """Мягкая тень под предметом: он лежит на столе, а не наклеен на него."""
    layer = Image.new("RGBA", (size[0] + blur * 4, size[1] + blur * 4), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(
        [blur * 2, blur * 2, blur * 2 + size[0], blur * 2 + size[1]],
        radius=size[0] * 0.05, fill=(60, 50, 40, 90))
    return layer.filter(ImageFilter.GaussianBlur(blur)), blur * 2 - lift


def split(sheet, count):
    """Режет лист на отдельные карандаши по пустым колонкам."""
    alpha = sheet.split()[3].load()
    w, h = sheet.size

    runs, run = [], None
    for x in range(w):
        ink = sum(1 for y in range(0, h, 4) if alpha[x, y] > 60)
        if ink > 0 and run is None:
            run = x
        elif ink == 0 and run is not None:
            if x - run > 20:
                runs.append((run, x))
            run = None
    if run is not None and w - run > 20:
        runs.append((run, w))

    if len(runs) != count:
        raise SystemExit("На листе найдено %d карандашей вместо %d" % (len(runs), count))

    pieces = []
    for left, right in runs:
        piece = sheet.crop((left, 0, right, h))
        pieces.append(piece.crop(piece.getbbox()))
    return pieces


print("Картинки:")

# --- фон: стол, крышка, коробка одной картинкой ---------------
#
# Крышка и коробка не двигаются за всю игру, поэтому они не «обстановка»,
# а часть фона. Одна картинка вместо трёх — и никаких координат,
# которые надо держать в согласии между собой.

lid = cut("крышка.png")
lid = lid.crop(lid.getbbox())
lid = lid.resize((LID_W, round(lid.height * LID_W / lid.width)), Image.LANCZOS)
lid = lid.rotate(LID_TILT, resample=Image.BICUBIC, expand=True)

box = cut("низ.png")
box = box.crop(BOX_SPRITE)
BOX_SCALE = BOX_W / float(BOX_SPRITE[2] - BOX_SPRITE[0])
box = box.resize((BOX_W, round(box.height * BOX_SCALE)), Image.LANCZOS)

background = table(BG_W, BG_H).convert("RGBA")

LID_X = (BG_W - lid.width) // 2
sh, off = shadow((lid.width - 60, lid.height - 60), 18, 10)
background.alpha_composite(sh, (LID_X + 30 - off, LID_Y + 30 - off))
background.alpha_composite(lid, (LID_X, LID_Y))

BOX_X = (BG_W - BOX_W) // 2
BOX_Y = LID_Y + lid.height + GAP
sh, off = shadow((BOX_W - 40, box.height - 40), 18, 10)
background.alpha_composite(sh, (BOX_X + 20 - off, BOX_Y + 20 - off))
background.alpha_composite(box, (BOX_X, BOX_Y))

background.convert("RGB").save(os.path.join(IMG, "pencil-table.png"))
print("  %-18s %4d x %-4d" % ("pencil-table.png", BG_W, BG_H))

# --- карандаши ------------------------------------------------

pieces = split(cut("карандаши.png"), PENCILS)

# Карандаши приводятся к одному размеру. Нарисованы они с разбросом в
# несколько пикселей, а на экране стоят вплотную в ряд: разная длина
# сразу читается как «кривой ряд», и игрок начинает сортировать
# по длине вместо оттенка.
size = (max(p.width for p in pieces), max(p.height for p in pieces))
spread = (size[0] - min(p.width for p in pieces),
          size[1] - min(p.height for p in pieces))

for i, piece in enumerate(pieces):
    piece.resize(size, Image.LANCZOS).save(os.path.join(IMG, "pencil-%d.png" % (i + 1)))

print("  %-18s %4d x %-4d  x%d  (разброс на листе %d x %d px)"
      % ("pencil-1..10.png", size[0], size[1], PENCILS, spread[0], spread[1]))


# --- координаты -----------------------------------------------
#
# Область под карандаши считается от ЦЕНТРА коробки, а не от её края:
# так крайние карандаши прижаты к стенкам одинаково слева и справа.

def bx(px):
    """Пиксель низ.png → пиксель фона"""
    return BOX_X + (px - BOX_SPRITE[0]) * BOX_SCALE


centre = bx((BOX_VISUAL[0] + BOX_VISUAL[1]) / 2.0)
area_left = centre - AREA_W * BOX_SCALE / 2
area_top = BOX_Y + (AREA_TOP - BOX_SPRITE[1]) * BOX_SCALE
area_bottom = BOX_Y + (AREA_BOTTOM - BOX_SPRITE[1]) * BOX_SCALE

step = AREA_W * BOX_SCALE / PENCILS
height = area_bottom - area_top

# Ширина карандаша — ровно колонка, без просвета: десять штук заполняют
# коробку от стенки до стенки.
#
# Нарисованы они чуть тоньше заказанного (1 : 7,9 вместо 1 : 7,3), и если
# брать ширину из картинки, между соседями остаются щели. Поэтому картинка
# растягивается на недостающее: на прямом цилиндре несколько процентов
# не читаются, а щели в ряду видно сразу.
sample = Image.open(os.path.join(IMG, "pencil-1.png"))
width = step
stretch = width / (height * sample.width / float(sample.height))

print("\n// --- цвет стола ---")
print("wall: '#%02X%02X%02X'," % background.convert("RGB").getpixel((2, 2)))

print("\n// --- карандаши ---")
print("// картинка 1 : %.1f, на экране 1 : %.1f — растянута на %.0f%%"
      % (sample.height / float(sample.width), height / width, (stretch - 1) * 100))
for i in range(PENCILS):
    print("'pencil-%d': { image: 'images/pencil-%d.png', width: %.4f, height: %.4f, rank: %d },"
          % (i + 1, i + 1, width / BG_W, height / BG_H, i + 1))

print("\n// --- места: десять колонок в коробке ---")
print("slotSize: { width: %.4f, height: %.4f }," % (width / BG_W, height / BG_H))
print("slots: [")
for i in range(PENCILS):
    left = area_left + step * i
    seed = ""
    if i == 0:
        seed = ", sticker: 'pencil-1', filled: true, fixed: true"
    if i == PENCILS - 1:
        seed = ", sticker: 'pencil-%d', filled: true, fixed: true" % PENCILS
    print("  { id: 'p%d', x: %.4f, bottom: %.4f%s },"
          % (i + 1, left / BG_W, area_bottom / BG_H, seed))
print("],")

print("\nкарандаш на телефоне: %.0f x %.0f px при экране 375"
      % (width * 375.0 / BG_W, height * 375.0 / BG_W))


# --- Превью: как коробка выглядит собранной ---------------------

preview = background.copy()
for i in range(PENCILS):
    art = Image.open(os.path.join(IMG, "pencil-%d.png" % (i + 1))).convert("RGBA")
    art = art.resize((int(width), int(height)), Image.LANCZOS)
    preview.alpha_composite(art, (int(area_left + step * i), int(area_top)))

preview.convert("RGB").save(os.path.join(HERE, "pencils-preview.png"))
print("Превью: tools/pencils-preview.png")
