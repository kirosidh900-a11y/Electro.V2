const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberMeCheckbox = document.getElementById("rememberMe");
const submitBtn = document.getElementById("formSub");

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

  const valid = isValidEmail() && isValidPassword();

  if (!valid) {
    Swal.fire({
      icon: "error",
      title: "Invalid Input",
      text: "Please correct the errors in the form.",
    });
    return;
  }

  // 🛑 Prevent double clic
  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in...";

  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: emailInput.value,
        password: passwordInput.value,
        rememberMe: rememberMeCheckbox.checked ? true : false,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      Swal.fire({
        icon: "success",
        title: "Login Successful",
        text: data.message,
      }).then(() => {
        window.location.href = data.redirectUrl;
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: data.message || "Invalid credentials.",
      });
    }
  } catch (error) {
    console.error("Error during login:", error);
    Swal.fire({
      icon: "error",
      title: "Login Failed",
      text: error.message || "An error occurred during login.",
    });
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Log In";
  }
});


const togglePassword = document.getElementById("togglePassword");

togglePassword.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";

  passwordInput.type = isPassword ? "text" : "password";

  togglePassword.classList.toggle("fa-eye");
  togglePassword.classList.toggle("fa-eye-slash");
});