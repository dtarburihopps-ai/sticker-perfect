
// Sticker Perfect — игра

// Показать границы мест, куда можно класть. Помогает целиться при настройке.
const SHOW_SLOTS = false;

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

// Высота полосы по умолчанию. Читается из стилей, чтобы одно и то же
// число не жило в двух файлах; уровень может попросить свою.
const TRAY_HEIGHT = parseFloat(
  getComputedStyle(document.documentElement).getPropertyValue('--tray-height'));

// Наименьшая зона попадания. Продукты на полке бывают по 33 px,
// а палец промахиваться не должен.
const TOUCH_MIN = 44;

// Пауза перед приходом кота: даём последнему стикеру улечься,
// а игроку — увидеть собранную картинку
const MASCOT_DELAY = 450;

// Пауза перед последней наклейкой на вступлении. Больше, чем у кота:
// игрок должен успеть понять, что обложка готова, и только потом
// увидеть, что пришло название
const FINAL_DELAY = 700;

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

const mascot = document.getElementById('mascot');

const nextLevelButton = document.getElementById('next-level');

const finishPanel = document.getElementById('finish');

const toMenuButton = document.getElementById('to-menu');

const backButton = document.getElementById('back-to-menu');

// Выход в меню. Сам переход живёт в progress.js — там же, где все
// остальные переходы между экранами.
backButton.addEventListener('click', goToMenu);
toMenuButton.addEventListener('click', goToMenu);
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

let levelName = '';    // как уровень называется в LEVELS — нужно, чтобы знать следующий

let free = false;      // уровень без мест: стикер клеится куда угодно

let ordered = false;   // уровень на порядок: карандаши от светлого к тёмному

let grouped = false;   // уровень на группы: пуговицы по форме или по цвету

let anySlot = false;   // место принимает любой стикер, а не свой продукт

let trayVisible = TRAY_VISIBLE;   // сколько стикеров показывать в полосе

let slots = [];        // места на сцене

let stickers = [];     // все стикеры: и затравки, и те, что кладёт игрок

let decor = [];        // обстановка: лежит с начала уровня и не двигается

let overlays = [];     // куски фона поверх стикеров

let selected = null;   // какой стикер сейчас выбран

let trayOffset = 0;    // с какого по счёту стикера показана полоса

let placeOrder = 0;    // счётчик постановок: кто позже, тот выше лежит

let finished = false;  // уровень уже собран

let finalGiven = false; // последняя наклейка вступления уже выдана

// Листание полосы. Само по себе оно не обязательно — стикеры и так
// подъезжают, когда предыдущие улетают. Но игрок может захотеть
// посмотреть, что там дальше, и это его право.
prevButton.addEventListener('click', function () { scrollTray(-trayVisible); });
nextButton.addEventListener('click', function () { scrollTray(trayVisible); });
function scrollTray(step) {
  const waiting = stickers.filter(function (s) { return !s.placed; });
  const limit = Math.max(0, waiting.length - trayVisible);

  trayOffset = Math.min(Math.max(0, trayOffset + step), limit);
  log('Полоса пролистана, показываем с', trayOffset + 1);
  layout();
}

function loadLevel(name) {
  level = LEVELS[name];
  levelName = name;

  // Четыре устройства уровня. В холодильнике и автомате места посчитаны
  // заранее и каждое ждёт свой продукт; на дверце мест нет вообще;
  // в коробке с карандашами и в ящике с пуговицами места принимают любой
  // стикер, а правильность проверяется в конце — порядком или признаком.
  //
  // Классом на экране пользуется таблица стилей: там, где стикер можно
  // снять и переложить, приклеенный ловит тапы, а на полке — нет.
  free = level.mode === 'free';
  ordered = level.mode === 'order';
  grouped = level.mode === 'groups';

  // В этих двух устройствах место принимает любой стикер, а правильность
  // проверяется только в конце: порядок в ряду или признак в отсеке.
  anySlot = ordered || grouped;
  app.classList.toggle('movable', free || anySlot);

  // Вступление ведёт себя иначе: уходить с него некуда — это первый
  // экран игры, — а его стрелка в конце открывает меню
  app.classList.toggle('intro', !!level.intro);

  // Полоса внизу подстраивается под уровень: карандаши длинные и узкие,
  // при обычной высоте восемь штук ужимаются в ниточки, в которые не попасть.
  trayVisible = level.trayVisible || TRAY_VISIBLE;
  document.documentElement.style.setProperty(
    '--tray-height', (level.trayHeight || TRAY_HEIGHT) + 'px');

  // Цвет стены задаёт уровень, а не таблица стилей: у следующего уровня
  // он будет свой. Красим и страницу тоже, чтобы поля по краям совпадали.
  scene.style.background = level.wall;
  document.body.style.background = level.wall;
  withBlur(background, level.background);
  background.src = level.background;

  buildDecor();
  buildSlots();
  buildStickers();
  buildOverlays();

  background.addEventListener('load', scheduleLayout);
  scheduleLayout();

  log('Уровень загружен:', name, '| мест:', slots.length, '| стикеров:', stickers.length);

  // Пока игрок собирает этот уровень, тихо тянем картинки следующего.
  // Ждём события load — оно случается, когда всё нужное ЭТОМУ уровню
  // уже пришло: отбирать у него сеть нельзя.
  window.addEventListener('load', function () {
    preloadLevel(nextLevelName(levelName));
  });
}


