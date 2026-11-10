(() => {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const stackedScene = window.matchMedia('(max-width: 54rem) and (min-height: 38rem)');
  const hero = document.querySelector('.hero');
  const portraitDepth = hero.querySelector('.portrait-depth');
  const portrait = portraitDepth.querySelector('.portrait-card');
  const showcase = document.querySelector('.showcase-grid');
  const scene = showcase.querySelector('.scene');
  const canvas = scene.querySelector('canvas');
  const context = canvas.getContext('2d');
  const chapters = [...showcase.querySelectorAll('.scene-chapter')];
  const titles = chapters.map(chapter => chapter.querySelector('h3').textContent);
  const title = scene.querySelector('.scene-title');
  const count = scene.querySelector('.scene-count');
  const gauge = scene.querySelector('.scene-gauge-value');
  const hues = [271, 188, 324];
  const turn = Math.PI * 2;
  let frame = 0;
  let chapterIndex = -1;
  let lastRender = '';
  let pointerX = 0;
  let pointerY = 0;

  const clamp = value => Math.min(1, Math.max(0, value));

  function drawScene(width, height, progress, projectIndex) {
    const hue = hues[projectIndex];
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    const centerX = width * .5;
    const centerY = height * .52;
    const unit = Math.min(width, height) * .162;
    const yaw = -.58 + progress * 1.16;
    const pitch = -.43 - Math.sin(progress * Math.PI) * .15;
    const roll = -.08 + progress * .16;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const cosRoll = Math.cos(roll);
    const sinRoll = Math.sin(roll);

    const project = ([x, y, z]) => {
      const rotatedX = x * cosYaw + z * sinYaw;
      const turnedZ = z * cosYaw - x * sinYaw;
      const rotatedY = y * cosPitch - turnedZ * sinPitch;
      const depth = y * sinPitch + turnedZ * cosPitch;
      const scale = unit * 6.8 / (6.8 - depth);
      return [
        centerX + (rotatedX * cosRoll - rotatedY * sinRoll) * scale,
        centerY + (rotatedX * sinRoll + rotatedY * cosRoll) * scale,
        depth,
      ];
    };

    const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, unit * 3.25);
    glow.addColorStop(0, `hsla(${hue}, 95%, 57%, .23)`);
    glow.addColorStop(1, `hsla(${hue}, 95%, 57%, 0)`);
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.lineWidth = .8;
    context.strokeStyle = `hsla(${hue}, 95%, 78%, .33)`;
    context.setLineDash([2, 5]);
    for (const radius of [2.62, 2.9]) {
      context.beginPath();
      context.ellipse(centerX, centerY, radius * unit, radius * unit * .68, -.22, 0, turn);
      context.stroke();
    }
    context.setLineDash([]);

    const accent = `hsl(${hue}, 88%, 74%)`;
    const polygon = (corners, fill, outline) => {
      const [first, ...rest] = corners.map(project);
      context.beginPath();
      context.moveTo(first[0], first[1]);
      for (const [x, y] of rest) context.lineTo(x, y);
      context.closePath();
      context.fillStyle = fill;
      context.fill();
      if (outline) {
        context.strokeStyle = outline;
        context.stroke();
      }
    };
    const deck = (l, b, r, f, fill, outline) =>
      polygon([[l,.55,b], [r,.55,b], [r,.55,f], [l,.55,f]], fill, outline);
    const screen = (l, t, r, b, fill, outline) => {
      const point = (x, row) => [x, -1.49 + row * 2.04, -.99 + row * .24];
      polygon([point(l,t), point(r,t), point(r,b), point(l,b)], fill, outline);
    };

    context.lineWidth = 1.1;
    polygon([[-2.05,.55,1.42], [2.05,.55,1.42], [2.05,.69,1.42], [-2.05,.69,1.42]], '#171322', accent);
    deck(-2.05, -.76, 2.05, 1.42, '#292339', accent);
    deck(-1.78, -.52, 1.78, .55, '#15111f', '#554564');
    for (let row = 0; row < 4; row++) {
      const back = -.45 + row * .24;
      for (let column = 0; column < 13; column++) {
        const left = -1.7 + column * .26;
        deck(left, back, left + .21, back + .17, '#493b59');
      }
    }
    deck(-.58, .66, .58, 1.24, '#332a45', '#655477');

    screen(-1.98, 0, 1.98, 1, '#171321', accent);
    screen(-1.81, .08, 1.81, .91, '#100d19', '#57436b');
    screen(-1.81, .08, 1.81, .19, '#332445');
    screen(-1.81, .19, -1.15, .91, '#241b32');
    for (const x of [-1.65, -1.49, -1.33]) screen(x, .123, x + .07, .15, accent);
    for (const row of [.3, .43, .56, .69]) screen(-1.68, row, -1.27, row + .028, '#634f77');
    const panels = [
      [[-.99,.28,1.59,.37], [-.99,.45,.20,.78], [.32,.45,1.59,.78]],
      [[-.99,.27,-.23,.82], [-.10,.27,.65,.82], [.78,.27,1.59,.82]],
      [[-.99,.27,1.59,.47], [-.99,.53,.11,.81], [.24,.53,1.59,.81]],
    ];
    for (const [left, top, right, bottom] of panels[projectIndex]) {
      screen(left, top, right, bottom, '#21172e', '#423151');
      screen(left + .09, top + .034, right - .16, top + .055, accent);
      if (bottom - top > .16) {
        screen(left + .09, top + .105, right - .23, top + .124, '#76668c');
        screen(left + .09, top + .148, right - .30, top + .164, '#4b3e61');
      }
    }

    scene.dataset.rendered = '';
  }

  function update() {
    frame = 0;
    const viewport = window.innerHeight;
    const heroBounds = hero.getBoundingClientRect();

    if (!motion.matches && heroBounds.bottom > 0) {
      const depth = clamp(-heroBounds.top / heroBounds.height);
      const tilt = Math.hypot(pointerX, pointerY) * 7;
      portrait.style.setProperty('--portrait-travel', `${depth * 12}px`);
      portrait.style.setProperty('--portrait-axis', tilt ? `${-pointerY} ${pointerX} 0` : '0 1 0');
      portrait.style.setProperty('--portrait-turn', `${tilt}deg`);
    }

    const bounds = scene.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > viewport) return;

    const sequence = showcase.getBoundingClientRect();
    const progress = clamp((viewport * .64 - sequence.top) / Math.max(1, sequence.height - viewport * .30));
    const rotation = motion.matches ? 0 : progress;
    const chapterGuide = stackedScene.matches ? bounds.bottom + 36 : viewport * .52;
    let index = 0;
    if (!motion.matches) {
      for (const [position, chapter] of chapters.entries()) {
        if (chapter.getBoundingClientRect().top <= chapterGuide) index = position;
      }
    }

    if (index !== chapterIndex) {
      chapters[chapterIndex]?.removeAttribute('data-current');
      chapters[index].dataset.current = '';
      scene.style.setProperty('--scene-glow', chapters[index].dataset.glow);
      title.textContent = titles[index];
      count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}`;
      chapterIndex = index;
    }

    scene.style.setProperty('--scene-progress', progress);
    gauge.textContent = `${Math.round(progress * 100)}%`;
    const renderKey = `${bounds.width}:${bounds.height}:${rotation.toFixed(4)}:${index}`;
    if (context && bounds.width && bounds.height && renderKey !== lastRender) {
      drawScene(bounds.width, bounds.height, rotation, index);
      lastRender = renderKey;
    }
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(update);
  }

  portraitDepth.addEventListener('pointermove', event => {
    if (motion.matches || !finePointer.matches || event.pointerType !== 'mouse') return;
    const bounds = portraitDepth.getBoundingClientRect();
    pointerX = (event.clientX - bounds.left) / bounds.width * 2 - 1;
    pointerY = (event.clientY - bounds.top) / bounds.height * 2 - 1;
    schedule();
  });
  portraitDepth.addEventListener('pointerleave', () => {
    pointerX = 0;
    pointerY = 0;
    schedule();
  });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  motion.addEventListener('change', schedule);
  schedule();
})();
