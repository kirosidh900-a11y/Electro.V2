const logoutBtn = document.getElementById("logout");

logoutBtn?.addEventListener("click", async (e) => {
  e.preventDefault();

  const result = await Swal.fire({
    title: "Are you sure you want to logout?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, logout",
    cancelButtonText: "No, stay logged in",
    cancelButtonColor: "#3085d6",
    confirmButtonColor: "#d33",
  });

  if (!result.isConfirmed) return;

  try {
    const response = await fetch("/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) throw new Error("Logout failed");

    window.location.href = "/";
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Logout error",
      text: error.message,
    });
  }
});
