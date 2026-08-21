// Sticker Perfect — порядок уровней, прогресс и переходы
//
// Единственное место, где записано, в каком порядке идут уровни, как
// далеко игрок продвинулся и как попасть с экрана на экран.
//
// Раньше это жило в двух файлах сразу: game.js сам считал, какой уровень
// следующий, а menu.js — какие уже открыты, и списки у них были разные.
// Сходились они только потому, что вступление стоит в levels.js первым.
// Переставь уровни местами — и прогресс начал бы молча открывать не те,
// без единой ошибки в консоли.

// --- Порядок ---
//
// Отдельного списка уровней не заводим: порядок уже задан тем, как они
// написаны в levels.js, и держать его в двух местах незачем.
//
// А вот списка два, и разница между ними существенная:
//
//   LEVEL_ORDER — всё подряд, вместе со вступлением. По нему считается,
//                 какой уровень идёт следующим.
//   LEVEL_NAMES — уровни без вступления. По нему считается прогресс
//                 и рисуется альбом: вступление не уровень, играется
//                 один раз и в счёт пройденного не идёт.
const LEVEL_ORDER = Object.keys(LEVELS);

const INTRO_NAME = LEVEL_ORDER.find(function (name) {
  return LEVELS[name].intro;
}) || null;

const LEVEL_NAMES = LEVEL_ORDER.filter(function (name) {
  return !LEVELS[name].intro;
});

// Следующий уровень — просто следующий по порядку. Вступление здесь
// участвует наравне: после него идёт первый настоящий уровень.
function nextLevelName(name) {
  return LEVEL_ORDER[LEVEL_ORDER.indexOf(name) + 1] || null;
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
  try {
    localStorage.setItem(INTRO_KEY, '1');
    log('Вступление пройдено');
  } catch (e) {
    log('Вступление сохранить не вышло — хранилище недоступно');
  }
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

  try {
    localStorage.setItem(PROGRESS_KEY, String(opened));
    log('Открыт уровень:', LEVEL_NAMES[opened - 1]);
  } catch (e) {
    log('Прогресс сохранить не вышло — хранилище недоступно');
  }
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
