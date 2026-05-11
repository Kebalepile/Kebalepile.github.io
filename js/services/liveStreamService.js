import { apiRequest } from "./apiClient.js";
import { broadcast, registerMessageListener } from "./liveSyncService.js";
import { getAuthenticatedUser } from "./authService.js";
import { validateImageUrl } from "../utils/validators.js";

const ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302"] },
  { urls: ["stun:stun1.l.google.com:19302"] },
  // Free TURN servers for production NAT traversal
  { urls: ["turn:openrelay.metered.ca:80"], username: "openrelayproject", credential: "openrelayproject" },
  { urls: ["turn:openrelay.metered.ca:443"], username: "openrelayproject", credential: "openrelayproject" },
  { urls: ["turn:openrelay.metered.ca:443?transport=tcp"], username: "openrelayproject", credential: "openrelayproject" }
];
const CAMERA_VIDEO_WIDTH = 640;
const CAMERA_VIDEO_HEIGHT = 360;
const CAMERA_VIDEO_FRAMERATE = 20;
const CAMERA_VIDEO_MAX_BITRATE = 350_000;
const SCREEN_VIDEO_MAX_BITRATE = 600_000;
const AUDIO_MAX_BITRATE = 32_000;
const RELAY_TRANSPORT_ENABLED = false;
const RELAY_CHUNK_INTERVAL_MS = 1000;
const RELAY_VIDEO_BITRATE = 350_000;
const RELAY_AUDIO_BITRATE = 32_000;
const ADAPTIVE_QUALITY_INTERVAL_MS = 5000;
const ADAPTIVE_QUALITY_STABLE_SAMPLES = 3;
const VIDEO_QUALITY_LEVELS = ["low", "medium", "high"];
const VIDEO_QUALITY_PROFILES = {
  camera: {
    low: { maxBitrate: 450_000, maxFramerate: 18, scaleResolutionDownBy: 1.5 },
    medium: { maxBitrate: 650_000, maxFramerate: 20, scaleResolutionDownBy: 1.15 },
    high: { maxBitrate: CAMERA_VIDEO_MAX_BITRATE, maxFramerate: CAMERA_VIDEO_FRAMERATE, scaleResolutionDownBy: 1 }
  },
  screen: {
    low: { maxBitrate: 700_000, maxFramerate: 15, scaleResolutionDownBy: 1 },
    medium: { maxBitrate: 950_000, maxFramerate: 18, scaleResolutionDownBy: 1 },
    high: { maxBitrate: SCREEN_VIDEO_MAX_BITRATE, maxFramerate: 24, scaleResolutionDownBy: 1 }
  }
};

function shouldPreferPortraitCamera() {
  if (!isProbablyMobileDevice() || typeof window === "undefined") {
    return false;
  }

  return window.innerHeight >= window.innerWidth;
}

function createCameraConstraints(facingMode = "user", { exact = false } = {}) {
  const preferPortrait = shouldPreferPortraitCamera();
  const width = preferPortrait ? CAMERA_VIDEO_HEIGHT : CAMERA_VIDEO_WIDTH;
  const height = preferPortrait ? CAMERA_VIDEO_WIDTH : CAMERA_VIDEO_HEIGHT;

  return {
    width: { ideal: width, max: preferPortrait ? 720 : 1280 },
    height: { ideal: height, max: preferPortrait ? 1280 : 720 },
    aspectRatio: { ideal: width / height },
    frameRate: { ideal: CAMERA_VIDEO_FRAMERATE, max: CAMERA_VIDEO_FRAMERATE },
    facingMode: exact ? { exact: facingMode } : { ideal: facingMode },
    resizeMode: { ideal: "none" }
  };
}

function getFacingModesFromTrack(track) {
  if (!track || typeof track.getCapabilities !== "function") {
    return [];
  }

  try {
    const facingMode = track.getCapabilities()?.facingMode;
    return Array.isArray(facingMode) ? facingMode : [];
  } catch {
    return [];
  }
}

function getTrackFacingMode(track) {
  if (!track || typeof track.getSettings !== "function") {
    return "";
  }

  try {
    return track.getSettings()?.facingMode || "";
  } catch {
    return "";
  }
}

function isProbablyMobileDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || "";
  const isMobileUserAgent = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const isDesktopModeIpad =
    /Macintosh/i.test(userAgent) && Number(navigator.maxTouchPoints || 0) > 1;

  return isMobileUserAgent || isDesktopModeIpad;
}

function getVideoQualityProfile({ screenShare = false, qualityLevel = "high" } = {}) {
  const profileSet = screenShare ? VIDEO_QUALITY_PROFILES.screen : VIDEO_QUALITY_PROFILES.camera;
  return profileSet[qualityLevel] || profileSet.high;
}

async function tuneVideoSender(sender, { screenShare = false, qualityLevel = "high" } = {}) {
  if (!sender || typeof sender.getParameters !== "function") {
    return;
  }

  try {
    const profile = getVideoQualityProfile({ screenShare, qualityLevel });
    const parameters = sender.getParameters();
    const encodings = Array.isArray(parameters.encodings) && parameters.encodings.length
      ? parameters.encodings
      : [{}];

    parameters.encodings = encodings.map((encoding) => ({
      ...encoding,
      maxBitrate: profile.maxBitrate,
      maxFramerate: profile.maxFramerate,
      scaleResolutionDownBy: profile.scaleResolutionDownBy
    }));
    parameters.degradationPreference = screenShare ? "maintain-resolution" : "balanced";

    try {
      await sender.setParameters(parameters);
    } catch {
      delete parameters.degradationPreference;
      try {
        await sender.setParameters(parameters);
      } catch {
        parameters.encodings = parameters.encodings.map((encoding) => {
          const nextEncoding = { ...encoding };

          delete nextEncoding.scaleResolutionDownBy;
          return nextEncoding;
        });
        await sender.setParameters(parameters);
      }
    }
  } catch {
    // Some mobile browsers expose partial RTCRtpSender controls. Keep streaming if tuning fails.
  }
}

