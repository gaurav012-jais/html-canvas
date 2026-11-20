# Execution Order — Phased Refactor Plan

> Part of [00-OVERVIEW.md](./00-OVERVIEW.md)

---

## Pehle Yeh Samjho

Yeh refactor **behavior nahi badlega** — sirf code organization badlegi.
Har phase ke baad app run karke test karo.

**Estimated Total Effort:** 4–6 weeks (ek developer, part-time)

---

## Phase 0 — Cleanup (1–2 days) 🧹

Sirf delete aur rename. Koi logic change nahi.

### Tasks:

- [x] `backend/src/modules/flow/helpers/Screenshot 2026-08-19 at 1.21.51 PM.pdf` **DELETE KARO**
- [x] `frontend/src/pages/CampaignDetailPage.jsx` (old duplicate) **DELETE KARO**
- [x] `frontend/src/editor/shell/DragDebugOverlay.jsx` — check karo, agar unused hai DELETE karo
- [x] `backend/seed_dummy.js`, `seed_proper_campaign.js`, `seed_vendors.js` → `backend/scripts/db/` mein move karo
- [x] `backend/scripts/` reorganize karo (db/, reports/, testing/, debug/ folders)
- [x] `.prettierrc` run karo — sab files format karo consistently

### Test After:

```bash
cd backend && node src/server.js
cd frontend && npm run dev
# App run hona chahiye — koi behavior change nahi
```

---

## Phase 1 — Database Cleanup (3–5 days) 🗄️

**Sabse safe phase — sirf `database/index.js` clean karo**

### Tasks:

#### [x] 1.1 — `database/index.js` Ke `ensure*` Functions Remove Karo

**Before:** 763 lines with 25 `ensure*` functions
**After:** ~88 lines with `dataSource.runMigrations()` and `migrations/index.js`

Steps:

1. [x] Check karo ki sab `ensure*` functions ke corresponding migrations exist karte hain
2. [x] `runMigrations()` enable karo (all 29 migrations in `migrations/index.js`)
3. [x] Dev/local DB pe test karo (verified with `test-delayed-checksub-e2e.mjs` and server boot)
4. [x] `ensure*` functions remove karo (794 lines -> 88 clean lines)
5. [x] App restart karo — schema same rehna chahiye (verified clean server boot and DB connection)

#### [x] 1.2 — Entity Files Mein JSDoc Add Karo

Har entity file mein field descriptions add karo:
- [x] `campaign.entity.js`
- [x] `campaign-page.entity.js`
- [x] `campaign-tracking.entity.js`
- [x] `api-config.entity.js`
- [x] `template.entity.js`
- [x] `visit.entity.js`
- [x] `visit-event.entity.js`
- [x] `conversion-postback.entity.js`
- [x] `api-call-log.entity.js`
- [x] `daily-stat.entity.js`
- [x] `country.entity.js`
- [x] `operator.entity.js`
- [x] `vendor.entity.js`
- [x] `affiliate.entity.js`
- [x] `user.entity.js`

#### [x] 1.3 — Seed Files Organize Karo

Move root-level seeds:

```
backend/seed_dummy.js        → scripts/db/seed-dummy.mjs (plus seed_dummy.js & root shims)
backend/seed_proper_campaign.js → scripts/db/seed-campaign.mjs (plus seed_proper_campaign.js & root shims)
backend/seed_vendors.js      → scripts/db/seed-vendors.mjs (plus seed_vendors.js & root shims)
```

[x] Add `scripts/README.md`.

### Test After:

```bash
cd backend && node src/server.js
# DB connected hona chahiye, all APIs working
```

---

## Phase 2 — Backend Module Split (2–3 weeks) 🔧

**Highest impact, highest effort phase.**

### [x] 2.1 — `otp.service.js` Split (COMPLETED)

