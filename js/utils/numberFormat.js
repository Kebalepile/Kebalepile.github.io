export function formatCompactCount(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  const absoluteValue = Math.abs(numericValue);

  if (absoluteValue < 1000) {
    return String(Math.round(numericValue));
  }

  if (absoluteValue < 1000000) {
    return formatWithSuffix(numericValue / 1000, "K");
  }

  return formatWithSuffix(numericValue / 1000000, "M");
}

function formatWithSuffix(value, suffix) {
  const absoluteValue = Math.abs(value);
  const fractionDigits = absoluteValue < 10 ? 1 : 0;
  const roundedValue = Number(value.toFixed(fractionDigits));

  return `${stripTrailingDecimal(roundedValue)}${suffix}`;
}

function stripTrailingDecimal(value) {
  return Number.isInteger(value) ? String(value) : String(value);
}
