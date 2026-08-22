# -*- coding: utf-8 -*-
"""
Готовит картинки уровня «шкаф» и считает места на полках.

    python tools/shelf.py

Шкаф и товары нарисованы Себастианом и лежат в рефы/ур7. Скрипт делает
из них то, что нужно игре:

  * растягивает шкаф по ширине (зачем — ниже) и ставит его в комнату:
    стена, плинтус, пол и две тени рисуются прямо здесь, отдельной
    картинки для них не нужно;
  * режет лист товаров и приводит все шесть к ОДНОЙ рамке;
  * печатает готовые строки для levels.js и рисует tools/shelf-preview.png.

Почему шкаф растянут. На полку встают три товара в ряд, и три штуки
должны заполнять её без щелей. У нарисованного шкафа ниша 296 x 437 —
слишком узкая: три товара нормальной пропорции в неё не влезают, а если
ужать их по ширине, над ними остаётся треть пустоты. Растяжение по
горизонтали на дереве не читается — волокна и так вертикальные, — и
после него ниша принимает ровно три товара 1 : 3,1.

Почему товары приводятся к одной рамке. Пришли они с разбросом: от
1 : 2,79 до 1 : 3,59. Ряд идёт от стенки до стенки, поэтому ширина
товара равна ширине места, а не выводится из пропорции картинки —
тот же приём, что с карандашами и с товаром в автомате. Щель у стенки
видно мгновенно, а натяжение картинки на несколько процентов — нет.
"""

import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
REF = os.path.join(BASE, "рефы", "ур7")
IMG = os.path.join(BASE, "images")

# ---------------------------------------------------------------
#  Геометрия шкафа
# ---------------------------------------------------------------
#
# ВСЕ числа — пиксели в рефы/ур7/шкаф.png (1024 x 1536). Сняты линейкой
# по самой картинке и сверены с разметкой Даши (рефы/ур7/разметка.jpg):
# она обвела зелёным то, за что товару вылезать нельзя.

CABINET = (16, 19, 701, 1479)        # шкаф целиком, без полей листа
STRETCH = 1.35                        # растяжение по ширине

# Зелёная разметка: два столбца и три ряда. Ряды заданы потолком и полом
# ниши, пол — это линия, на которой товар стоит.
COLUMNS = [(53, 336), (381, 661)]
ROWS = [(60, 479), (527, 940), (986, 1415)]

AIR = 23                              # воздух над товаром, одинаковый везде

# ---------------------------------------------------------------
#  Комната вокруг шкафа
# ---------------------------------------------------------------

SCENE = (1024, 1660)                  # холст фона целиком
FLOOR = 1560                          # линия пола: на ней стоит шкаф

WALL_TOP = (243, 232, 216)            # стена светлее вверху
WALL_BOTTOM = (232, 217, 197)
SKIRTING = (238, 230, 218)            # плинтус
SKIRTING_EDGE = (222, 210, 194)
FLOOR_COLOR = (198, 160, 118)
FLOOR_LINE = (186, 148, 108)
PLANK = 26                            # ширина доски пола

# Цвет полей вокруг картинки, когда экран шире неё. Взят из середины
# стены: с ним край фона не виден.
WALL_HEX = "#EBDDC9"

# ---------------------------------------------------------------
#  Товары
# ---------------------------------------------------------------
#
# Числа — рамки на листе рефы/ур7/еда.png (1024 x 1536), сняты по
# прозрачности: лист приходит уже вырезанным.

GOODS = [
    ("soda",    (70, 9, 320, 709)),      # газировка
    ("milk",    (392, 14, 631, 707)),    # молоко
    ("chips",   (727, 15, 958, 722)),    # чипсы в банке
    ("oil",     (75, 726, 313, 1481)),   # масло
    ("juice",   (392, 728, 631, 1481)),  # сок
    ("cookies", (738, 730, 945, 1476)),  # печенье
]

# Товар режется вдвое крупнее рамки: игра потом сама уменьшит его до
# нужного размера, а вот растягивать маленькое было бы некрасиво.
GOOD_SCALE = 2


def stretched(x):
    """Координата листа -> координата растянутого шкафа"""
    return (x - CABINET[0]) * STRETCH


def lifted(y):
    return y - CABINET[1]


def cabinet():
    src = Image.open(os.path.join(REF, "шкаф.png")).convert("RGBA")
    cab = src.crop(CABINET)
    return cab.resize((int(cab.width * STRETCH), cab.height), Image.LANCZOS)


def grid():
    """Одна ячейка на все шесть полок и восемнадцать рамок внутри них.

    Зелёные рамки нарисованы от руки и между собой чуть разные. Ячейку
    берём по самой тесной из них и ставим шесть раз: все места в уровне
    обязаны быть одинаковыми, иначе товар на разных полках выглядел бы
    разного роста.
    """
    columns = [(stretched(a), stretched(b)) for a, b in COLUMNS]
    rows = [(lifted(a), lifted(b)) for a, b in ROWS]

    width = int(min(b - a for a, b in columns))
    width -= width % 6                 # делится на три без остатка
    height = int(min(b - a for a, b in rows))

    step = width // 3
    frame = (step, height - AIR)

    cells = []
    for row, (_, floor) in enumerate(rows):
        for column, (left, right) in enumerate(columns):
            x = int(left + ((right - left) - width) / 2 + 0.5)
            cells.append([(x + step * i, int(floor)) for i in range(3)])

    return cells, frame, (width, height)


