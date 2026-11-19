        // ======================================================
        // EMAILJS SETUP (Apne EmailJS account se ye 3 IDs daalo)
        // ======================================================
        const EMAILJS_PUBLIC_KEY  = "lChGmkQ1pT21hu5h3";
        const EMAILJS_SERVICE_ID  = "service_rmrfgka";
        const EMAILJS_TEMPLATE_ID = "template_ghbppsd";
        const SENDER_EMAIL        = "helpline.urbanroutefleet@gmail.com";

        // EmailJS initialize karo (agar key set ki hai)
        if (EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
            emailjs.init(EMAILJS_PUBLIC_KEY);
        }

        // Variables to store current state
        let userEmail = "";
        let latestOtp = "";
        let isOtpVerified = false;

        // Steps
        const step1 = document.getElementById("step-1");
        const step2 = document.getElementById("step-2");
        const step3 = document.getElementById("step-3");
        const step4 = document.getElementById("step-4");

        // Helper: Step change karne ka simple function
        function showStep(stepToShow) {
            step1.classList.remove("active");
            step2.classList.remove("active");
            step3.classList.remove("active");
            step4.classList.remove("active");
            stepToShow.classList.add("active");
        }

        // Helper: 6-digit random OTP generate karna
        function generateRandomOtp() {
            return Math.floor(100000 + Math.random() * 900000).toString();
        }

        // Helper: Email pe OTP bhejna (Sirf Send OTP ya Resend OTP click pe call hoga)
        function sendOtpToEmail(emailAddress, isResend) {
            latestOtp = generateRandomOtp(); // Hamesha naya random OTP banega
            isOtpVerified = false;

            const sendBtn = document.getElementById("send-otp-btn");
            const resendToast = document.getElementById("resend-toast");

            // Agar EmailJS keys set hain toh real email bhejo
            if (EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
                sendBtn.disabled = true;
                sendBtn.textContent = "Sending OTP...";

                const templateParams = {
                    to_email: emailAddress,
                    from_email: SENDER_EMAIL,
                    otp: latestOtp
                };

                emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
                    .then(function () {
                        sendBtn.disabled = false;
                        sendBtn.textContent = "Send OTP";

                        if (isResend) {
                            resendToast.classList.add("visible");
                            alert("New OTP has been sent to " + emailAddress);
                        } else {
                            document.getElementById("user-email-display").textContent = emailAddress;
                            resendToast.classList.remove("visible");
                            showStep(step2);
                        }
                    })
                    .catch(function (error) {
                        sendBtn.disabled = false;
                        sendBtn.textContent = "Send OTP";
                        alert("Failed to send OTP. Please check your EmailJS setup.");
                        console.error("EmailJS Error:", error);
                    });
            } else {
                // Demo Mode (Jab tak EmailJS keys nahi daali hain, testing ke liye)
                alert(
                    "DEMO MODE (EmailJS keys abhi set nahi hain)\n\n" +
                    "From: " + SENDER_EMAIL + "\n" +
                    "To: " + emailAddress + "\n" +
                    "Your OTP is: " + latestOtp
                );

                if (isResend) {
                    resendToast.classList.add("visible");
                } else {
                    document.getElementById("user-email-display").textContent = emailAddress;
                    resendToast.classList.remove("visible");
                    showStep(step2);
                }
            }
        }

        // STEP 1: Email Submit -> Send OTP
        document.getElementById("email-form").addEventListener("submit", function (e) {
            e.preventDefault();

            const emailInput = document.getElementById("email-input");
            const emailError = document.getElementById("email-error");
            const enteredEmail = emailInput.value.trim();

            if (enteredEmail === "" || !enteredEmail.includes("@")) {
                emailInput.classList.add("is-invalid");
                emailError.textContent = "Please enter a valid email address.";
                return;
            }

            emailInput.classList.remove("is-invalid");
            emailError.textContent = "";

            userEmail = enteredEmail;
            document.getElementById("otp-input").value = "";
            document.getElementById("otp-error").textContent = "";

            // OTP generate karo aur send karo
            sendOtpToEmail(userEmail, false);
        });

        // STEP 2: Resend OTP Button
        document.getElementById("resend-otp-btn").addEventListener("click", function () {
            document.getElementById("otp-input").value = "";
            document.getElementById("otp-error").textContent = "";
            document.getElementById("otp-input").classList.remove("is-invalid");

            // Dobara naya random OTP generate karke bhejo
            sendOtpToEmail(userEmail, true);
        });

        // STEP 2: Verify OTP
        document.getElementById("otp-form").addEventListener("submit", function (e) {
            e.preventDefault();

            const otpInput = document.getElementById("otp-input");
            const otpError = document.getElementById("otp-error");
            const enteredOtp = otpInput.value.trim();

            // Check 1: Kya OTP enter hui hai?
            if (enteredOtp === "") {
                otpInput.classList.add("is-invalid");
                otpError.textContent = "Please enter the OTP first.";
                alert("Please enter the OTP!");
                return;
            }

            // Check 2: Kya entered OTP aur latest generated OTP same hain?
            if (enteredOtp !== latestOtp) {
                otpInput.classList.add("is-invalid");
                otpError.textContent = "Wrong OTP! Please try again or click Resend OTP.";
                alert("Wrong OTP! Please check again or click Resend OTP.");
                return;
            }

            // OTP Match ho gaya -> Ab proceed karne do Step 3 pe
            otpInput.classList.remove("is-invalid");
            otpError.textContent = "";
            isOtpVerified = true;

            alert("OTP Verified Successfully!");
            showStep(step3);
        });

        // Change Email Button (Step 2 se wapas Step 1)
        document.getElementById("change-email-btn").addEventListener("click", function () {
            latestOtp = "";
            isOtpVerified = false;
            showStep(step1);
        });

        // STEP 3: Create New Password
        document.getElementById("reset-password-form").addEventListener("submit", function (e) {
            e.preventDefault();

            // Extra safety check: Bina OTP verify hue password change na ho
            if (!isOtpVerified) {
                alert("Please verify your OTP first.");
                showStep(step1);
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

            // Demo storage (tum isse baad mein apne login/backend se connect kar sakti ho)
            localStorage.setItem("resetPassword_" + userEmail, newPw);

            showStep(step4);
        });

        // Show / Hide Password function
        function togglePassword(inputId, btn) {
            const input = document.getElementById(inputId);
            if (input.type === "password") {
                input.type = "text";
                btn.textContent = "Hide";
            } else {
                input.type = "password";
                btn.textContent = "Show";
            }
        }

        // Back to Login Button (Step 4)
        document.getElementById("return-login-btn").addEventListener("click", function () {
            // Agar tumhare paas login.html hai toh niche wali line uncomment kar dena:
            // window.location.href = "login.html";

            // Abhi ke liye reset karke Step 1 pe le aata hai:
            document.getElementById("email-form").reset();
            document.getElementById("otp-form").reset();
            document.getElementById("reset-password-form").reset();
            latestOtp = "";
            isOtpVerified = false;
            showStep(step1);
        });