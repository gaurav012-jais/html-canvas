import { DATE_PRESETS } from '../../utils/date'

export const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']
export const PAGE_SIZE = 25
export const LOGS_DATE_PRESETS = [
  ...DATE_PRESETS.filter((p) => p.id !== 'custom'),
  { id: 'all', label: 'All' },
  { id: 'custom', label: 'Custom' },
]

export const COMPARE_COLORS = ['#3b82f6', '#f59e0b', '#14b8a6', '#8b5cf6']
export const MAX_COMPARE_EVENTS = 4

export const FLOW_SPECS = {
  ORANGE_BF: {
    label: 'Orange Burkina Faso (DCB)',
    funnelEvents: [
      'VISIT',
      'HOME_VIEW',
      'CONFIRM_VIEW',
      'CONFIRM_CLICK',
      'OTP_VIEW',
      'OTP_SEND',
      'OTP_VERIFY',
      'SUBSCRIBE_SUCCESS',
      'SUBSCRIBE_FAILED',
    ],
    apiEvents: [
      'API_ORANGE_BF_CHECKSUB',
      'API_ORANGE_BF_OTP_SEND',
      'API_ORANGE_BF_OTP_VERIFY',
      'API_ORANGE_BF_SYNC',
      'API_ORANGE_BF_EXPOSE_SEND_IN',
      'API_ORANGE_BF_EXPOSE_VERIFY_IN',
      'CALLBACK_RECEIVED',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'RATE_LIMIT_HIT',
      'BRUTE_FORCE_ATTEMPT',
      'BLOCKED_REQUEST',
      'BLOCKED',
    ],
    statuses: [
      'VISIT',
      'HOME_SHOWN',
      'CONFIRM_SHOWN',
      'OTP_SHOWN',
      'SUBSCRIBED',
      'SUCCESS',
      'FAILED',
      'BLOCKED',
      'ACTIVE',
    ],
    presets: [
      { id: 'obf-funnel', label: 'Screen Funnel (Visit → Confirm → OTP → Success)', events: ['VISIT', 'CONFIRM_VIEW', 'OTP_VERIFY', 'SUBSCRIBE_SUCCESS'] },
      { id: 'obf-screens', label: 'Screens (Home → Confirm → OTP)', events: ['HOME_VIEW', 'CONFIRM_VIEW', 'OTP_VIEW'] },
      { id: 'obf-otp', label: 'OTP: Send vs Verify', events: ['API_ORANGE_BF_OTP_SEND', 'API_ORANGE_BF_OTP_VERIFY'] },
      { id: 'obf-checksub', label: 'Visit vs CheckSub', events: ['VISIT', 'API_ORANGE_BF_CHECKSUB'] },
    ],
    defaultCompare: ['VISIT', 'CONFIRM_VIEW', 'OTP_VERIFY', 'SUBSCRIBE_SUCCESS'],
  },
  UNIVERSE_DCB: {
    label: 'Universe Telecom DCB',
    funnelEvents: [
      'VISIT',
      'HOME_VIEW',
      'PLAN_VIEW',
      'CONFIRM_VIEW',
      'OTP_VIEW',
      'OTP_SEND',
      'OTP_VERIFY',
      'SUBSCRIBE_SUCCESS',
      'SUBSCRIBE_FAILED',
    ],
    apiEvents: [
      'API_DCB_CONFIG',
      'API_DCB_SUBSCRIPTIONS',
      'API_DCB_PINCODE',
      'API_DCB_CONFIRM',
      'API_DCB_EXPOSE_CONFIG_IN',
      'API_DCB_EXPOSE_PINCODE_IN',
      'API_DCB_EXPOSE_CONFIRM_IN',
      'API_DCB_EXPOSE_STATUS_IN',
      'API_BILLING_CALLBACK',
      'CALLBACK_RECEIVED',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'RATE_LIMIT_HIT',
      'BLOCKED_REQUEST',
      'BLOCKED',
    ],
    statuses: [
      'VISIT',
      'HOME_SHOWN',
      'CONFIRM_SHOWN',
      'OTP_SHOWN',
      'SUBSCRIBED',
      'SUCCESS',
      'FAILED',
      'BLOCKED',
      'ACTIVE',
      'PENDING',
    ],
    presets: [
      { id: 'dcb-funnel', label: 'DCB Funnel (Visit → PIN → Confirm → Success)', events: ['VISIT', 'API_DCB_PINCODE', 'API_DCB_CONFIRM', 'SUBSCRIBE_SUCCESS'] },
      { id: 'dcb-api', label: 'PIN Send vs PIN Confirm', events: ['API_DCB_EXPOSE_PINCODE_IN', 'API_DCB_EXPOSE_CONFIRM_IN'] },
      { id: 'dcb-conv', label: 'Success vs Postback', events: ['SUBSCRIBE_SUCCESS', 'POSTBACK_SENT'] },
    ],
    defaultCompare: ['VISIT', 'API_DCB_PINCODE', 'API_DCB_CONFIRM', 'SUBSCRIBE_SUCCESS'],
  },
  OTP_ONLY: {
    label: 'OTP Only Flow',
    funnelEvents: [
      'VISIT',
      'HOME_VIEW',
      'SUBSCRIBE_CLICK',
      'OTP_VIEW',
      'OTP_SEND',
      'OTP_VERIFY',
      'SUBSCRIBE_SUCCESS',
      'SUBSCRIBE_FAILED',
    ],
    apiEvents: [
      'API_OTP_SEND',
      'API_OTP_VERIFY',
      'API_OTP_EXPOSE_SEND_IN',
      'API_OTP_EXPOSE_VERIFY_IN',
      'API_CHECKSUB',
      'API_SUBSCRIBE',
      'CALLBACK_RECEIVED',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'RATE_LIMIT_HIT',
      'BLOCKED',
    ],
    statuses: [
      'VISIT',
      'HOME_SHOWN',
      'OTP_SHOWN',
      'SUBSCRIBED',
      'SUCCESS',
      'FAILED',
      'BLOCKED',
    ],
    presets: [
      { id: 'otp-funnel', label: 'OTP Funnel (Visit → Send → Verify → Success)', events: ['VISIT', 'OTP_SEND', 'OTP_VERIFY', 'SUBSCRIBE_SUCCESS'] },
      { id: 'otp-screens', label: 'Visit vs Home vs OTP', events: ['VISIT', 'HOME_VIEW', 'OTP_VERIFY'] },
    ],
    defaultCompare: ['VISIT', 'OTP_SEND', 'OTP_VERIFY', 'SUBSCRIBE_SUCCESS'],
  },
  HEADER_INJECTION: {
    label: 'Header Injection',
    funnelEvents: [
      'VISIT',
      'HOME_VIEW',
      'PLAN_VIEW',
      'CONFIRM_VIEW',
      'CONFIRM_CLICK',
      'SUBSCRIBE_CLICK',
      'SUBSCRIBE_SUCCESS',
      'SUBSCRIBE_FAILED',
    ],
    apiEvents: [
      'API_HE_TOKEN',
      'API_HE_MSISDN',
      'API_HE_RESOLVE',
      'API_HE_REDIRECT',
      'API_RESOLVE_MSISDN',
      'API_CHECKSUB',
      'API_SUBSCRIBE',
      'CALLBACK_RECEIVED',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'BLOCKED',
    ],
    statuses: [
      'VISIT',
      'HOME_SHOWN',
      'CONFIRM_SHOWN',
      'SUBSCRIBED',
      'SUCCESS',
      'FAILED',
      'BLOCKED',
    ],
    presets: [
      { id: 'he-funnel', label: 'HE Funnel (Visit → HE Resolve → Click → Success)', events: ['VISIT', 'API_HE_RESOLVE', 'SUBSCRIBE_CLICK', 'SUBSCRIBE_SUCCESS'] },
    ],
    defaultCompare: ['VISIT', 'API_HE_RESOLVE', 'SUBSCRIBE_CLICK', 'SUBSCRIBE_SUCCESS'],
  },
  BOTH: {
    label: 'Header Injection + OTP',
    funnelEvents: [
      'VISIT',
      'HOME_VIEW',
      'PLAN_VIEW',
      'CONFIRM_VIEW',
      'CONFIRM_CLICK',
      'SUBSCRIBE_CLICK',
      'OTP_VIEW',
      'OTP_SEND',
      'OTP_VERIFY',
      'SUBSCRIBE_SUCCESS',
      'SUBSCRIBE_FAILED',
    ],
    apiEvents: [
      'API_HE_TOKEN',
      'API_HE_MSISDN',
      'API_HE_RESOLVE',
      'API_HE_REDIRECT',
      'API_RESOLVE_MSISDN',
      'API_CHECKSUB',
      'API_SUBSCRIBE',
      'API_OTP_SEND',
      'API_OTP_VERIFY',
      'CALLBACK_RECEIVED',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'BLOCKED',
    ],
    statuses: [
      'VISIT',
      'HOME_SHOWN',
      'CONFIRM_SHOWN',
      'OTP_SHOWN',
      'SUBSCRIBED',
      'SUCCESS',
      'FAILED',
      'BLOCKED',
    ],
    presets: [
      { id: 'both-funnel', label: 'Funnel: Visit → OTP → Success', events: ['VISIT', 'OTP_VERIFY', 'SUBSCRIBE_SUCCESS'] },
      { id: 'both-he-otp', label: 'HE vs OTP Verify', events: ['API_HE_RESOLVE', 'OTP_VERIFY'] },
    ],
    defaultCompare: ['VISIT', 'OTP_VERIFY', 'SUBSCRIBE_SUCCESS'],
  },
  NONE: {
    label: 'Consent Gateway / Redirect',
    funnelEvents: [
      'VISIT',
      'HOME_VIEW',
      'SUBSCRIBE_CLICK',
      'CG_REDIRECT',
      'SUBSCRIBE_SUCCESS',
      'SUBSCRIBE_FAILED',
    ],
    apiEvents: [
      'API_CG_REDIRECT',
      'CALLBACK_RECEIVED',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'BLOCKED',
    ],
    statuses: [
      'VISIT',
      'HOME_SHOWN',
      'SUBSCRIBED',
      'SUCCESS',
      'FAILED',
      'BLOCKED',
    ],
    presets: [
      { id: 'visit-cg', label: 'Visit vs CG', events: ['VISIT', 'CG_REDIRECT'] },
      { id: 'visit-home-cg', label: 'Visit vs Home vs CG', events: ['VISIT', 'HOME_VIEW', 'CG_REDIRECT'] },
      { id: 'visit-banner-cg', label: 'Visit vs Banner vs CG', events: ['VISIT', 'SUBSCRIBE_CLICK', 'CG_REDIRECT'] },
    ],
    defaultCompare: ['VISIT', 'CG_REDIRECT'],
  },
  CG_HOME: {
    label: 'CG via Home',
    funnelEvents: [
      'VISIT',
      'HOME_VIEW',
      'SUBSCRIBE_CLICK',
      'CG_REDIRECT',
      'SUBSCRIBE_SUCCESS',
      'SUBSCRIBE_FAILED',
    ],
    apiEvents: [
      'API_CG_REDIRECT',
      'CALLBACK_RECEIVED',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'BLOCKED',
    ],
    statuses: [
      'VISIT',
      'HOME_SHOWN',
      'SUBSCRIBED',
      'SUCCESS',
      'FAILED',
      'BLOCKED',
    ],
    presets: [
      { id: 'visit-cg', label: 'Visit vs CG', events: ['VISIT', 'CG_REDIRECT'] },
      { id: 'visit-home-cg', label: 'Visit vs Home vs CG', events: ['VISIT', 'HOME_VIEW', 'CG_REDIRECT'] },
      { id: 'visit-banner-cg', label: 'Visit vs Banner vs CG', events: ['VISIT', 'SUBSCRIBE_CLICK', 'CG_REDIRECT'] },
    ],
    defaultCompare: ['VISIT', 'HOME_VIEW', 'CG_REDIRECT'],
  },
}

