import {
  isValidName,
  isValidEmail,
  isValidPassword,
  isConfirmPasswordValid,
  isValidPhone,
  isValidReferral,
} from "./Validation.js";

const signUpForm = document.getElementById("signUpForm");
const otpForm = document.getElementById("otpForm");
const resendBtn = document.getElementById("resendOtpBtn");
const timerText = document.getElementById("otpTimer");
const referralToggle = document.getElementById("referralToggle");
const referralField = document.getElementById("referralField");
const signupBtn = document.getElementById("signupBtn");

function* authFlow() {
  yield "signup";
  yield "otp";
}

const name = document.getElementById("signupName");
const email = document.getElementById("signupEmail");
const phone = document.getElementById("signupPhone");
const password = document.getElementById("signupPassword");
const confirmPassword = document.getElementById("confirmPassword");
const referralCode = document.getElementById("referralCode");

name.addEventListener("input", isValidName);
email.addEventListener("input", isValidEmail);
phone.addEventListener("input", isValidPhone);
password.addEventListener("input", isValidPassword);
confirmPassword.addEventListener("input", isConfirmPasswordValid);
referralCode.addEventListener("input", isValidReferral);

const flow = authFlow();

function nextStep() {
  return flow.next().value;
}

let currentStep = nextStep(); // start with signup
let registeredEmail = "";

// ================= SIGNUP =================
signUpForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (currentStep !== "signup") return;

  // 🛑 Prevent double click
  if (signupBtn.disabled) return;

  const valid =
    isValidName() &&
    isValidEmail() &&
    isValidPhone() &&
    isValidPassword() &&
    isConfirmPasswordValid() &&
    isValidReferral();

  if (!valid) {
    Swal.fire({
      icon: "warning",
      title: "Invalid Input",
      text: "Please fix the errors in the form before submitting.",
    });
    return;
  }

  signupBtn.disabled = true;
  signupBtn.classList.add("opacity-60", "cursor-not-allowed");
  signupBtn.textContent = "Processing...";

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const phone = document.getElementById("signupPhone").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const referralCode = document.getElementById("referralCode")?.value.trim();

  try {
    const response = await fetch("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone,
        password,
        confirmPassword,
        referral_by: referralCode,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      registeredEmail = email;

      Swal.fire({
        icon: "success",
        title: "OTP sent!",
        text: data.message, // ⚠ use text not message
        timer: 1500,
        showConfirmButton: false,
      });

      currentStep = nextStep();

      document.getElementById("signupSection").classList.add("hidden");
      otpForm.classList.remove("hidden");

      startOtpTimer();
    } else {
      signupBtn.disabled = false;
      signupBtn.classList.remove("opacity-60", "cursor-not-allowed");
      signupBtn.textContent = "Create Account";

      Swal.fire("Error", data.message, "error");
    }
  } catch (err) {
    signupBtn.disabled = false;
    signupBtn.classList.remove("opacity-60", "cursor-not-allowed");
    signupBtn.textContent = "Create Account";

    Swal.fire("Error", err.message, "error");
  }
});

// ================= OTP VERIFY =================
otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (currentStep !== "otp") return;

  const otp = document.getElementById("otpInput").value.trim();

  try {
    const response = await fetch("/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp, email: registeredEmail, purpose: "signup" }),
    });

    const data = await response.json();

    if (response.ok) {
      Swal.fire({
        icon: "success",
        title: "Account Verified!",
        message: data.message || "Your account has been created successfully.",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        window.location.href = "/auth/login";
      });
    } else {
      Swal.fire("Error", data.message, "error");
    }
  } catch (err) {
    Swal.fire("Error", err.message, "error");
  }
});

// ================= TIMER FUNCTION =================

let countdown;
let timeLeft = 50;

function startOtpTimer() {
  // 🔥 Clear previous interval if exists
  if (countdown) {
    clearInterval(countdown);
  }

  timeLeft = 50;

  resendBtn.disabled = true;
  resendBtn.classList.add("opacity-50", "cursor-not-allowed");

  timerText.classList.remove("hidden");
  resendBtn.classList.add("hidden");

  timerText.textContent = `Resend OTP in ${timeLeft}s`;

  countdown = setInterval(() => {
    timeLeft--;

    timerText.textContent = `Resend OTP in ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(countdown);

      timerText.classList.add("hidden");
      resendBtn.classList.remove("hidden");

      resendBtn.disabled = false;
      resendBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
  }, 1000);
}

// ================= RESEND OTP =================
resendBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  // 🛑 Prevent double click
  if (resendBtn.disabled) return;

  resendBtn.disabled = true;
  resendBtn.classList.add("opacity-50", "cursor-not-allowed");

  try {
    const response = await fetch("/auth/resend-otp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: registeredEmail }),
    });

    const data = await response.json();

    if (response.ok) {
      Swal.fire({
        icon: "success",
        title: "OTP resent!",
        text: data.message, // ⚠️ use text not message
        timer: 1500,
        showConfirmButton: false,
      });

      startOtpTimer(); // timer will re-enable later
    } else {
      resendBtn.disabled = false;
      resendBtn.classList.remove("opacity-50", "cursor-not-allowed");
      Swal.fire("Error", data.message, "error");
    }
  } catch (err) {
    resendBtn.disabled = false;
    resendBtn.classList.remove("opacity-50", "cursor-not-allowed");
    Swal.fire("Error", err.message, "error");
  }
});

// ================= REFERRAL TOGGLE =================
referralToggle.addEventListener("change", () => {
  if (referralToggle.checked) {
    referralField.classList.remove("hidden");
  } else {
    referralField.classList.add("hidden");
    document.getElementById("referralCode").value = "";
  }
});
