import { createElement } from "../utils/dom.js";
import { createAvatarElement } from "../utils/avatar.js";

export function showActionSheet({ title = "Options", actions = [] }) {
  const existing = document.getElementById("action-sheet-root");

  if (existing) {
    existing.remove();
  }

  const root = createElement("div", {
    id: "action-sheet-root",
    className: "action-sheet-root"
  });
  const overlay = createElement("div", {
    className: "action-sheet-overlay"
  });
  const container = createElement("div", {
    className: "action-sheet-container"
  });
  const sheet = createElement("div", {
    className: "action-sheet-card",
    attributes: {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": title
    }
  });
  const handle = createElement("span", {
    className: "action-sheet-handle",
    attributes: {
      "aria-hidden": "true"
    }
  });
  const heading = createElement("h3", {
    className: "action-sheet-title",
    text: title
  });
  const list = createElement("div", {
    className: "action-sheet-actions"
  });

  const closeSheet = () => {
    root.remove();
    document.removeEventListener("keydown", handleKeyDown);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      closeSheet();
    }
  };

  overlay.addEventListener("click", closeSheet);
  container.addEventListener("click", (event) => {
    if (event.target === container) {
      closeSheet();
    }
  });
  sheet.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  document.addEventListener("keydown", handleKeyDown);

  actions
    .filter((action) => action && typeof action.onSelect === "function")
    .forEach(({ label, onSelect, danger = false, iconName = "", avatarUser = null }) => {
      const button = createElement("button", {
        className: `action-sheet-btn${danger ? " action-sheet-btn-danger" : ""}`,
        type: "button"
      });
      const content = createElement("span", {
        className: "action-sheet-btn-content"
      });
      const leading = avatarUser
        ? createAvatarElement(avatarUser, {
            size: "sm",
            className: "action-sheet-avatar",
            decorative: true
          })
        : createActionSheetIcon(iconName || inferActionSheetIconName(label));
      const text = createElement("span", {
        className: "action-sheet-btn-text",
        text: label
      });

      content.append(leading, text);
      button.appendChild(content);

      button.addEventListener("click", async () => {
        closeSheet();
        await onSelect();
      });

      list.appendChild(button);
    });

  sheet.append(handle, heading, list);
  container.appendChild(sheet);
  root.append(overlay, container);
  document.body.appendChild(root);
}

function inferActionSheetIconName(label = "") {
  const normalized = String(label).trim().toLowerCase();

  if (normalized.includes("reply")) return "reply";
  if (normalized.includes("share")) return "share";
  if (normalized.includes("report")) return "report";
  if (normalized.includes("edit")) return "edit";
  if (normalized.includes("delete")) return "delete";
  if (normalized.includes("unblock")) return "unblock";
  if (normalized.includes("block")) return "block";
  if (normalized.includes("sign out") || normalized.includes("logout")) return "logout";
  if (normalized.includes("download")) return "download";
  if (normalized.includes("save")) return "save";

  return "more";
}

function createActionSheetIcon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("action-sheet-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "1.9");
  path.setAttribute("d", getActionSheetIconPath(name));
  svg.appendChild(path);

  return svg;
}

function getActionSheetIconPath(name) {
  const iconPaths = {
    reply: "M9 7 4 12l5 5M4.5 12H15a5 5 0 0 1 5 5",
    share: "m14 5-8 7 8 7M6 12h12",
    report: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
    edit: "m4 20 4.5-1 9.9-9.9a1.8 1.8 0 0 0 0-2.54l-.96-.96a1.8 1.8 0 0 0-2.54 0L5 15.5 4 20Zm8-12 4 4",
    delete: "M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13",
    block:
      "M15 14a4 4 0 1 0-6 0m6 0a6 6 0 0 1 2.5 1.8M9 14a6 6 0 0 0-2.5 1.8M4 4l16 16",
    unblock:
      "M15 14a4 4 0 1 0-6 0m6 0a6 6 0 0 1 2.5 1.8M9 14a6 6 0 0 0-2.5 1.8M4 4l16 16M17.5 6.5l-11 11",
    logout: "M14 16l4-4-4-4M8 12h10M10 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4",
    download: "M12 3v11m0 0 4-4m-4 4-4-4M5 21h14",
    save: "M6 3h11l4 4v14H3V3h3Zm0 0v6h8V3",
    more: "M12 6h.01M12 12h.01M12 18h.01"
  };

  return iconPaths[name] || iconPaths.more;
}
