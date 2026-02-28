// ==========================
// NAME VALIDATION
// ==========================
export const isValidName = () => {
  const input = document.getElementById("signupName");
  const error = document.getElementById("nameError");

  const name = input.value.trim();
  const regex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

  if (!name) {
    error.textContent = "Name is required";
    error.classList.remove("hidden");
    return false;
  }

  if (!regex.test(name)) {
    error.textContent =
      "Only letters and single spaces allowed";
    error.classList.remove("hidden");
    return false;
  }

  error.classList.add("hidden");
  return true;
};


// ==========================
// EMAIL VALIDATION
// ==========================
export const isValidEmail = () => {
  const input = document.getElementById("signupEmail");
  const error = document.getElementById("emailError");

  const email = input.value.trim().toLowerCase();
  const regex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

  if (!email) {
    error.textContent = "Email is required";
    error.classList.remove("hidden");
    return false;
  }

  if (!regex.test(email)) {
    error.textContent = "Invalid email format";
    error.classList.remove("hidden");
    return false;
  }

  error.classList.add("hidden");
  return true;
};


// ==========================
// PHONE VALIDATION
// ==========================
export const isValidPhone = () => {
  const input = document.getElementById("signupPhone");
  const error = document.getElementById("phoneError");

  const phone = input.value.trim();
  const regex = /^[6-9]\d{9}$/;

  if (!phone) {
    error.textContent = "Phone number is required";
    error.classList.remove("hidden");
    return false;
  }

  if (!regex.test(phone)) {
    error.textContent = "Invalid 10-digit Indian phone number";
    error.classList.remove("hidden");
    return false;
  }

  error.classList.add("hidden");
  return true;
};


// ==========================
// PASSWORD STRENGTH
// ==========================
export const isValidPassword = () => {
  const input = document.getElementById("signupPassword");
  const error = document.getElementById("passwordError");

  const password = input.value.trim();

  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!password) {
    error.textContent = "Password is required";
    error.classList.remove("hidden");
    return false;
  }

  if (!regex.test(password)) {
    error.textContent =
      "Min 8 chars with uppercase, lowercase, number & special char";
    error.classList.remove("hidden");
    return false;
  }

  error.classList.add("hidden");
  return true;
};


// ==========================
// CONFIRM PASSWORD
// ==========================
export const isConfirmPasswordValid = () => {
  const input = document.getElementById("confirmPassword");
  const error = document.getElementById("confirmPasswordError");

  const password = document.getElementById("signupPassword").value;
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


// ==========================
// REFERRAL (OPTIONAL)
// ==========================
export const isValidReferral = () => {
  const input = document.getElementById("referralCode");
  const error = document.getElementById("referralError");
  const toggle = document.getElementById("referralToggle");

  if (!toggle.checked) {
    error.classList.add("hidden");
    return true; // do not validate if toggle off
  }

  const value = input.value.trim().toUpperCase();

  if (!value) {
    error.textContent = "Referral code is required";
    error.classList.remove("hidden");
    return false;
  }

  const regex = /^ELECTRO[A-Z0-9]{6}$/;

  if (!regex.test(value)) {
    error.textContent = "Invalid referral format";
    error.classList.remove("hidden");
    return false;
  }

  error.classList.add("hidden");
  return true;
};