async function tuneAudioSender(sender) {
  if (!sender || typeof sender.getParameters !== "function") {
    return;
  }

  try {
    const parameters = sender.getParameters();
    const encodings = Array.isArray(parameters.encodings) && parameters.encodings.length
      ? parameters.encodings
      : [{}];

    parameters.encodings = encodings.map((encoding) => ({
      ...encoding,
      maxBitrate: AUDIO_MAX_BITRATE
    }));

    await sender.setParameters(parameters);
  } catch {
    // Audio sender tuning is best-effort across mobile browsers.
  }
}

function setVideoTrackContentHint(track, { screenShare = false } = {}) {
  if (track && "contentHint" in track) {
    track.contentHint = screenShare ? "detail" : "motion";
  }
}

function parseJsonMessage(value) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getSupportedRelayMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9,opus",
    "video/webm"
  ];

  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || "";
}

function canBroadcastRelay() {
  return RELAY_TRANSPORT_ENABLED &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(getSupportedRelayMimeType());
}

function canPlayRelay() {
  return RELAY_TRANSPORT_ENABLED &&
    typeof MediaSource !== "undefined" &&
    typeof URL !== "undefined" &&
    Boolean(MediaSource.isTypeSupported?.("video/webm;codecs=vp8,opus") ||
      MediaSource.isTypeSupported?.("video/webm"));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      resolve(String(reader.result || ""));
    });
    reader.addEventListener("error", () => reject(reader.error || new Error("Could not read stream chunk.")));
    reader.readAsDataURL(blob);
  });
}

async function blobToBase64(blob) {
  const dataUrl = await blobToDataUrl(blob);
  const commaIndex = dataUrl.indexOf(",");

  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : "";
}

