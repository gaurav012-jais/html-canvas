# TemplateCraft - Project Architecture & Directory Structure Guide

Ye document TemplateCraft repository ka comprehensive guide hai. Isme repository ke har folder, subfolder, file aur unke purpose/working ko detail me explain kiya gaya hai, saath hi industry-standard architectural comparison aur "Better Structure" proposals bhi diye gaye hain.

---

## 1. High-Level Project Overview

TemplateCraft ek **Telco VAS (Value Added Services) & Performance Marketing Engine** hai jo 3 primary capabilities provide karta hai:
1. **Visual Landing Page Builder (WYSIWYG):** GrapesJS based visual drag-and-drop editor jo custom landing pages, mobile subscription forms aur interactive buttons create karta hai.
2. **Visual Journey & Flow Builder:** `@xyflow/react` based node/edge diagram builder jisme marketer customize kar sakta hai ki user kis route se subscribe hoga (HE Detect $\rightarrow$ OTP $\rightarrow$ DCB $\rightarrow$ Thank You).
3. **High-Throughput Subscription & Analytics Backend:** Carrier integrations (Safaricom, Orange, Zain, Universe DCB), MSISDN Header Enrichment (HE), Fraud/Bot traps, Conversion Postback Attribution, BullMQ worker queues, Redis caching, aur Elasticsearch based logs tracing.

---

## 2. Root-Level Directory Structure

```
d:/dddd/
├── .agents/              # Antigravity/AI Agent communication & project instructions
├── .cursor/              # Cursor IDE configuration & AI rules
├── .github/              # CI/CD workflows and GitHub automation
├── .planning/            # Project milestones, roadmap, and refactoring history
├── .vscode/              # Visual Studio Code editor settings & launch configs
├── backend/              # Node.js Express 5 API server, Workers & Database
├── deploy/               # Deployment scripts (Nginx reverse proxy, PM2, Docker configs)
├── docs/                 # System architecture, Telco integration specs & flow diagrams
├── frontend/             # React 19 + Vite + Tailwind CSS + Zustand Single Page App
├── logs/                 # Application runtime logs & daily access logs (Morgan IST)
├── uploads/              # Local media storage directory for assets/images
├── package.json          # Root orchestration package
└── PROJECT_STRUCTURE_GUIDE.md # (Ye file) Comprehensive architecture manual
```

---

## 3. Backend Deep Dive (`backend/`)

Backend ek **Node.js (v20+) Express 5** server hai jo ES Modules (`"type": "module"`) par bana hai. Isme TypeORM for PostgreSQL, IORedis for caching/locks, BullMQ for distributed job queues, aur Elasticsearch for log retrieval use hota hai.

### 3.1 Backend Root Files & Folders
- `backend/src/server.js`: Application ka main entry point. Database init karta hai, background workers start karta hai, aur HTTP server listen karta hai with graceful shutdown.
- `backend/src/app.js`: Express app instance configure karta hai — CORS, trust proxy, Morgan daily access logging, body parsers, routes mounting aur global error handling.
- `backend/package.json`: Backend dependencies (`express`, `typeorm`, `pg`, `ioredis`, `bullmq`, `@elastic/elasticsearch`, `cloudinary`, `aws-sdk`, `exceljs`, etc.).

### 3.2 `backend/src/config/`
- `configuration.js`: Environment variables (`.env`) ko load aur sanitize karta hai (Database, Redis, JWT, ElasticSearch, Cloudinary, AWS S3, Postback defaults, Telco credentials).

### 3.3 `backend/src/database/` (Data Layer)
- `index.js`: TypeORM DataSource configure aur initialize karta hai. PostgreSQL OID 1114 timestamp timezone normalization handle karta hai.
- `entities/`: PostgreSQL table schemas defined via TypeORM entities:
  - `campaign.entity.js`: Main campaign details, country, operator, status, flow type.
  - `campaign-page.entity.js`: Campaign ke individual pages (Landing, OTP, DCB, Thank You) ka HTML/CSS storage.
  - `campaign-tracking.entity.js`: Campaign routing configuration, query parameters, vendor mapping.
  - `vendor.entity.js`: Affiliate vendors/ad networks (e.g. Mobidea, TrafficCompany) jinko traffic send/receive hota hai.
  - `affiliate.entity.js`: Affiliate publishers/sub-affiliates tracking.
  - `conversion-postback.entity.js`: Recorded conversions and outgoing postback URLs with HTTP status codes.
  - `operator.entity.js`: Telecom mobile operators (MCC, MNC, billing rules, currency).
  - `country.entity.js`: Supported countries, dial codes, currency codes.
  - `visit.entity.js`: User click visits (MSISDN, IP, User-Agent, Referrer, Vendor, Campaign).
  - `visit-event.entity.js`: Granular user interaction events (button clicks, form submits, page views).
  - `api-call-log.entity.js`: External Telco/Vendor API requests & responses for audit and debugging.
  - `daily-stat.entity.js`: Aggregated daily traffic & conversion metrics for fast dashboard reporting.
  - `user.entity.js`: Dashboard admin and team members with bcrypt password hash & roles.
  - `template.entity.js`: Pre-built landing page templates for rapid campaign creation.
  - `api-config.entity.js`: Dynamic Telco API gateway configuration (headers, endpoints, auth tokens).
