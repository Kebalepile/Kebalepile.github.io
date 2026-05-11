import {
  loginUser,
  requestPasswordResetOtp,
  resetPasswordWithOtp
} from "../services/authService.js";
import { navigate, navigateAfterAuthentication } from "../router.js";
import {
  clearElement,
  createElement,
  clearFormErrors,
  setFieldError,
  createFieldError
} from "../utils/dom.js";
import { showToast } from "../components/toast.js";
import { createBrandMark } from "../components/brandMark.js";
import { createPublicSiteFooter } from "../components/publicSiteFooter.js";

const yahnehIconUrl = new URL("../../assets/logo/yahneh-icon.png", import.meta.url).href;

export function renderLogin(app) {
  clearElement(app);

  const shell = createElement("section", { className: "auth-shell auth-shell-login" });
  const layout = createElement("div", { className: "auth-layout auth-layout-login" });
  const showcase = createLoginShowcase();
  const pane = createElement("section", { className: "auth-pane auth-pane-login" });
  const mobileBrand = createElement("div", { className: "auth-mobile-brand" });
  const card = createElement("div", { className: "auth-card auth-card-login" });
  const header = createElement("div", { className: "auth-card-copy auth-card-copy-login" });
  const title = createElement("h1", {
    className: "auth-title",
    text: "Login"
  });
  const subtitle = createElement("p", {
    className: "auth-subtitle",
    text: "See local updates, replies, and voice notes from the township and kasi voices near you."
  });

  const loginPanel = createElement("div", {
    className: "auth-login-panel"
  });
  const loginStatus = createLoginStatusPanel();
  const loginTransition = createLoginTransitionPanel();
  const loginForm = createElement("form", {
    className: "auth-form auth-form-login",
    id: "login-form"
  });
  const identifierField = createField({
    labelText: "Username or phone number",
    inputId: "login-identifier",
    type: "text",
    autocomplete: "username"
  });
  const passwordField = createField({
    labelText: "Password",
    inputId: "login-password",
    type: "password",
    autocomplete: "current-password"
  });
  const submitBtn = createElement("button", {
    className: "primary-btn auth-submit-btn",
    text: "Log in",
    type: "submit"
  });
  const forgotBtn = createElement("button", {
    className: "link-btn auth-aux-link",
    text: "Forgot password?",
    type: "button"
  });
  const registerBtn = createElement("button", {
    className: "secondary-btn auth-outline-btn auth-switch-btn",
    text: "Create account",
    type: "button",
    id: "go-register"
  });

  const resetPanel = createElement("div", {
    className: "auth-reset-panel"
  });
  resetPanel.hidden = true;

  const resetCopy = createElement("div", {
    className: "auth-card-copy auth-card-copy-login"
  });
  const resetTitle = createElement("h2", {
    className: "auth-title",
    text: "Reset your password"
  });
  const resetSubtitle = createElement("p", {
    className: "auth-subtitle",
    text: "Enter the verified phone number you used to register. We will send a reset code by SMS, and that code expires after 5 minutes."
  });
  const resetStatus = createElement("p", {
    className: "auth-subtitle",
    text: "Only verified phone numbers can be used for password recovery, and you can only complete one forgot-password reset every 24 hours."
  });
  const resetRequestForm = createElement("form", {
    className: "auth-form auth-form-login",
    id: "forgot-password-request-form"
  });
  const resetPhoneField = createField({
    labelText: "Registered phone number",
    inputId: "forgot-phone-number",
    type: "tel",
    autocomplete: "tel",
    attributes: {
      inputmode: "tel"
    }
  });
  const sendResetOtpBtn = createElement("button", {
    className: "primary-btn auth-submit-btn",
    text: "Send reset code",
    type: "submit"
  });

  const resetConfirmForm = createElement("form", {
    className: "auth-form auth-form-login auth-reset-confirm-form",
    id: "forgot-password-confirm-form"
  });
  resetConfirmForm.hidden = true;

  const resetCodeField = createField({
    labelText: "SMS code",
    inputId: "forgot-reset-code",
    type: "text",
    autocomplete: "one-time-code",
    attributes: {
      inputmode: "numeric",
      maxlength: "8"
    }
  });
  const resetPasswordField = createField({
    labelText: "New password",
    inputId: "forgot-reset-password",
    type: "password",
    autocomplete: "new-password"
  });
  const resetConfirmPasswordField = createField({
    labelText: "Confirm new password",
    inputId: "forgot-reset-confirm-password",
    type: "password",
    autocomplete: "new-password"
  });
  const completeResetBtn = createElement("button", {
    className: "primary-btn auth-submit-btn",
    text: "Reset password",
    type: "submit"
  });
  const resetActionRow = createElement("div", {
    className: "auth-field-row"
  });
  const resendResetOtpBtn = createElement("button", {
    className: "link-btn auth-aux-link",
    text: "Resend code",
    type: "button"
  });
  const backToLoginBtn = createElement("button", {
    className: "secondary-btn auth-outline-btn",
    text: "Back to login",
    type: "button"
  });

  let lastResetPhoneNumber = "";
  let resetRequestBusy = false;
  let resetCountdownIntervalId = null;
  let resetOtpState = {
    expiresAt: null,
    cooldownUntil: null
  };

  const hideLoginFeedback = () => {
    loginStatus.hide();
    loginTransition.hide();
  };

  const setLoginBusyState = (nextBusy) => {
    const isBusy = Boolean(nextBusy);

    [
      identifierField.input,
      passwordField.input,
      submitBtn,
      forgotBtn,
      registerBtn
    ].forEach((control) => {
      if (control) {
        control.disabled = isBusy;
      }
    });

    submitBtn.textContent = isBusy ? "Logging in..." : "Log in";
    card.classList.toggle("auth-card-login-busy", isBusy);
  };

  const clearResetCountdown = () => {
    if (resetCountdownIntervalId) {
      window.clearInterval(resetCountdownIntervalId);
      resetCountdownIntervalId = null;
    }
  };

  const formatCountdown = (targetIsoDate) => {
    const remainingMs = new Date(targetIsoDate).getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    if (minutes <= 0) {
      return `${seconds}s`;
    }

    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  };

  const formatDateTime = (isoDate) => {
    const date = new Date(isoDate);

    if (Number.isNaN(date.getTime())) {
      return "soon";
    }

    return new Intl.DateTimeFormat("en-ZA", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  };

  const syncResetOtpUi = () => {
    const cooldownActive = Boolean(
      resetOtpState.cooldownUntil &&
        new Date(resetOtpState.cooldownUntil).getTime() > Date.now()
    );

    clearResetCountdown();

    if (cooldownActive) {
      resetStatus.textContent = `Reset code sent. It expires ${formatDateTime(
        resetOtpState.expiresAt
      )}. You can resend in ${formatCountdown(resetOtpState.cooldownUntil)}.`;
      resetCountdownIntervalId = window.setInterval(syncResetOtpUi, 1000);
    }

    sendResetOtpBtn.disabled = resetRequestBusy || cooldownActive;
    resendResetOtpBtn.disabled = resetRequestBusy || !lastResetPhoneNumber || cooldownActive;
    sendResetOtpBtn.textContent = resetRequestBusy
      ? "Sending..."
      : cooldownActive
        ? `Resend in ${formatCountdown(resetOtpState.cooldownUntil)}`
        : "Send reset code";
    resendResetOtpBtn.textContent = cooldownActive
      ? `Resend in ${formatCountdown(resetOtpState.cooldownUntil)}`
      : "Resend code";
  };

  function openResetPanel() {
    hideLoginFeedback();
    setLoginBusyState(false);
    const identifierInput = document.getElementById("login-identifier");

    if (identifierInput?.value?.trim()) {
      const resetPhoneInput = document.getElementById("forgot-phone-number");

      if (resetPhoneInput && !resetPhoneInput.value.trim()) {
        resetPhoneInput.value = identifierInput.value.trim();
      }
    }

    loginPanel.hidden = true;
    resetPanel.hidden = false;
    resetStatus.textContent =
      "Enter your verified phone number. The reset code expires after 5 minutes.";
    document.getElementById("forgot-phone-number")?.focus();
    syncResetOtpUi();
  }

  function closeResetPanel() {
    hideLoginFeedback();
    setLoginBusyState(false);
    loginPanel.hidden = false;
    resetPanel.hidden = true;
    resetConfirmForm.hidden = true;
    clearFormErrors(resetRequestForm);
    clearFormErrors(resetConfirmForm);
    resetRequestForm.reset();
    resetConfirmForm.reset();
    lastResetPhoneNumber = "";
    resetOtpState = {
      expiresAt: null,
      cooldownUntil: null
    };
    clearResetCountdown();
    resetStatus.textContent =
      "Only verified phone numbers can be used for password recovery, and you can only complete one forgot-password reset every 24 hours.";
    document.getElementById("login-identifier")?.focus();
    syncResetOtpUi();
  }

  async function sendResetCode(phoneNumber) {
    resetRequestBusy = true;
    syncResetOtpUi();

    let response = null;

    try {
      response = await requestPasswordResetOtp({
        phoneNumber
      });
    } catch (error) {
      if (error?.details?.cooldownUntil) {
        resetOtpState = {
          expiresAt: error.details.expiresAt || resetOtpState.expiresAt || null,
          cooldownUntil: error.details.cooldownUntil
        };
        lastResetPhoneNumber = phoneNumber || lastResetPhoneNumber;
      }

      throw error;
    } finally {
      resetRequestBusy = false;
      syncResetOtpUi();
    }

    lastResetPhoneNumber = response.phoneNumber || phoneNumber;
    resetOtpState = {
      expiresAt: response.expiresAt || null,
      cooldownUntil: response.cooldownUntil || null
    };
    resetConfirmForm.hidden = false;
    resetStatus.textContent = resetOtpState.cooldownUntil
      ? `Reset code sent. It expires ${formatDateTime(resetOtpState.expiresAt)}. You can resend in ${formatCountdown(
          resetOtpState.cooldownUntil
        )}.`
      : "Reset code sent. Enter the SMS code within 5 minutes, then choose your new password.";
    showToast("Password reset code sent.", "success");
    document.getElementById("forgot-reset-code")?.focus();
    syncResetOtpUi();
    return response;
  }

  loginForm.append(identifierField.wrapper, passwordField.wrapper, submitBtn);
  loginPanel.append(loginForm, forgotBtn, registerBtn);

  resetCopy.append(resetTitle, resetSubtitle, resetStatus);
  resetRequestForm.append(resetPhoneField.wrapper, sendResetOtpBtn);
  resetConfirmForm.append(
    resetCodeField.wrapper,
    resetPasswordField.wrapper,
    resetConfirmPasswordField.wrapper,
    completeResetBtn
  );
  resetActionRow.append(resendResetOtpBtn, backToLoginBtn);
  resetPanel.append(resetCopy, resetRequestForm, resetConfirmForm, resetActionRow);

  header.append(title, subtitle);
  mobileBrand.appendChild(createBrandMark({ compact: true, showTagline: false, blurBackground: true }));
  card.append(header, loginStatus.root, loginPanel, resetPanel, loginTransition.root);
  pane.append(mobileBrand, card);
  layout.append(showcase, pane);
  shell.append(
    layout,
    createPublicSiteFooter({
      origin: "login",
      onNavigate: navigate
    })
  );
  app.appendChild(shell);

  [identifierField.input, passwordField.input].forEach((input) => {
    input.addEventListener("input", () => {
      loginStatus.hide();
    });
  });

  registerBtn.addEventListener("click", () => {
    navigate("register");
  });

  forgotBtn.addEventListener("click", () => {
    openResetPanel();
  });

  backToLoginBtn.addEventListener("click", () => {
    closeResetPanel();
  });

  resendResetOtpBtn.addEventListener("click", async () => {
    clearFormErrors(resetRequestForm);

    const phoneNumber = document.getElementById("forgot-phone-number").value;

    try {
      await sendResetCode(phoneNumber);
    } catch (error) {
      handleForgotPasswordError(error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormErrors(loginForm);
    hideLoginFeedback();
    setLoginBusyState(true);

    const identifier = document.getElementById("login-identifier").value;
    const password = document.getElementById("login-password").value;

    try {
      await loginUser({ identifier, password });
      loginTransition.show({
        title: "Welcome back",
        message: "Getting your local feed ready..."
      });
      await navigateAfterAuthentication({
        skipTransition: true
      });
    } catch (error) {
      hideLoginFeedback();
      handleLoginError(error, {
        showStatus: (options) => loginStatus.show(options)
      });
    } finally {
      setLoginBusyState(false);
    }
  });

  resetRequestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormErrors(resetRequestForm);

    const phoneNumber = document.getElementById("forgot-phone-number").value;

    try {
      await sendResetCode(phoneNumber);
    } catch (error) {
      handleForgotPasswordError(error);
    }
  });

  resetConfirmForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormErrors(resetConfirmForm);

    const phoneNumber = document.getElementById("forgot-phone-number").value || lastResetPhoneNumber;
    const code = document.getElementById("forgot-reset-code").value;
    const newPassword = document.getElementById("forgot-reset-password").value;
    const confirmNewPassword = document.getElementById("forgot-reset-confirm-password").value;

    try {
      await resetPasswordWithOtp({
        phoneNumber,
        code,
        newPassword,
        confirmNewPassword
      });

      showToast("Password reset successfully. Log in with your new password.", "success");
      clearResetCountdown();
      navigate("login");
    } catch (error) {
      handleForgotPasswordError(error);
    }
  });
}

