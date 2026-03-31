# Phantom Report 👻

> A rich, historical Playwright reporter that turns raw test output into an interactive analytics dashboard.

[![npm version](https://img.shields.io/npm/v/@kostasbel01/phantom-report)](https://www.npmjs.com/package/@kostasbel01/phantom-report)
![License](https://img.shields.io/badge/license-MIT-green)
![Playwright](https://img.shields.io/badge/playwright-%3E%3D1.0-blue)

---

## Why Phantom Report?

Playwright ships with a solid built-in HTML reporter. It's good at showing you what happened in **this** run. Phantom Report is designed for teams that need to answer harder questions:

| Question | Built-in reporter | Phantom Report |
|---|:---:|:---:|
| Did this test pass? | ✅ | ✅ |
| Was it passing last week? | ❌ | ✅ |
| Is this test flaky across multiple runs? | ❌ | ✅ |
| Which test suite file has the most failures? | ❌ | ✅ |
| Did this run take longer than the last one? | ❌ | ✅ |
| Which step inside a test is consistently slow? | ❌ | ✅ |
| Did something newly break, or is this a pre-existing failure? | ❌ | ✅ |
| Can I share this report with a stakeholder who has no local setup? | Partial | ✅ |
| Can I view a Playwright trace without running any local command? | ❌ | ✅ |

The built-in report is ephemeral — every run overwrites it. Phantom Report maintains a persistent `history.json` alongside the report and uses it to enrich every subsequent run with trend data, regression detection, and flakiness tracking.

---

## Features

### Dashboard Overview
- **Run health banner** — highlights whether any test newly regressed since the last run, is a pre-existing known failure, or everything is passing.
- **Stat cards** with deltas vs. previous run: Total, Passed, Failed, Skipped, Pass Rate — at a glance you see whether the suite improved or regressed.
- **Duration indicator** with delta — know immediately if your suite is getting slower.
- **CI context chips** — branch name, commit SHA, build number, and environment name are automatically read from CI environment variables and displayed in the header (no configuration required for GitHub Actions, GitLab CI, Azure Pipelines, Buildkite, CircleCI, Jenkins).
- **Clipboard copy button** — one click produces a clean, shareable summary (with ASCII pass-rate bar, failing tests list, flaky tests list) ready to paste into Slack, a PR description, or a Jira ticket.

### Test Results Tab
- Full searchable, filterable test table — filter by status, browser/project, or tag simultaneously.
- **Regression filter** — show only tests that newly broke since the last run (one-click triage).
- **Test detail panel** — click any row to open a side panel with:
  - All attempt tabs (one per retry) with colored status dots.
  - Per-attempt error message, step-by-step breakdown with durations, and artifact links.
  - **Slow step highlighting** — any step ≥ 2.5s on the 5 slowest tests is flagged with an actionable explanation (wait-related vs. general slowness).
  - Artifact viewer: video player, trace link (opens in the built-in trace viewer in `local` mode), screenshot thumbnails — all directly inside the report.

### Test Result Badges

Each test in the results table can carry one or more of the following badges:

| Badge | Meaning |
|---|---|
| 🔴 **Regression** | Was passing in the previous run, now failing — something newly broke it. |
| 🟡 **New** | No history entry for the previous run — first time seen failing. |
| 🟠 **Ongoing** | Was already failing in the previous run — a pre-existing known failure. |
| 🟣 **⚡ Flaky** | Failed on at least one attempt but ultimately passed on a later retry within the same run. |
| 🟡 **↻ N retries** | Test was retried N times before reaching its final result. |

> **Regression vs Ongoing** is the key signal for triage: *Regression* means your recent change likely caused it; *Ongoing* means it was already broken before your change.

### Analytics (Run History) Tab
- **Pass rate trend chart** — area chart across all stored runs, so you can spot long-term degradation at a glance.
- **Per-project breakdown** — stacked bar chart comparing each browser/project's pass/fail counts per run.
- **Results by file** — ranked table of spec files, each showing passed/failed/skipped counts and deltas vs. the previous run.
- **Tag Health** — if you use Playwright tags (e.g. `@smoke`, `@checkout`), this section shows the pass rate per tag group, making it easy to see whether a specific user journey is stable.
- **Flaky tests panel** — built from cross-run history: any test that has appeared as both passed and failed in the last 10 runs (with ≥3 data points) is surfaced here with its fail rate and a sparkline of recent results.
- **Slowest Executions** — top 5 longest-running tests, clickable to jump to the detail panel. Inline badges flag slow wait steps.

### Settings Tab
- Displays the current reporter configuration as used at runtime, so you can always check what `outputFolder`, `server` mode, history settings, and quality gate thresholds are active.

---

## Installation

```bash
npm install @kostasbel01/phantom-report --save-dev
```

---

## Quick Start

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['@kostasbel01/phantom-report', {
      outputFolder: 'phantom-report',
    }]
  ],
  use: {
    video: 'on-first-retry',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

Run your tests as normal:

```bash
npx playwright test
```

The report opens automatically in your browser when any test fails. On a clean run it is generated but not opened.

---

## Automatic History Isolation For Different Runs

Phantom Report does more than store history. It also tries to keep the right runs grouped together automatically.

If you do not set a custom `label` and you do not force a fixed `history.filePath`, the reporter derives a stable run identity from what actually ran:

- On CI, it uses the workflow/job identity exposed by the platform.
- Locally, it uses the active Playwright projects plus the file scope that ran.

That means these commands naturally build separate histories instead of polluting one another:

```bash
npx playwright test
npx playwright test tests/smoke
npx playwright test tests/checkout/cart.spec.ts
npx playwright test --project=chromium
npx playwright test --project=firefox
```

Examples of what this gives you:

- Full-suite runs stay separate from partial folder runs.
- Chromium-only runs stay separate from Firefox-only runs.
- A single-spec debugging run does not distort the trends for your main suite.

This is a meaningful advantage over a plain overwritten HTML report because your historical charts, flaky detection, and run-to-run deltas stay comparable instead of mixing unrelated executions together.

If you want full control, set `label` yourself. If you explicitly set `history.filePath`, that path is used as-is and the automatic per-scope history split is bypassed.

---

## Configuration

All options are optional. Phantom Report works with zero configuration.

```typescript
['@kostasbel01/phantom-report', {
  outputFolder: 'phantom-report',
  label: 'smoke',
  open: 'on-failure',
  server: 'local',
  history: {
    enabled: true,
    retention: 30,
    filePath: 'phantom-report/history.json',
  },
  qualityGate: {
    maxFailures: 0,
    minPassRate: 95,
  },
  artifacts: {
    video: true,
    screenshots: false,
    trace: false,
  },
}]
```

### Full Option Reference

#### `outputFolder` · `string` · default: `'test-output'`

Directory where the report HTML and (optionally) artifact copies are written. The previous run's `index.html` and `artifacts/` folder are automatically deleted at the start of each run so stale files never linger. The `history.json` file is **not** deleted — it accumulates across runs.

---

#### `label` · `string` · optional

A short name identifying this CI workflow or test scope, e.g. `'smoke'`, `'regression'`, `'checkout'`.

When you have multiple Playwright workflows running different subsets of your suite (e.g. a smoke suite on every commit and a full regression suite nightly), their history entries would otherwise be mixed together and produce misleading trend deltas. Setting a unique `label` per workflow isolates each workflow's history so comparisons are always apples-to-apples.

You don't need to set this on CI — Phantom Report reads the workflow/job name from your CI platform automatically (GitHub Actions, GitLab CI, Azure Pipelines, Buildkite, CircleCI, Jenkins are all supported). `label` is mainly useful for local disambiguation or when running in an unsupported CI environment.

---

#### `open` · `'always' | 'on-failure' | 'never'` · default: `'on-failure'`

Controls when the report opens in the browser after tests complete.

| Value | Behaviour |
|---|---|
| `'always'` | Opens after every run. |
| `'on-failure'` | Opens only when at least one test failed (default). |
| `'never'` | Never opens automatically — useful in CI environments where you upload the artifact instead. |

---

#### `server` · `'local' | 'static'` · default: `'local'`

Controls how the report is served when it opens.

| Value | Behaviour |
|---|---|
| `'local'` | Starts a local HTTP server on a random port. Enables the built-in offline Playwright trace viewer — traces are viewed entirely on your machine without any external requests. Artifact paths are resolved relative to the output directory; no files are copied. |
| `'static'` | Opens the HTML file directly via `file://`. No server is started. Use this for CI workflows where you upload the report folder as an artifact and want it to be viewable as a static site. Control which artifact types are copied into the folder using the `artifacts` options below. |

> **Trace viewer note:** The interactive trace viewer (the same viewer shipped with Playwright) is only available in `local` mode. In `static` mode, trace `.zip` files can be copied alongside the report and opened manually with `npx playwright show-trace`.

Recommended usage:

- Prefer `server: 'local'` for day-to-day development, debugging failures, watching videos, and opening traces directly from the report. This is the best default for engineers working on a machine with the original test artifacts available.
- Prefer `server: 'static'` for CI artifact publishing, long-term archive folders, or any setup where the report needs to be moved, uploaded, or opened later without access to the original Playwright `test-results` directory.

In short: `local` is the richer interactive debugging experience; `static` is the more portable sharing and artifact-storage mode.

---

#### `history.enabled` · `boolean` · default: `true`

Whether to read and write the history file. Disable this if you only need a single-run snapshot report.

---

#### `history.retention` · `number` · default: `30`

Number of days to retain run history. Runs older than this are pruned from `history.json` each time a new run completes.

---

#### `history.filePath` · `string` · default: auto-derived

Path to the JSON file used to store cross-run history. This file should be committed to source control or cached in CI between runs — it is what powers all trend, flakiness, and regression data.

If not set, the path is automatically derived from `outputFolder` and the effective `label`:
- Single workflow: `{outputFolder}/history.json`
- Multiple labelled workflows: `{outputFolder}/history-{label}.json`

This means you can have separate history files per workflow without any configuration.

---

#### `qualityGate` · optional

Thresholds used to determine the health banner on the Overview tab. All thresholds are optional; the defaults are intentionally strict.

```typescript
qualityGate: {
  maxFailures: 0,      // Maximum failures that still show "passing" (default: 0)
  minPassRate: 95,     // Minimum pass rate % required (default: not enforced)
}
```

| Verdict | Condition |
|---|---|
| **All tests passing** | Zero failures and pass rate ≥ `minPassRate` |
| **Known failures present** | Failures exist but all were already failing in the previous run, and total failures ≤ `maxFailures` |
| **Tests need attention** | At least one test newly broke since the last run, or pass rate fell below `minPassRate` |

The "Tests need attention" card lists newly broken tests with their titles, error message preview, and file location. A button links directly to the filtered test results.

---

#### `artifacts.video` · `boolean` · default: `true` *(static mode only)*
#### `artifacts.screenshots` · `boolean` · default: `false` *(static mode only)*
#### `artifacts.trace` · `boolean` · default: `false` *(static mode only)*

In `static` mode, controls which artifact types are copied from Playwright's `test-results/` directory into `{outputFolder}/artifacts/`. Artifacts are **only copied for failed attempts** — there is no value in retaining videos or screenshots for tests that passed.

In `local` mode these options are ignored — artifacts are streamed from their original paths by the local HTTP server with no duplication.

---

## CI/CD Integration

The `history.json` file is what makes Phantom Report valuable across multiple runs. You need to persist it between CI runs.

### GitHub Actions

```yaml
- name: Run Playwright tests
  run: npx playwright test

- name: Upload Phantom Report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: phantom-report
    path: phantom-report/
    retention-days: 30
```

To persist history between runs using the Actions cache:

```yaml
- name: Restore test history
  uses: actions/cache@v4
  with:
    path: phantom-report/history.json
    key: phantom-history-${{ github.ref_name }}
    restore-keys: |
      phantom-history-

- name: Run Playwright tests
  run: npx playwright test

- name: Save test history
  uses: actions/cache@v4
  with:
    path: phantom-report/history.json
    key: phantom-history-${{ github.ref_name }}
```

### Multiple Workflows

If you have both a smoke suite and a full regression suite, give each a distinct label so their history is kept separate:

```typescript
// playwright.smoke.config.ts
['@kostasbel01/phantom-report', { outputFolder: 'phantom-report', label: 'smoke' }]

// playwright.regression.config.ts
['@kostasbel01/phantom-report', { outputFolder: 'phantom-report', label: 'regression' }]
```

This generates `phantom-report/history-smoke.json` and `phantom-report/history-regression.json` automatically, with no additional configuration.

### Different Local CLI Runs

You can also benefit from history isolation without creating separate config files.

For example, these commands produce distinct run scopes automatically:

```bash
npx playwright test tests/smoke
npx playwright test tests/regression
npx playwright test apps/checkout
npx playwright test --project=chromium
```

Phantom Report uses the active project list and the common file scope of the executed specs to derive a unique history label for the run. That keeps local exploratory runs, targeted folder runs, and browser-specific runs from skewing your primary suite trends.

If you want those runs to share history instead, set the same explicit `label` or the same explicit `history.filePath`.

---

## Retry Handling

When Playwright retries a test, Phantom Report groups all attempts under a single row rather than creating duplicate rows (which is what the built-in reporter does). Each attempt is available as a tab in the detail panel so you can compare what changed between the first failure and the eventual pass or final failure.

Artifacts (video, trace, screenshots) are attached per-attempt, so if you use `video: 'on-first-retry'` or `trace: 'on-first-retry'`, the artifact appears on the retry attempt tab where it was captured.

A **⚡ Flaky** badge is shown on tests that failed at least once but ultimately passed — these tests deserve attention even though they don't appear in the failure count.

---

## License

MIT — see [LICENSE](./LICENSE).

