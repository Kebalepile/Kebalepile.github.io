import { createElement } from "../utils/dom.js";
import { PUBLIC_INFO_LINKS } from "../config/publicInfoPages.js";

export function createPublicSiteFooter({
  origin = "login",
  activePage = "",
  onNavigate = () => {}
} = {}) {
  const footer = createElement("footer", { className: "auth-site-footer" });
  const links = createElement("div", { className: "auth-site-footer-links" });
  const meta = createElement("div", { className: "auth-site-footer-meta" });

  PUBLIC_INFO_LINKS.forEach(({ page, label }) => {
    const isActive = activePage === page;
    const linkButton = createElement("button", {
      className: `auth-site-footer-link${isActive ? " auth-site-footer-link-active" : ""}`,
      type: "button",
      text: label
    });

    if (isActive) {
      linkButton.disabled = true;
      linkButton.setAttribute("aria-current", "page");
    }

    linkButton.addEventListener("click", () => {
      onNavigate("public-info", {
        page,
        origin
      });
    });

    links.appendChild(linkButton);
  });

  meta.append(
    createElement("span", {
      className: "auth-site-footer-meta-text",
      text: "English"
    }),
    createElement("span", {
      className: "auth-site-footer-meta-text",
      text: "Copyright 2025"
    })
  );

  footer.append(links, meta);
  return footer;
}
