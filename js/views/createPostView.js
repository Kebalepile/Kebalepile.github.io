import {
  clearElement,
  createElement,
  clearFormErrors,
  setFieldError,
  createFieldError
} from "../utils/dom.js";
import { createNavbar } from "../components/navbar.js";
import { showLoadingOverlay } from "../components/loadingOverlay.js";
import { STORAGE_KEYS } from "../config/storageKeys.js";
import { createAndStorePost } from "../services/postService.js";
import { storage } from "../storage/storage.js";
import { showToast } from "../components/toast.js";
import { createPostImageField } from "../components/postImageField.js";
import { navigate } from "../router.js";
import {
  MAX_POST_CONTENT_LENGTH,
  validatePostSubmission
} from "../utils/validators.js";
import {
  getVoiceNoteFeatureStatus,
  serializeVoiceNoteForTransport,
  startVoiceNoteRecording,
  formatVoiceNoteDuration,
  MAX_VOICE_NOTE_DURATION_MS,
  configureVoiceNoteAudio,
  getNextVoiceNotePlaybackRate,
  formatVoiceNotePlaybackRate
} from "../utils/voiceNotes.js";
import {
  getVoiceNoteDailyLimitMessage,
  isVoiceNoteDailyLimitError
} from "../utils/voiceNoteLimit.js";
import { setVoiceNoteControlIcon } from "../utils/voiceNoteIcons.js";
import {
  createVoiceNoteVisualizer,
  attachVoiceNoteScrubber
} from "../utils/voiceNoteVisualizer.js";

const voiceNoteFeatureStatus = getVoiceNoteFeatureStatus();

