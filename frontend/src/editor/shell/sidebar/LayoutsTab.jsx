import { memo } from 'react'
import { TemplateCard } from '../BlockCard'
import {
  STARTER_TEMPLATES,
  OTP_STARTER_TEMPLATES,
  OTP_NUMBER_STARTER_TEMPLATES,
  OTP_VERIFY_STARTER_TEMPLATES,
  CONFIRM_STARTER_TEMPLATES,
  HOME_STARTER_TEMPLATES,
  THANKYOU_STARTER_TEMPLATES,
  INPROGRESS_STARTER_TEMPLATES,
  LOW_BALANCE_STARTER_TEMPLATES,
  BLOCKED_STARTER_TEMPLATES,
  ERROR_STARTER_TEMPLATES,
} from '../../templates/starterTemplates'
import { applyStarterTemplate } from '../../utils/blockActions'

export function LayoutsTab({
  funnelPageType,
  step,
  editor,
  campaignId,
  updateCampaign,
}) {
  let list = STARTER_TEMPLATES
  if (funnelPageType === 'HOME') {
    list = HOME_STARTER_TEMPLATES
  } else if (funnelPageType === 'OTP') {
    if (step === 'number') {
      list = OTP_NUMBER_STARTER_TEMPLATES
    } else if (step === 'otp' || step === 'pin') {
      list = OTP_VERIFY_STARTER_TEMPLATES
    } else {
      list = OTP_STARTER_TEMPLATES
    }
  } else if (funnelPageType === 'CONFIRM') {
    list = CONFIRM_STARTER_TEMPLATES
  } else if (funnelPageType === 'THANKYOU') {
    list = THANKYOU_STARTER_TEMPLATES
  } else if (funnelPageType === 'INPROGRESS') {
    list = INPROGRESS_STARTER_TEMPLATES
  } else if (funnelPageType === 'LOW_BALANCE') {
    list = LOW_BALANCE_STARTER_TEMPLATES
  } else if (funnelPageType === 'BLOCKED') {
    list = BLOCKED_STARTER_TEMPLATES
  } else if (funnelPageType === 'ERROR') {
    list = ERROR_STARTER_TEMPLATES
  }

  return (
    <div className="p-3 grid grid-cols-1 gap-3">
      {list.map((t) => (
        <TemplateCard
          key={t.id}
          name={t.name}
          description={t.description}
          thumb={t.thumb}
          previewImage={t.previewImage}
          onApply={() =>
            editor &&
            applyStarterTemplate(editor, t, {
              campaignId,
              updateCampaign,
              step,
            })
          }
        />
      ))}
    </div>
  )
}

export default memo(LayoutsTab)
