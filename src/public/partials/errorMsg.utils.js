/* global Toastify */

export function showToast(msg, type = "error") {
  const config = {
    success: { 
      border: "#22c55e", 
      bg: "rgba(34, 197, 94, 0.15)", 
      iconColor: "#22c55e", 
      icon: "check_circle",
      position: "right" 
    },
    error: { 
      border: "#ef4444", 
      bg: "rgba(239, 68, 68, 0.15)", 
      iconColor: "#ef4444", 
      icon: "error_outline",
      position: "center" 
    },
    warning: { 
      border: "#f59e0b", 
      bg: "rgba(245, 158, 11, 0.15)", 
      iconColor: "#f59e0b", 
      icon: "warning",
      position: "center" 
    },
    info: { 
      border: "#3b82f6", 
      bg: "rgba(59, 130, 246, 0.15)", 
      iconColor: "#3b82f6", 
      icon: "info",
      position: "right" 
    },
  };

  const theme = config[type] || config.error;

  const div = document.createElement("div");
  div.style.display = "flex";
  div.style.alignItems = "center";
  div.style.gap = "12px";

  div.innerHTML = `
    <div style="
      background: ${theme.bg}; 
      border-radius: 50%; 
      width: 32px; height: 32px; 
      flex-shrink: 0; /* Prevents icon from squishing */
      display: flex; align-items: center; justify-content: center;
      border: 1px solid ${theme.border}44;
    ">
      <span class="material-icons" style="color: ${theme.iconColor}; font-size: 18px;">${theme.icon}</span>
    </div>
    <span style="color: #ffffff; font-weight: 500; letter-spacing: 0.3px;">${msg}</span>
  `;

  Toastify({
    node: div,
    duration: 4000,
    gravity: "top",
    position: theme.position, // Dynamically sets center or right
    stopOnFocus: true,
    close: false,
    style: {
      background: "#121212",
      border: `1px solid ${theme.border}`,
      borderRadius: "16px",
      padding: "10px 20px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      minWidth: "fit-content"
    },
  }).showToast();
}