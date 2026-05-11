import { navigate, registerViewCleanup } from "../router.js";
import { createBrandMark } from "../components/brandMark.js";
import { createPublicSiteFooter } from "../components/publicSiteFooter.js";
import { showToast } from "../components/toast.js";
import { PUBLIC_INFO_LINKS, resolvePublicInfoOrigin, resolvePublicInfoPageKey } from "../config/publicInfoPages.js";
import { clearElement, createElement } from "../utils/dom.js";
import {
  bindInstallPrompt,
  canInstallApp,
  getInstallGuidance,
  isStandaloneApp,
  isInstallPromptReady,
  promptInstallApp,
  subscribeToInstallPromptChange
} from "../utils/pwaInstall.js";

const PUBLIC_INFO_PAGES = {
  about: {
    eyebrow: "About",
    title: "About",
    intro:
      "A township-first platform for sharing real local updates, voice notes, replies, and moments from communities across South Africa. It started from Boitekong but is now built for every township.",
    sections: [
      {
        title: "BETA Version Notice",
        paragraphs: [
          "This is a BETA release. While the core features are functional, you may encounter bugs, performance issues, or incomplete features.",
          "Your feedback is crucial - please report any issues you experience through the contact options below. BETA users help shape the final product."
        ]
      },
      {
        title: "Key Features",
        paragraphs: [
          "• Local feed with posts, comments, and reactions",
          "• Direct messaging with end-to-end encryption",
          "• Voice note support for audio messages",
          "• Real-time notifications and live sync",
          "• User search and community discovery",
          "• Mobile-optimized progressive web app"
        ]
      },
      {
        title: "Community Guidelines",
        paragraphs: [
          "This platform is built for useful township-first updates. Do not share private home addresses or exact user locations.",
          "Report harmful, false, or abusive posts. Keep updates respectful, local, and useful."
        ]
      }
    ]
  },
  help: {
    eyebrow: "Help",
    title: "Help",
    intro:
      "Here are the main things people usually need help with when getting started. This is a BETA version, so some features may be limited or have bugs.",
    sections: [
      {
        title: "Getting started",
        paragraphs: [
          "Create an account with your phone number, complete SMS verification, then explore the feed to see local posts or create your own updates.",
          "Use the search in the top navigation to find people or posts, and access direct messages through the messages section."
        ]
      },
      {
        title: "Common actions",
        paragraphs: [
          "React to posts with emojis, read and reply to comments, send direct messages, and manage notifications from the bell icon.",
          "Voice notes are supported in posts, comments, and messages - tap and hold the microphone icon to record."
        ]
      },
      {
        title: "BETA troubleshooting",
        paragraphs: [
          "If something doesn't work as expected, try refreshing the page first. Clear your browser cache if issues persist.",
          "Report bugs or unexpected behavior through the contact page - your feedback helps improve the BETA version.",
          "Some advanced features may be limited or unavailable during the BETA testing period."
        ]
      }
    ]
  },
  privacy: {
    eyebrow: "Privacy",
    title: "Privacy Notice",
    intro:
      "This Privacy Notice explains what we store, how we use it, and how we protect your data.",
    sections: [
      {
        title: "What we store",
        paragraphs: [
          "We store phone numbers for account verification, SMS OTP, and account recovery.",
          "We store profile information such as username, township area, avatar, and settings.",
          "Posts, comments, replies, reactions, and community interactions are stored to deliver the social experience."
        ]
      },
      {
        title: "How we use it",
        paragraphs: [
          "Your information is used to authenticate you, load your profile, deliver feed content, enable direct messages, and send notifications.",
          "Phone numbers are used only for verification and account security during BETA testing.",
          "We may collect anonymous usage and performance data to improve the app and identify issues during the BETA period."
        ]
      },
      {
        title: "Security and retention",
        paragraphs: [
          "Direct messages are encrypted end-to-end on the frontend, and we use secure server practices for stored data.",
          "Uploaded avatars and other media are stored on the server and served via secure URLs.",
          "Although we take security seriously, this is a BETA service, so please be aware of the usual risks and contact us if you have privacy concerns."
        ]
      },
      {
        title: "Your rights",
        paragraphs: [
          "You can request account deletion, data removal, or privacy support by contacting us through the app or email.",
          "Keep your account information accurate and secure, and do not share your login credentials.",
          "If you want your data removed from the BETA, contact support and we will work to address your request."
        ]
      }
    ]
  },
  terms: {
    eyebrow: "Terms",
    title: "Terms of Use",
    intro:
      "By using the app, you agree to follow these guidelines and understand the BETA nature of the service.",
    sections: [
      {
        title: "Using this BETA service",
        paragraphs: [
          "This is a township-first community app for local posts, comments, direct messages, live streams, and voice notes.",
          "As a BETA release, features may change, and the service may be interrupted for updates or maintenance.",
          "Your continued use of the app means you accept the BETA service terms and any future updates to them."
        ]
      },
      {
        title: "Community conduct",
        paragraphs: [
          "Post lawful, respectful content and avoid harassment, hate speech, impersonation, or abusive behavior.",
          "Do not upload or share illegal content, exact home addresses, private information belonging to others, or content meant to deceive.",
          "Use reporting tools to flag inappropriate content or behavior, and help maintain a safe local community."
        ]
      },
      {
        title: "Content and moderation",
        paragraphs: [
          "You are responsible for the content you share and the activity under your account.",
          "Content that violates these terms or community standards may be removed or restricted.",
          "Accounts may be suspended or terminated if they are used for spam, abuse, or repeated violations."
        ]
      },
      {
        title: "BETA limitations",
        paragraphs: [
          "This BETA service is provided as-is and without warranties. We do not guarantee uninterrupted or error-free operation.",
          "We may change, suspend, or discontinue features at any time while improving the app.",
          "Use the app at your own risk during the BETA period, and contact support if you encounter issues."
        ]
      }
    ]
  },
  contact: {
    eyebrow: "Contact",
    title: "Contact Support",
    intro:
      "Get help with the BETA version, report bugs, or share feedback to improve the app.",
    contactItems: [
      {
        label: "Email",
        value: "boitekongcommunity@gmail.com",
        href: "mailto:boitekongcommunity@gmail.com"
      }
    ],
    sections: [
      {
        title: "How to get help",
        paragraphs: [
          "For bug reports and technical issues, include steps to reproduce and what device/browser you're using.",
          "For feature feedback, describe what you'd like to see improved or added.",
          "For account issues, provide your username and describe the problem."
        ]
      },
      {
        title: "BETA support notes",
        paragraphs: [
          "Response times may vary during BETA testing. We appreciate your patience and detailed feedback.",
          "Critical bugs affecting core functionality will be prioritized for fixes."
        ]
      }
    ]
  },
  install: {
    eyebrow: "Install",
    title: "Install App",
    intro:
      "Add the app to your home screen for a faster, more native mobile experience.",
    sections: [
      {
        title: "Why install the BETA",
        paragraphs: [
          "The installed app launches faster, feels more native on mobile, and provides push notifications for community updates.",
          "BETA installation helps test the PWA features and provides valuable feedback on the installation experience."
        ]
      },
      {
        title: "Installation steps",
        paragraphs: [
          "On supported browsers, you'll see an install prompt. Tap 'Install' or 'Add to Home Screen' when it appears.",
          "On Android Chrome: Use the browser menu (three dots) and choose 'Add to Home screen' or 'Install app'.",
          "On iPhone Safari: Tap the Share button and choose 'Add to Home Screen'."
        ]
      }
    ]
  }
};

