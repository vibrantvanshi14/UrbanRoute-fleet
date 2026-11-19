// ==================== 1. PERCENTAGE LOADER & SPLIT CHARACTERS ====================
const loader = document.getElementById('pageLoader');
const loaderPercent = document.getElementById('loaderPercent');
const heroSection = document.getElementById('heroSection');

// Split Mission Statement into Scroll-Scrubbed Words
const scrubMission = document.getElementById('scrubMission');
if (scrubMission) {
  const missionWords = scrubMission.innerText.trim().split(/\s+/);
  scrubMission.innerHTML = missionWords.map(w => `<span class="scrub-word">${w}</span>`).join(' ');
}
const scrubWordEls = document.querySelectorAll('.scrub-word');

// Animate 0% -> 100% on refresh
let loadVal = 0;
const loadInterval = setInterval(() => {
  loadVal += Math.floor(Math.random() * 18) + 8;
  if (loadVal >= 100) {
    loadVal = 100;
    clearInterval(loadInterval);
    setTimeout(() => {
      if (loader) loader.classList.add('loaded');
      if (heroSection) heroSection.classList.add('in-view');
    }, 220);
  }
  if (loaderPercent) loaderPercent.textContent = loadVal + '%';
}, 65);

// ==================== 2. HERO GOLDEN POLLEN PARTICLE CANVAS ====================
const canvas = document.getElementById('pollenCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 1.45;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  for (let i = 0; i < 45; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.6 + 1,
      vx: (Math.random() - 0.5) * 0.45,
      vy: -Math.random() * 0.5 - 0.15,
      alpha: Math.random() * 0.55 + 0.2
    });
  }

  // ==================== 3. LERP SCROLL ENGINE & ANIMATIONS ====================
  let currentScroll = window.scrollY;
  let targetScroll = window.scrollY;
  let lastScrollY = window.scrollY;

  const navbar = document.getElementById('navbar');
  const heroTitle = document.getElementById('heroTitle');

  window.addEventListener('scroll', () => {
    targetScroll = window.scrollY;
    if (navbar) {
      if (targetScroll > lastScrollY && targetScroll > 120) {
        navbar.classList.add('nav-hidden');
      } else {
        navbar.classList.remove('nav-hidden');
      }
      navbar.classList.toggle('nav-scrolled', targetScroll > 60);
    }
    lastScrollY = targetScroll;
  }, { passive: true });

  function animateEngine() {
    const diff = targetScroll - currentScroll;
    currentScroll += diff * 0.095;

    // Hero Depth Parallax
    if (heroTitle && currentScroll < window.innerHeight * 1.5) {
      heroTitle.style.transform = `translate3d(0, ${currentScroll * 0.22}px, 0)`;
    }

    // Word-by-Word Scroll Scrub on Mission Text
    if (scrubMission && scrubWordEls.length > 0) {
      const missionRect = scrubMission.getBoundingClientRect();
      const startScrub = window.innerHeight * 0.82;
      const endScrub = window.innerHeight * 0.22;
      const scrubProgress = Math.min(Math.max((startScrub - missionRect.top) / (startScrub - endScrub), 0), 1);
      const activeCount = Math.floor(scrubProgress * scrubWordEls.length);
      scrubWordEls.forEach((wordEl, idx) => {
        wordEl.classList.toggle('active-word', idx <= activeCount);
      });
    }

    // Render Hero Golden Spores/Pollen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < 0) p.y = canvas.height;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(185, 110, 25, ${p.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(animateEngine);
  }
  requestAnimationFrame(animateEngine);
}

// ==================== 4. INTERSECTION OBSERVER ====================
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('in-view');
  });
}, { threshold: 0.16 });

document.querySelectorAll('.observe-me').forEach(el => observer.observe(el));

document.addEventListener("DOMContentLoaded", () => {
  // Select all local anchor links (exclude external links or anchors like #id)
  const links = document.querySelectorAll('a[href]:not([target="_blank"]):not([href^="#"])');

  links.forEach(link => {
    link.addEventListener("click", (e) => {
      // 1. Prevent the default instant page jump
      e.preventDefault();
      const targetUrl = link.href;

      // 2. Add the fade-out class to trigger the CSS animation
      document.body.classList.add("fade-out");

      // 3. Wait for the animation to finish (500ms matches the CSS duration)
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 500); 
    });
  });
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    document.body.classList.remove("fade-out");
  }
});
