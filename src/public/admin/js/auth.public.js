const loginForm = document.getElementById("loginForm");
const swalDark = {
  background: "#1a1a1a",
  color: "#ffffff",
  confirmButtonColor: "#fa5252",
};

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    return Swal.fire({
      ...swalDark,
      icon: "warning",
      title: "Missing Fields",
      text: "Please enter email and password",
      confirmButtonColor: "#3085d6",
    });
  }

  try {
    const response = await fetch("/admin/login", {
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
