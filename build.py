# -*- coding: utf-8 -*-
# Собирает игру в один HTML-файл: стили, скрипты и картинки внутри.
#
# Зачем: такой файл можно открыть двойным кликом без сервера
# и опубликовать там, где внешние загрузки запрещены.
#
# Запуск: python build.py

import base64
import io
import os
import re

from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "sticker-perfect.html")

# До какой ширины ужимать картинки. Фон рисуется во весь экран,
# продукты — мелко, поэтому им хватает меньшего размера.
WIDTHS = {"fridge": 820, "drawers-front": 700}
DEFAULT_WIDTH = 260


def read(name):
    with io.open(os.path.join(BASE, name), encoding="utf-8") as f:
        return f.read()


def data_uri(rel_path):
    img = Image.open(os.path.join(BASE, rel_path)).convert("RGBA")
    key = os.path.splitext(os.path.basename(rel_path))[0]
    width = min(WIDTHS.get(key, DEFAULT_WIDTH), img.width)
    height = round(img.height * width / img.width)

    img = img.resize((width, height), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=88, method=6)
    raw = buf.getvalue()

    print("%-22s %4dx%-4d %6.0f КБ" % (rel_path, width, height, len(raw) / 1024))
    return "data:image/webp;base64," + base64.b64encode(raw).decode()


css = read("style.css")
sound = read("sound.js")
levels = read("levels.js")
game = read("game.js")

# Все пути к картинкам в данных уровня заменяем на сами картинки
for path in sorted(set(re.findall(r"'(images/[^']+)'", levels))):
    levels = levels.replace("'%s'" % path, '"%s"' % data_uri(path))

html = read("index.html")
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
body = re.sub(r"\s*<script[^>]*></script>", "", body)   # скрипты подключим сами

page = u"""<title>Sticker Perfect</title>

<style>
%s
</style>

%s

<script>
%s
</script>

<script>
%s
</script>

<script>
%s
</script>
""" % (css, body.strip(), sound, levels, game)

with io.open(OUT, "w", encoding="utf-8") as f:
    f.write(page)

print("\nготово: %s — %.1f МБ" % (os.path.basename(OUT), os.path.getsize(OUT) / 1024 / 1024))
