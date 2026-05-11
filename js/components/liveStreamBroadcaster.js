import { liveStreamManager } from "../services/liveStreamService.js";
import { liveStreamCommentService } from "../services/liveStreamCommentService.js";
import { logoutUser } from "../services/authService.js";
import { broadcast } from "../services/liveSyncService.js";
import { navigate } from "../router.js";
import { clearElement, createElement } from "../utils/dom.js";
import {
  buildLiveStreamShareUrl,
  createLiveChatPanel,
  createLiveVideo,
  createViewerCountElement,
  formatLiveDuration,
  setLiveIconButton,
  setLiveIconOnlyButton,
  setViewerCount
} from "./liveStreamShared.js";
import { createPostImageField } from "./postImageField.js";
import { showToast } from "./toast.js";
import { showConfirmDialog } from "./confirmDialog.js";

function isAuthError(error) {
  return error?.code === "AUTH_REQUIRED" || error?.code === "AUTH_TOKEN_INVALID";
}

function canUseMobileCameraFlip() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && Number(navigator.maxTouchPoints || 0) > 1);
}

function formatStreamBitrate(kbps) {
  const safeKbps = Math.max(Number(kbps) || 0, 0);

  if (safeKbps >= 1000) {
    return `${(safeKbps / 1000).toFixed(safeKbps >= 10000 ? 0 : 1)} Mbps`;
  }

  return `${Math.round(safeKbps)} kbps`;
}

export class LiveStreamBroadcaster {
  constructor(currentUser) {
    this.currentUser = currentUser;
    this.container = null;
    this.stream = null;
    this.video = null;
    this.viewerCount = null;
    this.durationNode = null;
    this.chat = null;
    this.cleanupFns = [];
    this.durationTimerId = null;
    this.viewerMuteState = new Map();
  }

  initialize() {
    this.container = createElement("section", { className: "live-stream-stage" });

    if (liveStreamManager.isBroadcaster && liveStreamManager.streamId) {
      void this.restoreActiveBroadcastView();
      return this.container;
    }

    this.renderSetup();
    void this.showExistingActiveStream();
    return this.container;
  }

  async restoreActiveBroadcastView() {
    try {
      this.stream =
        (await liveStreamManager.getStream(liveStreamManager.streamId)) ||
        (await liveStreamManager.getMyActiveStream());

      if (this.stream) {
        this.renderReconnecting();
        this.stream = await liveStreamManager.resumeBroadcast(this.stream);
        this.renderLive();
        return;
      }
    } catch (error) {
      if (this.stream) {
        this.renderResumePrompt(error.message || "Could not reconnect to your live stream.");
        return;
      }
    }

    this.renderSetup();
  }

  renderReconnecting() {
    clearElement(this.container);
    this.container.appendChild(
      createElement("div", {
        className: "placeholder-card",
        text: "Reconnecting to your live stream..."
      })
    );
  }

  renderResumePrompt(message = "Your live stream is still active.") {
    this.cleanupLiveView();
    clearElement(this.container);

    const setup = createElement("section", { className: "live-setup-panel" });
    const copy = createElement("div", { className: "live-setup-copy" });
    const eyebrow = createElement("p", {
      className: "section-eyebrow",
      text: "Live stream"
    });
    const title = createElement("h2", {
      className: "section-title",
      text: "Resume current stream"
    });
    const text = createElement("p", {
      className: "section-copy",
      text: message
    });
    const actions = createElement("div", { className: "live-setup-form" });
    const resumeButton = createElement("button", {
      className: "primary-btn live-start-submit-btn",
      type: "button",
      text: "Resume stream"
    });
    const endButton = createElement("button", {
      className: "danger-btn",
      type: "button",
      text: "End stream"
    });

    resumeButton.addEventListener("click", async () => {
      resumeButton.disabled = true;
      this.renderReconnecting();

      try {
        this.stream = await liveStreamManager.resumeBroadcast(this.stream);
        this.renderLive();
      } catch (error) {
        showToast(error.message || "Could not reconnect to your live stream.", "error");
        this.renderResumePrompt(error.message || "Could not reconnect to your live stream.");
      }
    });

    endButton.addEventListener("click", async () => {
      endButton.disabled = true;

      try {
        await liveStreamManager.endStream(this.stream?.id || this.stream?._id);
        liveStreamManager.cleanup();
        this.stream = null;
        showToast("Live stream ended.", "success");
        this.renderSetup();
      } catch (error) {
        if (isAuthError(error)) {
          liveStreamManager.cleanup();
          logoutUser();
          showToast("Your session expired. Log in again, then start a new stream.", "error");
          this.stream = null;
          void navigate("login", null, { historyMode: "replace", skipTransition: true });
        } else {
          showToast(error.message || "Could not end stream.", "error");
        }
        endButton.disabled = false;
      }
    });

    copy.append(eyebrow, title, text);
    actions.append(resumeButton, endButton);
    setup.append(copy, actions);
    this.container.appendChild(setup);
  }

