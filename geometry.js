// Sticker Perfect — координаты и раскладка
//
// Вся математика игры собрана здесь. Ни одного правила, ни одного решения:
// только «где что лежит на экране» и «какого оно размера».
//
// Главная мысль: все координаты уровня заданы ДОЛЯМИ от фоновой картинки,
// а не пикселями. Поэтому уровень одинаково правильно ложится и на узкий
// телефон, и на широкий ноутбук. Перевод долей в пиксели происходит
// в одном месте — backgroundBox() — и все остальные считают от него.

// Зона попадания места. Она делается не меньше пальца: банка на полке
// всего 34 px, а промахиваться по ней игрок не должен.
function slotRect(slot) {
  const box = backgroundBox();

  // Обычно размер места берётся у продукта, который сюда идёт. В коробке
  // продукт заранее не известен — подойдёт любой карандаш, и все они
  // одного размера, поэтому уровень задаёт его один раз в slotSize.
  const kind = slot.sticker ? state.level.stickers[slot.sticker] : state.level.slotSize;

  const width = kind.width * box.width;
  const height = kind.height * box.height;
  const left = box.left + slot.x * box.width;
  const top = box.top + slot.bottom * box.height - height;

  const growX = Math.max(0, TOUCH_MIN - width) / 2;
  const growY = Math.max(0, TOUCH_MIN - height) / 2;

  return {
    left: left - growX,
    right: left + width + growX,
    top: top - growY,
    bottom: top + height + growY,
    centerX: left + width / 2,
    centerY: top + height / 2
  };
}

// Место под точкой. Если задан тип — только места под этот продукт;
// среди подходящих берём то, чей центр ближе к пальцу.
function slotAt(x, y, type) {
  let best = null;
  let bestDistance = Infinity;

  state.slots.forEach(function (slot) {
    if (type && slot.sticker !== type) return;

    const rect = slotRect(slot);
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;

    const dx = x - rect.centerX;
    const dy = y - rect.centerY;
    const distance = dx * dx + dy * dy;

    // Свободное место всегда важнее занятого: если они лежат друг на друге,
    // игрок целится в свободное.
    //
    // В коробке с карандашами наоборот: места не накладываются, стоят в ряд,
    // а тап по занятому — это обмен, обычное действие. Со штрафом игрок
    // целился бы в один карандаш, а менялся бы соседний свободный.
    const penalty = (slot.filled && !anySlot()) ? 1e9 : 0;

    if (distance + penalty < bestDistance) {
      bestDistance = distance + penalty;
      best = slot;
    }
  });

  return best;
}

// ---------------------------------------------------------------
//  Координаты
// ---------------------------------------------------------------
//
// Фон вписывается в сцену по ширине и центрируется по высоте.
// Все места на уровне заданы долями от фона — поэтому уровень
// одинаково правильно ложится на любой экран.

// Прямоугольник фона внутри сцены.
//
// Вписываем целиком: сначала пробуем по ширине, и если по высоте не влезло —
// считаем от высоты. Если вписывать всегда по ширине, то на широком и низком
// окне (браузер на ноутбуке) холодильник обрежется сверху и снизу.
// Результат запоминается: за один тап он спрашивается по разу на каждое
// место, а мест на уровне три десятка. Сбрасывается, когда меняется экран.
let boxCache = null;

function backgroundBox() {
  if (boxCache) return boxCache;

  const sceneW = scene.clientWidth;
  const sceneH = scene.clientHeight;
  const ratio = background.naturalWidth / background.naturalHeight;

  let width = sceneW;
  let height = width / ratio;

  if (height > sceneH) {
    height = sceneH;
    width = height * ratio;
  }

  boxCache = {
    left: (sceneW - width) / 2,
    top: (sceneH - height) / 2,
    width: width,
    height: height
  };

  return boxCache;
}

// Размер стикера на его месте в холодильнике
function stickerSize(sticker) {
  const box = backgroundBox();
  return {
    width: sticker.kind.width * box.width,
    height: sticker.kind.height * box.height
  };
}

