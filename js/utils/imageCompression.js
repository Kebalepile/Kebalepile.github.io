const DEFAULT_QUALITY_STEPS = [0.9, 0.84, 0.78, 0.72, 0.66, 0.6, 0.54, 0.48, 0.42, 0.36];
const DEFAULT_SCALE_STEPS = [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36, 0.28];
const DEFAULT_MIME_TYPES = ["image/webp", "image/jpeg"];

export async function compressImageFile(
  file,
  {
    maxBytes = 1024 * 1024,
    maxWidth = 1600,
    maxHeight = 1600,
    preferredMimeTypes = DEFAULT_MIME_TYPES,
    scaleSteps = DEFAULT_SCALE_STEPS,
    qualitySteps = DEFAULT_QUALITY_STEPS
  } = {}
) {
  const loadedImage = await loadImageFile(file);

  try {
    if (
      file.size <= maxBytes &&
      loadedImage.width <= maxWidth &&
      loadedImage.height <= maxHeight
    ) {
      return {
        blob: file,
        dataUrl: await readBlobAsDataUrl(file),
        mimeType: file.type || "image/jpeg",
        width: loadedImage.width,
        height: loadedImage.height,
        sizeBytes: file.size,
        originalSizeBytes: file.size,
        optimized: false
      };
    }

    const fittedSize = fitWithinBounds({
      width: loadedImage.width,
      height: loadedImage.height,
      maxWidth,
      maxHeight
    });
    const mimeTypes = Array.from(
      new Set(
        [file.type, ...preferredMimeTypes].filter(
          (mimeType) => typeof mimeType === "string" && mimeType.trim()
        )
      )
    );
    const safeScaleSteps =
      Array.isArray(scaleSteps) && scaleSteps.length > 0 ? scaleSteps : DEFAULT_SCALE_STEPS;
    const safeQualitySteps =
      Array.isArray(qualitySteps) && qualitySteps.length > 0
        ? qualitySteps
        : DEFAULT_QUALITY_STEPS;
    let bestCandidate = null;

    for (const scale of safeScaleSteps) {
      const width = Math.max(1, Math.round(fittedSize.width * scale));
      const height = Math.max(1, Math.round(fittedSize.height * scale));
      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", {
        alpha: true,
        willReadFrequently: false
      });

      if (!context) {
        throw new Error("Image optimization is not supported on this device.");
      }

      context.clearRect(0, 0, width, height);
      context.drawImage(loadedImage.image, 0, 0, width, height);

      for (const mimeType of mimeTypes) {
        const nextQualitySteps = mimeType === "image/png" ? [undefined] : safeQualitySteps;

        for (const quality of nextQualitySteps) {
          const blob = await canvasToBlob(canvas, mimeType, quality);

          if (!blob) {
            continue;
          }

          if (!bestCandidate || blob.size < bestCandidate.blob.size) {
            bestCandidate = {
              blob,
              width,
              height
            };
          }

          if (blob.size <= maxBytes) {
            return serializeCompressionResult({
              blob,
              width,
              height,
              originalSizeBytes: file.size,
              optimized: true
            });
          }
        }
      }
    }

    if (bestCandidate) {
      throw new Error(
        `Could not shrink that image below ${formatImageBytes(maxBytes)} without making it too small. Try a less detailed photo.`
      );
    }

    throw new Error("Could not optimize the selected image.");
  } finally {
    loadedImage.revoke();
  }
}

export function formatImageBytes(bytes = 0) {
  const safeBytes = Number.isFinite(bytes) ? Math.max(0, Number(bytes)) : 0;

  if (safeBytes < 1024) {
    return `${safeBytes} B`;
  }

  if (safeBytes < 1024 * 1024) {
    return `${(safeBytes / 1024).toFixed(safeBytes < 10 * 1024 ? 1 : 0)} KB`;
  }

  return `${(safeBytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatImageOptimizationSummary(result, label = "Image") {
  if (!result) {
    return "";
  }

  const currentSize = formatImageBytes(result.sizeBytes);

  if (!result.optimized || result.originalSizeBytes === result.sizeBytes) {
    return `${label} ready at ${currentSize}.`;
  }

  return `${label} optimized from ${formatImageBytes(result.originalSizeBytes)} to ${currentSize}.`;
}

function fitWithinBounds({ width, height, maxWidth, maxHeight }) {
  const widthRatio = maxWidth > 0 ? maxWidth / width : 1;
  const heightRatio = maxHeight > 0 ? maxHeight / height : 1;
  const ratio = Math.min(1, widthRatio, heightRatio);

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  };
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.decoding = "async";
    image.onload = () => {
      resolve({
        image,
        width: image.naturalWidth || image.width || 1,
        height: image.naturalHeight || image.height || 1,
        revoke: () => URL.revokeObjectURL(objectUrl)
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the selected image."));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(blob);
  });
}

async function serializeCompressionResult({
  blob,
  width,
  height,
  originalSizeBytes,
  optimized
}) {
  return {
    blob,
    dataUrl: await readBlobAsDataUrl(blob),
    mimeType: blob.type || "image/jpeg",
    width,
    height,
    sizeBytes: blob.size,
    originalSizeBytes,
    optimized
  };
}
