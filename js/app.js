import { initRouter } from "./router.js";
import "./dev/resetApp.js";
import { bindInstallPrompt } from "./utils/pwaInstall.js";
import { bindProtectedMediaGuards } from "./utils/protectedMedia.js";
import { createBrandMark } from "./components/brandMark.js";
import { clearElement, createElement } from "./utils/dom.js";
import { ensureApiRuntimeConfiguration } from "./services/apiClient.js";

function renderRuntimeConfigurationError(error) {
  const app = document.getElementById("app");

  if (!app) {
    return;
  }

  clearElement(app);

  const shell = createElement("section", { className: "auth-shell auth-shell-login" });
  const layout = createElement("div", { className: "auth-layout auth-layout-login" });
  const pane = createElement("section", { className: "auth-pane auth-pane-login" });
  const card = createElement("div", { className: "auth-card auth-card-login" });
  const header = createElement("div", { className: "auth-card-copy auth-card-copy-login" });
  const eyebrow = createElement("p", {
    className: "section-eyebrow",
    text: "App configuration required"
  });
  const title = createElement("h1", {
    className: "auth-title",
    text: "Set the API base URL for this deployment"
  });
  const subtitle = createElement("p", {
    className: "auth-subtitle",
    text:
      error?.message ||
      "The frontend does not know which API to call for this deployment yet."
  });
  const hint = createElement("p", {
    className: "auth-subtitle",
    text:
      "Update runtime-config.js so BOITEKONG_PULSE_CONFIG.API_BASE_URL points to your deployed API, for example https://your-api.onrender.com/api."
  });
  const reloadButton = createElement("button", {
    className: "secondary-btn auth-outline-btn",
    text: "Reload app",
    type: "button"
  });

  reloadButton.addEventListener("click", () => {
    window.location.reload();
  });

  header.append(eyebrow, title, subtitle, hint);
  card.append(createBrandMark(), header, reloadButton);
  pane.appendChild(card);
  layout.appendChild(pane);
  shell.appendChild(layout);
  app.appendChild(shell);
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    ensureApiRuntimeConfiguration();
  } catch (error) {
    console.error("yahneh runtime configuration error.", error);
    renderRuntimeConfigurationError(error);
    return;
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }

  bindInstallPrompt();
  bindProtectedMediaGuards();
  void initRouter();
});
