# Frontend Store & Services Refactor Plan
> Part of [00-OVERVIEW.md](./00-OVERVIEW.md)

---

## State Management — Current State

### `src/store/useStore.js`

```
store/
├── useStore.js                    ← Root store (Zustand)
├── slices/
│   ├── campaignSlice.js           ← Campaign state
│   ├── partnersSlice.js           ← Partners/postbacks state
│   └── uiSlice.js                 ← Toast, modals, loading
└── adapters/
    ├── localStorageAdapter.js
    └── persistence.js
```

**Root `useStore.js` mein kuch issues hain:**

```js
// 1. Metrics system — kya use hota hai?
const METRICS_KEY = 'templatecraft_metrics'
const defaultMetrics = {
  projectsCreated: 0, blocksAdded: 0, exports: 0,
  otp_sent: 0, otp_verified: 0, otp_failed: 0,
  confirm_loaded: 0, confirm_completed: 0, success_loaded: 0,
}
// Yeh metrics kahan display hote hain? Admin dashboard? Analytics?
// Agar nowhere → DELETE

// 2. Store subscription mein localStorage save
useStore.subscribe((state, prevState) => {
  if (state.dateFormat !== prevState.dateFormat || ...) {
    localStorage.setItem(SETTINGS_KEY, ...)
  }
})
// Yeh `persistence.js` ka kaam hai — wahan move karo
```

**Recommended `useStore.js` (Clean Version):**

```js
import { create } from 'zustand'
import { createCampaignSlice } from './slices/campaignSlice'
import { createPartnersSlice } from './slices/partnersSlice'
import { createUiSlice } from './slices/uiSlice'
import { setupSettingsPersistence } from './adapters/persistence'

const useStore = create((set, get) => ({
  ...createCampaignSlice(set, get),
  ...createPartnersSlice(set, get),
  ...createUiSlice(set, get),
}))

setupSettingsPersistence(useStore)

export default useStore
```

---

## Slices Review

### `campaignSlice.js` — Check Karo
Likely contains:
- Campaign list state
- Selected campaign
- API loading states

**Rule:** Slice mein sirf state + actions. API calls → `services/api/` mein.

### `partnersSlice.js` — Check Karo
Postback/partner state.

### `uiSlice.js` — Check Karo
Toast messages, modal visibility, loading states.

---

## API Services Layer

### Current Structure
```
services/
├── api/
│   ├── client.js         ← Axios instance
│   ├── auth.js
│   ├── campaigns.js
│   ├── flow.js
│   ├── otp.js
│   ├── partners.js
│   ├── markets.js
│   ├── users.js
│   ├── admin.js
│   ├── logs.js
│   ├── upload.js
│   ├── dcb.js
│   ├── dcbExpose.js
│   └── mappers.js        ← Response mappers
└── flow/
    ├── apiDebugLog.js
    ├── dcbStageUi.js
    ├── priorityApiMatch.js
    ├── resolvePhoneNumber.js
    ├── safaricomHe.js
    └── trackingMacros.js
```

### Issues

#### 1. `dcb.js` aur `dcbExpose.js` — Split Kyun?
```
dcb.js       → DCB flow API calls
dcbExpose.js → DCB expose/fields API calls
```
Inhe ek file mein rakho: `dcb.js`

#### 2. `mappers.js` — Yeh Kya Map Karta Hai?
Yeh file unclear hai. Agar backend response ko frontend model mein transform karta hai toh:
- Rename karo: `response-mappers.js`
- Aur document karo: "Kaunsa API kaunsa shape return karta hai"

#### 3. `services/flow/` — Subscription Funnel Helpers
Yeh files subscription page ke liye hain. Consider moving to `pages/subscription/utils/`:

