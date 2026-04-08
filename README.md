# Phantom Report 👻

> A rich, historical Playwright reporter that turns raw test output into an interactive analytics dashboard — delivered as a single, self-contained HTML file.

[![npm version](https://img.shields.io/npm/v/@kostasbel01/phantom-report)](https://www.npmjs.com/package/@kostasbel01/phantom-report)
[![npm downloads](https://img.shields.io/npm/dm/@kostasbel01/phantom-report)](https://www.npmjs.com/package/@kostasbel01/phantom-report)
![License](https://img.shields.io/badge/license-MIT-green)
![Playwright](https://img.shields.io/badge/playwright-%3E%3D1.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

---

## Table of Contents

- [Why Phantom Report?](#why-phantom-report)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration Reference](#configuration-reference)
- [How History Works](#how-history-works)
- [CI/CD Integration](#cicd-integration)
- [Retry Handling](#retry-handling)
- [License](#license)

---



## Why Phantom Report?

Playwright's built-in HTML reporter is excellent at showing you what happened **this run**. Phantom Report is built for teams that need to answer harder questions over time.

| Question | Built-in reporter | Phantom Report |
|---|:---:|:---:|
| Did this test pass? | ✅ | ✅ |
| Was it passing last week? | ❌ | ✅ |
| Is this test flaky across multiple runs? | ❌ | ✅ |
| Which test file has the most failures? | ❌ | ✅ |
| Did this run take longer than the last one? | ❌ | ✅ |
| Which step inside a test is consistently slow? | ❌ | ✅ |
| Did something newly break, or is this a pre-existing failure? | ❌ | ✅ |
| Can I share this with a stakeholder who has no local setup? | Partial | ✅ |
| Can I view a Playwright trace without running any command? | ❌ | ✅ |

The built-in report is ephemeral — every run overwrites it. Phantom Report maintains a `history.json` file alongside each report and uses it to enrich every subsequent run with trend data, regression detection, and flakiness tracking.

---
## What does it look like?

![report-view](./assets/phantomReport-demo.gif)

---

## Features

### Overview Tab

- **Health banner** — immediately communicates whether the suite is clean, has pre-existing failures, or something newly regressed. The "Tests need attention" state lists every newly broken test with its error preview and a direct link to the filtered results.
- **Stat cards with deltas** — Total, Passed, Failed, Skipped, and Pass Rate each show how the current run compares to the previous one at a glance.
- **Duration indicator** — total run time with a ▲/▼ delta vs. the previous run so you can see if the suite is getting slower.
- **CI context chips** — branch name, commit SHA, build number, and environment are automatically read from your CI platform (no configuration required). Supported: GitHub Actions, GitLab CI, Azure Pipelines, Buildkite, CircleCI, Jenkins.
- **Clipboard summary** — one click produces a shareable text summary (with ASCII pass-rate bar, failing tests, flaky tests) ready to paste into Slack, a PR description, or a Jira comment.
- **Quality gate verdict** — configurable pass/fail thresholds surfaced on the banner, giving stakeholders a clear release-readiness signal.

### Test Results Tab

- **Searchable, filterable test table** — filter simultaneously by status, browser/project, and tag without leaving the page.
- **Regression filter** — one click to show only tests that newly broke since the last run. The fastest way to triage a CI failure.
- **Test badges** — at-a-glance signal on every row:

  | Badge | Meaning |
  |---|---|
  | 🔴 **Regression** | Was passing last run, now failing — your recent change likely caused it. |
  | 🟡 **New** | No history for this test in the previous run — first time seen failing. |
  | 🟠 **Ongoing** | Was already failing last run — a pre-existing known failure. |
  | ⚡ **Flaky** | Failed at least once but ultimately passed on a later retry within this run. |
  | **↻ N** | Test was retried N times before its final result. |

  > The **Regression vs Ongoing** distinction is the key triage signal. *Regression* means investigate your recent change; *Ongoing* means this was broken before your change.

- **Test detail panel** — click any row to open a panel with:
  - Attempt tabs (one per retry) with colored status indicators.
  - Per-attempt error message and full step-by-step breakdown with durations.
  - **Slow step highlighting** — the 5 slowest tests have any step ≥ 2.5 s flagged with context explaining whether it is a wait-related pause or general slowness.
  - Inline artifact viewer: video player, screenshot thumbnails, and trace link — all without leaving the report.

### Analytics Tab

All charts are **automatically scoped** to the current execution type. If your last run used `chromium+firefox` on `tests/checkout`, the charts only show history from other runs that match that same scope. Single-spec debug sessions or different-project runs will not distort your trend lines. The active scope label is displayed next to each chart title so you always know which run group you are looking at.

- **Pass rate trend** — line chart over matching historical runs with a trend badge (↑ Improving / ↓ Declining / → Stable) computed from the last 5 comparable runs.
- **Execution duration** — bar chart of run durations across the same scope; immediately reveals suite slowdowns.
- **Test volume** — area chart of total test counts per run; useful for catching when tests are accidentally skipped or excluded.
- **Per-project breakdown** — stacked bar chart comparing each browser/project's pass/fail counts per run.
- **Results by file** — ranked table of spec files showing passed/failed/skipped counts and deltas vs. last run.
- **Tag health** — if you use Playwright tags (`@smoke`, `@checkout`, etc.) this section shows pass rate per tag group, letting you see at a glance whether a specific user journey is stable.
- **Flaky tests panel** — any test that has appeared as both passed and failed in the last 10 comparable runs (with ≥ 3 data points) is surfaced here with its failure rate and a sparkline of recent results.
- **Slowest executions** — top 5 longest-running tests, clickable to jump directly to their detail panel.

### Settings Tab

Displays the reporter configuration that was active at runtime — `outputFolder`, `server` mode, history settings, and quality gate thresholds — so you can always verify what options were in effect for a given report.

---

## Installation

```bash
npm install @kostasbel01/phantom-report --save-dev
```

**Peer dependency:** `@playwright/test >= 1.0.0`

---

## Quick Start

Add the reporter to your `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: 1, // recommended — enables video/trace capture on first retry

  reporter: [
    ['list'],                                    // keep readable terminal output
    ['@kostasbel01/phantom-report', {
      outputFolder: 'phantom-report',            // where to write the report
      open: 'on-failure',                        // auto-open when tests fail
      server: 'local',                           // serves with built-in trace viewer
      history: {
        enabled: true,
        retention: 30,                           // prune runs older than 30 days
      },
      artifacts: {
        video: true,
        screenshots: false,
        trace: false,
      },
    }],
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

The report opens automatically when any test fails. It is a **single self-contained HTML file** — you can share it by email or upload it as a CI artifact and it requires no server to view.

> **Tip:** Pairing with the `list` reporter keeps your terminal output readable during the run while Phantom Report handles the rich HTML dashboard.

---

## Configuration Reference

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

---

### `outputFolder` · `string` · default: `'test-output'`

Directory where the report HTML and (optionally) artifact copies are written.

At the start of each run the previous `index.html` and `artifacts/` folder are automatically deleted so stale files never linger. The `history.json` file is **never** deleted — it accumulates across runs and is the source of all trend and regression data.

---

### `label` · `string` · optional

A short name that identifies this CI workflow or test scope, e.g. `'smoke'`, `'regression'`, `'checkout'`.

When you run multiple Playwright workflows (a smoke suite on every commit, a full regression suite nightly), their history entries would otherwise mix together and produce misleading trends. Setting a distinct `label` per workflow keeps their histories isolated so comparisons are always apples-to-apples.

You generally do **not** need to set this on a supported CI platform — Phantom Report reads the workflow/job name automatically. `label` is mainly useful for local disambiguation or unsupported CI environments.

---

### `open` · `'always' | 'on-failure' | 'never'` · default: `'on-failure'`

Controls when the report opens in the browser after the run completes.

| Value | Behaviour |
|---|---|
| `'always'` | Opens after every run, pass or fail. |
| `'on-failure'` | Opens only when at least one test failed. |
| `'never'` | Never opens automatically — recommended for CI where you upload the artifact. |

---

### `server` · `'local' | 'static'` · default: `'local'`

Controls how the report is served when it opens.

| Value | Behaviour |
|---|---|
| `'local'` | Starts a local HTTP server on a random port. Enables the full **offline Playwright trace viewer** — traces open entirely on your machine with no external requests. Artifacts are served from their original paths; no files are copied. |
| `'static'` | Opens the HTML file directly via `file://`. No server is started. Use this when uploading the report folder as a CI artifact. Control which artifact types are copied with the `artifacts` options below. |

> **Trace viewer:** The interactive trace viewer is only available in `local` mode. In `static` mode, trace `.zip` files can still be viewed manually with `npx playwright show-trace`.

**When to use each:**

- `local` — day-to-day development, debugging failures, watching videos, opening traces directly from the report. Best when the original Playwright `test-results/` directory is available on the same machine.
- `static` — CI artifact publishing, long-term archiving, or any setup where the report needs to be moved, uploaded, or opened later without access to the original test artifacts.

---

### `history.enabled` · `boolean` · default: `true`

Whether to read and write the history file. Set to `false` if you only need a single-run snapshot report with no trend data.

---

### `history.retention` · `number` · default: `30`

Number of days to keep run history. Runs older than this threshold are pruned from `history.json` each time a new run completes.

---

### `history.filePath` · `string` · default: auto-derived

Path to the JSON file used to store cross-run history. **This file should be committed to source control or cached in CI between runs** — it is what powers all trend, flakiness, and regression features.

If not set, the path is automatically derived:

| Scenario | Derived path |
|---|---|
| No `label` configured | `{outputFolder}/history.json` |
| `label` is set | `{outputFolder}/history-{label}.json` |

Multiple labelled workflows in the same repo naturally produce separate history files with no extra configuration.

---

### `qualityGate` · optional

Thresholds that determine the health verdict shown on the Overview tab banner.

```typescript
qualityGate: {
  maxFailures: 0,   // max failures that still yields a "passing" verdict (default: 0)
  minPassRate: 95,  // minimum pass rate % required (default: not enforced)
}
```

| Verdict | Condition |
|---|---|
| **All tests passing** | Zero failures and pass rate ≥ `minPassRate` (if set). |
| **Known failures present** | Failures exist but all were also failing last run, and total failures ≤ `maxFailures`. |
| **Tests need attention** | At least one test newly regressed since last run, or pass rate dropped below `minPassRate`. |

---

### `artifacts.video` · `boolean` · default: `true`
### `artifacts.screenshots` · `boolean` · default: `false`
### `artifacts.trace` · `boolean` · default: `false`

In `static` mode, controls which artifact types are copied from Playwright's `test-results/` directory into `{outputFolder}/artifacts/`. Only artifacts from **failed attempts** are copied — there is no value in retaining recordings for tests that passed.

These options have no effect in `local` mode — all artifacts are served directly from their original paths.

---

## How History Works

### The history file

After every run, Phantom Report appends a run entry and updated per-test history to `history.json`. The file accumulates over time and is what makes each subsequent run richer than the last. At a minimum, check this file into source control or cache it in CI so it survives between workflow runs.

### Automatic run isolation

Phantom Report automatically groups runs into comparable scopes so your charts and deltas are always meaningful.

**On CI**, the scope is derived from the platform's workflow/job identity (GitHub Actions `GITHUB_WORKFLOW`, GitLab `CI_JOB_NAME`, Azure Pipelines `BUILD_DEFINITIONNAME`, etc.).

**Locally**, without a `label`, the scope is derived from what actually ran: the active Playwright projects plus the common directory prefix of the executed spec files. These commands naturally produce separate, non-interfering history groups:

```bash
npx playwright test                               # full suite
npx playwright test tests/smoke                  # smoke folder only
npx playwright test tests/checkout/cart.spec.ts  # single spec
npx playwright test --project=chromium           # chromium only
npx playwright test --project=firefox            # firefox only
```

A single-spec debugging session will not distort the trends for your full suite. A chromium-only run will not skew a cross-browser duration chart.

**To merge all runs into one history**, set an explicit `history.filePath`. All commands writing to the same file will be treated as one comparable group.

---

## CI/CD Integration

You need to persist `history.json` between CI runs so trend data accumulates across workflow executions.

### GitHub Actions

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Restore test history
        uses: actions/cache@v4
        with:
          path: phantom-report/history.json
          key: phantom-history-${{ github.ref_name }}
          restore-keys: |
            phantom-history-

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

> The cache `key` includes `${{ github.ref_name }}` so each branch maintains its own isolated history. The `restore-keys` fallback lets a new branch inherit the most recent history from any branch rather than starting cold.

### GitLab CI

```yaml
test:
  script:
    - npm ci
    - npx playwright install --with-deps
    - npx playwright test
  cache:
    key: phantom-history-$CI_COMMIT_REF_SLUG
    paths:
      - phantom-report/history.json
  artifacts:
    when: always
    paths:
      - phantom-report/
    expire_in: 30 days
```

### Azure Pipelines

```yaml
- task: Cache@2
  inputs:
    key: 'phantom-history | "$(Build.SourceBranchName)"'
    path: phantom-report/history.json
  displayName: Restore test history

- script: npx playwright test
  displayName: Run Playwright tests

- task: PublishBuildArtifacts@1
  condition: always()
  inputs:
    PathtoPublish: phantom-report
    ArtifactName: phantom-report
```

### Multiple workflows in the same repo

Give each workflow a distinct `label` so their histories stay separate:

```typescript
// playwright.smoke.config.ts
['@kostasbel01/phantom-report', { outputFolder: 'phantom-report', label: 'smoke' }]
//   → writes phantom-report/history-smoke.json

// playwright.regression.config.ts
['@kostasbel01/phantom-report', { outputFolder: 'phantom-report', label: 'regression' }]
//   → writes phantom-report/history-regression.json
```

Cache each file separately so the two workflows do not overwrite each other's history:

```yaml
# In your smoke workflow:
- uses: actions/cache@v4
  with:
    path: phantom-report/history-smoke.json
    key: phantom-history-smoke-${{ github.ref_name }}

# In your regression workflow:
- uses: actions/cache@v4
  with:
    path: phantom-report/history-regression.json
    key: phantom-history-regression-${{ github.ref_name }}
```

---

## Retry Handling

When Playwright retries a test, Phantom Report groups all attempts under a single row rather than creating duplicate entries. Each attempt is available as a tab in the detail panel so you can compare what changed between the first failure and the eventual pass or final failure.

Artifacts (video, trace, screenshots) are attached per-attempt. If you configure `video: 'on-first-retry'` or `trace: 'on-first-retry'`, the artifact appears on the retry tab where it was captured.

A **⚡ Flaky** badge is shown on tests that failed at least once but ultimately passed. These tests do not appear in the failure count but are silent reliability risks — they should be investigated before they become consistent failures.

---

## License

MIT — see [LICENSE](./LICENSE).

---

<p align="center">
  <a href="https://www.npmjs.com/package/@kostasbel01/phantom-report">npm</a> ·
  <a href="https://github.com/kostas-01/phantom-report/issues">Issues</a> ·
  <a href="https://github.com/kostas-01/phantom-report">GitHub</a>
</p>