# WAP Manager — Frontend Refactoring & Component Modularization Plan

> **Scope:** `frontend/src` (277 files, 50,459 LOC)  
> **Tech Stack:** React 19, Vite, Tailwind CSS v4, Zustand, Lucide React, GrapesJS  
> **Target:** Giant Monolithic Page Components & GrapesJS Bloat ko Modular, Reusable, Readable Components me convert karna.

---

## 1. Frontend Current State Analysis

Frontend me 277 files hain jisme se **4 primary areas** developers ke liye unmaintainable ban chuke hain:
1. **The 1,900-line Template Dump:** `frontend/src/editor/templates/starterTemplates.js` me 1,905 lines ka raw HTML, CSS, aur component JSON structure hardcoded hai.
2. **The 1,300-line DOM Stacking Math:** `frontend/src/editor/utils/overlayStacking.js` me 1,293 lines ka complex z-index, drag-and-drop coordinate math, aur DOM attribute synchronization ek single file me hai.
3. **Monolith View Pages (> 900 lines):**
   - `PostbackDayLogsPage.jsx` (**1,191 lines** in a single file!)
   - `PostbacksPage.jsx` (**905 lines** in a single file!)
   - `CacheManagementPage.jsx` (**684 lines**)
4. **Subscription Runtime Spaghetti:** `pages/subscription/` ke andar `setupOtpBindings.js` (737 lines), `useHeDetect.js` (570 lines), aur `setupDcbBindings.js` (514 lines) me DOM events, shadow DOM traversal, aur billing API polling intertwined hain.

---

## 2. File-by-File Audit: Files to Refactor vs Files to Keep Clean

### A. High Priority Frontend Files That MUST Be Refactored (> 300 LOC)

| File Path | Current LOC | Major Issue | Proposed Modularization Plan |
| :--- | :--- | :--- | :--- |
| `frontend/src/editor/templates/starterTemplates.js` | **1,905 lines** | 6+ full landing page templates hardcoded in one JS object | Split into individual template JSON/JS files under `templates/presets/` |
| `frontend/src/editor/utils/overlayStacking.js` | **1,293 lines** | Z-index math, hotspot tracking, GrapesJS drag protection mixed | Split into: `stacking-math.js`, `hotspot-tracker.js`, `drag-guard.js` |
| `frontend/src/pages/PostbackDayLogsPage.jsx` | **1,191 lines** | Single component managing filters, chart, table, story modal, CSV export | Split into Page container (< 150 LOC) + 5 child components + 1 custom hook |
| `frontend/src/pages/PostbacksPage.jsx` | **905 lines** | Giant table with multiple inline action modals, stats cards, and query sync | Split into `PostbacksTable.jsx`, `PostbacksFilterBar.jsx`, `PostbacksStats.jsx` |
| `frontend/src/components/flow/CampaignFlowBuilder.jsx` | **810 lines** | React Flow node rendering, canvas controls, node configuration modal | Split into `FlowCanvas.jsx`, `FlowNodeTypes.jsx`, `FlowConfigSidebar.jsx` |
| `frontend/src/pages/subscription/setupOtpBindings.js` | **737 lines** | Shadow DOM input binding, countdown timer, resend button, validation | Split into `otp-input-binder.js`, `otp-timer.js`, `otp-resend.handler.js` |
| `frontend/src/components/dashboard/dcbConfig.js` | **689 lines** | Huge carrier config form validation, header maps, purchase types | Split into sub-configs per carrier type |
| `frontend/src/components/dashboard/CampaignApiConfigModal.jsx` | **685 lines** | Huge multi-tab modal for HE, DCB, CheckSub, and Capping configs | Modularize into individual tab components |
| `frontend/src/pages/CacheManagementPage.jsx` | **684 lines** | Redis keys inspect, purge, flush, TTL inspect all inline | Extract Redis table and action modals into separate sub-components |
| `frontend/src/editor/plugins/canvasEnhancements.js` | **652 lines** | GrapesJS custom commands and canvas hooks | Split into dedicated plugin feature modules |
| `frontend/src/pages/campaignLogs/logConstants.js` | **637 lines** | Hardcoded log schemas and mock definitions | Extract schemas into structured config files |
| `frontend/src/editor/utils/textSizeAlign.js` | **590 lines** | Font-size and responsive text align DOM mutation | Separate pure CSS property helpers from DOM listeners |
| `frontend/src/pages/campaignDetail/CampaignDetailPage.jsx` | **576 lines** | Campaign stats, overview tabs, flow previews inline | Split into `CampaignHeader.jsx`, `CampaignStatsTab.jsx`, `CampaignFlowTab.jsx` |
| `frontend/src/pages/subscription/useHeDetect.js` | **570 lines** | Header enrichment detection, carrier polling, IP fallback | Split into `useCarrierDetection.js` and `useRedirectFallback.js` |
| `frontend/src/editor/shell/propertyPanel/ClickActionEditor.jsx` | **567 lines** | Complex action trigger dropdowns and conditional inputs | Split into action type sub-editors |
| `frontend/src/components/dashboard/api-config/flows/OrangeBfTab.jsx` | **555 lines** | Orange Burkina Faso carrier specific form | Extract validation and XML/Header inputs |
| `frontend/src/pages/subscription/setupDcbBindings.js` | **514 lines** | DCB consent button and modal injection | Split into `dcb-button.binder.js` and `dcb-modal.binder.js` |
| `frontend/src/services/api/otp.js` | **509 lines** | 15+ different OTP endpoints and payload transformers | Split into `otp-client.js` and `otp-transformers.js` |

