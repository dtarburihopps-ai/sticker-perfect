# Временная обложка для уровня 0, пока не пришёл арт от Себастиана.
#
# Берём правую страницу нашего альбома вместе с пружиной — получается
# закрытая тетрадь, вид сверху, — и подкрашиваем её в цвет картона,
# чтобы обложка отличалась от кремовых страниц. Пропорция 1 : 2,37
# берётся не с потолка: ровно столько у страницы нашего разворота.
#
# Геометрия ровно та, что заказана в ART-BRIEF-уровень0-скетчбук.md:
# холст 900 x 1700, обложка 13,3..86,7 % по ширине и 4..96 % по высоте.
# Придёт настоящая картинка — подменим файл, координаты мест не поедут.
from PIL import Image, ImageFilter, ImageDraw, ImageChops
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

W, H = 900, 1700
COVER = (0.133, 0.867, 0.04, 0.96)    # доли холста: left, right, top, bottom
CARDBOARD = (150, 172, 184)           # пыльно-голубой картон

album = Image.open(os.path.join(ROOT, "images/album.jpg")).convert("RGB")
aw, ah = album.size

# Пружина и страница, без коричневого канта обложки
book = album.crop((round(0.4700 * aw), round(0.1795 * ah),
                   round(0.9450 * aw), round(0.8170 * ah)))

# Приводим к пропорции скетчбука. Наш кусок чуть шире нужного, поэтому
# срезаем справа — со стороны свободного края страницы: слева пружина,
# её терять нельзя.
x0, x1, y0, y1 = COVER
bw = round((x1 - x0) * W)
bh = round((y1 - y0) * H)
keep = round(book.height * bw / bh)
book = book.crop((0, 0, keep, book.height)).resize((bw, bh), Image.LANCZOS)

# Клетка на обложке ни к чему: размываем её, фактура бумаги остаётся
book = book.filter(ImageFilter.GaussianBlur(2.2))

# Красим бумагу в картон: умножением, чтобы фактура и пружина остались
tint = Image.new("RGB", book.size, CARDBOARD)
book = Image.blend(book, ImageChops.multiply(book, tint), 0.85)

# Стол — настоящий, полосой из той же картинки, зеркально
strip = album.crop((0, 0, aw, round(0.16 * ah)))
strip = strip.resize((W, round(strip.height * W / aw)), Image.LANCZOS)
scene = Image.new("RGB", (W, H))
y, flip = 0, False
while y < H:
    scene.paste(strip.transpose(Image.FLIP_TOP_BOTTOM) if flip else strip, (0, y))
    y += strip.height
    flip = not flip

x, y = round(x0 * W), round(y0 * H)

shadow = Image.new("L", (W, H), 0)
ImageDraw.Draw(shadow).rounded_rectangle([x + 5, y + 8, x + bw + 9, y + bh + 12], radius=16, fill=105)
scene.paste(Image.new("RGB", (W, H), (74, 53, 30)), (0, 0), shadow.filter(ImageFilter.GaussianBlur(16)))
scene.paste(book, (x, y))

scene.save(os.path.join(ROOT, "images/cover.jpg"), quality=88, optimize=True)
print("cover.jpg", scene.size, os.path.getsize(os.path.join(ROOT, "images/cover.jpg")) // 1024, "КБ")
print("обложка:", bw, "x", bh, " пропорция 1 :", round(bh / bw, 2))
print("цвет стола:", "#%02X%02X%02X" % scene.getpixel((8, 8)))
