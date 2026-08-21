# -*- coding: utf-8 -*-
"""
Готовит картинки для игры: images/ -> web/

В images/ лежат оригиналы: тяжёлые PNG, которые нарезают tools/*.py.
Игра их не грузит и на сайт они не уезжают — там они только хранятся.

В web/ этот скрипт кладёт то, что игрок реально качает в телефон:
те же картинки в формате WebP и ровно того размера, каким они видны
на экране. Выходит примерно в десять раз легче, а глазами не отличить.

Ещё скрипт делает web/preview/ — крохотные копии фонов для карточек
уровней в меню. Раньше в карточку размером с ноготь грузился фон
холодильника целиком, на мегабайт.

И blur.js — заглушки: та же картинка шириной 16 пикселей, вшитая
прямо в код. Пока настоящая едет по сети, на её месте стоит мягкое
пятно нужного цвета и формы.

Запуск (из корня проекта):
    python tools/optimize.py
"""

import base64
import io
import os
import re

from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, "images")
OUT = os.path.join(BASE, "web")
PREVIEW = os.path.join(OUT, "preview")

# Сцена шире 520 точек не бывает — так задано в style.css. Всё остальное
# считается от неё: стикер шириной 0.15 сцены виден как 78 точек.
SCENE_WIDTH = 520

# Запас на плотность экрана. Считается так: на большом телефоне сцена
# шириной 430 точек, в каждую точку влезает 3 пикселя, да ещё стикер
# под пальцем подрастает на 10% — выходит 430 * 3 * 1.1 / 520 = 2.73.
# Берём 2.8: тогда картинку нигде не приходится растягивать.
RETINA = 2.8

# Выше не поднимаемся никогда, даже для фона во весь экран.
MAX_WIDTH = 1200

# Ширина карточки уровня в меню — примерно 105 точек, берём с запасом.
PREVIEW_WIDTH = 240

QUALITY = 88

# Заглушка — та же картинка шириной 16 пикселей. Браузер растянет её
# в мягкое цветное пятно. Все заглушки вместе весят как треть стикера.
BLUR_WIDTH = 16
BLUR_QUALITY = 60

# Картинки не из уровней: меню, кот-маскот, разворот альбома. Число —
# какую долю ширины сцены картинка занимает на экране.
OVERRIDES = {
    "cat": 300.0 / SCENE_WIDTH,   # кот вылезает снизу, шире 300 точек не бывает
    "mascot-menu": 0.5,           # половина разворота альбома
    "logo": 0.5,
    "album": 1.0,                 # фон разворота, во всю ширину
}


def read(name):
    with io.open(os.path.join(BASE, name), encoding="utf-8") as f:
        return f.read()


def widths_from_levels():
    """Для каждой картинки — какую долю сцены она занимает.

    Читаем levels.js построчно. В строке уровня рядом с путём к картинке
    обычно стоит её ширина: width: 0.2765. Если ширины в строке нет —
    это либо фон (он во всю сцену), либо стикер, записанный парой
    тип-картинка: { type: 'pickle', image: 'web/pickle-1.webp' }.
    Во втором случае ширину берём у самого типа.
    """
    text = read("levels.js")

    # Ширины по типам стикеров: cola: { image: ..., width: 0.0931 }
    kinds = {}
    for line in text.splitlines():
        m = re.search(r"^\s*'?([\w-]+)'?:\s*\{.*?image:.*?width:\s*([0-9.]+)", line)
        if m:
            kinds[m.group(1)] = float(m.group(2))

    result = {}
    for line in text.splitlines():
        files = re.findall(r"web/([\w-]+)\.webp", line)
        if not files:
            continue

        m = re.search(r"width:\s*([0-9.]+)", line)
        if m:
            fraction = float(m.group(1))
        else:
            kind = re.search(r"type:\s*'([\w-]+)'", line)
            fraction = kinds.get(kind.group(1), 1.0) if kind else 1.0

        # Одна и та же картинка может встретиться в нескольких местах —
        # берём самый крупный случай, чтобы нигде не размылось.
        for name in files:
            result[name] = max(result.get(name, 0.0), fraction)

    return result


