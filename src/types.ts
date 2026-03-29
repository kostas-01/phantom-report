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
  history: {
    enabled: boolean;
    retention: number; // days
    filePath: string;
  };
  open: 'always' | 'never' | 'on-failure';
}
