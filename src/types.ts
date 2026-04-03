/**
 * @license
 * SPDX-License-Identifier: MIT
 */

export type TestStatus = 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';

export interface TestAttempt {
  retry: number; // 0 = first attempt, 1 = first retry, etc.
  status: TestStatus;
  duration: number; // ms
  startTime: string; // ISO string
  error?: string;
  steps: TestStep[];
  artifacts: {
    video?: string;
    trace?: string;
    screenshots?: string[];
  };
}

export interface TestResult {
  id: string; // Unique identifier: project + title + tags (no retry suffix)
  title: string;
  file: string;
  line: number;
  column: number;
  tags: string[];
  browser: string;
  project: string;
  // Top-level fields mirror the FINAL attempt for quick access:
  duration: number; // ms
  status: TestStatus;
  startTime: string; // ISO string
  error?: string;
  steps: TestStep[];
  artifacts: {
    video?: string;
    trace?: string;
    screenshots?: string[];
  };
  // All attempts in order (index 0 = first attempt, last = final attempt).
  retries: TestAttempt[];
}

export interface TestStep {
  title: string;
  duration: number;
  status: TestStatus;
  error?: string;
}

export interface RunMetadata {
  id: string;
  startTime: string;
  duration: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  projects?: Record<string, { passed: number, failed: number, skipped: number }>;
  environment?: Record<string, string>;
  /**
   * Describes which subset of the suite was executed in this run.
   * Used for scope-aware delta comparisons — only runs with the same label
   * are compared against each other.
   */
  scope?: {
    /** User-defined workflow name (e.g. 'smoke', 'regression', 'checkout'). */
    label?: string;
    /** Playwright project names that were active in this run. */
    projects: string[];
  };
}

export interface HistoricalData {
  runs: RunMetadata[];
  tests: Record<string, TestHistory>;
}

export interface TestHistory {
  id: string;
  title: string;
  tags: string[];
  history: TestHistoryEntry[];
}

export interface TestHistoryEntry {
  runId: string;
  startTime: string;
  duration: number;
  status: TestStatus;
  retry: number;
}

export interface ReportConfig {
  outputFolder: string;
  templatePath?: string;
  /**
   * A short name identifying this CI workflow or test scope (e.g. 'smoke', 'regression').
   * When set, delta comparisons in the UI will only compare runs with the same label,
   * preventing misleading trends when different subsets are run in rotation.
   */
  label?: string;
  /**
   * Quality gate thresholds. When a run exceeds these limits the report banner
   * shows a BLOCKED verdict, making it easy for management to assess release readiness.
   * Zero config required — defaults to 0 allowed failures.
   */
  qualityGate?: {
    /** Maximum number of failed tests that still result in a PASS verdict. Default: 0. */
    maxFailures?: number;
    /** Minimum pass rate (0–100) required for a PASS verdict. Default: not enforced. */
    minPassRate?: number;
  };
  history: {
    enabled: boolean;
    retention: number; // days
    filePath: string;
  };
  /**
   * Controls when the report is automatically opened after tests complete.
   * - 'always'     — open after every run
   * - 'on-failure' — open only when at least one test failed (default)
   * - 'never'      — never open automatically
   */
  open: 'always' | 'never' | 'on-failure';
  /**
   * Controls how the report is served when it is opened.
   * - 'local'  — starts a local HTTP server (default); enables the built-in trace viewer
   *              so traces are viewed entirely on-machine without any external requests.
   * - 'static' — opens the HTML file directly via file://, no server is started.
   *              Only artifact types enabled in `artifacts` will be copied and viewable.
   */
  server: 'local' | 'static';
  /**
   * Controls which artifact types are copied into the output folder in `static` mode.
   * Has no effect when `server` is `'local'` — all artifacts are resolved by the server.
   */
  artifacts: {
    /** Copy video recordings into the output folder. Default: true. */
    video: boolean;
    /** Copy screenshots into the output folder. Default: false. */
    screenshots: boolean;
    /** Copy trace zips into the output folder. Default: false.
     *  Note: the built-in trace viewer requires `server: 'local'`.
     *  In static mode the zip will be present but must be opened with
     *  `npx playwright show-trace`. */
    trace: boolean;
  };
}
