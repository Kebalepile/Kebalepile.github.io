export const PUBLIC_INFO_LINKS = [
  {
    page: "about",
    label: "About"
  },
  {
    page: "help",
    label: "Help"
  },
  {
    page: "privacy",
    label: "Privacy"
  },
  {
    page: "terms",
    label: "Terms & Conditions"
  },
  {
    page: "contact",
    label: "Contact"
  },
  {
    page: "install",
    label: "Install app"
  }
];

const PUBLIC_INFO_PAGE_IDS = new Set(PUBLIC_INFO_LINKS.map((link) => link.page));
const PUBLIC_INFO_ORIGIN_ROUTES = new Set(["login", "register"]);

export function resolvePublicInfoPageKey(value) {
  const normalizedValue = typeof value === "string" ? value.trim().toLowerCase() : "";
  return PUBLIC_INFO_PAGE_IDS.has(normalizedValue) ? normalizedValue : "about";
}

export function resolvePublicInfoOrigin(value) {
  const normalizedValue = typeof value === "string" ? value.trim().toLowerCase() : "";
  return PUBLIC_INFO_ORIGIN_ROUTES.has(normalizedValue) ? normalizedValue : "login";
}
