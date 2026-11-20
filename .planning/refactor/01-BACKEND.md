# Backend Refactor Plan
> Part of [00-OVERVIEW.md](./00-OVERVIEW.md)

---

## Sabse Badi Problems (Backend)

### 1. `otp.service.js` — 1420 Lines Ki God File
Yeh file abhi kya kya karti hai:
- OTP send karna (rate limiting ke saath)
- OTP verify karna
- Subscription conversion trigger karna
- Payout calculation
- Approval control logic
- SMS provider selection
- Visit state update

**Yeh sab alag alag services mein hone chahiye.**

### 2. `database/index.js` — 763 Lines Ki Migration Dump
Real `migrations/` folder alag hai, lekin `initDatabase()` function mein 25+ inline `ensure*` functions hain. Dono jagah schema define ho raha hai.

### 3. `flow/` Module — 55 Files
`flow/helpers/` mein 30+ files hain. Alag alag flows (Both, OtpOnly, OrangeBf, UniverseDcb) ka logic helpers se alag nahi dikhta.

### 4. `partners/helpers/` — Postback Logic Bikhra Hua Hai
5 alag helper files hain: register, forward, callback, query, template. Yeh sab achhe se split hain lekin naming confusing hai.

---

## Module-by-Module Plan

### 🔴 `modules/flow/` — HIGH PRIORITY

**Current Structure (Confusing):**
```
flow/
├── flow.controller.js      (200+ lines, too many imports)
├── flow.service.js         (factory pattern — deps waterfall)
├── flow-engine.service.js
├── flow.routes.js
├── partner-api.service.js
├── universe-dcb.service.js
├── universe-dcb-expose.service.js
├── orange-bf.service.js
├── orange-bf-expose.service.js
├── flows/
│   ├── Both.js, Classic.js, CgHome.js ... (flow strategies)
│   └── index.js
└── helpers/              ← 30 files, mixed concerns
    ├── transition.js     ← page transition orchestrator
    ├── routing.js        ← next-page resolution
    ├── detect.js         ← HE detect logic
    ├── get-page.js
    ├── visit.js
    ├── campaign.js
    ├── page-response.js
    ├── pack-url.js
    ├── funnel-layout.js
    ├── start-config.js
    ├── checksub-rules.js
    ├── click-id.js
    ├── placeholder-macro.js
    ├── request.util.js
    ├── priority.controller.js  ← controller in helpers?!
    ├── transition-home.js
    ├── transition-confirm.js
    ├── transition-confirm-otp.js
    ├── transition-otp.js
    ├── transition-subscribe-route.js
    ├── universe-dcb-*.js (4 files)
    ├── orange-bf-normalizer.js
    ├── cg-redirect-log.js
    ├── he-detect-gate.js
    ├── dcb-expose-*.js (3 files)
    └── Screenshot 2026-08-19 ← PDF FILE IN SOURCE CODE 🤦
```

