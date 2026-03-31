/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';
import { 
  CheckCircle2, XCircle, AlertCircle, Clock, Search, Filter, 
  ChevronRight, ChevronDown, Play, Video, FileText, BarChart3, 
  History, Settings, LayoutDashboard, Database, ExternalLink,
  ArrowUpRight, ArrowDownRight, Minus, ChevronsUpDown, Check,
  ShieldCheck, ShieldAlert, Shield, Tag, Zap, GitBranch, Copy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils.ts';
import { TestResult, TestAttempt, HistoricalData, TestStatus, Metrics, TestHistory } from './types.ts';

// Mock data for demonstration (used in dev mode)
const getInitialData = () => {
  try {
    const data = (window as any).playwrightData;
    if (!data) return null;
    // If the reporter injected a JS object, use it directly.
    if (typeof data === 'object') return data;
    // If it's a string, ensure it's plausible JSON (avoid comparing against
    // large inlined fallbacks that may have been embedded during build).
    if (typeof data === 'string') {
      const trimmed = data.trim();
      if (trimmed === 'DATA_PLACEHOLDER') return null;
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          return JSON.parse(trimmed);
        } catch (e) {
          console.error('Failed to JSON.parse window.playwrightData:', e);
          return null;
        }
      }
      return null;
    }
  } catch (e) {
    console.error('Failed to parse playwrightData:', e);
  }
  return null;
};

const initialData = getInitialData();

