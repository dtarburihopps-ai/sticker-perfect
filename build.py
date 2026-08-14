# -*- coding: utf-8 -*-
# Собирает игру в один HTML-файл: стили, скрипты и картинки внутри.
import base64
import io
import os
import re

from PIL import Image

BASE = os.path.join(os.path.expanduser("~"), "Desktop", "ВК", "СП")
IMG = os.path.join(BASE, "images")
OUT = os.path.dirname(os.path.abspath(__file__))


def read(name):
    with io.open(os.path.join(BASE, name), encoding="utf-8") as f:
        return f.read()


def data_uri(path, width, quality):
    img = Image.open(path).convert("RGBA")
    height = round(img.height * width / img.width)
    img = img.resize((width, height), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=quality, method=6)
    raw = buf.getvalue()
    print("%-12s %4dx%-4d %6.0f КБ" % (os.path.basename(path), width, height, len(raw) / 1024))
    return "data:image/webp;base64," + base64.b64encode(raw).decode()


fridge = data_uri(os.path.join(IMG, "fridge.png"), 820, 86)
cola = data_uri(os.path.join(IMG, "cola.png"), 240, 92)

css = read("style.css")
sound = read("sound.js")
levels = read("levels.js").replace("'images/fridge.png'", "FRIDGE").replace("'images/cola.png'", "COLA")
game = read("game.js")

html = read("index.html")
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
body = re.sub(r"\s*<script[^>]*></script>", "", body)

page = u"""<title>Sticker Perfect</title>

<style>
%s
</style>

%s

<script>
// Картинки лежат прямо в странице, чтобы игра открывалась одной ссылкой
// и ничего не тянула со стороны.
const FRIDGE = "%s";
const COLA = "%s";
</script>

<script>
%s
</script>

<script>
%s
</script>

<script>
%s
</script>
""" % (css, body.strip(), fridge, cola, sound, levels, game)

path = os.path.join(OUT, "sticker-perfect.html")
with io.open(path, "w", encoding="utf-8") as f:
    f.write(page)

print("готово: %.1f МБ" % (os.path.getsize(path) / 1024 / 1024))
