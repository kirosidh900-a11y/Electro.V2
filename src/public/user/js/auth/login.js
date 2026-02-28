const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberMeCheckbox = document.getElementById("rememberMe");
const submitBtn = document.getElementById("formSub");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

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
        rememberMe: rememberMeCheckbox.checked,
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
