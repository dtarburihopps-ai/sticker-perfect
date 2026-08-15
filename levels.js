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
// ЧИСЛА НЕ ПРАВИТЬ РУКАМИ. Они посчитаны из размеров холодильника:
//
//     python tools/level1.py
//
// Скрипт перевырезает картинки и печатает готовые строки для этого файла.
// Хочешь подвинуть банки или добавить ряд — меняй константы там.

const LEVELS = {

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
      'cola', 'orange', 'slice', 'pepper', 'cola',
      'pepper', 'bottle', 'orange', 'slice', 'cola',
      'orange', 'pepper', 'cola', 'slice', 'bottle',
      'orange', 'pepper', 'cola', 'orange', 'pepper',
      'cola', 'orange', 'pepper'
    ]
  }

};
