# API Reference

## 1. Authentication & System
- `POST /api/auth/login`: User credentials login, returns JWT token.
- `GET /api/auth/me`: Current authenticated user profile.
- `GET /health`: Healthcheck endpoint for load balancers.

## 2. Campaigns & Pages
- `GET /api/campaigns`: List all campaigns with filters.
- `POST /api/campaigns`: Create a new campaign.
- `GET /api/campaigns/:id`: Retrieve single campaign details.
- `PUT /api/campaigns/:id`: Update campaign properties.
- `GET /api/campaigns/:id/pages/:type`: Retrieve HTML/CSS for specific funnel page (`HOME`, `OTP`, `CONFIRM`, `THANKYOU`).
- `PUT /api/campaigns/:id/pages/:type`: Save page layout and GrapesJS project data.
- `GET /api/campaigns/:id/api-config`: Get campaign carrier API configurations (HE, DCB, OTP, Checksub).
- `PUT /api/campaigns/:id/api-config`: Update carrier API configuration.

## 3. Subscription & Flow Engine
- `GET /api/flow/detect`: Header enrichment detection for incoming mobile HTTP requests.
- `POST /api/flow/transition`: Route to next funnel step based on user action.
- `POST /api/flow/otp/send`: Dispatch SMS OTP to subscriber.
- `POST /api/flow/otp/verify`: Validate submitted OTP code and trigger postback.
- `GET /api/flow/dcb/:campaignId/:vendorId/config`: Retrieve vendor DCB packs and polling intervals.
- `POST /api/flow/dcb/:campaignId/:vendorId/pincode`: Request DCB billing PIN.
- `POST /api/flow/dcb/:campaignId/:vendorId/confirm`: Confirm DCB billing PIN.
- `GET /api/flow/dcb/:campaignId/:vendorId/status`: Check current DCB entitlement status.

## 4. Postbacks & Reporting
- `GET /api/partners/postbacks`: Query conversion postback logs with date & campaign filters.
- `GET /api/partners/daily-stats`: Daily aggregated revenue, conversion, and operator stats.
- `GET /api/partners/reports/excel`: Download Excel report for selected date range.
- `GET /api/partners/reports/pdf`: Download PDF summary report.
