/**
 * @license
 * SPDX-License-Identifier: MIT
 */

export type TestStatus = 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';

export interface TestResult {
  id: string; // Unique identifier (title + tags)
  title: string;
  file: string;
  line: number;
  column: number;
  tags: string[];
  browser: string;
  project: string;
  duration: number; // ms
  status: TestStatus;
  startTime: string; // ISO string
  retry: number;
  error?: string;
  steps: TestStep[];
  artifacts: {
    video?: string;
    trace?: string;
    screenshots?: string[];
  };
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

export interface Metrics {
  avgDuration: number;
  stabilityScore: number; // 0-1
  isFlaky: boolean;
  failureTrend: 'up' | 'down' | 'stable';
  lastStatus: TestStatus;
}

export interface StorageConfig {
  type: 'local' | 's3' | 'gdrive' | 'sftp' | 'custom';
  config: any;
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
  open: 'always' | 'never' | 'on-failure';
}
