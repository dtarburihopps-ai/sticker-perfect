// Sticker Perfect — игра

// Поставь false перед показом, чтобы убрать отладочные сообщения из консоли
const DEBUG = true;

// Показать границы мест, куда можно класть. Помогает целиться при настройке.
const SHOW_SLOTS = false;

function log() {
  if (DEBUG) console.log.apply(console, arguments);
}

// ВАЖНО: эти числа должны совпадать с --fly-time, --stick-time и --reject-time
// в style.css. Меняешь тут — поменяй и там.
const FLY_TIME = 280;
const SNAP_TIME = 220;
const REJECT_TIME = 150;

// Во сколько раз стикер в нижней полосе крупнее, чем на полке.
// Банка на полке всего ~24 px в ширину — пальцем в такое не попасть.
const TRAY_SCALE = 1.8;

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
let selected = null;   // какой стикер сейчас выбран

function loadLevel(name) {
  level = LEVELS[name];

  scene.style.background = level.wall;
  background.src = level.background;

  buildSlots();
  buildStickers();

  background.addEventListener('load', scheduleLayout);
  scheduleLayout();

  log('Уровень загружен:', name, '| мест:', slots.length, '| стикеров:', stickers.length);
}

function buildSlots() {
  slots = [];

  level.slots.forEach(function (data) {
    const element = document.createElement('div');
    element.className = 'slot';
    if (SHOW_SLOTS) element.classList.add('visible');
    scene.appendChild(element);

    const slot = {
      id: data.id,
      sticker: data.sticker,
      x: data.x,
      bottom: data.bottom,
      needs: data.needs || null,
      filled: !!data.filled,
      element: element
    };

    element.addEventListener('click', function () { tapSlot(slot); });
    slots.push(slot);
  });
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

function createSticker(type) {
  const kind = level.stickers[type];

  const element = document.createElement('div');
  element.className = 'sticker';
  element.innerHTML = '<div class="sticker-body"><img src="' + kind.image + '" alt=""></div>';

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

// Прямоугольник фона внутри сцены
function backgroundBox() {
  const width = scene.clientWidth;
  const height = width * (background.naturalHeight / background.naturalWidth);

  return {
    left: 0,
    top: (scene.clientHeight - height) / 2,
    width: width,
    height: height
  };
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
function traySize(sticker) {
  const size = stickerSize(sticker);
  return {
    width: size.width * TRAY_SCALE,
    height: size.height * TRAY_SCALE
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

function positionInTray(sticker, index, total) {
  const size = traySize(sticker);

  const gap = 14;
  const step = size.width + gap;
  const rowWidth = total * step - gap;

  return {
    x: tray.offsetLeft + (tray.clientWidth - rowWidth) / 2 + index * step,
    y: tray.offsetTop + (tray.clientHeight - size.height) / 2
  };
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

// Разложить всё по местам. Вызывается при старте и при изменении размера окна.
function layout() {
  const box = backgroundBox();

  background.style.width = box.width + 'px';
  background.style.top = box.top + 'px';

  slots.forEach(function (slot) {
    const kind = level.stickers[slot.sticker];
    const width = kind.width * box.width;
    const height = kind.height * box.height;

    slot.element.style.width = width + 'px';
    slot.element.style.height = height + 'px';
    slot.element.style.left = (box.left + slot.x * box.width) + 'px';
    slot.element.style.top = (box.top + slot.bottom * box.height - height) + 'px';
  });

  const waiting = stickers.filter(function (s) { return !s.placed; });

  stickers.forEach(function (sticker) {
    const size = sticker.placed ? stickerSize(sticker) : traySize(sticker);
    sticker.element.style.width = size.width + 'px';
    sticker.element.style.height = size.height + 'px';

    if (sticker.placed) {
      moveTo(sticker, positionInSlot(sticker, sticker.slot));
    } else {
      moveTo(sticker, positionInTray(sticker, waiting.indexOf(sticker), waiting.length));
    }
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

function tapSlot(slot) {
  if (!selected) return;

  const sticker = selected;

  if (slot.filled) {
    reject(sticker, 'место занято');
    return;
  }

  if (slot.sticker !== sticker.type) {
    reject(sticker, 'сюда идёт другой стикер');
    return;
  }

  // Банка не висит в воздухе: под ней должно быть занято
  if (slot.needs && !slotById(slot.needs).filled) {
    reject(sticker, 'под этим местом пусто');
    return;
  }

  place(sticker, slot);
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
window.addEventListener('resize', layout);