- `migrations/`: Version-controlled database schema migrations.
- `seed/`: Initial database seeds (funnel pages, base operators, admin user).

### 3.4 `backend/src/common/` (Shared Infrastructure)
- `middleware/`:
  - `auth.middleware.js`: JWT token verification for protected dashboard APIs.
  - `error.middleware.js`: Global centralized error handler (JSON formatted response).
  - `rate-limit.middleware.js`: Redis-backed IP rate limiter to mitigate DDoS/spam.
- `guards/`:
  - `roles.guard.js`: Role-based access control (Admin, Manager, Viewer).
- `services/`:
  - `redis.service.js`: Redis connection wrapper, distributed locking (`redlock`), key-value caching.
  - `elasticsearch.service.js`: High-volume log streaming & multi-criteria search queries.
  - `bullmq.service.js`: Redis job queues for asynchronous background tasks.

### 3.5 `backend/src/modules/` (Domain Business Logic)
Backend ek Domain-Driven structure follow karta hai jisme har feature ka dedicated module hai:
```
backend/src/modules/
├── admin/          # System configuration, cache purge, health checks
├── analytics/      # Traffic analytics, funnel drop-off reports, daily stats
├── auth/           # Login, JWT issuance, password reset, token refresh
├── campaigns/      # Campaign management, page linking, vendor assignment, capping
├── flow/           # CORE VAS ENGINE (HE, DCB, OTP, Transitions, Capping)
├── logs/           # Elasticsearch visit & API audit log search
├── markets/        # Country and Operator settings management
├── otp/            # SMS OTP generation, delivery via carriers, PIN verification
├── partners/       # Vendor management, postback dispatching & deduplication
├── search/         # Full-text & structured search service
├── templates/      # Landing page templates library
├── test/           # Mock carrier/telco sandbox endpoints for local testing
├── upload/         # Media upload handling (Cloudinary, AWS S3, Local)
└── users/          # User management (CRUD, permissions)
```

#### Core Highlight: `backend/src/modules/flow/` (VAS Engine)
Ye is project ka heart hai:
- `core/page-resolver.js`: Incoming traffic ke session, operator aur capping check karke correct page decide karta hai.
- `core/capping-fallback.js`: Agar vendor ya campaign ka daily conversion cap hit ho chuka hai toh alternate fallback campaign me redirect karta hai.
- `he/`: **Header Enrichment Detection**. Cellular network headers (X-MSISDN, MSISDN, X-Network-Info) se user ka mobile number extract karta hai.
- `dcb/`: **Direct Carrier Billing**. Telco billing gateways (Orange, Zain, etc.) ke saath communication karta hai.
- `transition/subscribe-route.js`: User ke subscription button click ko process karta hai aur operator ke standard protocol pe route karta hai.
- `checksub-worker/`: Background worker jo carrier se user subscription status verify karta hai.

### 3.6 `backend/scripts/` (DevOps, Testing & Automation)
- `db/setup-db.mjs`: Database create aur migrate karne ki script.
- `db/seed.mjs`: Unified initial seed script (Campaigns, dummy data, vendors).
- `testing/`:
  - `e2e-detect-flow.mjs`: End-to-end HE detection flow tester.
  - `e2e-he-subscribe-flow.mjs`: Subscription conversion simulation.
  - `test-dcb-gateway.js` / `test-universe-dcb.mjs`: Carrier billing mock test scripts.
  - `test-delayed-checksub-e2e.mjs`: Delayed subscription verification queue test.
- `reports/`:
  - `generate-burkina-faso-excel.mjs`, `generate-zain-excel.mjs`, `generate-zain-pdf.mjs`: Automated partner billing/revenue reports generation.

---

## 4. Frontend Deep Dive (`frontend/`)