function buildSlots() {
  slots = [];
  if (!level.slots) return;

  level.slots.forEach(function (data) {
    // Место — это данные, а не элемент страницы: тапы ловит сцена,
    // а рисовать место незачем. Элемент создаётся только для отладки.
    let element = null;
    if (SHOW_SLOTS) {
      element = document.createElement('div');
      element.className = 'slot visible';
      scene.appendChild(element);
    }

    // Но на вступлении места видны нарочно: у каждого напечатан контур
    // по форме своей наклейки. Это и есть всё обучение уровня.
    const kind = level.stickers[data.sticker];
    let outline = null;
    if (kind && kind.spot) {
      outline = document.createElement('img');
      outline.className = 'spot';
      withBlur(outline, kind.spot);
      outline.src = kind.spot;
      outline.alt = '';
      decorLayer.appendChild(outline);
    }

    const slot = {
      id: data.id,
      sticker: data.sticker,
      x: data.x,
      bottom: data.bottom,
      needs: data.needs || null,
      group: data.group || null,
      filled: !!data.filled,
      fixed: !!data.fixed,      // затравку с этого места не снять
      last: !!data.last,        // место последней наклейки уровня
      element: element,
      outline: outline
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

  // Уровень без мест: клеим прямо сюда, правила проверяет dropHere
  if (free) {
    dropHere(x, y);
    return;
  }

  // В коробке с карандашами место принимает любой стикер, поэтому
  // не спрашиваем «есть ли место под этот тип», а берём ближайшее
  const spot = slotAt(x, y, anySlot ? null : selected.type);
  if (spot) {
    tapSlot(spot);
    return;
  }

  // Место есть, но под другой продукт — говорим «не сюда»
  if (slotAt(x, y, null)) reject(selected, 'здесь другой продукт');
});


function buildStickers() {
  stickers = [];

  // Затравки: стикеры, которые уже стоят на своих местах
  slots.forEach(function (slot) {
    if (slot.filled) {
      const sticker = createSticker(slot.sticker);
      sticker.placed = true;
      sticker.slot = slot;
      sticker.fixed = slot.fixed;
      sticker.element.classList.add('placed');
      if (slot.fixed) sticker.element.classList.add('fixed');
    }
  });

  // Затравки уровня без мест: магниты, которые висят с самого начала.
  // Места у них нет, есть точка на фоне, куда их однажды приклеили.
  (level.placed || []).forEach(function (data) {
    const sticker = createSticker(data.sticker);
    sticker.placed = true;
    sticker.spot = { x: data.x, y: data.y };
    sticker.element.classList.add('placed');
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
    withBlur(element, data.image);
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
    withBlur(element, data.image);
    element.src = data.image;
    element.alt = '';
    overlaysLayer.appendChild(element);

    overlays.push({ x: data.x, y: data.y, width: data.width, element: element });
  });
}

// Стикер описывается либо просто типом ('cola'), либо парой тип-картинка:
// { type: 'pickle', image: 'web/pickle-3.webp' }. Второе нужно, когда
// предметы одного вида выглядят по-разному — шесть банок с соленьями
// ложатся в любое свободное место на полке, но каждая своя.
function createSticker(data) {
  const type = typeof data === 'string' ? data : data.type;
  const kind = level.stickers[type];
  const image = (typeof data === 'object' && data.image) ? data.image : kind.image;

  const element = document.createElement('div');
  element.className = 'sticker';
  element.innerHTML = '<div class="sticker-body"><img src="' + image + '" alt=""></div>';
  withBlur(element.querySelector('img'), image);

  // slot — место в холодильнике, spot — точка на дверце.
  // У стикера всегда занято что-то одно из двух.
  const sticker = {
    type: type, kind: kind, element: element,
    placed: false, slot: null, spot: null, fixed: false
  };

  element.addEventListener('click', function () { selectSticker(sticker); });
  stickersLayer.appendChild(element);
  stickers.push(sticker);

  return sticker;
}


// ---------------------------------------------------------------
//  Действия игрока
// ---------------------------------------------------------------

// Что сейчас в руке. Класс на экране нужен таблице стилей: пока игрок
// держит стикер, приклеенные магниты перестают ловить тапы. Тап по
// занятому месту значит «клей сюда», а не «сними тот, что уже висит».
function hold(sticker) {
  selected = sticker;
  app.classList.toggle('holding', !!sticker);
}

function selectSticker(sticker) {
  // Приклеенный стикер не трогаем — кроме магнитов на дверце и карандашей
  // в коробке. Там снять и переложить это часть игры, а не ошибка.
  if (sticker.placed && !free && !anySlot) return;

  // Затравки стоят намертво: они показывают, где светлое, а где тёмное,
  // и если их можно утащить, подсказка перестаёт быть подсказкой
  if (sticker.fixed) return;

  // Повторный тап по выбранному — снять выбор, иначе игрок в ловушке
  if (selected === sticker) {
    selected.element.classList.remove('selected');
    hold(null);
    log('Стикер отменён:', sticker.type);
    return;
  }

  if (selected) selected.element.classList.remove('selected');

  hold(sticker);
  sticker.element.classList.add('selected');
  playSelect();
  log('Стикер выбран:', sticker.type);
}


function tapSlot(slot) {
  if (!selected) return;

  // Занятое место в коробке — не отказ, а обмен: сортировка вся про
  // перестановки, и без обмена каждая правка стоила бы трёх тапов
  // вместо двух.
  if (anySlot && slot.filled) {
    swap(selected, slot);
    return;
  }

  const problem = whyNot(selected, slot);
  if (problem) {
    reject(selected, problem);
    return;
  }

  place(selected, slot);
}


// Обмен: игрок кладёт карандаш туда, где уже лежит другой.
//
// Тот, что лежал, уезжает туда, откуда пришёл новый: на его место
// в коробке или обратно в полосу, если новый взят оттуда.
function swap(sticker, slot) {
  const other = stickerIn(slot);
  const home = sticker.slot;

  if (!other || other.fixed) {
    reject(sticker, 'этот карандаш стоит намертво');
    return;
  }

  if (home) {
    other.slot = home;
    home.filled = true;
    log('Меняются местами:', sticker.type, '↔', other.type);
    fly(other, home.id);
  } else {
    other.placed = false;
    other.slot = null;
    other.element.classList.remove('placed');
    other.element.style.zIndex = '';

    // Класс полёта оставляем на время переезда, чтобы карандаш
    // не прыгнул в полосу рывком, а доехал
    other.element.classList.add('flying');
    setTimeout(function () { other.element.classList.remove('flying'); }, FLY_TIME);
    log('Уехал обратно в полосу:', other.type);
  }

  // Место игрока освободилось ещё до полёта: иначе place() снял бы
  // отметку «занято» с того места, куда только что уехал сосед
  sticker.slot = null;
  place(sticker, slot);
}


function place(sticker, slot) {
  // Карандаш мог переехать с другого места — оно освобождается
  if (sticker.slot) sticker.slot.filled = false;

  sticker.slot = slot;
  slot.filled = true;

  log('Летит:', sticker.type, '→', slot.id);
  fly(sticker, slot.id);
}

// Полёт и посадка, общие для обоих устройств уровня. Куда лететь, стикер
// к этому моменту уже знает: место на полке или точка на дверце.
function fly(sticker, where) {
  sticker.element.classList.remove('selected');
  hold(null);

  // Летим и одновременно уменьшаемся до размера на сцене
  sticker.element.classList.add('flying', 'placed');

  const size = stickerSize(sticker);
  sticker.element.style.width = size.width + 'px';
  sticker.element.style.height = size.height + 'px';
  sticker.placed = true;
  moveTo(sticker, stickerPosition(sticker));

  // Положенный позже ложится поверх: кусочки арбуза перекрывают друг друга
  // в том порядке, в каком их клали
  placeOrder += 1;
  sticker.element.style.zIndex = placeOrder;

  // Приземление. Звук играет ИМЕННО ЗДЕСЬ, а не в момент тапа —
  // иначе ухо не связывает щелчок с касанием поверхности.
  setTimeout(function () {
    sticker.element.classList.remove('flying');
    sticker.element.classList.add('snap');
    feedbackSnap();
    log('Приземлился:', sticker.type, '→', where);

    setTimeout(function () {
      sticker.element.classList.remove('snap');
      checkFinished();
    }, SNAP_TIME);
  }, FLY_TIME);

  // Стикер улетел из полосы — оставшиеся сдвигаются к центру
  layout();
}


function dropHere(x, y) {
  const box = backgroundBox();
  const size = stickerSize(selected);

  // Магнит встаёт центром туда, куда ткнули пальцем
  const point = findSpot(selected, x - size.width / 2, y - size.height / 2);

  if (!point) {
    reject(selected, 'на двери не осталось места');
    return;
  }

  selected.spot = {
    x: (point.left - box.left) / box.width,
    y: (point.top - box.top) / box.height
  };

  log('Летит:', selected.type, '→ дверь');
  fly(selected, 'дверь');
}


// Переход адресом, с перезагрузкой страницы. Так уровень начинается
// с чистого листа: не надо руками разбирать предыдущий.
nextLevelButton.addEventListener('click', function () {
  // Вступление пройдено — больше его не показываем, уходим в альбом
  if (level.intro) {
    introDone();
    goToMenu();
    return;
  }

  const next = nextLevelName(levelName);
  if (!next) return;

  log('Идём дальше:', next);
  openLevel(next);
});
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

// Что открыть при запуске — меню или уровень — решает menu.js,
// а порядок уровней и прогресс живут в progress.js. Уровень
// по-прежнему можно открыть адресом, ?level=fridge, это удобно
// при настройке.

window.addEventListener('resize', function () {
  boxCache = null;
  layout();
});
