import PageNode from '../PageNode'
import StartEndNode from '../StartEndNode'
import { conditionLabel } from '../flowConditions'
import { applyUniverseDcbGraphLayout } from '../verificationModes'
import {
  withVisualStartEnd,
  isMetaPageType,
} from '../startConfig'
import { PAGE_TYPE_LABELS } from '../../../services/api/campaigns'

export const nodeTypes = { pageNode: PageNode, startEndNode: StartEndNode }

export const PAGE_TYPES = [
  'HOME',
  'OTP',
  'CONFIRM',
  'THANKYOU',
  'INPROGRESS',
  'LOW_BALANCE',
  'BLOCKED',
  'ERROR',
]

export function dcbPageLabel(pageType) {
  if (pageType === 'OTP') return 'Number then PIN'
  if (pageType === 'HOME') return 'Choose pack'
  return PAGE_TYPE_LABELS[pageType] || pageType
}

export function orangeBfPageLabel(pageType) {
  if (pageType === 'HOME') return 'Enter PIN / Number'
  if (pageType === 'CONFIRM') return 'Confirm / Plan'
  if (pageType === 'OTP') return 'Verify PIN / OTP'
  if (pageType === 'THANKYOU') return 'Thank you'
  return PAGE_TYPE_LABELS[pageType] || pageType
}

export function orangeBfPageSubtitle(pageType) {
  if (pageType === 'HOME') return 'Enter mobile number'
  if (pageType === 'CONFIRM') return 'Plan details & subscribe'
  if (pageType === 'OTP') return 'Enter SMS OTP code'
  if (pageType === 'THANKYOU') return 'Funnel finished'
  return undefined
}

export function toRfNodes(flowConfig, startConfig, mode) {
  const isDcb = mode === 'UNIVERSE_DCB'
  const isOrangeBf = mode === 'ORANGE_BF'
  const source =
    isDcb ? applyUniverseDcbGraphLayout(flowConfig) : flowConfig
  const visual = withVisualStartEnd(source, startConfig, mode)
  return (visual.nodes || []).map((n) => {
    const isMeta = isMetaPageType(n.pageType)
    let label = n.label
    let subtitle = n.subtitle
    if (
      !label ||
      (isOrangeBf &&
        !isMeta &&
        (label === 'Home' ||
          label === 'Confirm' ||
          label === 'OTP' ||
          label === 'Mobile Number' ||
          label === 'Verify OTP'))
    ) {
      if (isMeta) {
        label = n.pageType
      } else if (isDcb) {
        label = dcbPageLabel(n.pageType)
      } else if (isOrangeBf) {
        label = orangeBfPageLabel(n.pageType)
      } else {
        label = PAGE_TYPE_LABELS[n.pageType] || n.pageType
      }
    }
    if (
      !subtitle ||
      (isOrangeBf &&
        !isMeta &&
        (subtitle === 'Edit opens the HTML canvas' ||
          subtitle === 'Enter mobile number' ||
          subtitle === 'Enter SMS code'))
    ) {
      if (isOrangeBf && !isMeta) {
        subtitle = orangeBfPageSubtitle(n.pageType)
      }
    }
    return {
      id: n.id,
      type: isMeta ? 'startEndNode' : 'pageNode',
      position: n.position || { x: 0, y: 0 },
      deletable: !isMeta,
      data: {
        label,
        subtitle,
        pageType: n.pageType,
        step: n.step,
        editQuery: n.step ? { step: n.step } : undefined,
        kind: n.kind || (n.pageType === 'START' ? 'start' : n.pageType === 'END' ? 'end' : 'page'),
        startConfig: isMeta && n.pageType === 'START' ? visual.startConfig : undefined,
      },
    }
  })
}

export function toRfEdges(flowConfig, startConfig, mode) {
  const source =
    mode === 'UNIVERSE_DCB' ? applyUniverseDcbGraphLayout(flowConfig) : flowConfig
  const visual = withVisualStartEnd(source, startConfig, mode)
  return (visual.edges || []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: conditionLabel(e.condition || 'DEFAULT'),
    animated: true,
    data: { condition: e.condition || 'DEFAULT' },
  }))
}
