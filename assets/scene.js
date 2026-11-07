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
  const hues = [271, 188, 324];
  const rings = 84;
  const sides = 10;
  const turn = Math.PI * 2;
  const vertices = [];
  const faces = [];
  let frame = 0;
  let chapterIndex = -1;
  let lastRender = '';
  let pointerX = 0;
  let pointerY = 0;

  const clamp = value => Math.min(1, Math.max(0, value));

  function knotCenter(angle) {
    const radius = 1.48 + .55 * Math.cos(3 * angle);
    return [radius * Math.cos(2 * angle), radius * Math.sin(2 * angle), .62 * Math.sin(3 * angle)];
  }

  // Build a tube around a closed 3D curve. Adjacent rings share their edges.
  for (let ring = 0; ring < rings; ring++) {
    const angle = ring * turn / rings;
    const [x, y, z] = knotCenter(angle);
    const [nextX, nextY, nextZ] = knotCenter(angle + .001);
    const length = Math.hypot(nextX - x, nextY - y, nextZ - z);
    const tx = (nextX - x) / length;
    const ty = (nextY - y) / length;
    const tz = (nextZ - z) / length;
    const horizontal = Math.hypot(tx, ty);
    const nx = -ty / horizontal;
    const ny = tx / horizontal;

    for (let side = 0; side < sides; side++) {
      const phase = side * turn / sides;
      const radial = .28 * Math.cos(phase);
      const vertical = .28 * Math.sin(phase);
      vertices.push([
        x + nx * radial - tz * ny * vertical,
        y + ny * radial + tz * nx * vertical,
        z + horizontal * vertical,
      ]);

      const nextRing = (ring + 1) % rings;
      const nextSide = (side + 1) % sides;
      faces.push([
        ring * sides + side,
        nextRing * sides + side,
        nextRing * sides + nextSide,
        ring * sides + nextSide,
      ]);
    }
  }

  function drawScene(width, height, progress, hue) {
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
    const yaw = -.54 + progress * turn * 1.12;
    const pitch = .49 + Math.sin(progress * turn) * .55;
    const roll = -.21 + progress * .8;
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

    const points = vertices.map(project);
    const layers = faces.map(indices => {
      const corners = indices.map(index => points[index]);
      const depth = corners.reduce((total, corner) => total + corner[2], 0) / corners.length;
      return { corners, depth };
    }).sort((a, b) => a.depth - b.depth);

    for (const { corners, depth } of layers) {
      const [a, b, c, d] = corners;
      const lit = clamp(.38 + depth * .17 + (centerY - a[1]) / height * .58);
      context.beginPath();
      context.moveTo(a[0], a[1]);
      context.lineTo(b[0], b[1]);
      context.lineTo(c[0], c[1]);
      context.lineTo(d[0], d[1]);
      context.closePath();
      context.fillStyle = `hsl(${hue + 27 - lit * 44}, 69%, ${12 + lit * 27}%)`;
      context.strokeStyle = `hsla(${hue - 16}, 96%, ${57 + lit * 29}%, ${.25 + lit * .53})`;
      context.fill();
      context.stroke();
    }

    context.fillStyle = `hsl(${hue}, 100%, 82%)`;
    for (let index = 0; index < 4; index++) {
      const angle = progress * turn * .75 + index * turn / 4;
      const x = centerX + Math.cos(angle) * unit * 2.7;
      const y = centerY + Math.sin(angle) * unit * 1.85;
      context.beginPath();
      context.arc(x, y, 1.7, 0, turn);
      context.fill();
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
    const progress = motion.matches ? 0 : clamp((viewport * .64 - sequence.top) / sequence.height);
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
    const renderKey = `${bounds.width}:${bounds.height}:${progress.toFixed(4)}:${index}`;
    if (context && bounds.width && bounds.height && renderKey !== lastRender) {
      drawScene(bounds.width, bounds.height, progress, hues[index]);
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
