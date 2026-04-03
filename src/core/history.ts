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
      retry: result.retries.length - 1,
    };

    // Replace any existing entry for this runId so only the final attempt is kept.
    const existingIdx = updatedHistory.tests[testId].history.findIndex(h => h.runId === newRun.id);
    if (existingIdx !== -1) {
      updatedHistory.tests[testId].history[existingIdx] = historyEntry;
    } else {
      updatedHistory.tests[testId].history.push(historyEntry);
    }
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