export function renderCreatePost(app, currentUser) {
  clearElement(app);

  const shell = createElement("section", { className: "feed-shell" });
  const navbar = createNavbar(currentUser, "create-post");
  const main = createElement("main", {
    className: "profile-main editor-main create-post-main"
  });

  const infoCard = createElement("section", {
    className: "profile-card editor-card editor-brief-card create-post-brief-card"
  });
  const infoDismissBtn = createElement("button", {
    className: "create-post-brief-dismiss-btn",
    type: "button",
    text: "X",
    attributes: {
      "aria-label": "Remove start a conversation card",
      title: "Remove"
    }
  });
  const infoEyebrow = createElement("p", {
    className: "section-eyebrow",
    text: "Start a conversation"
  });
  const infoTitle = createElement("h2", {
    className: "section-title",
    text: "Create a local update"
  });
  const infoText = createElement("p", {
    className: "section-copy",
    text: "Post text when you have details, add a photo when it helps, or switch to voice note when speaking is faster."
  });
  const tipsList = createElement("ul", { className: "helper-list" });

  [
    "Text posts stay focused on the update itself.",
    "Add one optimized image to give extra context.",
    "Voice-note posts can include one photo and are capped at 1 minute.",
    "Keep posts clear enough for neighbors to act on."
  ].forEach((tip) => {
    tipsList.appendChild(createElement("li", { text: tip }));
  });

  infoDismissBtn.addEventListener("click", () => {
    storage.set(STORAGE_KEYS.CREATE_POST_BRIEF_DISMISSED, true);
    infoCard.remove();
  });

  infoCard.append(infoDismissBtn, infoEyebrow, infoTitle, infoText, tipsList);

  const formCard = createElement("section", {
    className: "profile-card editor-card editor-form-card create-post-card"
  });
  const formTitle = createElement("h2", {
    className: "section-title",
    text: "Post"
  });
  const formText = createElement("p", {
    className: "section-copy",
    text: "Choose the format that best fits what you want to share. Text updates and voice notes can include one photo."
  });

  const form = createElement("form", {
    className: "auth-form create-post-form",
    id: "create-post-form"
  });

  const modeSwitch = createElement("div", { className: "create-post-mode-switch" });
  const textModeBtn = createElement("button", {
    className: "secondary-btn create-post-mode-btn create-post-mode-btn-active",
    type: "button",
    text: "Text"
  });
  const voiceModeBtn = createElement("button", {
    className: `secondary-btn create-post-mode-btn${
      voiceNoteFeatureStatus.supported ? "" : " create-post-mode-btn-disabled"
    }`,
    type: "button",
    text: "Voice note",
    attributes: voiceNoteFeatureStatus.supported
      ? {}
      : {
          title: voiceNoteFeatureStatus.message,
          "aria-disabled": "true"
        }
  });
  modeSwitch.append(textModeBtn, voiceModeBtn);

  const textPanel = createElement("div", {
    className: "create-post-mode-panel create-post-mode-panel-active"
  });
  const voicePanel = createElement("div", {
    className: "create-post-mode-panel"
  });

  const contentField = createTextAreaField({
    labelText: "Content",
    inputId: "post-content",
    placeholder: "What's happening in your area?\nWhat's on your mind?",
    value: ""
  });
  const imageField = createPostImageField({
    form,
    inputId: "post-image",
    titleText: "Add a post image"
  });
  const voiceComposer = voiceNoteFeatureStatus.supported
    ? createPostVoiceComposer({
        onError: (message) => showToast(message, "error")
      })
    : null;
  const voiceIntro = createElement("div", { className: "create-post-voice-intro" });
  const voiceHeader = createElement("div", { className: "create-post-voice-header" });
  const voiceTitle = createElement("h3", {
    className: "create-post-voice-title",
    text: "Voice note"
  });
  const voiceMediaSlot = createElement("div", {
    className: "create-post-voice-media-slot"
  });
  const voiceCopy = createElement("p", {
    className: "create-post-voice-copy",
    text: voiceNoteFeatureStatus.supported
      ? "Tap the mic, record your update, optionally add one photo, review it, then publish it to the feed."
      : voiceNoteFeatureStatus.message
  });
  const voicePreviewSlot = createElement("div", {
    className: "create-post-voice-preview-slot"
  });

  voiceHeader.append(voiceTitle, voiceMediaSlot);
  voiceIntro.append(voiceHeader, voiceCopy, voicePreviewSlot);
  voicePanel.appendChild(voiceIntro);

  if (voiceComposer) {
    voicePanel.appendChild(voiceComposer.root);
  }

  textPanel.append(contentField.wrapper);

  const actions = createElement("div", { className: "form-actions create-post-actions" });
  const cancelBtn = createElement("button", {
    className: "secondary-btn",
    text: "Cancel",
    type: "button"
  });
  const submitBtn = createElement("button", {
    className: "primary-btn create-post-publish-btn",
    text: "Publish",
    type: "submit"
  });

  let submissionMode = "text";
  let isSubmitting = false;
  let trackedDisabledStates = new Map();
  let activeLoadingOverlay = null;
  let pendingClientRequestId = "";
  let pendingSubmissionSignature = "";

  const getPendingSubmissionSignature = ({ content = "", image = "", voiceNote = null }) =>
    JSON.stringify({
      mode: submissionMode,
      content,
      image,
      voiceNote: serializeVoiceNoteForTransport(voiceNote)
    });

  const syncSubmitButtonLabel = () => {
    if (isSubmitting) {
      submitBtn.textContent = "Publishing...";
      return;
    }

    submitBtn.textContent = "Publish";
  };

  const setSubmissionBusyState = (nextBusy) => {
    isSubmitting = Boolean(nextBusy);

    if (isSubmitting) {
      trackedDisabledStates = new Map();
      Array.from(form.querySelectorAll("button, input, textarea, select")).forEach((control) => {
        trackedDisabledStates.set(control, control.disabled);
        control.disabled = true;
      });
      form.classList.add("create-post-form-busy");
      form.setAttribute("aria-busy", "true");
    } else {
      trackedDisabledStates.forEach((wasDisabled, control) => {
        if (control) {
          control.disabled = wasDisabled;
        }
      });
      trackedDisabledStates = new Map();
      form.classList.remove("create-post-form-busy");
      form.removeAttribute("aria-busy");
    }

    syncSubmitButtonLabel();
  };

  const updateMode = (nextMode) => {
    submissionMode = nextMode;
    const isTextMode = nextMode === "text";
    const imageControl = imageField.control || imageField.wrapper;

    textModeBtn.className = isTextMode
      ? "secondary-btn create-post-mode-btn create-post-mode-btn-active"
      : "secondary-btn create-post-mode-btn";
    voiceModeBtn.className = !isTextMode
      ? "secondary-btn create-post-mode-btn create-post-mode-btn-active"
      : `secondary-btn create-post-mode-btn${
          voiceNoteFeatureStatus.supported ? "" : " create-post-mode-btn-disabled"
        }`;

    textPanel.classList.toggle("create-post-mode-panel-active", isTextMode);
    voicePanel.classList.toggle("create-post-mode-panel-active", !isTextMode);
    contentField.input.required = isTextMode;

    if (isTextMode) {
      contentField.mediaSlot.replaceChildren(imageControl);
      contentField.previewSlot.replaceChildren(imageField.wrapper);
      voiceMediaSlot.replaceChildren();
      voicePreviewSlot.replaceChildren();
    } else {
      voiceMediaSlot.replaceChildren(imageControl);
      voicePreviewSlot.replaceChildren(imageField.wrapper);
      contentField.mediaSlot.replaceChildren();
      contentField.previewSlot.replaceChildren();
    }

    syncSubmitButtonLabel();

    if (isTextMode && voiceComposer) {
      voiceComposer.clear();
    }
  };

  if (voiceNoteFeatureStatus.supported) {
    voiceModeBtn.addEventListener("click", () => {
      clearFormErrors(form);
      updateMode("voice");
    });
  }

  textModeBtn.addEventListener("click", () => {
    clearFormErrors(form);
    updateMode("text");
  });

  cancelBtn.addEventListener("click", () => navigate("feed"));

  actions.append(cancelBtn, submitBtn);
  form.append(modeSwitch, textPanel, voicePanel, actions);
  formCard.append(formTitle, formText, form);

  if (!storage.get(STORAGE_KEYS.CREATE_POST_BRIEF_DISMISSED, false)) {
    main.appendChild(infoCard);
  }

  main.appendChild(formCard);

  shell.append(navbar, main);
  app.appendChild(shell);

  attachCharacterCounter(contentField.input, contentField.counter);
  updateMode("text");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    clearFormErrors(form);

    try {
      if (submissionMode === "voice" && voiceComposer?.isRecording()) {
        throw new Error("Stop the voice note recording before publishing.");
      }

      if (imageField.isProcessing()) {
        const pendingImageError = new Error("Please wait for the image to finish optimizing.");
        pendingImageError.field = "image";
        throw pendingImageError;
      }

      if (imageField.hasPreviewError()) {
        const invalidImageError = new Error(
          "That image could not be previewed. Choose another image or remove it first."
        );
        invalidImageError.field = "image";
        throw invalidImageError;
      }

      const postPayload =
        submissionMode === "voice"
          ? validatePostSubmission({
              content: "",
              voiceNote: voiceComposer?.getDraft() || null
            })
          : validatePostSubmission({
              content: contentField.input.value,
              voiceNote: null
            });
      const postImage = imageField.getValue();
      const nextSubmissionSignature = getPendingSubmissionSignature({
        content: postPayload.content,
        image: postImage,
        voiceNote: postPayload.voiceNote
      });

      if (!pendingClientRequestId || pendingSubmissionSignature !== nextSubmissionSignature) {
        pendingClientRequestId = crypto.randomUUID();
        pendingSubmissionSignature = nextSubmissionSignature;
      }

      setSubmissionBusyState(true);
      activeLoadingOverlay = showLoadingOverlay({
        label: submissionMode === "voice" ? "Publishing voice note..." : "Posting..."
      });

      await createAndStorePost({
        clientRequestId: pendingClientRequestId,
        content: postPayload.content,
        voiceNote: postPayload.voiceNote,
        image: postImage
      });

      if (voiceComposer) {
        voiceComposer.clear();
      }

      imageField.clear();
      pendingClientRequestId = "";
      pendingSubmissionSignature = "";

      showToast("Your update is live in the feed.", "success", {
        variant: "post-success",
        durationMs: 1800
      });
      await navigate("feed");
    } catch (error) {
      if (error?.code !== "API_NETWORK_ERROR" && error?.code !== "INTERNAL_SERVER_ERROR") {
        pendingClientRequestId = "";
        pendingSubmissionSignature = "";
      }

      handleCreatePostError(error, submissionMode);
    } finally {
      activeLoadingOverlay?.close();
      activeLoadingOverlay = null;
      setSubmissionBusyState(false);
    }
  });
}