export function isForeignFlowEvent(eventType, flowType) {
  if (!flowType) return false
  const t = String(eventType).toUpperCase()
  if (flowType === 'ORANGE_BF') {
    return t.includes('DCB') || t.includes('API_HE') || t.includes('CG_REDIRECT')
  }
  if (flowType === 'UNIVERSE_DCB') {
    return t.includes('ORANGE_BF') || t.includes('API_HE') || t.includes('CG_REDIRECT')
  }
  if (flowType === 'OTP_ONLY') {
    return t.includes('ORANGE_BF') || t.includes('DCB') || t.includes('API_HE') || t.includes('CG_REDIRECT')
  }
  if (flowType === 'HEADER_INJECTION') {
    return t.includes('ORANGE_BF') || t.includes('DCB') || t.includes('CG_REDIRECT')
  }
  if (flowType === 'NONE' || flowType === 'CG_HOME') {
    return t.includes('ORANGE_BF') || t.includes('DCB') || t.includes('API_HE') || t.includes('OTP_')
  }
  return false
}

export const COMPARE_PRESETS = [
  { id: 'visit-cg', label: 'Visit vs CG', events: ['VISIT', 'CG_REDIRECT'] },
  { id: 'visit-home-cg', label: 'Visit vs Home vs CG', events: ['VISIT', 'HOME_VIEW', 'CG_REDIRECT'] },
  { id: 'visit-banner-cg', label: 'Visit vs Banner vs CG', events: ['VISIT', 'SUBSCRIBE_CLICK', 'CG_REDIRECT'] },
]

