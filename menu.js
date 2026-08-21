// Sticker Perfect — меню
//
// Меню — это раскрытый альбом. Слева кнопка «Играть», справа страница
// с наклейками-уровнями. Уровни открываются по очереди: пройден один —
// открылся следующий.
//
// Здесь только рисование альбома. Какие уровни есть, какие открыты
// и как на них попасть — это знает progress.js.

// Сколько наклеек помещается на страницу альбома. Больше не влезает:
// две колонки по три ряда — и наклейка ещё достаточно крупная, чтобы
// узнать уровень в лицо.
const PER_PAGE = 6;

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
      // уровень и так узнаётся по своей сцене. Но грузим уменьшенную
      // копию: в карточку размером с ноготь незачем тянуть фон целиком.
      // Копии лежат в web/preview/ и делаются tools/optimize.py.
      const preview = document.createElement('img');
      preview.src = LEVELS[name].background.replace('web/', 'web/preview/');
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

  // Пока игрок смотрит на альбом, тихо тянем картинки того уровня,
  // на который ведёт «Играть». Нажмёт — они уже в кеше браузера,
  // и уровень откроется без ожидания.
  window.addEventListener('load', function () {
    preloadLevel(LEVEL_NAMES[openedCount() - 1]);
  });
}

// --- Старт ---
//
// Есть ?level= — открываем уровень, нет — альбом. Если попросили уровень,
// которого здесь нет, показываем меню, а не падаем: ссылка могла остаться
// со старой версии игры, и пустой чёрный экран выглядел бы как поломка.
const asked = new URLSearchParams(location.search).get('level');

if (asked && levelByName(asked)) {
  loadLevel(asked);
} else if (!introSeen()) {
  // Самый первый запуск: игра начинается с закрытого альбома
  loadLevel(INTRO_NAME);
} else {
  if (asked) log('Уровня', asked, 'здесь нет — открываем меню');
  showMenu();
}
