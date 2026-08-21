// Sticker Perfect — картинки: заглушки и загрузка наперёд
//
// Всё, что касается того, КОГДА картинка появляется на экране, а не того,
// где она лежит и что означает. Две вещи, и обе про ожидание:
//
//   заглушка          — что показать, пока настоящая картинка едет по сети;
//   загрузка наперёд  — как сделать, чтобы следующий уровень не ждали вовсе.

// --- Фоновая загрузка ---
//
// Переход на уровень — это перезагрузка страницы. Значит «подгрузить
// заранее» тут означает ровно одно: положить картинки в кеш браузера.
// После перезагрузки он возьмёт их оттуда, не спрашивая сеть, и уровень
// откроется мгновенно — сколько бы он ни весил.

function levelImages(name) {
  const data = LEVELS[name];
  if (!data) return [];

  // Пути к картинкам разбросаны по всей записи уровня: фон, стикеры,
  // контуры мест, обстановка, накладки. Выловить их из записи целиком
  // проще и надёжнее, чем обходить руками и однажды забыть новое поле.
  const found = JSON.stringify(data).match(/web\/[\w-]+\.webp/g) || [];
  return found.filter(function (path, i) { return found.indexOf(path) === i; });
}

let preloading = false;

function preloadLevel(name) {
  if (!name || preloading) return;

  // Игрок включил экономию трафика — в сеть без спроса не лезем
  if (navigator.connection && navigator.connection.saveData) {
    log('Экономия трафика: наперёд ничего не грузим');
    return;
  }

  preloading = true;
  const queue = levelImages(name);
  log('В фоне подгружаем', name + ':', queue.length, 'картинок');

  // По одной, а не все разом: браузер держит на сайт всего несколько
  // соединений, и пачка фоновых картинок отняла бы их у того, что
  // игрок видит прямо сейчас.
  function step() {
    const path = queue.shift();
    if (!path) {
      log('Фоновая загрузка закончена:', name);
      return;
    }
    const img = new Image();
    img.onload = img.onerror = step;   // упавшая картинка не рвёт очередь
    img.src = path;
  }

  whenIdle(step);
}

// Начинаем, когда браузеру нечем заняться. requestIdleCallback есть
// не везде — в телеграме на айфоне может не быть; тогда просто ждём
// пару секунд, к этому времени экран уже нарисован.
function whenIdle(fn) {
  if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: 3000 });
  else setTimeout(fn, 2000);
}

// --- Заглушка на время загрузки ---
//
// На месте картинки, которая ещё едет, показываем её же — шириной
// в шестнадцать пикселей, из blur.js. Браузер растягивает такую
// в мягкое цветное пятно: видно, что стикер тут будет и какой он,
// а экран не выглядит сломанным. Пришла настоящая — пятно убираем,
// иначе оно продолжало бы торчать из-под прозрачных краёв.
function withBlur(img, path) {
  // Проверяем через typeof: BLUR объявлен через const, а такие имена
  // не становятся свойством window — window.BLUR всегда undefined,
  // даже когда blur.js подключён.
  if (typeof BLUR === 'undefined') return;

  const tiny = BLUR[path];
  if (!tiny) return;

  // Картинка уже пришла (браузер взял её из кеша) — заглушка не нужна.
  // Проверяем именно naturalWidth: у пустого <img>, которому ещё
  // не задали src, complete почему-то сразу true, и одного его мало.
  if (img.complete && img.naturalWidth) return;

  img.style.backgroundImage = 'url(' + tiny + ')';
  img.style.backgroundSize = '100% 100%';

  img.addEventListener('load', function () {
    img.style.backgroundImage = '';
  }, { once: true });
}
