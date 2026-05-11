import {
  registerUser,
  requestRegistrationOtp,
  verifyRegistrationOtp
} from "../services/authService.js";
import { navigate, navigateAfterAuthentication, registerViewCleanup } from "../router.js";
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

const PHONE_REGEX = /^(?:\+?\d[\d -]{8,18}\d)$/;
const TOWNSHIP_REGEX = /^(?=.{2,40}$)[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const EXTENSION_REGEX = /^(?=.{1,12}$)(?:Ext(?:ension)?\.?\s?\d{1,3}|\d{1,3})$/i;
const LOCATION_PART_REGEX = /^(?=.{2,60}$)[A-Za-z0-9]+(?:[ .,'/-][A-Za-z0-9]+)*$/;
const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape"
];
const COMMON_WEAK_PASSWORDS = new Set([
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "12345",
  "1234",
  "123",
  "password",
  "password1",
  "password123",
  "admin",
  "admin123",
  "qwerty",
  "qwerty123",
  "abc123",
  "111111",
  "000000",
  "iloveyou",
  "monkey",
  "dragon",
  "letmein",
  "welcome",
  "secret"
]);

export function renderRegister(app) {
  clearElement(app);

  const shell = createElement("section", { className: "auth-shell auth-shell-register" });
  const layout = createElement("div", { className: "auth-layout auth-layout-register" });
  const pane = createElement("section", { className: "auth-pane auth-pane-register" });
  const card = createElement("div", { className: "auth-card auth-card-register" });
  const brand = createElement("div", { className: "auth-register-brand" });
  const header = createElement("div", { className: "auth-card-copy auth-card-copy-register" });
  const title = createElement("h1", {
    className: "auth-title",
    text: "Create account"
  });
  const subtitle = createElement("p", {
    className: "auth-subtitle",
    text: "Start with your personal info, then move through password and phone verification."
  });
  const form = createElement("form", {
    className: "auth-form auth-form-register",
    id: "register-form"
  });
  const progress = createRegisterProgress();

  const phoneField = createField({
    labelText: "Phone number",
    inputId: "register-phone-number",
    type: "tel",
    autocomplete: "tel",
    attributes: { inputmode: "tel" }
  });
  const usernameField = createField({
    labelText: "Username",
    inputId: "register-username",
    type: "text",
    autocomplete: "username"
  });
  const provinceField = createSelectField({
    labelText: "Province",
    inputId: "register-province",
    options: PROVINCES,
    autocomplete: "address-level1"
  });
  const municipalityField = createField({
    labelText: "Municipality",
    inputId: "register-municipality",
    type: "text",
    autocomplete: "address-level2"
  });
  const townshipField = createField({
    labelText: "Township",
    inputId: "register-township",
    type: "text",
    autocomplete: "address-level3"
  });
  const extensionField = createField({
    labelText: "Extension",
    inputId: "register-extension",
    type: "text",
    autocomplete: "off"
  });
  const passwordField = createField({
    labelText: "Password",
    inputId: "register-password",
    type: "password",
    autocomplete: "new-password"
  });
  const confirmPasswordField = createField({
    labelText: "Confirm password",
    inputId: "register-confirm-password",
    type: "password",
    autocomplete: "new-password"
  });
  const verificationCodeField = createField({
    labelText: "SMS code",
    inputId: "register-verification-code",
    type: "text",
    autocomplete: "one-time-code",
    required: false,
    attributes: {
      inputmode: "numeric",
      maxlength: "8"
    }
  });
  const ageConfirmField = createAgeConfirmField();

  const personalStage = createElement("section", {
    className: "auth-register-stage auth-register-stage-personal"
  });
  const passwordStage = createElement("section", {
    className: "auth-register-stage auth-register-stage-password"
  });
  const verifyStage = createElement("section", {
    className: "auth-register-stage auth-register-stage-verify"
  });
  passwordStage.hidden = true;
  verifyStage.hidden = true;

  const personalLead = createElement("p", {
    className: "auth-register-stage-note",
    text: "Step 1 of 3. Add the personal details we need before we move on."
  });
  const locationContextRow = createElement("div", { className: "auth-field-row" });
  locationContextRow.append(provinceField.wrapper, municipalityField.wrapper);
  const locationRow = createElement("div", { className: "auth-field-row" });
  locationRow.append(townshipField.wrapper, extensionField.wrapper);
  const personalActions = createElement("div", {
    className: "auth-register-stage-actions auth-register-stage-actions-center"
  });
  const personalNextBtn = createElement("button", {
    className: "primary-btn auth-submit-btn auth-register-inline-btn",
    text: "Next",
    type: "button"
  });
  personalActions.appendChild(personalNextBtn);
  personalStage.append(
    personalLead,
    phoneField.wrapper,
    usernameField.wrapper,
    locationContextRow,
    locationRow,
    personalActions
  );

  const passwordLead = createElement("p", {
    className: "auth-register-stage-note",
    text: "Step 2 of 3. Create a strong password before we send your signup code."
  });
  const passwordRow = createElement("div", { className: "auth-field-row" });
  passwordRow.append(passwordField.wrapper, confirmPasswordField.wrapper);
  const passwordActions = createElement("div", {
    className: "auth-register-stage-actions auth-register-stage-actions-between"
  });
  const passwordBackBtn = createElement("button", {
    className: "secondary-btn auth-outline-btn auth-register-inline-btn",
    text: "Back",
    type: "button"
  });
  const passwordNextBtn = createElement("button", {
    className: "primary-btn auth-submit-btn auth-register-inline-btn",
    text: "Next",
    type: "button"
  });
  passwordActions.append(passwordBackBtn, passwordNextBtn);
  passwordStage.append(passwordLead, passwordRow, passwordActions);

  const verifyLead = createElement("p", {
    className: "auth-register-stage-note",
    text: "Step 3 of 3. Verify your phone number, confirm you are 16 or older, then create the account."
  });
  const verificationPanel = createElement("div", {
    className: "auth-register-verification"
  });
  const verificationHeadline = createElement("h2", {
    className: "auth-register-verification-title",
    text: "Verify your phone number"
  });
  const verificationStatus = createElement("p", {
    className: "auth-register-verification-status",
    text: "We will send an SMS code to the phone number you entered in step 1."
  });
  const verificationSummary = createElement("div", {
    className: "auth-register-verification-summary"
  });
  const verificationPhone = createElement("p", {
    className: "auth-register-verification-summary-line"
  });
  const verificationAccount = createElement("p", {
    className: "auth-register-verification-summary-line"
  });
  verificationSummary.append(verificationPhone, verificationAccount);
  const verifyCodeActions = createElement("div", {
    className: "auth-register-verification-actions"
  });
  const resendBtn = createElement("button", {
    className: "link-btn auth-aux-link auth-register-verification-link",
    text: "Resend code",
    type: "button"
  });
  const verifyPhoneBtn = createElement("button", {
    className: "secondary-btn auth-outline-btn auth-register-inline-btn",
    text: "Verify phone",
    type: "button"
  });
  verifyCodeActions.append(resendBtn, verifyPhoneBtn);
  verificationPanel.append(
    verificationHeadline,
    verificationStatus,
    verificationSummary,
    verificationCodeField.wrapper,
    verifyCodeActions
  );

  const legal = createElement("div", { className: "auth-legal-copy-block" });
  const legalLead = createElement("p", {
    className: "auth-legal-copy",
    text:
      "By tapping Create account, you agree to yahneh's Terms & Conditions and Privacy Policy."
  });
  const legalFollow = createElement("p", {
    className: "auth-legal-copy",
    text:
      "Your phone number must be verified by SMS before the new account is created, and phone numbers remain unique."
  });
  const legalLinks = createElement("p", { className: "auth-legal-links" });
  legalLinks.append(
    createElement("span", {
      className: "auth-legal-link",
      text: "Terms & Conditions"
    }),
    createElement("span", {
      className: "auth-legal-separator",
      text: " | "
    }),
    createElement("span", {
      className: "auth-legal-link",
      text: "Privacy Policy"
    })
  );
  legal.append(legalLead, legalFollow, legalLinks);

  const verifyActions = createElement("div", {
    className: "auth-register-stage-actions auth-register-stage-actions-between"
  });
  const verifyBackBtn = createElement("button", {
    className: "secondary-btn auth-outline-btn auth-register-inline-btn",
    text: "Back",
    type: "button"
  });
  const createAccountBtn = createElement("button", {
    className: "primary-btn auth-submit-btn auth-register-inline-btn",
    text: "Create account",
    type: "submit"
  });
  verifyActions.append(verifyBackBtn, createAccountBtn);
  verifyStage.append(
    verifyLead,
    verificationPanel,
    ageConfirmField.element,
    legal,
    verifyActions
  );

  const loginBtn = createElement("button", {
    className: "secondary-btn auth-outline-btn auth-switch-btn",
    text: "I already have an account",
    type: "button",
    id: "go-login"
  });
  const stageHost = createElement("div", {
    className: "auth-register-stage-host"
  });

  form.append(progress.root, stageHost);
  brand.appendChild(createBrandMark({ compact: true, showTagline: false, useStreamLogo: true, blurBackground: true }));
  header.append(title, subtitle);
  card.append(brand, header, form, loginBtn);
  pane.append(card);
  layout.append(pane);
  shell.append(
    layout,
    createPublicSiteFooter({
      origin: "register",
      onNavigate: navigate
    })
  );
  app.appendChild(shell);

  let currentStep = 1;
  let renderedStep = 0;
  let requestingCode = false;
  let verifyingPhone = false;
  let creatingAccount = false;
  let countdownIntervalId = null;
  let verificationState = {
    phoneNumber: "",
    expiresAt: null,
    cooldownUntil: null,
    verified: false,
    verifiedAt: null
  };

  const stepOneFieldIds = new Set([
    "phoneNumber",
    "username",
    "province",
    "municipality",
    "township",
    "extension",
    "area"
  ]);
  const stepTwoFieldIds = new Set(["password", "confirmPassword"]);

  const clearCountdown = () => {
    if (countdownIntervalId) {
      window.clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }
  };

  const getPayload = () => ({
    username: usernameField.input.value,
    phoneNumber: phoneField.input.value,
    province: provinceField.input.value,
    municipality: municipalityField.input.value,
    township: townshipField.input.value,
    extension: extensionField.input.value,
    password: passwordField.input.value,
    confirmPassword: confirmPasswordField.input.value
  });

  const getCurrentPhoneNumber = () => phoneField.input.value.trim();
  const getCurrentUsername = () => collapseWhitespace(usernameField.input.value);
  const getCurrentLocation = () => {
    const province = collapseWhitespace(provinceField.input.value);
    const municipality = collapseWhitespace(municipalityField.input.value);
    const township = collapseWhitespace(townshipField.input.value);
    const area = collapseWhitespace(extensionField.input.value);

    return [township, area, municipality, province].filter(Boolean).join(", ");
  };

  const resetPhoneVerificationState = () => {
    verificationState = {
      phoneNumber: "",
      expiresAt: null,
      cooldownUntil: null,
      verified: false,
      verifiedAt: null
    };
    verificationCodeField.input.value = "";
  };

  const hasVerificationForCurrentPhone = () =>
    Boolean(verificationState.phoneNumber) &&
    verificationState.phoneNumber === getCurrentPhoneNumber();

  const hasUsableVerificationStepState = () =>
    hasVerificationForCurrentPhone() &&
    (
      verificationState.verified ||
      Boolean(
        verificationState.expiresAt &&
          new Date(verificationState.expiresAt).getTime() > Date.now()
      )
    );

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

  const updateStepCopy = () => {
    if (currentStep === 1) {
      title.textContent = "Create account";
      subtitle.textContent =
        "Start with your personal info, then move through password and phone verification.";
      return;
    }

    if (currentStep === 2) {
      title.textContent = "Choose your password";
      subtitle.textContent =
        "Add a strong password now. We will send your signup code in the next step.";
      return;
    }

    title.textContent = "Verify and create";
    subtitle.textContent =
      "Verify the phone number first, confirm you are 16 or older, then create the account.";
  };

  const renderCurrentStage = () => {
    if (renderedStep === currentStep && stageHost.firstElementChild) {
      return;
    }

    if (currentStep === 1) {
      stageHost.replaceChildren(personalStage);
      renderedStep = 1;
      return;
    }

    if (currentStep === 2) {
      stageHost.replaceChildren(passwordStage);
      renderedStep = 2;
      return;
    }

    stageHost.replaceChildren(verifyStage);
    renderedStep = 3;
  };

  const syncUi = () => {
    const isBusy = requestingCode || verifyingPhone || creatingAccount;
    const cooldownActive = Boolean(
      verificationState.cooldownUntil &&
        new Date(verificationState.cooldownUntil).getTime() > Date.now()
    );

    clearCountdown();
    updateStepCopy();
    renderCurrentStage();

    progress.setState({
      step: currentStep,
      phoneVerified: verificationState.verified === true
    });

    verificationPhone.textContent = getCurrentPhoneNumber()
      ? `Phone number: ${getCurrentPhoneNumber()}`
      : "Phone number: not entered";
    verificationAccount.textContent = getCurrentUsername()
      ? `Account: ${getCurrentUsername()}${getCurrentLocation() ? `, ${getCurrentLocation()}` : ""}`
      : "Account details ready";

    if (!hasVerificationForCurrentPhone()) {
      verificationStatus.textContent =
        "Click Next on the password step to send a signup code to this phone number.";
    } else if (verificationState.verified) {
      verificationStatus.textContent =
        "Phone number verified. Tick the 16+ confirmation box and create your account.";
    } else if (!verificationState.expiresAt) {
      verificationStatus.textContent =
        "Your signup code is no longer active. Resend a new code to continue.";
    } else if (cooldownActive) {
      verificationStatus.textContent = `Code sent to ${verificationState.phoneNumber}. It expires ${formatDateTime(
        verificationState.expiresAt
      )}. You can resend in ${formatCountdown(verificationState.cooldownUntil)}.`;
    } else {
      verificationStatus.textContent = `Code sent to ${verificationState.phoneNumber}. Enter it and verify before ${formatDateTime(
        verificationState.expiresAt
      )}.`;
    }

    if (cooldownActive && !verificationState.verified) {
      countdownIntervalId = window.setInterval(() => {
        syncUi();
      }, 1000);
    }

    [
      phoneField.input,
      usernameField.input,
      provinceField.input,
      municipalityField.input,
      townshipField.input,
      extensionField.input,
      passwordField.input,
      confirmPasswordField.input
    ].forEach((control) => {
      control.disabled = isBusy;
    });

    ageConfirmField.input.disabled = isBusy;
    verificationCodeField.input.disabled = isBusy || verificationState.verified;

    personalNextBtn.disabled = isBusy;
    passwordBackBtn.disabled = isBusy;
    passwordNextBtn.disabled = isBusy;
    verifyBackBtn.disabled = isBusy;
    resendBtn.disabled = isBusy || !hasVerificationForCurrentPhone() || cooldownActive;
    verifyPhoneBtn.disabled =
      isBusy ||
      !hasVerificationForCurrentPhone() ||
      verificationState.verified ||
      !verificationCodeField.input.value.trim();
    createAccountBtn.disabled = isBusy || !verificationState.verified || !ageConfirmField.isChecked();
    loginBtn.disabled = isBusy;

    passwordNextBtn.textContent = requestingCode ? "Sending code..." : "Next";
    resendBtn.textContent = cooldownActive
      ? `Resend in ${formatCountdown(verificationState.cooldownUntil)}`
      : "Resend code";
    verifyPhoneBtn.textContent = verificationState.verified
      ? "Phone verified"
      : verifyingPhone
        ? "Verifying..."
        : "Verify phone";
    createAccountBtn.textContent = creatingAccount ? "Creating..." : "Create account";
  };

  const setStep = (nextStep) => {
    currentStep = Math.min(3, Math.max(1, nextStep));
    syncUi();
  };

  const requestCode = async () => {
    requestingCode = true;
    syncUi();

    try {
      const response = await requestRegistrationOtp(getPayload());

      verificationState = {
        phoneNumber: response.phoneNumber || getCurrentPhoneNumber(),
        expiresAt: response.expiresAt || null,
        cooldownUntil: response.cooldownUntil || null,
        verified: false,
        verifiedAt: null
      };
      verificationCodeField.input.value = "";
      showToast("Verification code sent.", "success");
      setStep(3);
      verificationCodeField.input.focus({ preventScroll: true });
      return true;
    } catch (error) {
      if (error?.details?.cooldownUntil) {
        verificationState = {
          phoneNumber: getCurrentPhoneNumber(),
          expiresAt: error.details.expiresAt || verificationState.expiresAt || null,
          cooldownUntil: error.details.cooldownUntil,
          verified: false,
          verifiedAt: null
        };
        setStep(3);
        showToast(error.message, "error");
        return false;
      }

      handleRegisterError(error, {
        setStep,
        stepOneFieldIds,
        stepTwoFieldIds
      });
      return false;
    } finally {
      requestingCode = false;
      syncUi();
    }
  };

  const verifyPhoneNumber = async () => {
    clearFieldError("register-verification-code");
    const code = verificationCodeField.input.value.trim();

    if (!code) {
      setFieldError("register-verification-code", "Enter the SMS code we sent to your phone.");
      showToast("Enter the SMS code we sent to your phone.", "error");
      syncUi();
      return;
    }

    verifyingPhone = true;
    syncUi();

    try {
      const response = await verifyRegistrationOtp({
        phoneNumber: getCurrentPhoneNumber(),
        code
      });

      verificationState = {
        ...verificationState,
        phoneNumber: response.phoneNumber || getCurrentPhoneNumber(),
        verified: response.verified === true,
        verifiedAt: response.verifiedAt || null
      };
      showToast("Phone number verified.", "success");
    } catch (error) {
      if (error?.code === "REGISTRATION_OTP_NOT_FOUND" || error?.code === "OTP_EXPIRED") {
        verificationState = {
          ...verificationState,
          expiresAt: null,
          cooldownUntil: null,
          verified: false,
          verifiedAt: null
        };
      }

      handleRegisterError(error, {
        setStep,
        stepOneFieldIds,
        stepTwoFieldIds
      });
    } finally {
      verifyingPhone = false;
      syncUi();
    }
  };

  loginBtn.addEventListener("click", () => {
    navigate("login");
  });

  phoneField.input.addEventListener("input", () => {
    if (verificationState.phoneNumber && getCurrentPhoneNumber() !== verificationState.phoneNumber) {
      resetPhoneVerificationState();
    }

    syncUi();
  });

  verificationCodeField.input.addEventListener("input", () => {
    clearFieldError("register-verification-code");
    syncUi();
  });

  ageConfirmField.input.addEventListener("change", () => {
    syncUi();
  });

  personalNextBtn.addEventListener("click", () => {
    clearFormErrors(form);

    if (!validateStepOneFields()) {
      showToast("Please complete your personal info correctly.", "error");
      syncUi();
      return;
    }

    setStep(2);
  });

  passwordBackBtn.addEventListener("click", () => {
    setStep(1);
  });

  passwordNextBtn.addEventListener("click", async () => {
    clearFormErrors(form);

    if (!validateStepTwoFields()) {
      showToast("Please fix your password details before continuing.", "error");
      syncUi();
      return;
    }

    if (hasUsableVerificationStepState()) {
      setStep(3);
      return;
    }

    await requestCode();
  });

  verifyBackBtn.addEventListener("click", () => {
    setStep(2);
  });

  resendBtn.addEventListener("click", async () => {
    verificationState = {
      ...verificationState,
      verified: false,
      verifiedAt: null
    };
    await requestCode();
  });

  verifyPhoneBtn.addEventListener("click", async () => {
    await verifyPhoneNumber();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormErrors(form);

    if (currentStep !== 3) {
      return;
    }

    if (!verificationState.verified) {
      setFieldError("register-verification-code", "Verify your phone number before creating the account.");
      showToast("Verify your phone number before creating the account.", "error");
      syncUi();
      return;
    }

    if (!ageConfirmField.isChecked()) {
      ageConfirmField.setInvalid("Confirm that you are 16 or older to continue.");
      showToast("Confirm that you are 16 or older to continue.", "error");
      syncUi();
      return;
    }

    creatingAccount = true;
    syncUi();

    try {
      await registerUser(getPayload());
      showToast("Account created successfully.", "success");
      progress.setState({
        step: 3,
        phoneVerified: true,
        created: true
      });
      void navigateAfterAuthentication({
        skipTransition: true
      });
    } catch (error) {
      if (error?.code === "REGISTRATION_PHONE_NOT_VERIFIED") {
        verificationState = {
          ...verificationState,
          verified: false,
          verifiedAt: null
        };
      }

      handleRegisterError(error, {
        setStep,
        stepOneFieldIds,
        stepTwoFieldIds
      });
    } finally {
      creatingAccount = false;
      syncUi();
    }
  });

  registerViewCleanup(() => {
    clearCountdown();
  });

  syncUi();

  function validateStepOneFields() {
    let valid = true;
    const phoneNumber = normalizePhoneNumber(phoneField.input.value);
    const username = normalizeUsername(usernameField.input.value);
    const province = normalizeWhitespace(provinceField.input.value);
    const municipality = normalizeWhitespace(municipalityField.input.value);
    const township = normalizeWhitespace(townshipField.input.value);
    const extension = normalizeWhitespace(extensionField.input.value);

    clearFieldError("register-phone-number");
    clearFieldError("register-username");
    clearFieldError("register-province");
    clearFieldError("register-municipality");
    clearFieldError("register-township");
    clearFieldError("register-extension");

    if (!phoneNumber) {
      setFieldError("register-phone-number", "Phone number is required.");
      valid = false;
    } else if (!PHONE_REGEX.test(phoneNumber)) {
      setFieldError(
        "register-phone-number",
        "Phone number must use digits and may include spaces, +, or hyphens."
      );
      valid = false;
    }

    if (!username) {
      setFieldError("register-username", "Username cannot be blank.");
      valid = false;
    } else if (username.length < 3 || username.length > 30) {
      setFieldError("register-username", "Username must be between 3 and 30 characters.");
      valid = false;
    } else if (countSpaces(username) > 3) {
      setFieldError("register-username", "Username can contain a maximum of 3 spaces.");
      valid = false;
    } else if (/[<>]/.test(username)) {
      setFieldError("register-username", "Username contains invalid characters.");
      valid = false;
    }

    if (!PROVINCES.includes(province)) {
      setFieldError("register-province", "Choose your province.");
      valid = false;
    }

    if (!LOCATION_PART_REGEX.test(municipality)) {
      setFieldError("register-municipality", "Municipality must be a valid place name.");
      valid = false;
    }

    if (!TOWNSHIP_REGEX.test(township)) {
      setFieldError(
        "register-township",
        "Township must be 2-40 letters and may include spaces, apostrophes, or hyphens."
      );
      valid = false;
    }

    if (!EXTENSION_REGEX.test(extension)) {
      setFieldError("register-extension", 'Extension must look like "Ext 2" or "2".');
      valid = false;
    }

    return valid;
  }

  function validateStepTwoFields() {
    let valid = true;
    const password = String(passwordField.input.value || "").trim();
    const confirmPassword = String(confirmPasswordField.input.value || "").trim();

    clearFieldError("register-password");
    clearFieldError("register-confirm-password");

    if (password.length < 12 || password.length > 64) {
      setFieldError("register-password", "Password must be between 12 and 64 characters.");
      valid = false;
    } else if (!/[A-Z]/.test(password)) {
      setFieldError("register-password", "Password must include at least one uppercase letter.");
      valid = false;
    } else if (!/[a-z]/.test(password)) {
      setFieldError("register-password", "Password must include at least one lowercase letter.");
      valid = false;
    } else if (!/\d/.test(password)) {
      setFieldError("register-password", "Password must include at least one number.");
      valid = false;
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      setFieldError("register-password", "Password must include at least one special character.");
      valid = false;
    } else if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
      setFieldError("register-password", "Password is too common. Choose a stronger password.");
      valid = false;
    } else if (/(.)\1{3,}/.test(password)) {
      setFieldError("register-password", "Password has too many repeated characters.");
      valid = false;
    } else if (hasSequentialPattern(password)) {
      setFieldError("register-password", "Password is too predictable. Avoid obvious sequences.");
      valid = false;
    }

    if (!confirmPassword) {
      setFieldError("register-confirm-password", "Please confirm your password.");
      valid = false;
    } else if (password !== confirmPassword) {
      setFieldError("register-confirm-password", "Passwords do not match.");
      valid = false;
    }

    return valid;
  }
}

function createSelectField({
  labelText,
  inputId,
  options = [],
  autocomplete,
  required = true
}) {
  const wrapper = createElement("div", { className: "field-group auth-field-group" });
  const fieldShell = createElement("label", {
    className: "form-label auth-floating-field",
    attributes: {
      for: inputId
    }
  });
  const input = createElement("select", {
    className: "form-input auth-form-input auth-form-select",
    id: inputId,
    required,
    autocomplete,
    attributes: {
      "aria-label": labelText
    }
  });
  const placeholderOption = document.createElement("option");
  const caption = createElement("span", {
    className: "auth-floating-label",
    text: labelText
  });
  const error = createFieldError(inputId);

  placeholderOption.value = "";
  placeholderOption.textContent = "Select province";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  input.appendChild(placeholderOption);

  options.forEach((optionText) => {
    const option = document.createElement("option");
    option.value = optionText;
    option.textContent = optionText;
    input.appendChild(option);
  });

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

  input.addEventListener("change", () => {
    clearFieldError(inputId);
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
    clearFieldError(inputId);
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

function createAgeConfirmField() {
  const wrapper = createElement("div", {
    className: "field-group auth-checkbox-field"
  });
  const label = createElement("label", {
    className: "auth-checkbox-label",
    attributes: {
      for: "register-age-confirm"
    }
  });
  const input = createElement("input", {
    className: "auth-checkbox-input",
    id: "register-age-confirm",
    type: "checkbox",
    attributes: {
      "aria-describedby": "register-age-confirm-error"
    }
  });
  const copy = createElement("span", {
    className: "auth-checkbox-copy",
    text: "I confirm that I am 16 years old or older."
  });
  const error = createFieldError("register-age-confirm");

  const clearInvalid = () => {
    input.classList.remove("input-error");
    wrapper.classList.remove("auth-checkbox-field-invalid");
    error.textContent = "";
  };

  input.addEventListener("change", () => {
    if (input.checked) {
      clearInvalid();
    }
  });

  label.append(input, copy);
  wrapper.append(label, error);

  return {
    element: wrapper,
    input,
    isChecked: () => input.checked,
    setInvalid: (message) => {
      input.classList.add("input-error");
      wrapper.classList.add("auth-checkbox-field-invalid");
      error.textContent = message;
    }
  };
}

function createRegisterProgress() {
  const root = createElement("div", {
    className: "auth-register-progress",
    attributes: {
      "aria-hidden": "true"
    }
  });
  const labels = createElement("div", {
    className: "auth-register-progress-labels"
  });
  const line = createElement("div", {
    className: "auth-register-progress-line"
  });
  const fill = createElement("span", {
    className: "auth-register-progress-fill"
  });
  const steps = [
    "Personal info",
    "Password",
    "Verify phone number",
    "Create account"
  ].map((text) =>
    createElement("span", {
      className: "auth-register-progress-label",
      text
    })
  );

  steps.forEach((label) => {
    labels.appendChild(label);
  });
  line.appendChild(fill);
  root.append(labels, line);

  return {
    root,
    setState({ step = 1, phoneVerified = false, created = false } = {}) {
      let progressCount = 1;

      if (step >= 2) {
        progressCount = 2;
      }

      if (step >= 3) {
        progressCount = 3;
      }

      if (phoneVerified || created) {
        progressCount = 4;
      }

      fill.style.width = `${(progressCount / 4) * 100}%`;

      steps.forEach((label, index) => {
        const position = index + 1;
        label.className =
          position < progressCount
            ? "auth-register-progress-label auth-register-progress-label-complete"
            : position === progressCount
              ? "auth-register-progress-label auth-register-progress-label-active"
              : "auth-register-progress-label";
      });
    }
  };
}

function handleRegisterError(
  error,
  { setStep = null, stepOneFieldIds = new Set(), stepTwoFieldIds = new Set() } = {}
) {
  const fieldMap = {
    username: "register-username",
    phoneNumber: "register-phone-number",
    province: "register-province",
    municipality: "register-municipality",
    township: "register-township",
    extension: "register-extension",
    area: "register-extension",
    password: "register-password",
    confirmPassword: "register-confirm-password",
    code: "register-verification-code"
  };

  if (error?.field && fieldMap[error.field]) {
    if (typeof setStep === "function") {
      if (stepOneFieldIds.has(error.field)) {
        setStep(1);
      } else if (stepTwoFieldIds.has(error.field)) {
        setStep(2);
      } else {
        setStep(3);
      }
    }

    setFieldError(fieldMap[error.field], error.message);
    showToast(error.message, "error");
    return;
  }

  showToast(error?.message || "Registration failed.", "error");
}

function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(`${inputId}-error`);

  if (input) {
    input.classList.remove("input-error");
    input.closest(".auth-floating-field")?.classList.remove("auth-floating-field-invalid");
    input.classList.remove("auth-empty-error");
  }

  if (error) {
    error.textContent = "";
  }
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizePhoneNumber(value) {
  return normalizeWhitespace(value).replace(/\s*-\s*/g, "-");
}

function normalizeUsername(value) {
  return normalizeWhitespace(value).normalize("NFKC");
}

function collapseWhitespace(value) {
  return normalizeWhitespace(value);
}

function countSpaces(value) {
  return (String(value).match(/ /g) || []).length;
}

function hasSequentialPattern(value) {
  const lower = String(value).toLowerCase();
  const sequences = [
    "0123456789",
    "1234567890",
    "abcdefghijklmnopqrstuvwxyz",
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm"
  ];

  return sequences.some((sequence) => {
    for (let index = 0; index <= sequence.length - 4; index += 1) {
      if (lower.includes(sequence.slice(index, index + 4))) {
        return true;
      }
    }

    return false;
  });
}
