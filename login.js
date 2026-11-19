const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberInput = document.getElementById("remember");

const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const formError = document.getElementById("formError");

// Leave empty to use local mock users, OR set to your real MockAPI URL:
// e.g. "https://65f1a2b3c4d5e6f789012345.mockapi.io/api/v1/users"
const MOCK_USERS_URL = "";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Seed a default local test account if none exists
function getLocalUsers() {
    const existing = JSON.parse(localStorage.getItem("mockUsers") || "null");
    if (Array.isArray(existing) && existing.length > 0) {
        return existing;
    }
    const defaultUsers = [
        { email: "test@example.com", password: "Password123" }
    ];
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
    if (message) {
        formError.textContent = message;
        formError.classList.add("visible");
    } else {
        formError.textContent = "";
        formError.classList.remove("visible");
    }
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
        setFieldError(emailInput, emailError, "Enter a valid email address (e.g., name@example.com).");
        isValid = false;
    } else {
        setFieldError(emailInput, emailError, "");
    }

    if (!password) {
        setFieldError(passwordInput, passwordError, "Password is required.");
        isValid = false;
    } else if (password.length < 8) {
        setFieldError(passwordInput, passwordError, "Password must be at least 8 characters long.");
        isValid = false;
    } else {
        setFieldError(passwordInput, passwordError, "");
    }

    return isValid;
}

emailInput.addEventListener("input", () => {
    if (emailInput.classList.contains("invalid")) {
        setFieldError(emailInput, emailError, "");
    }
});

passwordInput.addEventListener("input", () => {
    if (passwordInput.classList.contains("invalid")) {
        setFieldError(passwordInput, passwordError, "");
    }
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateForm()) {
        return;
    }

    const payload = {
        email: emailInput.value.trim(),
        password: passwordInput.value,
        remember: rememberInput.checked
    };

    const submitBtn = form.querySelector(".submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in...";

    try {
        let matchedUser = null;

        if (MOCK_USERS_URL && !MOCK_USERS_URL.includes("YOUR-PROJECT-ID")) {
            const url = `${MOCK_USERS_URL}?email=${encodeURIComponent(payload.email)}`;
            const response = await fetch(url, { method: "GET" });
            const data = await response.json().catch(() => ([]));

            if (!response.ok) {
                showFormError(data.message || `Server error (${response.status}).`);
                return;
            }

            const list = Array.isArray(data) ? data : (data.users || []);
            matchedUser = list.find(
                (u) =>
                    u.email &&
                    u.email.toLowerCase() === payload.email.toLowerCase() &&
                    u.password === payload.password
            );
        } else {
            // Local mock backend fallback using localStorage
            const users = getLocalUsers();
            matchedUser = users.find(
                (u) =>
                    u.email.toLowerCase() === payload.email.toLowerCase() &&
                    u.password === payload.password
            );
        }

        if (!matchedUser) {
            showFormError("Invalid email or password. (Local test user: test@example.com / Password123)");
            passwordInput.classList.add("invalid");
            return;
        }

        if (payload.remember) {
            localStorage.setItem("loggedInUser", JSON.stringify({ email: matchedUser.email }));
        }

        alert(`Login successful! Welcome, ${matchedUser.email}`);
        // window.location.href = "dashboard.html";
    } catch (err) {
        console.error("Login error:", err);
        showFormError("Unable to reach the login server. Check Console (F12) for details.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign in";
    }
});