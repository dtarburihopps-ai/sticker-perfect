# Локальный сервер для разработки.
#
# Обычный python -m http.server разрешает браузеру кешировать файлы,
# и после правки кода страница показывает старую версию — легко потерять
# полчаса, гадая, почему изменения «не применились».
# Этот сервер запрещает кеш: каждая перезагрузка всегда свежая.
#
# Запуск:  python serve.py
# Открыть: http://localhost:8080

import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8080"))


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass   # не засоряем консоль строчкой на каждый запрос


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print("Sticker Perfect: http://localhost:%d" % PORT)
    ThreadingHTTPServer(("127.0.0.1", PORT), NoCacheHandler).serve_forever()
