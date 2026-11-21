# WAP Manager — Backend Refactoring & Modularization Plan

> **Scope:** `backend/src` (205 files, 35,722 LOC)
> **Target:** Monolith & God-Files ko Clean, Readable, Maintainable Domain Modules me break karna.

---

## 1. Backend Current State Analysis

Backend me sabse badi samasya files ki **extreme length** aur **business logic ka galat placement** hai:

1. **Flow Module:** Akela 12,684 lines (35.5% of backend) hold karta hai across 59 files.
2. **Partners Module:** Logic controllers ya services me nahi balki `helpers/` ke andar 3,850 lines me chhupa hua hai.
3. **Analytics Module:** Sirf do files (`analytics.service.js` aur `daily-stats.service.js`) me 1,748 lines hain jisme raw SQL aur aggregation math mixed hai.
4. **OTP Module:** `verify.service.js` akela 843 lines ka hai jo ek single file me multiple carrier responses, retry logic, aur hold payouts handle kar raha hai.

---

## 2. File-by-File Audit: Files to Refactor vs Files to Keep Clean

### A. High Priority Files That MUST Be Refactored (> 300 LOC)

| File Path                                                           | Current LOC           | Major Issue                                                                            | Proposed Refactoring / Split Plan                                                                                                                 |
| :------------------------------------------------------------------ | :-------------------- | :------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| `backend/src/modules/partners/helpers/postback-query.js`          | **1,139 lines** | 7 repositories injected in closure, giant raw SQL queries, in-memory filtering         | Split into 4 files: `query-builder.js`, `report-aggregator.js`, `filter-engine.js`, `user-scope.js`                                       |
| `backend/src/modules/flow/universe-dcb-expose.service.js`         | **1,025 lines** | Inbound HTTP handling, polling, HTML screen rendering, Redis lock, partner calls mixed | Split into: `universe-dcb-flow.service.js` (orchestrator), `universe-dcb-session.js` (Redis/correlation), `universe-dcb-inbound.handler.js` |
| `backend/src/modules/analytics/analytics.service.js`              | **987 lines**   | Huge multi-metric aggregation, heavy SQL queries, manual group-bys                     | Split into: `campaign-metrics.service.js`, `carrier-metrics.service.js`, `performance-chart.service.js`                                     |
| `backend/src/modules/otp/verify/verify.service.js`                | **843 lines**   | Verification, carrier fallback, conversion postback triggering, hold resolution        | Split into: `verify-validator.js`, `carrier-verifier.js`, `post-verify-actions.js`                                                          |
| `backend/src/modules/flow/orange-bf.service.js`                   | **798 lines**   | Carrier specific logic, XML/HTTP parsing, session handling in one file                 | Split into: `orange-bf-flow.service.js`, `orange-bf-session.service.js`                                                                       |
| `backend/src/modules/partners/helpers/postback-day-report.js`     | **786 lines**   | Day report formatting, story builders, stats calculation                               | Split into: `day-report-builder.js`, `number-story.builder.js`, `day-stats.calculator.js`                                                   |
| `backend/src/modules/analytics/daily-stats.service.js`            | **761 lines**   | Daily rollups, cron jobs, DB upsert batching                                           | Split into: `daily-rollup.job.js`, `stats-calculator.js`, `stats-repository.js`                                                             |
| `backend/src/modules/flow/he.service.js`                          | **682 lines**   | Header enrichment IP/MSISDN parsing, gateway redirection, token verification           | Split into: `he-detector.service.js`, `he-token.service.js`, `he-redirect.handler.js`                                                       |
| `backend/src/modules/campaigns/services/campaign-crud.service.js` | **601 lines**   | Campaign CRUD mixed with page cloning, tracking setup, and validation                  | Split into: `campaign-crud.service.js` (< 200 LOC), `campaign-clone.service.js`, `campaign-validator.js`                                    |
| `backend/src/modules/flow/detect/detect.service.js`               | **578 lines**   | Device, carrier, IP, HE gate check, priority chain resolution                          | Split into: `traffic-classifier.service.js`, `priority-resolver.service.js`                                                                   |
| `backend/src/modules/flow/partner-api.service.js`                 | **561 lines**   | Third-party carrier API invocation, retry loops, axios config                          | Split into: `carrier-http-client.js`, `carrier-payload-transformer.js`                                                                        |
| `backend/src/modules/flow/orange-bf.provider.js`                  | **494 lines**   | Heavy provider parsing and XML/JSON conversion                                         | Extract XML parser and payload mapper into dedicated helper                                                                                       |
| `backend/src/modules/otp/send/send.service.js`                    | **477 lines**   | Rate limiting, number validation, provider selection, SMS queuing                      | Split into: `otp-rate-limiter.js`, `otp-dispatch.service.js`                                                                                  |
| `backend/src/modules/partners/helpers/postback-callback.js`       | **475 lines**   | Inbound carrier callback processing, query params matching                             | Move from `helpers/` to `services/postback-callback.service.js`                                                                               |
| `backend/src/modules/flow/transition/subscribe-route.js`          | **464 lines**   | Route transitions, page resolution, session state                                      | Clean and split into state transition handlers                                                                                                    |
| `backend/src/modules/flow/helpers/dcb-expose-screen.js`           | **458 lines**   | Inline HTML template generation for DCB screens                                        | Move HTML templates into standalone `.html` or template function files                                                                          |
| `backend/src/modules/flow/core/page-resolver.js`                  | **456 lines**   | Funnel page resolution, variant routing, A/B logic                                     | Split into: `page-resolver.service.js`, `variant-selector.js`                                                                                 |
| `backend/src/modules/flow/flow.controller.js`                     | **455 lines**   | Controller doing heavy business logic instead of just HTTP translation                 | Slim down to < 150 LOC by delegating to dedicated use-case services                                                                               |
| `backend/src/modules/flow/dcb/dcb-operations.service.js`          | **426 lines**   | DCB billing operations, pincode verification, charge execution                         | Split into: `dcb-charge.service.js`, `dcb-pin.service.js`                                                                                     |
| `backend/src/modules/otp/providers/partner.provider.js`           | **422 lines**   | Carrier provider adapter with tangled error codes                                      | Separate into provider config and adapter classes                                                                                                 |

