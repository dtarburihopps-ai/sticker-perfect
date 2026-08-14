// Sticker Perfect — игра

// Поставь false перед показом, чтобы убрать отладочные сообщения из консоли
const DEBUG = true;

function log() {
  if (DEBUG) console.log.apply(console, arguments);
}

// --- Telegram ---
// tg будет null, если открыли файл просто в браузере. Это нормально —
// игра должна работать и так, поэтому везде проверяем "если tg есть".
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

if (tg) {
  tg.ready();
  tg.expand();
  log('Telegram: запущено внутри мини-аппа');
} else {
  log('Telegram: нет, работаем в обычном браузере');
}

// --- Элементы страницы ---
const app = document.getElementById('app');
const tray = document.getElementById('tray');
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
//  Стикеры
// ---------------------------------------------------------------

// ВАЖНО: эти числа должны совпадать с --fly-time и --stick-time
// в style.css. Меняешь тут — поменяй и там.
const FLY_TIME = 280;
const SNAP_TIME = 220;

// Пока один стикер и одна зона — проверяем само ощущение.
// На задаче 5 всё это переедет в отдельный файл с уровнями.
const stickers = [
  { id: 'pencil', width: 16, height: 62, zoneId: 'zone-cup' }
];

// Какой стикер сейчас выбран (null — ни один)
let selected = null;

// Создаём элементы стикеров
stickers.forEach(function (sticker) {
  const element = document.createElement('div');
  element.className = 'sticker';
  element.style.width = sticker.width + 'px';
  element.style.height = sticker.height + 'px';
  element.innerHTML = '<div class="sticker-body"></div>';

  element.addEventListener('click', function () {
    selectSticker(sticker);
  });

  stickersLayer.appendChild(element);

  sticker.element = element;
  sticker.placed = false;   // уже приклеен?
});

// Зоны ловят тапы
document.querySelectorAll('.zone').forEach(function (zone) {
  zone.addEventListener('click', function () {
    tapZone(zone);
  });
});

// --- Координаты ---
// Всё считаем относительно #app: и место в полосе, и место на сцене.
// Одна система координат — стикеру не нужно никуда «перепрыгивать» во время полёта.

function positionInTray(sticker, index, total) {
  const appBox = app.getBoundingClientRect();
  const trayBox = tray.getBoundingClientRect();

  const gap = 12;
  const stepWidth = sticker.width + gap;
  const rowWidth = total * stepWidth - gap;
  const startX = trayBox.left - appBox.left + (trayBox.width - rowWidth) / 2;

  return {
    x: startX + index * stepWidth,
    y: trayBox.top - appBox.top + (trayBox.height - sticker.height) / 2
  };
}

function positionInZone(sticker, zone) {
  const appBox = app.getBoundingClientRect();
  const zoneBox = zone.getBoundingClientRect();

  return {
    x: zoneBox.left - appBox.left + (zoneBox.width - sticker.width) / 2,
    y: zoneBox.top - appBox.top + (zoneBox.height - sticker.height) / 2
  };
}

function moveTo(sticker, point) {
  sticker.element.style.transform = 'translate(' + point.x + 'px, ' + point.y + 'px)';
}

// Разложить всё по местам. Вызывается при старте и при изменении размера окна.
function layout() {
  const waiting = stickers.filter(function (s) { return !s.placed; });

  stickers.forEach(function (sticker) {
    if (sticker.placed) {
      moveTo(sticker, positionInZone(sticker, sticker.placedZone));
    } else {
      const index = waiting.indexOf(sticker);
      moveTo(sticker, positionInTray(sticker, index, waiting.length));
    }
  });
}

// --- Действия игрока ---

function selectSticker(sticker) {
  if (sticker.placed) return;

  // Повторный тап по выбранному — снять выбор, иначе игрок в ловушке
  if (selected === sticker) {
    selected.element.classList.remove('selected');
    selected = null;
    log('Стикер отменён:', sticker.id);
    return;
  }

  if (selected) selected.element.classList.remove('selected');

  selected = sticker;
  sticker.element.classList.add('selected');
  log('Стикер выбран:', sticker.id);
}

function tapZone(zone) {
  if (!selected) return;

  const sticker = selected;

  if (sticker.zoneId !== zone.id) {
    log('Промах:', sticker.id, '→', zone.id);
    return;   // реакцию на промах делаем на задаче 7
  }

  sticker.element.classList.remove('selected');
  selected = null;

  // Полёт
  sticker.element.classList.add('flying');
  moveTo(sticker, positionInZone(sticker, zone));

  sticker.placed = true;
  sticker.placedZone = zone;
  sticker.element.classList.add('placed');

  log('Летит:', sticker.id, '→', zone.id);

  // Приземление: снимаем режим полёта и пружиним
  setTimeout(function () {
    sticker.element.classList.remove('flying');
    sticker.element.classList.add('snap');
    log('Приземлился:', sticker.id);

    setTimeout(function () {
      sticker.element.classList.remove('snap');
    }, SNAP_TIME);
  }, FLY_TIME);

  // Стикер улетел из полосы — оставшиеся сдвигаются к центру
  layout();
}

// --- Старт ---
layout();
window.addEventListener('resize', layout);

log('Каркас загружен');