// В полосе стикер крупнее, чем на полке: так его удобно взять пальцем
// и хорошо видно, что берёшь. В полёте он плавно уменьшается до размера места.
//
// Увеличение урезается дважды: по высоте полосы, чтобы стикер не торчал
// за её край, и по ширине, чтобы весь ряд поместился и ничего не вылезло вбок.
function traySize(sticker, total) {
  const size = stickerSize(sticker);

  const maxHeight = tray.clientHeight - TRAY_PADDING;
  const maxWidth = (trayInnerWidth() - TRAY_GAP * (total - 1)) / total;

  let scale = TRAY_SCALE;
  if (size.height * scale > maxHeight) scale = maxHeight / size.height;
  if (size.width * scale > maxWidth) scale = maxWidth / size.width;

  return {
    width: size.width * scale,
    height: size.height * scale
  };
}

// Стикеры лежат в слое поверх всего экрана, поэтому к координатам
// внутри сцены добавляем смещение самой сцены.
function positionInSlot(sticker, slot) {
  const box = backgroundBox();
  const size = stickerSize(sticker);

  return {
    x: scene.offsetLeft + box.left + slot.x * box.width,
    // bottom — линия, на которой стикер СТОИТ, поэтому вычитаем его высоту
    y: scene.offsetTop + box.top + slot.bottom * box.height - size.height
  };
}

// Где стикер лежит на экране. В холодильнике это его место на полке,
// на дверце — та точка, куда его приклеил игрок.
function stickerPosition(sticker) {
  if (!sticker.spot) return positionInSlot(sticker, sticker.slot);

  const box = backgroundBox();

  return {
    x: scene.offsetLeft + box.left + sticker.spot.x * box.width,
    y: scene.offsetTop + box.top + sticker.spot.y * box.height
  };
}

// Сколько места в полосе остаётся стикерам: вычитаем края под стрелки
function trayInnerWidth() {
  return tray.clientWidth - TRAY_ARROW * 2 - TRAY_PADDING;
}

// Раскладка всей полосы разом.
//
// Каждый следующий стикер встаёт в TRAY_GAP пикселях от правого края
// предыдущего. Считать позицию как «номер × ширина» нельзя: у банки,
// перца и апельсина ширина разная, и они налезали бы друг на друга.
function trayLayout(visible) {
  const sizes = visible.map(function (s) { return traySize(s, visible.length); });

  let rowWidth = TRAY_GAP * (visible.length - 1);
  sizes.forEach(function (size) { rowWidth += size.width; });

  let x = tray.offsetLeft + (tray.clientWidth - rowWidth) / 2;

  return sizes.map(function (size) {
    const place = {
      size: size,
      x: x,
      y: tray.offsetTop + (tray.clientHeight - size.height) / 2
    };
    x += size.width + TRAY_GAP;
    return place;
  });
}

function moveTo(sticker, point) {
  sticker.element.style.transform = 'translate(' + point.x + 'px, ' + point.y + 'px)';
}

// Раскладывать можно только когда известны и размер сцены, и размер картинки.
// В начале загрузки они ещё нулевые, поэтому ждём и пробуем снова.
//
// Здесь нарочно setTimeout, а не requestAnimationFrame: в фоновой вкладке
// браузер перестаёт выдавать кадры, и rAF никогда не срабатывает —
// игра осталась бы неразложенной.
function scheduleLayout(attempt) {
  // Именно число, а не «что пришло». Эта функция висит ещё и обработчиком
  // события load, а туда прилетает объект события: attempt || 0 оставлял
  // его как есть, сравнение attempt < 200 давало ложь, и попытки
  // обрывались на первой же.
  attempt = typeof attempt === 'number' ? attempt : 0;

  setTimeout(function () {
    if (scene.clientWidth && background.naturalWidth) {
      layout();
      return;
    }

    if (attempt < 200) {
      scheduleLayout(attempt + 1);
    } else {
      log('Не дождались размеров сцены или картинки фона');
    }
  }, 16);
}

