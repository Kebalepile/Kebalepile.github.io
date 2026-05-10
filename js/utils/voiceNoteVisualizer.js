const DEFAULT_POINT_COUNT = 120;
const IDLE_LEVEL = 0.08;
const MAX_STORED_SAMPLES = 96;
const WAVEFORM_HEIGHT = 32;
const PLAYED_COLOR = "#111827";
const UNPLAYED_COLOR = "#cbd5e1";
const RECORDING_COLOR = "#64748b";
const GUIDE_COLOR = "#dbe4ea";

export function createVoiceNoteVisualizer({
  waveformElement,
  progressLineElement,
  pointCount = DEFAULT_POINT_COUNT
}) {
  let animationFrameId = null;
  let audioContext = null;
  let analyser = null;
  let streamSource = null;
  let mediaElementSource = null;
  let connectedAudioElement = null;
  let canvas = null;
  let context = null;
  buildCanvas();
  renderStoredWaveform({ waveform: [], progressRatio: 0 });

  async function startRecording({ stream, maxDurationMs }) {
    teardownAudioGraph({ closeContext: true });
    await ensureAudioContext();
    ensureAnalyser();

    streamSource = audioContext.createMediaStreamSource(stream);
    disconnectNode(mediaElementSource);
    disconnectNode(streamSource);
    streamSource.connect(analyser);

    const timeDomainData = new Uint8Array(analyser.fftSize);
    const samples = [];
    const startedAt = performance.now();

    const tick = () => {
      if (!analyser) {
        return;
      }

      analyser.getByteTimeDomainData(timeDomainData);

      const liveWaveform = createTimeDomainWaveform(
        timeDomainData,
        getRenderPointCount()
      );

      samples.push(roundLevel(calculateAverageLevel(liveWaveform)));

      const elapsedMs = performance.now() - startedAt;
      const progressRatio = clamp(elapsedMs / maxDurationMs, 0, 1);

      renderWaveform({
        waveform: liveWaveform,
        progressRatio,
        isLive: true
      });

      animationFrameId = window.requestAnimationFrame(tick);
    };

    tick();

    return {
      stop() {
        stopAnimation();
        teardownStreamSource();
        return compressWaveform(samples);
      },
      cancel() {
        stopAnimation();
        teardownStreamSource();
        renderStoredWaveform({ waveform: [], progressRatio: 0 });
      }
    };
  }

  async function startPlayback({ audioElement, fallbackWaveform = [] }) {
    if (!audioElement) {
      throw new Error("Audio element is required for playback visualizer.");
    }

    await ensureAudioContext();
    ensureAnalyser();
    stopAnimation();
    teardownStreamSource();

    if (connectedAudioElement !== audioElement) {
      mediaElementSource = audioContext.createMediaElementSource(audioElement);
      connectedAudioElement = audioElement;
    }

    disconnectNode(mediaElementSource);
    disconnectNode(analyser);
    mediaElementSource.connect(analyser);
    analyser.connect(audioContext.destination);

    const timeDomainData = new Uint8Array(analyser.fftSize);

    const tick = () => {
      if (!analyser || audioElement.paused || audioElement.ended) {
        return;
      }

      analyser.getByteTimeDomainData(timeDomainData);

      const liveWaveform = createTimeDomainWaveform(
        timeDomainData,
        getRenderPointCount()
      );

      renderWaveform({
        waveform: liveWaveform,
        progressRatio: getAudioProgressRatio(audioElement),
        isLive: true
      });

      animationFrameId = window.requestAnimationFrame(tick);
    };

    tick();

    return {
      stop() {
        stopAnimation();
        renderStoredWaveform({
          waveform: fallbackWaveform,
          progressRatio: getAudioProgressRatio(audioElement)
        });
      }
    };
  }

  function renderStoredWaveform({
    waveform = [],
    progressRatio = 0,
    revealByProgress = false
  }) {
    renderWaveform({
      waveform,
      progressRatio,
      revealByProgress,
      isLive: false
    });
  }

  function destroy() {
    teardownAudioGraph({ closeContext: true });
    waveformElement.replaceChildren();
    updateProgressLine(progressLineElement, 0, false);
    canvas = null;
    context = null;
  }

  return {
    startRecording,
    startPlayback,
    renderStoredWaveform,
    destroy
  };

  function buildCanvas() {
    waveformElement.replaceChildren();

    canvas = document.createElement("canvas");
    canvas.className = "voice-note-wave-canvas";
    waveformElement.appendChild(canvas);

    if (progressLineElement) {
      waveformElement.appendChild(progressLineElement);
    }

    context = canvas.getContext("2d");
  }

  function ensureCanvasSize() {
    if (!canvas || !context) {
      return {
        width: 0,
        height: 0
      };
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(120, Math.round(waveformElement.clientWidth || 240));
    const height = WAVEFORM_HEIGHT;

    if (
      canvas.width !== Math.round(width * devicePixelRatio) ||
      canvas.height !== Math.round(height * devicePixelRatio)
    ) {
      canvas.width = Math.round(width * devicePixelRatio);
      canvas.height = Math.round(height * devicePixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    return { width, height };
  }

  function getRenderPointCount() {
    const width = Math.max(120, Math.round(waveformElement.clientWidth || 240));
    return Math.max(pointCount, Math.floor(width / 2.5));
  }

  function renderWaveform({
    waveform = [],
    progressRatio = 0,
    revealByProgress = false,
    isLive = false
  }) {
    const { width, height } = ensureCanvasSize();

    if (!context || width <= 0 || height <= 0) {
      return;
    }

    const points = expandWaveform(waveform, getRenderPointCount());
    const safeProgress = clamp(progressRatio, 0, 1);
    const centerY = height / 2;
    const usableHeight = Math.max(6, height - 6);

    context.clearRect(0, 0, width, height);
    drawGuideLine(context, centerY, width);

    points.forEach((level, index) => {
      const position = getPointPosition(index, points.length);
      const x = position * width;
      const idle = isLive ? IDLE_LEVEL * 0.55 : IDLE_LEVEL;
      const amplitude = clamp(level || 0, 0, 1);
      const shouldReveal = !revealByProgress || position <= safeProgress;
      const effectiveLevel = shouldReveal ? amplitude : idle;
      const peak = Math.max(2, effectiveLevel * usableHeight * 0.5);

      context.beginPath();
      context.strokeStyle = getStrokeColor({
        isLive,
        isPlayed: position <= safeProgress,
        level: effectiveLevel
      });
      context.lineWidth = index % 10 === 0 ? 1.8 : 1;
      context.lineCap = "round";
      context.moveTo(x, centerY - peak);
      context.lineTo(x, centerY + peak);
      context.stroke();
    });

    updateProgressLine(progressLineElement, safeProgress, isLive || waveform.length > 0);
  }

  function ensureAnalyser() {
    if (analyser) {
      return;
    }

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.minDecibels = -92;
    analyser.maxDecibels = -8;
    analyser.smoothingTimeConstant = 0.75;
  }

  async function ensureAudioContext() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextCtor) {
      throw new Error("Audio visualizer is not supported in this browser.");
    }

    if (!audioContext) {
      audioContext = new AudioContextCtor();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
  }

  function teardownStreamSource() {
    if (streamSource) {
      disconnectNode(streamSource);
      streamSource = null;
    }
  }

  function teardownAudioGraph({ closeContext = false } = {}) {
    stopAnimation();
    teardownStreamSource();
    disconnectNode(mediaElementSource);
    disconnectNode(analyser);

    if (closeContext && audioContext) {
      audioContext.close();
      audioContext = null;
      analyser = null;
      mediaElementSource = null;
      connectedAudioElement = null;
    }
  }

  function stopAnimation() {
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }
}

export function attachVoiceNoteScrubber({
  scrubElement,
  isEnabled = () => true,
  getDurationMs,
  onSeekStart = () => {},
  onSeek = () => {},
  onSeekEnd = () => {}
}) {
  let activePointerId = null;

  const handlePointerDown = (event) => {
    if (isInteractiveTarget(event.target, scrubElement)) {
      return;
    }

    if (!isEnabled()) {
      return;
    }

    const durationMs = Number(getDurationMs?.() || 0);

    if (durationMs <= 0) {
      return;
    }

    activePointerId = event.pointerId;
    scrubElement.setPointerCapture(activePointerId);
    onSeekStart();
    seekFromEvent(event, durationMs);
  };

  const handlePointerMove = (event) => {
    if (event.pointerId !== activePointerId) {
      return;
    }

    const durationMs = Number(getDurationMs?.() || 0);

    if (durationMs <= 0) {
      return;
    }

    seekFromEvent(event, durationMs);
  };

  const handlePointerEnd = (event) => {
    if (event.pointerId !== activePointerId) {
      return;
    }

    if (scrubElement.hasPointerCapture(activePointerId)) {
      scrubElement.releasePointerCapture(activePointerId);
    }

    activePointerId = null;
    onSeekEnd();
  };

  scrubElement.addEventListener("pointerdown", handlePointerDown);
  scrubElement.addEventListener("pointermove", handlePointerMove);
  scrubElement.addEventListener("pointerup", handlePointerEnd);
  scrubElement.addEventListener("pointercancel", handlePointerEnd);

  return {
    destroy() {
      scrubElement.removeEventListener("pointerdown", handlePointerDown);
      scrubElement.removeEventListener("pointermove", handlePointerMove);
      scrubElement.removeEventListener("pointerup", handlePointerEnd);
      scrubElement.removeEventListener("pointercancel", handlePointerEnd);
    }
  };

  function seekFromEvent(event, durationMs) {
    const rect = scrubElement.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);

    onSeek({
      ratio,
      timeMs: durationMs * ratio
    });
  }
}

function isInteractiveTarget(target, boundaryElement) {
  if (!(target instanceof Element)) {
    return false;
  }

  const interactiveElement = target.closest(
    "button, a, input, select, textarea, label, summary"
  );

  return Boolean(interactiveElement && boundaryElement.contains(interactiveElement));
}

export function normalizeVoiceWaveform(waveform = []) {
  if (!Array.isArray(waveform)) {
    return [];
  }

  return compressWaveform(
    waveform
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .map((value) => clamp(value, 0, 1))
  );
}

function createTimeDomainWaveform(timeDomainData, pointCount) {
  if (!timeDomainData.length || pointCount <= 0) {
    return [];
  }

  const points = [];
  const bucketSize = timeDomainData.length / pointCount;

  for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
    const start = Math.floor(pointIndex * bucketSize);
    const end = Math.floor((pointIndex + 1) * bucketSize);
    const bucket = timeDomainData.slice(start, Math.max(end, start + 1));

    let maxDelta = 0;

    bucket.forEach((value) => {
      const delta = Math.abs((value - 128) / 128);
      if (delta > maxDelta) {
        maxDelta = delta;
      }
    });

    points.push(roundLevel(clamp(maxDelta * 1.8, 0, 1)));
  }

  return points;
}

