const signupForm = document.getElementById("signupForm");
const fullnameInput = document.getElementById("fullname");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const termsInput = document.getElementById("terms");

const fullnameError = document.getElementById("fullnameError");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const confirmPasswordError = document.getElementById("confirmPasswordError");
const termsError = document.getElementById("termsError");
const formError = document.getElementById("formError");
document.getElementById('helpLink').addEventListener('click', function (e) {
  e.preventDefault();

  const name = document.getElementById('fullname').value.trim() || 'User';
  const email = document.getElementById('email').value.trim() || 'Not provided';

  const subject = encodeURIComponent('Signup Help Request - Urban Route Fleet');
  const body = encodeURIComponent(
    `Hi Urban Route Fleet Support,\n\n` +
    `Name: ${name}\n` +
    `Account Email: ${email}\n\n` +
    `Problem Description:\n[Please describe your issue here]`
  );

  window.location.href = `mailto:helpline.urbanroutefleet@gmail.com?subject=${subject}&body=${body}`;
});

// Use the EXACT same endpoint as login.js, or leave empty "" for localStorage testing
const MOCK_USERS_URL = "";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldError(input, errorEl, message) {
    if (message) {
        if (input) input.classList.add("invalid");
        errorEl.textContent = message;
    } else {
        if (input) input.classList.remove("invalid");
        errorEl.textContent = "";
    }
}

function showFormError(message) {
    if (message) {
        formError.textContent = message;
        formError.classList.add("visible");
    } else {
        formError.textContent = "";
        formError.classList.remove("visible");
    }
}

function getLocalUsers() {
    const existing = JSON.parse(localStorage.getItem("mockUsers") || "null");
    if (Array.isArray(existing) && existing.length > 0) {
        return existing;
    }
    const defaults = [{ fullname: "Test User", email: "test@example.com", password: "Password123" }];
    localStorage.setItem("mockUsers", JSON.stringify(defaults));
    return defaults;
}

function validateSignupForm() {
    let isValid = true;
    const fullname = fullnameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    showFormError("");

    if (!fullname) {
        setFieldError(fullnameInput, fullnameError, "Full name is required.");
        isValid = false;
    } else if (fullname.length < 2) {
        setFieldError(fullnameInput, fullnameError, "Enter at least 2 characters.");
        isValid = false;
    } else {
        setFieldError(fullnameInput, fullnameError, "");
    }

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

    if (!confirmPassword) {
        setFieldError(confirmPasswordInput, confirmPasswordError, "Please re-enter your password.");
        isValid = false;
    } else if (confirmPassword !== password) {
        setFieldError(confirmPasswordInput, confirmPasswordError, "Passwords do not match.");
        isValid = false;
    } else {
        setFieldError(confirmPasswordInput, confirmPasswordError, "");
    }

    if (!termsInput.checked) {
        setFieldError(null, termsError, "You must agree to the terms to create an account.");
        isValid = false;
    } else {
        setFieldError(null, termsError, "");
    }

    return isValid;
}

[
    [fullnameInput, fullnameError],
    [emailInput, emailError],
    [passwordInput, passwordError],
    [confirmPasswordInput, confirmPasswordError]
].forEach(([input, errorEl]) => {
    input.addEventListener("input", () => {
        if (input.classList.contains("invalid")) {
            setFieldError(input, errorEl, "");
        }
    });
});

termsInput.addEventListener("change", () => {
    if (termsInput.checked) {
        setFieldError(null, termsError, "");
    }
});

signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateSignupForm()) {
        return;
    }

    const newUser = {
        fullname: fullnameInput.value.trim(),
        email: emailInput.value.trim().toLowerCase(),
        password: passwordInput.value
    };

    const submitBtn = signupForm.querySelector(".submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    try {
        if (MOCK_USERS_URL && !MOCK_USERS_URL.includes("YOUR-PROJECT-ID")) {
            // 1. Check if email already exists
            const checkRes = await fetch(`${MOCK_USERS_URL}?email=${encodeURIComponent(newUser.email)}`);
            if (!checkRes.ok) throw new Error("Failed to check existing users");

            const existingData = await checkRes.json();
            const existingList = Array.isArray(existingData) ? existingData : (existingData.users || []);
            const duplicate = existingList.some(
                (u) => u.email && u.email.toLowerCase() === newUser.email
            );

            if (duplicate) {
                setFieldError(emailInput, emailError, "An account with this email already exists.");
                return;
            }

            // 2. Create user via POST
            const createRes = await fetch(MOCK_USERS_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newUser)
            });

            if (!createRes.ok) {
                throw new Error("Failed to create account on mock server");
            }
        } else {
            // Local mock backend fallback
            const users = getLocalUsers();
            const duplicate = users.some((u) => u.email.toLowerCase() === newUser.email);

            if (duplicate) {
                setFieldError(emailInput, emailError, "An account with this email already exists.");
                return;
            }

            users.push(newUser);
            localStorage.setItem("mockUsers", JSON.stringify(users));
        }

        // Pre-fill email on login page and redirect
        sessionStorage.setItem("prefillLoginEmail", newUser.email);
        alert("Account created! Redirecting to sign in...");
        window.location.href = "login.html";
    } catch (err) {
        console.error("Signup error:", err);
        showFormError("Could not create account right now. Check your mock endpoint or Console (F12).");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
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
