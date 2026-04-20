/* global Toastify */

// SVG icons — no font dependency, always render instantly
const ICONS = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  error:   `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
};

export function showToast(msg, type = "error") {
  const config = {
    success: { border: "#22c55e", bg: "rgba(34,197,94,0.15)",   color: "#22c55e", position: "right"  },
    error:   { border: "#ef4444", bg: "rgba(239,68,68,0.15)",   color: "#ef4444", position: "center" },
    warning: { border: "#f59e0b", bg: "rgba(245,158,11,0.15)",  color: "#f59e0b", position: "center" },
    info:    { border: "#3b82f6", bg: "rgba(59,130,246,0.15)",  color: "#3b82f6", position: "right"  },
  };

  const theme = config[type] || config.error;

  const div = document.createElement("div");
  div.style.cssText = "display:flex;align-items:center;gap:12px;";
  div.innerHTML = `
    <div style="background:${theme.bg};border-radius:50%;width:32px;height:32px;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
      border:1px solid ${theme.border}44;color:${theme.color};">
      ${ICONS[type] || ICONS.error}
    </div>
    <span style="color:#fff;font-weight:500;letter-spacing:0.3px;">${msg}</span>
  `;

  Toastify({
    node: div,
    duration: 4000,
    gravity: "top",
    position: theme.position,
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
      minWidth: "fit-content",
    },
  }).showToast();
}
