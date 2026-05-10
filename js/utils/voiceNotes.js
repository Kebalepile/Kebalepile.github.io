import { normalizeVoiceWaveform } from "./voiceNoteVisualizer.js";

const PREFERRED_VOICE_NOTE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus"
];
const VOICE_NOTE_RECORDING_AUDIO_CONSTRAINTS = {
  channelCount: { ideal: 1 },
  noiseSuppression: { ideal: true },
  echoCancellation: { ideal: true },
  autoGainControl: { ideal: true }
};

export const MAX_VOICE_NOTE_DURATION_MS = 60000;
export const VOICE_NOTE_PLAYBACK_RATES = [1, 1.5, 2];
// Keep raw audio comfortably below the 1 MB encrypted/base64 send envelope.
export const MAX_VOICE_NOTE_AUDIO_BYTES = 760 * 1024;
export const VOICE_NOTE_TARGET_AUDIO_BITS_PER_SECOND = 12000;

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBase64(value) {
  return trimString(value).replace(/\s+/g, "");
}

function getEncryptedVoiceNoteAudioBase64(voiceNote) {
  return normalizeBase64(voiceNote?.encryptedAudioBase64);
}

function getBase64PayloadSizeBytes(value) {
  const normalizedValue = normalizeBase64(value);

  if (!normalizedValue) {
    return 0;
  }

  const paddingLength = normalizedValue.match(/=+$/)?.[0].length || 0;
  return Math.floor((normalizedValue.length * 3) / 4) - paddingLength;
}

function makeVoiceNoteTooLargeError(field = "voiceNote") {
  const error = new Error(
    "Voice notes must stay under 1 MB when sent securely. Try a slightly shorter recording."
  );
  error.code = "VOICE_NOTE_TOO_LARGE";
  error.field = field;
  error.maxBytes = MAX_VOICE_NOTE_AUDIO_BYTES;
  return error;
}

function getVoiceNotePayloadSizeBytes(voiceNote) {
  const declaredSize = Number.isFinite(voiceNote?.size) ? Math.max(0, Number(voiceNote.size)) : 0;
  const declaredSizeBytes = Number.isFinite(voiceNote?.sizeBytes)
    ? Math.max(0, Number(voiceNote.sizeBytes))
    : 0;
  const audioBase64Size = getBase64PayloadSizeBytes(voiceNote?.audioBase64);
  const encryptedAudioBase64Size = getBase64PayloadSizeBytes(voiceNote?.encryptedAudioBase64);

  return Math.max(
    declaredSize,
    declaredSizeBytes,
    audioBase64Size,
    encryptedAudioBase64Size
  );
}

function assertVoiceNoteSizeWithinLimit(voiceNote, field = "voiceNote") {
  if (getVoiceNotePayloadSizeBytes(voiceNote) > MAX_VOICE_NOTE_AUDIO_BYTES) {
    throw makeVoiceNoteTooLargeError(field);
  }
}

function assertVoiceNoteBlobSizeWithinLimit(blob, field = "voiceNote") {
  if (Number(blob?.size || 0) > MAX_VOICE_NOTE_AUDIO_BYTES) {
    throw makeVoiceNoteTooLargeError(field);
  }
}

function extractAudioBase64FromDataUrl(dataUrl) {
  const trimmed = trimString(dataUrl);

  if (!trimmed.startsWith("data:audio/")) {
    return "";
  }

  const commaIndex = trimmed.indexOf(",");

  if (commaIndex < 0) {
    return "";
  }

  return normalizeBase64(trimmed.slice(commaIndex + 1));
}

function buildInlineVoiceNoteDataUrl({ audioBase64, mimeType = "audio/webm" }) {
  const safeAudioBase64 = normalizeBase64(audioBase64);

  if (!safeAudioBase64) {
    return "";
  }

  return `data:${trimString(mimeType) || "audio/webm"};base64,${safeAudioBase64}`;
}

export function getVoiceNoteAudioBase64(voiceNote) {
  return normalizeBase64(voiceNote?.audioBase64);
}

export function getVoiceNoteSource(voiceNote) {
  const dataUrl =
    typeof voiceNote?.dataUrl === "string" && voiceNote.dataUrl.startsWith("data:audio/")
      ? voiceNote.dataUrl
      : "";

  if (dataUrl) {
    return dataUrl;
  }

  const audioBase64 = getVoiceNoteAudioBase64(voiceNote);

  if (audioBase64) {
    return buildInlineVoiceNoteDataUrl({
      audioBase64,
      mimeType: voiceNote?.mimeType
    });
  }

  const remoteUrl = typeof voiceNote?.url === "string" ? voiceNote.url.trim() : "";
  return /^https?:\/\//i.test(remoteUrl) ? remoteUrl : "";
}

