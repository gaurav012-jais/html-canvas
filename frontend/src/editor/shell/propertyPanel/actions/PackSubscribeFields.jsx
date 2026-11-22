import { useMemo } from 'react'
import {
  defaultSubServiceId,
  previewSubscribeUrl,
  sanitizeSubscribeParam,
  templateHasSubscribeSlots,
} from '../../../utils/subscribeUrlPreview'
import { hasMixedConversionTriggers } from '../../../utils/funnelGuide'
import { inputClass } from '../TypographyControls'
import { Field } from '../propertyPanelUtils'

export function PackSubscribeFields({
  selected,
  attrs,
  editor,
  update,
  campaign,
  packOptions,
  subscribeApiTemplate,
}) {
  const packId = String(attrs['data-pack'] || '').toLowerCase()
  const serviceIdAttr = String(attrs['data-service-id'] || '')
  const subServiceIdAttr = String(attrs['data-sub-service-id'] || '')

  const finalSubscribeUrl = useMemo(() => {
    if (!packId) return ''
    return previewSubscribeUrl(subscribeApiTemplate, {
      pack: packId,
      serviceId: sanitizeSubscribeParam(serviceIdAttr) || campaign?.serviceId || '',
      subServiceId: sanitizeSubscribeParam(subServiceIdAttr),
    })
  }, [packId, serviceIdAttr, subServiceIdAttr, subscribeApiTemplate, campaign?.serviceId])

  return (
    <>
      <Field label="Pack (optional)">
        <select
          className={inputClass}
          value={String(attrs['data-pack'] || '').toLowerCase()}
          onChange={(e) => {
            const pack = e.target.value
            if (!pack) {
              selected.removeAttributes('data-pack')
              selected.removeAttributes('data-purchase-type-id')
            } else {
              const mapping = packOptions.find(
                (item) => String(item.packKey || '').toLowerCase() === pack
              )
              const nextAttrs = { 'data-pack': pack }
              if (mapping?.purchaseTypeId) {
                nextAttrs['data-purchase-type-id'] = String(mapping.purchaseTypeId)
              } else {
                selected.removeAttributes('data-purchase-type-id')
              }
              selected.addAttributes(nextAttrs)
            }
            update()
          }}
        >
          <option value="">None — continue flow / picker</option>
          {(() => {
            const currentPack = String(attrs['data-pack'] || '').toLowerCase()
            const options = [...packOptions]
            if (
              currentPack &&
              !options.some((item) => String(item.packKey || '').toLowerCase() === currentPack)
            ) {
              options.push({
                packKey: currentPack,
                label: currentPack,
                purchaseTypeId: attrs['data-purchase-type-id'] || '',
              })
            }
            return options.map((item) => (
              <option key={item.packKey} value={String(item.packKey).toLowerCase()}>
                {item.label || item.packKey}
                {item.purchaseTypeId ? ` (${item.purchaseTypeId})` : ''}
              </option>
            ))
          })()}
        </select>
        <p className="text-[11px] text-fg-muted mt-1 leading-snug">
          Packs come from Universe DCB mappings in API settings. Choosing one sets this
          button&apos;s pack and purchaseTypeId.
        </p>
      </Field>

      {hasMixedConversionTriggers({
        html:
          (attrs['data-pack'] && 'data-pack=') ||
          (typeof editor?.getHtml === 'function' ? editor.getHtml() : ''),
        postbackRegisterAt: campaign?.postbackRegisterAt,
      }) && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2 leading-snug">
          This campaign also queues a vendor postback on OTP verify. Pack buttons
          and OTP verify are two conversion kinds — both can upsert the same MSISDN
          row. Turn off OTP postback in Campaign Detail if you only want pack-click
          pending.
        </p>
      )}

      {attrs['data-pack'] && (
        <>
          <Field label="Service ID (optional)">
            <input
              className={inputClass}
              placeholder={campaign?.serviceId || 'e.g. 100'}
              value={sanitizeSubscribeParam(attrs['data-service-id'] || '')}
              onChange={(e) => {
                const v = sanitizeSubscribeParam(e.target.value)
                if (!v) selected.removeAttributes('data-service-id')
                else selected.addAttributes({ 'data-service-id': v })
                selected.removeAttributes('data-subscribe-url')
                update()
              }}
            />
            <p className="text-[11px] text-fg-muted mt-1 leading-snug">
              Operator value only (e.g. 100). Do not type{' '}
              <code className="font-mono">{'{{serviceId}}'}</code>. Leave empty to use
              the campaign service ID.
            </p>
          </Field>
          <Field label="Sub-service ID (optional)">
            <input
              className={inputClass}
              placeholder={packId ? defaultSubServiceId(packId) : 'e.g. HMonthly'}
              value={sanitizeSubscribeParam(attrs['data-sub-service-id'] || '')}
              onChange={(e) => {
                const v = sanitizeSubscribeParam(e.target.value)
                if (!v) selected.removeAttributes('data-sub-service-id')
                else selected.addAttributes({ 'data-sub-service-id': v })
                selected.removeAttributes('data-subscribe-url')
                update()
              }}
            />
            <p className="text-[11px] text-fg-muted mt-1 leading-snug">
              Operator value only (e.g.{' '}
              {packId ? defaultSubServiceId(packId) : 'HDaily / HWeekly / HMonthly'}). Do
              not type <code className="font-mono">{'{{subServiceId}}'}</code>. Leave
              empty to use the pack default.
            </p>
          </Field>
          <div className="rounded-md border border-border bg-bg-subtle px-2.5 py-2 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">
              Final subscribe URL
            </p>
            {subscribeApiTemplate ? (
              <>
                <p className="text-[11px] font-mono text-fg break-all leading-snug">
                  {finalSubscribeUrl}
                </p>
                {!templateHasSubscribeSlots(subscribeApiTemplate) && (
                  <p className="text-[11px] text-fg-muted leading-snug">
                    Pack / service / sub-service will not change this URL until you add{' '}
                    <code className="font-mono">{'{{pack}}'}</code>,{' '}
                    <code className="font-mono">{'{{serviceId}}'}</code>, or{' '}
                    <code className="font-mono">{'{{subServiceId}}'}</code> in Campaign
                    API → Subscribe URL. <code className="font-mono">{'{{msisdn}}'}</code>{' '}
                    is filled when the user clicks.
                  </p>
                )}
              </>
            ) : (
              <p className="text-[11px] text-amber-800 leading-snug">
                Set the campaign Subscribe URL in API config first. This preview is built
                from that template + pack / service ID / sub-service ID. MSISDN is filled
                at runtime.
              </p>
            )}
          </div>
          <label className="flex items-start gap-2 text-xs text-fg">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={attrs['data-postback'] !== '0'}
              onChange={(e) => {
                if (e.target.checked) {
                  selected.removeAttributes('data-postback')
                } else {
                  selected.addAttributes({ 'data-postback': '0' })
                }
                update()
              }}
            />
            <span>
              Queue vendor postback on this click
              <span className="block text-[11px] text-fg-muted mt-0.5 leading-snug">
                Default on for pack buttons. Fire still happens when the operator hits
                callback. Uncheck for non-conversion CTAs.
              </span>
            </span>
          </label>
        </>
      )}
    </>
  )
}
