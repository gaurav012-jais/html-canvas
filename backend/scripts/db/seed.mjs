#!/usr/bin/env node
/**
 * Unified Database Seeder
 *
 * Consolidates all database seed operations into a single entrypoint.
 *
 * Usage:
 *   node backend/scripts/db/seed.mjs [target]
 *
 * Targets:
 *   all        - Run all seeds sequentially (dummy -> vendors -> campaign) [default]
 *   campaign   - Seed complete demo campaign with all funnel pages & API configs
 *   dummy      - Seed initial dummy markets, operators, and campaigns
 *   vendors    - Seed test vendors, affiliates, and campaign trackings
 */

const target = (process.argv[2] || 'all').toLowerCase();

switch (target) {
  case '--help':
  case '-h':
  case 'help':
    console.log(`
Unified Database Seeder
Usage:
  node backend/scripts/db/seed.mjs [target]

Available Targets:
  all        - Run all seeds sequentially (dummy -> vendors -> campaign) [default]
  campaign   - Seed complete demo campaign with all funnel pages & API configs
  dummy      - Seed initial dummy markets, operators, and campaigns
  vendors    - Seed test vendors, affiliates, and campaign trackings

Examples:
  node backend/scripts/db/seed.mjs
  node backend/scripts/db/seed.mjs campaign
  npm run script seed
`);
    break;

  case 'campaign':
    await import('./seed_proper_campaign.js');
    break;

  case 'dummy':
    await import('./seed_dummy.js');
    break;

  case 'vendors':
    await import('./seed_vendors.js');
    break;

  case 'all':
    console.log('\n[1/3] Running dummy markets & campaigns seed...');
    await import('./seed_dummy.js');
    console.log('\n[2/3] Running vendors & affiliates seed...');
    await import('./seed_vendors.js');
    console.log('\n[3/3] Running proper campaign seed...');
    await import('./seed_proper_campaign.js');
    break;

  default:
    console.error(`Unknown seed target: "${target}"`);
    console.log('Available targets: all, campaign, dummy, vendors');
    console.log('Example: node backend/scripts/db/seed.mjs campaign');
    process.exit(1);
}
