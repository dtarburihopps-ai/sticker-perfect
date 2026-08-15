// Sticker Perfect — игра

// Поставь false перед показом, чтобы убрать отладочные сообщения из консоли
const DEBUG = true;

// Показать границы мест, куда можно класть. Помогает целиться при настройке.
const SHOW_SLOTS = false;

function log() {
  if (DEBUG) console.log.apply(console, arguments);
}

// Тайминги живут в style.css рядом с самими анимациями — там их и правим.
// Код читает их оттуда, чтобы одно и то же время не пришлось держать
// в двух файлах и однажды забыть поменять во втором.
function cssTime(name) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = parseFloat(raw);
  return raw.slice(-2) === 'ms' ? value : value * 1000;
}

const FLY_TIME = cssTime('--fly-time');
const SNAP_TIME = cssTime('--stick-time');
const REJECT_TIME = cssTime('--reject-time');

// Во сколько раз стикер в нижней полосе крупнее, чем на полке.
// Банка на полке всего ~34 px в ширину — пальцем в такое попасть трудно.
// Если стикеров много, увеличение само уменьшится, чтобы ряд поместился.
const TRAY_SCALE = 1.8;
const TRAY_GAP = 10;       // просвет между стикерами в полосе
const TRAY_PADDING = 20;   // отступ от краёв полосы

// Сколько стикеров показываем в полосе одновременно. Остальные ждут очереди
// и появляются, когда предыдущие улетели. Без этого девять банок ужимаются
// до 31 px — мельче, чем они же на полке, и брать их неудобно.
const TRAY_VISIBLE = 5;
const TRAY_ARROW = 38;     // место по краям полосы под стрелки листания

// Наименьшая зона попадания. Продукты на полке бывают по 33 px,
// а палец промахиваться не должен.
const TOUCH_MIN = 44;

// --- Telegram ---
// Осторожно: скрипт телеграма создаёт window.Telegram.WebApp ВСЕГДА,
// даже в обычном браузере. Поэтому одного его наличия мало —
// смотрим на platform: вне телеграма там 'unknown'.
const webApp = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
const tg = (webApp && webApp.platform && webApp.platform !== 'unknown') ? webApp : null;

if (tg) {
  tg.ready();
  tg.expand();
  log('Telegram: запущено внутри мини-аппа');
} else {
  log('Telegram: нет, работаем в обычном браузере');
}

// --- Элементы страницы ---
const app = document.getElementById('app');
const scene = document.getElementById('scene');
const tray = document.getElementById('tray');
const background = document.getElementById('background');
const stickersLayer = document.getElementById('stickers');
const overlaysLayer = document.getElementById('overlays');
const decorLayer = document.getElementById('decor');
const prevButton = document.getElementById('tray-prev');
const nextButton = document.getElementById('tray-next');
const vibrationButton = document.getElementById('vibration-toggle');

// --- Вибрация ---
let vibrationOn = true;

vibrationButton.addEventListener('click', function () {
  vibrationOn = !vibrationOn;
  vibrationButton.classList.toggle('off', !vibrationOn);
  vibrationButton.setAttribute(
    'aria-label',
    vibrationOn ? 'Выключить вибрацию' : 'Включить вибрацию'
  );
  log('Вибрация:', vibrationOn ? 'включена' : 'выключена');
});

// ---------------------------------------------------------------
//  Загрузка уровня
// ---------------------------------------------------------------

let level = null;      // описание уровня из levels.js
let slots = [];        // места на сцене
let stickers = [];     // все стикеры: и затравки, и те, что кладёт игрок
let decor = [];        // обстановка: лежит с начала уровня и не двигается
let overlays = [];     // куски фона поверх стикеров
let selected = null;   // какой стикер сейчас выбран
let trayOffset = 0;    // с какого по счёту стикера показана полоса
let placeOrder = 0;    // счётчик постановок: кто позже, тот выше лежит

