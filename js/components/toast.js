let activeToastTimeout = null;

function normalizeMessage(message) {
  if (typeof message !== "string") {
    return "";
  }

  return message.trim();
}

function buildToastTitle(type, variant, explicitTitle) {
  const safeTitle = normalizeMessage(explicitTitle);

  if (safeTitle) {
    return safeTitle;
  }

  if (variant === "post-success") {
    return "Posted";
  }

  if (variant === "edited-success") {
    return "Edited";
  }

  if (variant === "updated-success") {
    return "Updated";
  }

  return "";
}

function createToastCard({
  message,
  type = "error",
  title = "",
  variant = ""
} = {}) {
  const toast = document.createElement("div");
  const safeType = type === "success" ? "success" : "error";
  toast.className = `toast toast-${safeType}`;

  if (variant) {
    toast.classList.add(`toast-variant-${variant}`);
  }

  const iconShell = document.createElement("div");
  iconShell.className = `toast-icon toast-icon-${safeType}`;
  iconShell.setAttribute("aria-hidden", "true");

  if (safeType === "success") {
    const check = document.createElement("span");
    check.className = "toast-icon-check";
    iconShell.appendChild(check);
  } else {
    const mark = document.createElement("span");
    mark.className = "toast-icon-mark";
    mark.textContent = "!";
    iconShell.appendChild(mark);
  }

  const copy = document.createElement("div");
  copy.className = "toast-copy";

  const safeTitle = buildToastTitle(safeType, variant, title);
  const safeMessage = normalizeMessage(message);

  if (safeTitle) {
    const titleNode = document.createElement("p");
    titleNode.className = "toast-title";
    titleNode.textContent = safeTitle;
    copy.appendChild(titleNode);
  }

  if (safeMessage && safeMessage.toLowerCase() !== safeTitle.toLowerCase()) {
    const messageNode = document.createElement("p");
    messageNode.className = "toast-message";
    messageNode.textContent = safeMessage;
    copy.appendChild(messageNode);
  }

  toast.append(iconShell, copy);
  return toast;
}

export function showToast(message, type = "error", options = {}) {
  const { variant = "", durationMs = 2500, title = "" } = options;
  const existing = document.getElementById("toast-root");
  if (existing) {
    existing.remove();
  }

  if (activeToastTimeout) {
    clearTimeout(activeToastTimeout);
    activeToastTimeout = null;
  }

  const root = document.createElement("div");
  root.id = "toast-root";

  const overlay = document.createElement("div");
  overlay.className = "toast-overlay toast-overlay-soft";

  const container = document.createElement("div");
  container.className = "toast-container";

  const toast = createToastCard({
    message,
    type,
    title,
    variant
  });

  container.appendChild(toast);
  root.appendChild(overlay);
  root.appendChild(container);
  document.body.appendChild(root);

  activeToastTimeout = setTimeout(() => {
    root.remove();
    activeToastTimeout = null;
  }, durationMs);
}
