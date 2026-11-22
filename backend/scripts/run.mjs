#!/usr/bin/env node
/**
 * Unified Backend Scripts Runner (CLI Dispatcher)
 *
 * Consolidates all standalone maintenance, test, report, and diagnostic scripts into a single entrypoint.
 *
 * Usage:
 *   node backend/scripts/run.mjs <script-name> [args...]
 *   node backend/scripts/run.mjs --list
 */

import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCRIPT_REGISTRY = {
  // Database Setup & Migrations
  'setup-db': { file: 'db/setup-db.mjs', desc: 'Create and initialize database tables' },
  'seed': { file: 'db/seed.mjs', desc: 'Unified database seeder (all, campaign, dummy, vendors)' },
  'migrate-dcb-confirm-endpoint': { file: 'db/migrate-dcb-confirm-endpoint.js', desc: 'Migrate DCB confirm endpoint config' },

  // Reports & Analytics Export
  'generate-burkina-faso-excel': { file: 'reports/generate-burkina-faso-excel.mjs', desc: 'Generate Burkina Faso Orange September Excel report' },
  'generate-zain-excel': { file: 'reports/generate-zain-excel.mjs', desc: 'Generate Zain Jordan OTP verified Excel report' },
  'generate-zain-pdf': { file: 'reports/generate-zain-pdf.mjs', desc: 'Generate Zain Jordan OTP verified PDF report' },

  // E2E & Flow Testing
  'e2e-detect-flow': { file: 'testing/e2e-detect-flow.mjs', desc: 'E2E Header Enrichment detection flow test' },
  'e2e-he-subscribe-flow': { file: 'testing/e2e-he-subscribe-flow.mjs', desc: 'E2E HE subscription flow test' },
  'e2e-start-config-flow': { file: 'testing/e2e-start-config-flow.mjs', desc: 'E2E start configuration flow test' },
  'test-apis': { file: 'testing/test-apis.mjs', desc: 'API smoke tests against local server' },
  'test-dcb-gateway': { file: 'testing/test-dcb-gateway.js', desc: 'Test DCB gateway endpoints' },
  'test-dcb-manual': { file: 'testing/test-dcb-manual.mjs', desc: 'Manual DCB trigger test' },
  'test-delayed-checksub-e2e': { file: 'testing/test-delayed-checksub-e2e.mjs', desc: 'Delayed checksub background worker integration tests' },

  // Diagnostics & Debug
  'inspect-camp33': { file: 'debug/inspect-camp33.mjs', desc: 'Inspect campaign 33 config and relations' },
  'inspect-conversions': { file: 'debug/inspect-conversions.mjs', desc: 'Inspect recent conversion records' },
  'reset-camp33-dcb': { file: 'debug/reset-camp33-dcb.mjs', desc: 'Reset campaign 33 flow pages to default DCB state' },
  'reset-otp-local': { file: 'debug/reset-otp-local.mjs', desc: 'Toggle mock OTP mode in local environment' },
};

// Aliases for convenience
const ALIASES = {
  'burkina-excel': 'generate-burkina-faso-excel',
  'zain-excel': 'generate-zain-excel',
  'zain-pdf': 'generate-zain-pdf',
  'apis': 'test-apis',
  'dcb': 'test-dcb-gateway',
  'db': 'setup-db',
};

function printHelp() {
  console.log('\n=======================================================');
  console.log('       TemplateCraft Backend Unified Scripts Runner     ');
  console.log('=======================================================\n');
  console.log('Usage:\n  node backend/scripts/run.mjs <command>\n');
  console.log('Available Commands:\n');

  const categories = {
    'Database & Migrations': ['setup-db', 'seed', 'migrate-dcb-confirm-endpoint'],
    'Reports & Exports': ['generate-burkina-faso-excel', 'generate-zain-excel', 'generate-zain-pdf'],
    'Testing & E2E': ['test-apis', 'e2e-detect-flow', 'e2e-he-subscribe-flow', 'e2e-start-config-flow', 'test-delayed-checksub-e2e', 'test-dcb-gateway', 'test-dcb-manual'],
    'Diagnostics & Debug': ['inspect-camp33', 'inspect-conversions', 'reset-camp33-dcb', 'reset-otp-local'],
  };

  for (const [category, cmds] of Object.entries(categories)) {
    console.log(`  [${category}]`);
    for (const cmd of cmds) {
      const entry = SCRIPT_REGISTRY[cmd];
      console.log(`    ${cmd.padEnd(32)} ${entry.desc}`);
    }
    console.log('');
  }
}

async function run() {
  const arg = process.argv[2]?.trim().replace(/\.(mjs|js)$/, '');

  if (!arg || arg === '--help' || arg === '-h' || arg === '--list' || arg === '-l') {
    printHelp();
    return;
  }

  const targetKey = ALIASES[arg] || arg;
  const scriptEntry = SCRIPT_REGISTRY[targetKey];

  if (!scriptEntry) {
    console.error(`\n[ERROR] Unknown script: "${arg}".`);
    printHelp();
    process.exit(1);
  }

  const scriptPath = path.resolve(__dirname, scriptEntry.file);
  console.log(`\n[Runner] Executing: ${scriptEntry.file} (${scriptEntry.desc})...\n`);

  try {
    await import(pathToFileURL(scriptPath).href);
  } catch (err) {
    console.error(`\n[ERROR] Execution failed for ${scriptEntry.file}:`, err);
    process.exit(1);
  }
}

run();