Yeh sabse urgent hai — 1420 lines!
- Extracted `backend/src/modules/otp/send/send.service.js`
- Extracted `backend/src/modules/otp/verify/verify.service.js`
- Extracted `backend/src/modules/otp/helpers/expose-common.js`
- Slimmed `otp.service.js` down from 1420 lines to 44 lines delegation facade.

### [x] 2.2 — `flow/` Module Reorganize (COMPLETED)

- Created `core/` (`engine.js`, `page-resolver.js`, `page-response.js`)
- Created `detect/` (`detect.service.js`, `he-gate.js`, `priority.js`)
- Created `transition/` (`transition.js`, `home.js`, `confirm.js`, `confirm-otp.js`, `otp.js`, `subscribe-route.js`)
- Created `routing/` (`routing.js`, `checksub-rules.js`, `funnel-layout.js`)
- Backward-compatible shims maintained in `helpers/` to ensure zero breakage.

### [x] 2.3 — `campaigns.service.js` Split (COMPLETED)

- Created `campaigns/services/campaign-crud.service.js`
- Created `campaigns/services/campaign-pages.service.js`
- Created `campaigns/services/campaign-cache.service.js`
- Created `campaigns/services/campaign-api-config.service.js`
- Slimmed `campaigns.service.js` down from 981 lines to ~72 lines delegation facade.

### [x] 2.4 — `partners/helpers/` Rename (COMPLETED)

Clean aliases and shims created:
```
postback-register.js → register.js
postback-forward.js → forward.js
postback-callback.js → callback.js
postback-query.js → query.js
postback-template.js → template.js
postback-day-report.js → day-report.js
postback-day-report-file.js → report-file.js
```

---

## Phase 3 — Frontend Pages (1–2 weeks) 🖥️

### [x] 3.1 — Subscription Page Refactor (COMPLETED)

- [x] `useFlowState.js` banao (sab 23 refs centralize kiye)
- [x] `useFlowBoot.js` extract karo (boot logic from `useFlowPages`)
- [x] `usePageCache.js` extract karo (cache + prefetch from `useFlowPages`)
- [x] `useUrlSync.js` extract karo (URL sync & redirect effects from `useFlowPages`)
- [x] `SubscriptionPage.jsx` clean karo — hook delegation and refs simplification

### [x] 3.2 — CampaignDetailPage Split (COMPLETED)

- [x] `CampaignHeader.jsx` extract kiya (name editing, active toggle, breadcrumbs, incompleteness badges)
- [x] `CampaignDetailPage.jsx` clean kiya (reduced from 685 lines to ~480 lines)

### [x] 3.3 — CampaignApiConfigModal Split (COMPLETED)

Modal ke tabs ko dedicated components mein split kiya:
- [x] `api-config/tabs/HeConfigTab.jsx`
- [x] `api-config/tabs/DcbConfigTab.jsx`
- [x] `api-config/tabs/OtpConfigTab.jsx`
- [x] `api-config/tabs/ChecksubConfigTab.jsx`
- [x] `CampaignApiConfigModal.jsx` slimmed from 1720 lines to 680 lines.

---

## Phase 4 — Editor Refactor (1 week) 🎨

### [x] 4.1 — `TemplateEditor.jsx` Split (COMPLETED)

Steps:

1. [x] `hooks/` folder banao (`frontend/src/editor/hooks/`)
2. [x] `useEditorInit.js` extract karo (GrapesJS init, block registration, plugins, event handling)
3. [x] `useEditorSave.js` extract karo (save, preview, publish, export, dirty state)
4. [x] `useEditorLoad.js` extract karo (template loading, staged timeouts, asset restoration)
5. [x] `useDeviceLayout.js` extract karo (device layouts, dimensions, layout cloning, frame height)
6. [x] `TemplateEditor.jsx` clean karo (reduced from 1066 lines to 130 lines orchestrator)

---

## Phase 5 — Store & Services (3–4 days) 🏪

### [x] 5.1 — `useStore.js` Clean Karo (COMPLETED)

