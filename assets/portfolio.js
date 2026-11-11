const header = document.querySelector('.header-inner');
const menu = header.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');
header.dataset.enhanced = '';

const lightSwitch = document.querySelector('.hero-light');
const heroBand = lightSwitch.closest('.hero-band');
lightSwitch.addEventListener('click', () => {
  const daylight = lightSwitch.getAttribute('aria-pressed') !== 'true';
  lightSwitch.setAttribute('aria-pressed', String(daylight));
  heroBand.dataset.light = daylight ? 'day' : 'night';
});
lightSwitch.hidden = false;

menu.addEventListener('click', () => {
  menu.setAttribute('aria-expanded', String(menu.getAttribute('aria-expanded') === 'false'));
});

nav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => menu.setAttribute('aria-expanded', 'false'));
});

header.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    menu.setAttribute('aria-expanded', 'false');
    menu.focus();
  }
});

const toolbar = document.querySelector('.work-toolbar');
const count = toolbar.querySelector('.work-count');
const buttons = [...toolbar.querySelectorAll('[data-filter]')];
const gallery = document.querySelector('.work-grid');
const projects = gallery.querySelectorAll('[data-category]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const contact = document.getElementById('contact');
const agentEyes = contact.querySelector('.agent-eyes');

function resetAgentEyes() {
  agentEyes.style.removeProperty('--eye-x');
  agentEyes.style.removeProperty('--eye-y');
}

contact.addEventListener('pointermove', event => {
  if (reducedMotion.matches || event.pointerType !== 'mouse') return;
  const bounds = agentEyes.ownerSVGElement.getBoundingClientRect();
  const x = event.clientX - (bounds.left + bounds.width / 2);
  const y = event.clientY - (bounds.top + bounds.height / 2);
  const scale = 6 / Math.max(60, Math.hypot(x, y));
  agentEyes.style.setProperty('--eye-x', `${x * scale}px`);
  agentEyes.style.setProperty('--eye-y', `${y * scale}px`);
});
contact.addEventListener('pointerleave', resetAgentEyes);
reducedMotion.addEventListener('change', resetAgentEyes);

let selected = buttons[0];
let transition;

function applyFilter() {
  const category = selected.dataset.filter;
  let visibleCount = 0;

  for (const project of projects) {
    const matches = category === 'all' || project.dataset.category === category;
    project.hidden = !matches;
    visibleCount += Number(matches);
  }

  for (const button of buttons) {
    button.setAttribute('aria-pressed', String(button === selected));
  }
  count.textContent = `${visibleCount} ${visibleCount === 1 ? 'project' : 'projects'}`;
}

for (const button of buttons) {
  button.addEventListener('click', () => {
    if (button === selected) return;
    selected = button;
    transition?.skipTransition();

    const animate = !reducedMotion.matches;
    if (animate && typeof document.startViewTransition === 'function') {
      transition = document.startViewTransition(applyFilter);
      return;
    }

    applyFilter();
    if (animate) {
      gallery.animate?.([{ opacity: .7 }, { opacity: 1 }], 180);
    }
  });
}

applyFilter();
toolbar.hidden = false;

const robot = document.querySelector('.robot-guide');
const robotPanel = robot.querySelector('.robot-panel');
const robotLaunch = robot.querySelector('.robot-launch');
const robotClose = robot.querySelector('.robot-close');
const robotPause = robot.querySelector('.robot-pause');
const robotForm = robot.querySelector('.robot-question');
const robotInput = robotForm.querySelector('input');
const robotSend = robotForm.querySelector('button');
const robotLanguage = robot.querySelector('.robot-language');
const robotClear = robot.querySelector('.robot-clear');
const robotMessages = robot.querySelector('.robot-messages');
const robotTranscript = robot.querySelector('.robot-transcript');
const robotPrompts = [...robot.querySelectorAll('[data-robot-prompt]')];
const configuredChat = document.querySelector('meta[name="portfolio-chat-endpoint"]').content.trim();
const localChat = ['localhost', '127.0.0.1'].includes(location.hostname);
const robotEndpoint = configuredChat === '/api/chat' || /^https:\/\//i.test(configuredChat) ? configuredChat
  : localChat ? `${location.protocol}//${location.hostname}:8767/api/chat` : '';
const conversation = [];
let robotPending = false;
const voiceControls = robot.querySelector('.robot-voice-controls');
const voiceToggle = robot.querySelector('.robot-voice-toggle');
const voiceReplay = robot.querySelector('.robot-voice-replay');
const voiceStop = robot.querySelector('.robot-voice-stop');
const voiceStatus = robot.querySelector('.robot-voice-status');
const speechAvailable = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let voiceEnabled = false;
let lastSpokenReply = '';
let lastReplyLanguage = 'auto';
let currentSpeech;

function stopRobotVoice() {
  if (speechAvailable && currentSpeech) {
    currentSpeech.onend = null;
    currentSpeech.onerror = null;
    window.speechSynthesis.cancel();
  }
  currentSpeech = undefined;
  robot.removeAttribute('data-speaking');
  voiceStop.disabled = true;
  voiceStatus.textContent = '';
}

function speakRobotReply() {
  if (!speechAvailable || !lastSpokenReply) return;
  stopRobotVoice();
  const utterance = new SpeechSynthesisUtterance(lastSpokenReply);
  const voices = window.speechSynthesis.getVoices();
  const urduScript = /[\u0600-\u06ff]/.test(lastSpokenReply);
  const roman = lastReplyLanguage === 'roman-urdu' ||
    (lastReplyLanguage === 'auto' && /\b(kya|mein|aap|hai|hain|kaam|kiya|karna|aur)\b/i.test(lastSpokenReply));
  const preferred = urduScript ? ['ur-PK', 'ur-IN'] : roman ? ['en-IN', 'en-PK', 'en-GB'] : ['en-US', 'en-GB'];
  utterance.voice = preferred.map(language => voices.find(voice => voice.lang.toLowerCase() === language.toLowerCase())).find(Boolean)
    ?? voices.find(voice => voice.lang.startsWith(urduScript ? 'ur' : 'en')) ?? null;
  utterance.lang = utterance.voice?.lang || preferred[0];
  utterance.rate = roman ? .9 : .97;
  utterance.onstart = () => {
    robot.dataset.speaking = '';
    voiceStop.disabled = false;
    voiceStatus.textContent = 'Speaking';
  };
  utterance.onend = () => {
    if (currentSpeech !== utterance) return;
    currentSpeech = undefined;
    robot.removeAttribute('data-speaking');
    voiceStop.disabled = true;
    voiceStatus.textContent = '';
  };
  utterance.onerror = () => {
    if (currentSpeech !== utterance) return;
    stopRobotVoice();
    voiceStatus.textContent = 'Voice unavailable. Try Replay.';
  };
  currentSpeech = utterance;
  window.speechSynthesis.speak(utterance);
}

voiceControls.hidden = !speechAvailable;
voiceToggle.addEventListener('click', () => {
  voiceEnabled = !voiceEnabled;
  voiceToggle.setAttribute('aria-pressed', String(voiceEnabled));
  voiceToggle.textContent = voiceEnabled ? 'Voice on' : 'Voice off';
  if (!voiceEnabled) stopRobotVoice();
});
voiceReplay.addEventListener('click', speakRobotReply);
voiceStop.addEventListener('click', stopRobotVoice);
window.addEventListener('pagehide', stopRobotVoice);

function addRobotMessage(role, content) {
  const message = document.createElement('p');
  message.className = 'robot-message';
  message.dataset.role = role;
  message.textContent = content;
  robotMessages.append(message);
  robotTranscript.scrollTop = robotTranscript.scrollHeight;
  return message;
}

function setRobotOpen(open) {
  robot.toggleAttribute('data-open', open);
  robotPanel.hidden = !open;
  robotLaunch.setAttribute('aria-expanded', String(open));
  robotLaunch.setAttribute('aria-label', open ? 'Close portfolio bot' : 'Open portfolio bot');
  if (open) {
    robotClose.focus();
    robotTranscript.scrollTop = robotTranscript.scrollHeight;
  } else {
    stopRobotVoice();
    robotLaunch.focus();
  }
}

robotLaunch.addEventListener('click', () => setRobotOpen(robotPanel.hidden));
robotClose.addEventListener('click', () => setRobotOpen(false));
robot.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !robotPanel.hidden) setRobotOpen(false);
});
robotPause.addEventListener('click', () => {
  const paused = robot.toggleAttribute('data-paused');
  robotPause.setAttribute('aria-pressed', String(paused));
});
robotClear.addEventListener('click', () => {
  stopRobotVoice();
  lastSpokenReply = '';
  voiceReplay.disabled = true;
  conversation.length = 0;
  robotMessages.replaceChildren();
  addRobotMessage('assistant', 'New chat started. Ask me about Zuhair’s portfolio.');
  robotForm.reset();
  robotInput.focus();
});

