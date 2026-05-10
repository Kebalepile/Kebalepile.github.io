import { createNavbar } from "../components/navbar.js";
import { LiveStreamsDiscovery } from "../components/liveStreamsDiscovery.js";
import { registerViewCleanup } from "../router.js";
import { clearElement, createElement } from "../utils/dom.js";

export async function renderLiveStreamsDiscovery(app, currentUser) {
  clearElement(app);

  const shell = createElement("section", { className: "feed-shell" });
  const navbar = createNavbar(currentUser, "livestream-discover");
  const main = createElement("main", {
    className: "profile-main live-main"
  });
  const discovery = new LiveStreamsDiscovery(currentUser);

  main.appendChild(await discovery.initialize());
  shell.append(navbar, main);
  app.appendChild(shell);

  registerViewCleanup(() => discovery.destroy());
}