---

### B. Clean Files That Are ALREADY Well-Structured (DO NOT CHANGE)

Following components and utilities are clean (< 150 lines), follow single-responsibility, and need NO changes:

- `frontend/src/components/ui/Button.jsx` (42 lines) — Clean reusable button component.
- `frontend/src/components/ui/EmptyState.jsx` (35 lines) — Reusable empty state view.
- `frontend/src/components/ui/AppShell.jsx` (94 lines) — Standard dashboard layout & nav.
- `frontend/src/components/ui/Card.jsx` (~40 lines) — Simple layout card wrapper.
- `frontend/src/store/useStore.js` (38 lines) — Root Zustand store aggregator.
- `frontend/src/store/slices/uiSlice.js` (43 lines) — UI theme and sidebar state.
- `frontend/src/store/adapters/persistence.js` (27 lines) — LocalStorage adapter.
- `frontend/src/services/api/admin.js` (27 lines) — Clean admin API client.
- `frontend/src/services/api/auth.js` (43 lines) — Auth endpoints.
- `frontend/src/services/api/users.js` (34 lines) — Users endpoints.
- `frontend/src/services/api/markets.js` (37 lines) — Market and country endpoints.
- `frontend/src/services/api/upload.js` (44 lines) — File upload endpoint.
- `frontend/src/pages/subscription/constants.js` (36 lines) — Pure constants.
- `frontend/src/pages/subscription/SubscriptionOverlays.jsx` (79 lines) — Clean overlay renderer.
- `frontend/src/pages/subscription/useFlowState.js` (76 lines) — Focused state hook.
- `frontend/src/pages/subscription/usePageCache.js` (72 lines) — Cache hook.
- `frontend/src/pages/subscription/useUrlSync.js` (72 lines) — Search params sync hook.

---

## 3. Deep-Dive Decomposition Plans

### Decomposition 1: `PostbackDayLogsPage.jsx` (1,191 lines ➔ 5 clean files)

```
CURRENT:
frontend/src/pages/PostbackDayLogsPage.jsx (1,191 lines)

TARGET:
frontend/src/pages/postback-day-logs/
├── index.jsx                         (< 120 lines - Main page container & layout)
├── hooks/
│   └── useDayLogsQuery.js            (< 160 lines - API fetching, filters & pagination)
└── components/
    ├── DayLogsFilterBar.jsx          (< 140 lines - Filter dropdowns, search, date range)
    ├── DayLogsMetricsCards.jsx       (< 100 lines - Received, fired, conversion cards)
    ├── DayLogsHitTable.jsx           (< 220 lines - Datewise hits data table)
    ├── DayLogsNumberTable.jsx        (< 200 lines - MSISDN grouped table)
    └── NumberStoryModal.jsx          (< 180 lines - MSISDN timeline modal dialog)
```

---

### Decomposition 2: `starterTemplates.js` (1,905 lines ➔ Isolated Preset Files)

```
CURRENT:
frontend/src/editor/templates/starterTemplates.js (1,905 lines with giant inline strings)

TARGET:
frontend/src/editor/templates/
├── index.js                          (< 60 lines - Template registry & export list)
├── presets/
│   ├── spin-wheel.template.js        (< 250 lines - Spin wheel landing page)
│   ├── video-player.template.js      (< 250 lines - Video content locker funnel)
│   ├── download-ready.template.js    (< 200 lines - APK/App download funnel)
│   ├── clean-lander.template.js      (< 200 lines - Minimalist 1-click offer)
│   └── sweepstakes.template.js       (< 250 lines - Sweepstakes / voucher funnel)
└── utils/
    └── template-injector.js          (< 100 lines - Injects CSS/HTML into GrapesJS)
```

---

### Decomposition 3: `CampaignFlowBuilder.jsx` (810 lines ➔ Focused Flow Modules)

```
CURRENT:
frontend/src/components/flow/CampaignFlowBuilder.jsx (810 lines)

TARGET:
frontend/src/components/flow/builder/
├── CampaignFlowBuilder.jsx           (< 140 lines - Canvas container & toolbar)
├── FlowCanvas.jsx                    (< 180 lines - React Flow component & zoom)
├── nodes/
│   ├── FlowStepNode.jsx              (< 120 lines - Visual step node with status)
│   └── FlowConditionNode.jsx         (< 110 lines - HE / DCB / OTP branch node)
└── modals/
    └── FlowNodeConfigModal.jsx       (< 180 lines - Edit step actions & URLs)
```

---

## 4. Frontend Coding Standards & Guardrails
1. **The 250-Line Component Limit:** No React `.jsx` file should exceed 250 lines. Any component exceeding 250 lines must be split into sub-components or custom hooks.
2. **Logic Extraction into Hooks:** Data fetching, `useEffect` hooks, URL sync, and complex calculations must live in `hooks/use[Feature].js`, leaving `.jsx` files purely for visual rendering.
3. **No Inline Giant Static Data:** HTML templates, mock payloads, and huge constant arrays must be moved to dedicated asset/preset files.
