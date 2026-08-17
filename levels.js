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
// Уровни бывают трёх устройств.
//
//   мест нет (mode: 'free') — магнит клеится куда угодно внутри area,
//   кроме выемок holes. Тогда вместо slots уровень задаёт area, holes,
//   gap и placed: магниты, которые висят с самого начала.
//
//   места есть, стикер любой (mode: 'order') — карандаш встаёт в любое
//   место, но правильным считается только порядок по rank. Занятое место
//   не отказ, а обмен: тот, что лежал, уезжает на место пришедшего.
//
//   места посчитаны (по умолчанию) — стикер идёт только в свой slot.
//
// ЧИСЛА НЕ ПРАВИТЬ РУКАМИ. Они посчитаны из размеров сцены:
//
//     python tools/fridge.py     холодильник
//     python tools/door.py       дверца
//     python tools/vending.py    вендинговый автомат
//     python tools/pencils.py    карандаши
//
// Скрипт перевырезает картинки и печатает готовые строки для этого файла.
// Хочешь подвинуть банки или добавить ряд — меняй константы там.

const LEVELS = {

  // --- Уровень 1: магниты на закрытой дверце ---
  //
  // Здесь нет ни одного правильного места: игрок клеит магниты как хочет.
  // Игра следит только за двумя вещами — магнит целиком на двери
  // и магниты не налезают друг на друга.
  door: {
    mode: 'free',
    background: 'images/door.png',
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
      cat:   { image: 'images/magnet-cat.png',   width: 0.1264, height: 0.1055 },
      daisy: { image: 'images/magnet-daisy.png', width: 0.1382, height: 0.0965 },
      photo: { image: 'images/magnet-photo.png', width: 0.1304, height: 0.1023 },
      heart: { image: 'images/magnet-heart.png', width: 0.1495, height: 0.0892 },
      egg:   { image: 'images/magnet-egg.png',   width: 0.1251, height: 0.1066 },
      toast: { image: 'images/magnet-toast.png', width: 0.1346, height: 0.0991 },
      tulip: { image: 'images/magnet-tulip.png', width: 0.1348, height: 0.0990 },
      mug:   { image: 'images/magnet-mug.png',   width: 0.1477, height: 0.0903 },
      plant: { image: 'images/magnet-plant.png', width: 0.1393, height: 0.0958 },
      star:  { image: 'images/magnet-star.png',  width: 0.1429, height: 0.0934 }
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
    background: 'images/fridge.png',

    // Цвет стены вокруг холодильника: им заливаются поля, если картинка
    // не закрывает экран целиком. Взят пипеткой с самой картинки.
    wall: '#E0DAD2',

    // Обстановка: стоит в холодильнике с самого начала и не двигается.
    // Тарелки — подсказка игроку: сюда кладут арбуз.
    decor: [
      { image: 'images/plate.png', x: 0.1074, bottom: 0.4957, width: 0.3835 },
      { image: 'images/plate.png', x: 0.5188, bottom: 0.4957, width: 0.3835 }
    ],

    // Слои поверх стикеров. Передняя стенка ящиков лежит НАД продуктами,
    // поэтому они выглядят лежащими внутри ящика, а не наклеенными на него.
    // Прозрачность задаётся в style.css, класс .overlay
    overlays: [
      { image: 'images/drawers-front.png', x: 0.0907, y: 0.7233, width: 0.8131 }
    ],

    stickers: {
      cola:   { image: 'images/cola.png',        width: 0.0931, height: 0.0960 },
      bottle: { image: 'images/bottle.png',      width: 0.1037, height: 0.1494 },
      pepper: { image: 'images/pepper.png',      width: 0.0872, height: 0.0629 },
      orange: { image: 'images/orange.png',      width: 0.0872, height: 0.0574 },
      // У солений картинка не общая: банки выглядят по-разному, а место
      // принимает любую. Поэтому картинка задаётся в полосе, у каждой своя.
      pickle: { width: 0.1337, height: 0.1264 },

      half:   { image: 'images/melon-half.png',  width: 0.3347, height: 0.1579 },
      slice:  { image: 'images/melon-slice.png', width: 0.1381, height: 0.0783 }
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
      { type: 'pickle', image: 'images/pickle-1.png' },
      'cola', 'orange', 'slice', 'pepper', 'cola',
      { type: 'pickle', image: 'images/pickle-2.png' },
      'pepper', 'bottle', 'orange', 'slice', 'cola',
      { type: 'pickle', image: 'images/pickle-3.png' },
      'orange', 'pepper', 'cola', 'slice', 'bottle',
      { type: 'pickle', image: 'images/pickle-4.png' },
      'orange', 'pepper', 'cola', 'orange', 'pepper',
      { type: 'pickle', image: 'images/pickle-5.png' },
      'cola', 'orange', 'pepper',
      { type: 'pickle', image: 'images/pickle-6.png' }
    ]
  },

  // --- Уровень 3: вендинговый автомат ---
  //
  // Устроен как холодильник: у каждого места свой товар. Но подсказок в игре
  // нет ни одной — ни затравок, ни надписей. Игрок понимает, куда что идёт,
  // только по размеру: свой товар заполняет ячейку целиком, чужой в неё
  // не влезает. Поэтому полки нарочно разной высоты.
  //
  // Однотипный товар взаимозаменяем: любая бутылка идёт в любое свободное
  // место своей полки. Иначе игрок угадывал бы, какая именно левее.
  vending: {
    background: 'images/vending.png',
    wall: '#E9DDC8',

    // Товара 27 штук, в полосе видно шесть: по пять он листался бы шесть раз
    trayVisible: 6,

    // Ширина = ширина ячейки, высота = просвет полки. Картинка тянется
    // на разницу от -7% до +8%: щели в ряду видно сразу, а проценты — нет.
    // Картинки у видов нет: она приходит вместе с каждым предметом в полосе,
    // потому что дизайны внутри вида разные, а место принимает любой.
    stickers: {
      bar:    { width: 0.0784, height: 0.1161 },
      can:    { width: 0.0915, height: 0.1044 },
      chips:  { width: 0.1372, height: 0.1081 },
      pouch:  { width: 0.1098, height: 0.0846 },
      bottle: { width: 0.1098, height: 0.1637 }
    },

    // Стекло лежит НАД товаром — тот же приём, что с передней стенкой
    // ящиков в холодильнике: товар выглядит стоящим внутри автомата,
    // а не наклеенным на стекло снаружи.
    overlays: [
      { image: 'images/vending-glass.png', x: 0.1555, y: 0.0988, width: 0.5489 }
    ],

    slots: [
      { id: 'bar-1', sticker: 'bar', x: 0.1555, bottom: 0.2205 },
      { id: 'bar-2', sticker: 'bar', x: 0.2339, bottom: 0.2205 },
      { id: 'bar-3', sticker: 'bar', x: 0.3123, bottom: 0.2205 },
      { id: 'bar-4', sticker: 'bar', x: 0.3908, bottom: 0.2205 },
      { id: 'bar-5', sticker: 'bar', x: 0.4692, bottom: 0.2205 },
      { id: 'bar-6', sticker: 'bar', x: 0.5476, bottom: 0.2205 },
      { id: 'bar-7', sticker: 'bar', x: 0.6260, bottom: 0.2205 },
      { id: 'can-1', sticker: 'can', x: 0.1555, bottom: 0.3372 },
      { id: 'can-2', sticker: 'can', x: 0.2470, bottom: 0.3372 },
      { id: 'can-3', sticker: 'can', x: 0.3385, bottom: 0.3372 },
      { id: 'can-4', sticker: 'can', x: 0.4300, bottom: 0.3372 },
      { id: 'can-5', sticker: 'can', x: 0.5215, bottom: 0.3372 },
      { id: 'can-6', sticker: 'can', x: 0.6129, bottom: 0.3372 },
      { id: 'chips-1', sticker: 'chips', x: 0.1555, bottom: 0.4602 },
      { id: 'chips-2', sticker: 'chips', x: 0.2927, bottom: 0.4602 },
      { id: 'chips-3', sticker: 'chips', x: 0.4300, bottom: 0.4602 },
      { id: 'chips-4', sticker: 'chips', x: 0.5672, bottom: 0.4602 },
      { id: 'pouch-1', sticker: 'pouch', x: 0.1555, bottom: 0.5584 },
      { id: 'pouch-2', sticker: 'pouch', x: 0.2653, bottom: 0.5584 },
      { id: 'pouch-3', sticker: 'pouch', x: 0.3751, bottom: 0.5584 },
      { id: 'pouch-4', sticker: 'pouch', x: 0.4849, bottom: 0.5584 },
      { id: 'pouch-5', sticker: 'pouch', x: 0.5946, bottom: 0.5584 },
      { id: 'bottle-1', sticker: 'bottle', x: 0.1555, bottom: 0.7381 },
      { id: 'bottle-2', sticker: 'bottle', x: 0.2653, bottom: 0.7381 },
      { id: 'bottle-3', sticker: 'bottle', x: 0.3751, bottom: 0.7381 },
      { id: 'bottle-4', sticker: 'bottle', x: 0.4849, bottom: 0.7381 },
      { id: 'bottle-5', sticker: 'bottle', x: 0.5946, bottom: 0.7381 }
    ],

    // В полосе товар вперемешку и по кругу видов: игрок листает и видит
    // выбор, а не семь батончиков подряд. Дизайнов местами меньше, чем мест,
    // поэтому часть повторяется — в живом автомате так и есть.
    tray: [
      { type: 'bar', image: 'images/vend-bar-1.png' },
      { type: 'can', image: 'images/vend-can-1.png' },
      { type: 'chips', image: 'images/vend-chips-1.png' },
      { type: 'pouch', image: 'images/vend-pouch-1.png' },
      { type: 'bottle', image: 'images/vend-bottle-1.png' },
      { type: 'bar', image: 'images/vend-bar-2.png' },
      { type: 'can', image: 'images/vend-can-2.png' },
      { type: 'chips', image: 'images/vend-chips-2.png' },
      { type: 'pouch', image: 'images/vend-pouch-2.png' },
      { type: 'bottle', image: 'images/vend-bottle-2.png' },
      { type: 'bar', image: 'images/vend-bar-3.png' },
      { type: 'can', image: 'images/vend-can-3.png' },
      { type: 'chips', image: 'images/vend-chips-3.png' },
      { type: 'pouch', image: 'images/vend-pouch-3.png' },
      { type: 'bottle', image: 'images/vend-bottle-3.png' },
      { type: 'bar', image: 'images/vend-bar-4.png' },
      { type: 'can', image: 'images/vend-can-4.png' },
      { type: 'chips', image: 'images/vend-chips-1.png' },
      { type: 'pouch', image: 'images/vend-pouch-4.png' },
      { type: 'bottle', image: 'images/vend-bottle-4.png' },
      { type: 'bar', image: 'images/vend-bar-5.png' },
      { type: 'can', image: 'images/vend-can-1.png' },
      { type: 'pouch', image: 'images/vend-pouch-1.png' },
      { type: 'bottle', image: 'images/vend-bottle-5.png' },
      { type: 'bar', image: 'images/vend-bar-6.png' },
      { type: 'can', image: 'images/vend-can-2.png' },
      { type: 'bar', image: 'images/vend-bar-7.png' }
    ]
  },

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
    background: 'images/pencil-table.png',
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
      'pencil-1':  { image: 'images/pencil-1.png',  width: 0.0689, height: 0.2681, rank: 1 },
      'pencil-2':  { image: 'images/pencil-2.png',  width: 0.0689, height: 0.2681, rank: 2 },
      'pencil-3':  { image: 'images/pencil-3.png',  width: 0.0689, height: 0.2681, rank: 3 },
      'pencil-4':  { image: 'images/pencil-4.png',  width: 0.0689, height: 0.2681, rank: 4 },
      'pencil-5':  { image: 'images/pencil-5.png',  width: 0.0689, height: 0.2681, rank: 5 },
      'pencil-6':  { image: 'images/pencil-6.png',  width: 0.0689, height: 0.2681, rank: 6 },
      'pencil-7':  { image: 'images/pencil-7.png',  width: 0.0689, height: 0.2681, rank: 7 },
      'pencil-8':  { image: 'images/pencil-8.png',  width: 0.0689, height: 0.2681, rank: 8 },
      'pencil-9':  { image: 'images/pencil-9.png',  width: 0.0689, height: 0.2681, rank: 9 },
      'pencil-10': { image: 'images/pencil-10.png', width: 0.0689, height: 0.2681, rank: 10 }
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
  }
};