function createField({
  labelText,
  inputId,
  type,
  autocomplete,
  required = true,
  attributes = null
}) {
  const wrapper = createElement("div", { className: "field-group auth-field-group" });
  const fieldShell = createElement("label", {
    className: "form-label auth-floating-field",
    attributes: {
      for: inputId
    }
  });
  const input = createElement("input", {
    className: "form-input auth-form-input",
    id: inputId,
    type,
    placeholder: " ",
    required,
    autocomplete,
    attributes: {
      "aria-label": labelText,
      ...(attributes || {})
    }
  });
  const caption = createElement("span", {
    className: "auth-floating-label",
    text: labelText
  });
  const error = createFieldError(inputId);

  const syncFieldState = () => {
    const missingRequired =
      input.dataset.touched === "true" && input.required && !input.value.trim();
    const hasError = input.classList.contains("input-error");
    fieldShell.classList.toggle("auth-floating-field-invalid", missingRequired || hasError);
    input.classList.toggle("auth-empty-error", missingRequired);
  };

  input.addEventListener("blur", () => {
    input.dataset.touched = "true";
    syncFieldState();
  });

  input.addEventListener("input", () => {
    if (input.classList.contains("input-error")) {
      input.classList.remove("input-error");
    }

    if (error.textContent) {
      error.textContent = "";
    }

    syncFieldState();
  });

  input.addEventListener("invalid", () => {
    input.dataset.touched = "true";
    syncFieldState();
  });

  fieldShell.append(input, caption);
  wrapper.append(fieldShell, error);

  return {
    wrapper,
    input,
    error
  };
}

