// ==================== 1. LOADER & CINEMATIC HERO TRIGGER ====================
const loader = document.getElementById('pageLoader');
const loaderPercent = document.getElementById('loaderPercent');
const loaderProgress = document.getElementById('loaderProgress');
const heroSection = document.getElementById('heroSection');

let loadVal = 0;
const loadInterval = setInterval(() => {
  loadVal += Math.floor(Math.random() * 16) + 10;
  if (loadVal >= 100) {
    loadVal = 100;
    clearInterval(loadInterval);
    setTimeout(() => {
      if (loader) loader.classList.add('loaded');
      setTimeout(() => {
        if (heroSection) heroSection.classList.add('in-view');
      }, 180);
    }, 180);
  }
  if (loaderPercent) loaderPercent.textContent = loadVal + '%';
  if (loaderProgress) loaderProgress.style.width = loadVal + '%';
}, 50);

// ==================== 2. GENERATIVE AI ROUTE-FLOW CANVAS ====================
const canvas = document.getElementById('routeCanvas');
const spotlight = document.getElementById('cursorSpotlight');
const navbar = document.getElementById('navbar');

if (canvas) {
  const ctx = canvas.getContext('2d');
  let routes = [];
  let width = 0;
  let height = 0;

  function buildRoutes() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = heroSection ? heroSection.offsetHeight : window.innerHeight;
    routes = [];

    const routeCount = width < 768 ? 4 : 7;
    for (let i = 0; i < routeCount; i++) {
      const yStart = height * (0.12 + (i / routeCount) * 0.58);
      const yEnd = height * (0.1 + ((i + 1.5) % routeCount) / routeCount * 0.58);
      routes.push({
        p0: { x: -80, y: yStart },
        p1: { x: width * (0.28 + Math.random() * 0.15), y: yStart + (Math.random() - 0.5) * 180 },
        p2: { x: width * (0.62 + Math.random() * 0.15), y: yEnd + (Math.random() - 0.5) * 180 },
        p3: { x: width + 80, y: yEnd },
        t: Math.random(),
        speed: 0.0014 + Math.random() * 0.0014,
        color: i % 2 === 0 ? '#B4F05A' : '#39D98A'
      });
    }
  }

  function getCubicPoint(r, t) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    return {
      x: uuu * r.p0.x + 3 * uu * t * r.p1.x + 3 * u * tt * r.p2.x + ttt * r.p3.x,
      y: uuu * r.p0.y + 3 * uu * t * r.p1.y + 3 * u * tt * r.p2.y + ttt * r.p3.y
    };
  }

  buildRoutes();
  window.addEventListener('resize', buildRoutes);

  let mouseX = width / 2;
  let mouseY = height / 3;
  let spotX = mouseX;
  let spotY = mouseY;

  window.addEventListener('mousemove', (e) => {
    if (!heroSection) return;
    const rect = heroSection.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    if (spotlight) spotlight.style.opacity = '1';
  });

  window.addEventListener('mouseleave', () => {
    if (spotlight) spotlight.style.opacity = '0';
  });

  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    const currentY = window.scrollY;
    if (navbar) {
      navbar.classList.toggle('nav-hidden', currentY > lastScrollY && currentY > 140);
      navbar.classList.toggle('nav-scrolled', currentY > 40);
    }
    lastScrollY = currentY;
  }, { passive: true });

  function renderFrame() {
    spotX += (mouseX - spotX) * 0.08;
    spotY += (mouseY - spotY) * 0.08;
    if (spotlight) {
      spotlight.style.left = `${spotX}px`;
      spotlight.style.top = `${spotY}px`;
    }

    ctx.clearRect(0, 0, width, height);

    routes.forEach((r) => {
      ctx.beginPath();
      ctx.moveTo(r.p0.x, r.p0.y);
      ctx.bezierCurveTo(r.p1.x, r.p1.y, r.p2.x, r.p2.y, r.p3.x, r.p3.y);
      ctx.strokeStyle = 'rgba(180, 240, 90, 0.07)';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      r.t += r.speed;
      if (r.t > 1) r.t = 0;

      const tailSteps = 10;
      for (let s = 0; s < tailSteps; s++) {
        const sampleT = Math.max(0, r.t - s * 0.008);
        const pt = getCubicPoint(r, sampleT);
        const alpha = (1 - s / tailSteps) * 0.45;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.6 - s * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = r.color === '#B4F05A'
          ? `rgba(180, 240, 90, ${alpha})`
          : `rgba(57, 217, 138, ${alpha})`;
        ctx.fill();
      }

      const head = getCubicPoint(r, r.t);
      ctx.beginPath();
      ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    requestAnimationFrame(renderFrame);
  }
  requestAnimationFrame(renderFrame);
}

// ==================== 3. MAGNETIC BUTTON MICRO-INTERACTION ====================
document.querySelectorAll('.magnetic').forEach((btn) => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.22;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.22;
    btn.style.transform = `translate(${x}px, ${y}px)`;
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translate(0px, 0px)';
  });
});

// ==================== 4. LIVE SYNCED EV BATTERY TELEMETRY ====================
const batteryText = document.getElementById('ev-battery-pct');
if (batteryText) {
  const startTime = performance.now();
  function updateBattery(now) {
    const cyclePos = ((now - startTime) % 10000) / 10000;
    let pct = 20;

    if (cyclePos >= 0.28 && cyclePos <= 0.65) {
      const progress = (cyclePos - 0.28) / (0.65 - 0.28);
      pct = Math.round(20 + progress * 80);
    } else if (cyclePos > 0.65 && cyclePos <= 0.85) {
      pct = 100;
    }

    batteryText.textContent = pct + '%';
    batteryText.setAttribute('fill', pct >= 80 ? '#B4F05A' : '#FFE066');
    requestAnimationFrame(updateBattery);
  }
  requestAnimationFrame(updateBattery);
}

// ==================== 5. INTERSECTION OBSERVER ====================
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('in-view');
  });
}, { threshold: 0.16 });

document.querySelectorAll('.observe-me').forEach((el) => {
  if (el !== heroSection) observer.observe(el);
});

// ==================== 6. SMOOTH PAGE TRANSITION ====================
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('a[href]:not([target="_blank"]):not([href^="#"])');
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetUrl = link.href;
      document.body.classList.add('fade-out');
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 450);
    });
  });
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    document.body.classList.remove('fade-out');
  }
});