// Листание полосы. Само по себе оно не обязательно — стикеры и так
// подъезжают, когда предыдущие улетают. Но игрок может захотеть
// посмотреть, что там дальше, и это его право.
prevButton.addEventListener('click', function () { scrollTray(-TRAY_VISIBLE); });
nextButton.addEventListener('click', function () { scrollTray(TRAY_VISIBLE); });

function scrollTray(step) {
  const waiting = stickers.filter(function (s) { return !s.placed; });
  const limit = Math.max(0, waiting.length - TRAY_VISIBLE);

  trayOffset = Math.min(Math.max(0, trayOffset + step), limit);
  log('Полоса пролистана, показываем с', trayOffset + 1);
  layout();
}

function loadLevel(name) {
  level = LEVELS[name];

  // Цвет стены задаёт уровень, а не таблица стилей: у следующего уровня
  // он будет свой. Красим и страницу тоже, чтобы поля по краям совпадали.
  scene.style.background = level.wall;
  document.body.style.background = level.wall;
  background.src = level.background;

  buildDecor();
  buildSlots();
  buildStickers();
  buildOverlays();

  background.addEventListener('load', scheduleLayout);
  scheduleLayout();

  log('Уровень загружен:', name, '| мест:', slots.length, '| стикеров:', stickers.length);
}

function buildSlots() {
  slots = [];

  level.slots.forEach(function (data) {
    // Место — это данные, а не элемент страницы: тапы ловит сцена,
    // а рисовать место незачем. Элемент создаётся только для отладки.
    let element = null;
    if (SHOW_SLOTS) {
      element = document.createElement('div');
      element.className = 'slot visible';
      scene.appendChild(element);
    }

    const slot = {
      id: data.id,
      sticker: data.sticker,
      x: data.x,
      bottom: data.bottom,
      needs: data.needs || null,
      group: data.group || null,
      filled: !!data.filled,
      element: element
    };

    slots.push(slot);
  });
}

// Тап ловит вся сцена, а не отдельные места.
//
// Так надо, потому что места накладываются друг на друга: место для
// половины арбуза занимает всю тарелку, а места для кусочков лежат
// внутри него. Если бы клик ловило само место, половину было бы
// не положить никуда — её всегда перехватывал бы кусочек.
//
// Поэтому решает не то, что сверху, а то, что у игрока в руке.
scene.addEventListener('click', function (event) {
  if (!selected) return;

  const box = scene.getBoundingClientRect();
  const x = event.clientX - box.left;
  const y = event.clientY - box.top;

  const spot = slotAt(x, y, selected.type);
  if (spot) {
    tapSlot(spot);
    return;
  }

  // Место есть, но под другой продукт — говорим «не сюда»
  if (slotAt(x, y, null)) reject(selected, 'здесь другой продукт');
});

// Зона попадания места. Она делается не меньше пальца: банка на полке
// всего 34 px, а промахиваться по ней игрок не должен.
function slotRect(slot) {
  const box = backgroundBox();
  const kind = level.stickers[slot.sticker];

  const width = kind.width * box.width;
  const height = kind.height * box.height;
  const left = box.left + slot.x * box.width;
  const top = box.top + slot.bottom * box.height - height;

  const growX = Math.max(0, TOUCH_MIN - width) / 2;
  const growY = Math.max(0, TOUCH_MIN - height) / 2;

  return {
    left: left - growX,
    right: left + width + growX,
    top: top - growY,
    bottom: top + height + growY,
    centerX: left + width / 2,
    centerY: top + height / 2
  };
}

