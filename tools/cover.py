# Обложка уровня 0: готовим картинку от Себастиана к игре и меряем,
# где именно на ней лежит обложка.
#
# Художник почти никогда не попадает в заказанные проценты ровно,
# поэтому мы не спорим с картинкой, а меряем её: скрипт печатает доли,
# которые дальше стоят в levels.js. Пришла новая картинка — запустили
# скрипт, перенесли числа, и наклейки снова на своих местах.
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "рефы/меню/обложка.png")

W, H = 900, 1700

src = Image.open(SOURCE).convert("RGB")
cover = src.resize((W, H), Image.LANCZOS)
cover.save(os.path.join(ROOT, "images/cover.jpg"), quality=88, optimize=True)

px = cover.load()


def cardboard(p):
    """Картон обложки — голубоватый, стол — тёплое дерево"""
    r, g, b = p
    return b > r + 12 and b > 120 and abs(g - b) < 45


row = [x for x in range(W) if cardboard(px[x, H // 2])]
col = [y for y in range(H) if cardboard(px[W // 2, y])]

print("cover.jpg", cover.size, os.path.getsize(os.path.join(ROOT, "images/cover.jpg")) // 1024, "КБ")
print("обложка по ширине:", round(row[0] / W, 4), "…", round(row[-1] / W, 4))
print("обложка по высоте:", round(col[0] / H, 4), "…", round(col[-1] / H, 4))
print("размер обложки:", row[-1] - row[0], "x", col[-1] - col[0],
      "= 1 :", round((col[-1] - col[0]) / (row[-1] - row[0]), 3))
print("цвет стола:", "#%02X%02X%02X" % px[6, 6])

# ---------------------------------------------------------------
#  Готовые строки для levels.js
# ---------------------------------------------------------------
#
# Раскладку наклеек удобно держать в долях ОБЛОЖКИ: 0.5 — её середина.
# Движку же нужны доли всей картинки. Пересчёт делает этот скрипт,
# руками такие числа не пишут.
#
#   имя, x и y центра в долях обложки, ширина в долях обложки
SPOTS = [
    ("camera", 0.34, 0.30, 0.46),
    ("books",  0.66, 0.45, 0.40),
    ("cocoa",  0.31, 0.59, 0.38),
    ("plant",  0.69, 0.73, 0.40),
    ("yarn",   0.38, 0.87, 0.36),
    ("logo",   0.50, 0.12, 0.80),
]

cx0, cx1 = row[0] / W, row[-1] / W
cy0, cy1 = col[0] / H, col[-1] / H
cw, ch = cx1 - cx0, cy1 - cy0

print()
print("    stickers: {")
for name, fx, fy, fw in SPOTS:
    art = Image.open(os.path.join(ROOT, "images",
                                  ("logo.png" if name == "logo" else "sticker-" + name + ".png")))
    width = fw * cw                                   # доля ширины картинки
    height = width * W * (art.height / art.width) / H  # доля высоты картинки
    file = "web/logo.webp" if name == "logo" else "web/sticker-%s.webp" % name
    spot = ", spot: 'web/spot-%s.webp'" % name
    print("      %-7s { image: '%s', width: %.4f, height: %.4f%s }," %
          (name + ":", file, width, height, spot))
print("    },")

print()
print("    slots: [")
for name, fx, fy, fw in SPOTS:
    art = Image.open(os.path.join(ROOT, "images",
                                  ("logo.png" if name == "logo" else "sticker-" + name + ".png")))
    width = fw * cw
    height = width * W * (art.height / art.width) / H
    x = cx0 + fx * cw - width / 2
    bottom = cy0 + fy * ch + height / 2
    last = ", last: true" if name == "logo" else ""
    print("      { id: '%s', sticker: '%s', x: %.4f, bottom: %.4f%s }," %
          (name, name, x, bottom, last))
print("    ],")