function createLoginStatusPanel() {
  const root = createElement("div", {
    className: "auth-login-status"
  });
  const indicator = createElement("div", {
    className: "auth-login-status-indicator",
    attributes: {
      "aria-hidden": "true"
    }
  });
  const ring = createElement("span", {
    className: "auth-login-status-ring"
  });
  const ringLogo = document.createElement("img");
  const copy = createElement("div", {
    className: "auth-login-status-copy"
  });
  const title = createElement("p", {
    className: "auth-login-status-title"
  });
  const message = createElement("p", {
    className: "auth-login-status-message"
  });
  const dismissBtn = createElement("button", {
    className: "auth-login-status-dismiss",
    text: "x",
    type: "button",
    attributes: {
      "aria-label": "Dismiss login message"
    }
  });

  ringLogo.className = "auth-login-status-logo";
  ringLogo.src = yahnehIconUrl;
  ringLogo.alt = "";
  ringLogo.decoding = "async";
  ring.appendChild(ringLogo);
  indicator.append(ring);
  copy.append(title, message);
  root.append(indicator, copy, dismissBtn);

  const api = {
    root,
    hide() {
      root.className = "auth-login-status";
      title.textContent = "";
      message.textContent = "";
    },
    show({ tone = "error", title: nextTitle = "", message: nextMessage = "" } = {}) {
      root.className = `auth-login-status auth-login-status-visible auth-login-status-${tone}`;
      title.textContent = nextTitle;
      message.textContent = nextMessage;
    }
  };

  dismissBtn.addEventListener("click", () => {
    api.hide();
  });

  return api;
}

