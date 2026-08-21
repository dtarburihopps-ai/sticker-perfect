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

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "sticker-perfect.html")

# Картинки берём из web/ готовыми: их уже пережал tools/optimize.py —
# нужный размер и формат. Здесь остаётся только вписать их в файл.


def read(name):
    with io.open(os.path.join(BASE, name), encoding="utf-8") as f:
        return f.read()


def data_uri(rel_path):
    with open(os.path.join(BASE, rel_path), "rb") as f:
        raw = f.read()

    print("%-28s %6.0f КБ" % (rel_path, len(raw) / 1024))
    return "data:image/webp;base64," + base64.b64encode(raw).decode()


css = read("style.css")
sound = read("sound.js")
levels = read("levels.js")
game = read("game.js")

# Все пути к картинкам в данных уровня заменяем на сами картинки
for path in sorted(set(re.findall(r"'(web/[^']+)'", levels))):
    levels = levels.replace("'%s'" % path, '"%s"' % data_uri(path))

html = read("index.html")
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
body = re.sub(r"\s*<script[^>]*></script>", "", body)   # скрипты подключим сами

# Картинки, вписанные прямо в разметку (например кот), тоже вшиваем.
# В HTML пути в двойных кавычках: src="web/cat.webp"
for path in sorted(set(re.findall(r'"(web/[^"]+)"', body))):
    body = body.replace('"%s"' % path, '"%s"' % data_uri(path))

# Шапку страницы собираем сами, поэтому её содержимое приходится держать
# в согласии с index.html руками. Три строчки ниже обязательны:
#   charset   — без него весь русский текст превращается в кракозябры;
#   viewport  — без него на телефоне экран не подгоняется по размеру;
#   telegram  — без него игра не видит, что запущена внутри мини-аппа,
#               и молча остаётся без вибрации и разворота на весь экран.
# Скрипт телеграма грузится снаружи и специально не вшивается в файл:
# внутри телеграма он доступен всегда, а подделывать его нельзя.
page = u"""<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>Sticker Perfect</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>

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
