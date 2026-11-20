# Frontend Pages Refactor Plan
> Part of [00-OVERVIEW.md](./00-OVERVIEW.md)

---

## Sabse Badi Problem: Subscription Funnel (`/subscription`)

`src/pages/subscription/` folder mein duniya bhar ka logic hai:

```
subscription/
├── SubscriptionPage.jsx      ← 400+ lines, 20+ refs, 3 state layers
├── SubscriptionOverlays.jsx
├── useFlowPages.js           ← 400+ lines (boot + cache + prefetch + redirect)
├── useHeDetect.js            ← 300+ lines (HE detect + exit flow)
├── useFlowSession.js
├── useShadowInteractions.js
├── useDcbStatusPoll.js
├── setupDcbBindings.js
├── setupOtpBindings.js
├── runPriorityChain.js
├── shadowDom.js
├── shadowStyles.js
├── flowHelpers.js
└── constants.js
```

### Problem 1: `SubscriptionPage.jsx` — 20+ Refs!

```jsx
// Abhi SubscriptionPage.jsx mein yeh sab refs hain:
const hostRef = useRef(null)
const visitIdRef = useRef(null)
const entryPageRef = useRef('HOME')
const pageCacheRef = useRef(new Map())
const prefetchingRef = useRef(new Set())
const transitionLockRef = useRef(false)
const pageDataRef = useRef(null)
const selectedPackRef = useRef('daily')
const phoneRef = useRef('')
const phoneResolvingRef = useRef(true)
const heExitPendingRef = useRef(false)
const heMetaRef = useRef({ done: false, heProvider: null, ... }) // 10 fields
const loadPageRef = useRef(null)
const detectKeyRef = useRef('')
const detectInFlightRef = useRef(false)
const heDetectSettledRef = useRef(false)
const heOnlyModeRef = useRef(false)
const loadGenerationRef = useRef(0)
const clickIdRef = useRef('')
const rcidRef = useRef('')
const vidRef = useRef('')
const affIdRef = useRef('')
const campidRef = useRef('')
const trackingCampidRef = useRef('')
```

Yeh sab refs `useFlowPages` aur `useHeDetect` ko pass hote hain — dono hooks mein ek string se zyada params hain!

### Problem 2: `useFlowPages` — Ek Hook 5 Cheezein Karta Hai

1. Page boot sequence manage karta hai
2. Page cache (Map) maintain karta hai
3. Prefetch karta hai next pages
4. URL `?step=` sync karta hai
5. External redirect handle karta hai

**Yeh 5 alag hooks hone chahiye.**

---

## Subscription Page — New Architecture

### New File Structure
```
pages/subscription/
├── SubscriptionPage.jsx        ← Max 150 lines (compose only)
├── SubscriptionOverlays.jsx    ← Unchanged
│
├── hooks/
│   ├── useFlowState.js         ← Central mutable state (refs only)
│   ├── useFlowBoot.js          ← Initial page load + entry detection
│   ├── usePageCache.js         ← Cache + prefetch logic
│   ├── useHeDetect.js          ← HE MSISDN resolve (cleaned up)
│   ├── useUrlSync.js           ← ?step= URL sync (extracted from useFlowPages)
│   ├── useTransition.js        ← User action → next page
│   ├── useDcbStatusPoll.js     ← Unchanged (already focused)
│   └── useShadowInteractions.js ← Unchanged (already focused)
│
├── setup/
│   ├── setupDcbBindings.js     ← Unchanged
│   ├── setupOtpBindings.js     ← Unchanged
│   └── runPriorityChain.js     ← Unchanged
│
├── shadow/
│   ├── shadowDom.js            ← Unchanged
│   └── shadowStyles.js         ← Unchanged
│
└── utils/
    ├── flowHelpers.js          ← Unchanged (pure functions)
    └── constants.js            ← Unchanged
```

### New `SubscriptionPage.jsx` (Max 150 Lines)

```jsx
// AFTER refactor — readable!
function SubscriptionPage() {
  const [params] = useUrlParams()         // country, operator, campid etc.
  const flowState = useFlowState()        // All refs in one place
  const [pageData, setPageData] = useState(null)
  const [ui, setUi] = useState({ booting: true, error: '', transitioning: false })

  // Layer A: HE detect (phone resolve)
  useHeDetect({ params, flowState, setUi })

  // Layer B: Page load + cache
  useFlowBoot({ params, flowState, pageData, setPageData, setUi })

  // Layer C: URL sync
  useUrlSync({ pageData, flowState })

  // User interactions
  useShadowInteractions({ flowState, pageData, setPageData, setUi })
  useDcbStatusPoll({ flowState, pageData, setPageData })

  const overlayFlags = deriveOverlayFlags({ ...ui, pageData })

  return (
    <div ref={flowState.hostRef}>
      <SubscriptionOverlays {...overlayFlags} />
      {pageData && <FlowCanvas data={pageData} />}
    </div>
  )
}
```

