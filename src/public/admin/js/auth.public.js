import { showToast } from "../../partials/errorMsg.utils.js";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const isValidEmail = () => {
  const input = document.getElementById("email");
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

const isValidPassword = () => {
  const input = document.getElementById("password");
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

emailInput.addEventListener("input", isValidEmail);
passwordInput.addEventListener("input", isValidPassword);

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const valid = isValidEmail() && isValidPassword();

  if (!valid) {
    showToast("Please correct the errors in the form.", "warning");
    return;
  }

  try {
    const response = await fetch("/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      showToast(data?.message || "Welcome Admin!", "success");

      setTimeout(() => {
        window.location.href = "/admin/dashboard";
      }, 1000);
    } else {
      showToast(data?.message || "Invalid credentials", "error");
      return;
    }
  } catch (error) {
    console.log("loginForm Error:", error);
    showToast("Something went wrong. Please try again.", "error");
    return;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("password");
  const togglePassword = document.getElementById("togglePassword");
  const toggleIcon = document.getElementById("toggleIcon");

  if (togglePassword) {
    togglePassword.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";

      passwordInput.type = isHidden ? "text" : "password";

      toggleIcon.classList.toggle("fa-eye");
      toggleIcon.classList.toggle("fa-eye-slash");
    });
  }
});
