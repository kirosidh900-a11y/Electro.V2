const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const swalDark = {
  background: "#1a1a1a",
  color: "#ffffff",
  confirmButtonColor: "#fa5252",
};

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
    Swal.fire({
      ...swalDark,
      icon: "error",
      title: "Invalid Input",
      text: "Please correct the errors in the form.",
    });
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
      await Swal.fire({
        ...swalDark,
        icon: "success",
        title: "Login Successful",
        text: data.message || "Welcome Admin!",
        timer: 1500,
        showConfirmButton: false,
      });

      window.location.href = "/admin/dashboard";
    } else {
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Login Failed",
        text: data.message || "Invalid credentials",
        confirmButtonColor: "#d33",
      });
    }
  } catch (error) {
    Swal.fire({
      ...swalDark,
      icon: "error",
      title: "Server Error",
      text: "Something went wrong. Please try again.",
      confirmButtonColor: "#d33",
    });
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