function base64ToArrayBuffer(value) {
  const rawValue = typeof value === "string" ? value.trim() : "";
  const commaIndex = rawValue.indexOf(",");
  const withoutPrefix = commaIndex >= 0 ? rawValue.slice(commaIndex + 1) : rawValue;
  const normalized = withoutPrefix
    .replace(/[\r\n\s]/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  if (!padded || !/^[A-Za-z0-9+/]*={0,2}$/.test(padded)) {
    return null;
  }

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

class LiveStreamManager {
  constructor() {
    this.streamId = "";
    this.localStream = null;
    this.isBroadcaster = false;
    this.isScreenSharing = false;
    this.originalVideoTrack = null;
    this.screenVideoTrack = null;
    this.cameraFacingMode = "user";
    this.canSwitchCamera = false;
    this.cameraDevices = [];
    this.viewerPeerConnection = null;
    this.viewerSessionVersion = 0;
    this.broadcasterPeerConnections = new Map();
    this.remoteStreams = new Map();
    this.listeners = new Set();
    this.unsubscribeRealtime = null;
    this.intentionallyLeftStreams = new Set();
    this.adaptiveQualityTimerId = null;
    this.videoQualityLevel = "high";
    this.stableQualitySampleCount = 0;
    this.previousOutboundVideoStats = new Map();
    this.adaptiveQualityUpdateInFlight = false;
    this.relayRecorder = null;
    this.relayMimeType = "";
    this.relaySequence = 0;
    this.relayPlaybackMediaSource = null;
    this.relayPlaybackSourceBuffer = null;
    this.relayPlaybackUrl = "";
    this.relayAppendQueue = [];
    this.relayPlaybackStarted = false;
    this.relayOutboundKbps = 0;
    this.pendingIceCandidates = new Map();
  }

  async openBroadcastMedia() {
    if (
      typeof navigator === "undefined" ||
      typeof navigator.mediaDevices?.getUserMedia !== "function"
    ) {
      throw new Error("Camera and microphone are not available in this browser.");
    }

    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: createCameraConstraints(this.cameraFacingMode)
    });
  }

  async activateBroadcastSession(stream, localStream, eventName) {
    this.localStream = localStream;
    this.originalVideoTrack = localStream?.getVideoTracks()[0] || null;
    setVideoTrackContentHint(this.originalVideoTrack);
    this.screenVideoTrack = null;
    this.isScreenSharing = false;
    this.streamId = String(stream?.id || stream?._id || "");
    this.isBroadcaster = true;
    await this.refreshCameraCapabilities();
    this.connectSignaling();
    this.startRelayBroadcast();
    this.startAdaptiveQualityMonitor();
    this.notify(eventName, {
      stream,
      localStream: this.localStream
    });

    return stream;
  }

  async startBroadcast(title, description = "", coverImage = "") {
    const existingStream = await this.getMyActiveStream();

    if (existingStream?.id) {
      throw new Error("You already have a live stream. Open your current stream instead.");
    }

    let pendingLocalStream = null;

    try {
      pendingLocalStream = await this.openBroadcastMedia();
    } catch (error) {
      throw error;
    }

    let response = null;

    try {
      const suppliedCoverImage =
        typeof coverImage === "string" ? coverImage.trim() : "";
      const safeCoverImage = validateImageUrl(suppliedCoverImage);

      response = await apiRequest("/livestreams", {
        method: "POST",
        body: { title, description, coverImage: safeCoverImage }
      });
    } catch (error) {
      pendingLocalStream?.getTracks().forEach((track) => track.stop());
      throw error;
    }
    const stream = response.stream;

    this.cleanupConnections();
    return this.activateBroadcastSession(stream, pendingLocalStream, "broadcast-started");
  }

  async resumeBroadcast(stream = null) {
    const activeStream = stream || (await this.getMyActiveStream());
    const activeStreamId = String(activeStream?.id || activeStream?._id || "");

    if (!activeStreamId) {
      throw new Error("No active live stream was found to reconnect.");
    }

    if (activeStream.status && activeStream.status !== "active") {
      throw new Error("This live stream has already ended.");
    }

    if (this.isBroadcaster && this.streamId === activeStreamId && this.localStream) {
      this.announceBroadcasterReady();
      return activeStream;
    }

    const pendingLocalStream = await this.openBroadcastMedia();

    this.cleanupConnections();
    const resumedStream = await this.activateBroadcastSession(
      { ...activeStream, id: activeStreamId },
      pendingLocalStream,
      "broadcast-resumed"
    );
    this.announceBroadcasterReady();

    return resumedStream;
  }

  announceBroadcasterReady() {
    this.sendSignalingMessage({
      type: "stream:broadcaster-ready"
    });
  }

  startRelayBroadcast({ restart = false } = {}) {
    if (!this.isBroadcaster || !this.streamId || !this.localStream || !canBroadcastRelay()) {
      return false;
    }

    if (this.relayRecorder && !restart) {
      return true;
    }

    this.stopRelayBroadcast({ notifyServer: restart });
    this.relayMimeType = getSupportedRelayMimeType();
    this.relaySequence = 0;

    try {
      const recorder = new MediaRecorder(this.localStream, {
        mimeType: this.relayMimeType,
        videoBitsPerSecond: RELAY_VIDEO_BITRATE,
        audioBitsPerSecond: RELAY_AUDIO_BITRATE
      });

      this.relayRecorder = recorder;
      recorder.addEventListener("dataavailable", (event) => {
        if (!event.data || event.data.size <= 0 || recorder !== this.relayRecorder) {
          return;
        }

        void this.sendRelayChunk(event.data);
      });
      recorder.addEventListener("stop", () => {
        if (recorder === this.relayRecorder) {
          this.relayRecorder = null;
        }
      });
      this.sendSignalingMessage({
        type: "stream:relay-start",
        mimeType: this.relayMimeType
      });
      recorder.start(RELAY_CHUNK_INTERVAL_MS);
      this.notify("relay-broadcast-started", { mimeType: this.relayMimeType });
      return true;
    } catch {
      this.relayRecorder = null;
      return false;
    }
  }

  async sendRelayChunk(blob) {
    if (!this.isBroadcaster || !this.streamId || !this.relayRecorder) {
      return;
    }

    try {
      const chunk = await blobToBase64(blob);

      if (!chunk) {
        return;
      }

      const sequence = this.relaySequence;
      this.relaySequence += 1;
      this.relayOutboundKbps = Math.round(
        ((chunk.length * 0.75 * 8) / RELAY_CHUNK_INTERVAL_MS)
      );
      this.notify("relay-stats-changed", {
        outboundKbps: this.relayOutboundKbps,
        mimeType: this.relayMimeType
      });
      this.sendSignalingMessage({
        type: "stream:relay-chunk",
        mimeType: this.relayMimeType,
        chunk,
        sequence,
        isInit: sequence === 0
      });
    } catch {
      // Keep the stream alive if a single chunk fails to encode for relay transport.
    }
  }

  stopRelayBroadcast({ notifyServer = true } = {}) {
    const recorder = this.relayRecorder;

    this.relayRecorder = null;

    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Ignore recorder shutdown errors while leaving or switching media.
      }
    }

    if (notifyServer && this.streamId && this.isBroadcaster) {
      this.sendSignalingMessage({
        type: "stream:relay-stop"
      });
    }
    this.relayOutboundKbps = 0;
  }

  getRelayStats() {
    return {
      active: Boolean(this.relayRecorder),
      outboundKbps: this.relayOutboundKbps,
      mimeType: this.relayMimeType
    };
  }

  restartRelayBroadcast() {
    if (!this.isBroadcaster || !canBroadcastRelay()) {
      return;
    }

    const schedule = typeof window !== "undefined" ? window.setTimeout.bind(window) : setTimeout;

    schedule(() => {
      this.startRelayBroadcast({ restart: true });
    }, 200);
  }

  async shareScreen() {
    if (!this.isBroadcaster || this.isScreenSharing) {
      return;
    }

    if (typeof navigator.mediaDevices?.getDisplayMedia !== "function") {
      throw new Error("Screen sharing is not available in this browser.");
    }

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "always" },
      audio: false
    });
    const screenVideoTrack = screenStream.getVideoTracks()[0];

    setVideoTrackContentHint(screenVideoTrack, { screenShare: true });
    this.originalVideoTrack = this.localStream?.getVideoTracks()[0] || null;
    this.screenVideoTrack = screenVideoTrack;

    await this.replaceOutgoingVideoTrack(screenVideoTrack, {
      screenShare: true,
      stopPrevious: false
    });
    this.isScreenSharing = true;
    screenVideoTrack.addEventListener("ended", () => {
      void this.stopScreenSharing();
    });
    this.notify("screen-sharing-started", {
      track: screenVideoTrack,
      localStream: this.localStream
    });
    this.broadcastMediaState();
  }

  async stopScreenSharing() {
    if (!this.isScreenSharing || !this.originalVideoTrack) {
      return;
    }

    const screenTrack = this.screenVideoTrack;

    setVideoTrackContentHint(this.originalVideoTrack);
    await this.replaceOutgoingVideoTrack(this.originalVideoTrack, { stopPrevious: false });
    screenTrack?.stop();
    this.screenVideoTrack = null;
    this.isScreenSharing = false;
    this.notify("screen-sharing-stopped", {
      localStream: this.localStream
    });
    this.broadcastMediaState();
  }

  getVideoSenders() {
    return Array.from(this.broadcasterPeerConnections.values())
      .flatMap((peerConnection) => peerConnection.getSenders())
      .filter((sender) => sender.track?.kind === "video" || sender.track === null);
  }

  async applyVideoQualityProfile() {
    if (!this.isBroadcaster) {
      return;
    }

    await Promise.all(
      this.getVideoSenders().map((sender) =>
        tuneVideoSender(sender, {
          screenShare: this.isScreenSharing,
          qualityLevel: this.videoQualityLevel
        })
      )
    );
    this.notify("stream-quality-changed", {
      qualityLevel: this.videoQualityLevel,
      profile: getVideoQualityProfile({
        screenShare: this.isScreenSharing,
        qualityLevel: this.videoQualityLevel
      })
    });
  }

  async replaceOutgoingVideoTrack(nextTrack, { screenShare = false, stopPrevious = true } = {}) {
    const previousTracks = this.localStream?.getVideoTracks() || [];

    setVideoTrackContentHint(nextTrack, { screenShare });

    await Promise.all(
      this.getVideoSenders().map(async (sender) => {
        await sender.replaceTrack(nextTrack);
        await tuneVideoSender(sender, {
          screenShare,
          qualityLevel: this.videoQualityLevel
        });
      })
    );

    if (this.localStream) {
      previousTracks.forEach((track) => {
        this.localStream.removeTrack(track);
        if (stopPrevious && track !== nextTrack && track !== this.originalVideoTrack) {
          track.stop();
        }
      });

      if (nextTrack) {
        this.localStream.addTrack(nextTrack);
      }
    }

    this.notify("local-stream-updated", {
      localStream: this.localStream,
      track: nextTrack
    });
    this.restartRelayBroadcast();
  }

  setCameraEnabled(enabled) {
    const nextEnabled = Boolean(enabled);
    const tracks = this.isScreenSharing && this.originalVideoTrack
      ? [this.originalVideoTrack]
      : this.localStream?.getVideoTracks() || [];

    tracks.forEach((track) => {
      track.enabled = nextEnabled;
    });
    this.notify("media-state-changed", this.getMediaState());
    this.broadcastMediaState();
  }

  setMicrophoneEnabled(enabled) {
    const nextEnabled = Boolean(enabled);
    (this.localStream?.getAudioTracks() || []).forEach((track) => {
      track.enabled = nextEnabled;
    });
    this.notify("media-state-changed", this.getMediaState());
    this.broadcastMediaState();
  }

  setAllMediaEnabled(enabled) {
    this.setCameraEnabled(enabled);
    this.setMicrophoneEnabled(enabled);
  }

  async switchCamera() {
    if (!this.isBroadcaster) {
      return this.getMediaState();
    }

    await this.refreshCameraCapabilities();

    if (!this.canSwitchCamera) {
      throw new Error("This device does not expose front and back cameras.");
    }

    if (this.isScreenSharing) {
      await this.stopScreenSharing();
    }

    const nextFacingMode = this.cameraFacingMode === "user" ? "environment" : "user";
    const previousVideoTrack = this.localStream?.getVideoTracks()[0] || this.originalVideoTrack;
    const wasCameraEnabled = previousVideoTrack ? previousVideoTrack.enabled !== false : true;

    previousVideoTrack?.stop();

    let cameraStream = null;

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: createCameraConstraints(nextFacingMode, { exact: true }),
        audio: false
      });
    } catch {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: createCameraConstraints(nextFacingMode),
        audio: false
      });
    }

    const nextVideoTrack = cameraStream.getVideoTracks()[0];

    if (!nextVideoTrack) {
      cameraStream.getTracks().forEach((track) => track.stop());
      throw new Error("Could not open the other camera.");
    }

    const resolvedFacingMode = getTrackFacingMode(nextVideoTrack);
    nextVideoTrack.enabled = wasCameraEnabled;
    setVideoTrackContentHint(nextVideoTrack);
    this.cameraFacingMode = nextFacingMode;
    this.originalVideoTrack = nextVideoTrack;
    await this.replaceOutgoingVideoTrack(nextVideoTrack);
    this.cameraFacingMode = resolvedFacingMode || nextFacingMode;
    await this.refreshCameraCapabilities();
    this.notify("camera-facing-mode-changed", this.getMediaState());
    return this.getMediaState();
  }

  async refreshCameraCapabilities() {
    const cameraTrack = this.localStream?.getVideoTracks()[0] || this.originalVideoTrack;
    const facingModes = getFacingModesFromTrack(cameraTrack);
    let videoDevices = [];

    if (typeof navigator.mediaDevices?.enumerateDevices === "function") {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter((device) => device.kind === "videoinput");
      } catch {
        videoDevices = [];
      }
    }

    const labelText = videoDevices
      .map((device) => device.label || "")
      .join(" ")
      .toLowerCase();
    const hasFrontLabel = /\b(front|user|selfie|facetime)\b/i.test(labelText);
    const hasBackLabel = /\b(back|rear|environment|world)\b/i.test(labelText);
    const hasFacingModePair =
      facingModes.includes("user") && facingModes.includes("environment");
    const hasMobileMultiCameraFallback =
      isProbablyMobileDevice() && videoDevices.length > 1;
    const canUseMobileCameraFlip = isProbablyMobileDevice();

    this.cameraDevices = videoDevices;
    this.canSwitchCamera =
      canUseMobileCameraFlip &&
      (hasFacingModePair ||
        (hasFrontLabel && hasBackLabel) ||
        hasMobileMultiCameraFallback);
    this.notify("camera-capabilities-changed", this.getMediaState());

    return this.canSwitchCamera;
  }

  getMediaState() {
    const cameraTrack = this.isScreenSharing && this.originalVideoTrack
      ? this.originalVideoTrack
      : this.localStream?.getVideoTracks()[0] || null;
    const audioTrack = this.localStream?.getAudioTracks()[0] || null;

    return {
      cameraEnabled: cameraTrack ? cameraTrack.enabled !== false : false,
      microphoneEnabled: audioTrack ? audioTrack.enabled !== false : false,
      allMediaEnabled:
        (!cameraTrack || cameraTrack.enabled !== false) &&
        (!audioTrack || audioTrack.enabled !== false),
      isScreenSharing: this.isScreenSharing,
      cameraFacingMode: this.cameraFacingMode,
      canSwitchCamera: this.canSwitchCamera,
      cameraDeviceCount: this.cameraDevices.length
    };
  }

  async endBroadcast() {
    const streamId = this.streamId;
    let response = {};

    if (streamId) {
      response = await apiRequest(`/livestreams/${streamId}/end`, {
        method: "POST"
      });
    }

    this.cleanupConnections();
    this.notify("broadcast-ended", { streamId });
    this.resetState();
    return response;
  }

  async endStream(streamId) {
    const safeStreamId = String(streamId || "").trim();

    if (!safeStreamId) {
      return {};
    }

    const response = await apiRequest(`/livestreams/${safeStreamId}/end`, {
      method: "POST"
    });

    if (this.streamId === safeStreamId || this.isBroadcaster) {
      this.cleanupConnections();
      this.notify("broadcast-ended", { streamId: safeStreamId });
      this.resetState();
    }

    return response;
  }

  async getActiveStreams() {
    const response = await apiRequest("/livestreams/active");
    return response.streams || [];
  }

  async getMyActiveStream() {
    const response = await apiRequest("/livestreams/mine/active");
    return response.stream || null;
  }

  async getStream(streamId) {
    const response = await apiRequest(`/livestreams/${streamId}`);
    return response.stream || null;
  }

  async strikeViewer(streamId, viewerId) {
    return apiRequest(`/livestreams/${streamId}/viewers/${viewerId}/strike`, {
      method: "POST"
    });
  }

  async muteViewer(streamId, viewerId) {
    return apiRequest(`/livestreams/${streamId}/viewers/${viewerId}/mute`, {
      method: "POST"
    });
  }

  async kickViewer(streamId, viewerId) {
    return apiRequest(`/livestreams/${streamId}/viewers/${viewerId}/kick`, {
      method: "POST"
    });
  }

  setupRelayPlayback() {
    this.teardownRelayPlayback();

    if (!canPlayRelay()) {
      return "";
    }

    const mediaSource = new MediaSource();
    const objectUrl = URL.createObjectURL(mediaSource);

    this.relayPlaybackMediaSource = mediaSource;
    this.relayPlaybackUrl = objectUrl;
    this.relayAppendQueue = [];
    this.relayPlaybackStarted = false;

    mediaSource.addEventListener("sourceopen", () => {
      this.flushRelayAppendQueue();
    });

    this.notify("relay-playback-ready", { objectUrl });
    return objectUrl;
  }

  teardownRelayPlayback() {
    this.relayAppendQueue = [];
    this.relayPlaybackStarted = false;
    this.relayPlaybackSourceBuffer = null;

    if (this.relayPlaybackUrl && typeof URL !== "undefined") {
      URL.revokeObjectURL(this.relayPlaybackUrl);
    }

    this.relayPlaybackUrl = "";
    this.relayPlaybackMediaSource = null;
  }

  ensureRelaySourceBuffer(mimeType = "video/webm") {
    if (!this.relayPlaybackMediaSource || this.relayPlaybackSourceBuffer) {
      return Boolean(this.relayPlaybackSourceBuffer);
    }

    if (this.relayPlaybackMediaSource.readyState !== "open") {
      return false;
    }

    const safeMimeType = mimeType || "video/webm";

    try {
      this.relayPlaybackSourceBuffer = this.relayPlaybackMediaSource.addSourceBuffer(safeMimeType);
    } catch {
      try {
        this.relayPlaybackSourceBuffer = this.relayPlaybackMediaSource.addSourceBuffer("video/webm");
      } catch {
        this.notify("relay-playback-error", {});
        return false;
      }
    }

    this.relayPlaybackSourceBuffer.mode = "sequence";
    this.relayPlaybackSourceBuffer.addEventListener("updateend", () => {
      this.flushRelayAppendQueue();
    });
    return true;
  }

  appendRelayChunk(message) {
    if (!this.relayPlaybackMediaSource || !message?.chunk) {
      return;
    }

    let buffer = null;

    try {
      buffer = base64ToArrayBuffer(message.chunk);
    } catch {
      buffer = null;
    }

    if (!buffer) {
      return;
    }

    this.relayAppendQueue.push({
      mimeType: message.mimeType || "video/webm",
      buffer,
      isInit: message.isInit === true
    });
    this.flushRelayAppendQueue();
  }

  flushRelayAppendQueue() {
    if (!this.relayAppendQueue.length || !this.relayPlaybackMediaSource) {
      return;
    }

    const nextChunk = this.relayAppendQueue[0];

    if (!this.ensureRelaySourceBuffer(nextChunk.mimeType)) {
      return;
    }

    if (this.relayPlaybackSourceBuffer.updating) {
      return;
    }

    try {
      this.relayPlaybackSourceBuffer.appendBuffer(nextChunk.buffer);
      this.relayAppendQueue.shift();

      if (!this.relayPlaybackStarted) {
        this.relayPlaybackStarted = true;
        this.notify("relay-stream-added", {});
      }
    } catch {
      this.relayAppendQueue.shift();
    }
  }

  async joinStream(streamId) {
    const safeStreamId = String(streamId || "").trim();

    if (!safeStreamId) {
      throw new Error("This live stream link is missing a stream id.");
    }

    this.viewerPeerConnection?.close();
    this.viewerPeerConnection = null;
    this.remoteStreams.clear();
    this.viewerSessionVersion += 1;
    this.streamId = safeStreamId;
    this.isBroadcaster = false;
    this.intentionallyLeftStreams.delete(safeStreamId);

    let response = null;

    try {
      response = await apiRequest(`/livestreams/${safeStreamId}/join`, {
        method: "POST"
      });
    } catch (error) {
      this.viewerPeerConnection?.close();
      this.viewerPeerConnection = null;
      this.remoteStreams.clear();
      this.resetState();
      throw error;
    }

    this.connectSignaling();
    this.viewerPeerConnection = this.createPeerConnection();
    this.notify("viewer-joined", response);

    return response;
  }

  async rejoinStream(streamId = this.streamId) {
    const safeStreamId = String(streamId || "").trim();

    if (!safeStreamId || this.intentionallyLeftStreams.has(safeStreamId)) {
      return null;
    }

    this.notify("viewer-reconnecting", { streamId: safeStreamId });
    return this.joinStream(safeStreamId);
  }

  requestPeerFallback() {
    if (this.isBroadcaster || !this.streamId || this.viewerPeerConnection) {
      return;
    }

    this.teardownRelayPlayback();
    this.viewerPeerConnection = this.createPeerConnection();
    this.notify("viewer-reconnecting", { streamId: this.streamId });
    this.sendSignalingMessage({
      type: "stream:relay-fallback-request"
    });
  }

  async leaveStream(streamId = this.streamId) {
    const safeStreamId = String(streamId || "").trim();
    const leaveSessionVersion = this.viewerSessionVersion;

    if (safeStreamId) {
      this.intentionallyLeftStreams.add(safeStreamId);
    }

    let response = null;

    if (safeStreamId) {
      response = await apiRequest(`/livestreams/${safeStreamId}/leave`, {
        method: "POST"
      }).catch(() => null);
    }

    if (Number.isFinite(response?.viewerCount)) {
      this.notify("viewer-count-changed", { viewerCount: response.viewerCount });
    }

    if (this.viewerSessionVersion !== leaveSessionVersion) {
      return response;
    }

    if (safeStreamId && this.relayPlaybackMediaSource) {
      this.sendSignalingMessage({
        type: "stream:relay-unsubscribe"
      });
    }

    this.cleanupConnections();
    this.notify("viewer-left", { streamId: safeStreamId });
    this.resetState();

    return response;
  }

  connectSignaling() {
    if (this.unsubscribeRealtime) {
      return;
    }

    this.unsubscribeRealtime = registerMessageListener("stream:*", (message) => {
      void this.handleSignalingMessage(message);
    });
  }

  queueIceCandidate(userId = "", candidate) {
    if (!candidate) {
      return;
    }

    const safeUserId = String(userId || "").trim();
    const queuedCandidates = this.pendingIceCandidates.get(safeUserId) || [];
    queuedCandidates.push(candidate);
    this.pendingIceCandidates.set(safeUserId, queuedCandidates);
    console.log(`[LiveStreamService] Queued ICE candidate for ${safeUserId}, total queued: ${queuedCandidates.length}`);
  }

  async flushPendingIceCandidates(userId = "", peerConnection) {
    if (!peerConnection || !peerConnection.remoteDescription || !peerConnection.remoteDescription.type) {
      return;
    }

    const safeUserId = String(userId || "").trim();
    const queuedCandidates = this.pendingIceCandidates.get(safeUserId);

    if (!Array.isArray(queuedCandidates) || queuedCandidates.length === 0) {
      return;
    }

    this.pendingIceCandidates.delete(safeUserId);
    console.log(`[LiveStreamService] Flushing ${queuedCandidates.length} queued ICE candidates for ${safeUserId}`);

    for (const candidate of queuedCandidates) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore candidates that still fail after remote description is available.
      }
    }
  }

  createPeerConnection(targetUserId = "") {
    console.log(`[LiveStreamService] Creating peer connection for ${targetUserId || 'viewer'}`);
    const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    peerConnection.ondatachannel = (event) => {
      if (event.channel?.label === "live-media-state") {
        this.bindMediaStateChannel(event.channel);
      }
    };

    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams?.[0];

      if (!remoteStream) {
        return;
      }

      console.log(`[LiveStreamService] Received remote track for ${targetUserId || event.track.id}`);
      this.remoteStreams.set(targetUserId || event.track.id, remoteStream);
      this.notify("remote-stream-added", {
        stream: remoteStream,
        trackId: event.track.id,
        userId: targetUserId
      });
    };

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      console.log(`[LiveStreamService] Generated ICE candidate for ${targetUserId}`);
      this.sendSignalingMessage({
        type: "stream:ice-candidate",
        candidate: event.candidate,
        targetUserId
      });
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(`[LiveStreamService] Connection state changed to ${peerConnection.connectionState} for ${targetUserId}`);
      this.notify("connection-state-changed", {
        state: peerConnection.connectionState,
        userId: targetUserId
      });
    };

    return peerConnection;
  }

  bindMediaStateChannel(channel, { sendCurrentState = false } = {}) {
    if (!channel) {
      return;
    }

    channel.onmessage = (event) => {
      const message = parseJsonMessage(event.data);

      if (message?.type === "stream:media-state") {
        this.notify("remote-media-state-changed", message.state || {});
      }
    };

    if (sendCurrentState && this.isBroadcaster) {
      const sendState = () => this.sendMediaStateOverChannel(channel);

      if (channel.readyState === "open") {
        sendState();
      } else {
        channel.addEventListener?.("open", sendState, { once: true });
      }
    }
  }

  sendMediaStateOverChannel(channel, state = this.getMediaState()) {
    if (!channel || channel.readyState !== "open") {
      return false;
    }

    try {
      channel.send(
        JSON.stringify({
          type: "stream:media-state",
          state,
          timestamp: Date.now()
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  broadcastMediaStateOverPeerConnections(state = this.getMediaState(), targetUserId = "") {
    const entries = targetUserId
      ? [[targetUserId, this.broadcasterPeerConnections.get(targetUserId)]]
      : Array.from(this.broadcasterPeerConnections.entries());

    entries.forEach(([, peerConnection]) => {
      this.sendMediaStateOverChannel(peerConnection?.liveMediaStateChannel, state);
    });
  }

  async handleViewerJoined(message, { forcePeer = false } = {}) {
    if (!this.isBroadcaster || !this.localStream || message.viewerId === getAuthenticatedUser()?.id) {
      return;
    }

    if (canBroadcastRelay() && !forcePeer) {
      this.broadcastMediaState(message.viewerId);
      return;
    }

    const viewerId = message.viewerId;
    const peerConnection = this.createPeerConnection(viewerId);
    const mediaStateChannel = peerConnection.createDataChannel("live-media-state");

    peerConnection.liveMediaStateChannel = mediaStateChannel;
    this.bindMediaStateChannel(mediaStateChannel, { sendCurrentState: true });

    for (const track of this.localStream.getTracks()) {
      const sender = peerConnection.addTrack(track, this.localStream);

      if (track.kind === "video") {
        setVideoTrackContentHint(track, { screenShare: this.isScreenSharing });
        await tuneVideoSender(sender, {
          screenShare: this.isScreenSharing,
          qualityLevel: this.videoQualityLevel
        });

        const transceiver = peerConnection
          .getTransceivers()
          .find((item) => item.sender === sender);

        if (
          transceiver &&
          typeof transceiver.setCodecPreferences === "function" &&
          typeof RTCRtpSender !== "undefined" &&
          typeof RTCRtpSender.getCapabilities === "function"
        ) {
          const capabilities = RTCRtpSender.getCapabilities("video");
          const vp8Codecs = (capabilities?.codecs || []).filter((codec) =>
            /video\/VP8/i.test(codec.mimeType)
          );

          if (vp8Codecs.length) {
            transceiver.setCodecPreferences(vp8Codecs);
          }
        }
      } else if (track.kind === "audio") {
        await tuneAudioSender(sender);
      }
    }

    this.broadcasterPeerConnections.set(viewerId, peerConnection);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    this.sendSignalingMessage({
      type: "stream:offer",
      offer: peerConnection.localDescription,
      targetUserId: viewerId
    });
    this.broadcastMediaState(viewerId);
  }

  async handleSignalingMessage(message) {
    if (!message || message.streamId !== this.streamId) {
      return;
    }

    const currentUserId = getAuthenticatedUser()?.id || "";

    if (message.userId === currentUserId && message.type !== "stream:viewer-joined") {
      return;
    }

    if (message.targetUserId && message.targetUserId !== currentUserId && !this.isBroadcaster) {
      return;
    }

    if (message.type === "stream:viewer-joined") {
      await this.handleViewerJoined(message);
      this.notify("viewer-joined", message);
      this.notify("viewer-count-changed", { viewerCount: message.viewerCount });
      return;
    }

    if (message.type === "stream:broadcaster-ready") {
      if (!this.isBroadcaster) {
        this.notify("broadcaster-ready", message);

        if (!this.streamId && !this.viewerPeerConnection) {
          await this.rejoinStream(message.streamId);
        } else {
          console.log(
            `[LiveStreamService] Ignoring duplicate broadcaster-ready for stream ${message.streamId}; ` +
            `already joined stream=${this.streamId} viewerPeerConnection=${Boolean(this.viewerPeerConnection)}`
          );
        }
      }

      return;
    }

    if (message.type === "stream:viewer-left" || message.type === "stream:viewer-count") {
      if (message.type === "stream:viewer-left") {
        this.notify("viewer-left", message);
      }
      this.notify("viewer-count-changed", { viewerCount: message.viewerCount });
      return;
    }

    if (message.type === "stream:ended") {
      this.notify("stream-ended", message);
      return;
    }

    if (message.type === "stream:media-state") {
      this.notify("remote-media-state-changed", message.state || {});
      return;
    }

    if (message.type === "stream:relay-start") {
      if (!this.isBroadcaster) {
        this.notify("relay-stream-started", { mimeType: message.mimeType || "video/webm" });
      }
      return;
    }

    if (message.type === "stream:relay-chunk") {
      if (!this.isBroadcaster) {
        this.appendRelayChunk(message);
      }
      return;
    }

    if (message.type === "stream:relay-stop") {
      if (!this.isBroadcaster) {
        this.notify("relay-stream-stopped", message);
      }
      return;
    }

    if (message.type === "stream:relay-fallback-request") {
      if (this.isBroadcaster) {
        await this.handleViewerJoined(message, { forcePeer: true });
      }
      return;
    }

    if (message.type === "stream:viewer-strike") {
      this.notify("viewer-strike", message);
      return;
    }

    if (message.type === "stream:viewer-muted") {
      this.notify("viewer-muted", message);
      return;
    }

    if (message.type === "stream:kicked") {
      this.notify("viewer-kicked", message);
      if (Number.isFinite(message.viewerCount)) {
        this.notify("viewer-count-changed", { viewerCount: message.viewerCount });
      }

      if (message.targetUserId === currentUserId && !this.isBroadcaster) {
        this.cleanupConnections();
        this.resetState();
      }

      return;
    }

    if (message.type === "stream:offer" && this.viewerPeerConnection) {
      console.log(`[LiveStreamService] Received offer from ${message.userId}, setting remote description`);
      await this.viewerPeerConnection.setRemoteDescription(
        new RTCSessionDescription(message.offer)
      );
      await this.flushPendingIceCandidates(message.userId, this.viewerPeerConnection);
      const answer = await this.viewerPeerConnection.createAnswer();
      await this.viewerPeerConnection.setLocalDescription(answer);
      this.sendSignalingMessage({
        type: "stream:answer",
        answer: this.viewerPeerConnection.localDescription,
        targetUserId: message.userId
      });
      return;
    }

    if (message.type === "stream:answer" && this.isBroadcaster) {
      const peerConnection = this.broadcasterPeerConnections.get(message.userId);

      if (peerConnection) {
        console.log(`[LiveStreamService] Received answer from ${message.userId}, setting remote description`);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
        await this.flushPendingIceCandidates(message.userId, peerConnection);
      }

      return;
    }

    if (message.type === "stream:ice-candidate") {
      const peerConnection = this.isBroadcaster
        ? this.broadcasterPeerConnections.get(message.userId)
        : this.viewerPeerConnection;

      if (message.candidate) {
        if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
          console.log(`[LiveStreamService] Adding ICE candidate immediately for ${message.userId}`);
          await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        } else {
          console.log(`[LiveStreamService] Queueing ICE candidate for ${message.userId} (no remote description yet)`);
          this.queueIceCandidate(message.userId, message.candidate);
        }
      }
    }
  }

  sendSignalingMessage(message) {
    return broadcast({
      ...message,
      streamId: this.streamId,
      timestamp: Date.now()
    });
  }

  broadcastMediaState(targetUserId = "") {
    if (!this.isBroadcaster || !this.streamId) {
      return;
    }

    const state = this.getMediaState();

    this.sendSignalingMessage({
      type: "stream:media-state",
      state,
      targetUserId
    });
    this.broadcastMediaStateOverPeerConnections(state, targetUserId);
  }

  startAdaptiveQualityMonitor() {
    this.stopAdaptiveQualityMonitor();
    this.videoQualityLevel = "high";
    this.stableQualitySampleCount = 0;
    this.previousOutboundVideoStats.clear();

    if (typeof window === "undefined") {
      return;
    }

    this.adaptiveQualityTimerId = window.setInterval(() => {
      void this.updateAdaptiveQuality();
    }, ADAPTIVE_QUALITY_INTERVAL_MS);
  }

  stopAdaptiveQualityMonitor() {
    if (this.adaptiveQualityTimerId && typeof window !== "undefined") {
      window.clearInterval(this.adaptiveQualityTimerId);
    }

    this.adaptiveQualityTimerId = null;
    this.adaptiveQualityUpdateInFlight = false;
    this.stableQualitySampleCount = 0;
    this.previousOutboundVideoStats.clear();
  }

  getNextQualityLevel(direction) {
    const currentIndex = VIDEO_QUALITY_LEVELS.indexOf(this.videoQualityLevel);
    const safeIndex = currentIndex >= 0 ? currentIndex : VIDEO_QUALITY_LEVELS.length - 1;
    const nextIndex = Math.min(
      Math.max(safeIndex + direction, 0),
      VIDEO_QUALITY_LEVELS.length - 1
    );

    return VIDEO_QUALITY_LEVELS[nextIndex];
  }

  async collectAdaptiveQualityStats() {
    const peerEntries = Array.from(this.broadcasterPeerConnections.entries());
    const activePeerEntries = peerEntries.filter(([, peerConnection]) =>
      peerConnection?.connectionState !== "closed" &&
      peerConnection?.connectionState !== "failed"
    );

    if (!activePeerEntries.length) {
      return { hasViewers: false, poor: false, stable: false };
    }

    const profile = getVideoQualityProfile({
      screenShare: this.isScreenSharing,
      qualityLevel: this.videoQualityLevel
    });
    let poor = false;
    let rttTotal = 0;
    let rttCount = 0;
    let worstLoss = 0;
    let availableBitrateLow = false;

    await Promise.all(activePeerEntries.map(async ([viewerId, peerConnection]) => {
      if (peerConnection.connectionState === "disconnected") {
        poor = true;
      }

      if (typeof peerConnection.getStats !== "function") {
        return;
      }

      try {
        const stats = await peerConnection.getStats();

        stats.forEach((report) => {
          if (
            report.type === "outbound-rtp" &&
            !report.isRemote &&
            (report.kind === "video" || report.mediaType === "video")
          ) {
            const previousKey = `${viewerId}:${report.id}`;
            const previous = this.previousOutboundVideoStats.get(previousKey);
            const timestamp = Number(report.timestamp) || 0;
            const bytesSent = Number(report.bytesSent) || 0;

            if (previous && timestamp > previous.timestamp) {
              const fps = Number(report.framesPerSecond) || 0;

              if (fps > 0 && fps < profile.maxFramerate * 0.65) {
                poor = true;
              }
            }

            if (
              report.qualityLimitationReason === "bandwidth" ||
              report.qualityLimitationReason === "cpu"
            ) {
              poor = true;
            }

            this.previousOutboundVideoStats.set(previousKey, { timestamp, bytesSent });
          }

          if (report.type === "remote-inbound-rtp" && (report.kind === "video" || report.mediaType === "video")) {
            const fractionLost = Number(report.fractionLost) || 0;
            const roundTripTime = Number(report.roundTripTime) || 0;

            worstLoss = Math.max(worstLoss, fractionLost);

            if (roundTripTime > 0) {
              rttTotal += roundTripTime;
              rttCount += 1;
            }
          }

          if (
            report.type === "candidate-pair" &&
            (report.selected || report.nominated) &&
            Number.isFinite(report.availableOutgoingBitrate)
          ) {
            if (report.availableOutgoingBitrate < profile.maxBitrate * 0.75) {
              availableBitrateLow = true;
            }
          }
        });
      } catch {
        poor = true;
      }
    }));

    const averageRtt = rttCount > 0 ? rttTotal / rttCount : 0;

    if (worstLoss > 0.08 || averageRtt > 0.55 || availableBitrateLow) {
      poor = true;
    }

    return {
      hasViewers: true,
      poor,
      stable: !poor && worstLoss < 0.03 && (!averageRtt || averageRtt < 0.35)
    };
  }

  async updateAdaptiveQuality() {
    if (!this.isBroadcaster || !this.streamId) {
      return;
    }

    if (this.adaptiveQualityUpdateInFlight) {
      return;
    }

    this.adaptiveQualityUpdateInFlight = true;

    try {
      const stats = await this.collectAdaptiveQualityStats();

      if (!stats.hasViewers) {
        this.videoQualityLevel = "high";
        this.stableQualitySampleCount = 0;
        this.previousOutboundVideoStats.clear();
        return;
      }

      let nextQualityLevel = this.videoQualityLevel;

      if (stats.poor) {
        nextQualityLevel = this.getNextQualityLevel(-1);
        this.stableQualitySampleCount = 0;
      } else if (stats.stable) {
        this.stableQualitySampleCount += 1;

        if (this.stableQualitySampleCount >= ADAPTIVE_QUALITY_STABLE_SAMPLES) {
          nextQualityLevel = this.getNextQualityLevel(1);
          this.stableQualitySampleCount = 0;
        }
      } else {
        this.stableQualitySampleCount = 0;
      }

      if (nextQualityLevel !== this.videoQualityLevel) {
        this.videoQualityLevel = nextQualityLevel;
        await this.applyVideoQualityProfile();
      }
    } finally {
      this.adaptiveQualityUpdateInFlight = false;
    }
  }

  on(event, callback) {
    if (typeof callback !== "function") {
      return () => {};
    }

    const listener = { event, callback };
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, data = {}) {
    this.listeners.forEach((listener) => {
      if (listener.event === event) {
        listener.callback(data);
      }
    });
  }

  cleanupConnections() {
    this.stopAdaptiveQualityMonitor();
    this.stopRelayBroadcast({ notifyServer: true });
    this.teardownRelayPlayback();
    if (this.originalVideoTrack && !this.localStream?.getTracks().includes(this.originalVideoTrack)) {
      this.originalVideoTrack.stop();
    }
    if (this.screenVideoTrack && !this.localStream?.getTracks().includes(this.screenVideoTrack)) {
      this.screenVideoTrack.stop();
    }
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.viewerPeerConnection?.close();
    this.viewerPeerConnection = null;
    this.viewerSessionVersion += 1;
    this.broadcasterPeerConnections.forEach((peerConnection) => peerConnection.close());
    this.broadcasterPeerConnections.clear();
    this.remoteStreams.clear();
    this.unsubscribeRealtime?.();
    this.unsubscribeRealtime = null;
  }

  resetState() {
    this.streamId = "";
    this.isBroadcaster = false;
    this.isScreenSharing = false;
    this.originalVideoTrack = null;
    this.screenVideoTrack = null;
    this.cameraFacingMode = "user";
    this.canSwitchCamera = false;
    this.cameraDevices = [];
    this.videoQualityLevel = "high";
    this.pendingIceCandidates.clear();
  }

  cleanup() {
    this.cleanupConnections();
    this.listeners.clear();
    this.resetState();
  }
}

export const liveStreamManager = new LiveStreamManager();