async function askRobot(question) {
  if (!question || robotPending) return;
  if (!robotEndpoint) {
    addRobotMessage('error', 'AI chat is not connected on this site yet.');
    return;
  }
  robotPending = true;
  stopRobotVoice();
  const requestedLanguage = robotLanguage.value;
  robotSend.disabled = true;
  robotClear.disabled = true;
  robotPrompts.forEach(button => { button.disabled = true; });
  robotInput.value = '';
  addRobotMessage('user', question);
  const pending = addRobotMessage('pending', localChat ? 'Thinking…' : 'Connecting to AI… The first reply may take a minute.');
  const user = { role: 'user', content: question };

  try {
    const response = await fetch(robotEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      signal: AbortSignal.timeout(localChat ? 35_000 : 105_000),
      body: JSON.stringify({ messages: [...conversation.slice(-8), user], language: requestedLanguage }),
    });
    const data = await response.json();
    if (!response.ok || !data.reply) throw new Error(data.error || 'The AI did not return a reply.');
    conversation.push(user, { role: 'assistant', content: data.reply });
    if (conversation.length > 8) conversation.splice(0, conversation.length - 8);
    pending.dataset.role = 'assistant';
    pending.textContent = data.reply;
    lastSpokenReply = data.reply;
    lastReplyLanguage = requestedLanguage;
    voiceReplay.disabled = false;
    if (voiceEnabled && !robotPanel.hidden) speakRobotReply();
  } catch (error) {
    pending.dataset.role = 'error';
    pending.textContent = error instanceof TypeError || error.name === 'TimeoutError'
      ? 'Could not reach AI chat. Try again in a moment.'
      : error.message;
    if (!robotInput.value) robotInput.value = question;
  } finally {
    robotPending = false;
    robotSend.disabled = false;
    robotClear.disabled = false;
    robotPrompts.forEach(button => { button.disabled = false; });
    robotTranscript.scrollTop = robotTranscript.scrollHeight;
  }
}

