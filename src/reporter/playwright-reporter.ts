/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { Reporter, FullConfig, Suite, TestCase, TestResult as PlaywrightTestResult, FullResult } from '@playwright/test/reporter';
import { TestResult, TestAttempt, RunMetadata, ReportConfig, HistoricalData } from '../types';
import { mergeHistory } from '../core/history';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

// Strip ANSI terminal color/formatting escape codes from strings
const stripAnsi = (str: string): string => str.replace(/\x1B\[[0-9;]*m/g, '');

// ---------------------------------------------------------------------------
// Static file server (used when open: 'always' | 'on-failure')
// ---------------------------------------------------------------------------
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webm': 'video/webm',
  '.mp4':  'video/mp4',
  '.zip':  'application/zip',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function openBrowser(url: string): void {
  const platform = os.platform();
  try {
    if (platform === 'win32') exec(`start "" "${url}"`);
    else if (platform === 'darwin') exec(`open "${url}"`);
    else exec(`xdg-open "${url}"`);
  } catch {
    // URL already printed to console — user can open manually
  }
}

async function serveReport(serveRoot: string, openPath: string, traceViewerDir: string): Promise<void> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rawUrl  = req.url ?? '/';
      const urlPath = decodeURIComponent(rawUrl.split('?')[0]);

      // Serve Playwright's bundled trace viewer at /trace-viewer/*
      if (urlPath === '/trace-viewer' || urlPath.startsWith('/trace-viewer/')) {
        if (!traceViewerDir) {
          res.writeHead(404);
          res.end('Trace viewer not found — playwright-core may not be installed.');
          return;
        }
        const subPath = urlPath.replace(/^\/trace-viewer\/?/, '') || 'index.html';
        const filePath = path.join(traceViewerDir, subPath);
        const safeRoot = path.normalize(traceViewerDir + path.sep);
        if (!path.normalize(filePath).startsWith(safeRoot)) {
          res.writeHead(403); res.end('Forbidden'); return;
        }
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          res.writeHead(200, {
            'Content-Type':                MIME_TYPES[ext] ?? 'application/octet-stream',
            'Access-Control-Allow-Origin': '*',
          });
          fs.createReadStream(filePath).pipe(res);
        } else {
          // SPA fallback — serve index.html for unknown paths
          const indexPath = path.join(traceViewerDir, 'index.html');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
          fs.createReadStream(indexPath).pipe(res);
        }
        return;
      }

      const normalized = path.normalize(path.join(serveRoot, urlPath));

      // Path-traversal guard
      if (!normalized.startsWith(path.normalize(serveRoot + path.sep)) &&
          normalized !== path.normalize(serveRoot)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      let filePath = normalized;
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type':                contentType,
          'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as { port: number }).port;
      const url  = `http://127.0.0.1:${port}/${openPath}`;
      const hasTraceViewer = !!traceViewerDir;
      console.log(`\n\x1b[35m[Phantom] Report served at \x1b[1m${url}\x1b[0m`);
      if (hasTraceViewer) console.log(`\x1b[35m[Phantom] Trace viewer at \x1b[1mhttp://127.0.0.1:${port}/trace-viewer/\x1b[0m`);
      console.log('\x1b[2m[Phantom] Press Ctrl+C to stop.\x1b[0m\n');
      openBrowser(url);
    });

    const shutdown = () => { server.close(() => resolve()); process.exit(0); };
    process.once('SIGINT',  shutdown);
    process.once('SIGTERM', shutdown);
  });
}
// ---------------------------------------------------------------------------

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
  private activeProjects: string[] = [];
  /** True when the user explicitly provided history.filePath — skip auto-derivation. */
  private historyFilePathExplicit: boolean;

  constructor(options: any = {}) {
    this.historyFilePathExplicit = !!options.history?.filePath;
    const outputFolder = options.outputFolder || 'test-output';
    this.config = {
      outputFolder,
      label: options.label,
      qualityGate: options.qualityGate,
      history: {
        enabled: options.history?.enabled ?? true,
        // Placeholder — resolved to a label-scoped path in onEnd if not explicit.
        filePath: options.history?.filePath || `${outputFolder}/history.json`,
        retention: parseInt(options.history?.retention || '30') || 30,
      },
      open:   options.open   || 'on-failure',
      server: options.server || 'local',
      artifacts: {
        video:       options.artifacts?.video       ?? true,
        screenshots: options.artifacts?.screenshots ?? false,
        trace:       options.artifacts?.trace       ?? false,
      },
    };

    this.startTime = new Date();
  }

  /**
   * Collects build/environment context from well-known CI environment variables.
   * All fields are optional — only populated keys are included. Supports GitHub Actions,
   * Azure Pipelines, GitLab CI, Buildkite, CircleCI, and Jenkins.
   */
  private collectEnvironment(): Record<string, string> {
    const env: Record<string, string> = {};

    const branch =
      process.env.GITHUB_REF_NAME ||
      process.env.BUILD_SOURCEBRANCH?.replace(/^refs\/heads\//, '') ||
      process.env.CI_COMMIT_BRANCH ||
      process.env.GIT_BRANCH ||
      process.env.BRANCH_NAME ||
      process.env.BUILDKITE_BRANCH ||
      process.env.CIRCLE_BRANCH;
    if (branch) env.branch = branch;

    const commit =
      process.env.GITHUB_SHA?.slice(0, 7) ||
      process.env.BUILD_SOURCEVERSION?.slice(0, 7) ||
      process.env.CI_COMMIT_SHORT_SHA ||
      process.env.GIT_COMMIT?.slice(0, 7) ||
      process.env.BUILDKITE_COMMIT?.slice(0, 7) ||
      process.env.CIRCLE_SHA1?.slice(0, 7);
    if (commit) env.commit = commit;

    const buildNumber =
      process.env.GITHUB_RUN_NUMBER ||
      process.env.BUILD_BUILDNUMBER ||
      process.env.CI_PIPELINE_IID ||
      process.env.BUILD_NUMBER ||
      process.env.BUILDKITE_BUILD_NUMBER ||
      process.env.CIRCLE_BUILD_NUM;
    if (buildNumber) env.buildNumber = buildNumber;

    const environmentName =
      process.env.CI_ENVIRONMENT_NAME ||
      process.env.ENVIRONMENT ||
      process.env.DEPLOY_ENV ||
      process.env.APP_ENV;
    if (environmentName) env.environment = environmentName;

    return env;
  }

  /**
   * Derives a stable label for this run without any user configuration.
   * Priority: explicit config → CI environment variables → active Playwright projects → 'default'.
   * Each CI platform exposes a unique job/workflow name that cleanly separates workflows.
   */
  /**
   * Derives the common ancestor directory of all spec files that ran, relative to CWD.
   * Used to distinguish partial local runs (e.g. `npx playwright test src/app1/`) from full runs.
   * Returns null when no meaningful scope can be determined (files scattered across root).
   *
   * Examples:
   *   ['src/app1/home.spec.ts']                        → 'src/app1/home'   (single file: name without ext)
   *   ['src/app1/home.spec.ts', 'src/app1/cart.spec.ts'] → 'src/app1'       (common ancestor dir)
   *   ['src/app1/home.spec.ts', 'src/app2/login.spec.ts'] → 'src'           (common ancestor dir)
   */
  private computeFileScope(files: string[]): string | null {
    if (files.length === 0) return null;

    const cwd = process.cwd().replace(/\\/g, '/');
    const relative = files
      .map(f => f.replace(/\\/g, '/').replace(cwd + '/', '').replace(cwd, ''))
      .filter(Boolean);

    if (relative.length === 0) return null;

    if (relative.length === 1) {
      // Single file — use filename without extension (strip known spec suffixes too).
      const parts = relative[0].split('/');
      const filename = parts[parts.length - 1].replace(/\.(spec|test)\.[^.]+$/, '').replace(/\.[^.]+$/, '');
      // Include parent dir if filename alone would be too generic (e.g. 'index', 'spec')
      const generic = /^(index|spec|test|tests)$/i.test(filename);
      return generic && parts.length > 1
        ? `${parts[parts.length - 2]}/${filename}`
        : filename;
    }

    // Multiple files — find the longest common directory prefix.
    const splitPaths = relative.map(p => p.split('/').slice(0, -1)); // exclude filename
    const minDepth   = Math.min(...splitPaths.map(p => p.length));
    const commonParts: string[] = [];
    for (let i = 0; i < minDepth; i++) {
      const segment = splitPaths[0][i];
      if (splitPaths.every(p => p[i] === segment)) {
        commonParts.push(segment);
      } else {
        break;
      }
    }

    return commonParts.length > 0 ? commonParts.join('/') : null;
  }

  private resolveLabel(activeProjects: string[], activeFiles: string[]): string {
    // 1. Explicit label always wins.
    if (this.config.label) return this.config.label;

    // 2. GitHub Actions — workflow name + job name.
    const ghWorkflow = process.env.GITHUB_WORKFLOW;
    const ghJob      = process.env.GITHUB_JOB;
    if (ghWorkflow) return ghJob ? `${ghWorkflow}/${ghJob}` : ghWorkflow;

    // 3. Azure Pipelines — pipeline name + stage + job gives full specificity.
    //    SYSTEM_DEFINITIONNAME = pipeline name (e.g. "E2E Tests")
    //    SYSTEM_STAGEDISPLAYNAME = stage (e.g. "Test")
    //    SYSTEM_JOBDISPLAYNAME = job inside the stage (e.g. "Smoke")
    const azurePipeline = process.env.SYSTEM_DEFINITIONNAME || process.env.BUILD_DEFINITIONNAME;
    if (azurePipeline) {
      const azureStage = process.env.SYSTEM_STAGEDISPLAYNAME;
      const azureJob   = process.env.SYSTEM_JOBDISPLAYNAME || process.env.AGENT_JOBNAME;
      const parts = [azurePipeline, azureStage, azureJob].filter(Boolean);
      return parts.join('/');
    }

    // 4. GitLab CI — pipeline name + job name.
    const gitlabPipeline = process.env.CI_PIPELINE_NAME;
    const gitlabJob      = process.env.CI_JOB_NAME;
    if (gitlabJob) return gitlabPipeline ? `${gitlabPipeline}/${gitlabJob}` : gitlabJob;

    // 5. Buildkite — pipeline slug + step key/label.
    const buildkitePipeline = process.env.BUILDKITE_PIPELINE_SLUG;
    const buildkiteStep     = process.env.BUILDKITE_STEP_KEY || process.env.BUILDKITE_LABEL;
    if (buildkiteStep) return buildkitePipeline ? `${buildkitePipeline}/${buildkiteStep}` : buildkiteStep;

    // 6. CircleCI — workflow name + job name.
    const circleWorkflow = process.env.CIRCLE_WORKFLOW_NAME;
    const circleJob      = process.env.CIRCLE_JOB;
    if (circleJob) return circleWorkflow ? `${circleWorkflow}/${circleJob}` : circleJob;

    // 7. Jenkins — folder-scoped job name is already unique.
    const jenkinsJob = process.env.JOB_NAME;
    if (jenkinsJob) return jenkinsJob;

    // 8. Local fallback: combine sorted project names with a file-scope derived from which
    //    spec files actually ran. This makes partial runs (e.g. `npx playwright test src/app1/`)
    //    automatically distinct from full suite runs — no config required.
    const projectPart = activeProjects.length > 0
      ? [...activeProjects].sort().join('+')
      : 'default';
    const fileScope = this.computeFileScope(activeFiles);
    return fileScope ? `${projectPart}::${fileScope}` : projectPart;
  }

  /**
   * Returns the history file path for the given effective label.
   * If the user set an explicit path, it is returned unchanged.
   * Otherwise a label-scoped sibling file is derived automatically, e.g.:
   *   'smoke'       → test-output/history-smoke.json
   *   'default'     → test-output/history.json   (no suffix for single-workflow setups)
   */
  private resolveHistoryFilePath(effectiveLabel: string): string {
    if (this.historyFilePathExplicit) return this.config.history.filePath;
    const safeLabel = effectiveLabel.replace(/[^a-z0-9_.-]/gi, '-').toLowerCase();
    const base = this.config.outputFolder;
    return safeLabel === 'default'
      ? `${base}/history.json`
      : `${base}/history-${safeLabel}.json`;
  }

  onBegin(config: FullConfig, suite: Suite) {
    // Capture the Playwright projects that are actually active in this run.
    // suite.suites at this point contains only the projects Playwright selected
    // (respecting --project flags, grep filters, etc.).
    this.activeProjects = suite.suites.map(s => s.title).filter(Boolean);
    console.log(`Starting Phantom Report at ${this.startTime.toISOString()}`);
    if (this.activeProjects.length > 0) {
      console.log(`[Phantom] Active projects: ${this.activeProjects.join(', ')}`);
    }
  }

  onTestEnd(test: TestCase, result: PlaywrightTestResult) {
    const project = test.parent.project()?.name || 'default';
    const baseId = `${project}-${test.title}-${test.tags.join('-')}`;

    const attempt: TestAttempt = {
      retry: result.retry,
      status: result.status as any,
      duration: result.duration,
      startTime: result.startTime.toISOString(),
      error: result.error?.message ? stripAnsi(result.error.message) : undefined,
      steps: result.steps.map(step => ({
        title: step.title,
        duration: step.duration,
        status: step.error ? 'failed' : 'passed',
        error: step.error?.message ? stripAnsi(step.error.message) : undefined,
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

    const existing = this.results.find(r => r.id === baseId);
    if (existing) {
      // Additional retry attempt — push to retries and update top-level convenience fields
      // to reflect the latest attempt.
      existing.retries.push(attempt);
      existing.status = attempt.status;
      existing.duration = attempt.duration;
      existing.startTime = attempt.startTime;
      existing.error = attempt.error;
      existing.steps = attempt.steps;
      existing.artifacts = { ...attempt.artifacts };
    } else {
      const testResult: TestResult = {
        id: baseId,
        title: test.title,
        file: test.location.file,
        line: test.location.line,
        column: test.location.column,
        tags: test.tags,
        browser: test.annotations.find(a => a.type === 'browser')?.description || 'unknown',
        project,
        duration: attempt.duration,
        status: attempt.status,
        startTime: attempt.startTime,
        error: attempt.error,
        steps: attempt.steps,
        artifacts: { ...attempt.artifacts },
        retries: [attempt],
      };
      this.results.push(testResult);
    }
  }

  async onEnd(result: FullResult) {
    const duration = Date.now() - this.startTime.getTime();

    // Resolve the effective label and history file path for this run.
    // activeFiles is derived from collected results so it reflects exactly what ran.
    const activeFiles       = [...new Set(this.results.map(r => r.file))];
    const effectiveLabel    = this.resolveLabel(this.activeProjects, activeFiles);
    const effectiveHistPath = this.resolveHistoryFilePath(effectiveLabel);
    console.log(`[Phantom] Run label: "${effectiveLabel}" → history: ${effectiveHistPath}`);

    // 0. Clean the output folder from the previous run.
    //    We delete index.html and the artifacts/ sub-folder so stale files
    //    from a previous execution don’t linger. The history file is kept
    //    because it accumulates cross-run data.
    const outputDirEarly = path.resolve(process.cwd(), this.config.outputFolder);
    try {
      const reportHtml = path.join(outputDirEarly, 'index.html');
      if (fs.existsSync(reportHtml)) fs.unlinkSync(reportHtml);
      const artifactsDir = path.join(outputDirEarly, 'artifacts');
      if (fs.existsSync(artifactsDir)) fs.rmSync(artifactsDir, { recursive: true, force: true });
    } catch (e) {
      // Non-fatal — continue even if cleanup fails (e.g. first run, locked file).
      console.warn('[Phantom] Warning: could not fully clean previous output:', (e as Error).message);
    }

    // Collect CI environment context (branch, commit, build number, env name).
    const environment = this.collectEnvironment();

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
      scope: {
        label: effectiveLabel,
        projects: this.activeProjects,
      },
      environment: Object.keys(environment).length > 0 ? environment : undefined,
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
    // Skip history entirely for interrupted runs — a Ctrl+C or process kill mid-run
    // 2. Load and merge history.
    // Interrupted runs (Ctrl+C / process kill) produce incomplete results — skipping
    // them prevents corrupting trend data and flakiness detection. The existing
    // history file is still read so the report renders correctly with prior data.
    let history: HistoricalData = { runs: [], tests: {} };
    if (this.config.history.enabled) {
      try {
        const historyPath = path.resolve(process.cwd(), effectiveHistPath);
        if (fs.existsSync(historyPath)) {
          const rawHistory = fs.readFileSync(historyPath, 'utf8');
          history = JSON.parse(rawHistory);
        }

        if (result.status === 'interrupted') {
          console.warn('[Phantom] Run was interrupted — history will not be updated to avoid corrupting trend data.');
        } else {
          console.log(`Pushing historical data to ${effectiveHistPath}`);
          history = mergeHistory(history, runMetadata, this.results, this.config.history.retention);

          // Save updated history
          const historyDir = path.dirname(historyPath);
          if (!fs.existsSync(historyDir)) {
            fs.mkdirSync(historyDir, { recursive: true });
          }
          fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
        }
      } catch (error) {
        console.error('Failed to process history:', error);
      }
    }

    // 3. Resolve / copy artifact paths depending on server mode.
    //
    //    Only failed / timedOut / interrupted tests retain artifacts — there is
    //    no value in keeping videos or traces for tests that passed.
    //
    //    'local'  → store relative paths from outputDir; the HTTP server resolves
    //               them at request time so no files are duplicated.
    //    'static' → copy every artifact into outputDir/artifacts/ so the report
    //               folder is self-contained and uploadable as a single CI artifact.
    const outputDir = path.resolve(process.cwd(), this.config.outputFolder);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const isFailure = (s: string) => ['failed', 'timedOut', 'interrupted'].includes(s);

    const toRelative = (absPath: string): string =>
      path.relative(outputDir, absPath).replace(/\\/g, '/');

    if (this.config.server === 'static') {
      // Copy selected artifact types into outputDir/artifacts/ — makes the folder self-contained.
      const artifactsDir = path.join(outputDir, 'artifacts');
      const copyArt = this.config.artifacts;

      // Only create the directory if we're going to copy something.
      const willCopyAny = copyArt.video || copyArt.screenshots || copyArt.trace;
      if (willCopyAny && !fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

      const sanitize = (name: string) =>
        name.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 60);

      this.results.forEach(test => {
        const safeId = sanitize(test.id);

        test.retries.forEach((attempt, aIdx) => {
          // Clear artifacts for passing attempts — no value in keeping them.
          if (!isFailure(attempt.status)) {
            attempt.artifacts = {};
            return;
          }
          const prefix = `${safeId}-a${aIdx}`;

          if (copyArt.trace && attempt.artifacts.trace && fs.existsSync(attempt.artifacts.trace)) {
            const dest = path.join(artifactsDir, `${prefix}-trace${path.extname(attempt.artifacts.trace) || '.zip'}`);
            try { fs.copyFileSync(attempt.artifacts.trace, dest); attempt.artifacts.trace = `artifacts/${path.basename(dest)}`; }
            catch { attempt.artifacts.trace = undefined; }
          } else { attempt.artifacts.trace = undefined; }

          if (copyArt.video && attempt.artifacts.video && fs.existsSync(attempt.artifacts.video)) {
            const dest = path.join(artifactsDir, `${prefix}-video${path.extname(attempt.artifacts.video) || '.webm'}`);
            try { fs.copyFileSync(attempt.artifacts.video, dest); attempt.artifacts.video = `artifacts/${path.basename(dest)}`; }
            catch { attempt.artifacts.video = undefined; }
          } else { attempt.artifacts.video = undefined; }

          if (copyArt.screenshots && attempt.artifacts.screenshots) {
            attempt.artifacts.screenshots = attempt.artifacts.screenshots
              .filter(p => fs.existsSync(p))
              .map((p, i) => {
                const dest = path.join(artifactsDir, `${prefix}-ss-${i}${path.extname(p) || '.png'}`);
                try { fs.copyFileSync(p, dest); return `artifacts/${path.basename(dest)}`; }
                catch { return undefined as unknown as string; }
              })
              .filter(Boolean);
          } else { attempt.artifacts.screenshots = []; }
        });

        // Sync top-level artifact fields to the final attempt.
        const last = test.retries[test.retries.length - 1];
        test.artifacts = { ...last.artifacts };
      });
    } else {
      // 'local' — store paths relative to outputDir; the HTTP server does the rest.
      this.results.forEach(test => {
        test.retries.forEach(attempt => {
          // Clear artifacts for passing attempts.
          if (!isFailure(attempt.status)) {
            attempt.artifacts = {};
            return;
          }

          if (attempt.artifacts.trace && fs.existsSync(attempt.artifacts.trace)) {
            attempt.artifacts.trace = toRelative(attempt.artifacts.trace);
          } else { attempt.artifacts.trace = undefined; }

          if (attempt.artifacts.video && fs.existsSync(attempt.artifacts.video)) {
            attempt.artifacts.video = toRelative(attempt.artifacts.video);
          } else { attempt.artifacts.video = undefined; }

          attempt.artifacts.screenshots = (attempt.artifacts.screenshots || [])
            .filter(p => fs.existsSync(p))
            .map(p => toRelative(p));
        });

        // Sync top-level artifact fields to the final attempt.
        const last = test.retries[test.retries.length - 1];
        test.artifacts = { ...last.artifacts };
      });
    }

    // 4. Inject data into HTML
    const reportData = {
      history,
      results: this.results,
      config: {
        qualityGate: this.config.qualityGate,
        label: effectiveLabel,
        runStatus: result.status,
        server: this.config.server,
        open: this.config.open,
        outputFolder: this.config.outputFolder,
        history: {
          enabled: this.config.history.enabled,
          retention: this.config.history.retention,
        },
        artifacts: this.config.artifacts,
      },
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

    // 7. Open the report when requested.
    const hasFailed = result.status !== 'passed';
    const shouldOpen = this.config.open === 'always' ||
      (this.config.open === 'on-failure' && hasFailed);

    if (shouldOpen) {
      if (this.config.server === 'static') {
        // Open the HTML file directly via file:// — no server, no traces.
        const reportPath = path.join(outputDir, 'index.html');
        openBrowser(reportPath);
        console.log(`\n\x1b[35m[Phantom] Report opened: \x1b[1m${reportPath}\x1b[0m`);
        console.log('\x1b[2m[Phantom] Note: trace viewer is not available in static mode.\x1b[0m\n');
      } else {
        // Default: 'local' — start a local HTTP server so the built-in trace viewer works.
        const serveRoot = process.cwd();
        const openPath  = path.relative(process.cwd(), outputDir).replace(/\\/g, '/') + '/';

        // Locate Playwright's bundled trace viewer (ships inside playwright-core)
        const traceViewerCandidates = [
          path.resolve(process.cwd(), 'node_modules/playwright-core/lib/vite/traceViewer'),
          path.resolve(process.cwd(), 'node_modules/@playwright/test/node_modules/playwright-core/lib/vite/traceViewer'),
          path.resolve(_dirname, '../../node_modules/playwright-core/lib/vite/traceViewer'),
          path.resolve(_dirname, '../../../node_modules/playwright-core/lib/vite/traceViewer'),
        ];
        const traceViewerDir = traceViewerCandidates.find(p => fs.existsSync(p)) ?? '';
        if (!traceViewerDir) {
          console.warn('[Phantom] playwright-core trace viewer not found — trace links will be disabled.');
        }

        await serveReport(serveRoot, openPath, traceViewerDir);
      }
    }
  }
}
