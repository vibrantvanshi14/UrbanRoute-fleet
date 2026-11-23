const EMAILJS_PUBLIC_KEY  = "lChGmkQ1pT21hu5h3";
const EMAILJS_SERVICE_ID  = "service_rmrfgka";
const EMAILJS_TEMPLATE_ID = "template_gk7fe72";
const SENDER_EMAIL        = "helpline.urbanroutefleet@gmail.com";

if (EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

let userEmail = "";
let latestOtp = "";
let isOtpVerified = false;

const steps = [
  document.getElementById("step-1"),
  document.getElementById("step-2"),
  document.getElementById("step-3"),
  document.getElementById("step-4")
];
const stepDots = document.querySelectorAll(".step-dot");

function showStep(stepNumber) {
  steps.forEach((panel, idx) => {
    panel.classList.toggle("active", idx === stepNumber - 1);
  });
  stepDots.forEach((dot, idx) => {
    dot.classList.toggle("active", idx < stepNumber);
  });
}

function generateRandomOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function sendOtpToEmail(emailAddress, isResend) {
  latestOtp = generateRandomOtp();
  isOtpVerified = false;

  const sendBtn = document.getElementById("send-otp-btn");
  const resendToast = document.getElementById("resend-toast");

  if (EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending OTP...";

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: emailAddress,
      from_email: SENDER_EMAIL,
      otp: latestOtp
    })
      .then(() => {
        sendBtn.disabled = false;
        sendBtn.textContent = "Send OTP";

        if (isResend) {
          resendToast.classList.add("visible");
        } else {
          document.getElementById("user-email-display").textContent = emailAddress;
          resendToast.classList.remove("visible");
          showStep(2);
        }
      })
      .catch((error) => {
        sendBtn.disabled = false;
        sendBtn.textContent = "Send OTP";
        document.getElementById("email-error").textContent =
          "Could not send OTP: " + (error.text || "Please check your connection.");
        console.error("EmailJS Error:", error);
      });
  } else {
    alert(`DEMO MODE\nTo: ${emailAddress}\nYour OTP is: ${latestOtp}`);
    if (isResend) {
      resendToast.classList.add("visible");
    } else {
      document.getElementById("user-email-display").textContent = emailAddress;
      resendToast.classList.remove("visible");
      showStep(2);
    }
  }
}

// STEP 1: Submit Email
document.getElementById("email-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const emailInput = document.getElementById("email-input");
  const emailError = document.getElementById("email-error");
  const enteredEmail = emailInput.value.trim();

  if (!enteredEmail || !enteredEmail.includes("@")) {
    emailInput.classList.add("is-invalid");
    emailError.textContent = "Please enter a valid email address.";
    return;
  }

  emailInput.classList.remove("is-invalid");
  emailError.textContent = "";
  userEmail = enteredEmail;
  document.getElementById("otp-input").value = "";
  document.getElementById("otp-error").textContent = "";

  sendOtpToEmail(userEmail, false);
});

// STEP 2: Resend OTP
document.getElementById("resend-otp-btn").addEventListener("click", () => {
  const otpInput = document.getElementById("otp-input");
  otpInput.value = "";
  otpInput.classList.remove("is-invalid");
  document.getElementById("otp-error").textContent = "";
  sendOtpToEmail(userEmail, true);
});

// STEP 2: Verify OTP
document.getElementById("otp-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const otpInput = document.getElementById("otp-input");
  const otpError = document.getElementById("otp-error");
  const enteredOtp = otpInput.value.trim();

  if (!enteredOtp) {
    otpInput.classList.add("is-invalid");
    otpError.textContent = "Please enter the 6-digit OTP.";
    return;
  }

  if (enteredOtp !== latestOtp) {
    otpInput.classList.add("is-invalid");
    otpError.textContent = "Incorrect OTP. Please try again or click Resend OTP.";
    return;
  }

  otpInput.classList.remove("is-invalid");
  otpError.textContent = "";
  isOtpVerified = true;
  showStep(3);
});

// Change Email
document.getElementById("change-email-btn").addEventListener("click", () => {
  latestOtp = "";
  isOtpVerified = false;
  showStep(1);
});

// STEP 3: Save New Password & Sync with localStorage mockUsers
document.getElementById("reset-password-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!isOtpVerified) {
    showStep(1);
    return;
  }

  const newPw = document.getElementById("new-password").value;
  const confirmPw = document.getElementById("confirm-password").value;
  const pwError = document.getElementById("password-error");

  if (newPw.length < 8) {
    pwError.textContent = "Password must be at least 8 characters long.";
    return;
  }

  if (newPw !== confirmPw) {
    pwError.textContent = "Passwords do not match.";
    return;
  }

  pwError.textContent = "";

  // Update password in mockUsers so login.html accepts the new password
  const users = JSON.parse(localStorage.getItem("mockUsers") || "[]");
  const idx = users.findIndex((u) => u.email.toLowerCase() === userEmail.toLowerCase());
  if (idx !== -1) {
    users[idx].password = newPw;
    localStorage.setItem("mockUsers", JSON.stringify(users));
  }
  localStorage.setItem("resetPassword_" + userEmail, newPw);

  showStep(4);
});

// Show / Hide Password
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  btn.textContent = isHidden ? "Hide" : "Show";
}

// STEP 4: Return to Login
document.getElementById("return-login-btn").addEventListener("click", () => {
  sessionStorage.setItem("prefillLoginEmail", userEmail);
  document.body.classList.add("fade-out");
  setTimeout(() => {
    window.location.href = "login.html";
  }, 400);
});

// Smooth transitions for local links
document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll('a[href]:not([target="_blank"]):not([href^="#"])');
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetUrl = link.href;
      document.body.classList.add("fade-out");
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 400);
    });
  });
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) document.body.classList.remove("fade-out");
});