function calculateAverageLevel(levels) {
  if (!levels.length) {
    return 0;
  }

  const total = levels.reduce((sum, value) => sum + value, 0);
  return total / levels.length;
}

function compressWaveform(samples = [], targetSize = MAX_STORED_SAMPLES) {
  if (!samples.length) {
    return [];
  }

  if (samples.length <= targetSize) {
    return samples.map(roundLevel);
  }

  const compressed = [];
  const bucketSize = samples.length / targetSize;

  for (let bucketIndex = 0; bucketIndex < targetSize; bucketIndex += 1) {
    const start = Math.floor(bucketIndex * bucketSize);
    const end = Math.floor((bucketIndex + 1) * bucketSize);
    const bucket = samples.slice(start, Math.max(end, start + 1));
    const average =
      bucket.reduce((sum, value) => sum + value, 0) / Math.max(bucket.length, 1);

    compressed.push(roundLevel(average));
  }

  return compressed;
}

function expandWaveform(waveform, size) {
  if (size <= 0) {
    return [];
  }

  if (!waveform.length) {
    return Array.from({ length: size }, () => IDLE_LEVEL);
  }

  if (waveform.length === size) {
    return waveform;
  }

  return Array.from({ length: size }, (_, index) => {
    const position = getPointPosition(index, size);
    const sourceIndex = Math.round(position * (waveform.length - 1));
    return waveform[sourceIndex];
  });
}

