import { createElement } from "../utils/dom.js";

export function showConfirmDialog({
  title = "Are you sure?",
  message = "Please confirm this action.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  onConfirm,
  onCancel
}) {
  const existing = document.getElementById("confirm-dialog-root");
  if (existing) {
    existing.remove();
  }

  const root = createElement("div", {
    id: "confirm-dialog-root",
    className: "confirm-dialog-root"
  });

  const overlay = createElement("div", {
    className: "confirm-dialog-overlay"
  });

  const container = createElement("div", {
    className: "confirm-dialog-container"
  });

  const card = createElement("div", {
    className: "confirm-dialog-card"
  });

  const heading = createElement("h3", {
    className: "confirm-dialog-title",
    text: title
  });

  const body = createElement("p", {
    className: "confirm-dialog-message",
    text: message
  });

  const actions = createElement("div", {
    className: "confirm-dialog-actions"
  });

  const cancelBtn = createElement("button", {
    className: "secondary-btn",
    type: "button",
    text: cancelText
  });

  const confirmBtn = createElement("button", {
    className: danger ? "danger-btn" : "primary-btn",
    type: "button",
    text: confirmText
  });

  cancelBtn.addEventListener("click", () => {
    root.remove();
    if (typeof onCancel === "function") {
      onCancel();
    }
  });

  overlay.addEventListener("click", () => {
    root.remove();
    if (typeof onCancel === "function") {
      onCancel();
    }
  });

  confirmBtn.addEventListener("click", () => {
    root.remove();
    if (typeof onConfirm === "function") {
      onConfirm();
    }
  });

  actions.append(cancelBtn, confirmBtn);
  card.append(heading, body, actions);
  container.appendChild(card);
  root.append(overlay, container);
  document.body.appendChild(root);
}