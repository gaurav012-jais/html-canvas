# Database Architecture & Migrations

## 1. Engine & Configuration
TypeORM is configured via `src/database/index.js` with dual database support:
- **PostgreSQL**: Production and staging default.
- **MySQL**: Supported for legacy or alternate environments.

## 2. Migrations System
Database schema evolution is strictly governed by 29 TypeORM migration classes registered in `src/database/migrations/index.js`.
Upon startup, `dataSource.runMigrations()` automatically ensures all pending migrations are applied in sequential timestamp order.

### Core Tables & Entities
1. `users`: System users and authentication credentials.
2. `campaigns`: Marketing campaigns, carrier bindings, active funnel layouts, capping.
3. `campaign_pages`: Page templates (`HOME`, `OTP`, `CONFIRM`, `THANKYOU`) storing HTML, CSS, and GrapesJS project JSON.
4. `campaign_trackings`: Affiliate tracking parameters, vendor tokens, and payout percentages.
5. `api_configs`: Carrier API integration credentials and settings (HE, DCB, OTP, Checksub).
6. `visits`: User traffic visits, header enrichment telemetry, and checksub status.
7. `visit_events`: User interaction events within the subscription flow.
8. `conversion_postbacks`: Confirmed conversions, carrier transactions, postback forwarding statuses, and delayed checksub scheduling.
9. `api_call_logs`: Audit log for third-party carrier API requests and responses.
10. `daily_stats`: Aggregated daily metrics for campaign analytics.
11. `countries` & `operators`: Telecom carrier taxonomy and dialing prefixes.
12. `vendors` & `affiliates`: Traffic partners and network vendors.
13. `templates`: Prebuilt reusable templates.
