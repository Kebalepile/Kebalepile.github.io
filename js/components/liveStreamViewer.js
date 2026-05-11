import { liveStreamManager } from "../services/liveStreamService.js";
import { liveStreamCommentService } from "../services/liveStreamCommentService.js";
import { navigate } from "../router.js";
import { clearElement, createElement } from "../utils/dom.js";
import {
  LIVE_REACTIONS,
  createLiveChatPanel,
  createLiveVideo,
  createViewerCountElement,
  formatLiveDuration,
  setLiveIconButton,
  setLiveIconOnlyButton,
  setViewerCount
} from "./liveStreamShared.js";
import { showToast } from "./toast.js";

export class LiveStreamViewer {
  constructor(streamId) {
    this.streamId = streamId;
    this.container = null;
    this.video = null;
    this.chat = null;
    this.viewerCount = null;
    this.durationNode = null;
    this.durationTimerId = null;
    this.cleanupFns = [];
    this.hasLeftStream = false;
    this.audioMuted = true;
    this.videoHidden = false;
    this.mobileReactionsOpen = false;
    this.streamerMediaState = {
      cameraEnabled: true,
      microphoneEnabled: true
    };
  }

  leaveEndedStream() {
    if (this.hasLeftStream) {
      return;
    }

    this.hasLeftStream = true;

    if (this.video) {
      this.video.srcObject = null;
    }

    void liveStreamManager.leaveStream(this.streamId).finally(() => {
      navigate("livestream-discover");
    });
  }

  async initialize() {
    if (typeof document !== "undefined") {
      document.body?.classList.add("live-viewer-overlay-route");
    }
    this.container = createElement("section", { className: "live-stream-stage live-viewer-stage" });
    this.renderLoading();

    try {
      const stream = await liveStreamManager.getStream(this.streamId);
      this.renderViewer(stream);
      const joinResponse = await liveStreamManager.joinStream(this.streamId);

      if (Number.isFinite(joinResponse?.viewerCount)) {
        setViewerCount(this.viewerCount, joinResponse.viewerCount);
      }
    } catch (error) {
      this.renderError(error.message || "Could not open this stream.");
    }

    return this.container;
  }

  renderLoading() {
    clearElement(this.container);
    this.container.appendChild(
      createElement("div", {
        className: "placeholder-card",
        text: "Opening live stream..."
      })
    );
  }

  renderError(message) {
    clearElement(this.container);
    this.container.appendChild(
      createElement("div", {
        className: "placeholder-card",
        text: message
      })
    );
  }

