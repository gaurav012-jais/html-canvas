# Backend Scripts Directory

This directory contains standalone operational, maintenance, database, testing, and debugging scripts.

## Directory Structure

### `db/` — Database Setup, Seeds, & Migrations

- `setup-db.mjs`: Creates database using root credentials from `.env`. Run with `npm run db:setup`.
- `seed.mjs`: Unified database seeder. Run all (`node backend/scripts/db/seed.mjs` or `npm run script seed`) or specific target (`campaign`, `dummy`, `vendors`).
- `seed_proper_campaign.js`: Seeds a complete production-like campaign with all funnel pages and API configs.
- `seed_dummy.js`: Seeds initial dummy countries, operators, and campaigns.
- `seed_vendors.js`: Seeds test vendors, affiliates, and campaign trackings.
- `migrate-dcb-confirm-endpoint.js`: Migration script to update DCB confirmation endpoint configs.

### `reports/` — Analytics & Export Generators

- `generate-burkina-faso-excel.mjs`: Generates detailed Excel report for Burkina Faso campaigns.
- `generate-zain-excel.mjs`: Generates Excel report for Zain Jordan OTP verified visits.
- `generate-zain-pdf.mjs`: Generates PDF report for Zain Jordan OTP verified visits.

### `testing/` — Automated E2E & Integration Tests

- `test-apis.mjs`: API smoke tests against running server (`npm run test:api`).
- `e2e-detect-flow.mjs`: End-to-end HE detect flow tests (`npm run test:e2e:detect`).
- `e2e-he-subscribe-flow.mjs`: End-to-end HE subscription flow tests (`npm run test:e2e:he-subscribe`).
- `e2e-start-config-flow.mjs`: End-to-end start configuration flow tests (`npm run test:e2e:start-config`).
- `test-delayed-checksub-e2e.mjs`: Delayed checksub background worker integration tests.
- `test-dcb-gateway.js`: CLI tool to test DCB pincode, confirm, and status calls.
- `test-dcb-manual.mjs`: Quick manual DCB trigger.
- `dcb-manual-tester.html`: Browser UI for manual DCB flow verification.

### `debug/` — Diagnostics & Manual Reset Utilities

- `inspect-camp33.mjs`: Inspects campaign 33 configuration and relations in DB.
- `inspect-conversions.mjs`: Inspects recent conversion records.
- `reset-camp33-dcb.mjs`: Resets campaign 33 flow pages to default DCB state and flushes cache.
- `reset-otp-local.mjs`: Toggles mock OTP mode in local `.env`.

---

## Unified Script Runner (`run.mjs`)

All operational, report, testing, and debugging scripts can be run from the unified CLI runner:

```bash
# List all available scripts and categories
node backend/scripts/run.mjs --list

# Run any script by name
node backend/scripts/run.mjs generate-zain-excel
node backend/scripts/run.mjs e2e-detect-flow
node backend/scripts/run.mjs setup-db
```
