(() => {
  const gallery = document.querySelector('[data-photo-gallery]');
  if (!gallery) return;

  const photos = [
    ['assets/zuhair-ahmed-cyberpunk.jpg', 'Cyberpunk portrait', 'Digital portrait', 'The violet and cyan portrait from the original 3D portfolio.'],
    ['assets/zuhair-editorial-portrait.jpg', 'Editorial portrait', 'Edited portrait', 'A seated portrait in a black suit, used on the portfolio homepage.'],
    ['assets/zuhair-developer-workspace.jpg', 'Laravel workspace', 'Edited workspace', 'A warm edit of Zuhair working at a laptop beside the Laravel sign.'],
    ['assets/zuhair-ahmed-portrait.jpg', 'Blue studio portrait', 'Portfolio archive', 'The blue-background portrait from the earlier portfolio.'],
    ['assets/zuhair-ahmed-violet-portrait.jpg', 'Violet portrait', 'Portfolio archive', 'An earlier portfolio portrait with violet lighting.'],
    ['1794340607648.jpg', 'Seated portrait', 'Original upload', 'Zuhair in a black shirt, resting his cheek against his hand.'],
    ['1794340623860.jpg', 'Black suit', 'Original upload', 'The original seated suit portrait used for the homepage edit.'],
    ['1794340644858.jpg', 'At the laptop', 'Original upload', 'The original workspace photo with a laptop and Laravel sign.'],
    ['1794340665980.jpg', 'Arms crossed', 'Original upload', 'A standing portrait in a black shirt with arms crossed.'],
    ['1794340682336.jpg', 'Headset portrait', 'Original upload', 'A portrait with a headset microphone against a blue backdrop.'],
    ['1794340715537.jpg', 'Hoodie at the workstation', 'Original upload', 'Zuhair in a black hoodie in a developer workspace.'],
    ['1794340736722.jpg', 'Outdoor portrait', 'Original upload', 'A portrait outdoors in a jacket and sunglasses.'],
    ['1794340766246.jpg', 'Coffee at the desk', 'Original upload', 'Zuhair seated at a desk with a mug.'],
    ['1794340784443.jpg', 'Suit and tie', 'Original upload', 'A formal portrait outdoors in a suit and tie.'],
    ['1794340802970.jpg', 'Laravel studio portrait', 'Original upload', 'A violet and blue portrait with a Laravel sign in the background.'],
    ['file_000000001498821195bf72eb83efc3c2.png', 'Portrait collection', 'Original montage', 'A contact sheet of portraits in different outfits and settings.', 'assets/gallery-portrait-montage.jpg'],
    ['file_0000000047288211bd3bde7cf6334699.png', 'Developer montage', 'Original montage', 'A collage of developer and workspace portraits.', 'assets/gallery-developer-montage.jpg'],
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

  const buttons = photos.map(([src, name, , , thumbnail], index) => {
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
    const [src, name, , alt] = photos[active];
    dialogTitle.textContent = name;
    dialogImage.src = src;
    dialogImage.alt = alt;
  }

  function select(index, initial = false) {
    active = (index + photos.length) % photos.length;
    const [src, name, category, caption] = photos[active];
    preview.href = src;
    image.alt = caption;
    if (!initial) image.src = src;
    title.textContent = name;
    type.textContent = category;
    description.textContent = caption;
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
