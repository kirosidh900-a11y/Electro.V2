// ==============================
// DARK SWEET ALERT CONFIG
// ==============================
const swalDark = {
  background: "#1a1a1a",
  color: "#ffffff",
  confirmButtonColor: "#fa5252",
};

// ==============================
// PASSWORD TOGGLE
// ==============================
function togglePassword(inputId, btnEl) {
  const input = document.getElementById(inputId);
  const icon = btnEl.querySelector("i");

  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    icon.classList.replace("fa-eye", "fa-eye-slash");
    icon.classList.add("text-[#fa5252]");
  } else {
    input.type = "password";
    icon.classList.replace("fa-eye-slash", "fa-eye");
    icon.classList.remove("text-[#fa5252]");
  }
}

// Make global for button usage
window.togglePassword = togglePassword;

// ==============================
// GENERATOR FLOW
// ==============================
function* formFlowGenerator() {
  yield 1;
  yield 2;
  return 3;
}

const flow = formFlowGenerator();
flow.next();

// ==============================
// BUTTON LOADING HELPER
// ==============================
function loadBtn(btn, text) {
  const original = btn.innerHTML;
  btn.innerHTML = `<i class="fas fa-circle-notch fa-spin mr-2"></i>${text}`;
  btn.disabled = true;

  return () => {
    btn.innerHTML = original;
    btn.disabled = false;
  };
}

// ==============================
// SWITCH STEP
// ==============================
function switchStep(from, to) {
  const fromEl = document.getElementById(`step-${from}`);
  const toEl = document.getElementById(`step-${to}`);

  if (!fromEl || !toEl) return;

  fromEl.classList.add("opacity-0", "pointer-events-none");

  setTimeout(() => {
    toEl.classList.remove("opacity-0", "pointer-events-none");
  }, 300);
}

// ==============================
// STEP 1 - SEND OTP
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  const form1 = document.getElementById("form-step-1");
  const form2 = document.getElementById("form-step-2");
  const form3 = document.getElementById("form-step-3");

  if (!form1) return;

  form1.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const btn = document.getElementById("btn-step-1");
    const restore = loadBtn(btn, "Sending OTP...");

    try {
      const res = await fetch("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          purpose: "forgot-password",
          isAdmin: false,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await Swal.fire({
          ...swalDark,
          icon: "success",
          title: "OTP Sent!",
          text: data.message || "Check your email for OTP.",
        });

        switchStep(1, 2);
      } else {
        restore();
        Swal.fire({
          ...swalDark,
          icon: "error",
          title: "Error",
          text: data.message || "Email not found.",
        });
      }
    } catch (err) {
      restore();
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Network Error",
        text: "Server unreachable.",
      });
    }
  });

  // ==============================
  // STEP 2 - VERIFY OTP
  // ==============================
  form2?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const otp = document.getElementById("otp").value.trim();
    const email = document.getElementById("email").value.trim();
    const btn = document.getElementById("btn-step-2");

    if (!otp) {
      Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Enter OTP",
      });
      return;
    }

    const restore = loadBtn(btn, "Verifying...");

    try {
      const res = await fetch("/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp}),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await Swal.fire({
          ...swalDark,
          icon: "success",
          title: "OTP Verified!",
        });

        switchStep(2, 3);
      } else {
        restore();
        Swal.fire({
          ...swalDark,
          icon: "error",
          title: "Invalid OTP",
        });
      }
    } catch (err) {
      restore();
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Network Error",
      });
    }
  });

  // ==============================
  // STEP 3 - RESET PASSWORD
  // ==============================
  form3?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const password = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const email = document.getElementById("email").value.trim();
    const btn = document.getElementById("btn-step-3");

    if (password.length < 8) {
      Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Weak Password",
      });
      return;
    }

    if (password !== confirmPassword) {
      Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Passwords Do Not Match",
      });
      return;
    }

    const restore = loadBtn(btn, "Updating...");

    try {
      const res = await fetch("/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await Swal.fire({
          ...swalDark,
          icon: "success",
          title: "Password Updated!",
        });

        window.location.href = "/login";
      } else {
        restore();
        Swal.fire({
          ...swalDark,
          icon: "error",
          title: "Update Failed",
        });
      }
    } catch (err) {
      restore();
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Network Error",
      });
    }
  });
});
