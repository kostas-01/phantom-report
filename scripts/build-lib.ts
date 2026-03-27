/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import * as esbuild from 'esbuild';
import * as path from 'path';

async function build() {
  const commonOptions: esbuild.BuildOptions = {
    bundle: true,
    platform: 'node',
    format: 'cjs', // Switch to CJS for better Playwright compatibility
    target: 'node18',
    sourcemap: true,
    external: ['@playwright/test', 'vite', 'esbuild', 'commander'],
  };

  // Build Reporter
  await esbuild.build({
    ...commonOptions,
    entryPoints: ['src/reporter/playwright-reporter.ts'],
    outfile: 'dist/reporter.js',
  });

  // Build CLI
  await esbuild.build({
    ...commonOptions,
    entryPoints: ['src/cli/cli.ts'],
    outfile: 'dist/cli.js',
    banner: {
      js: '#!/usr/bin/env node',
    },
  });

  console.log('Library build complete.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