### New `useFlowState.js` (Ref Container)

```js
// Ek jagah sab refs — function components mein pass karna easy ho jaye
export function useFlowState() {
  return {
    // Visit
    visitId: useRef(null),
    entryPage: useRef('HOME'),

    // Phone
    phone: useRef(''),
    phoneResolving: useRef(true),

    // HE
    heExitPending: useRef(false),
    heSettled: useRef(false),
    heOnlyMode: useRef(false),
    heMeta: useRef({ done: false, provider: null, error: null }),

    // Page
    pageCache: useRef(new Map()),
    prefetching: useRef(new Set()),
    pageDataRef: useRef(null),
    transitionLock: useRef(false),
    loadGeneration: useRef(0),
    loadPage: useRef(null),

    // Attribution
    clickId: useRef(''),
    rcid: useRef(''),
    vid: useRef(''),
    affId: useRef(''),
    campid: useRef(''),
    trackingCampid: useRef(''),

    // DOM
    host: useRef(null),
    selectedPack: useRef('daily'),
  }
}
```

---

## Other Pages Refactor

### `CampaignBuilder.jsx` (156 lines — OK hai)
Mostly fine. Just needs:
- Inline styles → CSS classes
- Magic strings → constants

### `CampaignDetailPage.jsx` (647 lines — SPLIT KARO)

**Current:** Ek file mein campaign detail + vendor stats + flow metrics + modals

**New:**
```
pages/campaignDetail/
├── CampaignDetailPage.jsx      ← Exists (keep, max 200 lines)
├── CampaignHeader.jsx          ← NEW — name, status, quick actions
├── CampaignStats.jsx           ← NEW — visit/conversion numbers
├── VendorStatsSection.jsx      ← Exists (keep)
├── VendorAssignModal.jsx       ← Exists (keep)
├── FailedBreakdownBadge.jsx    ← Exists (keep)
└── flows/                      ← Exists (keep all flow configs)
```

### Duplicate Page! `src/pages/CampaignDetailPage.jsx` AND `src/pages/campaignDetail/CampaignDetailPage.jsx`

```
pages/
├── CampaignDetailPage.jsx           ← OLD (should be deleted)
└── campaignDetail/
    └── CampaignDetailPage.jsx       ← NEW (actual implementation)
```

**Action:** Old `src/pages/CampaignDetailPage.jsx` delete karo — routes update karo.

---

## Admin Dashboard Pages — Naming Consistency

Current pages mein kuch naming issues hain:

| Current Name | Should Be |
|---|---|
| `PostbackDayLogsPage.jsx` | `PostbackDayLogPage.jsx` (singular) |
| `SessionDetailPage.jsx` | Fine |
| `MarketCampaignsPage.jsx` | Fine |
| `CacheManagementPage.jsx` | Fine |
| `CallbackDocsPage.jsx` | `PartnerCallbackDocsPage.jsx` (clearer) |

---

## Component Organization Review

### `components/ui/` — OK hai
Already well organized. Standard UI components. No changes needed.

### `components/dashboard/` — Needs Split
```
components/dashboard/
├── CampaignApiConfigModal.jsx   ← 500+ lines?! Split karo
├── CampaignCappingModal.jsx     ← OK
├── CreateCampaignModal.jsx      ← OK
├── VendorCappingModal.jsx       ← OK
├── dcbConfig.js                 ← Should be in constants/
└── api-config/
    ├── common/
    │   ├── ApiField.jsx
    │   ├── OtpLimitMessages.jsx
    │   └── TemplateVariablesLegend.jsx
    └── flows/
        └── OrangeBfTab.jsx
```

**Action:**
- `CampaignApiConfigModal.jsx` → Split into tabs/sections as separate components
- `dcbConfig.js` → `components/dashboard/constants/dcbConfig.js`

### `components/flow/` — OK hai
Flow builder components are reasonably organized.

---

## Page-Level Anti-Patterns to Fix

### 1. API Calls Directly in Pages
```jsx
// BAD — CampaignsPage.jsx mein direct axios call
useEffect(() => {
  axios.get('/api/campaigns').then(res => setCampaigns(res.data))
}, [])

// GOOD — service layer use karo
import { getCampaigns } from '../services/api/campaigns'
useEffect(() => {
  getCampaigns().then(setCampaigns)
}, [])
```

### 2. Magic Numbers
```jsx
// BAD
if (vendors.length > 5) showWarning()

// GOOD
const MAX_VENDORS_PER_CAMPAIGN = 5
if (vendors.length > MAX_VENDORS_PER_CAMPAIGN) showWarning()
```

### 3. Inline Styles
```jsx
// BAD
<div style={{ marginTop: '24px', color: '#6b7280' }}>

// GOOD (Tailwind already installed)
<div className="mt-6 text-gray-500">
```
