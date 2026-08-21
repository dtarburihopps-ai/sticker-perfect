// Sticker Perfect — уровни
//
// Уровень — это ДАННЫЕ, а не код. Движок в game.js читает описание
// и строит сцену сам. Новый уровень = новая запись здесь.
//
// Все координаты — доли от размера фоновой картинки, не пиксели:
//   0 — левый (верхний) край фона, 1 — правый (нижний).
// Поэтому уровень одинаково правильно ложится на любой экран.
//
//   x       — левый край стикера
//   bottom  — линия, НА которой стикер стоит (его низ, не центр!)
//   needs   — слот, который должен быть занят, иначе сюда нельзя
//   group   — в одной группе не уживаются разные продукты
//   filled  — здесь стикер стоит с самого начала (затравка)
//
// Уровни бывают четырёх устройств.
//
//   мест нет (mode: 'free') — магнит клеится куда угодно внутри area,
//   кроме выемок holes. Тогда вместо slots уровень задаёт area, holes,
//   gap и placed: магниты, которые висят с самого начала.
//
//   места есть, стикер любой (mode: 'order') — карандаш встаёт в любое
//   место, но правильным считается только порядок по rank. Занятое место
//   не отказ, а обмен: тот, что лежал, уезжает на место пришедшего.
//
//   места есть, признак общий (mode: 'groups') — пуговица встаёт в любое
//   место, а правильно, когда в каждом отсеке общая форма или общий цвет.
//
//   места посчитаны (по умолчанию) — стикер идёт только в свой slot.
//
// ЧИСЛА НЕ ПРАВИТЬ РУКАМИ. Они посчитаны из размеров сцены:
//
//     python tools/fridge.py     холодильник
//     python tools/door.py       дверца
//     python tools/vending.py    вендинговый автомат
//     python tools/pencils.py    карандаши
//     python tools/buttons.py    пуговицы
//
// Скрипт перевырезает картинки и печатает готовые строки для этого файла.
// Хочешь подвинуть банки или добавить ряд — меняй константы там.