Frontend ek modern **React 19** Single Page Application hai jo **Vite**, **Tailwind CSS v4**, **Zustand** aur **Vitest** par built hai.

### 4.1 Frontend Directory Structure
```
frontend/src/
├── app/                  # Main entry point, Router setup, Theme & Error Boundary
├── assets/               # Static images, SVG icons, logo
├── components/           # Shared & feature UI components
│   ├── auth/             # Login forms and authentication guards
│   ├── common/           # Error boundaries, modals, image uploaders
│   ├── dashboard/        # Dashboard cards, DCB config modals, capping modals
│   ├── flow/             # @xyflow visual flowchart editor components
│   ├── partners/         # Vendor & affiliate UI widgets
│   └── ui/               # Design-system buttons, inputs, searchable selects
├── context/              # React Context providers (AuthContext, ThemeContext)
├── editor/               # GrapesJS Landing Page Visual Builder (WYSIWYG)
│   ├── blocks/           # Drag-and-drop HTML blocks (forms, CTA, countdown)
│   ├── components/       # Custom GrapesJS custom components
│   ├── hooks/            # Editor canvas hooks (drop positioning, anchor detection)
│   ├── plugins/          # GrapesJS plugins (canvas enhancements, asset upload)
│   ├── services/         # HTML/CSS export and page saving logic
│   ├── shell/            # Editor UI shell (sidebar, property panel, format bar)
│   └── utils/            # Hotspot geometry, button healing, overlay stacking
├── hooks/                # Custom React hooks (debounce, keyboard shortcuts)
├── pages/                # Top-level route pages (see Section 4.2)
├── services/             # API client layer & runtime flow helpers
├── store/                # Zustand global state management
├── styles/               # Global CSS and Tailwind definitions
└── utils/                # Date formatting, clipboard, string helpers
```

### 4.2 Key Frontend Pages (`frontend/src/pages/`)
1. **`DashboardPage.jsx`**: Real-time traffic KPIs (Visits, Clicks, CR%, Revenue, Conversion trends).
2. **`CampaignsPage.jsx` & `CampaignBuilder.jsx`**: New campaign wizard, flow selection, and campaign listing.
3. **`CampaignDetailPage.jsx`**: Individual campaign performance, vendor traffic allocation, and page associations.
4. **`FlowBuilderPage.jsx`**: Visual drag-and-drop canvas (@xyflow) to connect pages and carrier APIs.
5. **`TemplateEditor.jsx` (GrapesJS)**: Full visual page design studio.
6. **`CampaignLogsPage.jsx` & `SessionDetailPage.jsx`**: Real-time click stream inspection with full audit traces.
7. **`PostbacksPage.jsx`, `PostbackDayLogsPage.jsx`, `PostbackDetailPage.jsx`**: Partner conversion attribution, status logs, and manual postback retry.
8. **`MarketsPage.jsx` & `MarketCampaignsPage.jsx`**: Country/operator configurations.
9. **`VendorsPage.jsx`**: Affiliate vendors list, API integration parameters, and postback URLs.
10. **`UsersPage.jsx`**: Internal user management and permission assignments.
11. **`CacheManagementPage.jsx`**: Real-time Redis cache inspection and selective flush.
12. **`subscription/` (Runtime Engine)**: Client-side engine jo live landing page par run hota hai:
    - `he/`: Browser-side HE detection & redirect management.
    - `otp/`: OTP verification form, countdown timer, PIN submit actions.
    - `dcb/`: Direct Carrier Billing redirect handling.
    - `priority/`: Cascading fallback chain execution (DCB $\rightarrow$ OTP $\rightarrow$ Thank You).
    - `interactions/`: Shadow bot traps and anti-fraud interaction handlers.

### 4.3 State Management (`frontend/src/store/`)
- Uses **Zustand** for lightweight, non-boilerplate reactive state.
- `campaignSlice.js`: Currently loaded campaign data, active pages, and draft edits.
- `partnersSlice.js`: Vendors and affiliates cache.
- `uiSlice.js`: Sidebar toggle, active modals, and notification alerts.
- `adapters/persistence.js`: LocalStorage auto-save integration for draft changes.

---

## 5. Other Key Directories

- **`deploy/nginx/`**: Production Nginx configuration templates for reverse proxying traffic between frontend static assets, backend API, and live landing page traffic.
- **`docs/`**: Detailed engineering plans:
  - `FLOW-ARCHITECTURE.md`: High-level VAS transaction lifecycles.
  - `HE-DETECT-FLOW-ARCHITECTURE.md`: Telco cellular header detection specs.
  - `CALLBACK-DEDUPLICATION-PLAN.md`: Affiliate postback anti-duplication algorithms.
  - `SAFARICOM_HE_SETUP_GUIDE.md`: Safaricom Kenya integration guide.