def room(cab):
    """Стена, плинтус, пол, тени — и шкаф посреди всего этого"""
    width, height = SCENE

    # Стена: мягкий вертикальный градиент
    ramp = np.linspace(0, 1, height)[:, None]
    wall = (np.array(WALL_TOP) * (1 - ramp) + np.array(WALL_BOTTOM) * ramp)
    scene = Image.fromarray(
        np.repeat(wall[:, None, :], width, axis=1).astype("uint8"), "RGB")

    draw = ImageDraw.Draw(scene)
    draw.rectangle([0, FLOOR, width, height], fill=FLOOR_COLOR)
    for y in range(FLOOR, height, PLANK):
        draw.line([(0, y), (width, y)], fill=FLOOR_LINE, width=2)
    draw.rectangle([0, FLOOR - PLANK, width, FLOOR], fill=SKIRTING)
    draw.line([(0, FLOOR - PLANK), (width, FLOOR - PLANK)],
              fill=SKIRTING_EDGE, width=3)

    scene = scene.convert("RGBA")

    left = (width - cab.width) // 2
    top = FLOOR - cab.height

    # Две тени: мягкая на полу под шкафом и лёгкая на стене за ним.
    # От них шкаф стоит в комнате, а не наклеен на картинку.
    shadow = Image.new("RGBA", SCENE, (0, 0, 0, 0))
    paint = ImageDraw.Draw(shadow)
    paint.ellipse([left - 30, FLOOR - 40, left + cab.width + 30, FLOOR + 46],
                  fill=(120, 96, 74, 90))
    paint.rectangle([left + 14, top + 16, left + cab.width + 16, FLOOR + 10],
                    fill=(140, 112, 86, 55))
    scene.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))

    scene.alpha_composite(cab, (left, top))
    return scene, left, top


def cut_goods(frame):
    """Режет лист и приводит все шесть товаров к одной рамке"""
    sheet = Image.open(os.path.join(REF, "еда.png")).convert("RGBA")
    size = (frame[0] * GOOD_SCALE, frame[1] * GOOD_SCALE)

    saved = []
    for name, box in GOODS:
        good = sheet.crop(box).resize(size, Image.LANCZOS)
        path = os.path.join(IMG, "shelf-%s.png" % name)
        good.save(path)
        was = (box[2] - box[0] + 1, box[3] - box[1] + 1)
        saved.append((name, was, good.size))
    return saved


def lines(cells, frame, left, top):
    """Готовые строки для levels.js — в долях от фона, а не в пикселях"""
    width, height = SCENE
    print("")
    print("    // Рамка товара одна на все восемнадцать мест")
    print("    slotSize: { width: %.4f, height: %.4f }," %
          (frame[0] / width, frame[1] / height))
    print("")
    print("    slots: [")
    for i, cell in enumerate(cells):
        print("      // Полка %d" % (i + 1))
        for j, (x, floor) in enumerate(cell):
            print("      { id: 'shelf%d-%d', group: 'shelf%d', x: %.4f, bottom: %.4f },"
                  % (i + 1, j + 1, i + 1,
                     (left + x) / width, (top + floor) / height))
    print("    ],")


def preview(scene, cells, frame, left, top):
    """Картинка для глаз: где какие места и как в них встают товары"""
    shot = scene.copy()
    sheet = Image.open(os.path.join(REF, "еда.png")).convert("RGBA")
    goods = [sheet.crop(box).resize(frame, Image.LANCZOS) for _, box in GOODS]

    for i, cell in enumerate(cells):
        for (x, floor) in cell:
            shot.alpha_composite(goods[i], (left + x, top + floor - frame[1]))

    path = os.path.join(HERE, "shelf-preview.png")
    shot.convert("RGB").save(path)
    return path


def main():
    cab = cabinet()
    cells, frame, cell = grid()
    scene, left, top = room(cab)

    background = os.path.join(IMG, "shelf.png")
    scene.convert("RGB").save(background)

    saved = cut_goods(frame)

    print("Шкаф: %d x %d после растяжения x%.2f" % (cab.width, cab.height, STRETCH))
    print("Ячейка: %d x %d, одна на все шесть полок" % cell)
    print("Рамка товара: %d x %d, пропорция 1 : %.2f" %
          (frame[0], frame[1], frame[1] / frame[0]))
    print("Фон: %s (%d x %d), цвет стены %s" %
          (os.path.basename(background), SCENE[0], SCENE[1], WALL_HEX))
    print("")
    print("Товары (было на листе -> стало):")
    for name, was, now in saved:
        print("  %-8s %3d x %3d  ->  %3d x %3d" % (name, was[0], was[1], now[0], now[1]))

    lines(cells, frame, left, top)
    print("")
    print("Картинка для глаз:", preview(scene, cells, frame, left, top))


if __name__ == "__main__":
    main()