```
services/flow/
├── resolvePhoneNumber.js  → subscription/utils/phone.js
├── trackingMacros.js      → subscription/utils/macros.js
├── safaricomHe.js         → subscription/utils/safaricom-he.js
├── priorityApiMatch.js    → subscription/utils/priority-match.js
├── dcbStageUi.js          → subscription/utils/dcb-stage-ui.js
└── apiDebugLog.js         → subscription/utils/debug-log.js
```

---

## `services/api/client.js` — Axios Setup

```js
// Current client.js likely looks like:
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
})

// Interceptors?
client.interceptors.request.use(...)
client.interceptors.response.use(...)
```

**Check karo:**
- [ ] Auth token automatically attach hota hai?
- [ ] 401 → logout redirect hota hai?
- [ ] Error responses consistent format mein hain?

**Recommended pattern:**

```js
// client.js — Ek jagah sab HTTP config
const client = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: API_TIMEOUT_MS,
})

// Auto-attach JWT
client.interceptors.request.use(attachAuthToken)

// Auto-logout on 401
client.interceptors.response.use(null, handleAuthError)

export default client

// --- Private helpers ---
function attachAuthToken(config) {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
}

function handleAuthError(error) {
  if (error.response?.status === 401) {
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }
  return Promise.reject(error)
}
```

---

## Context Files

### `AuthContext.jsx` — Check Karo
```
context/
├── AuthContext.jsx   ← Login state, user info
└── ThemeContext.jsx  ← Dark/light mode
```

Yeh fine lagta hai. Bas check karo:
- [ ] Kya AuthContext useStore ke saath sync hai?
- [ ] Duplicate state toh nahi (user store mein bhi, context mein bhi)?

---

## Utils Folder Cleanup

### Current `src/utils/`
```
utils/
├── analytics.js       ← Event tracking (Google Analytics?)
├── buttonLinks.js     ← Button link generation
├── capping.js         ← Campaign capping checks
├── clipboard.js       ← Copy to clipboard
├── date.js            ← Date formatting
├── download.js        ← File download
├── googleAds.js       ← Google Ads conversion tracking
├── routes.js          ← Route constants
├── storage.js         ← localStorage wrapper
├── visitPagePath.js   ← Visit page path helpers
└── zip.js             ← ZIP file creation
```

**Issues:**
- `analytics.js` aur `googleAds.js` — dono tracking karte hain? Merge karo: `tracking.js`
- `visitPagePath.js` — Kya yeh subscription funnel specific hai? → `pages/subscription/utils/`
- `buttonLinks.js` — Yeh kahan use hota hai? Check karo

**Recommended `utils/` after cleanup:**
```
utils/
├── date.js            ← Date formatting (unchanged)
├── routes.js          ← Route constants (unchanged)
├── storage.js         ← localStorage wrapper (unchanged)
├── clipboard.js       ← Copy to clipboard (unchanged)
├── download.js        ← File download (unchanged)
├── zip.js             ← ZIP file (unchanged)
├── tracking.js        ← analytics.js + googleAds.js merge
└── capping.js         ← Keep (campaign capping)
```

---

## Hooks Folder

### Current `src/hooks/`
```
hooks/
├── useDebouncedCallback.js   ← Generic utility hook
├── useStoreSelector.js       ← Zustand selector helper
└── useTheme.js               ← Theme toggle
```

Yeh already clean hai. No changes needed.

---

## Theme System

```
theme/
└── tokens.js    ← Design tokens (colors, spacing)
```

Tailwind CSS v4 already installed hai. Check karo:
- [ ] Kya `tokens.js` aur Tailwind config aligned hain?
- [ ] Koi duplicate color definitions?

---

## `src/index.css` aur `src/styles/globals.css`

```
src/
├── index.css         ← Tailwind imports?
└── styles/
    └── globals.css   ← Global styles
```

**Problem:** Do CSS files hain. Merge karo:
- `index.css` → Tailwind directives only
- `globals.css` → Custom global styles
- Ek ko dusre mein import karo — alag mat rakho