// Место под точкой. Если задан тип — только места под этот продукт;
// среди подходящих берём то, чей центр ближе к пальцу.
function slotAt(x, y, type) {
  let best = null;
  let bestDistance = Infinity;

  slots.forEach(function (slot) {
    if (type && slot.sticker !== type) return;

    const rect = slotRect(slot);
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;

    const dx = x - rect.centerX;
    const dy = y - rect.centerY;
    const distance = dx * dx + dy * dy;

    // Свободное место всегда важнее занятого: если они лежат друг на друге,
    // игрок целится в свободное
    const penalty = slot.filled ? 1e9 : 0;

    if (distance + penalty < bestDistance) {
      bestDistance = distance + penalty;
      best = slot;
    }
  });

  return best;
}

function buildStickers() {
  stickers = [];

  // Затравки: стикеры, которые уже стоят на своих местах
  slots.forEach(function (slot) {
    if (slot.filled) {
      const sticker = createSticker(slot.sticker);
      sticker.placed = true;
      sticker.slot = slot;
      sticker.element.classList.add('placed');
    }
  });

  // Стикеры игрока — в полосе внизу
  level.tray.forEach(function (type) {
    createSticker(type);
  });
}

// Обстановка уровня: тарелки и прочее, что стоит в холодильнике с самого
// начала. Задаётся так же, как стикеры: x — левый край, bottom — линия,
// на которой вещь стоит.
function buildDecor() {
  decor = [];
  if (!level.decor) return;

  level.decor.forEach(function (data) {
    const element = document.createElement('img');
    element.className = 'decor';
    element.src = data.image;
    element.alt = '';
    decorLayer.appendChild(element);

    decor.push({ x: data.x, bottom: data.bottom, width: data.width, element: element });
  });
}

// Куски фона, которые лежат НАД стикерами: передняя стенка ящиков.
// Ширина задаётся долей от фона, высота подстраивается сама по картинке.
function buildOverlays() {
  overlays = [];
  if (!level.overlays) return;

  level.overlays.forEach(function (data) {
    const element = document.createElement('img');
    element.className = 'overlay';
    element.src = data.image;
    element.alt = '';
    overlaysLayer.appendChild(element);

    overlays.push({ x: data.x, y: data.y, width: data.width, element: element });
  });
}

// Стикер описывается либо просто типом ('cola'), либо парой тип-картинка:
// { type: 'pickle', image: 'images/pickle-3.png' }. Второе нужно, когда
// предметы одного вида выглядят по-разному — шесть банок с соленьями
// ложатся в любое свободное место на полке, но каждая своя.
function createSticker(data) {
  const type = typeof data === 'string' ? data : data.type;
  const kind = level.stickers[type];
  const image = (typeof data === 'object' && data.image) ? data.image : kind.image;

  const element = document.createElement('div');
  element.className = 'sticker';
  element.innerHTML = '<div class="sticker-body"><img src="' + image + '" alt=""></div>';

  const sticker = { type: type, kind: kind, element: element, placed: false, slot: null };

  element.addEventListener('click', function () { selectSticker(sticker); });
  stickersLayer.appendChild(element);
  stickers.push(sticker);

  return sticker;
}

// ---------------------------------------------------------------
//  Координаты
// ---------------------------------------------------------------
//
// Фон вписывается в сцену по ширине и центрируется по высоте.
// Все места на уровне заданы долями от фона — поэтому уровень
// одинаково правильно ложится на любой экран.

// Прямоугольник фона внутри сцены.
//
// Вписываем целиком: сначала пробуем по ширине, и если по высоте не влезло —
// считаем от высоты. Если вписывать всегда по ширине, то на широком и низком
// окне (браузер на ноутбуке) холодильник обрежется сверху и снизу.
// Результат запоминается: за один тап он спрашивается по разу на каждое
// место, а мест на уровне три десятка. Сбрасывается, когда меняется экран.
let boxCache = null;

function backgroundBox() {
  if (boxCache) return boxCache;

  const sceneW = scene.clientWidth;
  const sceneH = scene.clientHeight;
  const ratio = background.naturalWidth / background.naturalHeight;

  let width = sceneW;
  let height = width / ratio;

  if (height > sceneH) {
    height = sceneH;
    width = height * ratio;
  }

  boxCache = {
    left: (sceneW - width) / 2,
    top: (sceneH - height) / 2,
    width: width,
    height: height
  };

  return boxCache;
}