  renderViewer(stream) {
    clearElement(this.container);

    const layout = createElement("section", { className: "live-broadcast-layout live-viewer-layout" });
    const main = createElement("div", { className: "live-video-panel" });
    const header = createElement("div", { className: "live-video-header" });
    const copy = createElement("div", { className: "live-video-copy" });
    const badge = createElement("span", {
      className: "live-status-badge",
      text: "Live"
    });
    const title = createElement("h2", {
      className: "live-video-title",
      text: stream.title
    });
    this.viewerCount = createViewerCountElement({ count: stream.viewerCount || 0 });
    this.durationNode = createElement("span", {
      className: "live-duration",
      text: `${formatLiveDuration(stream.startTime || stream.startedAt)} live`
    });
    const status = createElement("p", {
      className: "live-connection-status",
      text: "Connecting..."
    });
    const footer = createElement("div", { className: "live-viewer-footer" });
    const actions = createElement("div", { className: "live-viewer-actions" });
    const muteButton = createElement("button", {
      className: "secondary-btn live-viewer-toggle-btn",
      type: "button",
      text: "Mute"
    });
    const videoButton = createElement("button", {
      className: "secondary-btn live-viewer-toggle-btn",
      type: "button",
      text: "Video off"
    });
    const leaveButton = createElement("button", {
      className: "danger-btn live-leave-btn",
      type: "button",
      text: "Leave stream"
    });
    this.video = createLiveVideo({ id: "viewer-video", muted: true });
    const videoBody = createElement("div", { className: "live-video-body" });
    const videoPlaceholder = createElement("div", { className: "live-video-feed live-video-placeholder" });
    const videoPlaceholderLogo = createElement("img", {
      className: "live-video-placeholder-logo",
      attributes: {
        src: "assets/stream-logo-transparent.png",
        alt: "Yahneh stream logo",
        draggable: "false"
      }
    });
    const mediaStateMessage = createElement("p", { className: "live-video-state-message" });
    const connectionOverlay = createElement("div", {
      className: "live-connection-overlay",
      attributes: {
        "aria-live": "polite",
        role: "status"
      }
    });
    const connectionSpinner = createElement("span", {
      className: "live-connection-spinner",
      attributes: {
        "aria-hidden": "true"
      }
    });
    const connectionText = createElement("span", {
      className: "live-connection-overlay-text",
      text: "Connecting..."
    });
    const mobileOverlay = createElement("div", {
      className: "mobile-live-overlay",
      attributes: {
        "aria-live": "polite"
      }
    });
    const mobileDock = createElement("div", { className: "mobile-live-dock" });
    const mobileReactionToggle = createElement("button", {
      className: "secondary-btn mobile-live-reaction-toggle",
      type: "button",
      attributes: {
        "aria-expanded": "false",
        "aria-label": "Show live reactions"
      }
    });
    const mobileReactionToggleIcon = createElement("span", {
      className: "mobile-live-reaction-toggle-icon",
      text: "+"
    });
    const mobileReactions = createElement("div", {
      className: "mobile-live-reactions",
      attributes: {
        "aria-label": "Live reactions"
      }
    });
    const mobileForm = createElement("form", { className: "mobile-live-form" });
    const mobileInput = createElement("input", {
      className: "mobile-live-input",
      type: "text",
      placeholder: "Chat",
      autocomplete: "off",
      attributes: {
        maxlength: "500",
        "aria-label": "Live chat message"
      }
    });
    const mobileSendButton = createElement("button", {
      className: "primary-btn mobile-live-send-btn",
      type: "submit",
      text: "Send"
    });
    const overlayItems = [];
    let relayFallbackTimerId = null;
    const isCompactOverlayMode = () =>
      typeof window !== "undefined" && window.matchMedia?.("(max-width: 900px)").matches;

    const addMobileOverlayItem = ({ className, author = "", text = "" } = {}) => {
      const safeText = typeof text === "string" ? text.trim() : "";

      if (!safeText) {
        return;
      }

      const item = createElement("div", {
        className: `mobile-live-overlay-item ${className || ""}`.trim()
      });
      const isReaction = String(className || "").includes("mobile-live-overlay-reaction");

      if (isReaction) {
        const videoRect = videoBody.getBoundingClientRect();
        const videoWidth = Math.max(videoRect.width || 0, 280);
        const videoHeight = Math.max(videoRect.height || 0, 220);
        const startX = Math.round(videoWidth * (0.14 + Math.random() * 0.72));
        const startY = Math.round(Math.random() * Math.min(videoHeight * 0.14, 44));
        const rise = Math.round(videoHeight * (0.34 + Math.random() * 0.26));
        const driftA = Math.round((Math.random() - 0.5) * Math.min(videoWidth * 0.22, 92));
        const driftB = Math.round((Math.random() - 0.5) * Math.min(videoWidth * 0.34, 138));
        const rotate = Math.round((Math.random() - 0.5) * 24);
        const scale = (0.94 + Math.random() * 0.2).toFixed(2);

        item.style.setProperty("--reaction-x", `${startX}px`);
        item.style.setProperty("--reaction-start-y", `${startY}px`);
        item.style.setProperty("--reaction-rise", `${rise}px`);
        item.style.setProperty("--reaction-drift-a", `${driftA}px`);
        item.style.setProperty("--reaction-drift-b", `${driftB}px`);
        item.style.setProperty("--reaction-rotate", `${rotate}deg`);
        item.style.setProperty("--reaction-scale", scale);
      }

      if (author) {
        item.appendChild(
          createElement("strong", {
            className: "mobile-live-overlay-author",
            text: author
          })
        );
      }

      item.appendChild(
        createElement("span", {
          className: "mobile-live-overlay-text",
          text: safeText
        })
      );
      mobileOverlay.appendChild(item);
      overlayItems.push(item);

      while (overlayItems.length > 5) {
        overlayItems.shift()?.remove();
      }

      window.setTimeout(() => {
        const itemIndex = overlayItems.indexOf(item);

        if (itemIndex >= 0) {
          overlayItems.splice(itemIndex, 1);
        }

        item.remove();
      }, 4600);
    };
    const syncMobileReactionPanel = () => {
      videoBody.classList.toggle("live-video-body-reactions-open", this.mobileReactionsOpen);
      mobileDock.classList.toggle("mobile-live-dock-reactions-open", this.mobileReactionsOpen);
      mobileReactionToggle.setAttribute("aria-expanded", String(this.mobileReactionsOpen));
      mobileReactionToggle.setAttribute(
        "aria-label",
        this.mobileReactionsOpen ? "Hide live reactions" : "Show live reactions"
      );
      mobileReactionToggleIcon.textContent = this.mobileReactionsOpen ? "×" : "+";
    };

    LIVE_REACTIONS.forEach((reaction) => {
      const button = createElement("button", {
        className: "secondary-btn mobile-live-reaction-btn",
        type: "button",
        text: reaction.emoji,
        attributes: {
          "aria-label": reaction.label,
          title: reaction.label
        }
      });

      button.addEventListener("click", () => {
        liveStreamCommentService.sendReaction(this.streamId, reaction.emoji);
      });
      mobileReactions.appendChild(button);
    });

    mobileReactionToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.mobileReactionsOpen = !this.mobileReactionsOpen;
      syncMobileReactionPanel();
    });

    mobileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = mobileInput.value.trim();

      if (!text) {
        return;
      }

      liveStreamCommentService.sendComment(this.streamId, text);
      mobileInput.value = "";
    });

    mobileReactionToggle.appendChild(mobileReactionToggleIcon);
    mobileForm.append(mobileInput, mobileSendButton);
    mobileDock.append(mobileReactionToggle, mobileReactions, mobileForm);
    videoPlaceholder.hidden = true;
    videoPlaceholder.append(videoPlaceholderLogo);
    connectionOverlay.append(connectionSpinner, connectionText);
    videoBody.append(this.video, videoPlaceholder, mediaStateMessage, connectionOverlay, mobileOverlay, mobileDock);
    this.chat = createLiveChatPanel({ streamId: this.streamId });
    syncMobileReactionPanel();

    const syncViewerControls = () => {
      const streamerVideoOn =
        this.streamerMediaState.isScreenSharing === true ||
        this.streamerMediaState.cameraEnabled !== false;
      const streamerMicOn = this.streamerMediaState.microphoneEnabled !== false;
      const shouldShowLogo = this.videoHidden || !streamerVideoOn;
      const stateMessage = !streamerVideoOn
        ? "Streamer turned video off."
        : !streamerMicOn && !this.videoHidden
          ? "Streamer turned mic off."
          : "";

      if (this.video) {
        this.video.muted = this.audioMuted;
        this.video.classList.toggle("live-video-feed-hidden", shouldShowLogo);
      }

      videoPlaceholder.hidden = !shouldShowLogo;
      mediaStateMessage.textContent = stateMessage;

      setLiveIconOnlyButton(muteButton, {
        iconName: this.audioMuted ? "mic-off" : "mic",
        label: this.audioMuted ? "Unmute" : "Mute"
      });
      setLiveIconOnlyButton(videoButton, {
        iconName: this.videoHidden ? "camera-off" : "camera",
        label: this.videoHidden ? "Video on" : "Video off"
      });
    };
    const syncDuration = () => {
      this.durationNode.textContent = `${formatLiveDuration(stream.startTime || stream.startedAt)} live`;
    };
    const setConnectionStatus = (message, { loading = true } = {}) => {
      const safeMessage = typeof message === "string" && message.trim() ? message.trim() : "Connecting...";

      status.textContent = safeMessage;
      connectionText.textContent = safeMessage;
      connectionOverlay.hidden = !loading;
      connectionOverlay.classList.toggle("live-connection-overlay-visible", loading);
    };
    const clearRelayFallbackTimer = () => {
      if (relayFallbackTimerId) {
        window.clearTimeout(relayFallbackTimerId);
        relayFallbackTimerId = null;
      }
    };
    const scheduleRelayFallback = () => {
      clearRelayFallbackTimer();
      relayFallbackTimerId = window.setTimeout(() => {
        setConnectionStatus("Reconnecting...");
        liveStreamManager.requestPeerFallback?.();
      }, 9000);
    };

    copy.append(badge, title, this.durationNode);
    header.append(copy, this.viewerCount);
    actions.append(muteButton, videoButton, leaveButton);
    footer.append(status, actions);
    main.append(header, videoBody, footer);
    layout.append(main, this.chat.root);
    this.container.appendChild(layout);
    syncViewerControls();
    syncDuration();
    this.durationTimerId = window.setInterval(syncDuration, 30000);

    this.cleanupFns.push(
      () => window.clearInterval(this.durationTimerId),
      clearRelayFallbackTimer,
      liveStreamManager.on("remote-stream-added", ({ stream: remoteStream }) => {
        clearRelayFallbackTimer();
        this.video.srcObject = remoteStream;
        this.video.muted = this.audioMuted;
        void this.video.play?.().catch(() => {});
        setConnectionStatus("Connected", { loading: false });
      }),
      liveStreamManager.on("relay-playback-ready", ({ objectUrl }) => {
        this.video.srcObject = null;
        this.video.src = objectUrl;
        this.video.muted = this.audioMuted;
        setConnectionStatus("Buffering stream...");
        scheduleRelayFallback();
      }),
      liveStreamManager.on("relay-stream-started", () => {
        setConnectionStatus("Buffering stream...");
        scheduleRelayFallback();
      }),
      liveStreamManager.on("relay-stream-added", () => {
        clearRelayFallbackTimer();
        void this.video.play?.().catch(() => {});
        setConnectionStatus("Connected", { loading: false });
      }),
      liveStreamManager.on("relay-stream-stopped", () => {
        setConnectionStatus("Stream paused.", { loading: true });
      }),
      liveStreamManager.on("relay-playback-error", () => {
        clearRelayFallbackTimer();
        setConnectionStatus("Reconnecting...");
        liveStreamManager.requestPeerFallback?.();
      }),
      liveStreamManager.on("connection-state-changed", ({ state }) => {
        const normalizedState = typeof state === "string" ? state.toLowerCase() : "";
        const label = normalizedState
          ? normalizedState.charAt(0).toUpperCase() + normalizedState.slice(1)
          : "Connecting...";
        const isConnected = normalizedState === "connected" || normalizedState === "completed";

        setConnectionStatus(label, { loading: !isConnected });
      }),
      liveStreamManager.on("broadcaster-ready", () => {
        setConnectionStatus("Broadcaster reconnected. Rejoining...");
      }),
      liveStreamManager.on("viewer-reconnecting", () => {
        setConnectionStatus("Reconnecting...");
      }),
      liveStreamManager.on("viewer-count-changed", ({ viewerCount }) => {
        setViewerCount(this.viewerCount, viewerCount);
      }),
      liveStreamManager.on("remote-media-state-changed", (state) => {
        this.streamerMediaState = {
          ...this.streamerMediaState,
          ...state
        };
        syncViewerControls();
      }),
      liveStreamManager.on("stream-ended", () => {
        setConnectionStatus("This stream has ended.", { loading: false });
        showToast("This live stream has ended.", "error");
        this.leaveEndedStream();
      }),
      liveStreamManager.on("viewer-strike", (message) => {
        status.textContent = `Strike ${message.strikes || 1}/3 from the broadcaster.`;
        showToast(`Stream warning ${message.strikes || 1}/3.`, "error");
      }),
      liveStreamManager.on("viewer-muted", (message) => {
        if (message.targetUserId) {
          showToast("You have been muted in this live stream.", "error");
        }
      }),
      liveStreamManager.on("viewer-kicked", () => {
        showToast("You were removed from this live stream.", "error");
        this.renderError("You were removed from this live stream.");
      }),
      liveStreamCommentService.onComment((comment) => {
        if (comment.streamId === this.streamId) {
          this.chat.addMessage(comment);

          if (isCompactOverlayMode()) {
            addMobileOverlayItem({
              className: "mobile-live-overlay-message",
              author: comment.username || "Neighbor",
              text: comment.text || ""
            });
          }
        }
      }),
      liveStreamCommentService.onReaction((reaction) => {
        if (reaction.streamId === this.streamId) {
          addMobileOverlayItem({
            className: "mobile-live-overlay-reaction",
            text: reaction.reactionType || "Reacted"
          });
        }
      })
    );

    muteButton.addEventListener("click", () => {
      this.audioMuted = !this.audioMuted;
      syncViewerControls();
    });

    videoButton.addEventListener("click", () => {
      this.videoHidden = !this.videoHidden;
      syncViewerControls();
    });

    leaveButton.addEventListener("click", async () => {
      leaveButton.disabled = true;
      leaveButton.textContent = "Leaving...";
      this.hasLeftStream = true;

      try {
        const response = await liveStreamManager.leaveStream(this.streamId);

        if (Number.isFinite(response?.viewerCount)) {
          setViewerCount(this.viewerCount, response.viewerCount);
        }

        if (this.video) {
          this.video.srcObject = null;
        }

        showToast("You left the live stream.", "success");
        navigate("livestream-discover");
      } catch (error) {
        this.hasLeftStream = false;
        leaveButton.disabled = false;
        leaveButton.textContent = "Leave stream";
        showToast(error.message || "Could not leave the live stream.", "error");
      }
    });
  }

  destroy() {
    if (typeof document !== "undefined") {
      document.body?.classList.remove("live-viewer-overlay-route");
    }
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
    this.durationTimerId = null;
    this.video = null;

    if (!this.hasLeftStream) {
      this.hasLeftStream = true;
      void liveStreamManager.leaveStream(this.streamId);
    }
  }
}