robotPrompts.forEach(button => {
  button.addEventListener('click', () => askRobot(button.dataset.robotPrompt));
});
robotForm.addEventListener('submit', event => {
  event.preventDefault();
  askRobot(robotInput.value.trim());
});
robot.hidden = false;

const carousel = document.querySelector('.project-carousel');
const carouselTrack = carousel.querySelector('.carousel-track');
const carouselControls = carousel.querySelector('.carousel-controls');
const carouselCount = carousel.querySelector('.carousel-count');
const carouselItems = [...carouselTrack.children];
const carouselTiles = carouselItems.map(item => item.querySelector('a'));
let centeredProject = -1;
let carouselFrame = 0;

function carouselOffset(item) {
  const track = carouselTrack.getBoundingClientRect();
  const card = item.getBoundingClientRect();
  return card.left + card.width / 2 - track.left - carouselTrack.clientWidth / 2;
}

function updateCarousel() {
  carouselFrame = 0;
  let closest = 0;
  let distance = Infinity;
  for (const [index, item] of carouselItems.entries()) {
    const offset = Math.abs(carouselOffset(item));
    if (offset < distance) {
      closest = index;
      distance = offset;
    }
  }
  if (closest === centeredProject) return;
  centeredProject = closest;
  carouselTiles.forEach((tile, index) => {
    tile.setAttribute('aria-current', String(index === centeredProject));
  });
  carouselCount.textContent = `${String(centeredProject + 1).padStart(2, '0')} / ${String(carouselItems.length).padStart(2, '0')}`;
}

carouselControls.addEventListener('click', event => {
  const button = event.target.closest('[data-carousel-step]');
  if (!button) return;
  const next = (centeredProject + Number(button.dataset.carouselStep) + carouselItems.length) % carouselItems.length;
  carouselTrack.scrollBy({
    left: carouselOffset(carouselItems[next]),
    behavior: reducedMotion.matches ? 'instant' : 'smooth',
  });
});
carouselTrack.addEventListener('scroll', () => {
  if (!carouselFrame) carouselFrame = requestAnimationFrame(updateCarousel);
}, { passive: true });
window.addEventListener('resize', updateCarousel);
carouselControls.hidden = false;
updateCarousel();

if ('IntersectionObserver' in window && 'animate' in Element.prototype) {
  const revealCards = new IntersectionObserver((entries, observer) => {
    let delay = 0;

    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);

      if (entry.target.classList.contains('stack-workstation')) {
        entry.target.dataset.scanning = '';
        continue;
      }

      if (!reducedMotion.matches) {
        entry.target.animate(
          [{ opacity: .45, translate: '0 18px' }, { opacity: 1, translate: '0 0' }],
          { duration: 520, delay, easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'backwards' },
        );
        delay = Math.min(delay + 65, 195);
      }
    }
  }, { threshold: .12 });

  for (const card of document.querySelectorAll('.stack-workstation, .stack-card, .project')) {
    revealCards.observe(card);
  }
}
