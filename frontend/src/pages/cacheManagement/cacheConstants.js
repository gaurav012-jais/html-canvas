import { Layers, Zap, Activity, Key } from 'lucide-react'

export const PRESET_SCOPES = [
  {
    id: 'flow',
    title: 'Flow & Campaign Funnels',
    pattern: 'flow:*',
    description:
      'Purges cached campaign structures, page layouts, flow routing rules, and API client configurations.',
    icon: Layers,
    badge: 'badge-info',
    color: 'text-info',
    bg: 'bg-info-muted/30 border-info/30',
  },
  {
    id: 'campaign',
    title: 'Campaign Entity Cache',
    pattern: 'flow:campaign:* & campaign:*',
    description:
      'Invalidates cached campaign records, tracking slugs, and market associations.',
    icon: Zap,
    badge: 'badge-success',
    color: 'text-success',
    bg: 'bg-success-muted/30 border-success/30',
  },
  {
    id: 'detection',
    title: 'Carrier & Detect Sessions',
    pattern: 'flow:detect:* / orange_bf:* / universe_dcb:*',
    description:
      'Clears operator MSISDN detection headers, IP-to-carrier bindings, and active gateway sessions.',
    icon: Activity,
    badge: 'badge-warning',
    color: 'text-warning',
    bg: 'bg-warning-muted/30 border-warning/30',
  },
  {
    id: 'otp',
    title: 'OTP Pendings & Throttle',
    pattern: 'otp:*',
    description:
      'Resets temporary SMS/OTP verification attempts, rate-limiting windows, and pending subscriber codes.',
    icon: Key,
    badge: 'badge-muted',
    color: 'text-fg-muted',
    bg: 'bg-bg-muted/50 border-border',
  },
]