export function eventLabel(type, flowType) {
  if (flowType === 'ORANGE_BF') {
    const obf = {
      VISIT: 'Ad Visit (Landing)',
      HOME_VIEW: 'Screen 1: Mobile Number Entry',
      CONFIRM_VIEW: 'Screen 2: Confirm Pack',
      CONFIRM_CLICK: 'Screen 2: Confirm Click',
      OTP_VIEW: 'Screen 3: Enter 4-Digit OTP',
      OTP_SEND: 'OTP Sent to User',
      OTP_VERIFY: 'Screen 3: OTP Verified',
      SUBSCRIBE_SUCCESS: 'Conversion: Subscribed & Charged',
      SUBSCRIBE_FAILED: 'Subscription Failed',
      API_ORANGE_BF_CHECKSUB: 'API: CheckSub (Operator)',
      API_ORANGE_BF_OTP_SEND: 'API: Send OTP (Operator)',
      API_ORANGE_BF_OTP_VERIFY: 'API: Verify OTP (Operator)',
      API_ORANGE_BF_SYNC: 'API: Sync Subscription',
      API_ORANGE_BF_EXPOSE_SEND_IN: 'API: Expose Send In',
      API_ORANGE_BF_EXPOSE_VERIFY_IN: 'API: Expose Verify In',
      CALLBACK_RECEIVED: 'Operator Callback Received',
      POSTBACK_SENT: 'Affiliate Postback Sent',
      POSTBACK_FAILED: 'Affiliate Postback Failed',
      RATE_LIMIT_HIT: 'Rate Limit Hit',
      BRUTE_FORCE_ATTEMPT: 'Brute Force Attempt',
      BLOCKED_REQUEST: 'Blocked Request',
      BLOCKED: 'Blocked Traffic',
    }
    if (obf[type]) return obf[type]
  }

  if (flowType === 'UNIVERSE_DCB') {
    const dcb = {
      VISIT: 'Ad Visit (Landing)',
      HOME_VIEW: 'Screen 1: Welcome & Overview',
      PLAN_VIEW: 'Screen 2: Select Pack',
      CONFIRM_VIEW: 'Screen 2: Confirm Pack',
      OTP_VIEW: 'Screen 3: Enter PIN Code',
      OTP_SEND: 'PIN Requested',
      OTP_VERIFY: 'Screen 3: Confirm PIN',
      SUBSCRIBE_SUCCESS: 'Conversion: Subscribed & Charged',
      SUBSCRIBE_FAILED: 'Subscription Failed',
      API_DCB_PINCODE: 'API: Send PIN (Universe DCB)',
      API_DCB_CONFIRM: 'API: Confirm PIN (Universe DCB)',
      API_DCB_CONFIG: 'API: DCB Config',
      API_DCB_EXPOSE_PINCODE_IN: 'API: PIN Send In',
      API_DCB_EXPOSE_CONFIRM_IN: 'API: PIN Confirm In',
      API_BILLING_CALLBACK: 'API: Billing Callback',
      CALLBACK_RECEIVED: 'Callback Received',
      POSTBACK_SENT: 'Affiliate Postback Sent',
      BLOCKED: 'Blocked Traffic',
    }
    if (dcb[type]) return dcb[type]
  }

  if (flowType === 'OTP_ONLY') {
    const otpOnly = {
      VISIT: 'Ad Visit (Landing)',
      HOME_VIEW: 'Screen 1: Welcome & Mobile Number',
      OTP_VIEW: 'Screen 2: Enter OTP',
      OTP_SEND: 'OTP Sent to User',
      OTP_VERIFY: 'Screen 2: OTP Verified',
      SUBSCRIBE_SUCCESS: 'Conversion: Subscribed',
      SUBSCRIBE_FAILED: 'Subscription Failed',
      API_OTP_SEND: 'API: Send OTP Gateway',
      API_OTP_VERIFY: 'API: Verify OTP Gateway',
      POSTBACK_SENT: 'Affiliate Postback Sent',
      BLOCKED: 'Blocked Traffic',
    }
    if (otpOnly[type]) return otpOnly[type]
  }

  if (flowType === 'HEADER_INJECTION') {
    const he = {
      VISIT: 'Ad Visit (Landing)',
      HOME_VIEW: 'Screen 1: Welcome (HE Number Resolved)',
      CONFIRM_VIEW: 'Screen 2: Confirm Pack',
      SUBSCRIBE_CLICK: 'Subscribe Click',
      SUBSCRIBE_SUCCESS: 'Conversion: Subscribed',
      SUBSCRIBE_FAILED: 'Subscription Failed',
      API_HE_RESOLVE: 'API: Resolve Carrier Header',
      API_HE_TOKEN: 'API: Carrier Token',
      API_HE_MSISDN: 'API: Decrypt MSISDN',
      POSTBACK_SENT: 'Affiliate Postback Sent',
      BLOCKED: 'Blocked / Non-Carrier IP',
    }
    if (he[type]) return he[type]
  }

  if (flowType === 'NONE' || flowType === 'CG_HOME') {
    const cg = {
      VISIT: 'Ad Visit (Landing)',
      HOME_VIEW: 'Screen 1: Landing Page',
      SUBSCRIBE_CLICK: 'Continue / Subscribe Click',
      CG_REDIRECT: 'Redirected to Telecom Consent Gateway',
      SUBSCRIBE_SUCCESS: 'Conversion: Operator CG Success',
      SUBSCRIBE_FAILED: 'Gateway Subscription Failed',
      API_CG_REDIRECT: 'API: Consent Gateway Redirect',
      CALLBACK_RECEIVED: 'Telecom Callback Received',
      POSTBACK_SENT: 'Affiliate Postback Sent',
      BLOCKED: 'Blocked Traffic',
    }
    if (cg[type]) return cg[type]
  }

  const standard = {
    VISIT: 'Ad Visit (Landing)',
    HOME_VIEW: 'Screen 1: Home Shown',
    CONFIRM_VIEW: 'Screen 2: Confirm Shown',
    OTP_VIEW: 'Screen 3: OTP Box',
    OTP_SEND: 'OTP Send',
    OTP_VERIFY: 'Screen 3: OTP Verify',
    SUBSCRIBE_SUCCESS: 'Subscribe Success (Converted)',
    SUBSCRIBE_FAILED: 'Subscribe Failed',
    CG_REDIRECT: 'CG Redirect',
    POSTBACK_SENT: 'Postback Sent',
    BLOCKED: 'Blocked',
  }
  return standard[type] || type.replace(/_/g, ' ')
}

