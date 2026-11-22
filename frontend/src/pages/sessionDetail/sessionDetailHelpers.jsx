import {
  CheckCircle2,
  Activity,
  Code2,
  XCircle,
  KeyRound,
  Phone,
  MousePointerClick,
  Compass,
  Eye,
  Clock,
} from 'lucide-react'
import {
  GLOBAL_CALLBACK_STATUSES,
  vendorFireSkipCopy,
} from '../../components/partners/AllowedCallbackStatusesField'

export function getEventIcon(eventType, status) {
  const t = String(eventType || '').toUpperCase()
  if (t === 'CHECKSUB_30M') {
    const s = String(status || '').toUpperCase()
    if (s === 'ACTIVE' || s.includes('SUCCESS')) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />
    }
    return <Activity className="w-4 h-4 text-amber-600" />
  }
  if (t.startsWith('API_')) return <Code2 className="w-4 h-4 text-sky-600" />
  if (t.includes('SUBSCRIBED') || t.includes('SUCCESS')) {
    return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
  }
  if (t.includes('FAILED') || t.includes('LIMIT') || t.includes('BRUTE') || t.includes('BLOCKED')) {
    return <XCircle className="w-4 h-4 text-rose-500" />
  }
  if (t.includes('OTP_VERIFY') || t.includes('OTP_EXPOSE_VERIFY')) return <KeyRound className="w-4 h-4 text-violet-500" />
  if (
    t.includes('OTP_SEND') ||
    t.includes('OTP_EXPOSE_SEND') ||
    t.includes('OTP_VIEW') ||
    t.includes('OTP_SHOWN')
  ) {
    return <Phone className="w-4 h-4 text-amber-500" />
  }
  if (t.includes('CLICK') || t.includes('CG_REDIRECT')) return <MousePointerClick className="w-4 h-4 text-indigo-500" />
  if (t.includes('VISIT')) return <Compass className="w-4 h-4 text-blue-500" />
  if (t.includes('VIEW') || t.includes('SHOWN')) return <Eye className="w-4 h-4 text-gray-500" />
  return <Clock className="w-4 h-4 text-gray-400" />
}

export function statusClass(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'ACTIVE' || s.includes('SUCCESS') || s.includes('SUBSCRIBED') || s === 'SENT') {
    return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  }
  if (s === 'NEW' || s === 'INACTIVE' || s === 'PENDING' || s === 'GRACE' || s.includes('PARKING') || s === 'HELD') {
    return 'text-amber-700 bg-amber-50 border-amber-200'
  }
  if (s.includes('FAILED') || s.includes('BLOCKED') || s.includes('UNSUB') || s.includes('SUSPEND') || s.includes('UNKNOWN')) {
    return 'text-rose-700 bg-rose-50 border-rose-200'
  }
  return 'text-gray-600 bg-gray-50 border-gray-200'
}

export function eventPack(metadata) {
  if (!metadata || typeof metadata !== 'object') return ''
  const raw = metadata.pack || metadata.planId
  return String(raw || '').trim().toLowerCase()
}

export function parseJsonish(value) {
  if (value == null || value === '') return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function billingSkipFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (payload.vendorFired !== false) return null
  const received =
    payload.receivedStatus || payload.operatorStatus || payload.status
  if (!received) return null
  return vendorFireSkipCopy(
    received,
    payload.allowedStatuses || GLOBAL_CALLBACK_STATUSES,
  )
}

export function eventChip(metadata, key) {
  if (!metadata || typeof metadata !== 'object') return ''
  return String(metadata[key] || '').trim()
}