function createTextAreaField({ labelText, inputId, placeholder, value }) {
  const wrapper = createElement("div", { className: "field-group" });
  const topRow = createElement("div", { className: "field-top-row" });
  const label = createElement("label", {
    className: "form-label",
    text: labelText
  });
  const counter = createElement("span", {
    className: "char-counter",
    id: `${inputId}-counter`,
    text: `0 / ${MAX_POST_CONTENT_LENGTH}`
  });
  const textarea = document.createElement("textarea");
  const helper = createElement("p", {
    className: "field-helper",
    text: "Maximum 1000 characters."
  });
  const metaRow = createElement("div", {
    className: "create-post-text-meta-row"
  });
  const mediaSlot = createElement("div", {
    className: "create-post-text-media-slot"
  });
  const previewSlot = createElement("div", {
    className: "create-post-text-preview-slot"
  });
  const error = createFieldError(inputId);

  topRow.append(label, counter);
  textarea.className = "form-input form-textarea create-post-textarea";
  textarea.id = inputId;
  textarea.placeholder = placeholder;
  textarea.required = true;
  textarea.maxLength = MAX_POST_CONTENT_LENGTH;
  textarea.value = value;

  metaRow.append(helper, mediaSlot);
  wrapper.append(topRow, textarea, metaRow, previewSlot, error);

  return {
    wrapper,
    input: textarea,
    counter,
    error,
    mediaSlot,
    previewSlot
  };
}

