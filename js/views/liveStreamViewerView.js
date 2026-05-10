import { createNavbar } from "../components/navbar.js";
import { LiveStreamViewer } from "../components/liveStreamViewer.js";
import { registerViewCleanup } from "../router.js";
import { clearElement, createElement } from "../utils/dom.js";

export async function renderLiveStreamViewer(app, currentUser, payload = null) {
  clearElement(app);

  const streamId = typeof payload?.streamId === "string" ? payload.streamId.trim() : "";
  const shell = createElement("section", { className: "feed-shell live-viewer-shell" });
  const navbar = createNavbar(currentUser, "livestream-viewer");
  const main = createElement("main", {
    className: "profile-main live-main"
  });

  if (!streamId) {
    main.appendChild(
      createElement("div", {
        className: "placeholder-card",
        text: "This live stream link is missing a stream id."
      })
    );
  } else {
    const viewer = new LiveStreamViewer(streamId);
    main.appendChild(await viewer.initialize());
    registerViewCleanup(() => viewer.destroy());
  }

  shell.append(navbar, main);
  app.appendChild(shell);
}
