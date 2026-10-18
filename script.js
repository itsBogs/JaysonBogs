const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle?.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
  navLinks?.classList.toggle('is-open', !isOpen);
});

navLinks?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Open navigation');
    navLinks.classList.remove('is-open');
  });
});

document.querySelector('#year').textContent = new Date().getFullYear();

(() => {
  const canvas = document.querySelector('.pacman-trail');
  const context = canvas?.getContext('2d');
  if (!canvas || !context || matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;

  const MAX_DOTS = 48;
  const DOT_SPACING = 19;
  const PACMAN_SPEED = 235;
  const RADIUS = 17;
  const dots = [];
  const bites = [];
  const pointer = { x: 0, y: 0, active: false, inHome: false, lastDot: null };
  const pacman = { x: 0, y: 0, angle: 0, ready: false };
  let frame = 0;
  let previousTime = 0;
  let pixelRatio = 1;

  function resizeCanvas() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * pixelRatio);
    canvas.height = Math.round(window.innerHeight * pixelRatio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function addDot(x, y) {
    dots.push({ x, y, born: performance.now() });
    if (dots.length > MAX_DOTS) dots.shift();
  }

  function addTrail(x, y) {
    if (!pointer.lastDot) {
      pointer.lastDot = { x, y };
      return;
    }
    const dx = x - pointer.lastDot.x;
    const dy = y - pointer.lastDot.y;
    const distance = Math.hypot(dx, dy);
    if (distance < DOT_SPACING) return;
    const count = Math.floor(distance / DOT_SPACING);
    for (let i = 1; i <= count; i++) {
      const progress = (DOT_SPACING * i) / distance;
      addDot(pointer.lastDot.x + dx * progress, pointer.lastDot.y + dy * progress);
    }
    pointer.lastDot = { x: pointer.lastDot.x + dx * (DOT_SPACING * count / distance), y: pointer.lastDot.y + dy * (DOT_SPACING * count / distance) };
  }

  function isOverHome(x, y) {
    return Boolean(document.elementFromPoint(x, y)?.closest('#home'));
  }

  function stopEffect() {
    pointer.inHome = false;
    pointer.active = false;
    pointer.lastDot = null;
    pacman.ready = false;
    dots.length = 0;
    bites.length = 0;
    canvas.classList.remove('is-active');
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function trackPointer(x, y) {
    pointer.x = x;
    pointer.y = y;
    if (!isOverHome(x, y)) {
      if (pointer.inHome) stopEffect();
      return;
    }
    pointer.inHome = true;
    pointer.active = true;
    if (!pacman.ready) {
      pacman.x = pointer.x - 48;
      pacman.y = pointer.y;
      pacman.ready = true;
    }
    addTrail(pointer.x, pointer.y);
    canvas.classList.add('is-active');
    if (!frame) frame = requestAnimationFrame(animate);
  }

  function setPointer(event) {
    if (event.pointerType !== 'mouse') return;
    trackPointer(event.clientX, event.clientY);
  }

  function drawDot(dot, time) {
    const age = time - dot.born;
    const pulse = 1 + Math.sin(age * 0.008) * 0.12;
    context.save();
    context.shadowBlur = 12;
    context.shadowColor = 'rgba(255, 211, 73, 0.72)';
    context.fillStyle = '#ffe17a';
    context.beginPath();
    context.arc(dot.x, dot.y, 3 * pulse, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawPacman(time, moving) {
    const chomp = moving ? (0.12 + Math.abs(Math.sin(time * 0.018)) * 0.34) : 0.08;
    context.save();
    context.translate(pacman.x, pacman.y);
    context.rotate(pacman.angle);
    context.shadowColor = 'rgba(255, 202, 47, 0.55)';
    context.shadowBlur = 20;
    context.fillStyle = '#ffd447';
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, RADIUS, chomp, Math.PI * 2 - chomp);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = '#121826';
    context.beginPath();
    context.arc(RADIUS * 0.28, -RADIUS * 0.47, 2.8, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawBites(time) {
    for (let i = bites.length - 1; i >= 0; i--) {
      const bite = bites[i];
      const progress = (time - bite.born) / 220;
      if (progress >= 1) {
        bites.splice(i, 1);
        continue;
      }
      context.beginPath();
      context.arc(bite.x, bite.y, 3 + progress * 11, 0, Math.PI * 2);
      context.strokeStyle = `rgba(255, 220, 112, ${1 - progress})`;
      context.lineWidth = 1.5;
      context.stroke();
    }
  }

  function animate(time) {
    frame = 0;
    if (!pointer.inHome) {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      return;
    }
    const delta = Math.min((time - (previousTime || time)) / 1000, 0.04);
    previousTime = time;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const dot of dots) drawDot(dot, time);

    let moving = false;
    const target = dots[0];
    if (target) {
      const dx = target.x - pacman.x;
      const dy = target.y - pacman.y;
      const distance = Math.hypot(dx, dy);
      pacman.angle = Math.atan2(dy, dx);
      if (distance <= Math.max(5, PACMAN_SPEED * delta)) {
        pacman.x = target.x;
        pacman.y = target.y;
        dots.shift();
        bites.push({ x: target.x, y: target.y, born: time });
      } else {
        const step = PACMAN_SPEED * delta;
        pacman.x += (dx / distance) * step;
        pacman.y += (dy / distance) * step;
        moving = true;
      }
    } else if (pointer.active) {
      const dx = pointer.x - pacman.x;
      const dy = pointer.y - pacman.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 2) {
        pacman.angle = Math.atan2(dy, dx);
        const step = Math.min(distance, 110 * delta);
        pacman.x += (dx / distance) * step;
        pacman.y += (dy / distance) * step;
        moving = true;
      }
    }

    drawBites(time);
    drawPacman(time, moving);
    if (dots.length || (pointer.active && Math.hypot(pointer.x - pacman.x, pointer.y - pacman.y) > 2) || bites.length) {
      frame = requestAnimationFrame(animate);
    }
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas, { passive: true });
  document.addEventListener('pointermove', setPointer, { passive: true });
  window.addEventListener('scroll', () => {
    if (pointer.active) trackPointer(pointer.x, pointer.y);
  }, { passive: true });
})();

(() => {
  const canvas = document.querySelector('.page-particles');
  const context = canvas?.getContext('2d', { alpha: true });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!canvas || !context || reducedMotion.matches || matchMedia('(pointer: coarse)').matches) return;

  const particles = [];
  const pointer = { x: -1000, y: -1000, active: false };
  let width = 0;
  let height = 0;
  let ratio = 1;
  let frame = 0;
  let previousTime = 0;
  let visible = !document.hidden;

  function createParticle(fromTop = false) {
    const depth = Math.random();
    return {
      x: Math.random() * width,
      y: fromTop ? -4 : Math.random() * height,
      size: 0.7 + depth * 1.8,
      speed: 13 + depth * 28,
      drift: (Math.random() - 0.5) * 9,
      opacity: 0.2 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      vx: 0,
      vy: 0,
    };
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(130, Math.max(32, Math.round(width * height / 6800)));
    particles.length = 0;
    for (let i = 0; i < count; i++) particles.push(createParticle());
    start();
  }

  function drawParticle(particle, time, delta) {
    const dx = particle.x - pointer.x;
    const dy = particle.y - pointer.y;
    const distance = Math.hypot(dx, dy);
    if (pointer.active && distance > 0 && distance < 105) {
      const force = (1 - distance / 105) * 22;
      particle.vx += dx / distance * force * delta;
      particle.vy += dy / distance * force * delta;
    }
    particle.vx *= 0.975;
    particle.vy *= 0.975;
    particle.phase += delta * 0.55;
    particle.x += (particle.drift + Math.sin(particle.phase + time * 0.0003) * 4 + particle.vx) * delta;
    particle.y += (particle.speed + particle.vy) * delta;
    if (particle.y > height + particle.size) {
      Object.assign(particle, createParticle(true));
      return;
    }
    if (particle.x < -5) particle.x = width + 5;
    if (particle.x > width + 5) particle.x = -5;

    const fadeIn = Math.min(1, particle.y / 45);
    const fadeOut = Math.min(1, Math.max(0, (height - particle.y) / 75));
    const opacity = particle.opacity * fadeIn * fadeOut;
    context.beginPath();
    context.fillStyle = `rgba(145, 224, 235, ${opacity})`;
    context.shadowColor = `rgba(99, 221, 230, ${opacity * 0.7})`;
    context.shadowBlur = particle.size > 1.8 ? 8 : 4;
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
  }

  function animate(time) {
    frame = 0;
    if (!visible) return;
    const delta = Math.min((time - (previousTime || time)) / 1000, 0.04);
    previousTime = time;
    context.clearRect(0, 0, width, height);
    particles.forEach((particle) => drawParticle(particle, time, delta));
    frame = requestAnimationFrame(animate);
  }

  function start() {
    if (visible && !frame) {
      previousTime = 0;
      frame = requestAnimationFrame(animate);
    }
  }

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }, { passive: true });
  window.addEventListener('blur', () => {
    pointer.active = false;
    pointer.x = pointer.y = -1000;
  });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible) start();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });
  reducedMotion.addEventListener?.('change', (event) => {
    if (event.matches) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      context.clearRect(0, 0, width, height);
    } else start();
  });

  resize();
})();