function attachCharacterCounter(input, counter) {
  if (!input || !counter) {
    return;
  }

  const sync = () => {
    counter.textContent = `${input.value.length} / ${MAX_POST_CONTENT_LENGTH}`;
    counter.className =
      input.value.length >= MAX_POST_CONTENT_LENGTH
        ? "char-counter char-counter-limit"
        : "char-counter";
  };

  input.addEventListener("input", sync);
  sync();
}

function createPostVoiceComposer({ onError = () => {} } = {}) {
  const root = createElement("div", {
    className: "messages-voice-note-composer create-post-voice-composer"
  });
  const triggerRow = createElement("div", { className: "create-post-voice-trigger-row" });
  const triggerBtn = createElement("button", {
    className: "messages-voice-trigger-btn",
    type: "button",
    attributes: {
      "aria-label": "Record voice note",
      title: "Record voice note"
    }
  });
  const triggerCopy = createElement("p", {
    className: "create-post-voice-trigger-copy",
    text: "Tap the mic to record. Tap again to stop."
  });
  const panel = createElement("div", {
    className: "messages-voice-panel"
  });
  const top = createElement("div", {
    className: "messages-voice-panel-top"
  });
  const lead = createElement("div", {
    className: "messages-voice-panel-lead"
  });
  const liveTimer = createElement("p", {
    className: "messages-voice-live-timer",
    text: "0:00"
  });
  const playBtn = createElement("button", {
    className: "messages-voice-play-btn",
    type: "button",
    attributes: {
      "aria-label": "Play voice note preview",
      title: "Play voice note preview"
    }
  });
  const waveShell = createElement("div", {
    className: "messages-voice-wave-shell voice-note-meter-seekable"
  });
  const waveform = createElement("div", {
    className: "messages-voice-waveform"
  });
  const progressLine = createElement("span", {
    className: "voice-note-progress-line"
  });
  const previewMeta = createElement("div", {
    className: "messages-voice-preview-meta"
  });
  const previewTimer = createElement("p", {
    className: "messages-voice-preview-timer",
    text: "0:00"
  });
  const speedBtn = createElement("button", {
    className: "voice-note-speed-btn messages-voice-speed-btn",
    type: "button",
    text: formatVoiceNotePlaybackRate(1),
    attributes: {
      "aria-label": "Change voice note playback speed",
      title: "Change voice note playback speed"
    }
  });
  const deleteBtn = createElement("button", {
    className: "messages-voice-delete-btn",
    type: "button",
    attributes: {
      "aria-label": "Delete voice note draft",
      title: "Delete voice note draft"
    }
  });
  const audio = document.createElement("audio");

  panel.hidden = true;
  setVoiceNoteControlIcon(triggerBtn, "mic");
  setVoiceNoteControlIcon(playBtn, "play");
  deleteBtn.appendChild(createTrashIcon());
  previewMeta.append(previewTimer, speedBtn);
  waveShell.appendChild(waveform);
  lead.append(liveTimer);
  top.append(lead, waveShell, previewMeta, deleteBtn);
  panel.append(top);
  audio.className = "messages-voice-audio";
  configureVoiceNoteAudio(audio);
  triggerRow.append(triggerBtn, triggerCopy);
  root.append(triggerRow, panel, audio);

  const visualizer = createVoiceNoteVisualizer({
    waveformElement: waveform,
    progressLineElement: progressLine
  });

  let draft = null;
  let recorder = null;
  let liveSession = null;
  let recordingTimerId = null;
  let recordingStartedAt = 0;
  let playbackRate = 1;
  let progressAnimationFrameId = null;
  let resumeAfterSeek = false;

  const clearRecordingTimer = () => {
    if (recordingTimerId) {
      window.clearInterval(recordingTimerId);
      recordingTimerId = null;
    }
  };

  const stopProgressAnimation = () => {
    if (progressAnimationFrameId) {
      window.cancelAnimationFrame(progressAnimationFrameId);
      progressAnimationFrameId = null;
    }
  };

  const pausePreview = () => {
    stopProgressAnimation();
    audio.pause();
  };

  const resetPreview = () => {
    pausePreview();
    audio.currentTime = 0;
  };

  const updatePreview = () => {
    const isRecording = Boolean(recorder);
    const hasDraft = Boolean(draft?.dataUrl);
    const isPlaying = !audio.paused && !audio.ended;

    panel.hidden = !isRecording && !hasDraft;
    panel.classList.toggle("messages-voice-panel-recording", isRecording);
    panel.classList.toggle("messages-voice-panel-draft", !isRecording && hasDraft);
    panel.classList.toggle("messages-voice-panel-playing", isPlaying);
    liveTimer.hidden = !isRecording;
    playBtn.hidden = isRecording || !hasDraft;
    previewMeta.hidden = isRecording || !hasDraft;

    if (isRecording) {
      triggerBtn.classList.add("messages-voice-trigger-btn-recording");
      setVoiceNoteControlIcon(triggerBtn, "stop");
      triggerBtn.setAttribute("aria-label", "Stop recording voice note");
      triggerBtn.title = "Stop recording voice note";
      liveTimer.textContent = formatVoiceNoteDuration(
        Math.min(Date.now() - recordingStartedAt, MAX_VOICE_NOTE_DURATION_MS)
      );
      triggerCopy.textContent = "Recording... tap again to stop.";
    } else {
      triggerBtn.classList.remove("messages-voice-trigger-btn-recording");
      setVoiceNoteControlIcon(triggerBtn, "mic");
      triggerBtn.setAttribute(
        "aria-label",
        hasDraft ? "Record the voice note again" : "Record voice note"
      );
      triggerBtn.title = hasDraft ? "Record again" : "Record voice note";
      triggerCopy.textContent = hasDraft
        ? "Preview your note or tap the mic to record again."
        : "Tap the mic to record. Tap again to stop.";
    }

    if (hasDraft) {
      if (!playBtn.isConnected) {
        lead.appendChild(playBtn);
      }

      if (!deleteBtn.isConnected) {
        top.appendChild(deleteBtn);
      }

      configureVoiceNoteAudio(audio, draft.dataUrl);
      audio.playbackRate = playbackRate;
      speedBtn.textContent = formatVoiceNotePlaybackRate(playbackRate);
      previewTimer.textContent = formatVoiceNoteDuration(draft.durationMs);
      setVoiceNoteControlIcon(playBtn, isPlaying ? "pause" : "play");
      playBtn.setAttribute("aria-label", isPlaying ? "Pause voice note preview" : "Play voice note preview");
      playBtn.title = isPlaying ? "Pause voice note preview" : "Play voice note preview";
      visualizer.renderStoredWaveform({
        waveform: draft.waveform,
        progressRatio: audio.ended
          ? 1
          : draft.durationMs > 0
            ? (audio.currentTime * 1000) / draft.durationMs
            : 0
      });
      return;
    }

    if (playBtn.isConnected) {
      playBtn.remove();
    }

    if (deleteBtn.isConnected) {
      deleteBtn.remove();
    }

    configureVoiceNoteAudio(audio);
    previewTimer.textContent = "0:00";
    setVoiceNoteControlIcon(playBtn, "play");
    visualizer.renderStoredWaveform({
      waveform: [],
      progressRatio: 0
    });
  };

  const clear = () => {
    if (recorder) {
      recorder.cancel();
      recorder = null;
    }

    if (liveSession) {
      liveSession.cancel();
      liveSession = null;
    }

    clearRecordingTimer();
    resetPreview();
    draft = null;
    playbackRate = 1;
    updatePreview();
  };

  const finalizeVoiceRecording = (nextVoiceNote) => {
    clearRecordingTimer();

    if (liveSession) {
      const waveformData = liveSession.stop();
      liveSession = null;
      draft = nextVoiceNote
        ? {
            ...nextVoiceNote,
            waveform: waveformData
          }
        : null;
    } else {
      draft = nextVoiceNote;
    }

    recorder = null;
    resetPreview();
    playbackRate = 1;
    updatePreview();
  };

  const beginRecording = async ({ replaceDraft = false } = {}) => {
    try {
      if (replaceDraft) {
        draft = null;
        playbackRate = 1;
        resetPreview();
      }

      recorder = await startVoiceNoteRecording({
        maxDurationMs: MAX_VOICE_NOTE_DURATION_MS
      });
      liveSession = await visualizer.startRecording({
        stream: recorder.stream,
        maxDurationMs: MAX_VOICE_NOTE_DURATION_MS
      });
      recordingStartedAt = Date.now();
      clearRecordingTimer();
      recordingTimerId = window.setInterval(updatePreview, 250);

      recorder.result
        .then((nextVoiceNote) => {
          if (recorder) {
            finalizeVoiceRecording(nextVoiceNote);
          }
        })
        .catch((error) => {
          if (recorder) {
            recorder = null;

            if (liveSession) {
              liveSession.cancel();
              liveSession = null;
            }

            clearRecordingTimer();
            draft = null;
            updatePreview();
            onError(error.message || "Voice note recording failed.");
          }
        });

      updatePreview();
    } catch (error) {
      recorder = null;

      if (liveSession) {
        liveSession.cancel();
        liveSession = null;
      }

      clearRecordingTimer();
      onError(error.message || "Could not start voice recording.");
      updatePreview();
    }
  };

  triggerBtn.addEventListener("click", async () => {
    if (recorder) {
      recorder.stop();
      return;
    }

    await beginRecording({ replaceDraft: Boolean(draft?.dataUrl) });
  });

  deleteBtn.addEventListener("click", clear);

  playBtn.addEventListener("click", async () => {
    if (!draft?.dataUrl) {
      return;
    }

    try {
      if (audio.paused || audio.ended) {
        if (audio.ended) {
          audio.currentTime = 0;
        }

        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error) {
      onError(error.message || "Could not play the voice note preview.");
    }

    updatePreview();
  });

  speedBtn.addEventListener("click", () => {
    playbackRate = getNextVoiceNotePlaybackRate(playbackRate);
    audio.playbackRate = playbackRate;
    updatePreview();
  });

  audio.addEventListener("play", () => {
    const tick = () => {
      updatePreview();

      if (!audio.paused && !audio.ended) {
        progressAnimationFrameId = window.requestAnimationFrame(tick);
        return;
      }

      progressAnimationFrameId = null;
    };

    if (!progressAnimationFrameId) {
      progressAnimationFrameId = window.requestAnimationFrame(tick);
    }

    updatePreview();
  });

  ["pause", "ended"].forEach((eventName) => {
    audio.addEventListener(eventName, () => {
      stopProgressAnimation();
      updatePreview();
    });
  });

  ["timeupdate", "loadedmetadata"].forEach((eventName) => {
    audio.addEventListener(eventName, updatePreview);
  });

  attachVoiceNoteScrubber({
    scrubElement: waveShell,
    isEnabled: () => Boolean(draft?.durationMs),
    getDurationMs: () => draft?.durationMs || 0,
    onSeekStart: () => {
      resumeAfterSeek = !audio.paused && !audio.ended;
      audio.pause();
    },
    onSeek: ({ timeMs }) => {
      audio.currentTime = timeMs / 1000;
      updatePreview();
    },
    onSeekEnd: async () => {
      if (resumeAfterSeek) {
        try {
          await audio.play();
        } catch (error) {
          onError(error.message || "Could not continue the voice note preview.");
        }
      }

      resumeAfterSeek = false;
      updatePreview();
    }
  });

  updatePreview();

  return {
    root,
    getDraft: () => draft,
    clear,
    isRecording: () => Boolean(recorder)
  };
}

function createTrashIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("messages-voice-action-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "1.8");
  path.setAttribute(
    "d",
    "M5 7h14M9 7V5.8c0-.44.36-.8.8-.8h4.4c.44 0 .8.36.8.8V7m-7.5 0 .7 10.2c.04.46.42.8.88.8h5.24c.46 0 .84-.34.88-.8L16.5 7M10 10.2v4.8M14 10.2v4.8"
  );
  svg.appendChild(path);

  return svg;
}

function handleCreatePostError(error, submissionMode) {
  const message = isVoiceNoteDailyLimitError(error)
    ? getVoiceNoteDailyLimitMessage(error)
    : error.message || "Failed to create post.";
  const field = error?.field || "";

  if (submissionMode === "text" && (field === "content" || message.toLowerCase().includes("post content"))) {
    setFieldError("post-content", message);
    return;
  }

  if (field === "image" || field === "imageUrl") {
    setFieldError("post-image", message);
    return;
  }

  showToast(message, "error");
}
