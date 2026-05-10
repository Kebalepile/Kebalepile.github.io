export function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function createElement(tag, options = {}) {
  const element = document.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text !== undefined) {
    element.textContent = options.text;
  }

  if (options.type) {
    element.type = options.type;
  }

  if (options.id) {
    element.id = options.id;
  }

  if (options.name) {
    element.name = options.name;
  }

  if (options.placeholder) {
    element.placeholder = options.placeholder;
  }

  if (options.required === true) {
    element.required = true;
  }

  if (options.autocomplete) {
    element.autocomplete = options.autocomplete;
  }

  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  return element;
}

export function clearFormErrors(form) {
  const errorNodes = form.querySelectorAll(".field-error");
  errorNodes.forEach((node) => {
    node.textContent = "";
  });

  const invalidInputs = form.querySelectorAll(".input-error");
  invalidInputs.forEach((input) => {
    input.classList.remove("input-error");
  });

  const invalidShells = form.querySelectorAll(".auth-floating-field-invalid");
  invalidShells.forEach((shell) => {
    shell.classList.remove("auth-floating-field-invalid");
  });

  const invalidCheckboxShells = form.querySelectorAll(".auth-checkbox-field-invalid");
  invalidCheckboxShells.forEach((shell) => {
    shell.classList.remove("auth-checkbox-field-invalid");
  });

  const emptyInputs = form.querySelectorAll(".auth-empty-error");
  emptyInputs.forEach((input) => {
    input.classList.remove("auth-empty-error");
  });
}

export function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(`${inputId}-error`);

  if (input) {
    input.classList.add("input-error");
    input.closest(".auth-floating-field")?.classList.add("auth-floating-field-invalid");
  }

  if (error) {
    error.textContent = message;
  }
}

export function createFieldError(inputId) {
  return createElement("p", {
    id: `${inputId}-error`,
    className: "field-error"
  });
}
