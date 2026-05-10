import { createNavbar } from "../components/navbar.js";
import { LiveStreamBroadcaster } from "../components/liveStreamBroadcaster.js";
import { registerViewCleanup } from "../router.js";
import { clearElement, createElement } from "../utils/dom.js";

export function renderLiveStreamBroadcaster(app, currentUser) {
  clearElement(app);

  const shell = createElement("section", { className: "feed-shell" });
  const navbar = createNavbar(currentUser, "livestream-broadcast");
  const main = createElement("main", {
    className: "profile-main live-main"
  });
  const broadcaster = new LiveStreamBroadcaster(currentUser);

  main.appendChild(broadcaster.initialize());
  shell.append(navbar, main);
  app.appendChild(shell);

  registerViewCleanup(() => broadcaster.destroy());
}