---

### B. Clean Files That Are ALREADY Well-Structured (DO NOT CHANGE)

Following files follow single responsibility, are under 150 lines, and unke code ko touch karne ki koi zarurat nahi hai:

- `backend/src/server.js` (41 lines) — Standard HTTP server bootstrap.
- `backend/src/routes/index.js` (40 lines) — Central route registration.
- `backend/src/common/access-log.js` (93 lines) — Morgan IST daily rotation logger.
- `backend/src/common/admin.js` (41 lines) — Role verification helper.
- `backend/src/common/zoned-day.js` (66 lines) — Timezone date calculation helper.
- `backend/src/common/middleware/auth.middleware.js` (~50 lines) — JWT verification middleware.
- `backend/src/common/middleware/error.middleware.js` (~45 lines) — Global error handler.
- `backend/src/modules/auth/*` (3 files, ~232 lines total) — Clean login/register endpoints.
- `backend/src/modules/users/*` (3 files, ~266 lines total) — User profile management.
- `backend/src/modules/admin/*` (3 files, ~177 lines total) — Admin system overview.
- `backend/src/modules/upload/*` (5 files, ~323 lines total) — S3/Cloudinary/Local multer file upload.
- `backend/src/modules/templates/*` (3 files, ~137 lines total) — GrapesJS template metadata endpoints.
- `backend/src/modules/markets/*` (4 files, ~543 lines total) — Country and Operator CRUD.

---

## 3. Module-by-Module Target Architecture

### A. Refactoring `backend/src/modules/partners` (Postbacks & Affiliates)

**Current Problem:**
`partners.service.js` sirf 122 lines ka dummy wrapper hai, jabki `helpers/` me 3,800+ lines me raw query execution, day reporting, aur callbacks handle ho rahe hain.

**Target Structure:**

