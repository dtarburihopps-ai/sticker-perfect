// Sticker Perfect — игра

// Поставь false перед показом, чтобы убрать отладочные сообщения из консоли
const DEBUG = true;

function log() {
  if (DEBUG) console.log.apply(console, arguments);
}

// --- Telegram ---
// tg будет null, если открыли файл просто в браузере. Это нормально —
// игра должна работать и так, поэтому везде проверяем "если tg есть".
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

if (tg) {
  tg.ready();
  tg.expand();
  log('Telegram: запущено внутри мини-аппа');
} else {
  log('Telegram: нет, работаем в обычном браузере');
}

// --- Вибрация ---
let vibrationOn = true;

const vibrationButton = document.getElementById('vibration-toggle');

vibrationButton.addEventListener('click', function () {
  vibrationOn = !vibrationOn;
  vibrationButton.classList.toggle('off', !vibrationOn);
  vibrationButton.setAttribute(
    'aria-label',
    vibrationOn ? 'Выключить вибрацию' : 'Включить вибрацию'
  );
  log('Вибрация:', vibrationOn ? 'включена' : 'выключена');
});

log('Каркас загружен');