**New Structure:**
```
flow/
├── flow.routes.js              (paths only, no logic)
├── flow.controller.js          (thin HTTP layer, max 150 lines)
├── flow.service.js             (public API — compose karo sub-services se)
│
├── core/                       (flow engine — page graph)
│   ├── engine.js               (renamed from flow-engine.service.js)
│   ├── page-resolver.js        (get-page.js + get-page helpers)
│   └── page-response.js        (unchanged)
│
├── detect/                     (MSISDN / HE detection)
│   ├── detect.service.js       (detect.js ka clean version)
│   ├── he-gate.js              (he-detect-gate.js)
│   └── priority.js             (priority.controller.js — rename, not a controller)
│
├── transition/                 (Page transitions — user actions)
│   ├── transition.js           (orchestrator — unchanged)
│   ├── home.js                 (transition-home.js)
│   ├── confirm.js              (transition-confirm.js)
│   ├── confirm-otp.js          (transition-confirm-otp.js)
│   ├── otp.js                  (transition-otp.js)
│   └── subscribe-route.js      (transition-subscribe-route.js)
│
├── routing/                    (Next-page resolution logic)
│   ├── routing.js              (unchanged but moved)
│   ├── checksub-rules.js       (unchanged)
│   └── funnel-layout.js        (unchanged)
│
├── strategies/                 (Flow type configs — renamed from flows/)
│   ├── index.js
│   ├── both.strategy.js        (Both.js → both.strategy.js)
│   ├── otp-only.strategy.js
│   ├── cg-home.strategy.js
│   ├── header-injection.strategy.js
│   ├── none.strategy.js
│   ├── orange-bf.strategy.js
│   └── universe-dcb.strategy.js
│
├── operators/                  (Operator-specific: OrangeBf, UniverseDcb)
│   ├── universe-dcb/
│   │   ├── service.js
│   │   ├── expose.service.js
│   │   ├── normalizer.js
│   │   ├── purchase-types.js
│   │   └── runtime.js
│   └── orange-bf/
│       ├── service.js
│       ├── expose.service.js
│       └── normalizer.js
│
└── utils/                      (Pure helpers — no side effects)
    ├── campaign.js
    ├── click-id.js
    ├── pack-url.js
    ├── placeholder-macro.js
    ├── request.util.js
    ├── start-config.js
    ├── visit.js
    ├── cg-redirect-log.js
    └── dcb-expose.js           (3 files merge karo)
```

> **IMPORTANT:** `Screenshot 2026-08-19 at 1.21.51 PM.pdf` ko delete karo — source code mein PDF file ka koi kaam nahi.

---

### 🔴 `modules/otp/` — HIGH PRIORITY (1420 lines!)

**Abhi `otp.service.js` mein yeh sab hai:**

```js
// Line 1-100: Imports + constants
// Line 100-300: Rate limiting + send limit checks
// Line 300-600: OTP send logic (3 providers)
// Line 600-900: OTP verify + subscription trigger
// Line 900-1100: Conversion logging
// Line 1100-1420: Misc helpers + approval control
```

**New Structure:**
```
otp/
├── otp.routes.js              (unchanged — paths only)
├── otp.controller.js          (thin HTTP layer)
├── otp.service.js             (PUBLIC API — max 150 lines, delegates only)
│
├── send/
│   ├── send.service.js        (OTP send orchestration)
│   └── send-limit.js          (rate limit checks — already exists, keep)
│
├── verify/
│   ├── verify.service.js      (OTP verify + subscription trigger)
│   └── conversion.js          (already exists — keep)
│
├── providers/
│   ├── sms-provider.interface.js  (unchanged)
│   ├── sms-provider.manager.js    (unchanged)
│   └── partner.provider.js        (unchanged)
│
└── helpers/
    ├── approval-control.js    (already exists — keep)
    ├── expose-visit.js        (already exists — keep)
    ├── failure-reason.js      (already exists — keep)
    └── payout.js              (already exists — keep)
```

**`otp.service.js` refactor example:**
```js
// BEFORE (1420 lines — sab kuch ek file mein):
export const otpService = {
  async sendOtp(params) { /* 200 lines */ },
  async verifyOtp(params) { /* 300 lines */ },
  async triggerConversion(params) { /* 200 lines */ },
  // ... 700 more lines
}

// AFTER (max 80 lines — sirf delegation):
import { sendOtp } from './send/send.service.js'
import { verifyOtp } from './verify/verify.service.js'
import { isVisitOtpVerified } from './verify/verify.service.js'

export const otpService = { sendOtp, verifyOtp, isVisitOtpVerified }
```

---

### 🟡 `modules/partners/` — MEDIUM PRIORITY

Yahan structure acha hai lekin naming confusing hai:

