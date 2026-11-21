# WAP Manager — Database & Data Layer Refactoring Plan

> **Scope:** `backend/src/database` (58 files, 7,306 LOC)  
> **ORM / Driver:** TypeORM 0.3.20 (MySQL2 / PG)  
> **Target:** Data Integrity, JSON Schema Contracts, Index Optimization, and Seed Data Cleanup.

---

## 1. Database Current State Analysis

Database layer me **15 TypeORM Entities** define kiye gaye hain using `EntitySchema`. Halanki entities ka basic design relation-wise theek hai, lekin **4 critical architectural problems** hain:

### Major Flaws:
1. **The "JSON-in-TEXT" Anti-Pattern:**
   - `campaigns.flow_config`: Type `text` (JSON string)
   - `api_configs.headers_json`: Type `text` (JSON string)
   - `api_configs.otp_config_json`: Type `text` (JSON string)
   - `api_configs.he_config_json`: Type `text` (JSON string)
   - `conversion_postbacks.vendor_response_json`: Type `text`
   - `api_call_logs.request_payload`: Type `text`
   *Impact:* Database level pe koi JSON validation nahi hoti. Har backend service me alag-alag `JSON.parse()` aur `JSON.stringify()` likha gaya hai. Agar corrupt string insert ho jaye toh runtime crash ho jata hai.
2. **Missing Composite Indexes on High-Throughput Tables:**
   - `visits` aur `visit_events` table me millions of rows aati hain live traffic se.
   - Reporting queries `(campaignId, createdAt)` aur `(clickId)` pe frequently filter karti hain. Missing composite indexes ki wajah se full table scans hote hain, jisse `postback-query.js` aur `daily-stats.service.js` slow ho jate hain.
3. **No Schema Validation / DTOs:**
   - Naye developers ko nahi pata hota ki `flow_config` ya `otp_config_json` ke andar kaun-kaun se keys mandatory hain aur kaun se optional.
4. **Seed Files Monolith:**
   - `universe-dcb.pages.js` (631 lines), `header-injection.pages.js` (374 lines), `otp-only.pages.js` (358 lines) seed folders me raw HTML layouts hardcoded hain.

---

## 2. Entity-by-Entity Refactoring Audit

| Entity File | Lines | Current Issue | Target Refactoring |
| :--- | :--- | :--- | :--- |
| `campaign.entity.js` | 167 | `flow_config` is raw TEXT; lacks TypeScript/Zod contract | Migrate column to `simple-json` (or native JSON), define `CampaignFlowConfigSchema` DTO |
| `api-config.entity.js` | 92 | 5 columns are raw TEXT (`headers_json`, `otp_config_json`, `he_config_json`, etc.) | Convert to `simple-json` or native JSON with Zod validation |
| `conversion-postback.entity.js` | 167 | Missing composite index on `(campaign_id, created_at, status)` | Add composite indexes for high-speed reporting |
| `visit.entity.js` | 158 | High-frequency table; `click_id` lookup must be instant | Ensure unique index on `click_id` and composite index on `(campaign_id, created_at)` |
| `visit-event.entity.js` | 72 | Event stream table; rapid inserts | Add index on `(visit_id, event_type, created_at)` |
| `api-call-log.entity.js` | 125 | Unbounded text columns; large payloads slow down table | Store large debug payloads with auto-prune TTL or partition |
| `daily-stat.entity.js` | 76 | Aggregation table | Clean, keep as-is (already well-indexed) |
| `affiliate.entity.js` | 67 | Simple master data | Clean, keep as-is |
| `operator.entity.js` | 64 | Simple master data | Clean, keep as-is |
| `country.entity.js` | 53 | Simple master data | Clean, keep as-is |
| `user.entity.js` | 49 | Authentication user | Clean, keep as-is |
| `vendor.entity.js` | 66 | Vendor credentials | Clean, keep as-is |

---

## 3. Standardized DTOs & JSON Contracts via Zod

Har JSON column ke liye application boundary pe strict **Zod Schema** define kiya jayega.

### Example: Campaign API Configuration Schema (`src/database/schemas/api-config.schema.js`)
```javascript
import { z } from 'zod';

export const OtpConfigSchema = z.object({
  provider: z.enum(['partner', 'twilio', 'infobip', 'custom']),
  senderId: z.string().optional(),
  messageTemplate: z.string().default('Your verification code is: {otp}'),
  otpLength: z.number().int().min(4).max(8).default(4),
  expirySeconds: z.number().int().default(180),
  maxAttempts: z.number().int().default(3),
  resendCooldownSeconds: z.number().int().default(30),
});

export const HeaderEnrichmentConfigSchema = z.object({
  provider: z.enum(['header', 'token', 'safaricom', 'custom']).default('header'),
  msisdnHeader: z.string().default('x-msisdn'),
  operatorHeader: z.string().optional(),
  tokenResolveUrl: z.string().url().optional(),
  fallbackToCg: z.boolean().default(true),
});

export const FlowConfigSchema = z.object({
  initialStep: z.string().default('home'),
  steps: z.record(
    z.string(),
    z.object({
      pageId: z.number().int(),
      verificationMode: z.enum(['OTP', 'HE', 'DCB', 'BOTH', 'NONE']),
      transitions: z.record(z.string(), z.string()).optional(),
    })
  ),
});
```

---

## 4. Indexing Optimization Strategy for High-Traffic Tables

Live WAP traffic me har second hundreds of requests aati hain. Reporting queries ko fast rakhne ke liye composite indexes define kiye jayenge:

```sql
-- 1. Fast Affiliate Postback & Hit Reporting:
CREATE INDEX idx_postback_rep ON conversion_postbacks (campaign_id, status, created_at);
CREATE INDEX idx_postback_vendor_status ON conversion_postbacks (vendor_id, status, created_at);

-- 2. Fast Visit & Click ID Resolution:
CREATE INDEX idx_visit_click_camp ON visits (click_id, campaign_id);
CREATE INDEX idx_visit_created_status ON visits (created_at, status);

-- 3. Fast Event Timeline & MSISDN History:
CREATE INDEX idx_visit_events_timeline ON visit_events (visit_id, event_type, created_at);
CREATE INDEX idx_api_call_logs_visit ON api_call_logs (visit_id, call_type, created_at);
```

---

## 5. Seed Data Cleanup Plan

`backend/src/database/seed/funnel-pages/`:
- **Current:** 631-line JS files me pure HTML templates strings ke format me embedded hain.
- **Target:** HTML/CSS content ko separate `.html` files me `seed/assets/` me move karein:
  ```
  backend/src/database/seed/
  ├── assets/
  │   ├── universe-dcb-lp.html
  │   ├── orange-bf-lp.html
  │   └── classic-otp-lp.html
  ├── loaders/
  │   └── page-seed.loader.js      (< 80 lines - reads HTML from assets and inserts)
  └── seed.js                      (< 60 lines - master seed runner)
  ```

---

## 6. Caching Layer (Redis) Optimization
- Redis me campaign configurations aur operator rules ko cache kiya jata hai.
- Cache invalidation ko centralized `CampaignCacheService` ke through handle kiya jaye jab bhi campaign update ho, taaki stale `flow_config` ya `api_config` run na ho.
