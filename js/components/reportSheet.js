import { createElement } from "../utils/dom.js";
import { createReport, REPORT_REASONS } from "../services/reportService.js";
import { MAX_REPORT_NOTE_LENGTH } from "../utils/validators.js";
import { showToast } from "./toast.js";
import { clearNotificationsForReportedTarget } from "../services/notificationService.js";

const REPORT_SHEET_ROOT_ID = "report-sheet-root";

export function showReportSheet({
  reporterUserId,
  targetType,
  targetId,
  onSubmitted = null
}) {
  const existing = document.getElementById(REPORT_SHEET_ROOT_ID);

  if (existing) {
    existing.remove();
  }

  const root = createElement("div", {
    id: REPORT_SHEET_ROOT_ID,
    className: "report-sheet-root"
  });
  const overlay = createElement("div", {
    className: "report-sheet-overlay"
  });
  const container = createElement("div", {
    className: "report-sheet-container"
  });
  const card = createElement("section", {
    className: "report-sheet-card",
    attributes: {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": `Report ${targetType === "comment" ? "comment" : "post"}`
    }
  });
  const chrome = createElement("div", { className: "report-sheet-chrome" });
  const handle = createElement("span", {
    className: "report-sheet-handle",
    attributes: { "aria-hidden": "true" }
  });
  const closeBtn = createElement("button", {
    className: "report-sheet-close-btn",
    type: "button",
    attributes: {
      "aria-label": "Close report form",
      title: "Close"
    }
  });
  const copy = createElement("div", { className: "report-sheet-copy" });
  const title = createElement("h3", {
    className: "report-sheet-title",
    text: `Report ${targetType === "comment" ? "comment" : "post"}`
  });
  const text = createElement("p", {
    className: "report-sheet-text",
    text: "What are you reporting?"
  });
  const form = createElement("form", {
    className: "report-sheet-form"
  });
  const reasonGroup = createElement("div", {
    className: "report-sheet-reasons"
  });
  const noteWrap = createElement("div", {
    className: "report-sheet-note-wrap"
  });
  const noteLabel = createElement("label", {
    className: "field-group",
    attributes: {
      for: "report-note"
    }
  });
  const noteTitle = createElement("span", {
    text: "Other"
  });
  const noteInput = document.createElement("textarea");
  noteInput.id = "report-note";
  noteInput.className = "form-input report-sheet-note-input";
  noteInput.placeholder = "Tell us what you are reporting";
  noteInput.maxLength = MAX_REPORT_NOTE_LENGTH;
  const noteCounter = createElement("span", {
    className: "char-counter",
    text: `0 / ${MAX_REPORT_NOTE_LENGTH}`
  });
  const options = createElement("div", {
    className: "report-sheet-options"
  });
  const hideLabel = createElement("label", {
    className: "report-sheet-hide-toggle"
  });
  const hideInput = createElement("input", {
    className: "report-sheet-hide-input",
    type: "checkbox",
    attributes: {
      "aria-label": `Hide this ${targetType === "comment" ? "comment" : "post"} for me`
    }
  });
  const hideCopy = createElement("div", {
    className: "report-sheet-hide-copy"
  });
  const hideTitle = createElement("strong", {
    className: "report-sheet-hide-title",
    text: `Hide this ${targetType === "comment" ? "comment" : "post"} for me`
  });
  const hideHint = createElement("span", {
    className: "report-sheet-hide-hint",
    text: "You will stop seeing it in your app after submitting."
  });
  const error = createElement("p", {
    className: "field-error report-sheet-error"
  });
  const actions = createElement("div", {
    className: "report-sheet-actions"
  });
  const cancelBtn = createElement("button", {
    className: "secondary-btn",
    type: "button",
    text: "Cancel"
  });
  const submitBtn = createElement("button", {
    className: "primary-btn",
    type: "submit",
    text: "Submit report"
  });

  let selectedReason = "";

  const closeSheet = () => {
    root.remove();
    document.removeEventListener("keydown", handleKeyDown);
  };

  const syncNoteCounter = () => {
    noteCounter.textContent = `${noteInput.value.length} / ${MAX_REPORT_NOTE_LENGTH}`;
    noteCounter.className =
      noteInput.value.length >= MAX_REPORT_NOTE_LENGTH
        ? "char-counter char-counter-limit"
        : "char-counter";
  };

  const syncNoteVisibility = () => {
    const showNote = selectedReason === "Other";
    noteWrap.style.display = showNote ? "" : "none";

    if (!showNote) {
      noteInput.value = "";
      syncNoteCounter();
    }
  };

  const selectReason = (reason) => {
    selectedReason = reason;
    error.textContent = "";

    Array.from(reasonGroup.querySelectorAll(".report-sheet-reason-btn")).forEach((button) => {
      const active = button.dataset.reason === selectedReason;
      button.classList.toggle("report-sheet-reason-btn-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    syncNoteVisibility();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      closeSheet();
    }
  };

  REPORT_REASONS.forEach((reason) => {
    const button = createElement("button", {
      className: "report-sheet-reason-btn",
      type: "button",
      text: reason,
      attributes: {
        "aria-pressed": "false"
      }
    });

    button.dataset.reason = reason;
    button.addEventListener("click", () => {
      selectReason(reason);
    });

    reasonGroup.appendChild(button);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const result = await createReport({
        reporterUserId,
        targetType,
        targetId,
        reason: selectedReason,
        note: noteInput.value,
        hideForReporter: hideInput.checked
      });

      if (hideInput.checked) {
        clearNotificationsForReportedTarget({
          userId: reporterUserId,
          targetType,
          targetId
        });
      }

      closeSheet();

      if (typeof onSubmitted === "function") {
        onSubmitted({
          ...result,
          hideForReporter: hideInput.checked
        });
      }

      if (result.status === "updated" && hideInput.checked) {
        showToast("Already reported. Hidden for you.", "success");
        return;
      }

      showToast(
        hideInput.checked ? "Report submitted. Hidden for you." : "Report submitted.",
        "success"
      );
    } catch (reportError) {
      error.textContent = reportError.message || "Could not submit report.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit report";
    }
  });

  overlay.addEventListener("click", closeSheet);
  container.addEventListener("click", (event) => {
    if (event.target === container) {
      closeSheet();
    }
  });
  card.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  closeBtn.addEventListener("click", closeSheet);
  cancelBtn.addEventListener("click", closeSheet);
  document.addEventListener("keydown", handleKeyDown);
  noteInput.addEventListener("input", syncNoteCounter);

  closeBtn.appendChild(createCloseIcon());
  chrome.append(handle, closeBtn);
  copy.append(title, text);
  noteLabel.append(noteTitle, noteInput);
  noteWrap.append(noteLabel, noteCounter);
  hideCopy.append(hideTitle, hideHint);
  hideLabel.append(hideInput, hideCopy);
  options.appendChild(hideLabel);
  actions.append(cancelBtn, submitBtn);
  form.append(reasonGroup, noteWrap, options, error, actions);
  card.append(chrome, copy, form);
  container.appendChild(card);
  root.append(overlay, container);
  document.body.appendChild(root);

  syncNoteCounter();
  syncNoteVisibility();
}

function createCloseIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("report-sheet-close-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "1.9");
  path.setAttribute("d", "M6 6 18 18M18 6 6 18");
  svg.appendChild(path);

  return svg;
}