export function statusLabel(status, flowType) {
  if (flowType === 'ORANGE_BF') {
    const obf = {
      VISIT: '1. Landed (Dropped at Screen 1)',
      HOME_SHOWN: '1. Screen 1: Home / Number Shown',
      CONFIRM_SHOWN: '2. Screen 2: Reached Pack Confirm',
      OTP_SHOWN: '3. Screen 3: Reached OTP Screen',
      SUBSCRIBED: '4. Subscribed & Charged (Success)',
      SUCCESS: '4. Subscribed & Charged (Success)',
      FAILED: 'Failed / Insufficient Balance',
      BLOCKED: 'Blocked (Anti-Fraud / Wrong Carrier)',
      ACTIVE: 'Already Active Subscriber',
    }
    if (obf[status]) return obf[status]
  }

  if (flowType === 'UNIVERSE_DCB') {
    const dcb = {
      VISIT: '1. Landed (Dropped at Landing)',
      HOME_SHOWN: '1. Screen 1: Home Shown',
      CONFIRM_SHOWN: '2. Screen 2: Reached Pack Selection',
      OTP_SHOWN: '3. Screen 3: Reached PIN Entry',
      SUBSCRIBED: '4. Subscribed & Charged (Success)',
      SUCCESS: '4. Subscribed & Charged (Success)',
      FAILED: 'Failed / Insufficient Balance',
      BLOCKED: 'Blocked Traffic',
      ACTIVE: 'Active Subscriber',
      PENDING: 'Pending Confirmation',
    }
    if (dcb[status]) return dcb[status]
  }

  if (flowType === 'OTP_ONLY') {
    const otp = {
      VISIT: '1. Landed (Dropped at Landing)',
      HOME_SHOWN: '1. Screen 1: Home Shown',
      OTP_SHOWN: '2. Screen 2: Reached OTP Screen',
      SUBSCRIBED: '3. Subscribed (Success)',
      SUCCESS: '3. Subscribed (Success)',
      FAILED: 'Failed',
      BLOCKED: 'Blocked',
    }
    if (otp[status]) return otp[status]
  }

  if (flowType === 'HEADER_INJECTION') {
    const he = {
      VISIT: '1. Landed (Dropped at Landing)',
      HOME_SHOWN: '1. Screen 1: Home Shown (HE Resolved)',
      CONFIRM_SHOWN: '2. Screen 2: Reached Confirm Pack',
      SUBSCRIBED: '3. Subscribed (Success)',
      SUCCESS: '3. Subscribed (Success)',
      FAILED: 'Failed',
      BLOCKED: 'Blocked (Non-Carrier IP)',
    }
    if (he[status]) return he[status]
  }

  if (flowType === 'NONE' || flowType === 'CG_HOME') {
    const cg = {
      VISIT: '1. Landed (Dropped at Landing)',
      HOME_SHOWN: '1. Screen 1: Home Shown',
      SUBSCRIBED: '2. Converted (Operator CG Success)',
      SUCCESS: '2. Success',
      FAILED: 'Failed at Operator Gateway',
      BLOCKED: 'Blocked Traffic',
    }
    if (cg[status]) return cg[status]
  }

  const standard = {
    VISIT: 'Visit (Landed)',
    HOME_SHOWN: 'Home Shown',
    CONFIRM_SHOWN: 'Confirm Shown',
    OTP_SHOWN: 'OTP Shown',
    SUBSCRIBED: 'Subscribed (Success)',
    SUCCESS: 'Success',
    FAILED: 'Failed',
    BLOCKED: 'Blocked',
    ACTIVE: 'Active',
    PENDING: 'Pending',
  }
  return standard[status] || status
}