```
backend/src/modules/partners/
├── partners.controller.js          (< 120 lines - HTTP endpoints)
├── partners.routes.js              (< 50 lines - Express routing)
├── services/
│   ├── postback-query.service.js   (< 250 lines - Orchestrates query builders)
│   ├── postback-callback.service.js(< 200 lines - Carrier inbound callback)
│   ├── postback-dispatch.service.js(< 180 lines - Outbound affiliate HTTP fire)
│   ├── day-report.service.js       (< 220 lines - Aggregates datewise reports)
│   └── vendor-payout.service.js    (< 150 lines - Payout and status logic)
├── query-builders/
│   ├── hit-query.builder.js        (Focused TypeORM query for hits)
│   └── number-story.builder.js     (Timeline builder for a single MSISDN)
└── dto/
    └── postback.dto.js             (Zod request schemas)
```

---

### B. Refactoring `backend/src/modules/flow` (Traffic & Carrier Billing)

**Current Problem:**
`flow` module me 59 files hain jisme carriers (`orange-bf`, `universe-dcb`), traffic detection (`he`, `detect`), page routing (`core`, `transition`), aur BullMQ workers ek dusre se tightly coupled hain.

**Target Structure:**

```
backend/src/modules/flow/
├── controllers/
│   ├── flow-traffic.controller.js  (Landing page entry & HE redirect)
│   ├── flow-dcb.controller.js      (Carrier billing endpoints)
│   └── flow-page.controller.js     (Funnel steps & transitions)
├── carriers/                       (Clean Carrier Adapter Pattern)
│   ├── universe-dcb/
│   │   ├── universe-dcb.adapter.js (Clean provider API caller)
│   │   ├── universe-dcb.session.js (Session & Redis lock management)
│   │   └── universe-dcb.screen.js  (Screen HTML generation)
│   └── orange-bf/
│       ├── orange-bf.adapter.js
│       └── orange-bf.session.js
├── detection/
│   ├── he-detector.service.js      (Header Enrichment IP/MSISDN parsing)
│   └── priority-chain.service.js   (Campaign verification mode fallback)
├── core/
│   ├── funnel-engine.js            (State machine for visitor progression)
│   └── page-resolver.service.js    (Resolves HTML/CSS for current step)
└── workers/
    └── delayed-checksub.worker.js  (Clean BullMQ delayed subscriber check)
```

---

### C. Refactoring `backend/src/modules/analytics` (Stats & Metrics)

**Current Problem:**
`analytics.service.js` (987 lines) aur `daily-stats.service.js` (761 lines) me complex aggregation queries aur DB locking logic mixed hai.

**Target Structure:**

```
backend/src/modules/analytics/
├── analytics.controller.js
├── analytics.routes.js
├── services/
│   ├── dashboard-overview.service.js (High-level totals: clicks, CR, revenue)
│   ├── campaign-analytics.service.js (Drilldown per campaign & market)
│   ├── operator-analytics.service.js (Performance per Telco operator)
│   └── daily-rollup.service.js       (Cron-driven daily table rollups)
└── queries/
    └── aggregation-queries.js        (Optimized SQL query functions)
```

---

### D. Refactoring `backend/src/modules/otp` (One-Time Password)

**Current Problem:**
`verify.service.js` (843 lines) me verification ke dauran hi visit update, conversion firing, hold resolution, aur analytics dispatch inline ho raha hai.

**Target Structure:**

```
backend/src/modules/otp/
├── otp.controller.js
├── otp.routes.js
├── services/
│   ├── otp-send.service.js         (Rate limit check + provider dispatch)
│   ├── otp-verify.service.js       (Pure verification check against carrier/redis)
│   └── otp-post-action.service.js  (Event triggered after verification success)
└── providers/
    ├── carrier-otp.provider.js
    └── sms-aggregator.provider.js
```

---

## 4. Implementation Guidelines for Developers

1. **Rule of 300:** Kisi bhi naye ya refactored backend file ki length **300 lines** se zyada nahi honi chahiye.
2. **Never Put Business Logic in Helpers:** `helpers/` folder sirf pure utility functions (e.g. date formatting, string masking, URL parsing) ke liye hona chahiye. Agar function DB call ya external API hit karta hai, toh wo `service` ya `provider` hona chahiye.
3. **No Raw SQL Strings in Controllers:** Sabhi SQL queries ko dedicated query builder ya repository methods me encapsulate karein.
4. SQL ka code bhi rahega ismai code mat hata dena SQL ka