1. [x] Metrics defaults streamlined in `useStore.js`
2. [x] localStorage subscription → `persistence.js` mein move kiya (`setupSettingsPersistence`)
3. [x] `logError` function → `uiSlice.js` mein move kiya

### [x] 5.2 — `dcb.js` aur `dcbExpose.js` Merge Karo (COMPLETED)

Ek file: `services/api/dcb.js` (with backwards compatibility re-export shim in `dcbExpose.js`)

### [x] 5.3 — `analytics.js` + `googleAds.js` Merge Karo (COMPLETED)

Ek file: `utils/tracking.js` (with backwards compatibility re-export shims in `analytics.js` and `googleAds.js`)

### [x] 5.4 — Flow services audit (COMPLETED)

`services/flow/` verified for shared use across subscription and editor modules.

---

## Phase 6 — Documentation (Ongoing) 📚

### [x] `docs/` Folder Banao (Backend) (COMPLETED)

```
backend/docs/
├── ARCHITECTURE.md      ← Module map + data flow diagram
├── FLOW.md              ← Subscription flow explanation
├── API.md               ← Endpoints reference
├── DATABASE.md          ← Schema documentation
└── DEPLOYMENT.md        ← How to deploy
```

### Code Comments Standard

```js
// ✅ GOOD — WHY explain karo
// Redis cache disable karo dev mein kyunki local Redis often unavailable hoti hai
if (config.environment !== 'production') {
  cache.disable()
}

// ❌ BAD — WHAT explain karna useless hai (code khud bata raha hai)
// Disable cache
if (config.environment !== 'production') {
  cache.disable()
}
```

---

## Git Strategy

**Har phase ke liye alag branch:**

```bash
git checkout -b refactor/phase-0-cleanup
git checkout -b refactor/phase-1-database
git checkout -b refactor/phase-2-backend
git checkout -b refactor/phase-3-frontend
git checkout -b refactor/phase-4-editor
git checkout -b refactor/phase-5-store
```

**Commit convention:**

```
refactor: otp.service.js → send + verify split
refactor: flow helpers → core/detect/transition/routing
chore: delete debug PDF from source code
docs: add JSDoc to campaign entity
```

bhai isko karne ke baad tum abhi github pe push mat karna code ko aur ho sakte toh main branch ko touch bhi mat karna kueki vo important h

**Never mix refactor with feature work** — alag PR, alag branch.

---

## Quick Wins (Sirf 1 Din Ka Kaam, Big Visual Impact)

Yeh sab karo pehle agar bada refactor start nahi kar rahe:

1. **PDF Delete** — `flow/helpers/Screenshot...pdf` hatao (1 min)
2. **Prettier Run** — Formatting consistent karo (10 min)
3. **Dead Code Hunt:**
   ```bash
   # Unused exports find karo
   npx ts-unused-exports tsconfig.json
   # Ya manually:
   grep -r "DragDebugOverlay" frontend/src/
   ```
4. **Rename `priority.controller.js`** → `priority.js` (5 min)
5. **Add `README.md` to `backend/scripts/`** (30 min)
6. **JSDoc `otp.service.js` exported functions** — at least describe what each does (1 hour)

---

## Success Metrics

Refactor complete hone ke baad:

| Metric                        | Before                 | Target                         |
| ----------------------------- | ---------------------- | ------------------------------ |
| Largest file (backend)        | 1420 lines             | <300 lines                     |
| Largest file (frontend)       | 973 lines              | <300 lines                     |
| Flow module file count        | 55 files in one folder | Organized in 7 sub-folders     |
| `database/index.js`         | 763 lines              | <100 lines                     |
| `useFlowPages.js`           | 400+ lines             | <150 lines                     |
| `SubscriptionPage.jsx` refs | 24 refs                | <5 refs (rest in useFlowState) |
| New developer onboarding      | "Where do I start?"    | README + docs/ folder          |
