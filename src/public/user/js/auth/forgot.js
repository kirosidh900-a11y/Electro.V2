

const swalDark = {
  background: "#1a1a1a",
  color: "#ffffff",
  confirmButtonColor: "#fa5252",
};

function* formFlowGenerator() {
  yield 2; // advance to OTP step
  return 3; // advance to reset-password step
}

const flow = formFlowGenerator();

// Email shared between all steps (never passed via URL)
let storedEmail = null;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Set button to loading state; returns a restore function */
function loadBtn(btn, text) {
  const original = btn.innerHTML;
  btn.innerHTML = `<i class="fas fa-circle-notch fa-spin mr-2"></i>${text}`;
  btn.disabled = true;
  return () => {
    btn.innerHTML = original;
    btn.disabled = false;
  };
}

/** Smooth opacity-based step transition */
function switchStep(from, to) {
  const fromEl = document.getElementById(`step-${from}`);
  const toEl = document.getElementById(`step-${to}`);
  if (!fromEl || !toEl) return;

  fromEl.classList.add("opacity-0", "pointer-events-none");

  setTimeout(() => {
    toEl.classList.remove("opacity-0", "pointer-events-none");
  }, 300);
}

/**
 * togglePassword — exposed globally from EJS inline script.
 * Re-export here as a safety net (non-module pages).
 */
window.togglePassword = function (id, el) {
  const input = document.getElementById(id);
  const icon = el.querySelector("i");
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    icon.classList.replace("fa-eye", "fa-eye-slash");
  } else {
    input.type = "password";
    icon.classList.replace("fa-eye-slash", "fa-eye");
  }
};

// ─────────────────────────────────────────────────────────────
// PASSWORD VALIDATION (Step 3)
// ─────────────────────────────────────────────────────────────
function isValidPassword() {
  const input = document.getElementById("password");
  const error = document.getElementById("passwordError");
  if (!input || !error) return true;

  const value = input.value.trim();
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!value) {
    error.textContent = "Password is required";
    error.classList.remove("hidden");
    return false;
  }
  if (!regex.test(value)) {
    error.textContent =
      "Min 8 chars with uppercase, lowercase, number & special char";
    error.classList.remove("hidden");
    return false;
  }
  error.classList.add("hidden");
  return true;
}

const isConfirmPasswordValid = () => {
  const input = document.getElementById("cPassword");
  const error = document.getElementById("cPasswordError");

  const password = document.getElementById("password").value;
  const confirmPassword = input.value;

  if (!confirmPassword) {
    error.textContent = "Confirm password required";
    error.classList.remove("hidden");
    return false;
  }

  if (password !== confirmPassword) {
    error.textContent = "Passwords do not match";
    error.classList.remove("hidden");
    return false;
  }

  error.classList.add("hidden");
  return true;
};
// ─────────────────────────────────────────────────────────────
// OTP COUNTDOWN TIMER
// ─────────────────────────────────────────────────────────────
let timerInterval = null;

function startTimer(seconds = 50) {
  // Grab elements fresh each call (step-2 may not have been in DOM on page load)
  const timerDisplay = document.getElementById("timer");
  const resendBtn = document.getElementById("resend-btn");
  const timerWrapper = document.getElementById("otp-timer-wrapper");

  if (!timerDisplay || !resendBtn || !timerWrapper) return;

  // Reset UI
  if (timerInterval) clearInterval(timerInterval);
  resendBtn.classList.add("hidden");
  timerWrapper.classList.remove("hidden");

  let timeLeft = seconds;
  timerDisplay.textContent = timeLeft;

  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerWrapper.classList.add("hidden");
      resendBtn.classList.remove("hidden");
      resendBtn.disabled = false;
      resendBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
  }, 1000);
}

