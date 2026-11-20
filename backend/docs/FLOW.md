# Subscription Funnel Flow

## 1. Flow Overview
The subscription engine orchestrates mobile subscriber onboarding through various telecom carrier flows:
- **Header Enrichment (HE / 1-Click)**: Instant mobile identity detection over 3G/4G/5G carrier network headers.
- **Direct Carrier Billing (DCB / 2-Click)**: PIN code dispatch and carrier billing confirmation.
- **OTP Verification**: MSISDN input -> SMS OTP dispatch -> OTP verification -> activation.
- **Hybrid / Fallback**: Automatic promotion/fallback based on priority chain configuration.

## 2. Request Lifecycle
```
User Visit
    │
    ▼
[Flow Gate / HE Detect]
    │
    ├── (Detected via HE) ─────────────► [Auto / 1-Click Flow] ──► [Conversion Postback]
    │
    └── (Not Detected / WiFi)
            │
            ▼
        [Step 1: Landing / Phone Input]
            │
            ▼
        [Step 2: OTP / DCB PIN]
            │
            ▼
        [Step 3: Verification & Entitlement]
            │
            ├── Delayed Checksub (30m schedule)
            └── Vendor Postback Forward
```

## 3. Delayed Checksub Engine
For Orange BF, Zain, and other carriers with delayed status confirmation:
1. Conversion postback is saved with status `pending`.
2. A background task or scheduler runs at `scheduled_at` (+30m).
3. Carrier checkSubscription endpoint is polled.
4. Visit and postback status are updated with outcome (`ACTIVE`, `GRACE`, `PARKING`, etc.).
