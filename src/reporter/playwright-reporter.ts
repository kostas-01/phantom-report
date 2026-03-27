/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { Reporter, FullConfig, Suite, TestCase, TestResult as PlaywrightTestResult, FullResult } from '@playwright/test/reporter';
import { TestResult, RunMetadata, ReportConfig, HistoricalData } from '../types';
import { mergeHistory } from '../core/history';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Polyfill for __dirname and __filename in ESM, or use globals in CJS
const _filename = typeof __filename !== 'undefined' 
  ? __filename 
  : fileURLToPath(import.meta.url);
const _dirname = typeof __dirname !== 'undefined' 
  ? __dirname 
  : path.dirname(_filename);

/**
 * Playwright Advanced Reporter.
 * This is the main class that implements the Playwright Reporter interface.
 */
export default class PlaywrightAdvancedReporter implements Reporter {
  private config: ReportConfig;
  private results: TestResult[] = [];
  private startTime: Date;

  constructor(options: any = {}) {
    // Default configuration
    this.config = {
      outputFolder: options.outputFolder || 'test-output',
      history: {
        enabled: options.history?.enabled ?? true,
        filePath: options.history?.filePath || 'test-output/history.json',
        retention: parseInt(options.history?.retention || '30') || 30,
      },
      open: options.open || 'on-failure',
    };

    this.startTime = new Date();
  }

  onBegin(config: FullConfig, suite: Suite) {
    console.log(`Starting Phantom Report at ${this.startTime.toISOString()}`);
  }

  onTestEnd(test: TestCase, result: PlaywrightTestResult) {
    const testResult: TestResult = {
      id: `${test.title}-${test.tags.join('-')}`,
      title: test.title,
      file: test.location.file,
      line: test.location.line,
      column: test.location.column,
      tags: test.tags,
      browser: test.annotations.find(a => a.type === 'browser')?.description || 'unknown',
      duration: result.duration,
      status: result.status as any,
      startTime: result.startTime.toISOString(),
      retry: result.retry,
      error: result.error?.message,
      steps: result.steps.map(step => ({
        title: step.title,
        duration: step.duration,
        status: step.error ? 'failed' : 'passed',
        error: step.error?.message,
      })),
      artifacts: {
        video: result.attachments.find(a => a.name === 'video')?.path,
        trace: result.attachments.find(a => a.name === 'trace')?.path,
        screenshots: result.attachments.filter(a => a.name === 'screenshot').map(a => a.path as string),
      },
    };

    this.results.push(testResult);
  }

  async onEnd(result: FullResult) {
    const duration = Date.now() - this.startTime.getTime();
    const runMetadata: RunMetadata = {
      id: `run-${Date.now()}`,
      startTime: this.startTime.toISOString(),
      duration,
      totalTests: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed').length,
      skipped: this.results.filter(r => r.status === 'skipped').length,
    };

    // 1. Read the bundled UI template
    const possibleTemplatePaths = [
      path.resolve(_dirname, 'ui/index.html'), // Relative to dist/reporter.js
      path.resolve(_dirname, '../ui/index.html'), // In case it's in dist/ui but reporter is in dist
      path.resolve(_dirname, '../../dist/ui/index.html'), // Relative to src/reporter/playwright-reporter.ts
      path.resolve(process.cwd(), 'dist/ui/index.html'), // Relative to project root
    ];
    
    let templatePath = '';
    for (const p of possibleTemplatePaths) {
      if (fs.existsSync(p)) {
        templatePath = p;
        break;
      }
    }

    let html = '';
    if (templatePath) {
      html = fs.readFileSync(templatePath, 'utf8');
    } else {
      // Fallback with helpful error message
      html = `<!DOCTYPE html>
<html>
<head>
  <title>Phantom Report - Error</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
    .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 500px; border: 1px solid #e2e8f0; }
    h1 { color: #ef4444; margin-top: 0; }
    code { background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
    ul { padding-left: 1.5rem; color: #475569; }
    li { margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>UI Template Not Found</h1>
    <p>The reporter successfully collected your test data, but it couldn't find the dashboard UI template.</p>
    <p><strong>Searched paths:</strong></p>
    <ul>
      ${possibleTemplatePaths.map(p => `<li><code>${p}</code></li>`).join('')}
    </ul>
    <p><strong>How to fix:</strong></p>
    <ul>
      <li>Ensure you have run <code>npm run build</code> in the reporter project.</li>
      <li>Make sure the <code>dist/ui</code> folder exists and contains <code>index.html</code>.</li>
    </ul>
  </div>
  <script>window.playwrightData = "DATA_PLACEHOLDER";</script>
</body>
</html>`;
    }

    // 2. Load and merge history
    let history: HistoricalData = { runs: [], tests: {} };
    if (this.config.history.enabled) {
      try {
        const historyPath = path.resolve(process.cwd(), this.config.history.filePath);
        if (fs.existsSync(historyPath)) {
          const rawHistory = fs.readFileSync(historyPath, 'utf8');
          history = JSON.parse(rawHistory);
        }
        
        console.log(`Pushing historical data to ${this.config.history.filePath}`);
        history = mergeHistory(history, runMetadata, this.results, this.config.history.retention);
        
        // Save updated history
        const historyDir = path.dirname(historyPath);
        if (!fs.existsSync(historyDir)) {
          fs.mkdirSync(historyDir, { recursive: true });
        }
        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
      } catch (error) {
        console.error('Failed to process history:', error);
      }
    }

    // 3. Inject data into HTML
    const reportData = {
      history,
      results: this.results,
    };
    
    const finalHtml = html.replace(/"DATA_PLACEHOLDER"/g, JSON.stringify(reportData));

    // 4. Write final report
    const outputDir = path.resolve(process.cwd(), this.config.outputFolder);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const reportPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(reportPath, finalHtml);

    // 5. Copy assets if they exist
    const assetsDir = templatePath ? path.join(path.dirname(templatePath), 'assets') : '';
    if (assetsDir && fs.existsSync(assetsDir)) {
      const destAssetsDir = path.join(outputDir, 'assets');
      if (!fs.existsSync(destAssetsDir)) {
        fs.mkdirSync(destAssetsDir, { recursive: true });
      }
      
      const files = fs.readdirSync(assetsDir);
      for (const file of files) {
        fs.copyFileSync(path.join(assetsDir, file), path.join(destAssetsDir, file));
      }
    }

    console.log('Phantom Report generated successfully.');
  }
}
