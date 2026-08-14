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
//   filled  — здесь стикер стоит с самого начала (затравка)

const LEVELS = {

  fridge: {
    background: 'images/fridge.png',

    // Цвет стены вокруг холодильника — им заливаются поля,
    // если картинка не закрывает экран целиком
    wall: '#E0DAD2',

    // Слои поверх стикеров. Передняя стенка ящиков лежит НАД продуктами,
    // поэтому они выглядят лежащими внутри ящика, а не наклеенными на него.
    // Прозрачность задаётся в style.css, класс .overlay
    overlays: [
      { image: 'images/drawers-front.png', x: 0.0907, y: 0.7233, width: 0.8131 }
    ],

    // Какие стикеры бывают на этом уровне.
    // Размер банки задан так, чтобы две ровно заняли высоту от полки
    // до потолка камеры — это и определяет масштаб всего уровня.
    stickers: {
      cola:   { image: 'images/cola.png',   width: 0.0917, height: 0.0968 },
      pepper: { image: 'images/pepper.png', width: 0.0872, height: 0.0629 },
      orange: { image: 'images/orange.png', width: 0.0872, height: 0.0574 }
    },

    slots: [
      // --- Верхняя полка: четыре колонки по две банки ---
      // Блок стоит по центру левой половины полки, отступы по 9 px.
      { id: 'cola-low-1',  sticker: 'cola', x: 0.1148, bottom: 0.2846, filled: true },
      { id: 'cola-low-2',  sticker: 'cola', x: 0.2065, bottom: 0.2846 },
      { id: 'cola-low-3',  sticker: 'cola', x: 0.2982, bottom: 0.2846 },
      { id: 'cola-low-4',  sticker: 'cola', x: 0.3899, bottom: 0.2846 },

      { id: 'cola-high-1', sticker: 'cola', x: 0.1148, bottom: 0.1878, needs: 'cola-low-1' },
      { id: 'cola-high-2', sticker: 'cola', x: 0.2065, bottom: 0.1878, needs: 'cola-low-2' },
      { id: 'cola-high-3', sticker: 'cola', x: 0.2982, bottom: 0.1878, needs: 'cola-low-3' },
      { id: 'cola-high-4', sticker: 'cola', x: 0.3899, bottom: 0.1878, needs: 'cola-low-4' },

      // --- Левый ящик: перец, четыре в ряд, два ряда ---
      { id: 'pepper-1-1', sticker: 'pepper', x: 0.1325, bottom: 0.8735, filled: true },
      { id: 'pepper-1-2', sticker: 'pepper', x: 0.2197, bottom: 0.8735 },
      { id: 'pepper-1-3', sticker: 'pepper', x: 0.3068, bottom: 0.8735 },
      { id: 'pepper-1-4', sticker: 'pepper', x: 0.3940, bottom: 0.8735 },

      { id: 'pepper-2-1', sticker: 'pepper', x: 0.1325, bottom: 0.8106, needs: 'pepper-1-1' },
      { id: 'pepper-2-2', sticker: 'pepper', x: 0.2197, bottom: 0.8106, needs: 'pepper-1-2' },
      { id: 'pepper-2-3', sticker: 'pepper', x: 0.3068, bottom: 0.8106, needs: 'pepper-1-3' },
      { id: 'pepper-2-4', sticker: 'pepper', x: 0.3940, bottom: 0.8106, needs: 'pepper-1-4' },

      // --- Правый ящик: апельсины, четыре в ряд, два ряда ---
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
      'cola', 'pepper', 'orange', 'cola', 'orange',
      'pepper', 'cola', 'pepper', 'orange', 'cola',
      'orange', 'pepper', 'cola', 'orange', 'pepper',
      'cola', 'pepper', 'orange', 'cola', 'pepper',
      'orange'
    ]
  }

};
