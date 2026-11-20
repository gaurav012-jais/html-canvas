import { apiClient } from './client'

function compactPayload(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )
}

function stripProviderRequestIds(value) {
  return value
}

async function postDcb(path, payload) {
  const response = await apiClient(`/flow/dcb/${path}`, {
    method: 'POST',
    body: compactPayload(payload),
    dedupe: false,
    timeout: 30000,
  })
  return stripProviderRequestIds(response)
}

export async function getDcbConfig(params = {}) {
  const query = new URLSearchParams(compactPayload(params))
  const suffix = query.toString() ? `?${query.toString()}` : ''
  const response = await apiClient(`/flow/dcb/config${suffix}`, { method: 'GET' })
  return stripProviderRequestIds(response)
}

export function checkDcbMsisdn(payload) {
  return postDcb('manual-check', payload)
}

export function sendDcbPincode(payload) {
  return postDcb('pincode', payload)
}

export function confirmDcbPincode(payload) {
  return postDcb('confirm', payload)
}

export function fetchDcbStatus(payload) {
  return postDcb('status', payload)
}

export { stripProviderRequestIds }

/**
 * Client helpers for vendor-scoped Universe DCB API expose URLs + payload download.
 */
export function buildDcbExposeUrls(origin, campaignId, vendorId) {
  const host = origin || 'https://your-domain.com'
  const cid = campaignId || '{campaignId}'
  const vid = vendorId || '{vendorId}'
  const base = `${host}/api/flow/dcb/${cid}/${vid}`
  return {
    base,
    configUrl: `${base}/config`,
    pincodeUrl: `${base}/pincode`,
    confirmUrl: `${base}/confirm`,
    statusUrl: `${base}/status?msisdn=`,
    screenUrl: `${base}/screen`,
  }
}

const SAMPLE_MSISDN = '566891023'
const SAMPLE_REQUEST_ID = '16726123'

export function buildDcbExposeApiPayload({ origin, campaign, vendor, vendorId } = {}) {
  const cid = campaign?.id || '{campaignId}'
  const vid = vendorId || vendor?.id || '{vendorId}'
  const urls = buildDcbExposeUrls(origin, cid, vid)
  return [
    {
      comment:
        'Step 0 — list allowed packs. Use purchaseTypeId (or pack key) on pincode. Weekly in this sample is 3.',
      method: 'GET',
      url: urls.configUrl,
      request: {},
      response: {
        purchaseTypes: [
          { packKey: 'daily', label: 'Daily', purchaseTypeId: '2', code: 'RenewalDaily' },
          { packKey: 'weekly', label: 'Weekly', purchaseTypeId: '3', code: 'RenewalWeekly' },
          { packKey: 'monthly', label: 'Monthly', purchaseTypeId: '4', code: 'RenewalMonthly' },
        ],
        pollIntervalMs: 2000,
        pollTimeoutMs: 60000,
      },
    },
    {
      comment:
        'Step 1 — send billing PIN to this MSISDN. Save requestId from the response; confirm needs it.',
      method: 'POST',
      url: urls.pincodeUrl,
      request: {
        msisdn: SAMPLE_MSISDN,
        purchaseTypeId: 3,
        pack: 'weekly',
        transactionChannel: 'Wifi',
      },
      response: {
        sent: true,
        requestId: SAMPLE_REQUEST_ID,
        msisdn: SAMPLE_MSISDN,
        stage: 'PIN_REQUIRED',
        outcome: 'PENDING',
        message: 'PIN requested successfully',
      },
    },
    {
      comment:
        'Step 2 — confirm the PIN. Send only requestId + pin (no msisdn). Then poll status.',
      method: 'POST',
      url: urls.confirmUrl,
      request: {
        requestId: SAMPLE_REQUEST_ID,
        pin: '1234',
      },
      response: {
        verified: true,
        requestId: SAMPLE_REQUEST_ID,
        stage: 'POLLING',
        outcome: 'PENDING',
        message: 'PIN confirmed. Poll status until the subscription is entitled.',
      },
    },
    {
      comment:
        'Step 3 — poll subscription status until outcome is ENTITLED (user is billed / active).',
      method: 'GET',
      url: `${urls.statusUrl}${SAMPLE_MSISDN}`,
      request: {
        msisdn: SAMPLE_MSISDN,
      },
      response: {
        msisdn: SAMPLE_MSISDN,
        outcome: 'ENTITLED',
        status: 'ACTIVE',
        entitlementActive: true,
        current: true,
      },
    },
  ]
}

export function buildDcbExposeMarkdownGuide({ origin, campaign, vendor, vendorId } = {}) {
  const cid = campaign?.id || '{campaignId}'
  const vid = vendorId || vendor?.id || '{vendorId}'
  const cName = campaign?.campaignName || 'Campaign'
  const vName = vendor?.name || 'Vendor'
  const urls = buildDcbExposeUrls(origin, cid, vid)

  return `# Direct Carrier Billing (DCB) Integration Guide
**Campaign:** ${cName} (ID: \`${cid}\`)  
**Vendor:** ${vName} (ID: \`${vid}\`)  
**Base URL:** \`${urls.base}\`

---

## 1. Quick Flow Overview
1. **Fetch Config** (\`GET ${urls.configUrl}\`): Retrieve active pricing plans and pack IDs.
2. **Send PIN** (\`POST ${urls.pincodeUrl}\`): Send SMS PIN to the subscriber MSISDN. Returns \`requestId\`.
3. **Confirm PIN** (\`POST ${urls.confirmUrl}\`): Verify user PIN with the received \`requestId\`.
4. **Poll Status** (\`GET ${urls.statusUrl}<msisdn>\`): Poll every 2s until entitlement is \`ENTITLED\`.

---

## 2. API Reference & Code Samples

### Step 0: Get Configuration
- **Method:** \`GET\`
- **Endpoint:** \`${urls.configUrl}\`

### Step 1: Request PIN
- **Method:** \`POST\`
- **Endpoint:** \`${urls.pincodeUrl}\`
- **Body:**
\`\`\`json
{
  "msisdn": "${SAMPLE_MSISDN}",
  "purchaseTypeId": 3,
  "pack": "weekly",
  "transactionChannel": "Wifi"
}
\`\`\`

### Step 2: Confirm PIN
- **Method:** \`POST\`
- **Endpoint:** \`${urls.confirmUrl}\`
- **Body:**
\`\`\`json
{
  "requestId": "${SAMPLE_REQUEST_ID}",
  "pin": "1234"
}
\`\`\`

### Step 3: Check Status
- **Method:** \`GET\`
- **Endpoint:** \`${urls.statusUrl}${SAMPLE_MSISDN}\`

---

## 3. Polling Outcomes
- \`ENTITLED\`: User is active & billed.
- \`PENDING\`: Billing in progress. Keep polling.
- \`LOW_BALANCE\`: Insufficient subscriber credit.
- \`TERMINAL_FAILURE\`: Activation failed.
`
}

export function buildDcbExposeApiGuide(opts = {}) {
  if (opts && opts.format === 'markdown') {
    return buildDcbExposeMarkdownGuide(opts)
  }
  return JSON.stringify(
    {
      comment:
        'Vendor DCB billing APIs. Call in order: config → pincode → confirm → status. GET or POST. Query or JSON body.',
      apis: buildDcbExposeApiPayload(opts),
    },
    null,
    2
  )
}