| Current Name | Kya Karta Hai | New Name |
|---|---|---|
| `postback.service.js` | Facade only | Same (theek hai) |
| `helpers/postback-register.js` | Postback create + index karo | `helpers/register.js` |
| `helpers/postback-forward.js` | HTTP fire karo | `helpers/forward.js` |
| `helpers/postback-callback.js` | Operator callback process | `helpers/callback.js` |
| `helpers/postback-query.js` | List/filter/report | `helpers/query.js` |
| `helpers/postback-template.js` | URL template fill | `helpers/template.js` |
| `helpers/postback-day-report.js` | Day report generate | `helpers/day-report.js` |
| `helpers/postback-day-report-file.js` | PDF/Excel export | `helpers/report-file.js` |
| `helpers/report-filters.js` | Filter parsing | Same |
| `helpers/operator-callback-status.js` | Status mapping | Same |

---

### 🟡 `modules/campaigns/` — MEDIUM PRIORITY

`campaigns.service.js` (981 lines) — split karna hai:

```
campaigns/
├── campaigns.routes.js         (unchanged)
├── campaigns.controller.js     (unchanged)
├── campaigns.service.js        (max 200 lines — public API + delegates)
│
├── services/
│   ├── campaign-crud.service.js      (create, update, delete, find)
│   ├── campaign-pages.service.js     (pages save, default funnel, template apply)
│   ├── campaign-tracking.service.js  (tracking assignments, vendor caps)
│   └── campaign-cache.service.js     (Redis cache invalidation)
│
└── validators/
    └── campaign.validator.js          (input validation — currently inline)
```

---

### 🟢 `modules/analytics/` — LOW PRIORITY

Already reasonably split. Just needs:
- Rename `analytics.controller.js` exports to be more descriptive

---

### 🟢 `modules/auth/` — LOW PRIORITY
Clean enough. No changes needed.

---

### 🟢 `modules/markets/` — LOW PRIORITY
Clean. No changes needed.

---

## Common Files Cleanup

### `src/common/`
```
common/
├── middleware/
│   ├── auth.middleware.js          (unchanged)
│   ├── error.middleware.js         (unchanged)
│   └── asyncHandler.js            (unchanged)
├── guards/
│   └── public-rate-limit.guard.js (unchanged)
└── services/
    ├── redis.service.js            (unchanged)
    └── variable-resolver.service.js (unchanged)
```
Yeh already achha hai. Bas `admin.js` aur `zoned-day.js` ko proper JSDoc milne chahiye.

---

## JSDoc Standards (Backend Ke Liye)

Har exported function pe yeh format follow karo:

```js
/**
 * OTP send karo user ke phone pe.
 * Rate limit check karta hai, provider select karta hai, DB mein log karta hai.
 *
 * @param {object} params
 * @param {string} params.phone - E.164 format phone number
 * @param {number} params.campaignId
 * @param {string} params.visitId
 * @returns {Promise<{ sent: boolean, requestId: string }>}
 * @throws {Error} 429 - Rate limit exceeded
 * @throws {Error} 503 - SMS provider unavailable
 */
export async function sendOtp(params) { ... }
```

---

## Scripts Folder Cleanup

`backend/scripts/` mein 20+ scattered scripts hain. These should be:

```
backend/scripts/
├── README.md           ← Har script ka purpose document karo
├── db/
│   ├── setup.mjs       (setup-db.mjs)
│   └── reset.mjs       (reset-otp-local.mjs)
├── reports/
│   ├── generate-zain-excel.mjs
│   ├── generate-zain-pdf.mjs
│   └── generate-burkina-faso-excel.mjs
├── testing/
│   ├── e2e-detect-flow.mjs
│   ├── e2e-he-subscribe-flow.mjs
│   ├── e2e-start-config-flow.mjs
│   ├── test-apis.mjs
│   ├── test-dcb-gateway.js
│   └── test-dcb-manual.mjs
└── debug/
    ├── inspect-camp33.mjs
    ├── inspect-conversions.mjs
    └── reset-camp33-dcb.mjs
```

> **Delete kar do:** `migrate-dcb-confirm-endpoint.js` (already applied), `seed_dummy.js`, `seed_proper_campaign.js`, `seed_vendors.js` (move to `scripts/db/`)
