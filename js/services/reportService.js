import { STORAGE_KEYS } from "../config/storageKeys.js";
import { storage } from "../storage/storage.js";
import { apiRequest } from "./apiClient.js";
import { MAX_REPORT_NOTE_LENGTH } from "../utils/validators.js";

export const REPORT_REASONS = [
  "Spam",
  "Harassment or bullying",
  "Hate speech",
  "False information",
  "Violence or threats",
  "Sexual content",
  "Scam or fraud",
  "Other"
];

const loadedReportUserIds = new Set();
let reportStateVersion = 0;

function makeError(code, field, message) {
  const error = new Error(message);
  error.code = code;
  error.field = field;
  return error;
}

function createQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    query.set(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

function normalizeReportRecord(report = {}) {
  return {
    id: typeof report.id === "string" && report.id ? report.id : crypto.randomUUID(),
    reporterUserId: typeof report.reporterUserId === "string" ? report.reporterUserId : "",
    targetType: report.targetType === "comment" ? "comment" : "post",
    targetId: typeof report.targetId === "string" ? report.targetId : "",
    reason: typeof report.reason === "string" ? report.reason : "",
    note: typeof report.note === "string" ? report.note.trim() : "",
    hideForReporter: report.hideForReporter === true,
    status: typeof report.status === "string" && report.status ? report.status : "submitted",
    createdAt:
      typeof report.createdAt === "string" && report.createdAt
        ? report.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof report.updatedAt === "string" && report.updatedAt ? report.updatedAt : null
  };
}

function validateReason(reason) {
  const safeReason = typeof reason === "string" ? reason.trim() : "";

  if (!REPORT_REASONS.includes(safeReason)) {
    throw makeError("REPORT_REASON_INVALID", "reason", "Choose a valid report reason.");
  }

  return safeReason;
}

function validateReportNote(note, reason) {
  const safeNote = typeof note === "string" ? note.trim() : "";

  if (reason !== "Other") {
    return "";
  }

  if (!safeNote) {
    throw makeError("REPORT_NOTE_REQUIRED", "note", "Tell us what you are reporting.");
  }

  if (safeNote.length > MAX_REPORT_NOTE_LENGTH) {
    throw makeError(
      "REPORT_NOTE_TOO_LONG",
      "note",
      `Report note must be ${MAX_REPORT_NOTE_LENGTH} characters or fewer.`
    );
  }

  return safeNote;
}

function getReportsForUser(userId) {
  const safeUserId = typeof userId === "string" ? userId.trim() : "";

  if (!safeUserId) {
    return [];
  }

  return getReports().filter((report) => report.reporterUserId === safeUserId);
}

function replaceReportsForUser(userId, reports) {
  const safeUserId = typeof userId === "string" ? userId.trim() : "";
  const normalizedReports = Array.isArray(reports)
    ? reports
        .map((report) => normalizeReportRecord(report))
        .filter((report) => report.reporterUserId === safeUserId)
    : [];
  const existingReports = getReports();
  const nextReports = [
    ...existingReports.filter((report) => report.reporterUserId !== safeUserId),
    ...normalizedReports
  ];

  saveReports(nextReports);
  return normalizedReports;
}

function upsertReport(report) {
  const normalizedReport = normalizeReportRecord(report);
  const reportsById = new Map(getReports().map((entry) => [entry.id, entry]));

  reportsById.set(normalizedReport.id, {
    ...(reportsById.get(normalizedReport.id) || {}),
    ...normalizedReport
  });

  const nextReports = Array.from(reportsById.values()).sort(
    (first, second) => new Date(second.createdAt) - new Date(first.createdAt)
  );
  saveReports(nextReports);
  return reportsById.get(normalizedReport.id) || normalizedReport;
}

export function getReports() {
  const reports = storage.get(STORAGE_KEYS.REPORTS, []);
  return Array.isArray(reports) ? reports.map(normalizeReportRecord) : [];
}

export function saveReports(reports) {
  storage.set(
    STORAGE_KEYS.REPORTS,
    Array.isArray(reports) ? reports.map(normalizeReportRecord) : []
  );
}

export function resetReportState() {
  reportStateVersion += 1;
  loadedReportUserIds.clear();
  storage.remove(STORAGE_KEYS.REPORTS);
}

export async function loadReports({
  currentUserId,
  force = false,
  targetType,
  hideForReporter
} = {}) {
  const safeUserId = typeof currentUserId === "string" ? currentUserId.trim() : "";

  if (!safeUserId) {
    return [];
  }

  if (!force && loadedReportUserIds.has(safeUserId)) {
    return getReportsForUser(safeUserId);
  }

  const requestStateVersion = reportStateVersion;
  const requestUserId = safeUserId;
  const response = await apiRequest(
    `/reports${createQueryString({
      targetType,
      hideForReporter
    })}`
  );

  if (requestStateVersion !== reportStateVersion) {
    return getReportsForUser(requestUserId);
  }

  const usingFilteredQuery =
    targetType === "comment" || targetType === "post" || typeof hideForReporter === "boolean";
  const reports = usingFilteredQuery
    ? (response.reports || []).map((report) => upsertReport(report))
    : replaceReportsForUser(requestUserId, response.reports || []);
  loadedReportUserIds.add(requestUserId);
  return reports;
}

export async function ensureReportsLoaded(currentUserId) {
  return loadReports({
    currentUserId,
    force: false
  });
}

export function getHiddenTargetIdsForUser({ userId, targetType }) {
  const safeUserId = typeof userId === "string" ? userId.trim() : "";
  const safeTargetType = targetType === "comment" ? "comment" : "post";

  if (!safeUserId) {
    return new Set();
  }

  return new Set(
    getReportsForUser(safeUserId)
      .filter(
        (report) =>
          report.targetType === safeTargetType && report.hideForReporter === true
      )
      .map((report) => report.targetId)
  );
}

export async function createReport({
  reporterUserId,
  targetType,
  targetId,
  reason,
  note = "",
  hideForReporter = false
}) {
  const safeTargetType = targetType === "comment" ? "comment" : "post";
  const safeTargetId = typeof targetId === "string" ? targetId.trim() : "";
  const safeReporterUserId =
    typeof reporterUserId === "string" ? reporterUserId.trim() : "";
  const safeReason = validateReason(reason);
  const safeNote = validateReportNote(note, safeReason);

  if (!safeReporterUserId) {
    throw makeError("REPORT_USER_REQUIRED", null, "You must be signed in to report.");
  }

  if (!safeTargetId) {
    throw makeError("REPORT_TARGET_REQUIRED", null, "Could not report this item.");
  }

  const response = await apiRequest("/reports", {
    method: "POST",
    body: {
      targetType: safeTargetType,
      targetId: safeTargetId,
      reason: safeReason,
      note: safeNote,
      hideForReporter: hideForReporter === true
    }
  });
  const report = upsertReport(response.report);

  loadedReportUserIds.add(safeReporterUserId);

  return {
    report,
    status: response.status === "updated" ? "updated" : "created"
  };
}
