/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import PlaywrightAdvancedReporter from '../reporter/playwright-reporter';
import { ReportConfig } from '../types';

const { version } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
) as { version: string };

/**
 * CLI for Playwright Advanced Report.
 * This allows users to generate reports from existing JSON/JUnit files or open the report.
 */
export async function runCli() {
  const program = new Command();

  program
    .name('phantom-report')
    .description('Generate a rich HTML test report for Playwright with historical analytics.')
    .version(version);

  program
    .command('generate')
    .description('Generate a report from existing JSON/JUnit files.')
    .option('-c, --config <path>', 'Path to the configuration file.')
    .option('-j, --json <path>', 'Path to the Playwright JSON report.')
    .option('-x, --xml <path>', 'Path to the JUnit XML report.')
    .action(async (options) => {
      console.log('Generating report from existing files...');
      // In a real implementation, this would:
      // 1. Load the config
      // 2. Parse the JSON/XML reports
      // 3. Initialize the reporter and call onEnd
      const reporter = new PlaywrightAdvancedReporter(options.config);
      // Mocking onEnd call for demonstration
      await reporter.onEnd({ status: 'passed' } as any);
    });

  program
    .command('open')
    .description('Open the generated report in the browser.')
    .option('-p, --path <path>', 'Path to the report HTML file.', './playwright-report/index.html')
    .action((options) => {
      console.log(`Opening report at ${options.path}...`);
      // In a real implementation, use the 'open' package to open the file in the browser
    });

  program.parse(process.argv);
}

// If this file is run directly, start the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch(console.error);
}
