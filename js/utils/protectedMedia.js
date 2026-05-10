const PROTECTED_MEDIA_SELECTOR = ".protected-media, .protected-media-shell";

let guardsBound = false;

export function protectMediaShell(element) {
  if (!element) {
    return element;
  }

  element.classList.add("protected-media-shell");
  return element;
}

export function protectImageElement(image) {
  if (!image) {
    return image;
  }

  image.classList.add("protected-media");
  image.setAttribute("draggable", "false");
  image.draggable = false;
  return image;
}

export function bindProtectedMediaGuards() {
  if (guardsBound || typeof document === "undefined") {
    return;
  }

  guardsBound = true;

  const shouldGuardTarget = (target) =>
    target instanceof Element && Boolean(target.closest(PROTECTED_MEDIA_SELECTOR));

  document.addEventListener("contextmenu", (event) => {
    if (shouldGuardTarget(event.target)) {
      event.preventDefault();
    }
  });

  document.addEventListener("dragstart", (event) => {
    if (shouldGuardTarget(event.target)) {
      event.preventDefault();
    }
  });
}