// Разложить всё по местам. Вызывается при старте, при изменении размера
// окна и после каждой постановки стикера.
function layout() {
  boxCache = null;               // размеры могли поменяться

  layoutBackground();
  layoutDecor();
  layoutOverlays();
  layoutSlots();
  layoutStickers();
}

function layoutBackground() {
  const box = backgroundBox();

  background.style.width = box.width + 'px';
  background.style.left = box.left + 'px';
  background.style.top = box.top + 'px';
}

function layoutDecor() {
  const box = backgroundBox();

  state.decor.forEach(function (item) {
    const width = item.width * box.width;
    const height = item.element.naturalHeight
      ? width * item.element.naturalHeight / item.element.naturalWidth
      : 0;

    item.element.style.width = width + 'px';
    item.element.style.left = (box.left + item.x * box.width) + 'px';
    item.element.style.top = (box.top + item.bottom * box.height - height) + 'px';
  });
}

function layoutOverlays() {
  const box = backgroundBox();

  state.overlays.forEach(function (overlay) {
    overlay.element.style.left = (scene.offsetLeft + box.left + overlay.x * box.width) + 'px';
    overlay.element.style.top = (scene.offsetTop + box.top + overlay.y * box.height) + 'px';
    overlay.element.style.width = (overlay.width * box.width) + 'px';
  });
}

// Места невидимы и тапы не ловят, поэтому в обычной игре их в разметке нет.
// Показываются только при SHOW_SLOTS, когда надо настроить координаты.
//
// Контуры на вступлении — другое дело: они видны всегда и лежат ровно
// там, где встанет наклейка, а не в зоне попадания пальца (та шире).
function layoutSlots() {
  const box = backgroundBox();

  state.slots.forEach(function (slot) {
    if (slot.outline) {
      const kind = state.level.stickers[slot.sticker];
      const width = kind.width * box.width;
      const height = kind.height * box.height;

      slot.outline.style.width = width + 'px';
      slot.outline.style.height = height + 'px';
      slot.outline.style.left = (box.left + slot.x * box.width) + 'px';
      slot.outline.style.top = (box.top + slot.bottom * box.height - height) + 'px';

      // Место занято — контур больше не нужен.
      //
      // Место последней наклейки прячем до самого её прихода: увидев
      // лишний контур сразу, игрок решит, что чего-то недодали, и будет
      // искать шестую наклейку в пустой полосе.
      slot.outline.hidden = slot.filled || (slot.last && !state.finalGiven);
    }

    if (!SHOW_SLOTS) return;

    const rect = slotRect(slot);
    slot.element.style.left = rect.left + 'px';
    slot.element.style.top = rect.top + 'px';
    slot.element.style.width = (rect.right - rect.left) + 'px';
    slot.element.style.height = (rect.bottom - rect.top) + 'px';
  });
}

function layoutStickers() {
  const waiting = state.stickers.filter(function (s) { return !s.placed; });

  // Если хвост очереди укоротился, подтягиваем окно назад,
  // иначе полоса окажется пустой при непустой очереди
  state.trayOffset = Math.min(state.trayOffset, Math.max(0, waiting.length - state.trayVisible));

  const visible = waiting.slice(state.trayOffset, state.trayOffset + state.trayVisible);
  const places = trayLayout(visible);

  // Стрелка есть только тогда, когда ей есть что сделать
  prevButton.hidden = state.trayOffset === 0;
  nextButton.hidden = state.trayOffset + state.trayVisible >= waiting.length;

  state.stickers.forEach(function (sticker) {
    if (sticker.placed) {
      const size = stickerSize(sticker);
      sticker.element.style.display = '';
      sticker.element.style.width = size.width + 'px';
      sticker.element.style.height = size.height + 'px';
      moveTo(sticker, stickerPosition(sticker));
      return;
    }

    const index = visible.indexOf(sticker);

    // Стикеры сверх пятёрки ждут очереди и пока не показываются
    if (index === -1) {
      sticker.element.style.display = 'none';
      return;
    }

    const place = places[index];
    sticker.element.style.display = '';
    sticker.element.style.width = place.size.width + 'px';
    sticker.element.style.height = place.size.height + 'px';
    moveTo(sticker, place);
  });
}