def convert(name, fraction, out_dir, limit=None):
    img = Image.open(os.path.join(SRC, name))

    # Прозрачность у стикеров обязана сохраниться, а у фотографий
    # её нет — лишний прозрачный слой только утяжелил бы файл.
    has_alpha = img.mode in ("RGBA", "LA") or "transparency" in img.info
    img = img.convert("RGBA" if has_alpha else "RGB")

    want = limit if limit else min(round(SCENE_WIDTH * RETINA * fraction), MAX_WIDTH)
    width = min(want, img.width)           # растягивать маленькое не будем
    height = max(1, round(img.height * width / img.width))
    if width != img.width:
        img = img.resize((width, height), Image.LANCZOS)

    out_name = os.path.splitext(name)[0] + ".webp"
    path = os.path.join(out_dir, out_name)
    img.save(path, "WEBP", quality=QUALITY, method=6)
    return out_name, os.path.getsize(path), width, height


def write_blur(stems):
    """Заглушки вшиваем прямо в код, а не кладём файлами: каждая весит
    меньше, чем запрос за ней по сети."""
    rows = []
    for stem in sorted(stems):
        path = os.path.join(OUT, stem + ".webp")
        if not os.path.isfile(path):
            continue

        img = Image.open(path)
        height = max(1, round(img.height * BLUR_WIDTH / img.width))
        tiny = img.resize((BLUR_WIDTH, height), Image.LANCZOS)

        buf = io.BytesIO()
        tiny.save(buf, "WEBP", quality=BLUR_QUALITY, method=6)
        uri = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
        rows.append("  'web/%s.webp': '%s'" % (stem, uri))

    head = [
        u"// Заглушки: та же картинка шириной 16 пикселей, вшитая прямо сюда.",
        u"// Пока настоящая едет по сети, на её месте стоит мягкое пятно",
        u"// нужного цвета и формы — экран не выглядит сломанным.",
        u"//",
        u"// Файл сделан tools/optimize.py. Руками не правим: перезапишется.",
        u"const BLUR = {",
    ]
    text = u"\n".join(head) + u"\n" + u",\n".join(rows) + u"\n};\n"

    out = os.path.join(BASE, "blur.js")
    with io.open(out, "w", encoding="utf-8") as f:
        f.write(text)
    return os.path.getsize(out), len(rows)


def main():
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    if not os.path.isdir(PREVIEW):
        os.makedirs(PREVIEW)

    fractions = widths_from_levels()
    used = set(fractions.keys())          # то, что уровни правда показывают
    fractions.update(OVERRIDES)

    # Фоны уровней — из них же делаем превью для карточек в меню
    backgrounds = re.findall(r"background:\s*'web/([\w-]+)\.webp'", read("levels.js"))

    names = sorted(n for n in os.listdir(SRC)
                   if os.path.isfile(os.path.join(SRC, n)))

    old_total = new_total = 0
    unknown = []

    for name in names:
        stem = os.path.splitext(name)[0]
        fraction = fractions.get(stem)
        if fraction is None:
            fraction = 1.0                  # незнакомую картинку не трогаем в размере
            unknown.append(name)

        old = os.path.getsize(os.path.join(SRC, name))
        out_name, new, w, h = convert(name, fraction, OUT)
        old_total += old
        new_total += new

        print("%-24s %5dx%-5d %7.0f КБ -> %6.0f КБ" % (out_name, w, h, old / 1024.0, new / 1024.0))

        if stem in backgrounds:
            convert(name, 1.0, PREVIEW, limit=PREVIEW_WIDTH)

    # Заглушки нужны и картинкам меню: кот с логотипом тоже ждут своей сети
    blur, count = write_blur(used | set(OVERRIDES.keys()))

    print("\nпревью уровней: %d шт." % len(backgrounds))
    print("заглушки: %d шт., blur.js весит %.0f КБ" % (count, blur / 1024.0))
    if unknown:
        print("не нашлись в levels.js (оставлены в полном размере): %s" % ", ".join(unknown))
    print("\nбыло %.1f МБ -> стало %.1f МБ (в %.1f раза легче)"
          % (old_total / 1048576.0, new_total / 1048576.0, old_total / float(new_total)))


main()
