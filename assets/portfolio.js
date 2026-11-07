const header = document.querySelector('.header-inner');
const menu = header.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');
header.dataset.enhanced = '';

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

if ('IntersectionObserver' in window && 'animate' in Element.prototype) {
  const revealCards = new IntersectionObserver((entries, observer) => {
    let delay = 0;

    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);

      if (!reducedMotion.matches) {
        entry.target.animate(
          [{ opacity: .45, translate: '0 18px' }, { opacity: 1, translate: '0 0' }],
          { duration: 520, delay, easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'backwards' },
        );
        delay = Math.min(delay + 65, 195);
      }
    }
  }, { threshold: .12 });

  for (const card of document.querySelectorAll('.stack-card, .project')) {
    revealCards.observe(card);
  }
}
