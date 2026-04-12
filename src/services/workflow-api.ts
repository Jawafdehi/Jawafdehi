/**
 * API client for Case Workflow Runs.
 *
 * Hits /api/case-workflows/runs/ on the jawafdehi-api backend.
 * Reuses the same JWT auth token stored by caseworker-api.ts.
 */

import axios from "axios";
import { handleInterceptorError } from "./auth-utils";
import type {
  WorkflowRun,
  WorkflowRunDetail,
  StepVisualStatus,
  StepDisplayInfo,
  RunStatusFilter,
} from "@/types/workflow";

// ---------------------------------------------------------------------------
// Axios client (mirrors caseworker-api.ts pattern)
// ---------------------------------------------------------------------------

const BASE_URL = `${import.meta.env.VITE_JDS_API_BASE_URL || "https://portal.jawafdehi.org/api"}/case-workflows`;

const client = axios.create({ baseURL: BASE_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("cw_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (r) => r,
  (error) => handleInterceptorError(error, client)
);

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export interface WorkflowRunListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: WorkflowRun[];
}

export async function listWorkflowRuns(
  filter: RunStatusFilter = "all",
  search = "",
  page = 1,
): Promise<WorkflowRunListResponse> {
  const params: Record<string, string> = {};

  if (filter === "running") {
    params.is_complete = "false";
    params.has_failed = "false";
  } else if (filter === "complete") {
    params.is_complete = "true";
    params.has_failed = "false";
  } else if (filter === "failed") {
    params.has_failed = "true";
  }

  if (search.trim()) {
    params.search = search.trim();
  }

  if (page > 1) {
    params.page = String(page);
  }

  const { data } = await client.get("/runs/", { params });
  return data;
}

export async function getWorkflowRunDetail(runId: string): Promise<WorkflowRunDetail> {
  const { data } = await client.get(`/runs/${runId}/`);
  return data;
}

// ---------------------------------------------------------------------------
// Step definitions — known steps with display labels & order
// ---------------------------------------------------------------------------

/**
 * Known step definitions keyed by workflow_id.
 *
 * The order here determines the pipeline rendering order.
 * Steps not found in this map are appended at the end with
 * a humanised label derived from their name.
 */
const KNOWN_STEPS: Record<string, { name: string; label: string }[]> = {
  ciaa_caseworker: [
    { name: "initialize-casework", label: "Initialize" },
    { name: "fetch-source-documents", label: "Fetch Docs" },
    { name: "fetch-news-articles", label: "Fetch News" },
    { name: "draft-case", label: "Draft" },
    { name: "review-draft", label: "Review" },
    { name: "revise-draft", label: "Revise" },
    { name: "create-case", label: "Create Case" },
    { name: "create-update-entities", label: "Entities" },
    { name: "update-case-details", label: "Update" },
  ],
};

/** Convert kebab-case step name to a human-readable label. */
function humaniseStepName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Step status computation
// ---------------------------------------------------------------------------

/**
 * Derive the visual status of each step for the pipeline component.
 *
 * Logic:
 * - Steps recorded as "complete" in case_data → complete
 * - The first non-complete step when run is still running → in-progress
 * - If run has_failed, the first non-complete step → failed
 * - Everything else → pending
 */
export function computeStepStatuses(run: WorkflowRunDetail): StepDisplayInfo[] {
  const caseData = run.case_data ?? { steps: {}, files: {}, is_complete: false };
  const stepRecords = caseData.steps ?? {};

  // Get the ordered step list for this workflow, or derive from case_data keys
  const knownSteps = KNOWN_STEPS[run.workflow_id];
  let orderedNames: { name: string; label: string }[];

  if (knownSteps) {
    // Start with known steps in order
    orderedNames = [...knownSteps];
    // Append any unknown steps found in case_data
    for (const stepName of Object.keys(stepRecords)) {
      if (!orderedNames.some((s) => s.name === stepName)) {
        orderedNames.push({ name: stepName, label: humaniseStepName(stepName) });
      }
    }
  } else {
    // Unknown workflow — derive entirely from case_data
    orderedNames = Object.keys(stepRecords).map((name) => ({
      name,
      label: humaniseStepName(name),
    }));
  }

  // Find the first non-complete step
  let foundActiveStep = false;

  return orderedNames.map((step) => {
    const record = stepRecords[step.name];
    let status: StepVisualStatus;

    if (record?.status === "complete") {
      status = "complete";
    } else if (!foundActiveStep) {
      foundActiveStep = true;
      status = run.has_failed ? "failed" : "in-progress";
    } else {
      status = "pending";
    }

    return {
      name: step.name,
      label: step.label,
      status,
      completedAt: record?.completed_at,
      error: record?.error,
    };
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format byte sizes into human-readable strings. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Compute duration between two ISO timestamps. */
export function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return "—";
  const ms = endMs - startMs;
  if (ms < 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}