function createLoginTransitionPanel() {
  const root = createElement("div", {
    className: "auth-login-transition"
  });
  const card = createElement("div", {
    className: "auth-login-transition-card"
  });
  const orb = createElement("div", {
    className: "auth-login-transition-orb",
    attributes: {
      "aria-hidden": "true"
    }
  });
  const orbCore = createElement("span", {
    className: "auth-login-transition-core"
  });
  const orbLogo = document.createElement("img");

  orbLogo.className = "auth-login-transition-logo";
  orbLogo.src = yahnehIconUrl;
  orbLogo.alt = "";
  orbLogo.decoding = "async";
  const dots = createElement("div", {
    className: "auth-login-transition-dots",
    attributes: {
      "aria-hidden": "true"
    }
  });
  const title = createElement("p", {
    className: "auth-login-transition-title"
  });
  const message = createElement("p", {
    className: "auth-login-transition-message"
  });

  for (let index = 0; index < 3; index += 1) {
    dots.appendChild(
      createElement("span", {
        className: "auth-login-transition-dot"
      })
    );
  }

  orbCore.appendChild(orbLogo);
  orb.appendChild(orbCore);
  card.append(orb, title, message, dots);
  root.appendChild(card);
  root.hidden = true;

  return {
    root,
    hide() {
      root.hidden = true;
      title.textContent = "";
      message.textContent = "";
    },
    show({ title: nextTitle = "", message: nextMessage = "" } = {}) {
      title.textContent = nextTitle;
      message.textContent = nextMessage;
      root.hidden = false;
    }
  };
}

