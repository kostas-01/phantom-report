# Phantom Report 👻

> A modern, historical test reporter for Playwright with a standalone HTML dashboard.

![Test Status](https://img.shields.io/badge/tests-passing-brightgreen)
![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 Purpose

**Phantom Report** is designed to provide Playwright users with a deep, historical understanding of their test suite's health. Unlike standard reporters that only show the results of the current run, Phantom Report tracks every test's performance and stability over time, helping teams identify flakiness, performance regressions, and long-term trends.

The generated report is a **single, standalone HTML file** that requires no local server or external dependencies, making it perfect for sharing via email, Slack, or hosting on static site providers like GitHub Pages or S3.

## ✨ Key Features

- 📊 **Historical Analytics**: View pass rates, execution times, and stability scores across multiple test runs.
- 📈 **Flaky Test Detection**: Automatically identifies tests that exhibit inconsistent behavior over time.
- ⚡ **Performance Insights**: Quickly pinpoint the slowest tests in your suite and track their duration trends.
- 📦 **Standalone HTML**: Generates a single-file dashboard with all data and assets inlined for easy sharing.
- 🎥 **Artifact Integration**: Seamlessly view videos, traces, and screenshots directly within the report.
- 🛠️ **CLI Utility**: Manage your reports and history files with a dedicated command-line interface.
- 🎨 **Modern UI**: A responsive, interactive dashboard built with React, Tailwind CSS, and custom animated components.

## 🚀 Installation

```bash
npm install phantom-report --save-dev
```

## 🛠️ Usage

### 1. Configure Playwright

Add `phantom-report` to the `reporter` section of your `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['phantom-report', {
      outputFolder: 'phantom-report',
      history: {
        enabled: true,
        retention: 30, // Keep 30 days of history
        filePath: 'phantom-report/history.json'
      },
      open: 'on-failure'
    }]
  ],
  use: {
    // Recommended for rich reports
    video: 'on-first-retry',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

### 2. Run Your Tests

```bash
npx playwright test
```

### 3. View the Report

After the tests complete, the report will be generated in your specified `outputFolder`. You can open it directly in your browser or use the CLI:

```bash
npx phantom-report open --path phantom-report/index.html
```

## 💻 CLI Commands

Phantom Report includes a CLI for common tasks:

- `npx phantom-report open`: Opens the generated report in your default browser.
- `npx phantom-report generate`: Generates a report from existing JSON or JUnit XML files (useful for merging results from multiple machines).

## ⚙️ Configuration Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `outputFolder` | `string` | `'test-output'` | The directory where the HTML report will be saved. |
| `history.enabled` | `boolean` | `true` | Whether to track historical data across runs. |
| `history.retention` | `number` | `30` | Number of days to retain historical data in the history file. |
| `history.filePath` | `string` | `'test-output/history.json'` | Path to the JSON file where history is stored. |
| `open` | `string` | `'on-failure'` | When to automatically open the report (`'always'`, `'never'`, `'on-failure'`). |

## 🔄 CI/CD Integration

Phantom Report is built for CI/CD. To maintain history across builds, ensure you cache or persist the `history.json` file.

### GitHub Actions Example

```yaml
- name: Run Playwright tests
  run: npx playwright test

- name: Upload Phantom Report
  uses: actions/upload-artifact@v4
  with:
    name: phantom-report
    path: phantom-report/
    retention-days: 30
```

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues or pull requests to help improve Phantom Report.

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.

---

**Phantom Report** - Bringing clarity and history to your Playwright tests. 👻