export function isVoiceNotePendingSync(voiceNote) {
  return Boolean(voiceNote?.pendingSync) && !getVoiceNoteSource(voiceNote);
}

export function getVoiceNotePendingSyncMessage() {
  return "Voice note is reloading after refresh. It should be ready in a moment.";
}

export function isVoiceNoteRecordingSupported() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  return (
    typeof window.MediaRecorder !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

export function getSupportedVoiceNoteMimeType() {
  if (!isVoiceNoteRecordingSupported()) {
    return null;
  }

  if (typeof window.MediaRecorder?.isTypeSupported !== "function") {
    return PREFERRED_VOICE_NOTE_MIME_TYPES[0];
  }

  return (
    PREFERRED_VOICE_NOTE_MIME_TYPES.find((mimeType) =>
      window.MediaRecorder.isTypeSupported(mimeType)
    ) || null
  );
}

export function getVoiceNoteFeatureStatus() {
  const supported = isVoiceNoteRecordingSupported();

  return {
    supported,
    mimeType: getSupportedVoiceNoteMimeType(),
    message: supported
      ? "Optional voice note available. Record in-browser up to 60 seconds within the secure send limit."
      : "Voice notes need MediaRecorder support in this browser."
  };
}

function createMediaRecorder(stream, preferredMimeType) {
  const options = {};

  if (preferredMimeType) {
    options.mimeType = preferredMimeType;
  }

  if (Number.isFinite(VOICE_NOTE_TARGET_AUDIO_BITS_PER_SECOND)) {
    options.audioBitsPerSecond = VOICE_NOTE_TARGET_AUDIO_BITS_PER_SECOND;
  }

  try {
    return Object.keys(options).length > 0
      ? new window.MediaRecorder(stream, options)
      : new window.MediaRecorder(stream);
  } catch (error) {
    if ("audioBitsPerSecond" in options) {
      delete options.audioBitsPerSecond;

      try {
        return Object.keys(options).length > 0
          ? new window.MediaRecorder(stream, options)
          : new window.MediaRecorder(stream);
      } catch {
        // Fall through to the plain recorder constructor below.
      }
    }

    if ("mimeType" in options) {
      try {
        return new window.MediaRecorder(stream);
      } catch {
        // Re-throw the original error below if the bare constructor also fails.
      }
    }

    throw (error instanceof Error
      ? error
      : new Error("Voice note recording could not be started."));
  }
}

export async function startVoiceNoteRecording({
  maxDurationMs = MAX_VOICE_NOTE_DURATION_MS
} = {}) {
  if (!isVoiceNoteRecordingSupported()) {
    throw new Error("Voice note recording is not supported in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: VOICE_NOTE_RECORDING_AUDIO_CONSTRAINTS
  });
  const preferredMimeType = getSupportedVoiceNoteMimeType();
  const mediaRecorder = createMediaRecorder(stream, preferredMimeType);
  const chunks = [];
  const startedAt = Date.now();
  let cancelled = false;
  let completed = false;

  mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  });

  const stopPromise = new Promise((resolve, reject) => {
    mediaRecorder.addEventListener("stop", async () => {
      stopStream(stream);

      if (cancelled) {
        resolve(null);
        return;
      }

      try {
        const blob = new Blob(chunks, {
          type: mediaRecorder.mimeType || preferredMimeType || "audio/webm"
        });

        if (blob.size === 0) {
          reject(new Error("No voice note audio was captured."));
          return;
        }

        completed = true;
        resolve(
          await createVoiceNotePayload({
            blob,
            startedAt,
            maxDurationMs
          })
        );
      } catch (error) {
        reject(
          error instanceof Error ? error : new Error("Failed to build voice note.")
        );
      }
    });

    mediaRecorder.addEventListener("error", () => {
      stopStream(stream);
      reject(new Error("Voice note recording failed."));
    });
  });

  mediaRecorder.start();

  const autoStopTimeoutId = window.setTimeout(() => {
    if (mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  }, maxDurationMs);

  return {
    maxDurationMs,
    startedAt,
    stream,
    result: stopPromise,
    stop: async () => {
      clearTimeout(autoStopTimeoutId);

      if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }

      return stopPromise;
    },
    cancel: () => {
      clearTimeout(autoStopTimeoutId);
      cancelled = true;

      if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        return;
      }

      if (!completed) {
        stopStream(stream);
      }
    }
  };
}