function updateProgressLine(progressLineElement, progressRatio, isVisible) {
  if (!progressLineElement) {
    return;
  }

  progressLineElement.style.opacity = isVisible ? "1" : "0";

  const safeProgress = clamp(progressRatio, 0, 1);
  progressLineElement.style.left =
    safeProgress >= 1 ? "calc(100% + 2px)" : `${safeProgress * 100}%`;
}

function getPointPosition(index, size) {
  if (size <= 1) {
    return 1;
  }

  return index / (size - 1);
}

function getAudioProgressRatio(audioElement) {
  if (!audioElement || !Number.isFinite(audioElement.duration) || audioElement.duration <= 0) {
    return 0;
  }

  return clamp(audioElement.currentTime / audioElement.duration, 0, 1);
}

function drawGuideLine(context, centerY, width) {
  context.beginPath();
  context.strokeStyle = GUIDE_COLOR;
  context.lineWidth = 1;
  context.moveTo(0, centerY);
  context.lineTo(width, centerY);
  context.stroke();
}

function getStrokeColor({ isLive, isPlayed, level }) {
  if (isLive) {
    return level > 0.16 ? RECORDING_COLOR : UNPLAYED_COLOR;
  }

  return isPlayed ? PLAYED_COLOR : UNPLAYED_COLOR;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function disconnectNode(node) {
  if (!node) {
    return;
  }

  try {
    node.disconnect();
  } catch {
    // ignore disconnect errors from already-detached nodes
  }
}

function roundLevel(value) {
  return Math.round(clamp(value, 0, 1) * 100) / 100;
}