// ─────────────────────────────────────────────────────────────
// ALL LOGIC INSIDE DOMContentLoaded
// ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const form1 = document.getElementById("form-step-1");
  const form2 = document.getElementById("form-step-2");
  const form3 = document.getElementById("form-step-3");
  const resendBtn = document.getElementById("resend-btn");
  const pwdInput = document.getElementById("password");
  const cwdInput = document.getElementById("cPassword");

  // Live validation on password field
  pwdInput?.addEventListener("input", isValidPassword);
  cwdInput?.addEventListener("input", isConfirmPasswordValid);

  // ══════════════════════════════════════════════════════════
  // STEP 1 — Send OTP
  // ══════════════════════════════════════════════════════════
  form1?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();

    if (!email) {
      Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Please enter your email.",
      });
      return;
    }

    const btn = document.getElementById("btn-step-1");
    const restore = loadBtn(btn, "Sending OTP...");

    try {
      const res = await fetch("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "forgot-password" }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        storedEmail = email; // ✅ store safely in JS memory — NOT the URL

        await Swal.fire({
          ...swalDark,
          icon: "success",
          title: "OTP Sent!",
          text: data.message || "Check your email for the code.",
          timer: 1500,
          showConfirmButton: false,
        });

        // Advance generator → step 2
        const next = flow.next(); // { value: 2, done: false }
        if (!next.done && next.value === 2) {
          switchStep(1, 2);
          startTimer(50); // ✅ timer starts ONLY after success here
        }
      } else {
        restore();
        Swal.fire({
          ...swalDark,
          icon: "error",
          title: "Failed",
          text: data.message || "Email not found or an error occurred.",
        });
      }
    } catch (err) {
      restore();
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Network Error",
        text: "Could not connect to server.",
      });
      console.error("[ForgotPassword] Step 1:", err);
    }
  });

  // ══════════════════════════════════════════════════════════
  // STEP 2 — Verify OTP
  // ══════════════════════════════════════════════════════════
  form2?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const otp = document.getElementById("otp").value.trim();

    if (!otp) {
      Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Enter the OTP sent to your email.",
      });
      return;
    }

    if (!storedEmail) {
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Session expired.",
        text: "Please restart the process.",
      });
      return;
    }

    const btn = document.getElementById("btn-step-2");
    const restore = loadBtn(btn, "Verifying...");

    try {
      const res = await fetch("/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: storedEmail,
          otp,
          purpose: "forgot-password",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await Swal.fire({
          ...swalDark,
          icon: "success",
          title: "OTP Verified!",
          text: data.message || "Identity confirmed.",
          timer: 1500,
          showConfirmButton: false,
        });

        // Advance generator → step 3 (done: true)
        const next = flow.next(); // { value: 3, done: true }
        if (next.done && next.value === 3) {
          switchStep(2, 3);
        }
      } else {
        restore();
        // Highlight OTP input on wrong code
        const otpEl = document.getElementById("otp");
        if (otpEl) {
          otpEl.style.borderColor = "#fa5252";
          otpEl.value = "";
          otpEl.focus();
          setTimeout(() => (otpEl.style.borderColor = ""), 2500);
        }
        Swal.fire({
          ...swalDark,
          icon: "error",
          title: "Invalid OTP",
          text: data.message || "The code is incorrect or has expired.",
        });
      }
    } catch (err) {
      restore();
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Network Error",
        text: "Could not connect to server.",
      });
      console.error("[ForgotPassword] Step 2:", err);
    }
  });

  // ══════════════════════════════════════════════════════════
  // STEP 3 — Reset Password
  // PATCH /auth/reset-password  →  { email, password, confirmPassword }
  // ══════════════════════════════════════════════════════════
  form3?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("cPassword").value;

    if (!storedEmail) {
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Session expired.",
        text: "Please restart the process.",
      });
      return;
    }

    // Client-side validation
    const valid = isValidPassword() && isConfirmPasswordValid();
    if (!valid) {
      Swal.fire({
        ...swalDark,
        icon: "info",
        title: "Invalid Try!",
        text: "Please Fix Error",
      });
      return;
    }

    const btn = document.getElementById("btn-step-3");
    const restore = loadBtn(btn, "Updating...");

    try {
      const res = await fetch("/auth/reset-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: storedEmail, password, confirmPassword }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        btn.innerHTML = '<i class="fas fa-check mr-2"></i>Updated!';
        btn.disabled = true;
        btn.style.background = "#22c55e";

        await Swal.fire({
          ...swalDark,
          icon: "success",
          title: "Password Updated!",
          text: data.message || "Your password has been reset successfully.",
          confirmButtonColor: "#22c55e",
          confirmButtonText: "Go to Login →",
          allowOutsideClick: false,
          allowEscapeKey: false,
        });

        window.location.replace("/auth/login");
      } else {
        restore();
        Swal.fire({
          ...swalDark,
          icon: "error",
          title: "Update Failed",
          text: data.message || "Something went wrong. Please try again.",
        });
      }
    } catch (err) {
      restore();
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Network Error",
        text: "Could not connect to server.",
      });
      console.error("[ForgotPassword] Step 3:", err);
    }
  });

  // ══════════════════════════════════════════════════════════
  // RESEND OTP
  // PATCH /auth/resend-otp  →  { email, purpose }
  // ══════════════════════════════════════════════════════════
  resendBtn?.addEventListener("click", async () => {
    const email = storedEmail || document.getElementById("email").value.trim();

    resendBtn.disabled = true;
    resendBtn.classList.add("opacity-50", "cursor-not-allowed");

    try {
      const res = await fetch("/auth/resend-otp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "forgot-password" }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await Swal.fire({
          ...swalDark,
          icon: "success",
          title: "OTP Sent!",
          text: "A new code has been sent to your email.",
          timer: 1500,
          showConfirmButton: false,
        });
        startTimer(50); // restart countdown after resend
      } else {
        resendBtn.disabled = false;
        resendBtn.classList.remove("opacity-50", "cursor-not-allowed");
        Swal.fire({
          ...swalDark,
          icon: "error",
          title: "Resend Failed",
          text: data.message || "Could not resend OTP. Please try again.",
        });
      }
    } catch (err) {
      resendBtn.disabled = false;
      resendBtn.classList.remove("opacity-50", "cursor-not-allowed");
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Network Error",
        text: "Could not connect to server.",
      });
      console.error("[ForgotPassword] Resend OTP:", err);
    }
  });
}); // end DOMContentLoaded