export function seriesColor(index) {
  return COMPARE_COLORS[index % COMPARE_COLORS.length]
}

export const STANDARD_EVENT_TYPES = [
  'VISIT',
  'HOME_VIEW',
  'CONFIRM_VIEW',
  'OTP_VIEW',
  'OTP_SEND',
  'OTP_VERIFY',
  'SUBSCRIBE_SUCCESS',
  'SUBSCRIBE_FAILED',
  'API_ORANGE_BF_OTP_SEND',
  'API_ORANGE_BF_OTP_VERIFY',
  'API_ORANGE_BF_CHECKSUB',
  'API_DCB_PINCODE',
  'API_DCB_CONFIRM',
  'API_HE_RESOLVE',
  'CG_REDIRECT',
  'CALLBACK_RECEIVED',
  'POSTBACK_SENT',
  'POSTBACK_FAILED',
  'BLOCKED',
]

export function resolveInterval(preset, from, to) {
  if (preset === 'all') return 'day'
  if (preset === 'today') return 'hour'
  if (from && to && from === to) return 'hour'
  return 'day'
}

export function getEventBadgeClass(type) {
  const t = String(type).toUpperCase()
  if (t.includes('SUCCESS') || t.includes('SUBSCRIBED')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
  }
  if (t.includes('FAILED') || t.includes('LIMIT') || t.includes('BRUTE') || t.includes('BLOCKED')) {
    return 'bg-rose-50 text-rose-700 border-rose-200/50'
  }
  if (t.includes('API_SUBSCRIBE') || t === 'SUBSCRIBE' || t.includes('SUBSCRIBE_CLICK') || t.includes('CG_REDIRECT')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/50'
  }
  if (t.includes('OTP_VERIFY') || t.includes('API_OTP_VERIFY') || t.includes('OTP_EXPOSE_VERIFY')) {
    return 'bg-violet-50 text-violet-700 border-violet-200/50'
  }
  if (
    t.includes('OTP_SEND') ||
    t.includes('API_OTP_SEND') ||
    t.includes('OTP_EXPOSE_SEND') ||
    t.includes('OTP_VIEW') ||
    t.includes('OTP_SHOWN') ||
    t.includes('OTP')
  ) {
    return 'bg-amber-50 text-amber-700 border-amber-200/50'
  }
  if (t.includes('CLICK')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/50'
  }
  if (t.includes('HOME_VIEW') || t.includes('HOME')) {
    return 'bg-teal-50 text-teal-700 border-teal-200/50'
  }
  if (t.includes('CONFIRM_VIEW') || t.includes('CONFIRM')) {
    return 'bg-purple-50 text-purple-700 border-purple-200/50'
  }
  if (t.includes('PLAN_VIEW') || t.includes('PLAN')) {
    return 'bg-sky-50 text-sky-700 border-sky-200/50'
  }
  if (t.includes('VISIT')) {
    return 'bg-blue-50 text-blue-700 border-blue-200/50'
  }
  return 'bg-gray-50 text-gray-700 border-gray-200/50'
}

export function getStatusBadgeClass(status) {
  const s = String(status).toUpperCase()
  if (s === 'ACTIVE' || s.includes('SUCCESS') || s.includes('SUBSCRIBED')) {
    return 'text-emerald-600'
  }
  if (s === 'NEW' || s === 'INACTIVE' || s === 'PENDING' || s === 'GRACE' || s === 'PARKING') {
    return 'text-amber-600'
  }
  if (s.includes('FAILED') || s.includes('BLOCKED')) {
    return 'text-rose-600'
  }
  if (s.includes('OTP_SHOWN') || s.includes('CONFIRM_SHOWN')) {
    return 'text-amber-600'
  }
  if (s.includes('PLAN_SHOWN') || s.includes('HOME_SHOWN')) {
    return 'text-indigo-600'
  }
  if (s.includes('VISIT')) {
    return 'text-blue-600'
  }
  return 'text-gray-500'
}