// Размер стикера на его месте в холодильнике
function stickerSize(sticker) {
  const box = backgroundBox();
  return {
    width: sticker.kind.width * box.width,
    height: sticker.kind.height * box.height
  };
}

// В полосе стикер крупнее, чем на полке: так его удобно взять пальцем
// и хорошо видно, что берёшь. В полёте он плавно уменьшается до размера места.
//
// Увеличение урезается дважды: по высоте полосы, чтобы стикер не торчал
// за её край, и по ширине, чтобы весь ряд поместился и ничего не вылезло вбок.
function traySize(sticker, total) {
  const size = stickerSize(sticker);

  const maxHeight = tray.clientHeight - TRAY_PADDING;
  const maxWidth = (trayInnerWidth() - TRAY_GAP * (total - 1)) / total;

  let scale = TRAY_SCALE;
  if (size.height * scale > maxHeight) scale = maxHeight / size.height;
  if (size.width * scale > maxWidth) scale = maxWidth / size.width;

  return {
    width: size.width * scale,
    height: size.height * scale
  };
}

// Стикеры лежат в слое поверх всего экрана, поэтому к координатам
// внутри сцены добавляем смещение самой сцены.
function positionInSlot(sticker, slot) {
  const box = backgroundBox();
  const size = stickerSize(sticker);

  return {
    x: scene.offsetLeft + box.left + slot.x * box.width,
    // bottom — линия, на которой стикер СТОИТ, поэтому вычитаем его высоту
    y: scene.offsetTop + box.top + slot.bottom * box.height - size.height
  };
}

// Сколько места в полосе остаётся стикерам: вычитаем края под стрелки
function trayInnerWidth() {
  return tray.clientWidth - TRAY_ARROW * 2 - TRAY_PADDING;
}

// Раскладка всей полосы разом.
//
// Каждый следующий стикер встаёт в TRAY_GAP пикселях от правого края
// предыдущего. Считать позицию как «номер × ширина» нельзя: у банки,
// перца и апельсина ширина разная, и они налезали бы друг на друга.
function trayLayout(visible) {
  const sizes = visible.map(function (s) { return traySize(s, visible.length); });

  let rowWidth = TRAY_GAP * (visible.length - 1);
  sizes.forEach(function (size) { rowWidth += size.width; });

  let x = tray.offsetLeft + (tray.clientWidth - rowWidth) / 2;

  return sizes.map(function (size) {
    const place = {
      size: size,
      x: x,
      y: tray.offsetTop + (tray.clientHeight - size.height) / 2
    };
    x += size.width + TRAY_GAP;
    return place;
  });
}

function moveTo(sticker, point) {
  sticker.element.style.transform = 'translate(' + point.x + 'px, ' + point.y + 'px)';
}

// Раскладывать можно только когда известны и размер сцены, и размер картинки.
// В начале загрузки они ещё нулевые, поэтому ждём и пробуем снова.
//
// Здесь нарочно setTimeout, а не requestAnimationFrame: в фоновой вкладке
// браузер перестаёт выдавать кадры, и rAF никогда не срабатывает —
// игра осталась бы неразложенной.
function scheduleLayout(attempt) {
  attempt = attempt || 0;

  setTimeout(function () {
    if (scene.clientWidth && background.naturalWidth) {
      layout();
      return;
    }

    if (attempt < 200) {
      scheduleLayout(attempt + 1);
    } else {
      log('Не дождались размеров сцены или картинки фона');
    }
  }, 16);
}

// Разложить всё по местам. Вызывается при старте, при изменении размера
// окна и после каждой постановки стикера.
function layout() {
  boxCache = null;               // размеры могли поменяться

  layoutBackground();
  layoutDecor();
  layoutOverlays();
  layoutSlots();
  layoutStickers();
}

