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
    const project = test.parent.project()?.name || 'default';
    const testResult: TestResult = {
      id: `${project}-${test.title}-${test.tags.join('-')}-r${result.retry}`,
      title: test.title,
      file: test.location.file,
      line: test.location.line,
      column: test.location.column,
      tags: test.tags,
      browser: test.annotations.find(a => a.type === 'browser')?.description || 'unknown',
      project,
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
        trace: result.attachments.find(a => a.name === 'trace' || a.name?.toLowerCase().includes('trace'))?.path,
        screenshots: result.attachments
          .filter(a => a.name === 'screenshot' || a.contentType?.startsWith('image/'))
          .map(a => a.path)
          .filter(Boolean) as string[],
      },
    };

    this.results.push(testResult);
  }

  async onEnd(result: FullResult) {
    const duration = Date.now() - this.startTime.getTime();
    
    const projects: Record<string, { passed: number, failed: number, skipped: number }> = {};
    this.results.forEach(r => {
      if (!projects[r.project]) {
        projects[r.project] = { passed: 0, failed: 0, skipped: 0 };
      }
      if (r.status === 'passed') projects[r.project].passed++;
      else if (['failed', 'timedOut', 'interrupted'].includes(r.status)) projects[r.project].failed++;
      else projects[r.project].skipped++;
    });

    const runMetadata: RunMetadata = {
      id: `run-${Date.now()}`,
      startTime: this.startTime.toISOString(),
      duration,
      totalTests: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => ['failed', 'timedOut', 'interrupted'].includes(r.status)).length,
      skipped: this.results.filter(r => r.status === 'skipped').length,
      projects,
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

    // 3. Copy artifacts and update paths
    const outputDir = path.resolve(process.cwd(), this.config.outputFolder);
    const artifactsDestDir = path.join(outputDir, 'artifacts');
    
    if (!fs.existsSync(artifactsDestDir)) {
      fs.mkdirSync(artifactsDestDir, { recursive: true });
    }

    const sanitize = (name: string) => name.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 50);

    console.log(`\n[Phantom Reporter] Processing ${this.results.length} test results...`);
    this.results.forEach(test => {
      const safeId = sanitize(test.id);
      
      if (test.artifacts.trace || test.artifacts.video || (test.artifacts.screenshots && test.artifacts.screenshots.length > 0)) {
        console.log(`  - Found artifacts for: ${test.title}`);
      }

      // Copy trace
      if (test.artifacts.trace && fs.existsSync(test.artifacts.trace)) {
        const ext = path.extname(test.artifacts.trace) || '.zip';
        const fileName = `${safeId}-trace${ext}`;
        const destPath = path.join(artifactsDestDir, fileName);
        try {
          fs.copyFileSync(test.artifacts.trace, destPath);
          test.artifacts.trace = `artifacts/${fileName}`;
          console.log(`  - Trace copied: ${test.artifacts.trace}`);
        } catch (e) {
          console.error(`Failed to copy trace for ${test.title}:`, e);
        }
      }

      // Copy video
      if (test.artifacts.video && fs.existsSync(test.artifacts.video)) {
        const ext = path.extname(test.artifacts.video) || '.webm';
        const fileName = `${safeId}-video${ext}`;
        const destPath = path.join(artifactsDestDir, fileName);
        try {
          fs.copyFileSync(test.artifacts.video, destPath);
          test.artifacts.video = `artifacts/${fileName}`;
          console.log(`  - Video copied: ${test.artifacts.video}`);
        } catch (e) {
          console.error(`Failed to copy video for ${test.title}:`, e);
        }
      }

      // Copy screenshots
      if (test.artifacts.screenshots && test.artifacts.screenshots.length > 0) {
        test.artifacts.screenshots = test.artifacts.screenshots.map((screenshotPath, i) => {
          if (fs.existsSync(screenshotPath)) {
            const ext = path.extname(screenshotPath) || '.png';
            const fileName = `${safeId}-ss-${i}${ext}`;
            const destPath = path.join(artifactsDestDir, fileName);
            try {
              fs.copyFileSync(screenshotPath, destPath);
              return `artifacts/${fileName}`;
            } catch (e) {
              console.error(`Failed to copy screenshot for ${test.title}:`, e);
              return screenshotPath;
            }
          }
          return screenshotPath;
        });
        console.log(`  - ${test.artifacts.screenshots.length} screenshots copied`);
      }
    });

    // 4. Inject data into HTML
    const reportData = {
      history,
      results: this.results,
    };
    
    // Try several replacement strategies to be robust to different build outputs
    let finalHtml = html;
    const jsonPayload = JSON.stringify(reportData);
    try {
      // 1) Replace quoted placeholder "DATA_PLACEHOLDER"
      finalHtml = finalHtml.replace(/"DATA_PLACEHOLDER"/g, jsonPayload);
      // 2) Replace single-quoted 'DATA_PLACEHOLDER'
      finalHtml = finalHtml.replace(/'DATA_PLACEHOLDER'/g, jsonPayload);
      // 3) Replace unquoted DATA_PLACEHOLDER (in case minifier removed quotes)
      finalHtml = finalHtml.replace(/\bDATA_PLACEHOLDER\b/g, jsonPayload);
    } catch (e) {
      console.warn('Failed to replace DATA_PLACEHOLDER via regex:', e);
    }

    // Ensure window.playwrightData is set in the final HTML. Some bundlers/minifiers
    // may alter the original placeholder script, so append a fallback script right
    // before </body> to guarantee the UI can read the runtime data.
    if (!/window\.playwrightData\s*=/.test(finalHtml)) {
      // If there's a module script (the app bundle) that typically runs early,
      // inject the data script immediately before the first module script so
      // the bundle can read `window.playwrightData` during initialization.
      const moduleScriptMatch = finalHtml.match(/<script[^>]*type=(?:"|')module(?:"|')[^>]*>/i);
      const dataScript = `\n<script>window.playwrightData = ${jsonPayload};</script>\n`;
      if (moduleScriptMatch && moduleScriptMatch.index !== undefined) {
        const insertPos = moduleScriptMatch.index;
        finalHtml = finalHtml.slice(0, insertPos) + dataScript + finalHtml.slice(insertPos);
      } else {
        // Fallback: append before </body>
        const fallbackScript = `\n<script>window.playwrightData = ${jsonPayload};</script>\n`;
        finalHtml = finalHtml.replace(/<\/body>/i, `${fallbackScript}</body>`);
      }
    }

    // 5. Write final report
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const reportPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(reportPath, finalHtml);

    // 6. Copy UI assets if they exist
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
