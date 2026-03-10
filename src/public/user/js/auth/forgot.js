import { showToast } from "../../../partials/errorMsg.utils.js";

function* formFlowGenerator() {
  yield 2; // advance to OTP step
  return 3; // advance to reset-password step
}

const flow = formFlowGenerator();

let storedEmail = null;

function loadBtn(btn, text) {
  const original = btn.innerHTML;
  btn.innerHTML = `<i class="fas fa-circle-notch fa-spin mr-2"></i>${text}`;
  btn.disabled = true;
  return () => {
    btn.innerHTML = original;
    btn.disabled = false;
  };
}

function switchStep(from, to) {
  const fromEl = document.getElementById(`step-${from}`);
  const toEl = document.getElementById(`step-${to}`);
  if (!fromEl || !toEl) return;

  fromEl.classList.add("opacity-0", "pointer-events-none");

  setTimeout(() => {
    toEl.classList.remove("opacity-0", "pointer-events-none");
  }, 300);
}

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

// PASSWORD VALIDATION (Step 3)
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

// OTP COUNTDOWN TIMER
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

// ALL LOGIC INSIDE DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  const form1 = document.getElementById("form-step-1");
  const form2 = document.getElementById("form-step-2");
  const form3 = document.getElementById("form-step-3");
  const resendBtn = document.getElementById("resend-btn");
  const pwdInput = document.getElementById("password");
  const cwdInput = document.getElementById("cPassword");
  const otpInput = document.getElementById("otp");

  // Live validation on password field
  pwdInput?.addEventListener("input", isValidPassword);
  cwdInput?.addEventListener("input", isConfirmPasswordValid);
  otpInput.addEventListener("input", () => {
    otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
  });

  // STEP 1 — Send OTP
  form1?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();

    if (!email) {
      showToast("Please enter your email.", "warning");
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
        storedEmail = email; //store safely in JS memory

        showToast(data?.message || "Check your email for the code.", "success");

        setTimeout(() => {
          // Advance generator → step 2
          const next = flow.next(); // { value: 2, done: false }
          if (!next.done && next.value === 2) {
            switchStep(1, 2);
            startTimer(50); // ✅ timer starts ONLY after success here
          }
        }, 2000);
      } else {
        restore();
        showToast(
          data?.message || "Email not found or an error occurred.",
          "error",
        );
      }
    } catch (err) {
      restore();

      showToast(err?.message || "Could not connect to server.", "error");
      console.error("[ForgotPassword] Step 1:", err);
    }
  });

  // STEP 2 — Verify OTP
  form2?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const otp = document.getElementById("otp").value.trim();
    if (!otp) {
      showToast("Enter the OTP sent to your email.", "warning");
      return;
    }

    if (!storedEmail) {
      showToast("Session expired, Please restart the process.", "error");

      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 2000);
      return;
    }

    const btn = document.getElementById("btn-step-2");
    const restore = loadBtn(btn, "Verifying...");

    try {
      const res = await fetch("/auth/verifyFog-otp", {
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
        showToast(data?.message || "Identity confirmed.", "success");

        // Advance generator → step 3
        const next = flow.next();
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

        showToast(data?.message || "The Session has expired.", "error");
        return;
      }
    } catch (err) {
      restore();
      showToast(err?.message || "Could not connect to server.", "error");
      console.error("[ForgotPassword] Step 2:", err);
    }
  });

  // STEP 3 — Reset Password
  form3?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("cPassword").value;

    if (!storedEmail) {
      showToast("Session expired, Please restart the process.", "error");
      return;
    }

    // Client-side validation
    const valid = isValidPassword() && isConfirmPasswordValid();
    if (!valid) {
      showToast("Please Fix Errors.", "error");
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

        showToast(
          data?.message || "Your password has been reset successfully.",
          "success",
        );
        setTimeout(() => {
          window.location.replace("/auth/login");
        }, 2500);
      } else {
        restore();
        showToast(
          data?.message || "Something went wrong. Please try again.",
          "error",
        );
      }
    } catch (err) {
      restore();
      showToast(
        err?.message || "Network Error, Could not connect to server.",
        "error",
      );
      console.error("[ForgotPassword] Step 3:", err);
    }
  });

  // RESEND OTP
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
        showToast(
          data?.message || "OTP Sent!, A new code has been sent to your email.",
          "success",
        );

        startTimer(50); // restart countdown after resend
      } else {
        resendBtn.disabled = false;
        resendBtn.classList.remove("opacity-50", "cursor-not-allowed");

        showToast(
          data?.message ||
            "Resend Failed, Could not resend OTP. Please try again.",
          "error",
        );
      }
    } catch (err) {
      resendBtn.disabled = false;
      resendBtn.classList.remove("opacity-50", "cursor-not-allowed");

      showToast(
        err?.message ||
          "Network Error, Could not resend OTP. Please try again.",
        "error",
      );

      console.error("[ForgotPassword] Resend OTP:", err);
    }
  });
});

