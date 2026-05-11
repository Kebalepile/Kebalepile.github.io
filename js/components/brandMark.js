import { createElement } from "../utils/dom.js";
import { protectImageElement, protectMediaShell } from "../utils/protectedMedia.js";

const defaultBrandIconUrl = new URL("../../assets/logo/yahneh-logo.png", import.meta.url).href;
const circleBrandIconUrl = new URL("../../assets/logo/yahneh-pwa-circle-192.png", import.meta.url).href;

export function createBrandMark({ compact = false, showTagline = false, useCircleLogo = false, blurBackground = false } = {}) {
  const wrapper = createElement("div", {
    className: `brand-mark${compact ? " brand-mark-compact" : ""}`
  });

  const icon = createElement("div", {
    className: `brand-mark-icon${blurBackground ? " brand-mark-icon-blur" : ""}`
  });
  protectMediaShell(icon);
  const image = document.createElement("img");
  image.className = "brand-mark-image";
  const logoUrl = useCircleLogo ? circleBrandIconUrl : defaultBrandIconUrl;
  image.src = logoUrl;
  image.alt = "";
  image.decoding = "async";
  protectImageElement(image);
  icon.appendChild(image);

  if (showTagline) {
    const text = createElement("div", { className: "brand-mark-copy" });
    text.appendChild(
      createElement("span", {
        className: "brand-mark-tagline",
        text: "See it. Share it. YAHNEH."
      })
    );
    wrapper.append(icon, text);
    return wrapper;
  }

  wrapper.appendChild(icon);
  return wrapper;
}