  renderSetup() {
    this.cleanupLiveView();
    clearElement(this.container);

    const setup = createElement("section", { className: "live-setup-panel" });
    const copy = createElement("div", { className: "live-setup-copy" });
    const eyebrow = createElement("p", {
      className: "section-eyebrow",
      text: "Live stream"
    });
    const title = createElement("h2", {
      className: "section-title",
      text: "Go live"
    });
    const text = createElement("p", {
      className: "section-copy",
      text: "Start a camera and microphone broadcast, switch to screen sharing when needed, and chat with viewers in real time."
    });
    const form = createElement("form", { className: "live-setup-form" });
    const titleInput = createElement("input", {
      className: "form-input",
      type: "text",
      placeholder: "Stream title",
      required: true,
      attributes: {
        maxlength: "40",
        "aria-label": "Stream title"
      }
    });
    const descriptionInput = createElement("input", {
      className: "form-input live-description-input",
      type: "text",
      placeholder: "Description",
      attributes: {
        maxlength: "100",
        "aria-label": "Stream description"
      }
    });
    const coverImageField = createPostImageField({
      form,
      inputId: "livestream-cover-image",
      titleText: "Add stream image",
      removeEmptyPreviewImage: true,
      wrapperClassName: "live-cover-image-field",
      previewShellClassName: "live-cover-preview-shell",
      previewImageClassName: "live-cover-preview-image"
    });
    const coverField = createElement("div", {
      className: "live-cover-upload-field"
    });
    const coverCopy = createElement("div", {
      className: "live-cover-upload-copy"
    });
    const coverHelp = createElement("p", {
      className: "field-helper live-cover-upload-help",
      text: "Optional. This appears on the live streams card."
    });
    const coverRow = createElement("div", {
      className: "live-cover-upload-row"
    });
    const submitButton = createElement("button", {
      className: "primary-btn live-start-submit-btn",
      type: "submit",
      text: "Start live stream"
    });

    coverCopy.append(coverHelp);
    coverRow.append(coverCopy, coverImageField.control);
    coverField.append(coverRow, coverImageField.wrapper);
    form.append(titleInput, descriptionInput, coverField, submitButton);
    copy.append(eyebrow, title, text);
    setup.append(copy, form);
    this.container.appendChild(setup);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (coverImageField.isProcessing()) {
        showToast("Wait for the image to finish optimizing.", "error");
        return;
      }

      if (coverImageField.hasPreviewError()) {
        showToast("Choose another image or remove it before going live.", "error");
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Starting...";

      try {
        const title = titleInput.value.trim().slice(0, 40);

        this.stream = await liveStreamManager.startBroadcast(
          title,
          descriptionInput.value.trim(),
          coverImageField.getValue()
        );
        this.renderLive();
      } catch (error) {
        showToast(error.message || "Could not start live stream.", "error");
        submitButton.disabled = false;
        submitButton.textContent = "Start live stream";
      }
    });
  }

  async showExistingActiveStream() {
    try {
      if (liveStreamManager.isBroadcaster && liveStreamManager.streamId) {
        return;
      }

      const activeStream = await liveStreamManager.getMyActiveStream();

      if (!activeStream || this.stream) {
        return;
      }

      this.stream = activeStream;
      this.renderReconnecting();
      this.stream = await liveStreamManager.resumeBroadcast(activeStream);
      this.renderLive();
    } catch (error) {
      if (this.stream) {
        this.renderResumePrompt(error.message || "Could not reconnect to your live stream.");
      }
    }
  }

  renderLive() {
    clearElement(this.container);

    const layout = createElement("section", { className: "live-broadcast-layout" });
    const main = createElement("div", { className: "live-video-panel" });
    const header = createElement("div", { className: "live-video-header" });
    const copy = createElement("div", { className: "live-video-copy" });
    const badge = createElement("span", {
      className: "live-status-badge",
      text: "Live"
    });
    const title = createElement("h2", {
      className: "live-video-title",
      text: this.stream.title
    });
    const initialViewerCount = Math.max(Number(this.stream.viewerCount) || 0, 0);
    this.viewerCount = createViewerCountElement({ count: initialViewerCount });
    const initialMediaState = liveStreamManager.getMediaState();
    const canShowInitialSwitchCamera =
      canUseMobileCameraFlip() && initialMediaState.canSwitchCamera;
    const canShareScreen =
      typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia);
    const controls = createElement("div", { className: "live-control-row" });
    const cameraButton = createElement("button", {
      className: "secondary-btn live-control-icon-btn",
      type: "button",
      text: "Camera off"
    });
    const micButton = createElement("button", {
      className: "secondary-btn live-control-icon-btn",
      type: "button",
      text: "Mic off"
    });
    const switchCameraButton = createElement("button", {
      className: "secondary-btn live-control-icon-btn",
      type: "button",
      text: "Flip camera"
    });
    const screenButton = createElement("button", {
      className: "secondary-btn live-control-icon-btn",
      type: "button",
      text: "Share screen"
    });
    const shareButton = createElement("button", {
      className: "secondary-btn live-control-icon-btn",
      type: "button",
      text: "Share link"
    });
    const endButton = createElement("button", {
      className: "danger-btn live-end-btn",
      type: "button"
    });
    switchCameraButton.hidden = !canShowInitialSwitchCamera;
    switchCameraButton.disabled = !canShowInitialSwitchCamera;
    screenButton.hidden = !canShareScreen && !initialMediaState.isScreenSharing;
    screenButton.disabled = !canShareScreen && !initialMediaState.isScreenSharing;
    this.durationNode = createElement("span", {
      className: "live-duration",
      text: "0m live"
    });

    this.video = createLiveVideo({ id: "broadcaster-video", muted: true });
    this.video.srcObject = liveStreamManager.localStream;
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
    const healthPill = createElement("div", {
      className: "live-streamer-health",
      attributes: {
        "aria-live": "polite",
        role: "status"
      }
    });
    const healthState = createElement("span", {
      className: "live-streamer-health-item live-streamer-health-state",
      text: "Waiting"
    });
    const healthBitrate = createElement("span", {
      className: "live-streamer-health-item",
      text: "0 kbps"
    });
    const reactionOverlay = createElement("div", {
      className: "mobile-live-overlay live-streamer-video-overlay",
      attributes: {
        "aria-hidden": "true"
      }
    });
    const overlayItems = [];
    const peerConnectionStates = new Map();
    let latestViewerCount = initialViewerCount;
    let previousStatsSample = null;
    const trackOverlayItem = (item) => {
      reactionOverlay.appendChild(item);
      overlayItems.push(item);

      while (overlayItems.length > 4) {
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
    const collectBroadcastBitrate = async () => {
      const peerConnections = Array.from(
        liveStreamManager.broadcasterPeerConnections?.values?.() || []
      );
      const relayStats = liveStreamManager.getRelayStats?.() || null;

      if (!peerConnections.length) {
        previousStatsSample = null;
        return relayStats?.active ? relayStats.outboundKbps || 0 : 0;
      }

      let bytesSent = 0;
      let latestTimestamp = 0;

      await Promise.all(peerConnections.map(async (peerConnection) => {
        if (typeof peerConnection?.getStats !== "function") {
          return;
        }

        try {
          const stats = await peerConnection.getStats();

          stats.forEach((report) => {
            const isOutboundMedia =
              report.type === "outbound-rtp" &&
              !report.isRemote &&
              (report.kind === "video" ||
                report.kind === "audio" ||
                report.mediaType === "video" ||
                report.mediaType === "audio");

            if (!isOutboundMedia || !Number.isFinite(report.bytesSent)) {
              return;
            }

            bytesSent += report.bytesSent;
            latestTimestamp = Math.max(latestTimestamp, Number(report.timestamp) || 0);
          });
        } catch {
          // WebRTC stats can briefly fail while a viewer reconnects.
        }
      }));

      if (!latestTimestamp || !previousStatsSample) {
        previousStatsSample = { bytesSent, timestamp: latestTimestamp || Date.now() };
        return 0;
      }

      const elapsedMs = Math.max(latestTimestamp - previousStatsSample.timestamp, 1);
      const byteDelta = Math.max(bytesSent - previousStatsSample.bytesSent, 0);
      previousStatsSample = { bytesSent, timestamp: latestTimestamp };

      return (byteDelta * 8) / elapsedMs;
    };
    const syncStreamHealth = async () => {
      const states = Array.from(peerConnectionStates.values());
      const hasViewers = latestViewerCount > 0;
      const isUnstable = states.some((state) => state === "failed" || state === "disconnected");
      const isConnecting = states.some((state) =>
        state === "connecting" || state === "new" || state === "checking"
      );
      let stateText = "Stable";
      let stateClass = "stable";

      if (!hasViewers) {
        stateText = "Waiting";
        stateClass = "waiting";
      } else if (isUnstable) {
        stateText = "Unstable";
        stateClass = "unstable";
      } else if (isConnecting) {
        stateText = "Connecting";
        stateClass = "connecting";
      }

      healthState.textContent = stateText;
      healthState.dataset.state = stateClass;
      healthBitrate.textContent = formatStreamBitrate(await collectBroadcastBitrate());
    };
    const addChatOverlayItem = (comment = {}) => {
      const fullText = typeof comment.text === "string" ? comment.text.trim() : "";
      const safeText = fullText.length > 90 ? `${fullText.slice(0, 87).trim()}...` : fullText;

      if (!safeText) {
        return;
      }

      const item = createElement("div", {
        className: "mobile-live-overlay-item mobile-live-overlay-message live-streamer-chat-alert"
      });

      item.append(
        createElement("strong", {
          className: "mobile-live-overlay-author",
          text: comment.username || "Neighbor"
        }),
        createElement("span", {
          className: "mobile-live-overlay-text",
          text: safeText
        })
      );
      trackOverlayItem(item);
    };
    const addReactionOverlayItem = (text = "") => {
      const safeText = typeof text === "string" ? text.trim() : "";

      if (!safeText) {
        return;
      }

      const item = createElement("div", {
        className: "mobile-live-overlay-item mobile-live-overlay-reaction live-streamer-reaction-alert"
      });
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
      item.appendChild(
        createElement("span", {
          className: "mobile-live-overlay-text",
          text: safeText
        })
      );
      trackOverlayItem(item);
    };
    videoPlaceholder.hidden = true;
    videoPlaceholder.append(videoPlaceholderLogo);
    videoBody.append(this.video, videoPlaceholder, mediaStateMessage, reactionOverlay);
    const isBroadcasterComment = (message = {}) =>
      String(message.userId || "") === String(this.currentUser?.id || this.currentUser?._id || "");
    const handleChatModerationAction = async (action, message = {}, row = null) => {
      const viewerId = String(message.userId || "").trim();
      const streamerName = this.currentUser?.username || "Streamer";
      const isMuted = this.viewerMuteState.get(viewerId) === true;

      if (!viewerId) {
        showToast("Could not find that viewer.", "error");
        return;
      }

      if (action === "like" || action === "heart") {
        row?.classList.add(action === "heart" ? "live-chat-message-hearted" : "live-chat-message-liked");
        broadcast({
          type: "stream:comment-moderation",
          streamId: this.stream.id,
          targetUserId: viewerId,
          action,
          streamerName,
          text: message.text || "",
          timestamp: Date.now()
        });
        return;
      }

      try {
        if (action === "mute") {
          if (isMuted) {
            showToast(`${message.username || "Viewer"} is already muted.`, "info");
            return;
          }

          await liveStreamManager.muteViewer(this.stream.id, viewerId);
          this.viewerMuteState.set(viewerId, true);
          showToast(`${message.username || "Viewer"} muted.`, "success");
          return;
        }

        if (action === "unmute") {
          await liveStreamManager.unmuteViewer(this.stream.id, viewerId);
          this.viewerMuteState.set(viewerId, false);
          showToast(`${message.username || "Viewer"} unmuted.`, "success");
          return;
        }

        if (action === "kick") {
          await liveStreamManager.kickViewer(this.stream.id, viewerId);
          showToast(`${message.username || "Viewer"} removed from the stream.`, "success");
        }
      } catch (error) {
        showToast(error.message || "Could not moderate viewer.", "error");
      }
    };

    this.chat = createLiveChatPanel({
      streamId: this.stream.id,
      canModerateMessage: (message) => Boolean(message?.userId) && !isBroadcasterComment(message),
      onModerationAction: handleChatModerationAction
    });
    this.chat.root.classList.add("live-streamer-chat-panel");
    const sideStack = createElement("div", { className: "live-side-stack" });
    const chatHeader = this.chat.root.querySelector(".live-chat-header");
    const chatToggleButton = createElement("button", {
      className: "secondary-btn live-chat-accordion-toggle",
      type: "button",
      text: "Open"
    });
    let unreadChatCount = 0;
    const isMobileStreamerLayout = () =>
      typeof window !== "undefined" && window.matchMedia?.("(max-width: 860px)").matches;
    const syncChatToggle = () => {
      const isCollapsed = this.chat.root.classList.contains("live-chat-panel-collapsed");
      const unreadLabel = unreadChatCount > 0 ? ` (${Math.min(unreadChatCount, 99)})` : "";
      const label = isCollapsed ? `Open chat${unreadLabel}` : "Close chat";

      chatToggleButton.textContent = isCollapsed ? `Open${unreadLabel}` : "Close";
      chatToggleButton.setAttribute("aria-expanded", String(!isCollapsed));
      chatToggleButton.setAttribute("aria-label", label);
    };
    const setChatCollapsed = (nextCollapsed) => {
      this.chat.root.classList.toggle("live-chat-panel-collapsed", Boolean(nextCollapsed));

      if (!nextCollapsed) {
        unreadChatCount = 0;
      }

      syncChatToggle();
    };
    const syncMobileChatAccordion = () => {
      if (isMobileStreamerLayout()) {
        if (!this.chat.root.classList.contains("live-chat-panel-ready")) {
          this.chat.root.classList.add("live-chat-panel-ready");
          setChatCollapsed(true);
        } else {
          syncChatToggle();
        }
        return;
      }

      this.chat.root.classList.remove("live-chat-panel-ready", "live-chat-panel-collapsed");
      unreadChatCount = 0;
      syncChatToggle();
    };
    const handleChatAccordionToggle = () => {
      if (!isMobileStreamerLayout()) {
        return;
      }

      setChatCollapsed(!this.chat.root.classList.contains("live-chat-panel-collapsed"));
    };
    const handleChatAccordionResize = () => syncMobileChatAccordion();

    chatHeader?.appendChild(chatToggleButton);
    chatHeader?.addEventListener("click", handleChatAccordionToggle);
    chatToggleButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleChatAccordionToggle();
    });
    window.addEventListener("resize", handleChatAccordionResize);
    syncMobileChatAccordion();

    healthPill.append(healthState, healthBitrate);
    copy.append(badge, title, healthPill, this.durationNode);
    header.append(copy, this.viewerCount);
    controls.append(
      cameraButton,
      micButton,
      switchCameraButton,
      screenButton,
      shareButton,
      endButton
    );
    main.append(header, videoBody, controls);
    sideStack.append(this.chat.root);
    layout.append(main, sideStack);
    this.container.appendChild(layout);

    const syncMediaButtons = () => {
      const state = liveStreamManager.getMediaState();
      const canShowSwitchCamera = canUseMobileCameraFlip() && state.canSwitchCamera;

      setLiveIconOnlyButton(cameraButton, {
        iconName: state.cameraEnabled ? "camera" : "camera-off",
        label: state.cameraEnabled ? "Camera on" : "Camera off"
      });
      cameraButton.classList.toggle("live-control-btn-off", !state.cameraEnabled);
      cameraButton.setAttribute("aria-pressed", String(state.cameraEnabled));
      setLiveIconOnlyButton(micButton, {
        iconName: state.microphoneEnabled ? "mic" : "mic-off",
        label: state.microphoneEnabled ? "Mic on" : "Mic off"
      });
      micButton.classList.toggle("live-control-btn-off", !state.microphoneEnabled);
      micButton.setAttribute("aria-pressed", String(state.microphoneEnabled));
      setLiveIconOnlyButton(switchCameraButton, {
        iconName: "rotate",
        label: "Flip camera"
      });
      switchCameraButton.hidden = !canShowSwitchCamera;
      switchCameraButton.disabled = !canShowSwitchCamera;
      setLiveIconOnlyButton(screenButton, {
        iconName: "monitor",
        label: state.isScreenSharing ? "Stop sharing" : "Share screen"
      });
      screenButton.classList.toggle("live-control-btn-active", state.isScreenSharing);
      screenButton.setAttribute("aria-pressed", String(state.isScreenSharing));
      screenButton.hidden = !canShareScreen && !state.isScreenSharing;
      screenButton.disabled = !canShareScreen && !state.isScreenSharing;
      const hasVisibleVideo = state.isScreenSharing || state.cameraEnabled;
      this.video.classList.toggle("live-video-feed-hidden", !hasVisibleVideo);
      videoPlaceholder.hidden = hasVisibleVideo;
      mediaStateMessage.textContent = hasVisibleVideo ? "" : "Your camera is off.";
    };
    const syncDuration = () => {
      this.durationNode.textContent = `${formatLiveDuration(this.stream.startTime)} live`;
    };

    syncMediaButtons();
    setLiveIconOnlyButton(shareButton, {
      iconName: "share",
      label: "Share link"
    });
    setLiveIconButton(endButton, {
      iconName: "stop",
      label: "End stream"
    });
    syncDuration();
    void syncStreamHealth();
    this.durationTimerId = window.setInterval(syncDuration, 30000);
    const healthTimerId = window.setInterval(() => {
      void syncStreamHealth();
    }, 3000);

    this.cleanupFns.push(
      () => window.clearInterval(this.durationTimerId),
      () => window.clearInterval(healthTimerId),
      liveStreamManager.on("local-stream-updated", ({ localStream }) => {
        this.video.srcObject = localStream;
      }),
      liveStreamManager.on("connection-state-changed", ({ state, userId }) => {
        const key = userId || "viewer";

        if (state === "closed" || state === "connected" || state === "completed") {
          peerConnectionStates.delete(key);
        } else if (state) {
          peerConnectionStates.set(key, state);
        }

        void syncStreamHealth();
      }),
      liveStreamManager.on("media-state-changed", syncMediaButtons),
      liveStreamManager.on("screen-sharing-started", syncMediaButtons),
      liveStreamManager.on("screen-sharing-stopped", syncMediaButtons),
      liveStreamManager.on("camera-capabilities-changed", syncMediaButtons),
      liveStreamManager.on("camera-facing-mode-changed", syncMediaButtons),
      liveStreamManager.on("viewer-count-changed", ({ viewerCount }) => {
        latestViewerCount = Math.max(Number(viewerCount) || 0, 0);
        setViewerCount(this.viewerCount, viewerCount);
        void syncStreamHealth();
      }),
      liveStreamCommentService.onComment((comment) => {
        if (comment.streamId === this.stream.id) {
          comment.muted = this.viewerMuteState.get(String(comment.userId || "")) === true;
          this.chat.addMessage(comment);
          addChatOverlayItem(comment);

          if (
            isMobileStreamerLayout() &&
            this.chat.root.classList.contains("live-chat-panel-collapsed")
          ) {
            unreadChatCount += 1;
            syncChatToggle();
          }
        }
      }),
      liveStreamCommentService.onReaction((reaction) => {
        if (reaction.streamId === this.stream.id) {
          addReactionOverlayItem(reaction.reactionType || "Reacted");
        }
      })
    );
    this.cleanupFns.push(
      () => window.removeEventListener("resize", handleChatAccordionResize),
      () => chatHeader?.removeEventListener("click", handleChatAccordionToggle)
    );

    cameraButton.addEventListener("click", () => {
      const state = liveStreamManager.getMediaState();
      liveStreamManager.setCameraEnabled(!state.cameraEnabled);
    });

    micButton.addEventListener("click", () => {
      const state = liveStreamManager.getMediaState();
      liveStreamManager.setMicrophoneEnabled(!state.microphoneEnabled);
    });

    switchCameraButton.addEventListener("click", async () => {
      if (switchCameraButton.hidden) {
        return;
      }

      switchCameraButton.disabled = true;

      try {
        await liveStreamManager.switchCamera();
      } catch (error) {
        showToast(error.message || "Could not switch camera.", "error");
      } finally {
        syncMediaButtons();
        if (!switchCameraButton.hidden) {
          switchCameraButton.disabled = false;
        }
      }
    });

    screenButton.addEventListener("click", async () => {
      try {
        if (liveStreamManager.isScreenSharing) {
          await liveStreamManager.stopScreenSharing();
          return;
        }

        await liveStreamManager.shareScreen();
      } catch (error) {
        showToast(error.message || "Screen sharing failed.", "error");
      }
    });

    shareButton.addEventListener("click", () => {
      void this.shareStreamLink();
    });

    endButton.addEventListener("click", () => {
      showConfirmDialog({
        title: "End live stream?",
        message: "This will end the stream for everyone watching.",
        confirmText: "End stream",
        cancelText: "Keep live",
        danger: true,
        onConfirm: async () => {
          endButton.disabled = true;

          try {
            await liveStreamManager.endBroadcast();
            showToast("Live stream ended.", "success");
            this.stream = null;
            this.renderSetup();
          } catch (error) {
            if (isAuthError(error)) {
              liveStreamManager.cleanup();
              logoutUser();
              showToast("Your session expired. Log in again, then start a new stream.", "error");
              this.stream = null;
              void navigate("login", null, { historyMode: "replace", skipTransition: true });
            } else {
              showToast(error.message || "Could not end stream.", "error");
            }
            endButton.disabled = false;
          }
        }
      });
    });
  }

  async shareStreamLink() {
    const url = buildLiveStreamShareUrl(this.stream.id);
    const text = this.createShareMessage(this.stream);

    try {
      if (navigator.share) {
        await navigator.share({
          title: text,
          text,
          url
        });
        return;
      }

      await navigator.clipboard.writeText(`${text}\n${url}`);
      showToast("Live stream link copied.", "success");
    } catch (error) {
      if (error?.name !== "AbortError") {
        showToast("Could not share the live stream link.", "error");
      }
    }
  }

  createShareMessage(stream) {
    return [
      `${this.currentUser.username} is live on yahneh, order of the day`,
      stream?.title,
      stream?.description
    ].filter((part) => typeof part === "string" && part.trim()).join(" ");
  }

  destroy() {
    this.cleanupLiveView();
  }

  cleanupLiveView() {
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
    this.durationTimerId = null;
  }
}