const formatDuration = (ms: number) => {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor((ms % 1000) / 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
};

const MOCK_HISTORY: HistoricalData = {
  runs: [
    { 
      id: 'run-1', startTime: '2026-03-20T10:00:00Z', duration: 120000, totalTests: 100, passed: 95, failed: 3, skipped: 2,
      scope: { projects: ['Chromium Desktop', 'Firefox Desktop', 'WebKit Desktop'] },
      projects: {
        'Chromium Desktop': { passed: 32, failed: 1, skipped: 0 },
        'Firefox Desktop': { passed: 31, failed: 1, skipped: 1 },
        'WebKit Desktop': { passed: 32, failed: 1, skipped: 1 }
      }
    },
    { 
      id: 'run-2', startTime: '2026-03-21T10:00:00Z', duration: 125000, totalTests: 100, passed: 92, failed: 6, skipped: 2,
      scope: { projects: ['Chromium Desktop', 'Firefox Desktop', 'WebKit Desktop'] },
      projects: {
        'Chromium Desktop': { passed: 30, failed: 2, skipped: 1 },
        'Firefox Desktop': { passed: 31, failed: 2, skipped: 0 },
        'WebKit Desktop': { passed: 31, failed: 2, skipped: 1 }
      }
    },
    { 
      id: 'run-3', startTime: '2026-03-22T10:00:00Z', duration: 118000, totalTests: 100, passed: 98, failed: 1, skipped: 1,
      scope: { projects: ['Chromium Desktop', 'Firefox Desktop', 'WebKit Desktop'] },
      projects: {
        'Chromium Desktop': { passed: 33, failed: 0, skipped: 0 },
        'Firefox Desktop': { passed: 32, failed: 1, skipped: 0 },
        'WebKit Desktop': { passed: 33, failed: 0, skipped: 1 }
      }
    },
    { 
      id: 'run-4', startTime: '2026-03-23T10:00:00Z', duration: 130000, totalTests: 100, passed: 94, failed: 4, skipped: 2,
      scope: { projects: ['Chromium Desktop', 'Firefox Desktop', 'WebKit Desktop'] },
      projects: {
        'Chromium Desktop': { passed: 31, failed: 1, skipped: 1 },
        'Firefox Desktop': { passed: 31, failed: 2, skipped: 0 },
        'WebKit Desktop': { passed: 32, failed: 1, skipped: 1 }
      }
    },
    { 
      id: 'run-5', startTime: '2026-03-24T10:00:00Z', duration: 122000, totalTests: 100, passed: 96, failed: 2, skipped: 2,
      scope: { projects: ['Chromium Desktop', 'Firefox Desktop', 'WebKit Desktop'] },
      projects: {
        'Chromium Desktop': { passed: 32, failed: 1, skipped: 0 },
        'Firefox Desktop': { passed: 32, failed: 0, skipped: 1 },
        'WebKit Desktop': { passed: 32, failed: 1, skipped: 1 }
      }
    },
    { 
      id: 'run-6', startTime: '2026-03-25T10:00:00Z', duration: 128000, totalTests: 100, passed: 90, failed: 8, skipped: 2,
      scope: { projects: ['Chromium Desktop', 'Firefox Desktop', 'WebKit Desktop'] },
      projects: {
        'Chromium Desktop': { passed: 29, failed: 3, skipped: 1 },
        'Firefox Desktop': { passed: 30, failed: 3, skipped: 0 },
        'WebKit Desktop': { passed: 31, failed: 2, skipped: 1 }
      }
    },
    { 
      id: 'run-7', startTime: '2026-03-26T10:00:00Z', duration: 121000, totalTests: 100, passed: 97, failed: 2, skipped: 1,
      scope: { projects: ['Chromium Desktop', 'Firefox Desktop', 'WebKit Desktop'] },
      environment: { branch: 'main', commit: 'abc1234', buildNumber: '42', environment: 'staging' },
      projects: {
        'Chromium Desktop': { passed: 33, failed: 0, skipped: 0 },
        'Firefox Desktop': { passed: 32, failed: 1, skipped: 0 },
        'WebKit Desktop': { passed: 32, failed: 1, skipped: 1 }
      }
    },
  ],
  tests: {
    // test-2: was passing in prevRun (run-6) — now failing → REGRESSION
    'test-2': {
      id: 'test-2', title: 'User sees error with invalid credentials', tags: ['auth'],
      history: [
        { runId: 'run-4', startTime: '2026-03-23T10:01:00Z', duration: 1800, status: 'passed', retry: 0 },
        { runId: 'run-5', startTime: '2026-03-24T10:01:00Z', duration: 1750, status: 'passed', retry: 0 },
        { runId: 'run-6', startTime: '2026-03-25T10:01:00Z', duration: 1900, status: 'passed', retry: 0 },
        { runId: 'run-7', startTime: '2026-03-26T10:01:00Z', duration: 2500, status: 'failed', retry: 1 },
      ],
    },
    // test-4: was already failing in prevRun → ONGOING
    'test-4': {
      id: 'test-4', title: 'User can checkout with multiple items', tags: ['checkout', 'slow'],
      history: [
        { runId: 'run-5', startTime: '2026-03-24T10:05:00Z', duration: 28000, status: 'passed', retry: 0 },
        { runId: 'run-6', startTime: '2026-03-25T10:05:00Z', duration: 30000, status: 'timedOut', retry: 0 },
        { runId: 'run-7', startTime: '2026-03-26T10:05:00Z', duration: 30000, status: 'timedOut', retry: 0 },
      ],
    },
    // Flaky test: alternating pass/fail in recent history
    'test-flaky-1': {
      id: 'test-flaky-1', title: 'Payment validation on invalid card', tags: ['checkout', 'payments'],
      history: [
        { runId: 'run-2', startTime: '2026-03-21T10:03:00Z', duration: 3000, status: 'passed', retry: 0 },
        { runId: 'run-3', startTime: '2026-03-22T10:03:00Z', duration: 3200, status: 'failed', retry: 1 },
        { runId: 'run-4', startTime: '2026-03-23T10:03:00Z', duration: 2800, status: 'passed', retry: 0 },
        { runId: 'run-5', startTime: '2026-03-24T10:03:00Z', duration: 3100, status: 'failed', retry: 1 },
        { runId: 'run-6', startTime: '2026-03-25T10:03:00Z', duration: 2900, status: 'passed', retry: 0 },
        { runId: 'run-7', startTime: '2026-03-26T10:03:00Z', duration: 3050, status: 'failed', retry: 1 },
      ],
    },
    // Another flaky test
    'test-flaky-2': {
      id: 'test-flaky-2', title: 'Cart persists across page reloads', tags: ['checkout'],
      history: [
        { runId: 'run-3', startTime: '2026-03-22T10:04:00Z', duration: 2100, status: 'failed', retry: 1 },
        { runId: 'run-4', startTime: '2026-03-23T10:04:00Z', duration: 1900, status: 'passed', retry: 0 },
        { runId: 'run-5', startTime: '2026-03-24T10:04:00Z', duration: 2200, status: 'failed', retry: 1 },
        { runId: 'run-6', startTime: '2026-03-25T10:04:00Z', duration: 2000, status: 'passed', retry: 0 },
        { runId: 'run-7', startTime: '2026-03-26T10:04:00Z', duration: 2150, status: 'passed', retry: 0 },
      ],
    },
  },
};

const MOCK_RESULTS: TestResult[] = [
  {
    id: 'test-1',
    title: 'User can login with valid credentials',
    file: 'tests/auth.spec.ts',
    line: 10,
    column: 5,
    tags: ['auth', 'smoke'],
    browser: 'chromium',
    project: 'Chromium Desktop',
    duration: 1500,
    status: 'passed',
    startTime: '2026-03-26T10:00:00Z',
    steps: [
      { title: 'Navigate to login page', duration: 500, status: 'passed' },
      { title: 'Enter credentials', duration: 300, status: 'passed' },
      { title: 'Click login button', duration: 200, status: 'passed' },
      { title: 'Verify dashboard visibility', duration: 500, status: 'passed' },
    ],
    artifacts: { video: 'artifacts/test-1.webm', trace: 'artifacts/test-1.zip' },
    retries: [
      {
        retry: 0, status: 'passed', duration: 1500, startTime: '2026-03-26T10:00:00Z',
        steps: [
          { title: 'Navigate to login page', duration: 500, status: 'passed' },
          { title: 'Enter credentials', duration: 300, status: 'passed' },
          { title: 'Click login button', duration: 200, status: 'passed' },
          { title: 'Verify dashboard visibility', duration: 500, status: 'passed' },
        ],
        artifacts: { video: 'artifacts/test-1.webm', trace: 'artifacts/test-1.zip' },
      },
    ],
  },
  {
    id: 'test-2',
    title: 'User sees error with invalid credentials',
    file: 'tests/auth.spec.ts',
    line: 25,
    column: 5,
    tags: ['auth'],
    browser: 'firefox',
    project: 'Firefox Desktop',
    duration: 2500,
    status: 'failed',
    startTime: '2026-03-26T10:01:30Z',
    error: 'Error: expect(received).toBeVisible()\n\nReceived: hidden',
    steps: [
      { title: 'Navigate to login page', duration: 600, status: 'passed' },
      { title: 'Enter invalid credentials', duration: 400, status: 'passed' },
      { title: 'Click login button', duration: 300, status: 'passed' },
      { title: 'Verify error message', duration: 1200, status: 'failed', error: 'expect(received).toBeVisible()' },
    ],
    artifacts: { video: 'artifacts/test-2b.webm', trace: 'artifacts/test-2b.zip' },
    retries: [
      {
        retry: 0, status: 'failed', duration: 2200, startTime: '2026-03-26T10:01:00Z',
        error: 'Error: expect(received).toBeVisible()\n\nReceived: hidden',
        steps: [
          { title: 'Navigate to login page', duration: 600, status: 'passed' },
          { title: 'Enter invalid credentials', duration: 400, status: 'passed' },
          { title: 'Click login button', duration: 300, status: 'passed' },
          { title: 'Verify error message', duration: 900, status: 'failed', error: 'expect(received).toBeVisible()' },
        ],
        artifacts: { video: 'artifacts/test-2a.webm', trace: 'artifacts/test-2a.zip' },
      },
      {
        retry: 1, status: 'failed', duration: 2500, startTime: '2026-03-26T10:01:30Z',
        error: 'Error: expect(received).toBeVisible()\n\nReceived: hidden',
        steps: [
          { title: 'Navigate to login page', duration: 600, status: 'passed' },
          { title: 'Enter invalid credentials', duration: 400, status: 'passed' },
          { title: 'Click login button', duration: 300, status: 'passed' },
          { title: 'Verify error message', duration: 1200, status: 'failed', error: 'expect(received).toBeVisible()' },
        ],
        artifacts: { video: 'artifacts/test-2b.webm', trace: 'artifacts/test-2b.zip' },
      },
    ],
  },
  {
    id: 'test-3',
    title: 'User can reset password',
    file: 'tests/auth.spec.ts',
    line: 40,
    column: 5,
    tags: ['auth', 'slow'],
    browser: 'webkit',
    project: 'WebKit Desktop',
    duration: 5000,
    status: 'passed',
    startTime: '2026-03-26T10:02:00Z',
    steps: [],
    artifacts: {},
    retries: [
      { retry: 0, status: 'passed', duration: 5000, startTime: '2026-03-26T10:02:00Z', steps: [], artifacts: {} },
    ],
  },
  {
    id: 'test-4',
    title: 'User can checkout with multiple items',
    file: 'tests/checkout.spec.ts',
    line: 15,
    column: 5,
    tags: ['checkout', 'slow'],
    browser: 'chromium',
    project: 'Chromium Desktop',
    duration: 30000,
    status: 'timedOut',
    startTime: '2026-03-26T10:05:00Z',
    error: 'Error: test.setTimeout: 30000ms exceeded.',
    steps: [
      { title: 'Add items to cart', duration: 2000, status: 'passed' },
      { title: 'Proceed to checkout', duration: 28000, status: 'timedOut' },
    ],
    artifacts: {},
    retries: [
      {
        retry: 0, status: 'timedOut', duration: 30000, startTime: '2026-03-26T10:05:00Z',
        error: 'Error: test.setTimeout: 30000ms exceeded.',
        steps: [
          { title: 'Add items to cart', duration: 2000, status: 'passed' },
          { title: 'Proceed to checkout', duration: 28000, status: 'timedOut' },
        ],
        artifacts: {},
      },
    ],
  },
  {
    id: 'test-5',
    title: 'Checkout feature is skipped for staging',
    file: 'tests/checkout.spec.ts',
    line: 50,
    column: 5,
    tags: ['checkout', 'skip'],
    browser: 'firefox',
    project: 'Firefox Desktop',
    duration: 0,
    status: 'skipped',
    startTime: '2026-03-26T10:06:00Z',
    steps: [],
    artifacts: {},
    retries: [
      { retry: 0, status: 'skipped', duration: 0, startTime: '2026-03-26T10:06:00Z', steps: [], artifacts: {} },
    ],
  },
];

/** Converts an absolute Playwright file path to a workspace-relative short form. */
function getShortPath(file: string): string {
  const normalised = file.replace(/\\/g, '/');
  const anchor = /\/(tests?|e2e|specs?|src|__tests?__)\//i.exec(normalised);
  return anchor
    ? normalised.slice(anchor.index + 1)
    : normalised.split('/').slice(-2).join('/');
}

/**
/**
 * Returns step-level timing insights for steps that took >= 2500 ms.
 * Uses a pure absolute threshold to avoid >100% artefacts from Playwright's
 * nested step timing (child step durations can sum to more than the parent).
 */
function getSlowStepFlags(steps: { title: string; duration: number }[]) {
  const WAIT_RE = /wait|timeout|sleep|pause|delay|idle|networkidle|load/i;
  const ABS_THRESHOLD_MS = 2500;
  return steps.map((s, i) => {
    const isWaitKeyword = WAIT_RE.test(s.title);
    const flagged = s.duration >= ABS_THRESHOLD_MS;
    let reason = '';
    if (flagged) {
      if (isWaitKeyword) {
        reason = `Wait-related step took ${(s.duration / 1000).toFixed(2)}s — consider replacing hardcoded waits with event-driven alternatives like waitForSelector or waitForResponse.`;
      } else {
        reason = `Step took ${(s.duration / 1000).toFixed(2)}s — check for implicit waits, slow network calls, or missing assertions that cause polling.`;
      }
    }
    return { flagged, isWaitKeyword, reason, index: i };
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tests' | 'history' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestStatus | 'all'>('all');
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState<number>(0);
  const [projectFilter, setProjectFilter] = useState<string | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string | 'all'>('all');
  const [showRegressions, setShowRegressions] = useState(false);

  // State for runtime-injected data. The bundle may execute before the reporter's
  // script assigns `window.playwrightData`. Use injected `initialData` when present.
  // Only fall back to mock data in development to avoid showing static mock rows
  // in production-built one-pagers.
  const isDev = !!((import.meta as any).env?.DEV);
  const [results, setResults] = useState<TestResult[]>(initialData?.results || (isDev ? MOCK_RESULTS : []));
  const [history, setHistory] = useState<HistoricalData>(initialData?.history || (isDev ? MOCK_HISTORY : { runs: [], tests: {} }));
  const [reportConfig, setReportConfig] = useState<{ qualityGate?: { maxFailures?: number; minPassRate?: number }; label?: string } | null>(
    initialData?.config || (isDev ? { qualityGate: { maxFailures: 0 }, label: 'chromium::tests' } : null)
  );

  // Compute unique project options from results, using a normalized key (lowercase trimmed)
  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    results.forEach(r => {
      const label = (r.project || r.browser || 'unknown') + '';
      const key = label.trim().toLowerCase();
      if (!map.has(key)) map.set(key, label.trim());
    });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [results]);

  // Compute unique tag options from results (strip leading @ from tags)
  const tagOptions = useMemo(() => {
    const seen = new Set<string>();
    results.forEach(r => r.tags.forEach(t => seen.add(t.replace(/^@/, ''))));
    return Array.from(seen).sort().map(t => ({ key: t, label: `@${t}` }));
  }, [results]);

  // If results change and the previously selected project no longer exists,
  // reset the project filter to 'all' to avoid showing an empty results set.
  React.useEffect(() => {
    if (projectFilter !== 'all') {
      const exists = projectOptions.some(o => o.key === projectFilter);
      if (!exists) setProjectFilter('all');
    }
  }, [projectOptions, projectFilter]);

  // Reset attempt selector when selected test changes.
  // Default to the last attempt that has any artifact; fall back to the final attempt.
  React.useEffect(() => {
    if (selectedTest) {
      const hasArtifact = (a: TestAttempt) =>
        !!(a.artifacts.video || a.artifacts.trace || (a.artifacts.screenshots?.length ?? 0) > 0);
      const lastWithArtifact = [...selectedTest.retries]
        .map((a, i) => ({ a, i }))
        .reverse()
        .find(({ a }) => hasArtifact(a));
      setSelectedAttemptIdx(lastWithArtifact?.i ?? selectedTest.retries.length - 1);
    }
  }, [selectedTest?.id]);

  const latestRun = useMemo(() => {
    return history.runs[history.runs.length - 1];
  }, [history]);

  // Scope-aware previous run — shared by stats, resultsByFile, regressions, tagHealth.
  // If the current run has a label, only compares against prior runs with the same label.
  const prevRun = useMemo(() => {
    if (!latestRun) return null;
    const label = latestRun.scope?.label;
    const candidates = history.runs.slice(0, -1);
    if (label) return [...candidates].reverse().find(r => r.scope?.label === label) ?? null;
    return candidates.length > 0 ? candidates[candidates.length - 1] : null;
  }, [history, latestRun]);

  // Classify each currently-failing test against the previous run (must be declared
  // before filteredResults so the Regressions filter can reference it without TDZ error):
  //   regression = was passing last time (newly broken)
  //   ongoing    = was already failing last time (known issue)
  //   new        = no history entry found for the previous run (first-time failure)
  //   unknown    = no previous run to compare against
  const regressions = useMemo(() => {
    const failingTests = results.filter(r => ['failed', 'timedOut', 'interrupted'].includes(r.status));
    return failingTests.map(test => {
      if (!prevRun) return { test, kind: 'unknown' as const };
      const testHist = history.tests[test.id];
      const prevEntry = testHist?.history.find(e => e.runId === prevRun.id);
      if (!prevEntry) return { test, kind: 'new' as const };
      if (prevEntry.status === 'passed') return { test, kind: 'regression' as const };
      return { test, kind: 'ongoing' as const };
    });
  }, [results, history, prevRun]);

  const filteredResults = useMemo(() => {
    const search = searchQuery.toLowerCase().trim();
    const searchTerms = search.split(/\s+/).filter(Boolean);

    const matched = results.filter(result => {
      const matchesSearch = searchTerms.length === 0 || searchTerms.every(term => 
        (result.title?.toLowerCase() || "").includes(term) || 
        (result.file?.toLowerCase() || "").includes(term) ||
        (result.project?.toLowerCase() || "").includes(term) ||
        (result.browser?.toLowerCase() || "").includes(term) ||
        (result.error?.toLowerCase() || "").includes(term) ||
        (result.tags?.some(tag => tag.toLowerCase().includes(term)))
      );

      // Normalize status matching: treat 'failed' as grouping of failure-like statuses
      const matchesStatus = (() => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'failed') return ['failed', 'timedOut', 'interrupted'].includes(result.status as any);
        if (statusFilter === 'skipped') return result.status === 'skipped';
        if (statusFilter === 'passed') return result.status === 'passed';
        return true;
      })();

      // Project filter: allow selecting a specific project (or 'all')
      const projectName = (result.project || result.browser || 'unknown') + '';
      const projectKey = projectName.trim().toLowerCase();
      const matchesProject = projectFilter === 'all' || projectKey === (projectFilter as string);

      const matchesTag = tagFilter === 'all' || result.tags.some(t => t.replace(/^@/, '') === tagFilter);
      
      return matchesSearch && matchesStatus && matchesProject && matchesTag;
    });

    // Regression filter: only show tests that newly regressed since the last run
    if (showRegressions) {
      const regressionIds = new Set(regressions.filter(r => r.kind === 'regression' || r.kind === 'new').map(r => r.test.id));
      return matched.filter(r => regressionIds.has(r.id));
    }

    return matched;
  }, [searchQuery, statusFilter, projectFilter, tagFilter, results, showRegressions, regressions]);
  

  const stats = useMemo(() => {
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => ['failed', 'timedOut', 'interrupted'].includes(r.status)).length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const executed = passed + failed;
    const passRate = executed > 0 ? (passed / executed) * 100 : 0;

    // Warn when test counts differ by more than 25% — likely a different scope was run.
    const scopeMismatch = (latestRun && prevRun)
      ? Math.abs(latestRun.totalTests - prevRun.totalTests) / (prevRun.totalTests || 1) > 0.25
      : false;

    const fmt = (n: number) => n === 0 ? undefined : (n > 0 ? `+${n}` : `${n}`);
    const fmtPct = (n: number) => n === 0 ? undefined : (n > 0 ? `+${n.toFixed(1)}%` : `${n.toFixed(1)}%`);

    let totalTrend: string | undefined;
    let passedTrend: string | undefined;
    let failedTrend: string | undefined;
    let skippedTrend: string | undefined;
    let passRateTrend: string | undefined;

    if (latestRun && prevRun) {
      totalTrend   = fmt(latestRun.totalTests - prevRun.totalTests);
      passedTrend  = fmt(latestRun.passed  - prevRun.passed);
      failedTrend  = fmt(latestRun.failed  - prevRun.failed);
      skippedTrend = fmt(latestRun.skipped - prevRun.skipped);
      const currExec = latestRun.passed + latestRun.failed;
      const prevExec = prevRun.passed + prevRun.failed;
      const currRate = currExec > 0 ? (latestRun.passed / currExec) * 100 : 0;
      const prevRate = prevExec > 0 ? (prevRun.passed / prevExec) * 100 : 0;
      passRateTrend = fmtPct(currRate - prevRate);
    }

    const durationDelta = (latestRun && prevRun) ? latestRun.duration - prevRun.duration : undefined;

    return { total, passed, failed, skipped, passRate, totalTrend, passedTrend, failedTrend, skippedTrend, passRateTrend, durationDelta, scopeMismatch, currRunLabel: latestRun?.scope?.label };
  }, [results, latestRun, prevRun]);

  // IDs of the 5 slowest tests — slow-step flags in the detail panel are
  // restricted to these to avoid noise on fast tests.
  const slowest5Ids = useMemo(
    () => new Set([...results].sort((a, b) => b.duration - a.duration).slice(0, 5).map(r => r.id)),
    [results]
  );

  const resultsByFile = useMemo(() => {
    const currMap: Record<string, { name: string, passed: number, failed: number, skipped: number }> = {};
    const prevMap: Record<string, { passed: number, failed: number, skipped: number }> = {};

    results.forEach(test => {
      const shortPath = getShortPath(test.file);
      if (!currMap[shortPath]) currMap[shortPath] = { name: shortPath, passed: 0, failed: 0, skipped: 0 };
      if (test.status === 'passed') currMap[shortPath].passed++;
      else if (['failed', 'timedOut', 'interrupted'].includes(test.status)) currMap[shortPath].failed++;
      else currMap[shortPath].skipped++;

      // Cross-reference history.tests to get previous run status for this test
      if (prevRun) {
        const testHist = history.tests[test.id];
        const prevEntry = testHist?.history.find(e => e.runId === prevRun.id);
        if (prevEntry) {
          if (!prevMap[shortPath]) prevMap[shortPath] = { passed: 0, failed: 0, skipped: 0 };
          if (prevEntry.status === 'passed') prevMap[shortPath].passed++;
          else if (['failed', 'timedOut', 'interrupted'].includes(prevEntry.status)) prevMap[shortPath].failed++;
          else prevMap[shortPath].skipped++;
        }
      }
    });

    return Object.values(currMap).map(row => {
      const prev = prevMap[row.name];
      return {
        ...row,
        passedDelta: prev !== undefined ? row.passed - prev.passed : undefined,
        failedDelta: prev !== undefined ? row.failed - prev.failed : undefined,
        skippedDelta: prev !== undefined ? row.skipped - prev.skipped : undefined,
        prevPassed:  prev?.passed,
        prevFailed:  prev?.failed,
        prevSkipped: prev?.skipped,
      };
    });
  }, [results, history, prevRun]);

  // Per-tag pass-rate breakdown — answers "is the checkout journey stable?".
  // Only includes results with at least one tag; sorted by total test count descending.
  const tagHealth = useMemo(() => {
    const allTags = new Set<string>();
    results.forEach(r => r.tags.forEach(t => allTags.add(t.replace(/^@/, ''))));
    if (allTags.size === 0) return [];

    return Array.from(allTags).map(tag => {
      const tagTests = results.filter(r => r.tags.some(t => t.replace(/^@/, '') === tag));
      const passed = tagTests.filter(r => r.status === 'passed').length;
      const failed = tagTests.filter(r => ['failed', 'timedOut', 'interrupted'].includes(r.status)).length;
      const skipped = tagTests.filter(r => r.status === 'skipped').length;
      const executed = passed + failed;
      const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 100;

      let passedDelta: number | undefined;
      let failedDelta: number | undefined;
      if (prevRun) {
        let prevPassed = 0, prevFailed = 0;
        tagTests.forEach(test => {
          const testHist = history.tests[test.id];
          const prevEntry = testHist?.history.find(e => e.runId === prevRun.id);
          if (prevEntry) {
            if (prevEntry.status === 'passed') prevPassed++;
            else if (['failed', 'timedOut', 'interrupted'].includes(prevEntry.status)) prevFailed++;
          }
        });
        if (prevPassed > 0 || prevFailed > 0) {
          passedDelta = passed - prevPassed;
          failedDelta = failed - prevFailed;
        }
      }
      return { tag, passed, failed, skipped, total: tagTests.length, passRate, passedDelta, failedDelta };
    }).sort((a, b) => b.total - a.total);
  }, [results, history, prevRun]);

  // Flaky tests: appeared both as passed AND failed across the last ≤10 history entries.
  // Requires a minimum of 3 recorded runs so sporadic noise isn't labelled as flaky.
  const flakyTests = useMemo(() => {
    if (Object.keys(history.tests).length === 0) return [];
    const found: Array<{ id: string; title: string; tags: string[]; failRate: number; recentHistory: { status: string; runId: string }[] }> = [];
    Object.values(history.tests).forEach((testHist: TestHistory) => {
      const recent = testHist.history.slice(-10);
      const recentPassed = recent.filter(h => h.status === 'passed').length;
      const recentFailed = recent.filter(h => ['failed', 'timedOut', 'interrupted'].includes(h.status)).length;
      if (recentPassed > 0 && recentFailed > 0 && recent.length >= 3) {
        found.push({
          id: testHist.id,
          title: testHist.title,
          tags: testHist.tags,
          failRate: recentFailed / recent.length,
          recentHistory: recent.map(e => ({ status: e.status, runId: e.runId })),
        });
      }
    });
    return found.sort((a, b) => b.failRate - a.failRate).slice(0, 10);
  }, [history]);

  // Quality gate verdict derived from regressions and the configured thresholds.
  //   pass      – within all thresholds
  //   degraded  – failures exist but all are ongoing (known) and within maxFailures
  //   blocked   – new regressions OR pass-rate below minPassRate
  const qualityGateVerdict = useMemo(() => {
    if (results.length === 0) return null;
    const maxFailures = reportConfig?.qualityGate?.maxFailures ?? 0;
    const minPassRate = reportConfig?.qualityGate?.minPassRate;
    const newRegressions = regressions.filter(r => r.kind === 'regression' || r.kind === 'new');
    const ongoingFailures = regressions.filter(r => r.kind === 'ongoing');
    const totalFailed = regressions.length;
    const executed = stats.passed + stats.failed;
    const passRate = executed > 0 ? (stats.passed / executed) * 100 : 100;
    const passRateFails = minPassRate !== undefined && passRate < minPassRate;
    if (!passRateFails && totalFailed <= maxFailures) {
      return { verdict: 'pass' as const, passRate, newRegressions, ongoingFailures };
    }
    if (newRegressions.length > 0 || passRateFails) {
      return { verdict: 'blocked' as const, passRate, newRegressions, ongoingFailures };
    }
    return { verdict: 'degraded' as const, passRate, newRegressions, ongoingFailures };
  }, [results, regressions, stats, reportConfig]);

  // Build / branch context surfaced in the header.
  const buildContext = useMemo(() => {
    const env = latestRun?.environment;
    const label = latestRun?.scope?.label;
    if (!env && !label) return null;
    return { ...env, label };
  }, [latestRun]);

  const projectBreakdown = useMemo(() => {
    const map: Record<string, { name: string, value: number }> = {};
    results.forEach(test => {
      const projectName = test.project || test.browser;
      if (!map[projectName]) {
        map[projectName] = { name: projectName, value: 0 };
      }
      map[projectName].value++;
    });
    return Object.values(map);
  }, [results]);

  const historyData = useMemo(() => {
    return history.runs.map(run => ({
      ...run,
      successRate: (run.passed / run.totalTests) * 100,
      name: new Date(run.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
  }, [history]);

  // When the page bundle runs before the reporter's injected script, window.playwrightData
  // may be appended later. We poll briefly as a fallback, but we MUST load the data
  // exactly once — every extra setResults/setProjectFilter call would wipe user filter state.
  React.useEffect(() => {
    // `loaded` prevents any state update after the first successful load.
    let loaded = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const parseData = (raw: unknown) => {
      if (!raw) return null;
      if (typeof raw === 'object') return raw as any;
      if (typeof raw === 'string') {
        const t = raw.trim();
        if (t === 'DATA_PLACEHOLDER' || t === '') return null;
        try { return JSON.parse(t); } catch { return null; }
      }
      return null;
    };

    const applyOnce = (parsed: any) => {
      if (loaded) return; // guard: never apply more than once
      if (!parsed?.results) return;
      loaded = true;

      // Cancel any pending interval/timeout before touching state.
      if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
      if (timeoutId !== null) { clearTimeout(timeoutId); timeoutId = null; }

      setResults(Array.isArray(parsed.results) ? parsed.results : []);
      if (parsed.history) setHistory(parsed.history);
      if (parsed.config) setReportConfig(parsed.config);
      // eslint-disable-next-line no-console
      console.debug('[Phantom] runtime data loaded, results:', parsed.results.length);
    };

    const tryLoad = () => {
      if (loaded) return;
      try {
        applyOnce(parseData((window as any).playwrightData));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.debug('[Phantom] runtime data parse failed:', e);
      }
    };

    // Attempt immediately — if data script ran before the module (deferred), this succeeds.
    tryLoad();

    if (!loaded) {
      // Data wasn't available yet (module ran before the data script); start polling.
      intervalId = setInterval(tryLoad, 200);
      // Give up after 8 s — show whatever state we have.
      timeoutId = setTimeout(() => {
        if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
      }, 8000);
    }

    return () => {
      loaded = true; // prevent any in-flight applyOnce from touching unmounted state
      if (intervalId !== null) clearInterval(intervalId);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-[#E4E4E7] font-sans selection:bg-[#00FF88]/30 selection:text-[#00FF88]">
      <div className="atmosphere" />
      
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-black/40 backdrop-blur-xl border-r border-white/5 z-50">
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl shadow-white/5 group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <svg className="w-10 h-10 relative z-10 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g transform="translate(60 60) rotate(-18) translate(-60 -60)">
                <path
                  d="M82 26C72 17 54 15 42 22C31 29 28 40 28 50C28 53 26 55 23 56C17 58 12 63 10 71C8 79 9 88 11 95C17 88 23 85 29 85C35 85 39 88 42 93C46 100 53 104 62 105C75 106 88 99 95 88C100 80 101 71 99 63C98 58 99 54 103 50C108 45 111 37 109 29C105 31 101 35 98 40C95 45 90 46 86 43C84 41 84 37 84 34C84 31 83 28 82 26Z"
                  fill="white"
                  stroke="#111111"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <ellipse cx="55" cy="43" rx="5.5" ry="8.5" fill="#111111" />
                <ellipse cx="72" cy="45" rx="5.5" ry="8.5" fill="#111111" />
                <ellipse cx="64" cy="61" rx="5" ry="7" fill="#111111" />
                <ellipse cx="24" cy="82" rx="4.5" ry="6.5" fill="#111111" transform="rotate(18 24 82)" />
                <ellipse cx="53" cy="97" rx="4.5" ry="6.5" fill="#111111" transform="rotate(8 53 97)" />
                <ellipse cx="86" cy="91" rx="4.5" ry="6.5" fill="#111111" transform="rotate(-18 86 91)" />
                <path d="M33 53C26 55 20 61 18 71" stroke="#111111" strokeWidth="5" strokeLinecap="round" />
                <path d="M92 49C100 46 105 40 107 31" stroke="#111111" strokeWidth="5" strokeLinecap="round" />
              </g>
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tighter text-white">Phantom</h1>
            <p className="text-[10px] text-white/40 font-mono tracking-widest uppercase">Reporter</p>
          </div>
        </div>

        <nav className="mt-8 px-4 space-y-1.5">
          <NavItem 
            icon={<LayoutDashboard size={18} />} 
            label="Overview" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={<CheckCircle2 size={18} />} 
            label="Test Results" 
            active={activeTab === 'tests'} 
            onClick={() => setActiveTab('tests')} 
          />
          <NavItem 
            icon={<History size={18} />} 
            label="Run History" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
          />
          <NavItem 
            icon={<Settings size={18} />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/5">
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
              <Database size={14} className="text-white/40" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-medium text-white/80 truncate">Local Storage</p>
              <p className="text-[9px] text-white/30 font-mono truncate">history.json</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-10 max-w-7xl mx-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Live Report</span>
            </div>
            <h2 className="text-5xl font-light tracking-tight text-white mb-2">
              {activeTab === 'dashboard' && "Overview"}
              {activeTab === 'tests' && "Test Results"}
              {activeTab === 'history' && "Analytics"}
              {activeTab === 'settings' && "Config"}
            </h2>
            <p className="text-white/40 text-sm">
              Run <span className="font-mono text-white/60">{latestRun?.id || 'N/A'}</span> • {latestRun ? new Date(latestRun.startTime).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </p>
            {/* Build context chips — branch, commit, build number, environment */}
            {buildContext && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {buildContext.branch && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-white/40 bg-white/5 border border-white/8 rounded-lg px-2 py-0.5">
                    <GitBranch size={10} className="shrink-0" />{buildContext.branch}
                  </span>
                )}
                {buildContext.commit && (
                  <span className="text-[10px] font-mono text-white/40 bg-white/5 border border-white/8 rounded-lg px-2 py-0.5">
                    {buildContext.commit}
                  </span>
                )}
                {buildContext.buildNumber && (
                  <span className="text-[10px] font-mono text-white/40 bg-white/5 border border-white/8 rounded-lg px-2 py-0.5">
                    #{buildContext.buildNumber}
                  </span>
                )}
                {buildContext.environment && (
                  <span className="text-[10px] font-mono text-white/50 bg-[#00FF88]/5 border border-[#00FF88]/15 rounded-lg px-2 py-0.5">
                    {buildContext.environment}
                  </span>
                )}
                {buildContext.label && (
                  <span className="text-[10px] font-mono text-white/30 bg-white/3 border border-white/6 rounded-lg px-2 py-0.5">
                    {buildContext.label}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            {/* Copy summary to clipboard */}
            <button
              onClick={() => {
                const SEP = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
                const date = latestRun ? new Date(latestRun.startTime) : null;
                const dateStr = date
                  ? date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                    + '  ·  '
                    + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  : '';

                const contextParts: string[] = [];
                if (buildContext?.branch)
                  contextParts.push(`🌿 ${buildContext.branch}${buildContext.commit ? ` @ ${buildContext.commit.slice(0, 7)}` : ''}`);
                if (buildContext?.buildNumber) contextParts.push(`Build #${buildContext.buildNumber}`);
                if (buildContext?.label) contextParts.push(buildContext.label);

                const executed = stats.passed + stats.failed;
                const rate = executed > 0 ? stats.passed / executed : 1;
                const BAR_LEN = 20;
                const filled = Math.round(rate * BAR_LEN);
                const bar = '█'.repeat(filled) + '░'.repeat(BAR_LEN - filled);
                const passRateStr = executed > 0 ? (rate * 100).toFixed(1) + '%' : '—';

                const failingTests = regressions.map(r => r.test);
                const lines: string[] = [
                  SEP,
                  '  🔬 Phantom Report',
                  ...(dateStr ? [`  ${dateStr}`] : []),
                  ...(contextParts.length ? [`  ${contextParts.join('  ·  ')}`] : []),
                  SEP,
                  `  ✅  Passed   ${String(stats.passed).padStart(4)}`,
                  `  ❌  Failed   ${String(stats.failed).padStart(4)}`,
                  `  ⏭   Skipped  ${String(stats.skipped).padStart(4)}`,
                  '',
                  `  Pass Rate  [${bar}]  ${passRateStr}`,
                  `  Duration   ${formatDuration(latestRun?.duration ?? 0)}`,
                  SEP,
                  ...(failingTests.length > 0 ? [
                    `  ⚠  Failing Tests (${failingTests.length})`,
                    ...failingTests.map(t => `     › ${t.title}`),
                    '',
                  ] : []),
                  ...(flakyTests.length > 0 ? [
                    `  ⚡  Flaky Tests (${flakyTests.length})`,
                    ...flakyTests.map(f => `     › ${f.title}`),
                    '',
                  ] : []),
                  ...(failingTests.length === 0 && flakyTests.length === 0 ? [
                    '  ✨  All tests passed — nothing needs attention.',
                    '',
                  ] : []),
                  SEP,
                ];
                navigator.clipboard.writeText(lines.join('\n')).catch(() => {/* silent */});
              }}
              title="Copy summary to clipboard"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl backdrop-blur-md transition-all text-white/50 hover:text-white/80 text-sm"
            >
              <Copy size={14} />
              <span className="hidden sm:inline text-xs">Copy</span>
            </button>
            <div className="flex items-center gap-3 px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
              <Clock size={16} className="text-white/30" />
              <span className="text-sm font-mono text-white/80 tracking-tight">{latestRun ? formatDuration(latestRun.duration) : '00:00.00'}</span>
              {stats.durationDelta !== undefined && (
                <span className={cn(
                  'text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full border',
                  stats.durationDelta <= 0
                    ? 'bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/20'
                    : 'bg-[#FF3366]/10 text-[#FF3366] border-[#FF3366]/20'
                )}>
                  {stats.durationDelta > 0 ? '+' : '−'}{formatDuration(Math.abs(stats.durationDelta))}
                </span>
              )}
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            {/* Quality Gate Banner */}
            {qualityGateVerdict && (
              <div className={cn(
                'flex items-start gap-4 px-6 py-4 rounded-2xl border backdrop-blur-sm',
                qualityGateVerdict.verdict === 'pass'
                  ? 'bg-[#00FF88]/5 border-[#00FF88]/20'
                  : qualityGateVerdict.verdict === 'degraded'
                  ? 'bg-amber-500/8 border-amber-500/25'
                  : 'bg-[#FF3366]/6 border-[#FF3366]/25'
              )}>
                <div className={cn('mt-0.5 shrink-0', qualityGateVerdict.verdict === 'pass' ? 'text-[#00FF88]' : qualityGateVerdict.verdict === 'degraded' ? 'text-amber-400' : 'text-[#FF3366]')}>
                  {qualityGateVerdict.verdict === 'pass' ? <ShieldCheck size={22} /> : qualityGateVerdict.verdict === 'degraded' ? <Shield size={22} /> : <ShieldAlert size={22} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span className={cn('text-sm font-bold', qualityGateVerdict.verdict === 'pass' ? 'text-[#00FF88]' : qualityGateVerdict.verdict === 'degraded' ? 'text-amber-400' : 'text-[#FF3366]')}>
                      {qualityGateVerdict.verdict === 'pass' ? 'All tests passing' : qualityGateVerdict.verdict === 'degraded' ? 'Known failures present' : 'Tests need attention'}
                    </span>
                    <span className="text-[11px] text-white/35 font-mono">{qualityGateVerdict.passRate.toFixed(1)}% pass rate</span>
                  </div>
                  {qualityGateVerdict.verdict === 'pass' && (
                    <p className="text-[12px] text-white/50 mt-0.5">Everything passed — this run is ready to go.</p>
                  )}
                  {qualityGateVerdict.verdict === 'degraded' && (
                    <p className="text-[12px] text-amber-400/70 mt-0.5">
                      {qualityGateVerdict.ongoingFailures.length} test{qualityGateVerdict.ongoingFailures.length !== 1 ? 's' : ''} that {qualityGateVerdict.ongoingFailures.length !== 1 ? 'were' : 'was'} already failing before {qualityGateVerdict.ongoingFailures.length !== 1 ? 'continue' : 'continues'} to fail — nothing new has broken since the last run.
                    </p>
                  )}
                  {qualityGateVerdict.verdict === 'blocked' && qualityGateVerdict.newRegressions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[12px] text-[#FF3366]/80 mb-2">
                        {qualityGateVerdict.newRegressions.length} test{qualityGateVerdict.newRegressions.length !== 1 ? 's' : ''} that {qualityGateVerdict.newRegressions.length !== 1 ? 'were' : 'was'} passing before {qualityGateVerdict.newRegressions.length !== 1 ? 'are' : 'is'} now failing:
                      </p>
                      <ul className="space-y-2">
                        {qualityGateVerdict.newRegressions.slice(0, 5).map(r => (
                          <li key={r.test.id} className="bg-[#FF3366]/5 border border-[#FF3366]/15 rounded-xl px-3 py-2.5">
                            <p className="text-[12px] text-white/75 font-medium leading-snug">{r.test.title}</p>
                            {r.test.error && (
                              <p className="text-[11px] text-[#FF3366]/60 mt-1 truncate" title={r.test.error}>{r.test.error}</p>
                            )}
                            <p className="text-[10px] text-white/25 font-mono mt-1">{(() => { const n = r.test.file.replace(/\\/g, '/'); const a = /\/(tests?|e2e|specs?|src|__tests?__)\//i.exec(n); return (a ? n.slice(a.index + 1) : n.split('/').slice(-2).join('/')) + ':' + r.test.line; })()}</p>
                          </li>
                        ))}
                        {qualityGateVerdict.newRegressions.length > 5 && (
                          <li className="text-[11px] text-white/30 px-1">…and {qualityGateVerdict.newRegressions.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                {qualityGateVerdict.newRegressions.length > 0 && (
                  <button
                    onClick={() => { setActiveTab('tests'); setStatusFilter('failed'); setShowRegressions(true); }}
                    className="shrink-0 self-start text-[11px] font-bold text-[#FF3366]/70 hover:text-[#FF3366] border border-[#FF3366]/20 hover:border-[#FF3366]/40 rounded-lg px-3 py-1.5 transition-all whitespace-nowrap"
                  >
                    See all failing tests →
                  </button>
                )}
              </div>
            )}
            <div>
              <div className="grid grid-cols-5 gap-6">
                <StatCard label="Total Tests" value={stats.total} icon={<FileText className="text-white/60" />} trend={stats.totalTrend} />
                <StatCard label="Passed" value={stats.passed} icon={<CheckCircle2 className="text-[#00FF88]" />} trend={stats.passedTrend} />
                <StatCard label="Failed" value={stats.failed} icon={<XCircle className="text-[#FF3366]" />} trend={stats.failedTrend} trendInverse />
                <StatCard label="Skipped" value={stats.skipped} icon={<AlertCircle className="text-white/40" />} trend={stats.skippedTrend} trendInverse />
                <StatCard label="Pass Rate" value={`${stats.passRate.toFixed(1)}%`} icon={<BarChart3 className="text-white/60" />} trend={stats.passRateTrend} />
              </div>
              {/* Scope mismatch warning — shown when deltas compare runs with very different test counts */}
              {stats.scopeMismatch && (
                <div className="mt-4 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-400 text-[11px]">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>
                    Trend deltas may be inaccurate — the previous comparison run had a significantly different number of tests.
                    {stats.currRunLabel
                      ? <> Set <code className="font-mono bg-white/5 px-1 rounded">label: &quot;{stats.currRunLabel}&quot;</code> in your other workflow configs so only matching runs are compared.</>
                      : <> Add a <code className="font-mono bg-white/5 px-1 rounded">label</code> option to your reporter config to isolate trends per workflow.</>
                    }
                  </span>
                </div>
              )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-8">
              {/* Results by File — segmented progress bars */}
              <div className="col-span-2 glass-card p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-bold text-xl tracking-tight">Results by File</h3>
                  <div className="flex gap-5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#00FF88]" />Passed</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#FF3366]" />Failed</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white/15" />Skipped</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {resultsByFile.map((row) => {
                    const total = row.passed + row.failed + row.skipped || 1;
                    const pPct  = (row.passed  / total) * 100;
                    const fPct  = (row.failed  / total) * 100;
                    const sPct  = (row.skipped / total) * 100;
                    const hasDelta = row.failedDelta !== undefined;
                    // Build a short summary of the most significant delta for the badge
                    const primaryDelta = (() => {
                      if (!hasDelta) return null;
                      if (row.failedDelta !== 0) return { label: 'failed', value: row.failedDelta! };
                      if (row.passedDelta !== 0) return { label: 'passed', value: row.passedDelta! };
                      if (row.skippedDelta !== 0) return { label: 'skipped', value: row.skippedDelta! };
                      return null;
                    })();
                    return (
                      <div key={row.name} className="relative group">
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="text-[11px] font-mono text-white/50 truncate max-w-[55%]">{row.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {primaryDelta && (
                              <span className={cn(
                                'text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-full border',
                                primaryDelta.label === 'failed'
                                  ? primaryDelta.value > 0
                                    ? 'bg-[#FF3366]/15 text-[#FF3366] border-[#FF3366]/25'
                                    : 'bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/20'
                                  : primaryDelta.label === 'passed'
                                    ? primaryDelta.value > 0
                                      ? 'bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/20'
                                      : 'bg-[#FF3366]/15 text-[#FF3366] border-[#FF3366]/25'
                                    : 'bg-white/10 text-white/40 border-white/10'
                              )}>
                                {primaryDelta.value > 0 ? '+' : ''}{primaryDelta.value} {primaryDelta.label}
                              </span>
                            )}
                            <span className="text-[10px] text-white/25 tabular-nums">
                              {row.passed}p&nbsp;·&nbsp;{row.failed}f&nbsp;·&nbsp;{row.skipped}s
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full flex rounded-full overflow-hidden bg-white/5">
                          {pPct > 0 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pPct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="h-full bg-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.4)]"
                            />
                          )}
                          {fPct > 0 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${fPct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05 }}
                              className="h-full bg-[#FF3366] shadow-[0_0_8px_rgba(255,51,102,0.4)]"
                            />
                          )}
                          {sPct > 0 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${sPct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                              className="h-full bg-white/15"
                            />
                          )}
                        </div>
                        {/* Hover tooltip */}
                        {hasDelta && (
                          <div className="absolute right-0 top-full mt-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <div className="bg-[#0f0f17] border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl text-[10px] font-mono whitespace-nowrap">
                              <p className="text-white/30 uppercase tracking-widest text-[8px] font-bold mb-2">vs previous run</p>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-6">
                                  <span className="text-white/40">Passed</span>
                                  <span className={cn('font-bold', (row.passedDelta ?? 0) > 0 ? 'text-[#00FF88]' : (row.passedDelta ?? 0) < 0 ? 'text-[#FF3366]' : 'text-white/30')}>
                                    {row.prevPassed ?? '—'} → {row.passed}
                                    {row.passedDelta !== 0 && <span className="ml-1">({row.passedDelta! > 0 ? '+' : ''}{row.passedDelta})</span>}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-6">
                                  <span className="text-white/40">Failed</span>
                                  <span className={cn('font-bold', (row.failedDelta ?? 0) > 0 ? 'text-[#FF3366]' : (row.failedDelta ?? 0) < 0 ? 'text-[#00FF88]' : 'text-white/30')}>
                                    {row.prevFailed ?? '—'} → {row.failed}
                                    {row.failedDelta !== 0 && <span className="ml-1">({row.failedDelta! > 0 ? '+' : ''}{row.failedDelta})</span>}
                                  </span>
                                </div>
                                {((row.skipped > 0) || (row.prevSkipped ?? 0) > 0) && (
                                  <div className="flex justify-between gap-6">
                                    <span className="text-white/40">Skipped</span>
                                    <span className={cn('font-bold', (row.skippedDelta ?? 0) !== 0 ? 'text-white/60' : 'text-white/30')}>
                                      {row.prevSkipped ?? '—'} → {row.skipped}
                                      {row.skippedDelta !== 0 && <span className="ml-1">({row.skippedDelta! > 0 ? '+' : ''}{row.skippedDelta})</span>}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Projects — stat cards per project */}
              <div className="glass-card p-8">
                <h3 className="font-bold text-xl tracking-tight mb-6">Projects</h3>
                <div className="space-y-3">
                  {projectBreakdown.map((proj) => {
                    const total   = proj.value || 1;
                    const passed  = results.filter(r => (r.project || r.browser) === proj.name && r.status === 'passed').length;
                    const failed  = results.filter(r => (r.project || r.browser) === proj.name && ['failed','timedOut','interrupted'].includes(r.status)).length;
                    const skipped = total - passed - failed;
                    const passRate = Math.round((passed / total) * 100);
                    const pPct = (passed  / total) * 100;
                    const fPct = (failed  / total) * 100;
                    const sPct = Math.max(0, 100 - pPct - fPct);
                    return (
                      <div key={proj.name} className="p-4 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all group">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[11px] font-mono text-white/60 group-hover:text-white/80 transition-colors truncate max-w-[70%]">{proj.name}</span>
                          <span className="text-[10px] font-bold tabular-nums text-white/50">{passRate}%</span>
                        </div>
                        <div className="h-1 w-full flex rounded-full overflow-hidden bg-white/5 mb-3">
                          {pPct > 0 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pPct}%` }}
                              transition={{ duration: 0.7, ease: 'easeOut' }}
                              className="h-full bg-[#00FF88] shadow-[0_0_6px_rgba(0,255,136,0.5)]"
                            />
                          )}
                          {fPct > 0 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${fPct}%` }}
                              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.05 }}
                              className="h-full bg-[#FF3366] shadow-[0_0_6px_rgba(255,51,102,0.4)]"
                            />
                          )}
                          {sPct > 0 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${sPct}%` }}
                              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
                              className="h-full bg-white/15"
                            />
                          )}
                        </div>
                        <div className="flex gap-4 text-[9px] font-bold uppercase tracking-widest">
                          <span className="text-[#00FF88]/60">{passed} passed</span>
                          {failed > 0 && <span className="text-[#FF3366]/60">{failed} failed</span>}
                          {skipped > 0 && <span className="text-white/20">{skipped} skipped</span>}
                          <span className="text-white/20 ml-auto">{total} total</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tag / Feature Health — only shown when results carry tags */}
            {tagHealth.length > 0 && (
              <div className="glass-card p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Tag size={18} className="text-white/50" />
                  <h3 className="font-bold text-xl tracking-tight">Tag Health</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/25 ml-auto">pass rate by area</span>
                </div>
                <div className="space-y-3">
                  {tagHealth.map(row => (
                    <div key={row.tag} className="flex items-center gap-4">
                      <span className="font-mono text-[12px] text-white/60 w-32 truncate shrink-0">@{row.tag}</span>
                      <div className="flex-1 h-1.5 bg-white/6 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', row.passRate >= 80 ? 'bg-[#00FF88]' : row.passRate >= 50 ? 'bg-amber-400' : 'bg-[#FF3366]')}
                          style={{ width: `${row.passRate}%` }}
                        />
                      </div>
                      <span className={cn('text-[12px] font-bold tabular-nums w-12 text-right shrink-0', row.passRate >= 80 ? 'text-[#00FF88]' : row.passRate >= 50 ? 'text-amber-400' : 'text-[#FF3366]')}>
                        {row.passRate}%
                      </span>
                      <span className="text-[11px] text-white/30 w-20 text-right shrink-0">
                        {row.passed}p / {row.failed}f{row.skipped > 0 ? ` / ${row.skipped}s` : ''}
                      </span>
                      {row.failedDelta !== undefined && row.failedDelta !== 0 ? (
                        <span className={cn('text-[10px] font-bold tabular-nums w-12 text-right shrink-0', row.failedDelta > 0 ? 'text-[#FF3366]' : 'text-[#00FF88]')}>
                          {row.failedDelta > 0 ? `+${row.failedDelta}f` : `${row.failedDelta}f`}
                        </span>
                      ) : (
                        <span className="w-12 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slowest Tests */}
            <div className="glass-card p-8">
              <h3 className="font-bold text-xl tracking-tight mb-8">Slowest Executions</h3>
              <div className="grid grid-cols-1 gap-3">
                {[...results].sort((a, b) => b.duration - a.duration).slice(0, 5).map((test, i) => {
                  const flags = getSlowStepFlags(test.steps);
                  const slowStepCount = flags.filter(f => f.flagged).length;
                  const waitStepCount = flags.filter(f => f.flagged && f.isWaitKeyword).length;
                  return (
                    <div
                      key={`${test.id}-${test.project}-${i}`}
                      className="flex items-center justify-between p-5 bg-white/2 border border-white/5 rounded-2xl hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer group"
                      onClick={() => { setActiveTab('tests'); setSelectedTest(test); }}
                    >
                      <div className="flex items-center gap-5">
                        <div className="text-white/20 font-mono text-xs w-6">0{i+1}</div>
                        <div>
                          <p className="font-medium text-sm text-white/80 group-hover:text-white transition-colors">{test.title}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className="text-[10px] text-white/30 font-mono">{getShortPath(test.file)}</p>
                            {waitStepCount > 0 && (
                              <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400/80 border border-amber-500/20">
                                ⏱ {waitStepCount} slow wait{waitStepCount !== 1 ? 's' : ''}
                              </span>
                            )}
                            {slowStepCount > waitStepCount && (
                              <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/5 text-white/30 border border-white/10">
                                {slowStepCount - waitStepCount} slow step{(slowStepCount - waitStepCount) !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-sm font-mono text-white/80">{(test.duration / 1000).toFixed(2)}s</p>
                          <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Duration</p>
                        </div>
                        <ChevronRight size={16} className="text-white/20 group-hover:text-white/40 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="space-y-8">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="text" 
                  placeholder="Search tests by title, file, or tag..." 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-6 focus:outline-none focus:border-white/20 transition-all text-sm placeholder:text-white/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex shrink-0 flex-wrap items-center bg-white/5 border border-white/10 rounded-2xl p-1.5 h-fit backdrop-blur-md">
                <FilterButton active={statusFilter === 'all' && !showRegressions} onClick={() => { setStatusFilter('all'); setShowRegressions(false); }}>All</FilterButton>
                <FilterButton active={statusFilter === 'passed' && !showRegressions} onClick={() => { setStatusFilter('passed'); setShowRegressions(false); }} color="text-[#00FF88]">Passed</FilterButton>
                <FilterButton active={statusFilter === 'failed' && !showRegressions} onClick={() => { setStatusFilter('failed'); setShowRegressions(false); }} color="text-[#FF3366]">Failed</FilterButton>
                <FilterButton active={statusFilter === 'skipped' && !showRegressions} onClick={() => { setStatusFilter('skipped'); setShowRegressions(false); }} color="text-white/40">Skipped</FilterButton>
                {regressions.filter(r => r.kind === 'regression' || r.kind === 'new').length > 0 && (
                  <FilterButton
                    active={showRegressions}
                    onClick={() => { setShowRegressions(v => !v); if (!showRegressions) setStatusFilter('all'); }}
                    color="text-[#FF3366]"
                  >
                    Regressions{' '}
                    <span className="ml-1 text-[9px] bg-[#FF3366]/20 text-[#FF3366] rounded-full px-1.5 py-0.5 font-bold">
                      {regressions.filter(r => r.kind === 'regression' || r.kind === 'new').length}
                    </span>
                  </FilterButton>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-white/40 text-[10px] uppercase tracking-widest">Project</label>
                <ProjectDropdown
                  value={projectFilter}
                  options={projectOptions}
                  onChange={setProjectFilter}
                />
              </div>
              {tagOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-white/40 text-[10px] uppercase tracking-widest">Tag</label>
                  <ProjectDropdown
                    value={tagFilter}
                    options={tagOptions}
                    onChange={setTagFilter}
                  />
                </div>
              )}
            </div>

            {/* Results Table */}
            <div className="glass-card overflow-x-auto">
              <table className="w-full min-w-[680px] text-left border-collapse">
                <thead>
                  <tr className="bg-white/2 border-b border-white/5">
                    <th className="px-4 py-5 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-4 py-5 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Test Case</th>
                    <th className="px-4 py-5 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Project</th>
                    <th className="px-4 py-5 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Duration</th>
                    <th className="px-4 py-5 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredResults.map((result, idx) => (
                    <tr 
                      key={`${result.id}-${result.project}-${idx}`} 
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                      onClick={() => setSelectedTest(result)}
                    >
                      <td className="px-4 py-5">
                        {result.status === 'passed' && <div className="w-2.5 h-2.5 rounded-full bg-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.5)]" />}
                        {['failed', 'timedOut', 'interrupted'].includes(result.status) && <div className="w-2.5 h-2.5 rounded-full bg-[#FF3366] shadow-[0_0_10px_rgba(255,51,102,0.5)]" />}
                        {result.status === 'skipped' && <div className="w-2.5 h-2.5 rounded-full bg-white/20" />}
                      </td>
                      <td className="px-4 py-5">
                        <p className="font-medium text-sm text-white/80 group-hover:text-white transition-colors">{result.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-[10px] text-white/30 font-mono">{result.file}:{result.line}</p>
                          {result.retries.length > 1 && (
                            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400/80 border border-amber-500/20">
                              ↻ {result.retries.length - 1} {result.retries.length - 1 === 1 ? 'retry' : 'retries'}
                            </span>
                          )}
                          {result.retries.length > 1 && result.status === 'passed' && (
                            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-300/80 border border-purple-500/25">
                              ⚡ Flaky
                            </span>
                          )}
                          {(() => {
                            const reg = regressions.find(r => r.test.id === result.id);
                            if (!reg) return null;
                            if (reg.kind === 'regression') return <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/25">Regression</span>;
                            if (reg.kind === 'new') return <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25">New</span>;
                            if (reg.kind === 'ongoing') return <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/6 text-white/35 border border-white/10">Ongoing</span>;
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <span className="text-[10px] px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg font-mono text-white/40 uppercase tracking-wider whitespace-nowrap">{result.project || result.browser}</span>
                      </td>
                      <td className="px-4 py-5">
                        <span className="text-sm font-mono text-white/60 whitespace-nowrap">{(result.duration / 1000).toFixed(2)}s</span>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex flex-wrap gap-1.5">
                          {result.tags.map(tag => (
                            <span key={tag} className="text-[9px] px-2 py-0.5 border border-white/5 rounded-full text-white/30 font-bold uppercase tracking-tighter whitespace-nowrap">#{tag}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-10">
            <div className="glass-card p-8">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h3 className="font-bold text-xl tracking-tight">Success Rate Trend</h3>
                  <p className="text-xs text-white/30 mt-1">Percentage of passed tests over the last 7 executions</p>
                </div>
                <div className="px-4 py-1.5 bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-full text-[#00FF88] text-[10px] font-bold uppercase tracking-widest">
                  Stable
                </div>
              </div>
              <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="rgba(255,255,255,0.3)" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.3)" 
                      fontSize={10} 
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                      itemStyle={{ fontSize: '12px' }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Success Rate']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="successRate" 
                      stroke="#00FF88" 
                      strokeWidth={3} 
                      dot={{ fill: '#00FF88', r: 4, strokeWidth: 2, stroke: '#050505' }} 
                      activeDot={{ r: 6, strokeWidth: 0 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="glass-card p-8">
                <h3 className="font-bold text-xl tracking-tight mb-8">Execution Duration</h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickFormatter={(val) => `${(val / 60000).toFixed(1)}m`} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                        formatter={(value: number) => [`${(value / 60000).toFixed(2)} min`, 'Duration']}
                      />
                      <Bar dataKey="duration" fill="rgba(255,255,255,0.05)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-8">
                <h3 className="font-bold text-xl tracking-tight mb-8">Test Volume</h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }} />
                      <Area type="monotone" dataKey="totalTests" stroke="rgba(255,255,255,0.2)" fill="rgba(255,255,255,0.05)" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Flaky Test Register — only shown when flaky tests are detected */}
            {flakyTests.length > 0 && history.runs.length >= 3 && (
              <div className="glass-card p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Zap size={18} className="text-amber-400" />
                  <h3 className="font-bold text-xl tracking-tight">Flaky Tests</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/25 ml-auto">last {Math.min(10, history.runs.length)} runs</span>
                </div>
                <div className="space-y-4">
                  {flakyTests.map(ft => (
                    <div key={ft.id} className="flex items-start gap-4 p-4 bg-amber-500/4 border border-amber-500/15 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/75 truncate">{ft.title}</p>
                        {ft.tags.length > 0 && (
                          <div className="flex gap-1.5 mt-1">
                            {ft.tags.map(t => (
                              <span key={t} className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 bg-white/5 border border-white/8 rounded-md text-white/30">#{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Sparkline dots */}
                      <div className="flex items-center gap-1 shrink-0">
                        {ft.recentHistory.map((h, i) => (
                          <div
                            key={i}
                            title={h.status}
                            className={cn('w-2 h-2 rounded-full',
                              h.status === 'passed' ? 'bg-[#00FF88]/70' : 'bg-[#FF3366]/70'
                            )}
                          />
                        ))}
                      </div>
                      <span className="shrink-0 text-[11px] font-bold tabular-nums text-amber-400">
                        {Math.round(ft.failRate * 100)}% fail
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-8">
            <div className="glass-card p-10">
              <h3 className="text-2xl font-bold tracking-tight mb-8">Report Configuration</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-6 bg-white/2 border border-white/5 rounded-2xl">
                  <div>
                    <p className="font-medium text-white/80">Dark Mode</p>
                    <p className="text-xs text-white/30 mt-1">Toggle between light and dark themes</p>
                  </div>
                  <div className="w-12 h-6 bg-[#00FF88] rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-6 bg-white/2 border border-white/5 rounded-2xl">
                  <div>
                    <p className="font-medium text-white/80">Auto-Open</p>
                    <p className="text-xs text-white/30 mt-1">Automatically open report after execution</p>
                  </div>
                  <div className="w-12 h-6 bg-white/10 rounded-full relative">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white/20 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-6 bg-white/2 border border-white/5 rounded-2xl">
                  <div>
                    <p className="font-medium text-white/80">Historical Limit</p>
                    <p className="text-xs text-white/30 mt-1">Number of historical runs to preserve</p>
                  </div>
                  <span className="text-sm font-mono text-[#00FF88] font-bold">20 Runs</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-10">
              <h3 className="text-2xl font-bold tracking-tight mb-8">About Phantom</h3>
              <div className="space-y-6 text-sm text-white/40 leading-relaxed">
                <p>Phantom is a modern, historical test reporter for Playwright designed for clarity and performance. Built with a focus on atmospheric design and deep analytics.</p>
                <div className="pt-4 flex gap-4">
                  <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-widest">v1.0.0</span>
                  <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-widest">MIT License</span>
                </div>
              </div>
            </div>

            {/* Quality Gate config — shown only when configured */}
            {reportConfig?.qualityGate && (
              <div className="glass-card p-10">
                <div className="flex items-center gap-3 mb-6">
                  <ShieldCheck size={20} className="text-[#00FF88]" />
                  <h3 className="text-2xl font-bold tracking-tight">Quality Gate</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between p-5 bg-white/2 border border-white/5 rounded-2xl">
                    <div>
                      <p className="font-medium text-white/80">Max Failures</p>
                      <p className="text-xs text-white/30 mt-1">Failures above this threshold block the gate (default: 0)</p>
                    </div>
                    <span className="font-mono text-[#00FF88] font-bold">
                      {reportConfig.qualityGate.maxFailures ?? 0}
                    </span>
                  </div>
                  {reportConfig.qualityGate.minPassRate !== undefined && (
                    <div className="flex items-center justify-between p-5 bg-white/2 border border-white/5 rounded-2xl">
                      <div>
                        <p className="font-medium text-white/80">Min Pass Rate</p>
                        <p className="text-xs text-white/30 mt-1">Pass rate below this value blocks the gate</p>
                      </div>
                      <span className="font-mono text-[#00FF88] font-bold">{reportConfig.qualityGate.minPassRate}%</span>
                    </div>
                  )}
                  {reportConfig.label && (
                    <div className="flex items-center justify-between p-5 bg-white/2 border border-white/5 rounded-2xl">
                      <div>
                        <p className="font-medium text-white/80">Scope Label</p>
                        <p className="text-xs text-white/30 mt-1">Runs are only compared against runs with this label</p>
                      </div>
                      <span className="font-mono text-white/60">{reportConfig.label}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-white/25 leading-relaxed pt-2">
                    Configure via <code className="font-mono bg-white/5 px-1 rounded">qualityGate: {'{'} maxFailures: 0, minPassRate: 80 {'}'}</code> in your playwright.config.ts reporter options.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Test Detail Drawer */}
      <AnimatePresence>
        {selectedTest && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTest(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-[640px] bg-black/80 backdrop-blur-2xl border-l border-white/10 z-[70] shadow-2xl overflow-y-auto"
            >
              <div className="p-10">
                <div className="flex justify-between items-start mb-10">
                  <div className="flex items-center gap-5">
                    {selectedTest.status === 'passed' && <div className="w-4 h-4 rounded-full bg-[#00FF88] shadow-[0_0_15px_rgba(0,255,136,0.6)]" />}
                    {['failed', 'timedOut', 'interrupted'].includes(selectedTest.status) && <div className="w-4 h-4 rounded-full bg-[#FF3366] shadow-[0_0_15px_rgba(255,51,102,0.6)]" />}
                    {selectedTest.status === 'skipped' && <div className="w-4 h-4 rounded-full bg-white/20" />}
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-white">{selectedTest.title}</h3>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 mt-1">{selectedTest.status}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedTest(null)}
                    className="p-2.5 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>

                {/* Stat cards — Duration reflects selected attempt; Retries = total retry count */}
                {(() => {
                  const attempt = selectedTest.retries[selectedAttemptIdx] ?? selectedTest.retries[selectedTest.retries.length - 1];
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-5 mb-10">
                        <div className="p-6 bg-white/2 border border-white/5 rounded-2xl">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2">Duration</p>
                          <p className="font-mono text-xl text-white/80">{(attempt.duration / 1000).toFixed(2)}s</p>
                        </div>
                        <div className="p-6 bg-white/2 border border-white/5 rounded-2xl">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2">Retries</p>
                          <p className="font-mono text-xl text-white/80">{selectedTest.retries.length - 1}</p>
                        </div>
                      </div>

                      {/* Attempt selector — only shown when there are retries */}
                      {selectedTest.retries.length > 1 && (
                        <div className="mb-10">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-3">Attempts</p>
                          <div className="flex gap-2 flex-wrap">
                            {selectedTest.retries.map((a, idx) => {
                              const hasVideo = !!a.artifacts.video;
                              const hasTrace = !!a.artifacts.trace;
                              const hasScreenshots = !!(a.artifacts.screenshots?.length);
                              const hasAny = hasVideo || hasTrace || hasScreenshots;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => setSelectedAttemptIdx(idx)}
                                  className={cn(
                                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-medium transition-all border",
                                    selectedAttemptIdx === idx
                                      ? "bg-white/10 border-white/20 text-white"
                                      : "bg-white/2 border-white/5 text-white/40 hover:bg-white/5 hover:text-white/60"
                                  )}
                                >
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                    a.status === 'passed' ? "bg-[#00FF88]"
                                      : ['failed', 'timedOut', 'interrupted'].includes(a.status) ? "bg-[#FF3366]"
                                      : "bg-white/20"
                                  )} />
                                  <span>{idx === 0 ? 'Attempt 1' : `Retry ${idx}`}</span>
                                  {hasAny && (
                                    <span className="flex items-center gap-0.5 ml-0.5 opacity-60">
                                      {hasVideo && <Video size={10} />}
                                      {hasTrace && <Play size={10} />}
                                      {hasScreenshots && <FileText size={10} />}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {attempt.error && (
                        <div className="mb-10">
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF3366] mb-4">Error Trace</h4>
                          <pre className="p-6 bg-[#FF3366]/5 border border-[#FF3366]/10 rounded-2xl text-[11px] font-mono text-[#FF3366]/80 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            {attempt.error}
                          </pre>
                        </div>
                      )}

                      <div className="mb-10">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-4">Execution Steps</h4>
                        {(() => {
                          const stepFlags = selectedTest && slowest5Ids.has(selectedTest.id)
                            ? getSlowStepFlags(attempt.steps)
                            : attempt.steps.map((_, i) => ({ flagged: false, isWaitKeyword: false, reason: '', index: i }));
                          const hasFlags = stepFlags.some(f => f.flagged);
                          return (
                            <>
                              {hasFlags && (
                                <div className="flex items-start gap-2.5 px-4 py-3 mb-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                                  <Clock size={13} className="text-amber-400/70 mt-0.5 shrink-0" />
                                  <p className="text-[11px] text-amber-400/70 leading-relaxed">
                                    {stepFlags.filter(f => f.flagged && f.isWaitKeyword).length > 0
                                      ? <>Steps with <strong className="text-amber-400">wait / timeout keywords</strong> took longer than expected — consider reducing hardcoded waits or using <code className="font-mono bg-white/5 px-1 rounded">waitForSelector</code> instead of fixed delays.</>
                                      : <>Some steps consumed a disproportionate share of the total duration — check for implicit waits or slow network responses.</>}
                                  </p>
                                </div>
                              )}
                              <div className="space-y-2.5">
                                {attempt.steps.length === 0 && (
                                  <p className="text-sm text-white/20 italic">No steps recorded.</p>
                                )}
                                {attempt.steps.map((step, i) => {
                                  const flag = stepFlags[i];
                                  return (
                                    <div
                                      key={i}
                                      className={cn(
                                        'flex items-center justify-between p-4 rounded-xl group transition-all',
                                        flag.flagged
                                          ? flag.isWaitKeyword
                                            ? 'bg-amber-500/8 border border-amber-500/20 hover:bg-amber-500/12'
                                            : 'bg-white/4 border border-white/10 hover:bg-white/6'
                                          : 'bg-white/2 border border-white/5 hover:bg-white/5'
                                      )}
                                    >
                                      <div className="flex items-center gap-4 min-w-0">
                                        {step.status === 'passed'
                                          ? <CheckCircle2 size={14} className="text-[#00FF88]/60 shrink-0" />
                                          : <XCircle size={14} className="text-[#FF3366]/60 shrink-0" />}
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className={cn(
                                              'text-sm transition-colors',
                                              flag.flagged && flag.isWaitKeyword ? 'text-amber-300/80 group-hover:text-amber-200' : 'text-white/60 group-hover:text-white/80'
                                            )}>{step.title}</span>
                                            {flag.flagged && flag.isWaitKeyword && (
                                              <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25">slow wait</span>
                                            )}
                                            {flag.flagged && !flag.isWaitKeyword && (
                                              <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/6 text-white/30 border border-white/10">slow</span>
                                            )}
                                          </div>
                                          {flag.flagged && flag.reason && (
                                            <p className={cn(
                                              'text-[10px] mt-1 leading-relaxed',
                                              flag.isWaitKeyword ? 'text-amber-400/50' : 'text-white/25'
                                            )}>{flag.reason}</p>
                                          )}
                                        </div>
                                      </div>
                                      <span className={cn(
                                        'text-[10px] font-mono ml-4 shrink-0',
                                        flag.flagged && flag.isWaitKeyword ? 'text-amber-400/60' : 'text-white/20'
                                      )}>{step.duration}ms</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-4">Artifacts</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {attempt.artifacts.video && (
                            <button
                              onClick={() => {
                                const videoUrl = new URL(attempt.artifacts.video!, window.location.href).href;
                                window.open(videoUrl, '_blank');
                              }}
                              className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all group">
                              <Video size={18} className="text-white/40 group-hover:text-white transition-colors" />
                              <span className="text-sm text-white/60 group-hover:text-white transition-colors">Video Recording</span>
                            </button>
                          )}
                          {attempt.artifacts.trace && (
                            <button
                              onClick={() => {
                                const traceAbsUrl = new URL(attempt.artifacts.trace!, window.location.href).href;
                                const traceViewerUrl = `${window.location.protocol}//${window.location.host}/trace-viewer/?trace=${encodeURIComponent(traceAbsUrl)}`;
                                window.open(traceViewerUrl, '_blank');
                              }}
                              className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all group"
                            >
                              <Play size={18} className="text-white/40 group-hover:text-white transition-colors" />
                              <span className="text-sm text-white/60 group-hover:text-white transition-colors">Play Trace</span>
                            </button>
                          )}
                          {!attempt.artifacts.video && !attempt.artifacts.trace && !(attempt.artifacts.screenshots?.length) && (
                            <div className="col-span-2 p-4 bg-white/2 border border-white/5 rounded-xl">
                              {['failed', 'timedOut', 'interrupted'].includes(attempt.status) ? (
                                <p className="text-[11px] text-white/30 leading-relaxed">
                                  No artifacts were captured for this attempt. When using
                                  {' '}<code className="font-mono bg-white/5 px-1 rounded text-white/40">video: 'on-first-retry'</code> or
                                  {' '}<code className="font-mono bg-white/5 px-1 rounded text-white/40">trace: 'on-first-retry'</code>,
                                  Playwright only records artifacts from the{' '}<strong className="text-white/50">first retry onward</strong> — the initial run has none.
                                  Switch to <code className="font-mono bg-white/5 px-1 rounded text-white/40">'retain-on-failure'</code> to capture artifacts for every failed attempt.
                                </p>
                              ) : (
                                <p className="text-[11px] text-white/30">No artifacts — this attempt passed.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
        active ? "text-white" : "text-white/40 hover:text-white/80"
      )}
    >
      {active && (
        <motion.div 
          layoutId="nav-active"
          className="absolute inset-0 bg-white/5 border border-white/10 rounded-2xl"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className={cn("relative z-10 transition-transform duration-300", active ? "scale-110" : "group-hover:scale-110")}>
        {icon}
      </span>
      <span className="relative z-10 font-medium text-sm tracking-tight">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-dot"
          className="absolute right-4 w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.5)]"
        />
      )}
    </button>
  );
}

function StatCard({ label, value, icon, trend, trendInverse }: { label: string, value: string | number, icon: React.ReactNode, trend?: string, trendInverse?: boolean }) {
  const isPositive = trend?.startsWith('+');
  const isGood = trendInverse ? !isPositive : isPositive;

  return (
    <div className="glass-card p-8 group">
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tighter",
            isGood ? "bg-[#00FF88]/10 text-[#00FF88]" : "bg-[#FF3366]/10 text-[#FF3366]"
          )}>
            {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {trend}
          </div>
        )}
      </div>
      <p className="text-4xl font-light tracking-tighter text-white mb-2">{value}</p>
      <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">{label}</p>
    </div>
  );
}

function ProjectDropdown({ value, options, onChange }: {
  value: string;
  options: { key: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allOptions = [{ key: 'all', label: 'All Projects' }, ...options];
  const selected = allOptions.find(o => o.key === value) ?? allOptions[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border',
          'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 hover:text-white',
          open && 'bg-white/10 border-white/20 text-white'
        )}
      >
        <span className="font-mono text-[11px] tracking-wide">{selected.label}</span>
        <ChevronsUpDown size={12} className="text-white/30" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 min-w-[160px] z-50 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-2xl shadow-2xl shadow-black/60 overflow-hidden py-1"
          >
            {allOptions.map(opt => (
              <li key={opt.key}>
                <button
                  type="button"
                  onClick={() => { onChange(opt.key); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-[12px] font-mono tracking-wide transition-colors duration-150',
                    opt.key === value
                      ? 'text-[#00FF88] bg-[#00FF88]/5'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  )}
                >
                  {opt.label}
                  {opt.key === value && <Check size={12} className="shrink-0" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterButton({ children, active, onClick, color }: { children: React.ReactNode, active: boolean, onClick: () => void, color?: string }) {
  return (
    <button 
      type="button"
        onClick={onClick}
      className={cn(
        "px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300",
        active 
          ? "bg-white/10 text-white shadow-xl shadow-white/5 ring-1 ring-white/20" 
          : cn("text-white/20 hover:text-white/40", color?.replace('text-', 'hover:text-'))
      )}
    >
      {children}
    </button>
  );
}
