# Закрытая тетрадь для уровня 0 — из нашей же картинки альбома.
# Берём правую страницу вместе с пружиной: пружина оказывается слева,
# и получается ровно закрытая тетрадь, вид сверху.
from PIL import Image, ImageFilter, ImageDraw
import os

ROOT = r"C:\Users\Даша\Desktop\ВК\СП"

album = Image.open(os.path.join(ROOT, "images/album.jpg")).convert("RGB")
aw, ah = album.size

# Только пружина и страница: коричневый кант обложки сверху и снизу
# в кадр не попадает
book = album.crop((round(0.4700 * aw), round(0.1795 * ah),
                   round(0.9450 * aw), round(0.8170 * ah)))
print("вырезано:", book.size, "пропорция 1 :", round(book.height / book.width, 2))

# Холст под вытянутую тетрадь: экран телефона тоже длинный
W, H = 900, 1700

# Стол берём настоящий — полосу дерева над тетрадью, и повторяем её
# зеркально, чтобы не было шва
strip = album.crop((0, 0, aw, round(0.16 * ah))).resize((W, round(0.16 * ah * W / aw)), Image.LANCZOS)
scene = Image.new("RGB", (W, H))
y = 0
flip = False
while y < H:
    scene.paste(strip.transpose(Image.FLIP_TOP_BOTTOM) if flip else strip, (0, y))
    y += strip.height
    flip = not flip

# Тетрадь по центру, высотой 93 % холста
bh = round(H * 0.93)
bw = round(book.width * bh / book.height)
book = book.resize((bw, bh), Image.LANCZOS)
x = (W - bw) // 2
y = (H - bh) // 2

shadow = Image.new("L", (W, H), 0)
ImageDraw.Draw(shadow).rounded_rectangle([x + 5, y + 8, x + bw + 9, y + bh + 12], radius=16, fill=105)
shadow = shadow.filter(ImageFilter.GaussianBlur(16))
scene.paste(Image.new("RGB", (W, H), (74, 53, 30)), (0, 0), shadow)
scene.paste(book, (x, y))

scene.save(os.path.join(ROOT, "images/cover.jpg"), quality=88, optimize=True)
print("cover.jpg", scene.size, os.path.getsize(os.path.join(ROOT, "images/cover.jpg")) // 1024, "КБ")
print("обложка в долях холста: x", round(x / W, 4), "…", round((x + bw) / W, 4),
      "  y", round(y / H, 4), "…", round((y + bh) / H, 4))
print("цвет стола:", "#%02X%02X%02X" % scene.getpixel((8, 8)))