- **`logs/`**: Morgan daily access logs stored with timestamped filenames for compliance and analytics audits.

---

## 6. Architectural Evaluation: Is There a Better Structure?

### Current Architecture Strengths:
1. **Clean Separation of Backend Services**: Har backend module (controller $\rightarrow$ service $\rightarrow$ repository) under 300 LOC limit me modularized hai.
2. **High Test Coverage**: Frontend ke pass 21 Vitest test suites (97 tests) aur E2E Playwright setup available hai.
3. **Decoupled Editor**: GrapesJS canvas editor completely isolate hai standard dashboard pages se.

### Current Architecture Bottlenecks / Pain Points:
1. **Single Git Repo Without Monorepo Tooling**: Frontend aur Backend ek hi repository me do alag alag `package.json` ke saath hain, lekin pnpm-workspaces ya Turborepo nahi hai. Iski wajah se types, DTOs, validation schemas aur Telco constants frontend aur backend ke beech duplicate likhne padte hain.
2. **Co-located Admin & High-Traffic Runtime**: Telco VAS traffic (HE redirects, click logs, postbacks) bohot high RPS (Requests Per Second) handle karta hai. Current setup me wahi Express instance admin dashboard requests (heavy SQL queries, Excel exports) bhi serve karta hai. Admin heavy query chalane par live carrier redirects slow ho sakte hain.
3. **Plain JavaScript vs Type Safety**: Backend plain ES Modules me hai. Telco payload mismatch hone par runtime error aane ke chances rehte hain agar TypeScript or shared schema validation na ho.

---

## 7. Recommended Future Architecture Options

```
                   RECOMMENDED MONOREPO ARCHITECTURE
                   
                               pnpm / Turborepo
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
   apps/admin-web               apps/traffic-engine          apps/worker
  (React 19 Admin)             (Fastify / Hono Node)         (BullMQ / Jobs)
  - Dashboard KPIs             - Sub-millisecond HE          - Postback Retries
  - GrapesJS Editor            - DCB / OTP Routing           - Delayed Checksub
  - Campaign Flow Builder      - Click Tracking / Macros     - Elastic Bulk Ingest
         │                            │                            │
         └────────────────────────────┼────────────────────────────┘
                                      │
                          packages/ (Shared Code)
              ┌───────────────────────┴───────────────────────┐
              │                                               │
       packages/types-contracts                        packages/ui-components
       - Shared Zod Schemas                            - Shared Design System
       - Carrier Status Enums                          - UI Atoms & Icons
       - API Request/Response DTOs
```

### Option A: Modern Monorepo (Turborepo + pnpm workspaces) — *Highly Recommended*
- **`apps/traffic-engine`**: Ek ultra-lightweight Node.js (Fastify ya Hono) service jo sirf live subscriber traffic, HE redirects aur conversion clicks handle kare (zero admin bloat, sub-10ms response time).
- **`apps/admin-web`**: React dashboard jo marketers aur operations team use karti hai.
- **`apps/worker`**: Dedicated background worker container jo heavy tasks (Elasticsearch batch sync, partner Excel reports, carrier checksub polling) handle kare bina main API ko affect kiye.
- **`packages/types-contracts`**: Ek shared TypeScript/Zod package jo single source of truth ho carrier payloads aur API contracts ke liye.

### Option B: Feature-Sliced Design (FSD) for Frontend
Frontend me current `pages/` aur `components/` ko domain feature groups me consolidate kiya ja sakta hai:
```
frontend/src/
├── app/                  # Providers, routing, global styles
├── features/             # Business capabilities
│   ├── campaign-wizard/  # UI, hooks, api, state for creating campaigns
│   ├── flow-builder/     # @xyflow nodes, edges, connections
│   ├── page-editor/      # GrapesJS studio, custom blocks, property panel
│   ├── live-subscriber/  # HE, DCB, OTP client runtime logic
│   ├── postback-tracker/ # Postbacks, day logs, retry modals
│   └── traffic-analytics/# KPI charts, filters, session inspector
├── entities/             # Campaign, Vendor, Operator UI cards and models
└── shared/               # Base UI kit, Axios client, utility helpers
```

---

## Summary
Current structure already well-refactored, robust aur test-backed hai. Lekin scale aur Telco performance ke hisaab se **Turborepo Monorepo with separated Traffic Engine & Shared Contracts** iska ideal long-term evolution hoga.
