import { navigate } from "../router.js";
import { resolveApiAssetUrl } from "../services/apiClient.js";
import { liveStreamManager } from "../services/liveStreamService.js";
import { clearElement, createElement } from "../utils/dom.js";
import { createAvatarElement } from "../utils/avatar.js";
import { protectImageElement, protectMediaShell } from "../utils/protectedMedia.js";
import {
  createViewerCountElement,
  formatLiveDuration
} from "./liveStreamShared.js";
import { showToast } from "./toast.js";

export class LiveStreamsDiscovery {
  constructor(currentUser = null) {
    this.currentUser = currentUser;
    this.container = null;
    this.streams = [];
    this.goLiveButton = null;
    this.refreshTimerId = null;
  }

  async initialize() {
    this.container = createElement("section", { className: "live-discovery" });
    this.renderShell();
    await this.loadStreams();
    this.refreshTimerId = window.setInterval(() => {
      void this.loadStreams();
    }, 10000);
    return this.container;
  }

  renderShell() {
    const header = createElement("section", { className: "live-discovery-header" });
    const copy = createElement("div", { className: "live-discovery-copy" });
    const eyebrow = createElement("p", {
      className: "section-eyebrow",
      text: "Live now"
    });
    const title = createElement("h2", {
      className: "section-title",
      text: "Live streams"
    });
    const text = createElement("p", {
      className: "section-copy",
      text: "Watch active local broadcasts, join the chat, and react while the stream is live."
    });
    const actions = createElement("div", { className: "live-discovery-actions" });
    const goLiveButton = createElement("button", {
      className: "primary-btn live-go-live-btn",
      type: "button",
      text: "Go live"
    });
    const refreshButton = createElement("button", {
      className: "secondary-btn",
      type: "button",
      text: "Refresh"
    });
    const grid = createElement("div", {
      className: "live-stream-grid",
      id: "live-stream-grid"
    });

    this.goLiveButton = goLiveButton;
    goLiveButton.addEventListener("click", () => navigate("livestream-broadcast"));
    refreshButton.addEventListener("click", () => {
      void this.loadStreams();
    });

    copy.append(eyebrow, title, text);
    actions.append(goLiveButton, refreshButton);
    header.append(copy, actions);
    this.container.append(header, grid);
  }

  async loadStreams() {
    try {
      this.streams = await liveStreamManager.getActiveStreams();
      this.renderStreams();
    } catch (error) {
      showToast(error.message || "Could not load live streams.", "error");
    }
  }

  renderStreams() {
    const grid = this.container.querySelector("#live-stream-grid");
    clearElement(grid);
    this.syncGoLiveButton();

    if (this.streams.length === 0) {
      grid.appendChild(
        createElement("div", {
          className: "placeholder-card live-empty-card",
          text: "No one is live right now."
        })
      );
      return;
    }

    this.streams.forEach((stream) => {
      grid.appendChild(this.createStreamCard(stream));
    });
  }

  getOwnActiveStream() {
    return this.streams.find((stream) => this.isOwnStream(stream)) || null;
  }

  isOwnStream(stream) {
    const host = stream?.broadcasterId || {};

    return Boolean(
      this.currentUser?.id && host?.id && String(this.currentUser.id) === String(host.id)
    );
  }

  syncGoLiveButton() {
    if (!this.goLiveButton) {
      return;
    }

    const ownStream = this.getOwnActiveStream();
    this.goLiveButton.textContent = ownStream ? "Current stream" : "Go live";
    this.goLiveButton.classList.toggle("live-current-stream-btn", Boolean(ownStream));
    this.goLiveButton.setAttribute(
      "aria-label",
      ownStream ? "Open your current live stream" : "Start a live stream"
    );
  }

