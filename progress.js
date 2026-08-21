// Sticker Perfect — порядок уровней, прогресс и переходы
//
// Единственное место, где записано, в каком порядке идут уровни, как
// далеко игрок продвинулся и как попасть с экрана на экран.
//
// Раньше это жило в двух файлах сразу: game.js сам считал, какой уровень
// следующий, а menu.js — какие уже открыты, и списки у них были разные.

// --- Порядок ---
//
// Отдельного списка уровней не заводим: порядок уже задан тем, как они
// написаны в levels.js, и держать его в двух местах незачем.
//
// Список ровно один, потому что вступление лежит не в LEVELS, а само
// по себе. Пока оно было внутри, списка приходилось держать два — один
// со вступлением, другой без, — и сходились они только потому, что
// вступление стояло первым.
const LEVEL_NAMES = Object.keys(LEVELS);

// Описание по имени. Вступление лежит отдельно, поэтому спрашивать нужно
// здесь, а не лезть в LEVELS напрямую.
function levelByName(name) {
  return name === INTRO_NAME ? INTRO : LEVELS[name];
}

// Следующий уровень — просто следующий по списку. Отдельной строкой
// записано только то, что после вступления идёт первый уровень альбома.
function nextLevelName(name) {
  if (name === INTRO_NAME) return LEVEL_NAMES[0] || null;
  return LEVEL_NAMES[LEVEL_NAMES.indexOf(name) + 1] || null;
}

// --- Прогресс ---
//
// Храним одно число: сколько уровней открыто. Уровни идут строго по
// очереди, поэтому списка не нужно — «открыто 3» значит открыты первый,
// второй и третий.
//
// localStorage живёт в браузере: закрыла игру — прогресс остался.
// В телеграме у мини-аппа свой браузер, но ведёт себя так же.
const PROGRESS_KEY = 'sticker-perfect-open';
const INTRO_KEY = 'sticker-perfect-intro';

// Вступление показывается один раз: во второй запуск игрок хочет играть,
// а не смотреть, как открывается альбом.
function introSeen() {
  try {
    return localStorage.getItem(INTRO_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function introDone() {
  remember(INTRO_KEY, '1');
  log('Вступление пройдено');
}

function openedCount() {
  // Первый уровень открыт всегда, иначе играть было бы не во что
  try {
    return Math.min(Math.max(1, parseInt(localStorage.getItem(PROGRESS_KEY), 10) || 1),
                    LEVEL_NAMES.length);
  } catch (e) {
    // Приватный режим и запрет хранилища: играем без памяти, но играем
    return 1;
  }
}

// Уровень пройден — открываем следующий. Если он и так был открыт
// (игрок переигрывает старое), ничего не меняем.
function unlockAfter(name) {
  const opened = Math.min(LEVEL_NAMES.indexOf(name) + 2, LEVEL_NAMES.length);
  if (opened <= openedCount()) return;

  remember(PROGRESS_KEY, String(opened));
  log('Открыт уровень:', LEVEL_NAMES[opened - 1]);
}

// --- Облачная страховка ---
//
// Хранилище браузера привязано к адресу игры, и это его беда: игрок
// чистит данные телеграма, переустанавливает его, заходит с другого
// телефона — прогресс исчезает. И переезд игры на другой адрес обнулил
// бы его сразу у всех: для браузера это другой сайт.
//
// У мини-аппа есть своё хранилище, привязанное не к адресу, а к аккаунту
// игрока. Оно переживает всё перечисленное. Но отвечает не сразу — ходит
// в сеть, — поэтому главным остаётся местное: меню открывается мгновенно
// по нему, а облако тихо догоняет и добавляет, если у него больше.
//
// Спрашиваем телеграм заново при каждом обращении, а не запоминаем один
// раз при загрузке: свои возможности он досылает не мгновенно.
function cloudStorage() {
  const app = window.Telegram && window.Telegram.WebApp;

  // Обычный браузер: тот же объект существует, но платформа неизвестна
  if (!app || !app.platform || app.platform === 'unknown') return null;

  // Хранилище появилось не в первых версиях мини-аппов
  if (app.isVersionAtLeast && !app.isVersionAtLeast('6.9')) return null;

  return app.CloudStorage || null;
}

// Записать и туда, и туда. Местное — чтобы в следующий раз открылось
// мгновенно, облачное — чтобы пережило чистку данных.
function remember(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    log('Хранилище недоступно, запомнили только в облаке:', key);
  }

  const cloud = cloudStorage();
  if (!cloud) return;

  cloud.setItem(key, value, function (error) {
    if (error) log('Облако не приняло', key + ':', error);
  });
}

// Спросить облако и подтянуть прошлое, если местное потерялось.
//
// Прогресс умеет только расти, поэтому спорить не о чем: берём большее
// из двух. done вызывается, только когда что-то правда изменилось, —
// меню по нему перерисуется, и открытые уровни появятся на глазах.
function restoreProgress(done) {
  const cloud = cloudStorage();
  if (!cloud) return;

  cloud.getItem(PROGRESS_KEY, function (error, value) {
    if (error) return log('Облако не ответило про прогресс:', error);

    const opened = parseInt(value, 10);
    if (!opened || opened <= openedCount()) return;

    try {
      localStorage.setItem(PROGRESS_KEY, String(opened));
    } catch (e) {
      // Хранилище запрещено — покажем хотя бы в этот заход
    }

    log('Облако вернуло прогресс:', opened);
    done();
  });

  // Вступление тоже помним, но в него не вмешиваемся на ходу: если игрок
  // прямо сейчас его смотрит, дёргать экран нельзя. Просто отмечаем,
  // чтобы в следующий раз не показывать заново.
  cloud.getItem(INTRO_KEY, function (error, value) {
    if (error || value !== '1' || introSeen()) return;

    try {
      localStorage.setItem(INTRO_KEY, '1');
      log('Облако помнит, что вступление уже видели');
    } catch (e) {
      // и ладно
    }
  });
}

// --- Переходы между экранами ---
//
// И туда, и обратно — сменой адреса, с перезагрузкой страницы. Так
// уровень всегда начинается с чистого листа: разбирать предыдущий
// руками не приходится.
//
// Отдельного экрана-роутера в игре нет и не надо: меню показывается,
// когда в адресе нет ?level=, а уровень — когда он есть.

// Отладку тащим за собой: включила ?debug=1 один раз — и она держится
// до конца прохождения, а не слетает на первом же переходе.
function keepDebug(address) {
  if (!DEBUG) return address;
  return address + (address.indexOf('?') === -1 ? '?' : '&') + 'debug=1';
}

function openLevel(name) {
  location.search = keepDebug('?level=' + name);
}

function goToMenu() {
  location.href = keepDebug(location.pathname);
}