export function normalizeVoiceNote(voiceNote) {
  if (!voiceNote) {
    return null;
  }

  const audioBase64 = getVoiceNoteAudioBase64(voiceNote);
  const encryptedAudioBase64 = getEncryptedVoiceNoteAudioBase64(voiceNote);
  const remoteUrl = typeof voiceNote.url === "string" ? voiceNote.url.trim() : "";
  const pendingSync = voiceNote?.pendingSync === true;
  const safeSource = audioBase64
    ? buildInlineVoiceNoteDataUrl({
        audioBase64,
        mimeType: voiceNote?.mimeType
      })
    : /^https?:\/\//i.test(remoteUrl)
      ? remoteUrl
      : "";

  if (!safeSource && !pendingSync && !encryptedAudioBase64) {
    return null;
  }

  const durationMs = Number.isFinite(voiceNote.durationMs)
    ? Math.min(Math.max(0, voiceNote.durationMs), MAX_VOICE_NOTE_DURATION_MS)
    : 0;

  return {
    dataUrl: "",
    audioBase64,
    encryptedAudioBase64,
    url: remoteUrl,
    storageKey: typeof voiceNote.storageKey === "string" ? voiceNote.storageKey.trim() : "",
    source: safeSource,
    pendingSync,
    mimeType:
      typeof voiceNote.mimeType === "string" && voiceNote.mimeType
        ? voiceNote.mimeType
        : "audio/webm",
    waveform: normalizeVoiceWaveform(voiceNote.waveform),
    durationMs,
    size: Number.isFinite(voiceNote.size) ? Math.max(0, voiceNote.size) : 0
  };
}

export function serializeVoiceNoteForTransport(voiceNote) {
  const normalizedVoiceNote = normalizeVoiceNote(voiceNote);

  if (!normalizedVoiceNote) {
    return null;
  }

  if (
    !normalizedVoiceNote.audioBase64 &&
    !normalizedVoiceNote.encryptedAudioBase64 &&
    !normalizedVoiceNote.url
  ) {
    return null;
  }

  assertVoiceNoteSizeWithinLimit(normalizedVoiceNote);

  return {
    audioBase64: normalizedVoiceNote.audioBase64,
    encryptedAudioBase64: normalizedVoiceNote.encryptedAudioBase64,
    url: normalizedVoiceNote.url,
    storageKey: normalizedVoiceNote.storageKey,
    mimeType: normalizedVoiceNote.mimeType,
    durationMs: normalizedVoiceNote.durationMs,
    size: normalizedVoiceNote.size,
    waveform: normalizedVoiceNote.waveform
  };
}

export function formatVoiceNoteDuration(durationMs = 0) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getNextVoiceNotePlaybackRate(currentRate = 1) {
  const currentIndex = VOICE_NOTE_PLAYBACK_RATES.indexOf(currentRate);
  const nextIndex =
    currentIndex >= 0 ? (currentIndex + 1) % VOICE_NOTE_PLAYBACK_RATES.length : 0;

  return VOICE_NOTE_PLAYBACK_RATES[nextIndex];
}

export function formatVoiceNotePlaybackRate(rate = 1) {
  return Number.isInteger(rate) ? `${rate}x` : `${rate.toFixed(1)}x`;
}

export function configureVoiceNoteAudio(audio, source = "", options = {}) {
  if (!audio) {
    return;
  }

  const { showNativeControls = false } = options;
  const nextSource = typeof source === "string" ? source : "";
  const currentSource = audio.getAttribute("src") || "";

  audio.controls = showNativeControls;
  audio.hidden = !showNativeControls;
  audio.preload = "metadata";
  audio.disableRemotePlayback = true;
  audio.controlsList = "nodownload noplaybackrate";
  audio.setAttribute("controlsList", "nodownload noplaybackrate");
  audio.oncontextmenu = (event) => {
    event.preventDefault();
  };

  if (currentSource !== nextSource) {
    if (nextSource) {
      audio.setAttribute("src", nextSource);
    } else {
      audio.removeAttribute("src");
    }

    audio.load();
  }
}

async function createVoiceNotePayload({ blob, startedAt, maxDurationMs }) {
  assertVoiceNoteBlobSizeWithinLimit(blob);
  const dataUrl = await readBlobAsDataUrl(blob);

  return {
    dataUrl,
    audioBase64: extractAudioBase64FromDataUrl(dataUrl),
    mimeType: blob.type || "audio/webm",
    durationMs: Math.min(Date.now() - startedAt, maxDurationMs),
    size: blob.size
  };
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      resolve(String(reader.result || ""));
    });

    reader.addEventListener("error", () => {
      reject(new Error("Failed to read recorded audio."));
    });

    reader.readAsDataURL(blob);
  });
}

function stopStream(stream) {
  stream.getTracks().forEach((track) => track.stop());
}
