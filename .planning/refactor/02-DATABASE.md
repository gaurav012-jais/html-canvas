# Database Layer Refactor Plan

> Part of [00-OVERVIEW.md](./00-OVERVIEW.md)

---

## Sabse Badi Problem: Dual Migration System

Project mein schema changes **do jagah** hote hain:

### Jagah 1: `src/database/migrations/` (Proper Migrations)

```
migrations/
├── 1730000000000-InitialSchema.js
├── 1760000000001-AddOtpRequests.js
├── 1760000000002-AddOtpConfigAndColumns.js
... (20+ migration files)
└── 1990000000001-AddVendorCapping.js
```

✅ Yeh correct hai — versioned, ordered, idempotent

### Jagah 2: `src/database/index.js` (Inline `ensure*` Functions)

```js
// Yeh sab initDatabase() ke andar hain:
await ensureUserStatusColumn(dataSource);
await ensurePostbacksAndHeSchema(dataSource);
await ensureRcidAndApiCallLogsSchema(dataSource);
await ensureSuccessRedirectUrlColumn(dataSource);
await ensureCampaignTrackingsSchema(dataSource);
// ... 20 more functions
```

❌ Yeh galat hai — har function alag-alag try-catch karta hai, schema state unclear hai

**Result:** Database ka actual state kya hai yeh sirf production DB check karne se pata chalta hai. Code padhke nahi.

---

## Plan: `database/index.js` Ko Clean Karo

### Step 1: Inline Ensures → Migration Files

Har `ensure*` function ka ek corresponding migration file banana hai:

| `ensure*` Function                  | Corresponding Migration File                                    |
| ------------------------------------- | --------------------------------------------------------------- |
| `ensureUserStatusColumn`            | `1850000000000-AddUserStatus.js` ✅ already exists            |
| `ensurePostbacksAndHeSchema`        | `1820000000000-AddPostbacksAndHe.js` ✅ already exists        |
| `ensureRcidAndApiCallLogsSchema`    | `1830000000000-AddRcidAndApiCallLogs.js` ✅ already exists    |
| `ensureSuccessRedirectUrlColumn`    | `1840000000000-AddSuccessRedirectUrl.js` ✅ already exists    |
| `ensureCampaignTrackingsSchema`     | `1780000000001-CampaignTrackings.js` ✅ already exists        |
| `ensureTrackingPayoutPercentColumn` | `1950000000000-AddTrackingPayoutPercent.js` ✅ already exists |
| ...                                   | ...                                                             |

**Conclusion:** Sab migrations already exist karte hain! `ensure*` functions redundant hain.

**Action:** `ensure*` functions ko remove karo, proper migration runner setup karo.

### Step 2: `database/index.js` New Version

```js
// BEFORE: 763 lines (25+ ensure* functions)

// AFTER: ~60 lines
import { DataSource } from 'typeorm'
import pg from 'pg'
import getConfig from '../config/configuration.js'
import { entities } from './entities/index.js'

// PostgreSQL timestamp parser — UTC mein return karo
if (pg?.types?.setTypeParser) {
  pg.types.setTypeParser(1114, parseUtcTimestamp)
}

function parseUtcTimestamp(str) {
  if (!str) return null
  const normalized = str.includes('T') ? str : str.replace(' ', 'T')
  const iso = /[+-]\d{2}:?\d{2}$/.test(normalized) || normalized.endsWith('Z')
    ? normalized
    : `${normalized}Z`
  return new Date(iso)
}

/** @type {DataSource | null} */
let dataSource = null

export const initDatabase = async () => {
  if (dataSource?.isInitialized) return dataSource

  const { database: db } = getConfig()
  const isPostgres = (db.type || 'postgres') === 'postgres'

  dataSource = new DataSource({
    type: db.type || 'postgres',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    synchronize: false,
    logging: false,
    entities,
    migrations: ['src/database/migrations/*.js'],
    extra: isPostgres
      ? { max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 15000 }
      : { connectionLimit: 20, waitForConnections: true },
  })

  await dataSource.initialize()
  await dataSource.runMigrations()   // ← Yeh sab ensure* ka kaam karega
  return dataSource
}

export const getDataSource = () => {
  if (!dataSource?.isInitialized) throw new Error('DB not initialized')
  return dataSource
}

export const getRepository = (entity) => getDataSource().getRepository(entity)

export { entities }
```

