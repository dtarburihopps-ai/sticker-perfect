// Sticker Perfect — правила игры
//
// Здесь и только здесь написано, что можно, а что нельзя, и когда уровень
// считается собранным. Движок сцены об этом не знает: он спрашивает.
//
// Новое правило добавляется проверкой сюда, а не ещё одним «если» посреди
// кода — иначе с каждым уровнем правила расползались бы всё шире.

function slotById(id) {
  return slots.filter(function (s) { return s.id === id; })[0];
}

// ВСЕ правила игры собраны здесь, в одном месте.
//
// Возвращает null, если стикер сюда можно, или причину отказа строкой.
// Новое правило добавляется одной проверкой сюда, а не ещё одним «если»
// по коду — иначе с каждым продуктом правила расползались бы всё шире.
function whyNot(sticker, slot) {
  // В коробке с карандашами запретов нет вообще: любой карандаш
  // встаёт в любое место. Правильным считается только порядок,
  // и проверяет его конец уровня, а не это место.
  if (anySlot) return null;

  if (slot.filled) return 'место занято';

  if (slot.sticker !== sticker.type) return 'сюда идёт другой стикер';

  // Банка не висит в воздухе: под ней должно быть занято
  if (slot.needs && !slotById(slot.needs).filled) return 'под этим местом пусто';

  if (slot.group) {
    // Тарелка занята другим продуктом: на ту, где лежит половина арбуза,
    // кусочки уже не положить
    const busy = occupiedBy(slot.group);
    if (busy && busy !== sticker.type) return 'тарелка занята другим продуктом';

    // Этот продукт уже разложен на другой тарелке — значит весь идёт туда
    const mine = groupOf(sticker.type);
    if (mine && mine !== slot.group) return 'этот продукт уже лежит на другой тарелке';
  }

  return null;
}

// Кто лежит на этом месте
function stickerIn(slot) {
  return stickers.filter(function (s) { return s.placed && s.slot === slot; })[0];
}

// Что лежит в этой группе мест (например, на левой тарелке)
function occupiedBy(group) {
  const taken = slots.filter(function (s) {
    return s.group === group && s.filled;
  })[0];

  return taken ? taken.sticker : null;
}

// В какой группе уже лежит этот продукт
function groupOf(type) {
  const taken = slots.filter(function (s) {
    return s.group && s.filled && s.sticker === type;
  })[0];

  return taken ? taken.group : null;
}

// Уровень закончен, когда разложены все стикеры игрока.
//
// Считаем именно стикеры, а не занятые места: часть мест остаётся пустой
// нарочно — например, на второй тарелке, куда арбуз так и не пошёл.
function checkFinished() {
  if (finished) return;
  if (stickers.some(function (s) { return !s.placed; })) return;

  // В коробке мало разложить всё — надо разложить правильно. Пока порядок
  // не тот, игра молчит: кот не пришёл, значит ещё не то. Никаких «неверно»
  // тут нет нарочно, игрок должен догадаться сам.
  if (ordered && !inOrder()) {
    log('Всё в коробке, но не по порядку');
    return;
  }

  if (grouped && !inGroups()) {
    log('Всё в ящике, но отсеки собраны не по признаку');
    return;
  }

  // Вступление отдаёт последнюю наклейку — название игры — только когда
  // разложено всё остальное. До этого её нет ни в полосе, ни в очереди:
  // сначала обложка, потом имя.
  // Смотрим не на флаг, а на саму наклейку: пока её нет на экране,
  // уровень не собран, даже если проверка придёт сюда второй раз —
  // а она приходит, пока название летит в полосу.
  if (level.final && !stickers.some(function (s) { return s.type === level.final; })) {
    if (!finalGiven) {
      finalGiven = true;
      log('Обложка разложена, несём название');
      setTimeout(giveFinal, level.finalDelay || FINAL_DELAY);
    }
    return;
  }

  finished = true;
  log('Уровень собран');

  // Следующий уровень открывается сразу, ещё до прихода кота:
  // игрок может выйти в меню кнопкой, и уровень должен его там ждать.
  // Вступление в счёт не идёт — оно не уровень.
  if (!level.intro) unlockAfter(levelName);

  // Небольшая пауза: пусть последний стикер успеет улечься,
  // а игрок — увидеть готовую картинку
  setTimeout(function () {
    // На вступлении кота нет: там финал и так про альбом, а второй
    // герой на экране только отвлекал бы от названия
    if (level.mascot !== false) {
      mascot.classList.add('show');
      log('Кот пришёл');
    }

    // Кнопки появляются в ту же секунду, что и кот.
    // Если следующего уровня нет — стрелке некуда вести, и остаётся
    // только «в меню». На вступлении наоборот: там одна стрелка,
    // и ведёт она в альбом.
    nextLevelButton.hidden = !level.intro && !nextLevelName(levelName);
    toMenuButton.hidden = !!level.intro;

    finishPanel.hidden = false;
    // hidden сняли — даём браузеру мгновение, иначе он посчитает, что
    // кнопки всегда были видимыми, и появление не проиграется.
    // setTimeout, а не requestAnimationFrame: в фоновой вкладке кадров
    // нет, и кнопки остались бы невидимыми навсегда.
    setTimeout(function () {
      finishPanel.classList.add('show');
    }, 20);
  }, level.mascotDelay || MASCOT_DELAY);
}

// Последняя наклейка приходит в опустевшую полосу и мягко проявляется:
// резкое появление на пустом месте выглядит как ошибка отрисовки.
function giveFinal() {
  const sticker = createSticker(level.final);
  sticker.element.classList.add('arrive');

  // Место под название показываем в ту же секунду: наклейка и её контур
  // появляются вместе, и сразу видно, куда её нести
  const spot = slots.filter(function (s) { return s.last; })[0];
  if (spot && spot.outline) spot.outline.classList.add('arrive');

  layout();
  log('Название пришло в полосу');
}

// Пуговицы разложены верно, когда в КАЖДОМ отсеке четыре штуки с общим
// признаком: либо все одной формы, либо все одного цвета. Какой из двух
// способов выбрать, решает игрок, и оба правильные.
//
// Смешать способы нельзя чисто арифметически: если один отсек занять
// кругами всех цветов, а другой квадратами всех цветов, то на «жёлтый
// отсек» останется всего два жёлтых. Поэтому отдельной проверки
// «везде один и тот же признак» не нужно.
function inGroups() {
  const cells = {};
  slots.forEach(function (slot) {
    (cells[slot.group] = cells[slot.group] || []).push(stickerIn(slot));
  });

  return Object.keys(cells).every(function (name) {
    const inside = cells[name];
    if (inside.some(function (s) { return !s; })) return false;

    const first = inside[0].kind;
    return inside.every(function (s) { return s.kind.shape === first.shape; })
        || inside.every(function (s) { return s.kind.colour === first.colour; });
  });
}

// Карандаши стоят по порядку: слева направо оттенки идут от светлого
// к тёмному. Порядок мест берём по их координате, а не по тому, в каком
// порядке они записаны в levels.js — на экране игрок видит именно левее-правее.
function inOrder() {
  const row = slots.slice().sort(function (a, b) { return a.x - b.x; });

  let previous = 0;
  for (let i = 0; i < row.length; i++) {
    const sticker = stickerIn(row[i]);
    if (!sticker) return false;
    if (sticker.kind.rank <= previous) return false;
    previous = sticker.kind.rank;
  }

  return true;
}
