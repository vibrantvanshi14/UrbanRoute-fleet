// ==================== 1. GENERATIVE AI ROUTE CANVAS + SPOTLIGHT ====================
(function initAmbientMotion() {
  const canvas = document.getElementById("routeCanvas");
  const spotlight = document.getElementById("cursorSpotlight");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let width = 0, height = 0, routes = [];

  function buildRoutes() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    routes = [];
    const count = width < 768 ? 3 : 5;
    for (let i = 0; i < count; i++) {
      const y1 = height * (0.15 + (i / count) * 0.7);
      const y2 = height * (0.15 + ((i + 1.4) % count) / count * 0.7);
      routes.push({
        p0: { x: -60, y: y1 },
        p1: { x: width * 0.32, y: y1 + (Math.random() - 0.5) * 160 },
        p2: { x: width * 0.68, y: y2 + (Math.random() - 0.5) * 160 },
        p3: { x: width + 60, y: y2 },
        t: Math.random(),
        speed: 0.0012 + Math.random() * 0.0012,
        color: i % 2 === 0 ? "#B4F05A" : "#39D98A"
      });
    }
  }

  function cubicPt(r, t) {
    const u = 1 - t;
    return {
      x: u * u * u * r.p0.x + 3 * u * u * t * r.p1.x + 3 * u * t * t * r.p2.x + t * t * t * r.p3.x,
      y: u * u * u * r.p0.y + 3 * u * u * t * r.p1.y + 3 * u * t * t * r.p2.y + t * t * t * r.p3.y
    };
  }

  buildRoutes();
  window.addEventListener("resize", buildRoutes);

  let mx = width / 2, my = height / 2, sx = mx, sy = my;
  window.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (spotlight) spotlight.style.opacity = "1";
  });
  window.addEventListener("mouseleave", () => {
    if (spotlight) spotlight.style.opacity = "0";
  });

  function render() {
    sx += (mx - sx) * 0.08;
    sy += (my - sy) * 0.08;
    if (spotlight) {
      spotlight.style.left = `${sx}px`;
      spotlight.style.top = `${sy}px`;
    }

    ctx.clearRect(0, 0, width, height);
    routes.forEach((r) => {
      ctx.beginPath();
      ctx.moveTo(r.p0.x, r.p0.y);
      ctx.bezierCurveTo(r.p1.x, r.p1.y, r.p2.x, r.p2.y, r.p3.x, r.p3.y);
      ctx.strokeStyle = "rgba(180, 240, 90, 0.06)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      r.t = (r.t + r.speed) % 1;
      for (let s = 0; s < 8; s++) {
        const pt = cubicPt(r, Math.max(0, r.t - s * 0.008));
        const alpha = (1 - s / 8) * 0.4;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.2 - s * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = r.color === "#B4F05A" ? `rgba(180,240,90,${alpha})` : `rgba(57,217,138,${alpha})`;
        ctx.fill();
      }

      const head = cubicPt(r, r.t);
      ctx.beginPath();
      ctx.arc(head.x, head.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  // Magnetic Buttons
  document.querySelectorAll(".magnetic").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.16;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.16;
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translate(0px, 0px)";
    });
  });
})();

// ==================== 2. LOGIN LOGIC ====================
const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberInput = document.getElementById("remember");

const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const formError = document.getElementById("formError");

const MOCK_USERS_URL = "";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getLocalUsers() {
  const existing = JSON.parse(localStorage.getItem("mockUsers") || "null");
  if (Array.isArray(existing) && existing.length > 0) return existing;
  const defaultUsers = [{ email: "test@example.com", password: "Password123" }];
  localStorage.setItem("mockUsers", JSON.stringify(defaultUsers));
  return defaultUsers;
}

function setFieldError(input, errorEl, message) {
  if (message) {
    input.classList.add("invalid");
    errorEl.textContent = message;
  } else {
    input.classList.remove("invalid");
    errorEl.textContent = "";
  }
}

function showFormError(message) {
  formError.textContent = message || "";
  formError.classList.toggle("visible", Boolean(message));
}

function validateForm() {
  let isValid = true;
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  showFormError("");

  if (!email) {
    setFieldError(emailInput, emailError, "Email is required.");
    isValid = false;
  } else if (!emailRegex.test(email)) {
    setFieldError(emailInput, emailError, "Enter a valid email address.");
    isValid = false;
  } else {
    setFieldError(emailInput, emailError, "");
  }

  if (!password) {
    setFieldError(passwordInput, passwordError, "Password is required.");
    isValid = false;
  } else if (password.length < 8) {
    setFieldError(passwordInput, passwordError, "Password must be at least 8 characters.");
    isValid = false;
  } else {
    setFieldError(passwordInput, passwordError, "");
  }

  return isValid;
}

emailInput.addEventListener("input", () => {
  if (emailInput.classList.contains("invalid")) setFieldError(emailInput, emailError, "");
});

passwordInput.addEventListener("input", () => {
  if (passwordInput.classList.contains("invalid")) setFieldError(passwordInput, passwordError, "");
});

const prefillEmail = sessionStorage.getItem("prefillLoginEmail");
if (prefillEmail) {
  emailInput.value = prefillEmail;
  sessionStorage.removeItem("prefillLoginEmail");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = {
    email: emailInput.value.trim(),
    password: passwordInput.value,
    remember: rememberInput ? rememberInput.checked : false
  };

  const submitBtn = form.querySelector(".submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in...";

  try {
    let matchedUser = null;

    if (MOCK_USERS_URL && !MOCK_USERS_URL.includes("YOUR-PROJECT-ID")) {
      const response = await fetch(`${MOCK_USERS_URL}?email=${encodeURIComponent(payload.email)}`);
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        showFormError(data.message || `Server error (${response.status}).`);
        return;
      }
      const list = Array.isArray(data) ? data : (data.users || []);
      matchedUser = list.find(
        (u) => u.email && u.email.toLowerCase() === payload.email.toLowerCase() && u.password === payload.password
      );
    } else {
      const users = getLocalUsers();
      matchedUser = users.find(
        (u) => u.email.toLowerCase() === payload.email.toLowerCase() && u.password === payload.password
      );
    }

    if (!matchedUser) {
      showFormError("Invalid email or password.");
      passwordInput.classList.add("invalid");
      return;
    }

    const storage = payload.remember ? localStorage : sessionStorage;
    storage.setItem("loggedInUser", JSON.stringify({ email: matchedUser.email }));

    document.body.classList.add("fade-out");
    setTimeout(() => {
      window.location.href = "ev_data.html";
    }, 350);
  } catch (err) {
    console.error("Login error:", err);
    showFormError("Unable to reach the login server. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign in";
  }
});

document.querySelectorAll(".toggle-password").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetInput = document.getElementById(btn.dataset.target);
    if (!targetInput) return;
    const isHidden = targetInput.type === "password";
    targetInput.type = isHidden ? "text" : "password";
    btn.textContent = isHidden ? "Hide" : "Show";
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll('a[href]:not([target="_blank"]):not([href^="#"])');
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetUrl = link.href;
      document.body.classList.add("fade-out");
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 350);
    });
  });
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) document.body.classList.remove("fade-out");
});