function createLoginShowcase() {
  const showcase = createElement("section", {
    className: "auth-showcase auth-showcase-login"
  });
  const brand = createBrandMark({ showTagline: false, useStreamLogo: true, blurBackground: true });
  const title = createElement("h2", {
    className: "auth-showcase-title"
  });
  const titleLead = createElement("span", {
    className: "auth-showcase-title-line",
    text: "From the township."
  });
  const titleAccent = createElement("span", {
    className: "auth-showcase-title-line auth-showcase-title-accent",
    text: "For the township."
  });
  const copy = createElement("p", {
    className: "auth-showcase-copy",
    text: "Built for local updates, real replies, and voice notes from people who know what is happening around them."
  });
  const collage = createElement("div", { className: "auth-showcase-stack" });

  [
    "Kasi updates",
    "Voice notes from nearby",
    "Replies that keep the loop alive",
    "What is happening now"
  ].forEach((itemText, index) => {
    const card = createElement("div", {
      className: `auth-showcase-card auth-showcase-card-${index + 1}`
    });
    const badge = createElement("span", {
      className: "auth-showcase-card-badge"
    });
    const badgeLogo = document.createElement("img");
    const text = createElement("p", {
      className: "auth-showcase-card-text",
      text: itemText
    });

    badgeLogo.className = "auth-showcase-card-logo";
    badgeLogo.src = yahnehIconUrl;
    badgeLogo.alt = "";
    badgeLogo.decoding = "async";
    badge.appendChild(badgeLogo);
    card.append(badge, text);
    collage.appendChild(card);
  });

  title.append(titleLead, titleAccent);
  showcase.append(brand, title, copy, collage);
  return showcase;
}

function handleLoginError(error, { showStatus = null } = {}) {
  const fieldMap = {
    identifier: "login-identifier",
    password: "login-password"
  };
  const safeMessage = error?.message || "Login failed.";
  const isAccountMissing =
    error?.code === "USER_NOT_FOUND" ||
    safeMessage.toLowerCase() === "account not found.";

  if (isAccountMissing) {
    setFieldError("login-identifier", safeMessage);

    if (typeof showStatus === "function") {
      showStatus({
        tone: "error",
        title: "Account not found",
        message: "We could not find a yahneh account for that username or phone number."
      });
      return;
    }
  }

  if (error?.field && fieldMap[error.field]) {
    setFieldError(fieldMap[error.field], error.message);

    if (typeof showStatus === "function") {
      showStatus({
        tone: "error",
        title: error.field === "password" ? "Check your password" : "Check your details",
        message: safeMessage
      });
      return;
    }

    showToast(error.message, "error");
    return;
  }

  if (typeof showStatus === "function") {
    showStatus({
      tone: "error",
      title: "Could not log in",
      message: safeMessage
    });
    return;
  }

  showToast(safeMessage, "error");
}

function handleForgotPasswordError(error) {
  const fieldMap = {
    phoneNumber: "forgot-phone-number",
    code: "forgot-reset-code",
    password: "forgot-reset-password",
    confirmPassword: "forgot-reset-confirm-password"
  };

  if (error?.field && fieldMap[error.field]) {
    setFieldError(fieldMap[error.field], error.message);
    showToast(error.message, "error");
    return;
  }

  showToast(error?.message || "Could not reset password.", "error");
}