function layoutBackground() {
  const box = backgroundBox();

  background.style.width = box.width + 'px';
  background.style.left = box.left + 'px';
  background.style.top = box.top + 'px';
}

function layoutDecor() {
  const box = backgroundBox();

  decor.forEach(function (item) {
    const width = item.width * box.width;
    const height = item.element.naturalHeight
      ? width * item.element.naturalHeight / item.element.naturalWidth
      : 0;

    item.element.style.width = width + 'px';
    item.element.style.left = (box.left + item.x * box.width) + 'px';
    item.element.style.top = (box.top + item.bottom * box.height - height) + 'px';
  });
}

function layoutOverlays() {
  const box = backgroundBox();

  overlays.forEach(function (overlay) {
    overlay.element.style.left = (scene.offsetLeft + box.left + overlay.x * box.width) + 'px';
    overlay.element.style.top = (scene.offsetTop + box.top + overlay.y * box.height) + 'px';
    overlay.element.style.width = (overlay.width * box.width) + 'px';
  });
}

// Места невидимы и тапы не ловят, поэтому в обычной игре их в разметке нет.
// Показываются только при SHOW_SLOTS, когда надо настроить координаты.
function layoutSlots() {
  if (!SHOW_SLOTS) return;

  slots.forEach(function (slot) {
    const rect = slotRect(slot);

    slot.element.style.left = rect.left + 'px';
    slot.element.style.top = rect.top + 'px';
    slot.element.style.width = (rect.right - rect.left) + 'px';
    slot.element.style.height = (rect.bottom - rect.top) + 'px';
  });
}

function layoutStickers() {
  const waiting = stickers.filter(function (s) { return !s.placed; });

  // Если хвост очереди укоротился, подтягиваем окно назад,
  // иначе полоса окажется пустой при непустой очереди
  trayOffset = Math.min(trayOffset, Math.max(0, waiting.length - TRAY_VISIBLE));

  const visible = waiting.slice(trayOffset, trayOffset + TRAY_VISIBLE);
  const places = trayLayout(visible);

  // Стрелка есть только тогда, когда ей есть что сделать
  prevButton.hidden = trayOffset === 0;
  nextButton.hidden = trayOffset + TRAY_VISIBLE >= waiting.length;

  stickers.forEach(function (sticker) {
    if (sticker.placed) {
      const size = stickerSize(sticker);
      sticker.element.style.display = '';
      sticker.element.style.width = size.width + 'px';
      sticker.element.style.height = size.height + 'px';
      moveTo(sticker, positionInSlot(sticker, sticker.slot));
      return;
    }

    const index = visible.indexOf(sticker);

    // Стикеры сверх пятёрки ждут очереди и пока не показываются
    if (index === -1) {
      sticker.element.style.display = 'none';
      return;
    }

    const place = places[index];
    sticker.element.style.display = '';
    sticker.element.style.width = place.size.width + 'px';
    sticker.element.style.height = place.size.height + 'px';
    moveTo(sticker, place);
  });
}

// ---------------------------------------------------------------
//  Действия игрока
// ---------------------------------------------------------------

function selectSticker(sticker) {
  if (sticker.placed) return;

  // Повторный тап по выбранному — снять выбор, иначе игрок в ловушке
  if (selected === sticker) {
    selected.element.classList.remove('selected');
    selected = null;
    log('Стикер отменён:', sticker.type);
    return;
  }

  if (selected) selected.element.classList.remove('selected');

  selected = sticker;
  sticker.element.classList.add('selected');
  playSelect();
  log('Стикер выбран:', sticker.type);
}

function slotById(id) {
  return slots.filter(function (s) { return s.id === id; })[0];
}