  createStreamCard(stream) {
    const card = createElement("article", { className: "live-stream-card" });
    const top = createElement("div", { className: "live-stream-card-top" });
    const host = stream.broadcasterId || {};
    const isOwnStream = this.isOwnStream(stream);
    const hostBlock = createElement("div", { className: "live-card-host" });
    const avatar = createAvatarElement(
      {
        username: host.username || "Live host",
        avatarUrl: host.avatar || host.avatarUrl || ""
      },
      {
        size: "md",
        className: "live-card-avatar",
        decorative: true
      }
    );
    const hostCopy = createElement("div", { className: "live-card-host-copy" });
    const hostLabel = createElement("span", {
      className: "live-card-label",
      text: "Host"
    });
    const hostName = createElement("strong", {
      className: "live-card-host-name",
      text: host.username || "Live host"
    });
    const badge = createElement("span", {
      className: "live-status-badge",
      text: "Live"
    });
    const viewers = createViewerCountElement({
      count: stream.viewerCount || 0,
      className: "live-card-viewers"
    });
    const duration = createElement("span", {
      className: "live-card-duration",
      text: `${formatLiveDuration(stream.startTime)} live`
    });
    const meta = createElement("div", { className: "live-card-meta-row" });
    const body = createElement("div", { className: "live-card-main" });
    const details = createElement("div", { className: "live-card-details" });
    const media = this.createStreamCoverMedia(stream);
    const content = createElement("div", { className: "live-card-content" });
    const topicLabel = createElement("span", {
      className: "live-card-label",
      text: "Topic"
    });
    const title = createElement("h3", {
      className: "live-card-title",
      text: stream.title || "Live conversation"
    });
    const descriptionLabel = createElement("span", {
      className: "live-card-label",
      text: "Description"
    });
    const description = createElement("p", {
      className: "live-card-description",
      text: stream.description || "Join the stream, listen in, chat, and react while it is live."
    });
    const footer = createElement("div", { className: "live-card-footer" });
    const invitation = createElement("p", {
      className: "live-card-invite",
      text: isOwnStream
        ? "You are live. Open the current stream controls from here."
        : "Jump in and be part of the conversation."
    });
    const watchButton = createElement("button", {
      className: `primary-btn live-card-watch-btn${isOwnStream ? " live-card-manage-btn" : ""}`,
      type: "button",
      text: isOwnStream ? "Manage stream" : "Watch live"
    });

    watchButton.addEventListener("click", () => {
      if (isOwnStream) {
        navigate("livestream-broadcast");
        return;
      }

      navigate("livestream-viewer", { streamId: stream.id || stream._id });
    });

    hostCopy.append(hostLabel, hostName);
    hostBlock.append(avatar, hostCopy);
    meta.append(viewers, duration);
    top.append(hostBlock, badge);
    content.append(topicLabel, title, descriptionLabel, description);
    details.append(meta, content);
    body.append(details, media);
    footer.append(invitation, watchButton);
    card.append(top, body, footer);
    return card;
  }

  createStreamCoverMedia(stream) {
    const media = createElement("div", { className: "live-card-media" });
    const coverImageUrl = resolveApiAssetUrl(stream.coverImageUrl || stream.coverImage || "");

    protectMediaShell(media);

    if (!coverImageUrl) {
      this.renderStreamCoverPlaceholder(media, stream);
      return media;
    }

    const image = document.createElement("img");

    media.classList.add("live-card-media-has-image");
    image.className = "live-card-cover-image";
    image.alt = `${stream.title || "Live stream"} cover`;
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.src = coverImageUrl;
    protectImageElement(image);

    image.addEventListener("error", () => {
      this.renderStreamCoverPlaceholder(media, stream);
    });

    media.appendChild(image);
    return media;
  }

  renderStreamCoverPlaceholder(media, stream) {
    clearElement(media);

    const marker = createElement("span", { className: "live-card-cover-marker" });
    const label = createElement("strong", {
      className: "live-card-cover-title",
      text: "Live now"
    });
    const topic = createElement("span", {
      className: "live-card-cover-topic",
      text: stream.title || "Live conversation"
    });

    media.append(marker, label, topic);
  }

  destroy() {
    window.clearInterval(this.refreshTimerId);
  }
}