export function renderPublicInfo(app, payload = null) {
  clearElement(app);
  bindInstallPrompt();

  const pageKey = resolvePublicInfoPageKey(payload?.page);
  const origin = resolvePublicInfoOrigin(payload?.origin);
  const page = PUBLIC_INFO_PAGES[pageKey] || PUBLIC_INFO_PAGES.about;

  const shell = createElement("section", { className: "public-info-shell" });
  const hero = createElement("header", { className: "public-info-hero" });
  const heroTop = createElement("div", { className: "public-info-hero-top" });
  const brand = createElement("div", { className: "public-info-brand" });
  const backButton = createElement("button", {
    className: "secondary-btn public-info-back-btn",
    type: "button",
    text: origin === "register" ? "Back to sign up" : "Back to login"
  });
  const heroCopy = createElement("div", { className: "public-info-hero-copy" });
  const eyebrow = createElement("p", {
    className: "public-info-eyebrow",
    text: page.eyebrow
  });
  const intro = createElement("p", {
    className: "public-info-intro",
    text: page.intro
  });
  const tabs = createElement("nav", {
    className: "public-info-tabs",
    attributes: {
      "aria-label": "Public pages"
    }
  });
  const main = createElement("main", { className: "public-info-main" });
  const bodyCard = createElement("section", { className: "public-info-card" });
  const sectionList = createElement("div", { className: "public-info-section-list" });

  brand.append(createBrandMark({ compact: true, showTagline: true, useCircleLogo: true }));
  heroCopy.append(eyebrow, intro);
  heroTop.append(brand, backButton);

  PUBLIC_INFO_LINKS.forEach((link) => {
    const tabButton = createElement("button", {
      className: `public-info-tab${link.page === pageKey ? " public-info-tab-active" : ""}`,
      type: "button",
      text: link.label
    });

    if (link.page === pageKey) {
      tabButton.disabled = true;
      tabButton.setAttribute("aria-current", "page");
    }

    tabButton.addEventListener("click", () => {
      void navigate("public-info", {
        page: link.page,
        origin
      });
    });

    tabs.appendChild(tabButton);
  });

  page.sections?.forEach((section) => {
    const sectionCard = createElement("section", { className: "public-info-section-card" });
    const sectionTitle = createElement("h2", {
      className: "public-info-section-title",
      text: section.title
    });
    const paragraphGroup = createElement("div", {
      className: "public-info-section-copy"
    });

    section.paragraphs.forEach((paragraph) => {
      paragraphGroup.appendChild(
        createElement("p", {
          className: "public-info-paragraph",
          text: paragraph
        })
      );
    });

    sectionCard.append(sectionTitle, paragraphGroup);
    sectionList.appendChild(sectionCard);
  });

  if (pageKey === "contact" && Array.isArray(page.contactItems)) {
    const contactCard = createElement("section", {
      className: "public-info-section-card public-info-contact-card"
    });
    const contactTitle = createElement("h2", {
      className: "public-info-section-title",
      text: "Contact details"
    });
    const contactList = createElement("div", {
      className: "public-info-contact-list"
    });

    page.contactItems.forEach((item) => {
      const itemRow = createElement("div", {
        className: "public-info-contact-item"
      });
      const itemLabel = createElement("span", {
        className: "public-info-contact-label",
        text: item.label
      });
      const itemLink = createElement("a", {
        className: "public-info-contact-link",
        text: item.value,
        attributes: /^https?:\/\//i.test(item.href)
          ? {
              href: item.href,
              target: "_blank",
              rel: "noreferrer"
            }
          : {
              href: item.href
            }
      });

      itemRow.append(itemLabel, itemLink);
      contactList.appendChild(itemRow);
    });

    contactCard.append(contactTitle, contactList);
    sectionList.prepend(contactCard);
  }

  if (pageKey === "install") {
    const installCard = createElement("section", {
      className: "public-info-section-card public-info-install-card"
    });
    const installTitle = createElement("h2", {
      className: "public-info-section-title",
      text: "Install status"
    });
    const installStatus = createElement("p", {
      className: "public-info-paragraph"
    });
    const installButton = createElement("button", {
      className: "primary-btn public-info-install-btn",
      type: "button",
      text: "Install app"
    });

    const syncInstallState = () => {
      const standalone = isStandaloneApp();
      const installAvailable = canInstallApp();
      const installPromptReady = isInstallPromptReady();

      installButton.hidden = standalone;
      installButton.disabled = !installAvailable;
      installButton.textContent = installPromptReady ? "Install app" : "Install help";

      if (standalone) {
        installStatus.textContent =
          "This app already looks installed on this device.";
        return;
      }

      installStatus.textContent = getInstallGuidance();
    };

    syncInstallState();
    installButton.addEventListener("click", async () => {
      const didPrompt = await promptInstallApp();

      if (!didPrompt) {
        showToast(getInstallGuidance(), "error", {
          title: "Install"
        });
      }

      syncInstallState();
    });

    registerViewCleanup(subscribeToInstallPromptChange(syncInstallState));
    installCard.append(installTitle, installStatus, installButton);
    sectionList.prepend(installCard);
  }

  backButton.addEventListener("click", () => {
    void navigate(origin);
  });

  bodyCard.append(sectionList);
  hero.append(heroTop, heroCopy, tabs);
  main.appendChild(bodyCard);
  shell.append(
    hero,
    main,
    createPublicSiteFooter({
      origin,
      activePage: pageKey,
      onNavigate: navigate
    })
  );
  app.appendChild(shell);
}