export function eventDescription(eventType) {
  switch (eventType) {
    case 'VISIT':
      return 'Visitor landed on the campaign URL.'
    case 'HOME_VIEW':
      return 'Home page displayed to user.'
    case 'SUBSCRIBE_CLICK':
      return 'User clicked a subscribe / banner button.'
    case 'CG_REDIRECT':
      return 'User redirected to the operator CG page with click_id.'
    case 'CONFIRM_CLICK':
      return 'User confirmed a pack and hit the billing subscribe API.'
    case 'OTP_VIEW':
      return 'OTP page displayed.'
    case 'OTP_SEND':
      return 'OTP dispatched to subscriber device.'
    case 'OTP_VERIFY':
      return 'User submitted OTP for verification.'
    case 'SUBSCRIBE_SUCCESS':
      return 'Subscription confirmed or already subscribed.'
    case 'SUBSCRIBE_FAILED':
      return 'Subscription failed or rejected by partner gateway.'
    case 'API_CHECKSUB':
      return 'Partner subscription status check (checksub).'
    case 'CHECKSUB_30M':
      return '30-minute post-conversion operator checksub audit.'
    case 'API_PRIORITY':
      return 'Priority Chain API check (page actions).'
    case 'API_SUBSCRIBE':
      return 'Partner subscribe / billing API call.'
    case 'API_BLOCKLIST':
      return 'Partner blocklist check.'
    case 'API_RESOLVE_MSISDN':
      return 'Partner MSISDN resolve call.'
    case 'API_HE_TOKEN':
      return 'HE token exchange.'
    case 'API_HE_MSISDN':
      return 'HE masked MSISDN fetch.'
    case 'API_HE_RESOLVE':
      return 'HE custom MSISDN resolve.'
    case 'API_HE_REDIRECT':
      return 'HE success/fail redirect decision.'
    case 'API_CG_REDIRECT':
      return 'CG redirect URL issued (HOME CTA or landing).'
    case 'API_BILLING_CALLBACK':
      return 'Billing / operator callback received on our endpoint.'
    case 'API_VENDOR_POSTBACK':
      return 'Outbound vendor / affiliate CPA postback we fired.'
    case 'API_OTP_SEND':
      return 'Outbound partner OTP send API call.'
    case 'API_OTP_VERIFY':
      return 'Outbound partner OTP verify API call.'
    case 'API_OTP_EXPOSE_SEND_IN':
      return 'Inbound OTP expose send request (mediator).'
    case 'API_OTP_EXPOSE_VERIFY_IN':
      return 'Inbound OTP expose verify request (mediator).'
    case 'API_DCB_CONFIG':
      return 'Outbound Universe DCB public config fetch.'
    case 'API_DCB_SUBSCRIPTIONS':
      return 'Outbound Universe DCB subscriptions / status check.'
    case 'API_DCB_PINCODE':
      return 'Outbound Universe DCB PIN request to the operator.'
    case 'API_DCB_CONFIRM':
      return 'Outbound Universe DCB PIN confirm to the operator.'
    case 'API_DCB_EXPOSE_CONFIG_IN':
      return 'Inbound DCB expose pack list (vendor hit).'
    case 'API_DCB_EXPOSE_PINCODE_IN':
      return 'Inbound DCB expose PIN request (vendor hit).'
    case 'API_DCB_EXPOSE_CONFIRM_IN':
      return 'Inbound DCB expose PIN confirm (vendor hit).'
    case 'API_DCB_EXPOSE_STATUS_IN':
      return 'Inbound DCB expose status poll (vendor hit).'
    case 'API_ORANGE_BF_CHECKSUB':
      return 'Orange BF subscriber status check (checksub).'
    case 'API_ORANGE_BF_OTP_SEND':
      return 'Orange BF SMS OTP generate & dispatch call.'
    case 'API_ORANGE_BF_OTP_VERIFY':
      return 'Orange BF OTP validate & verify call.'
    case 'API_ORANGE_BF_UNSUB':
      return 'Orange BF subscriber unsubscribe request.'
    case 'API_ORANGE_BF_SYNC':
      return 'Orange BF subscription engine sync.'
    case 'API_ORANGE_BF_EXPOSE_CHECK_IN':
      return 'Inbound Orange BF vendor CheckSub request.'
    case 'API_ORANGE_BF_EXPOSE_SEND_IN':
      return 'Inbound Orange BF vendor OTP Send request.'
    case 'API_ORANGE_BF_EXPOSE_VERIFY_IN':
      return 'Inbound Orange BF vendor OTP Verify request.'
    case 'API_ORANGE_BF_EXPOSE_UNSUB_IN':
      return 'Inbound Orange BF vendor Unsubscribe request.'
    case 'CALLBACK_RECEIVED':
      return 'Billing / operator callback received.'
    case 'POSTBACK_PENDING':
      return 'Vendor CPA postback queued, waiting for billing confirmation.'
    case 'POSTBACK_SENT':
      return 'Vendor / affiliate postback fired successfully.'
    case 'POSTBACK_FAILED':
      return 'Vendor / affiliate postback failed or returned an error.'
    default:
      return null
  }
}