// ВСЕ правила игры собраны здесь, в одном месте.
//
// Возвращает null, если стикер сюда можно, или причину отказа строкой.
// Новое правило добавляется одной проверкой сюда, а не ещё одним «если»
// по коду — иначе с каждым продуктом правила расползались бы всё шире.
function whyNot(sticker, slot) {
  if (slot.filled) return 'место занято';

  if (slot.sticker !== sticker.type) return 'сюда идёт другой стикер';

  // Банка не висит в воздухе: под ней должно быть занято
  if (slot.needs && !slotById(slot.needs).filled) return 'под этим местом пусто';

  if (slot.group) {
    // Тарелка занята другим продуктом: на ту, где лежит половина арбуза,
    // кусочки уже не положить
    const busy = occupiedBy(slot.group);
    if (busy && busy !== sticker.type) return 'тарелка занята другим продуктом';

    // Этот продукт уже разложен на другой тарелке — значит весь идёт туда
    const mine = groupOf(sticker.type);
    if (mine && mine !== slot.group) return 'этот продукт уже лежит на другой тарелке';
  }

  return null;
}

function tapSlot(slot) {
  if (!selected) return;

  const problem = whyNot(selected, slot);
  if (problem) {
    reject(selected, problem);
    return;
  }

  place(selected, slot);
}

// Что лежит в этой группе мест (например, на левой тарелке)
function occupiedBy(group) {
  const taken = slots.filter(function (s) {
    return s.group === group && s.filled;
  })[0];

  return taken ? taken.sticker : null;
}

// В какой группе уже лежит этот продукт
function groupOf(type) {
  const taken = slots.filter(function (s) {
    return s.group && s.filled && s.sticker === type;
  })[0];

  return taken ? taken.group : null;
}

function place(sticker, slot) {
  sticker.element.classList.remove('selected');
  selected = null;

  // Летим и одновременно уменьшаемся до размера места на полке
  sticker.element.classList.add('flying', 'placed');

  const size = stickerSize(sticker);
  sticker.element.style.width = size.width + 'px';
  sticker.element.style.height = size.height + 'px';
  moveTo(sticker, positionInSlot(sticker, slot));

  sticker.placed = true;
  sticker.slot = slot;
  slot.filled = true;

  // Положенный позже ложится поверх: кусочки арбуза перекрывают друг друга
  // в том порядке, в каком их клали
  placeOrder += 1;
  sticker.element.style.zIndex = placeOrder;

  log('Летит:', sticker.type, '→', slot.id);

  // Приземление. Звук играет ИМЕННО ЗДЕСЬ, а не в момент тапа —
  // иначе ухо не связывает щелчок с касанием поверхности.
  setTimeout(function () {
    sticker.element.classList.remove('flying');
    sticker.element.classList.add('snap');
    feedbackSnap();
    log('Приземлился:', sticker.type, '→', slot.id);

    setTimeout(function () {
      sticker.element.classList.remove('snap');
    }, SNAP_TIME);
  }, FLY_TIME);

  // Стикер улетел из полосы — оставшиеся сдвигаются к центру
  layout();
}

// Мягкое «не туда»: стикер дрогнул, выбор НЕ снимается.
// Смысл — сказать «не сюда», а не «ты ошиблась».
function reject(sticker, why) {
  sticker.element.classList.remove('reject');
  void sticker.element.offsetWidth;   // сброс, чтобы анимация проиграла заново
  sticker.element.classList.add('reject');

  playReject();
  log('Не туда:', why);

  setTimeout(function () {
    sticker.element.classList.remove('reject');
  }, REJECT_TIME);
}

// Отклик в момент приземления: звук и вибрация вместе.
// Вибрация работает только внутри Telegram — в браузере её просто нет.
function feedbackSnap() {
  playSnap();

  if (vibrationOn && tg && tg.HapticFeedback) {
    tg.HapticFeedback.impactOccurred('light');
    log('Вибрация: тук');
  }
}

// --- Старт ---
loadLevel('fridge');

window.addEventListener('resize', function () {
  boxCache = null;
  layout();
});