const LEVELS = {

  // --- Уровень 0: обложка альбома ---
  //
  // Вступление, а не уровень: играется один раз, в меню не показывается
  // и в счёт пройденного не идёт. Его задача — за десять секунд, без
  // единого слова, объяснить, что тут делают: берут наклейку и кладут
  // на место.
  //
  // Места нарочно видны: у каждого напечатан контур по форме своей
  // наклейки. Промахнуться некуда, и подсказывать словами не надо.
  //
  // Последняя наклейка — название игры. Она приходит в полосу сама,
  // когда разложены остальные, и её место ждёт над всеми: приклеил
  // название — альбом твой, дальше меню.
  //
  //     python tools/cover.py     обложка и координаты наклеек
  intro: {
    intro: true,             // не уровень, а вступление: см. menu.js
    background: 'web/cover.webp',
    wall: '#C98E52',         // стол по краям, пипеткой с картинки
    mascot: false,           // кот сюда не приходит: финал и так про альбом

    stickers: {
      camera: { image: 'web/sticker-camera.webp', width: 0.2765, height: 0.1156, spot: 'web/spot-camera.webp' },
      books:  { image: 'web/sticker-books.webp', width: 0.2404, height: 0.1454, spot: 'web/spot-books.webp' },
      cocoa:  { image: 'web/sticker-cocoa.webp', width: 0.2284, height: 0.1031, spot: 'web/spot-cocoa.webp' },
      plant:  { image: 'web/sticker-plant.webp', width: 0.2404, height: 0.1130, spot: 'web/spot-plant.webp' },
      yarn:   { image: 'web/sticker-yarn.webp', width: 0.2164, height: 0.0828, spot: 'web/spot-yarn.webp' },
      logo:   { image: 'web/logo.webp', width: 0.4809, height: 0.1553, spot: 'web/spot-logo.webp' }
    },

    slots: [
      { id: 'camera', sticker: 'camera', x: 0.2783, bottom: 0.3864 },
      { id: 'books',  sticker: 'books',  x: 0.4887, bottom: 0.5277 },
      { id: 'cocoa',  sticker: 'cocoa',  x: 0.2844, bottom: 0.6244 },
      { id: 'plant',  sticker: 'plant',  x: 0.5068, bottom: 0.7473 },
      { id: 'yarn',   sticker: 'yarn',   x: 0.3324, bottom: 0.8501 },
      { id: 'logo',   sticker: 'logo',   x: 0.2723, bottom: 0.2546, last: true }
    ],

    tray: ['camera', 'books', 'cocoa', 'plant', 'yarn'],

    // Название приходит в полосу последним, когда остальное разложено
    final: 'logo'
  },

  // --- Уровень 1: магниты на закрытой дверце ---
  //
  // Здесь нет ни одного правильного места: игрок клеит магниты как хочет.
  // Игра следит только за двумя вещами — магнит целиком на двери
  // и магниты не налезают друг на друга.
  door: {
    mode: 'free',
    background: 'web/door.webp',
    wall: '#BBBCDB',

    // Куда можно клеить: панель двери без канта
    area: { x: 0.1267, y: 0.1035, width: 0.7384, height: 0.7460 },

    // Выемки в области: ручка и защёлка. Ручка вырезается вместе с полоской
    // слева от неё — между ручкой и кантом всё равно ничего не помещается.
    holes: [
      { x: 0.1267, y: 0.2562, width: 0.0779, height: 0.2915 },
      { x: 0.6721, y: 0.1035, width: 0.1930, height: 0.0661 }
    ],

    // Невидимый зазор вокруг магнита: с ним соседи стоят рядом,
    // а не впритык, и картинка не выглядит слипшейся
    gap: 0.0116,

    // Размер магнита задан не шириной, а равной площадью: иначе высокий
    // овал с котом выглядел бы вдвое крупнее звезды при той же ширине.
    stickers: {
      cat:   { image: 'web/magnet-cat.webp',   width: 0.1264, height: 0.1055 },
      daisy: { image: 'web/magnet-daisy.webp', width: 0.1382, height: 0.0965 },
      photo: { image: 'web/magnet-photo.webp', width: 0.1304, height: 0.1023 },
      heart: { image: 'web/magnet-heart.webp', width: 0.1495, height: 0.0892 },
      egg:   { image: 'web/magnet-egg.webp',   width: 0.1251, height: 0.1066 },
      toast: { image: 'web/magnet-toast.webp', width: 0.1346, height: 0.0991 },
      tulip: { image: 'web/magnet-tulip.webp', width: 0.1348, height: 0.0990 },
      mug:   { image: 'web/magnet-mug.webp',   width: 0.1477, height: 0.0903 },
      plant: { image: 'web/magnet-plant.webp', width: 0.1393, height: 0.0958 },
      star:  { image: 'web/magnet-star.webp',  width: 0.1429, height: 0.0934 }
    },

    // Затравка: кот висит на двери с самого начала. Он и объясняет
    // без единого слова, что это магниты и что клеить надо сюда.
    // x и y — левый верхний угол, доли от фона.
    placed: [
      { sticker: 'cat', x: 0.2856, y: 0.1969 }
    ],

    tray: ['daisy', 'toast', 'heart', 'mug', 'photo', 'star', 'egg', 'plant', 'tulip']
  },

  fridge: {
    background: 'web/fridge.webp',

    // Цвет стены вокруг холодильника: им заливаются поля, если картинка
    // не закрывает экран целиком. Взят пипеткой с самой картинки.
    wall: '#E0DAD2',

    // Обстановка: стоит в холодильнике с самого начала и не двигается.
    // Тарелки — подсказка игроку: сюда кладут арбуз.
    decor: [
      { image: 'web/plate.webp', x: 0.1074, bottom: 0.4957, width: 0.3835 },
      { image: 'web/plate.webp', x: 0.5188, bottom: 0.4957, width: 0.3835 }
    ],

    // Слои поверх стикеров. Передняя стенка ящиков лежит НАД продуктами,
    // поэтому они выглядят лежащими внутри ящика, а не наклеенными на него.
    // Прозрачность задаётся в style.css, класс .overlay
    overlays: [
      { image: 'web/drawers-front.webp', x: 0.0907, y: 0.7233, width: 0.8131 }
    ],

    stickers: {
      cola:   { image: 'web/cola.webp',        width: 0.0931, height: 0.0960 },
      bottle: { image: 'web/bottle.webp',      width: 0.1037, height: 0.1494 },
      pepper: { image: 'web/pepper.webp',      width: 0.0872, height: 0.0629 },
      orange: { image: 'web/orange.webp',      width: 0.0872, height: 0.0574 },
      // У солений картинка не общая: банки выглядят по-разному, а место
      // принимает любую. Поэтому картинка задаётся в полосе, у каждой своя.
      pickle: { width: 0.1337, height: 0.1264 },

      half:   { image: 'web/melon-half.webp',  width: 0.3347, height: 0.1579 },
      slice:  { image: 'web/melon-slice.webp', width: 0.1381, height: 0.0783 }
    },

    slots: [
      // --- Верхняя полка: четыре колонки по две банки ---
      // Блок стоит по центру левой половины полки.
      { id: 'cola-low-1',  sticker: 'cola', x: 0.1118, bottom: 0.2846, filled: true },
      { id: 'cola-low-2',  sticker: 'cola', x: 0.2050, bottom: 0.2846 },
      { id: 'cola-low-3',  sticker: 'cola', x: 0.2981, bottom: 0.2846 },
      { id: 'cola-low-4',  sticker: 'cola', x: 0.3913, bottom: 0.2846 },

      { id: 'cola-high-1', sticker: 'cola', x: 0.1118, bottom: 0.1885, needs: 'cola-low-1' },
      { id: 'cola-high-2', sticker: 'cola', x: 0.2050, bottom: 0.1885, needs: 'cola-low-2' },
      { id: 'cola-high-3', sticker: 'cola', x: 0.2981, bottom: 0.1885, needs: 'cola-low-3' },
      { id: 'cola-high-4', sticker: 'cola', x: 0.3913, bottom: 0.1885, needs: 'cola-low-4' },

      // Правая половина верхней полки: четыре бутылки встык.
      // Ширина подобрана так, чтобы ровно четыре заняли половину
      // и ни одна не свесилась за край. Первая — затравка.
      { id: 'bottle-1', sticker: 'bottle', x: 0.5056, bottom: 0.2846, filled: true },
      { id: 'bottle-2', sticker: 'bottle', x: 0.6093, bottom: 0.2846 },
      { id: 'bottle-3', sticker: 'bottle', x: 0.7130, bottom: 0.2846 },
      { id: 'bottle-4', sticker: 'bottle', x: 0.8168, bottom: 0.2846 },

      // --- Третья полка: банки с соленьями ---
      // Шесть штук встык заполняют полку ровно от края до края.
      // Затравки нет: свободная полка в холодильнике одна, и банкам
      // больше некуда встать. Любая банка идёт в любое свободное место —
      // иначе игроку пришлось бы угадывать порядок.
      { id: 'pickle-1', sticker: 'pickle', x: 0.1046, bottom: 0.6862 },
      { id: 'pickle-2', sticker: 'pickle', x: 0.2383, bottom: 0.6862 },
      { id: 'pickle-3', sticker: 'pickle', x: 0.3719, bottom: 0.6862 },
      { id: 'pickle-4', sticker: 'pickle', x: 0.5056, bottom: 0.6862 },
      { id: 'pickle-5', sticker: 'pickle', x: 0.6392, bottom: 0.6862 },
      { id: 'pickle-6', sticker: 'pickle', x: 0.7729, bottom: 0.6862 },

      // --- Вторая полка: арбуз на тарелках ---
      // Тарелки одинаковые, и заранее не решено, какая под что. Роль
      // достаётся тарелке в момент первого попадания: положил половину
      // на левую — кусочки идут на правую, и наоборот. Отсюда group.
      { id: 'half-left',     sticker: 'half',  group: 'plate-left',  x: 0.1318, bottom: 0.4727 },
      { id: 'half-right',    sticker: 'half',  group: 'plate-right', x: 0.5432, bottom: 0.4727 },

      { id: 'slice-left-1',  sticker: 'slice', group: 'plate-left',  x: 0.1278, bottom: 0.4727 },
      { id: 'slice-left-2',  sticker: 'slice', group: 'plate-left',  x: 0.2301, bottom: 0.4727 },
      { id: 'slice-left-3',  sticker: 'slice', group: 'plate-left',  x: 0.3324, bottom: 0.4727 },

      { id: 'slice-right-1', sticker: 'slice', group: 'plate-right', x: 0.5393, bottom: 0.4727 },
      { id: 'slice-right-2', sticker: 'slice', group: 'plate-right', x: 0.6416, bottom: 0.4727 },
      { id: 'slice-right-3', sticker: 'slice', group: 'plate-right', x: 0.7438, bottom: 0.4727 },

      // --- Нижние ящики: перец слева, апельсины справа ---
      // Верхний ряд ждёт нижний: овощ не висит в воздухе.
      { id: 'pepper-1-1', sticker: 'pepper', x: 0.1325, bottom: 0.8735, filled: true },
      { id: 'pepper-1-2', sticker: 'pepper', x: 0.2197, bottom: 0.8735 },
      { id: 'pepper-1-3', sticker: 'pepper', x: 0.3068, bottom: 0.8735 },
      { id: 'pepper-1-4', sticker: 'pepper', x: 0.3940, bottom: 0.8735 },

      { id: 'pepper-2-1', sticker: 'pepper', x: 0.1325, bottom: 0.8106, needs: 'pepper-1-1' },
      { id: 'pepper-2-2', sticker: 'pepper', x: 0.2197, bottom: 0.8106, needs: 'pepper-1-2' },
      { id: 'pepper-2-3', sticker: 'pepper', x: 0.3068, bottom: 0.8106, needs: 'pepper-1-3' },
      { id: 'pepper-2-4', sticker: 'pepper', x: 0.3940, bottom: 0.8106, needs: 'pepper-1-4' },

      { id: 'orange-1-1', sticker: 'orange', x: 0.5132, bottom: 0.8735, filled: true },
      { id: 'orange-1-2', sticker: 'orange', x: 0.6004, bottom: 0.8735 },
      { id: 'orange-1-3', sticker: 'orange', x: 0.6876, bottom: 0.8735 },
      { id: 'orange-1-4', sticker: 'orange', x: 0.7748, bottom: 0.8735 },

      { id: 'orange-2-1', sticker: 'orange', x: 0.5132, bottom: 0.8161, needs: 'orange-1-1' },
      { id: 'orange-2-2', sticker: 'orange', x: 0.6004, bottom: 0.8161, needs: 'orange-1-2' },
      { id: 'orange-2-3', sticker: 'orange', x: 0.6876, bottom: 0.8161, needs: 'orange-1-3' },
      { id: 'orange-2-4', sticker: 'orange', x: 0.7748, bottom: 0.8161, needs: 'orange-1-4' }
    ],

    // Что лежит в полосе внизу. Вперемешку, а не кучками по видам —
    // иначе игрок просто выкладывает подряд и не думает вообще.
    tray: [
      'cola', 'pepper', 'half', 'orange', 'bottle',
      { type: 'pickle', image: 'web/pickle-1.webp' },
      'cola', 'orange', 'slice', 'pepper', 'cola',
      { type: 'pickle', image: 'web/pickle-2.webp' },
      'pepper', 'bottle', 'orange', 'slice', 'cola',
      { type: 'pickle', image: 'web/pickle-3.webp' },
      'orange', 'pepper', 'cola', 'slice', 'bottle',
      { type: 'pickle', image: 'web/pickle-4.webp' },
      'orange', 'pepper', 'cola', 'orange', 'pepper',
      { type: 'pickle', image: 'web/pickle-5.webp' },
      'cola', 'orange', 'pepper',
      { type: 'pickle', image: 'web/pickle-6.webp' }
    ]
  },

  // Уровень 3 — вендинговый автомат — временно вынут из игры: он получился
  // плохим и будет переделан. Картинки, tools/vending.py и брифы на месте,
  // а сами строки уровня лежат в истории гита, в коммите f19e8c7.

  // --- Уровень 4: серые карандаши ---
  //
  // Шутка уровня нарисована на крышке: «Цветные карандаши. Раскрась
  // Петербург», а внутри все карандаши серые, разных оттенков.
  //
  // Третье устройство уровня: места посчитаны, но карандаш в них подходит
  // ЛЮБОЙ. Правильно только одно — порядок от светлого к тёмному, и следит
  // за ним игра, а не место. Пока порядок не тот, ничего не происходит:
  // кот не пришёл — значит ещё не то. Игрок догадывается сам.
  pencils: {
    mode: 'order',
    background: 'web/pencil-table.webp',
    wall: '#CCB89E',

    // Полоса выше обычной: карандаш длинный и узкий, при высоте 110
    // восемь штук ужимались до ниточек, в которые не попасть пальцем.
    trayHeight: 160,
    trayVisible: 8,

    // Кот приходит быстрее, чем в холодильнике: там пауза давала
    // разглядеть собранную картинку, здесь игрок и так на неё смотрит,
    // пока перекладывает последний карандаш.
    mascotDelay: 250,

    // rank — правильное место в ряду. Оно же порядковый номер оттенка:
    // 1 самый светлый, 10 самый тёмный.
    stickers: {
      'pencil-1':  { image: 'web/pencil-1.webp',  width: 0.0689, height: 0.2681, rank: 1 },
      'pencil-2':  { image: 'web/pencil-2.webp',  width: 0.0689, height: 0.2681, rank: 2 },
      'pencil-3':  { image: 'web/pencil-3.webp',  width: 0.0689, height: 0.2681, rank: 3 },
      'pencil-4':  { image: 'web/pencil-4.webp',  width: 0.0689, height: 0.2681, rank: 4 },
      'pencil-5':  { image: 'web/pencil-5.webp',  width: 0.0689, height: 0.2681, rank: 5 },
      'pencil-6':  { image: 'web/pencil-6.webp',  width: 0.0689, height: 0.2681, rank: 6 },
      'pencil-7':  { image: 'web/pencil-7.webp',  width: 0.0689, height: 0.2681, rank: 7 },
      'pencil-8':  { image: 'web/pencil-8.webp',  width: 0.0689, height: 0.2681, rank: 8 },
      'pencil-9':  { image: 'web/pencil-9.webp',  width: 0.0689, height: 0.2681, rank: 9 },
      'pencil-10': { image: 'web/pencil-10.webp', width: 0.0689, height: 0.2681, rank: 10 }
    },

    // Размер места. В холодильнике его брали у продукта, который сюда идёт,
    // а здесь продукта нет — подойдёт любой, и все они одного размера.
    slotSize: { width: 0.0689, height: 0.2681 },

    // Десять колонок в коробке. Крайние заняты затравками и не двигаются:
    // они показывают, с какой стороны светлое, а с какой тёмное.
    slots: [
      { id: 'p1',  x: 0.1495, bottom: 0.7506, sticker: 'pencil-1',  filled: true, fixed: true },
      { id: 'p2',  x: 0.2184, bottom: 0.7506 },
      { id: 'p3',  x: 0.2873, bottom: 0.7506 },
      { id: 'p4',  x: 0.3562, bottom: 0.7506 },
      { id: 'p5',  x: 0.4251, bottom: 0.7506 },
      { id: 'p6',  x: 0.4939, bottom: 0.7506 },
      { id: 'p7',  x: 0.5628, bottom: 0.7506 },
      { id: 'p8',  x: 0.6317, bottom: 0.7506 },
      { id: 'p9',  x: 0.7006, bottom: 0.7506 },
      { id: 'p10', x: 0.7694, bottom: 0.7506, sticker: 'pencil-10', filled: true, fixed: true }
    ],

    // В полосе карандаши лежат вперемешку — иначе сортировать нечего
    tray: [
      'pencil-5', 'pencil-2', 'pencil-8', 'pencil-3',
      'pencil-7', 'pencil-4', 'pencil-9', 'pencil-6'
    ]
  },

  // --- Уровень 5: пуговицы ---
  //
  // Уровень на два признака: 4 формы на 4 цвета, все 16 сочетаний.
  // Разложить можно ДВУМЯ правильными способами — по форме или по цвету, —
  // и оба засчитываются. Смешать их нельзя: если один отсек занять кругами
  // всех цветов, а другой квадратами, то на «жёлтый отсек» останется всего
  // два жёлтых. Игра сама держит игрока в одном принципе, без единого слова.
  //
  // Игра молчит до верной раскладки, как в карандашах: кот не пришёл —
  // значит ещё не то. Пуговицу можно вынуть и переложить.
  buttons: {
    mode: 'groups',
    background: 'web/buttons-box.webp',
    wall: '#EAC08F',

    trayVisible: 6,

    // shape и colour — те самые два признака. Третьего у пуговиц нет
    // нарочно: размер и число дырочек у всех одинаковые, иначе игрок
    // начал бы сортировать по ним.
    stickers: {
      'circle-yellow': { image: 'web/button-circle-yellow.webp', width: 0.1524, height: 0.0914, shape: 'circle', colour: 'yellow' },
      'circle-coral': { image: 'web/button-circle-coral.webp', width: 0.1524, height: 0.0914, shape: 'circle', colour: 'coral' },
      'circle-violet': { image: 'web/button-circle-violet.webp', width: 0.1524, height: 0.0914, shape: 'circle', colour: 'violet' },
      'circle-graphite': { image: 'web/button-circle-graphite.webp', width: 0.1524, height: 0.0914, shape: 'circle', colour: 'graphite' },
      'flower-yellow': { image: 'web/button-flower-yellow.webp', width: 0.1524, height: 0.0914, shape: 'flower', colour: 'yellow' },
      'flower-coral': { image: 'web/button-flower-coral.webp', width: 0.1524, height: 0.0914, shape: 'flower', colour: 'coral' },
      'flower-violet': { image: 'web/button-flower-violet.webp', width: 0.1524, height: 0.0914, shape: 'flower', colour: 'violet' },
      'flower-graphite': { image: 'web/button-flower-graphite.webp', width: 0.1524, height: 0.0914, shape: 'flower', colour: 'graphite' },
      'square-yellow': { image: 'web/button-square-yellow.webp', width: 0.1524, height: 0.0914, shape: 'square', colour: 'yellow' },
      'square-coral': { image: 'web/button-square-coral.webp', width: 0.1524, height: 0.0914, shape: 'square', colour: 'coral' },
      'square-violet': { image: 'web/button-square-violet.webp', width: 0.1524, height: 0.0914, shape: 'square', colour: 'violet' },
      'square-graphite': { image: 'web/button-square-graphite.webp', width: 0.1524, height: 0.0914, shape: 'square', colour: 'graphite' },
      'heart-yellow': { image: 'web/button-heart-yellow.webp', width: 0.1524, height: 0.0914, shape: 'heart', colour: 'yellow' },
      'heart-coral': { image: 'web/button-heart-coral.webp', width: 0.1524, height: 0.0914, shape: 'heart', colour: 'coral' },
      'heart-violet': { image: 'web/button-heart-violet.webp', width: 0.1524, height: 0.0914, shape: 'heart', colour: 'violet' },
      'heart-graphite': { image: 'web/button-heart-graphite.webp', width: 0.1524, height: 0.0914, shape: 'heart', colour: 'graphite' }
    },

    // Размер места: пуговицы все одного габарита, поэтому он один на всех
    slotSize: { width: 0.1524, height: 0.0914 },

    // Четыре отсека по четыре места. group — это отсек: он получает признак
    // от того, что в него положили, и заранее ни за кем не закреплён.
    slots: [
      { id: 'cell1-1', group: 'cell1', x: 0.1359, bottom: 0.3569 },
      { id: 'cell1-2', group: 'cell1', x: 0.3172, bottom: 0.3569 },
      { id: 'cell1-3', group: 'cell1', x: 0.1359, bottom: 0.4665 },
      { id: 'cell1-4', group: 'cell1', x: 0.3172, bottom: 0.4665 },
      { id: 'cell2-1', group: 'cell2', x: 0.5301, bottom: 0.3569 },
      { id: 'cell2-2', group: 'cell2', x: 0.7129, bottom: 0.3569 },
      { id: 'cell2-3', group: 'cell2', x: 0.5301, bottom: 0.4665 },
      { id: 'cell2-4', group: 'cell2', x: 0.7129, bottom: 0.4665 },
      { id: 'cell3-1', group: 'cell3', x: 0.1359, bottom: 0.6070 },
      { id: 'cell3-2', group: 'cell3', x: 0.3172, bottom: 0.6070 },
      { id: 'cell3-3', group: 'cell3', x: 0.1359, bottom: 0.7166 },
      { id: 'cell3-4', group: 'cell3', x: 0.3172, bottom: 0.7166 },
      { id: 'cell4-1', group: 'cell4', x: 0.5301, bottom: 0.6070 },
      { id: 'cell4-2', group: 'cell4', x: 0.7129, bottom: 0.6070 },
      { id: 'cell4-3', group: 'cell4', x: 0.5301, bottom: 0.7166 },
      { id: 'cell4-4', group: 'cell4', x: 0.7129, bottom: 0.7166 }
    ],

    tray: [
      'flower-coral', 'heart-yellow', 'circle-graphite', 'square-coral',
      'circle-yellow', 'heart-violet', 'flower-graphite', 'square-violet',
      'circle-violet', 'heart-coral', 'flower-yellow', 'square-graphite',
      'flower-violet', 'circle-coral', 'heart-graphite', 'square-yellow'
    ]
  }
};
