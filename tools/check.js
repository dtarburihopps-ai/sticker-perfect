// Сверка данных уровней — до того, как игра уедет на сайт.
//
// Уровень это данные, и ошибка в данных не ломает код: она ждёт, пока
// игрок ткнёт пальцем в нужное место. Место, которое ждёт несуществующий
// стикер; needs на слот, которого нет; забытый rank у карандаша; картинка,
// которую не пережали в web/. Всё это тихо лежит до самого показа.
//
// Этот скрипт ищет такое заранее и говорит человеческим языком, что не так.
// Он же запускается при публикации: если что-то не сходится, игра
// на сайт не уезжает.
//
// Запуск (из корня проекта):
//     node tools/check.js

const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);

function read(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

// levels.js — обычный файл с объявлениями. Выполняем его и забираем
// объекты: так мы читаем ровно то же, что прочитает браузер.
const data = new Function(read('levels.js') +
  '\n; return { LEVELS: LEVELS, INTRO: INTRO, INTRO_NAME: INTRO_NAME };')();
const BLUR = new Function(read('blur.js') + '\n; return BLUR;')();

const LEVELS = data.LEVELS;

// Вступление лежит отдельно от уровней, но устроено так же и проверяется
// наравне с ними: ошибиться в нём можно ровно теми же способами.
const all = Object.assign({}, LEVELS);
all[data.INTRO_NAME] = data.INTRO;

const names = Object.keys(all);

// Две разные вещи, и путать их не надо.
//
// problems — то, из-за чего игра сломается у игрока. На них публикация
// останавливается: пусть лучше на сайте останется прошлая версия.
//
// notes — то, что просто выглядит забытым: лишняя запись, лишний файл.
// Игру это не ломает, поэтому останавливать из-за такого выкладку глупо.
// Скрипт про них говорит и идёт дальше, а мы смотрим, когда руки дойдут.
const problems = [];
const notes = [];

function complain(where, what) {
  problems.push(where + ': ' + what);
}

function note(where, what) {
  notes.push(where + ': ' + what);
}

// --- Каждый уровень по отдельности ---

names.forEach(function (name) {
  const level = all[name];
  const kinds = level.stickers || {};
  const slots = level.slots || [];

  if (!level.background) complain(name, 'нет фоновой картинки');
  if (!level.wall) complain(name, 'не задан цвет стены');
  if (!level.tray) complain(name, 'нет полосы стикеров');

  // Стикер описывается либо одним видом на всех, либо парой тип-картинка:
  // шесть банок с соленьями — один тип «pickle», но каждая своя. Своя
  // картинка у стикера в полосе отменяет общую, поэтому общей может
  // и не быть — но только если КАЖДОЕ появление этого типа со своей.
  const bare = {};
  (level.tray || []).forEach(function (item) {
    if (typeof item === 'string') bare[item] = 'в полосе';
    else if (!item.image) bare[item.type] = 'в полосе';
  });
  (level.placed || []).forEach(function (item) { bare[item.sticker] = 'приклеен заранее'; });
  slots.forEach(function (slot) {
    if (slot.filled && slot.sticker) bare[slot.sticker] = 'стоит затравкой';
  });
  if (level.final) bare[level.final] = 'последняя наклейка';

  // Размеры стикера — по ним считается и место на сцене, и зона попадания
  Object.keys(kinds).forEach(function (type) {
    const kind = kinds[type];
    if (!kind.image && bare[type]) {
      complain(name, 'у стикера «' + type + '» нет картинки, а он ' + bare[type] +
                     ' без своей');
    }
    if (!kind.width || !kind.height) {
      complain(name, 'у стикера «' + type + '» не заданы width и height');
    }
  });

  // Имена мест должны быть разными: needs ссылается именно на имя
  const seen = {};
  slots.forEach(function (slot) {
    if (!slot.id) return complain(name, 'у места нет id');
    if (seen[slot.id]) complain(name, 'два места с одинаковым id «' + slot.id + '»');
    seen[slot.id] = true;
  });

  slots.forEach(function (slot) {
    if (slot.sticker && !kinds[slot.sticker]) {
      complain(name, 'место «' + slot.id + '» ждёт стикер «' + slot.sticker +
                     '», а такого в этом уровне нет');
    }
    if (slot.needs && !seen[slot.needs]) {
      complain(name, 'место «' + slot.id + '» опирается на место «' + slot.needs +
                     '», а такого нет. Игра упадёт в момент тапа');
    }
    if (slot.x === undefined || slot.bottom === undefined) {
      complain(name, 'у места «' + slot.id + '» нет координат x и bottom');
    }
    // Место без своего продукта — ничьё: полка в шкафу, гнездо карандаша.
    // Размер такому месту взять неоткуда, кроме slotSize уровня, и без
    // него игра упадёт в первый же тап по сцене.
    if (!slot.sticker && !level.slotSize) {
      complain(name, 'место «' + slot.id + '» ничьё, а slotSize у уровня не задан');
    }
  });

  (level.tray || []).forEach(function (item) {
    const type = typeof item === 'string' ? item : item.type;
    if (!kinds[type]) complain(name, 'в полосе стикер «' + type + '», а он не описан');
  });

  (level.placed || []).forEach(function (item) {
    if (!kinds[item.sticker]) {
      complain(name, 'заранее приклеен стикер «' + item.sticker + '», а он не описан');
    }
  });

  if (level.final && !kinds[level.final]) {
    complain(name, 'последняя наклейка «' + level.final + '» не описана');
  }

  // Описан, но нигде не встречается. Скорее всего остался от переделки:
  // стикер убрали из полосы, а описание забыли.
  const inUse = {};
  (level.tray || []).forEach(function (item) {
    inUse[typeof item === 'string' ? item : item.type] = true;
  });
  (level.placed || []).forEach(function (item) { inUse[item.sticker] = true; });
  slots.forEach(function (slot) { if (slot.sticker) inUse[slot.sticker] = true; });
  if (level.final) inUse[level.final] = true;

  Object.keys(kinds).forEach(function (type) {
    if (!inUse[type]) note(name, 'стикер «' + type + '» описан, но нигде не используется');
  });

  // Одна картинка у двух разных стикеров — обычно копипаста: строку
  // размножили, а путь поменять забыли. Игра покажет двух близнецов.
  const byImage = {};
  Object.keys(kinds).forEach(function (type) {
    const image = kinds[type].image;
    if (!image) return;
    (byImage[image] = byImage[image] || []).push(type);
  });
  Object.keys(byImage).forEach(function (image) {
    if (byImage[image].length > 1) {
      note(name, 'одна картинка ' + image + ' сразу у нескольких стикеров: ' +
                 byImage[image].join(', '));
    }
  });

  // --- Устройство уровня ---

  if (level.mode === 'free') {
    if (!level.area) {
      complain(name, 'уровень без мест, но не задана область area');
    } else {
      // Область обязана вмещать самый крупный стикер. Если она меньше,
      // игра не откажет игроку, а тихо положит стикер ЗА её пределами:
      // поиск свободной точки прижимает его к краю и на этом успокаивается.
      Object.keys(kinds).forEach(function (type) {
        const kind = kinds[type];
        if (kind.width > level.area.width || kind.height > level.area.height) {
          complain(name, 'стикер «' + type + '» крупнее области area — он ляжет мимо неё');
        }
      });
    }
  }

  if (level.mode === 'order') {
    // Карандаши сортируются по rank. Без него сортировать нечем,
    // а одинаковые ранги делают «правильный порядок» недостижимым.
    const ranks = {};
    Object.keys(kinds).forEach(function (type) {
      const rank = kinds[type].rank;
      if (rank === undefined) {
        complain(name, 'уровень на порядок, а у стикера «' + type + '» нет rank');
        return;
      }
      if (ranks[rank]) {
        complain(name, 'rank ' + rank + ' сразу у двух стикеров: «' + ranks[rank] +
                       '» и «' + type + '». Порядок станет недостижимым');
      }
      ranks[rank] = type;
    });
  }

  if (level.mode === 'groups') {
    // Правильно — когда в каждом отсеке общая форма или общий цвет.
    // Для этого признаки нужны у всех, а отсеки должны быть одинаковыми.
    Object.keys(kinds).forEach(function (type) {
      if (!kinds[type].shape || !kinds[type].colour) {
        complain(name, 'уровень на признаки, а у стикера «' + type +
                       '» нет shape или colour');
      }
    });

    const cells = {};
    slots.forEach(function (slot) {
      if (!slot.group) return complain(name, 'место «' + slot.id + '» не в отсеке');
      cells[slot.group] = (cells[slot.group] || 0) + 1;
    });

    const sizes = Object.keys(cells).map(function (g) { return cells[g]; });
    if (sizes.length && sizes.some(function (n) { return n !== sizes[0]; })) {
      complain(name, 'отсеки разного размера: ' + JSON.stringify(cells) +
                     '. Разложить поровну не выйдет');
    }
  }

  // --- Хватит ли мест ---
  //
  // Стикер, которому некуда лечь, оставит уровень несобираемым навсегда.
  // Уровень без мест не считаем, там кладут куда угодно; уровень
  // с последней наклейкой тоже — она приходит сверх полосы.

  if (level.mode !== 'free') {
    // Последняя наклейка приходит в полосу сама, когда разложено всё
    // остальное, и место под неё тоже своё — поэтому считаем её наравне,
    // а не пропускаем весь уровень, как было раньше.
    const waiting = (level.tray || []).length + (level.final ? 1 : 0);
    const room = slots.filter(function (slot) { return !slot.filled; }).length;
    if (waiting > room) {
      complain(name, 'стикеров ' + waiting + ', а свободных мест ' + room +
                     '. Уровень нельзя собрать');
    }
  }
});

// --- Картинки ---
//
// Путь в уровне ведёт в web/ — туда, где лежат пережатые копии. Если
// картинку добавили в images/, но забыли запустить optimize.py, на сайте
// будет дырка. Заглушка проверяется заодно: она делается тем же скриптом.

const used = new Set();

// Картинки бывают не только в уровнях: кот, логотип и маскот подключены
// прямо в разметке, разворот альбома — в стилях. Их тоже надо проверить,
// иначе забытый прогон optimize.py заметит только игрок.
(read('index.html') + read('style.css')).replace(/web\/[\w-]+\.webp/g, function (p) {
  used.add(p);
  return p;
});

names.forEach(function (name) {
  (JSON.stringify(all[name]).match(/web\/[\w-]+\.webp/g) || []).forEach(function (p) {
    used.add(p);
  });
});

used.forEach(function (file) {
  if (!fs.existsSync(path.join(ROOT, file))) {
    complain('картинки', file + ' нет на месте — запусти python tools/optimize.py');
  } else if (!BLUR[file]) {
    complain('картинки', 'у ' + file + ' нет заглушки — запусти python tools/optimize.py');
  }
});

// Превью для карточек в меню. Вступления в альбоме нет — ему не нужно.
Object.keys(LEVELS).forEach(function (name) {
  const level = LEVELS[name];
  if (!level.background) return;

  const preview = level.background.replace('web/', 'web/preview/');
  if (!fs.existsSync(path.join(ROOT, preview))) {
    complain('картинки', 'нет превью ' + preview + ' для карточки в меню');
  }
});

// --- Что осталось в папке ---
//
// optimize.py кладёт новые картинки, но старые не убирает: перестал
// уровень пользоваться банкой — файл так и лежит и уезжает на сайт.
// Игру это не ломает, поэтому просто говорим.

fs.readdirSync(path.join(ROOT, 'web')).forEach(function (file) {
  if (!/\.webp$/.test(file)) return;
  if (!used.has('web/' + file)) {
    note('лишнее в web/', file + ' — этой картинки никто не просит');
  }
});

// --- Итог ---

function tell(title, list) {
  console.log(title + ':');
  console.log('');
  list.forEach(function (line) { console.log('  • ' + line); });
  console.log('');
}

// Заметки печатаем всегда, но выход из-за них не портим: пусть висят
// перед глазами, а руки дойдут когда дойдут.
if (notes.length) {
  tell('Стоит взглянуть, но публикации не мешает — ' + notes.length, notes);
}

if (problems.length) {
  tell('Нашлось, что поправить — ' + problems.length, problems);
  process.exit(1);
}

console.log('Сверка данных: всё сходится (' + Object.keys(LEVELS).length +
            ' уровней и вступление, ' + used.size + ' картинок)');