> **Note:** `runMigrations()` before this se off tha — that's why `ensure*` functions were added as a workaround. This is the proper fix.

---

## Entity Files — Current State

Entities currently use TypeORM's `EntitySchema` pattern (not decorators). Yeh achha hai kyunki no TypeScript needed.

**Problem:** Entity files mein comments nahi hain. Fields ka purpose unclear hai.

### Example: `campaign.entity.js` Improvements

```js
// BEFORE:
funnelLayout: {
  name: 'funnel_layout',
  type: 'varchar',
  length: 32,
  default: 'classic',
},

// AFTER (with JSDoc):
/**
 * Funnel page order:
 * - 'classic': HOME → OTP/CONFIRM → THANKYOU
 * - 'packs_on_home': OTP → HOME (identity before pack selection)
 */
funnelLayout: {
  name: 'funnel_layout',
  type: 'varchar',
  length: 32,
  default: 'classic',
},
```

### Entities Folder (No Restructuring Needed — Just Comments)

```
database/entities/
├── index.js                    (unchanged)
├── affiliate.entity.js         (add JSDoc)
├── api-call-log.entity.js      (add JSDoc — ApiCallType enum document karo)
├── api-config.entity.js        (add JSDoc — fields bohot hain, explain karo)
├── campaign-page.entity.js     (add JSDoc — CampaignPageType enum explain karo)
├── campaign-tracking.entity.js (add JSDoc)
├── campaign.entity.js          (add JSDoc — funnelLayout, postbackRegisterAt etc.)
├── conversion-postback.entity.js (add JSDoc)
├── country.entity.js           (add JSDoc)
├── daily-stat.entity.js        (add JSDoc — columns describe karo)
├── operator.entity.js          (add JSDoc)
├── template.entity.js          (add JSDoc)
├── user.entity.js              (add JSDoc)
├── vendor.entity.js            (add JSDoc)
├── visit-event.entity.js       (add JSDoc)
└── visit.entity.js             (add JSDoc — VisitStatus enum explain karo)
```

---

## Seed Files Cleanup

### Current State

```
database/seed/
├── default-funnel-pages.js      (OK)
├── prebuilt-templates.json      (OK)
├── templates-seed.service.js    (OK)
└── funnel-pages/
    ├── index.js
    ├── both.pages.js
    ├── cg-home.pages.js
    ├── classic.pages.js
    ├── header-injection.pages.js
    ├── none.pages.js
    ├── orange-bf.pages.js
    ├── otp-only.pages.js
    └── universe-dcb.pages.js
```

Root mein bhi seed files hain:

- `backend/seed_dummy.js`
- `backend/seed_proper_campaign.js`
- `backend/seed_vendors.js`

**Action:**

1. Root level seed files → `database/seed/` mein move karo
2. `database/seed/README.md` banao explaining what each seed does

---

## Migration Files — Naming Convention Fix

Current migrations have inconsistent names:

```
1730000000000-InitialSchema.js          ← OK
1760000000001-AddOtpRequests.js         ← OK
1780000000000-CampaignMultipleVendors.js ← OK
1810000000000-SchemaCleanup.js          ← Vague — kya cleanup hua?
```

**Future migrations ke liye rule:**

- Format: `{timestamp}-{Verb}{WhatChanged}.js`
- Examples: `AddUserStatusColumn`, `DropLegacyAffiliateTable`, `RenameClickIdToRcid`
- Avoid vague names like "SchemaCleanup" or "Misc"

---

## Database Config — Dual DB Support Remove Karo

`database/index.js` mein har jagah `isPostgres` check hai:

```js
if (isPostgres) {
  await ds.query(`ALTER TABLE ... IF NOT EXISTS ...`)
} else {
  // MySQL version
  const rows = await ds.query(`SELECT COUNT(*) ...`)
  if (!cnt) { await ds.query(`ALTER TABLE ... `) }
}
```

**Problem:** MySQL support hai ya nahi? Production PostgreSQL use karta hai, lekin MySQL code bhi maintain ho raha hai.



**Decision Needed:**

- [ ] Sirf PostgreSQL? → Remove all MySQL branches
- [X] MySQL bhi support? → Separate migration files for each DB

> **Recommendation:** Agar production PostgreSQL hai, MySQL code remove karo. Maintenance burden half ho jayega.

bhai dono rakhna h postgress aur mysql
