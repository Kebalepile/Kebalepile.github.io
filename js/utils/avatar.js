import { createElement } from "./dom.js";
import { protectImageElement, protectMediaShell } from "./protectedMedia.js";

const AVATAR_PALETTE = [
  { background: "linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)", color: "#1d4ed8" },
  { background: "linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)", color: "#b45309" },
  { background: "linear-gradient(180deg, #ede9fe 0%, #ddd6fe 100%)", color: "#6d28d9" },
  { background: "linear-gradient(180deg, #dcfce7 0%, #bbf7d0 100%)", color: "#15803d" },
  { background: "linear-gradient(180deg, #fee2e2 0%, #fecaca 100%)", color: "#b91c1c" }
];

const brokenAvatarUrls = new Set();

export function createAvatarElement(user, { size = "md", className = "", decorative = false } = {}) {
  const avatar = createElement("div", {
    className: `avatar avatar-${size}${className ? ` ${className}` : ""}`
  });
  protectMediaShell(avatar);

  const avatarSource =
    typeof user?.avatarUrl === "string" && user.avatarUrl
      ? user.avatarUrl
      : typeof user?.avatarDataUrl === "string"
        ? user.avatarDataUrl
        : "";
  const avatarLabel = user?.username || "User avatar";

  if (avatarSource && !brokenAvatarUrls.has(avatarSource)) {
    const image = document.createElement("img");
    image.className = "avatar-image";
    image.src = avatarSource;
    image.alt = decorative ? "" : avatarLabel;
    image.loading = "lazy";
    protectImageElement(image);

    if (decorative) {
      image.setAttribute("aria-hidden", "true");
    }

    image.addEventListener("error", () => {
      brokenAvatarUrls.add(avatarSource);
      avatar.replaceChildren();
      applyAvatarPlaceholder(avatar, user, avatarLabel, decorative);
    });

    avatar.appendChild(image);
    return avatar;
  }

  applyAvatarPlaceholder(avatar, user, avatarLabel, decorative);

  return avatar;
}

export function getAvatarInitials(value = "") {
  const words = String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "Y";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read the selected image."));

    reader.readAsDataURL(file);
  });
}

function getAvatarPalette(seed) {
  const input = String(seed || "boitekong-plus");
  let total = 0;

  for (let index = 0; index < input.length; index += 1) {
    total += input.charCodeAt(index);
  }

  return AVATAR_PALETTE[total % AVATAR_PALETTE.length];
}

function applyAvatarPlaceholder(avatar, user, avatarLabel, decorative) {
  const palette = getAvatarPalette(user?.username || "");
  avatar.classList.add("avatar-placeholder");
  avatar.style.background = palette.background;
  avatar.style.color = palette.color;
  avatar.textContent = getAvatarInitials(user?.username || "Y");

  if (decorative) {
    avatar.setAttribute("aria-hidden", "true");
    avatar.removeAttribute("aria-label");
    avatar.removeAttribute("role");
    return;
  }

  avatar.setAttribute("aria-label", avatarLabel);
  avatar.setAttribute("role", "img");
}
