import { createElement } from "../utils/dom.js";

const LOADING_OVERLAY_ROOT_ID = "app-loading-overlay-root";

function normalizeLabel(label) {
  if (typeof label !== "string") {
    return "Loading...";
  }

  const trimmedLabel = label.trim();
  return trimmedLabel || "Loading...";
}

export function showLoadingOverlay({ label = "Loading..." } = {}) {
  document.getElementById(LOADING_OVERLAY_ROOT_ID)?.remove();

  const root = createElement("div", {
    id: LOADING_OVERLAY_ROOT_ID,
    className: "app-loading-overlay-root"
  });
  const backdrop = createElement("div", {
    className: "app-loading-overlay-backdrop"
  });
  const container = createElement("div", {
    className: "app-loading-overlay-container"
  });
  const card = createElement("div", {
    className: "app-loading-overlay-card",
    attributes: {
      role: "status",
      "aria-live": "polite",
      "aria-busy": "true"
    }
  });
  const dots = createElement("div", {
    className: "app-loading-dots",
    attributes: {
      "aria-hidden": "true"
    }
  });
  const labelNode = createElement("p", {
    className: "app-loading-label",
    text: normalizeLabel(label)
  });

  for (let index = 0; index < 3; index += 1) {
    dots.appendChild(
      createElement("span", {
        className: "app-loading-dot"
      })
    );
  }

  card.append(dots, labelNode);
  container.appendChild(card);
  root.append(backdrop, container);
  document.body.appendChild(root);

  return {
    close() {
      if (root.isConnected) {
        root.remove();
      }
    },
    update(nextLabel) {
      labelNode.textContent = normalizeLabel(nextLabel);
    }
  };
}
