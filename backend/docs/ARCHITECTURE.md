# Backend Architecture & Module Map

## 1. Overview
TemplateCraft backend is an Express-based REST API designed for high-throughput mobile subscription funnels, carrier billing (DCB), OTP verification, header enrichment (HE), postback dispatch, and template authoring.

## 2. Directory Structure
```
backend/src/
├── app.js                      # Express application setup & middleware
├── server.js                   # HTTP server entry point & graceful shutdown
├── config/                     # Environment configuration & constants
├── database/                   # TypeORM database configuration
│   ├── index.js                # Database initialization & runMigrations()
│   ├── entities/               # 15 TypeORM entities (all JSDoc typed)
│   ├── migrations/             # 29 database schema migrations
│   │   └── index.js            # Migration registry
│   └── seed/                   # Funnel page seeds & templates
├── modules/                    # Feature modules
│   ├── campaigns/              # Campaign management, pages, and API configs
│   │   ├── campaigns.service.js # Unified delegation facade
│   │   └── services/           # Split CRUD, pages, cache, and API configs
│   ├── flow/                   # Subscription funnel orchestration
│   │   ├── flow-engine.service.js
│   │   ├── flow.service.js
│   │   ├── flow.controller.js
│   │   ├── core/               # Engine, page resolver, page response
│   │   ├── detect/             # HE detection & priority chain
│   │   ├── transition/         # Flow transitions (home, confirm, otp, subscribe)
│   │   └── routing/            # Dynamic route decision & checksub rules
│   ├── otp/                    # Mobile OTP send, verify & rate limiting
│   │   ├── otp.service.js      # Unified delegation facade
│   │   ├── send/               # OTP dispatch & provider routing
│   │   ├── verify/             # OTP validation & postback scheduling
│   │   ├── providers/          # SMS provider adapters (Partner, Twilio, etc.)
│   │   └── helpers/            # Approval control, payouts, limits
│   ├── partners/               # Postback forwarders & vendor callbacks
│   │   ├── partners.service.js
│   │   └── helpers/            # Register, forward, callback, query, reports
│   ├── markets/                # Country and telecom operator definitions
│   ├── templates/              # Visual template presets & GrapesJS pages
│   ├── tracking/               # Conversion tracking & affiliate postbacks
│   └── users/                  # User accounts, auth & permissions
└── scripts/                    # CLI scripts (db, reports, testing, debug)
```

## 3. Core Design Principles
1. **Delegation Facades**: Large legacy service files (`otp.service.js`, `campaigns.service.js`) act as backward-compatible facade wrappers, delegating to specialized single-responsibility service modules in subdirectories.
2. **Dual Database Compatibility**: All database migrations and queries support both PostgreSQL and MySQL without dialect errors.
3. **Graceful Fallback**: If Redis or external carrier gateways are temporarily offline in dev/test, fallbacks prevent hard crashes.
