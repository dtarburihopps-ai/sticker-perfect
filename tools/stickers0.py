# Наклейки уровня 0: режем лист от Себастиана на отдельные картинки
# и строим к каждой контур-место.
#
# Контур не рисуется руками и не заказывается художнику: он получается
# из самой наклейки, поэтому всегда совпадает с ней ровно.
from PIL import Image, ImageFilter
from collections import deque
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, "рефы/меню/стикеры.png")

# Порядок: верхний ряд слева направо, потом нижний
NAMES = ["camera", "books", "cocoa", "plant", "yarn"]

WIDTH = 400              # ширина готовой наклейки
SPOT_COLOUR = (255, 255, 255)   # контур светлый: обложка тёмная, карандашная линия на ней тонет

src = Image.open(SHEET).convert("RGB")
w, h = src.size
px = src.load()


def is_background(p):
    """Фон листа — чёрный с белым свечением по краям: он серый,
    а наклейки цветные и обведены чистым белым"""
    r, g, b = p
    grey = max(abs(r - g), abs(g - b), abs(r - b)) < 14
    return grey and max(r, g, b) < 232


# Заливка от краёв помечает фон, всё остальное — наклейки
bg = bytearray(w * h)
queue = deque((x, y) for x in range(w) for y in (0, h - 1))
queue.extend((x, y) for y in range(h) for x in (0, w - 1))
seen = bytearray(w * h)
while queue:
    x, y = queue.popleft()
    if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]:
        continue
    seen[y * w + x] = 1
    if not is_background(px[x, y]):
        continue
    bg[y * w + x] = 1
    queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

# Разбираем непрозрачное на отдельные пятна
visited = bytearray(w * h)
blobs = []
for sy in range(h):
    for sx in range(w):
        if bg[sy * w + sx] or visited[sy * w + sx]:
            continue
        q = deque([(sx, sy)])
        visited[sy * w + sx] = 1
        pixels = []
        while q:
            x, y = q.popleft()
            pixels.append((x, y))
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx] and not visited[ny * w + nx]:
                    visited[ny * w + nx] = 1
                    q.append((nx, ny))
        if len(pixels) > 5000:
            blobs.append(pixels)

print("наклеек на листе:", len(blobs))

# Раскладываем по местам: сначала верхний ряд, потом нижний
def where(pixels):
    ys = [p[1] for p in pixels]
    xs = [p[0] for p in pixels]
    return (0 if sum(ys) / len(ys) < h / 2 else 1, sum(xs) / len(xs))

blobs.sort(key=where)

for name, pixels in zip(NAMES, blobs):
    xs = [p[0] for p in pixels]
    ys = [p[1] for p in pixels]
    box = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)

    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    for x, y in pixels:
        mp[x, y] = 255
    mask = mask.filter(ImageFilter.GaussianBlur(0.8))

    piece = src.convert("RGBA")
    piece.putalpha(mask)
    piece = piece.crop(box)
    piece = piece.resize((WIDTH, round(piece.height * WIDTH / piece.width)), Image.LANCZOS)
    piece.save(os.path.join(ROOT, "images", "sticker-" + name + ".png"), optimize=True)

    # Контур-место: край силуэта тонкой линией
    alpha = piece.getchannel("A").point(lambda v: 255 if v > 120 else 0)
    edge = alpha.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(5))
    spot = Image.new("RGBA", piece.size, SPOT_COLOUR + (255,))
    spot.putalpha(edge.point(lambda v: int(v * 0.55)))
    spot.save(os.path.join(ROOT, "images", "spot-" + name + ".png"), optimize=True)

    print(name, piece.size,
          os.path.getsize(os.path.join(ROOT, "images", "sticker-" + name + ".png")) // 1024, "КБ")