// ---------------------------------------------------------------
//  Свободная лепка: уровень без мест
// ---------------------------------------------------------------
//
// На дверце нет ни одного заранее посчитанного места: магнит клеится
// куда угодно. Игра следит ровно за двумя вещами — магнит целиком внутри
// области и не налезает на соседей. Поэтому промахнуться тут нельзя:
// если игрок ткнул туда, где тесно, магнит не отказывается лететь,
// а встаёт в ближайшее свободное место рядом.

const SEARCH_STEP = 6;       // на сколько пикселей отходим от точки тапа за раз

const SEARCH_ANGLES = 24;    // сколько направлений пробуем на каждом кольце

// Насколько далеко магнит имеет право уехать от пальца, в своих ширинах.
// Ограничение обязательно: без него магнит из тесного угла улетал через
// всю дверь в единственную дырку, и это выглядело как сбой, а не как
// «подвинулся рядом». Не нашлось места рядом — лучше дрогнуть.
//
// Число выбирается между двумя неприятностями. Мало — магнит слишком
// часто отказывается вставать, и игрок не понимает почему. Много — он
// уезжает так далеко, что это уже не «подвинулся».
const SEARCH_REACH = 1.5;

// Прямоугольник, заданный долями фона (область, выемка), — в пикселях сцены
function partRect(part) {
  const box = backgroundBox();

  return {
    left: box.left + part.x * box.width,
    top: box.top + part.y * box.height,
    right: box.left + (part.x + part.width) * box.width,
    bottom: box.top + (part.y + part.height) * box.height
  };
}

// Прямоугольник магнита, который уже висит на двери
function spotRect(sticker) {
  const box = backgroundBox();
  const size = stickerSize(sticker);
  const left = box.left + sticker.spot.x * box.width;
  const top = box.top + sticker.spot.y * box.height;

  return { left: left, top: top, right: left + size.width, bottom: top + size.height };
}

function overlap(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

// Магнит целиком внутри области: ткнула у самого края — подвинется внутрь
function insideArea(left, top, size) {
  const rect = partRect(state.level.area);

  return {
    left: Math.min(Math.max(left, rect.left), rect.right - size.width),
    top: Math.min(Math.max(top, rect.top), rect.bottom - size.height)
  };
}

// Свободно ли тут. Вокруг магнита считается зазор — поэтому соседи встают
// рядом, а не впритык, и стена магнитов не выглядит слипшейся.
function spotFree(sticker, left, top, size) {
  const box = backgroundBox();
  const gap = (state.level.gap || 0) * box.width;

  const rect = {
    left: left - gap, top: top - gap,
    right: left + size.width + gap, bottom: top + size.height + gap
  };

  const onHole = (state.level.holes || []).some(function (hole) {
    return overlap(rect, partRect(hole));
  });
  if (onHole) return false;

  return !state.stickers.some(function (other) {
    return other !== sticker && other.spot && overlap(rect, spotRect(other));
  });
}

// Ближайшая свободная точка: расходимся кольцами от того места, куда ткнули.
// Первое найденное и есть ближайшее — кольца растут по очереди.
function findSpot(sticker, left, top) {
  const size = stickerSize(sticker);
  const rings = Math.ceil(size.width * SEARCH_REACH / SEARCH_STEP);

  for (let ring = 0; ring <= rings; ring++) {
    const radius = ring * SEARCH_STEP;
    const angles = ring === 0 ? 1 : SEARCH_ANGLES;

    for (let i = 0; i < angles; i++) {
      const angle = 2 * Math.PI * i / angles;
      const point = insideArea(
        left + radius * Math.cos(angle),
        top + radius * Math.sin(angle),
        size
      );

      if (spotFree(sticker, point.left, point.top, size)) return point;
    }
  }

  return null;
}
