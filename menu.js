// Sticker Perfect — меню и прогресс
//
// Меню — это раскрытый альбом. Слева кнопка «Играть», справа страница
// с наклейками-уровнями. Уровни открываются по очереди: пройден один —
// открылся следующий.
//
// Отдельного экрана-роутера в игре нет и не надо: меню показывается,
// когда в адресе нет ?level=, а уровень — когда он есть. Переход туда
// и обратно — обычная перезагрузка страницы. Так уровень всегда
// начинается с чистого листа, и разбирать предыдущий не приходится.

// Порядок уровней задан порядком записей в levels.js — второго списка
// не заводим, иначе однажды забудем поправить один из двух.
//
// Вступление в этот список не входит: оно не уровень, в альбоме
// не показывается и играется один раз.
const LEVEL_NAMES = Object.keys(LEVELS).filter(function (name) {
  return !LEVELS[name].intro;
});

const INTRO_NAME = Object.keys(LEVELS).find(function (name) {
  return LEVELS[name].intro;
}) || null;

// Сколько наклеек помещается на страницу альбома. Больше не влезает:
// две колонки по три ряда — и наклейка ещё достаточно крупная, чтобы
// узнать уровень в лицо.
const PER_PAGE = 6;

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

// --- Экран меню ---

const menu = document.getElementById('menu');
const levelGrid = document.getElementById('level-grid');
const playButton = document.getElementById('play');
const menuPrev = document.getElementById('menu-prev');
const menuNext = document.getElementById('menu-next');

// Какая страница альбома открыта. Игрок на пятнадцатом уровне не должен
// листать альбом с самого начала — открываем сразу его страницу.
let menuPage = 0;

function pageCount() {
  return Math.ceil(LEVEL_NAMES.length / PER_PAGE);
}

function openLevel(name) {
  location.search = '?level=' + name;
}

function drawMenu() {
  levelGrid.innerHTML = '';

  const opened = openedCount();
  const from = menuPage * PER_PAGE;

  LEVEL_NAMES.slice(from, from + PER_PAGE).forEach(function (name, i) {
    const number = from + i;              // номер уровня по порядку, с нуля
    const isOpen = number < opened;

    const card = document.createElement('button');
    card.className = 'level-card' + (isOpen ? '' : ' locked');

    if (isOpen) {
      // Превью — фон самого уровня. Отдельных картинок не рисуем:
      // уровень и так узнаётся по своей сцене.
      const preview = document.createElement('img');
      preview.src = LEVELS[name].background;
      preview.alt = '';
      card.appendChild(preview);

      card.addEventListener('click', function () { openLevel(name); });
    } else {
      card.disabled = true;
      card.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none"' +
        ' stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="4" y="10" width="16" height="11" rx="2"></rect>' +
        '<path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>';
    }

    levelGrid.appendChild(card);
  });

  // Стрелки листания показываем только когда есть куда листать —
  // так же, как в полосе стикеров на уровне
  menuPrev.hidden = menuPage === 0;
  menuNext.hidden = menuPage >= pageCount() - 1;
}

menuPrev.addEventListener('click', function () {
  menuPage = Math.max(0, menuPage - 1);
  drawMenu();
});

menuNext.addEventListener('click', function () {
  menuPage = Math.min(pageCount() - 1, menuPage + 1);
  drawMenu();
});

// «Играть» — это «продолжить»: ведёт на самый дальний открытый уровень
playButton.addEventListener('click', function () {
  openLevel(LEVEL_NAMES[openedCount() - 1]);
});

function showMenu() {
  menuPage = Math.floor((openedCount() - 1) / PER_PAGE);
  drawMenu();

  document.body.classList.add('in-menu');
  menu.hidden = false;
  log('Меню: открыто на странице', menuPage + 1, 'из', pageCount());
}

// --- Старт ---
//
// Есть ?level= — открываем уровень, нет — альбом. Если попросили уровень,
// которого здесь нет, показываем меню, а не падаем: ссылка могла остаться
// со старой версии игры, и пустой чёрный экран выглядел бы как поломка.
const asked = new URLSearchParams(location.search).get('level');

if (asked && LEVELS[asked]) {
  loadLevel(asked);
} else if (INTRO_NAME && !introSeen()) {
  // Самый первый запуск: игра начинается с закрытого альбома
  loadLevel(INTRO_NAME);
} else {
  if (asked) log('Уровня', asked, 'здесь нет — открываем меню');
  showMenu();
}