export function getRequestPayload(call) {
  if (!call) return null
  if (call.requestBody != null && call.requestBody !== '') {
    return call.requestBody
  }
  if (call.requestUrl && call.requestUrl.includes('?')) {
    try {
      const qIndex = call.requestUrl.indexOf('?')
      const search = call.requestUrl.slice(qIndex + 1)
      const params = Object.fromEntries(new URLSearchParams(search).entries())
      if (Object.keys(params).length > 0) return params
    } catch {
      // ignore invalid URL search params
    }
  }
  return null
}

export function categorizeTimelineItem(item, apiCall) {
  const type = String(item.eventType || '').toUpperCase()
  const callType = String(apiCall?.callType || '').toLowerCase()

  // 30m Checksub audit belongs to Step 4 (Outcome / Final verification)
  if (type === 'CHECKSUB_30M' || callType === 'delayed_checksub') {
    return {
      stepIndex: 4,
      stepKey: 'OUTCOME',
      stepTitle: 'Step 4: Activation, Billing & Postback',
      badge: 'COMPLETION',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    }
  }

  // Step 1: Landing & MSISDN Detection / Identification
  if (
    type === 'VISIT' ||
    type === 'HOME_VIEW' ||
    type.includes('RESOLVE_MSISDN') ||
    type.includes('API_HE_') ||
    (type.includes('CHECKSUB') && type !== 'CHECKSUB_30M') ||
    callType === 'checksub' ||
    callType.includes('he_') ||
    callType.includes('resolve')
  ) {
    return {
      stepIndex: 1,
      stepKey: 'LANDING',
      stepTitle: 'Step 1: Landing & Identification',
      badge: 'HOME',
      badgeColor: 'text-sky-700 bg-sky-50 border-sky-200',
    }
  }

  // Step 2: Funnel Transition / Pack Selection / Priority Check
  if (
    type === 'SUBSCRIBE_CLICK' ||
    type.includes('PRIORITY') ||
    callType === 'priority' ||
    type.includes('BLOCKLIST')
  ) {
    return {
      stepIndex: 2,
      stepKey: 'PLAN_SELECTION',
      stepTitle: 'Step 2: Plan Selection & Priority Check',
      badge: 'CONFIRM / STEP 2',
      badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    }
  }

  // Step 3: OTP / PIN Verification & Billing Auth
  if (
    type.includes('OTP') ||
    type.includes('PIN') ||
    type.includes('DCB') ||
    type.includes('CONFIRM_CLICK') ||
    callType.includes('otp') ||
    callType.includes('dcb') ||
    callType.includes('pincode')
  ) {
    return {
      stepIndex: 3,
      stepKey: 'VERIFICATION',
      stepTitle: 'Step 3: OTP / PIN Verification & Billing Auth',
      badge: 'OTP',
      badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
    }
  }

  // Step 4: Outcome, Billing Callback & Postback
  return {
    stepIndex: 4,
    stepKey: 'OUTCOME',
    stepTitle: 'Step 4: Subscription Outcome & Postback',
    badge: 'THANKYOU / BILLING',
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  }
}
