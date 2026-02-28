const signUpForm = document.getElementById("signUpForm");
const otpForm = document.getElementById("otpForm");
const resendBtn = document.getElementById("resendOtpBtn");
const timerText = document.getElementById("otpTimer");
const referralToggle = document.getElementById("referralToggle");
const referralField = document.getElementById("referralField");

function* authFlow() {
  yield "signup";
  yield "otp";
}

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

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const phone = document.getElementById("signupPhone").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const referralCode = document.getElementById("referralCode")?.value.trim();
  console.log({ referralCode });
  // if (password !== confirmPassword) {
  //   Swal.fire("Error", "Passwords do not match", "error");
  //   return;
  // }

  try {
    const response = await fetch("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password, confirmPassword , referral_by:referralCode}),
    });

    const data = await response.json();

    if (response.ok) {
      registeredEmail = email; // store for OTP step

      Swal.fire({
        icon: "success",
        title: "OTP sent!",
        message: data.message,
        timer: 1500,
        showConfirmButton: false,
      });

      // Move to OTP step
      currentStep = nextStep();

      // Hide signup
      signUpForm.classList.add("hidden");

      // Show OTP
      otpForm.classList.remove("hidden");
      startOtpTimer();
    } else {
      Swal.fire("Error", data.message, "error");
    }
  } catch (err) {
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

let countdown;
let timeLeft = 50;

// ================= TIMER FUNCTION =================

function startOtpTimer() {
  timeLeft = 10;
  resendBtn.classList.add("hidden");
  timerText.classList.remove("hidden");

  timerText.textContent = `Resend OTP in ${timeLeft}s`;

  countdown = setInterval(() => {
    timeLeft--;

    timerText.textContent = `Resend OTP in ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(countdown);

      timerText.classList.add("hidden");
      resendBtn.classList.remove("hidden");
    }
  }, 1000);
}

// ================= RESEND OTP =================
resendBtn.addEventListener("click", async () => {
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
        message: data.message,
        timer: 1500,
        showConfirmButton: false,
      });
      startOtpTimer();
    } else {
      Swal.fire("Error", data.message, "error");
    }
  } catch (err) {
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
