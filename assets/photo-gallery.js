(() => {
  const gallery = document.querySelector('[data-photo-gallery]');
  if (!gallery) return;

  const photos = [
    ['assets/zuhair-ahmed-cyberpunk.jpg', 'Build for change', 'Development', 'Good software makes the next change easier to ship.', 'Zuhair’s cyberpunk portrait in violet and cyan light.'],
    ['assets/zuhair-editorial-portrait.jpg', 'Make ownership clear', 'Management', 'Give every decision an owner and every handoff a next step.', 'Zuhair seated in a black suit.'],
    ['assets/zuhair-developer-workspace.jpg', 'Start with the workflow', 'Development', 'Watch how people do the work before deciding what to automate.', 'Zuhair at a laptop beside a Laravel sign.'],
    ['assets/zuhair-ahmed-portrait.jpg', 'Show work early', 'Management', 'A working demo gives the team something concrete to improve.', 'Zuhair against a blue studio backdrop.'],
    ['assets/zuhair-ahmed-violet-portrait.jpg', 'Write for the next developer', 'Development', 'A clear name can save the next person an afternoon of debugging.', 'Zuhair in violet studio lighting.'],
    ['1794340607648.jpg', 'Ask better questions', 'Management', 'Find out what a successful day looks like for the people using the software.', 'Zuhair seated in a black shirt with his hand against his cheek.'],
    ['1794340623860.jpg', 'Keep priorities visible', 'Management', 'When priorities change, tell the team what moved and why.', 'Zuhair seated in a black suit.'],
    ['1794340644858.jpg', 'Design APIs for callers', 'Development', 'Clear responses help clients handle both success and failure.', 'Zuhair working at a laptop near a Laravel sign.'],
    ['1794340665980.jpg', 'Lead with clarity', 'Management', 'A clear decision gives the team room to move.', 'Zuhair standing in a black shirt with his arms crossed.'],
    ['1794340682336.jpg', 'Share context early', 'Management', 'Explain why a decision was made so others can make the next one.', 'Zuhair with a headset against a blue backdrop.'],
    ['1794340715537.jpg', 'Make failures diagnosable', 'Development', 'Log enough context to trace a failed request from start to finish.', 'Zuhair in a black hoodie at a workstation.'],
    ['1794340736722.jpg', 'Protect focus', 'Management', 'Give the team time to finish the work that matters most.', 'Zuhair outdoors in a jacket and sunglasses.'],
    ['1794340766246.jpg', 'Measure before tuning', 'Development', 'Find the slow query before adding a cache.', 'Zuhair seated at a desk with a mug.'],
    ['1794340784443.jpg', 'Keep handoffs usable', 'Management', 'Leave the next person the context, the open question, and the next action.', 'Zuhair outdoors in a suit and tie.'],
    ['1794340802970.jpg', 'Ship changes you can verify', 'Development', 'A release is easier to trust when the team knows how to check it.', 'Zuhair in blue and violet light beside a Laravel sign.'],
    ['file_000000001498821195bf72eb83efc3c2.png', 'Make progress visible', 'Management', 'Show what shipped and what still needs a decision.', 'A collage of Zuhair’s portraits.', 'assets/gallery-portrait-montage.jpg'],
    ['file_0000000047288211bd3bde7cf6334699.png', 'Automate repeated work', 'Development', 'Start where people spend time repeating the same steps.', 'A collage of developer and workspace portraits.', 'assets/gallery-developer-montage.jpg'],
  ];

  const preview = gallery.querySelector('.photo-preview');
  const image = preview.querySelector('img');
  const strip = gallery.querySelector('.photo-filmstrip');
  const title = gallery.querySelector('.photo-name');
  const type = gallery.querySelector('.photo-type');
  const description = gallery.querySelector('.photo-description');
  const count = gallery.querySelector('.photo-count');
  const dialog = gallery.querySelector('.photo-dialog');
  const dialogImage = dialog.querySelector('img');
  const dialogTitle = dialog.querySelector('h3');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let transition;

  const buttons = photos.map(([src, name, , , , thumbnail], index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Photo ${index + 1} of ${photos.length}: ${name}`);
    const thumb = new Image();
    thumb.alt = '';
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
    thumb.src = thumbnail || src;
    button.append(thumb);
    button.addEventListener('click', () => select(index));
    strip.append(button);
    return button;
  });

  function updateDialog() {
    const [src, name, , , alt] = photos[active];
    dialogTitle.textContent = name;
    dialogImage.src = src;
    dialogImage.alt = alt;
  }

  function select(index, initial = false) {
    active = (index + photos.length) % photos.length;
    const [src, name, category, quote, alt] = photos[active];
    preview.href = src;
    image.alt = alt;
    if (!initial) image.src = src;
    title.textContent = name;
    type.textContent = category;
    description.textContent = `“${quote}”`;
    count.textContent = `${String(active + 1).padStart(2, '0')} / ${photos.length}`;

    buttons.forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === active));
      const angle = Math.max(-1, Math.min(1, i - active)) * -18;
      button.style.setProperty('--thumb-angle', `${angle}deg`);
    });

    if (dialog.open) updateDialog();
    if (initial) return;

    const thumb = buttons[active];
    const left = thumb.getBoundingClientRect().left - strip.getBoundingClientRect().left;
    strip.scrollTo({
      left: strip.scrollLeft + left - (strip.clientWidth - thumb.offsetWidth) / 2,
      behavior: motion.matches ? 'auto' : 'smooth',
    });

    transition?.cancel();
    if (!motion.matches) {
      const selected = active;
      image.decode().then(() => {
        if (selected !== active) return;
        transition = image.animate(
          [{ opacity: 0.35, transform: 'scale(1.035)' }, { opacity: 1, transform: 'scale(1)' }],
          { duration: 420, easing: 'cubic-bezier(.2,.65,.25,1)' },
        );
      }).catch(() => {});
    }
  }

  gallery.querySelectorAll('[data-photo-step]').forEach((button) => {
    button.addEventListener('click', () => select(active + Number(button.dataset.photoStep)));
  });

  gallery.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const thumbnailFocused = strip.contains(document.activeElement);
    select(active + (event.key === 'ArrowLeft' ? -1 : 1));
    if (thumbnailFocused) buttons[active].focus({ preventScroll: true });
  });

  preview.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || typeof dialog.showModal !== 'function') return;
    event.preventDefault();
    updateDialog();
    dialog.showModal();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  select(0, true);
})();
