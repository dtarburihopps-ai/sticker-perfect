// Sticker Perfect — звук
//
// Звуковых файлов нет: всё синтезируется прямо в коде.
// Ничего не грузится, игра стартует мгновенно, а тембр правится числами здесь же.
//
// Главное правило этих звуков: НИКАКИХ ТОНОВ.
// Тон — это звук с высотой, он всегда звучит как пищалка из игрового автомата.
// Приклеивание — звук без высоты: шорох и шлепок. Поэтому всё построено на шуме.
//
// Если позже захочется живых записей вместо синтеза — менять надо будет
// только внутренности playSelect() и playSnap(), остального кода это не коснётся.

// Общая громкость всех звуков. Нам нужен ASMR, а не аттракцион, поэтому тихо.
const MASTER_VOLUME = 0.22;

// Браузеры запрещают звук, пока человек не коснулся страницы.
// Поэтому AudioContext создаётся не сразу, а по первому касанию.
let audio = null;

function unlockAudio() {
  if (!audio) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      log('Звук: браузер не умеет Web Audio, играем молча');
      return;
    }
    audio = new Ctx();
    log('Звук: разблокирован');
  }

  // На айфоне контекст иногда засыпает — будим его
  if (audio.state === 'suspended') audio.resume();
}

document.addEventListener('pointerdown', unlockAudio);

// --- Кирпичик, из которого собраны все звуки ---
//
// Короткий всплеск шума, пропущенный через фильтр.
// Частота фильтра едет от from к to — это и создаёт ощущение движения:
// сверху вниз звучит как «прижали и разгладили».
//
// filter — 'lowpass' даёт глухой звук, 'bandpass' — шуршащий
// time   — длительность в секундах
// delay  — на сколько отложить старт, чтобы складывать звуки друг за другом

function burst(options) {
  if (!audio) return;

  const now = audio.currentTime + (options.delay || 0);

  // Заполняем буфер случайными значениями — это и есть белый шум
  const frames = Math.floor(audio.sampleRate * options.time);
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = audio.createBufferSource();
  source.buffer = buffer;

  const filter = audio.createBiquadFilter();
  filter.type = options.filter;
  filter.frequency.setValueAtTime(options.from, now);
  filter.frequency.exponentialRampToValueAtTime(options.to, now + options.time);
  filter.Q.value = options.q || 0.8;

  // Огибающая: мгновенно нарастает и плавно гаснет.
  // Без неё на старте и в конце слышны паразитные щелчки.
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(options.volume * MASTER_VOLUME, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + options.time);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);

  source.start(now);
  source.stop(now + options.time + 0.02);
}

// --- Звуки игры ---

// Выбор стикера: лёгкое короткое «шшт» — отлепили от листа.
function playSelect() {
  burst({ filter: 'bandpass', from: 3000, to: 1500, time: 0.04, volume: 0.35 });
  log('Звук: выбор');
}

// Приклеивание: сначала глухой шлепок, следом шорох разглаживания.
// Играется в момент касания поверхности, а не в момент тапа.
function playSnap() {
  burst({ filter: 'lowpass',  from: 1500, to: 400, time: 0.05, volume: 0.90 });
  burst({ filter: 'bandpass', from: 4200, to: 900, time: 0.11, volume: 0.50, delay: 0.018 });
  log('Звук: приклеился');
}

// «Не туда»: глухой короткий тук, тише приклеивания.
// Это подсказка «не сюда», а не звук ошибки — поэтому никакой резкости.
function playReject() {
  burst({ filter: 'lowpass', from: 700, to: 260, time: 0.06, volume: 0.40 });
  log('Звук: не туда');
}
