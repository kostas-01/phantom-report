/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { HistoricalData, TestResult, RunMetadata, TestHistoryEntry, TestStatus } from '../types';

/**
 * Merges a new run's results into the historical data.
 * @param existingHistory The current historical data.
 * @param newRun The metadata of the new run.
 * @param newResults The results of the new run.
 * @param retentionDays The number of days to retain historical data.
 */
export function mergeHistory(
  existingHistory: HistoricalData,
  newRun: RunMetadata,
  newResults: TestResult[],
  retentionDays: number = 30
): HistoricalData {
  const updatedHistory: HistoricalData = {
    runs: [...existingHistory.runs, newRun],
    tests: { ...existingHistory.tests },
  };

  // 1. Process new results
  for (const result of newResults) {
    const testId = result.id;
    if (!updatedHistory.tests[testId]) {
      updatedHistory.tests[testId] = {
        id: testId,
        title: result.title,
        tags: result.tags,
        history: [],
      };
    }

    const historyEntry: TestHistoryEntry = {
      runId: newRun.id,
      startTime: result.startTime,
      duration: result.duration,
      status: result.status,
      retry: result.retry,
    };

    updatedHistory.tests[testId].history.push(historyEntry);
  }

  // 2. Apply retention policy
  const now = new Date();
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

  // Filter out old runs
  updatedHistory.runs = updatedHistory.runs.filter(run => new Date(run.startTime) >= cutoff);

  // Filter out old test history entries
  for (const testId in updatedHistory.tests) {
    updatedHistory.tests[testId].history = updatedHistory.tests[testId].history.filter(
      entry => new Date(entry.startTime) >= cutoff
    );

    // If a test has no history left, remove it
    if (updatedHistory.tests[testId].history.length === 0) {
      delete updatedHistory.tests[testId];
    }
  }

  return updatedHistory;
}

/**
 * Calculates metrics for a test based on its history.
 * @param history The history of a single test.
 */
export function calculateTestMetrics(history: TestHistoryEntry[]) {
  if (history.length === 0) return null;

  const total = history.length;
  const passed = history.filter(h => h.status === 'passed').length;
  const failed = history.filter(h => h.status === 'failed').length;
  const skipped = history.filter(h => h.status === 'skipped').length;

  const avgDuration = history.reduce((sum, h) => sum + h.duration, 0) / total;
  const stabilityScore = passed / (passed + failed) || 0;

  // Flaky detection: check for fail/pass patterns in recent history
  // A test is flaky if it has both passed and failed in the last X runs
  const recentHistory = history.slice(-5);
  const hasPass = recentHistory.some(h => h.status === 'passed');
  const hasFail = recentHistory.some(h => h.status === 'failed');
  const isFlaky = hasPass && hasFail;

  // First-time failure detection: check if the last run failed and the one before passed
  const isFirstTimeFailure = history.length >= 2 &&
    history[history.length - 1].status === 'failed' &&
    history[history.length - 2].status === 'passed';

  return {
    avgDuration,
    stabilityScore,
    isFlaky,
    isFirstTimeFailure,
    passed,
    failed,
    skipped,
  };
}
