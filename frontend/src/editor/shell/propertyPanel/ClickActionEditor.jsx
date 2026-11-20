import { memo, useMemo, useState, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import { PAGE_TYPES, PAGE_TYPE_LABELS, getCampaignApiConfig } from '../../../services/api/campaigns'
import { campaignEditPath } from '../../../utils/routes'
import { PriorityChainTrigger } from '../PriorityChainModal'
import { SubscribeRouteTrigger } from '../SubscribeRouteModal'
import { DEFAULT_SUBSCRIBE_ROUTES } from '../../utils/subscribeRoutes'
import {
  defaultSubServiceId,
  previewSubscribeUrl,
  sanitizeSubscribeParam,
  templateHasSubscribeSlots,
} from '../../utils/subscribeUrlPreview'
import { CLASSIC_PACK_OPTIONS, editorPackOptions } from '../../../components/dashboard/dcbConfig'
import { hasMixedConversionTriggers } from '../../utils/funnelGuide'
import { listSectionAnchorsOnPage } from '../../utils/sectionAnchor'
import { setStyleProp } from '../../utils/blockActions'
import { useEditor } from '../../context/EditorContext'
import useStore from '../../../store/useStore'
import { inputClass } from './TypographyControls'
import { Field } from './propertyPanelUtils'

/** All funnel page types — every campaign can edit HOME … ERROR. */
export function getCampaignPageOptions() {
  return PAGE_TYPES.map((id) => ({
    id,
    label: PAGE_TYPE_LABELS[id] || id,
  }))
}

export function CampaignPageSelect({
  href,
  onChange,
  label = 'Page name',
  editHref,
}) {
  const options = getCampaignPageOptions()
  const matched = options.find((o) => o.id.toLowerCase() === (href || '').toLowerCase())
  const value = matched?.id || options[0]?.id || 'OTP'

  return (
    <div className="space-y-1.5">
      <Field label={label}>
        <select
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((page) => (
            <option key={page.id} value={page.id}>
              {page.label}
            </option>
          ))}
        </select>
      </Field>
      {editHref && (
        <a
          href={editHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          <Pencil className="w-3 h-3" />
          Edit {PAGE_TYPE_LABELS[value] || value} page
        </a>
      )}
    </div>
  )
}

/** True for OTP system controls — pack buttons can still set When clicked. */
export function isLockedSystemAction(attrs = {}) {
  if (attrs['data-otp-action'] || attrs['data-otp-field'] || attrs['data-otp-slot']) return true
  if (attrs['data-flow-pack-picker'] !== undefined) return true
  return false
}

export function getClickActionType(attrs = {}) {
  if (attrs['data-action'] === 'CHAIN' || attrs['data-actions']) return 'chain'
  if (attrs['data-action'] === 'SUBSCRIBE_ROUTE') return 'subscribeRoute'
  const href = attrs.href
  if (href === undefined || href === null || href === '') {
    if (attrs['data-action']) return 'flow'
    return 'none'
  }
  // Prefer real navigation targets over a leftover SUBSCRIBE (save heal used to re-add it)
  if (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return 'external'
  }
  if (href.startsWith('#') && href !== '#') return 'anchor'
  // Signup / Confirm system CTAs — before bare "#" which would look like "scroll"
  if (attrs['data-action'] === 'SUBSCRIBE' || attrs['data-action'] === 'CONFIRM') return 'flow'
  if (href.startsWith('#')) return 'anchor'
  return 'page'
}

export function SectionAnchorSelect({
  editor,
  value,
  onChange,
}) {
  return (
    <Field label="Scroll to section">
      <select
        className={inputClass}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select a section...</option>
        {(() => {
          const sections = []
          const wrapper = editor?.getWrapper?.()
          if (wrapper) {
            const walk = (cmp) => {
              const tag = (cmp.get('tagName') || '').toLowerCase()
              const SECTION_TAGS = new Set([
                'section',
                'header',
                'footer',
                'nav',
                'main',
                'article',
              ])
              const isSection =
                SECTION_TAGS.has(tag) ||
                cmp.getAttributes()?.['data-tc-type'] === 'section'
              if (isSection && tag !== 'header' && tag !== 'footer') {
                const id = cmp.getAttributes()?.id || cmp.getId()
                const label = cmp.get('sectionLabel') || id || 'Untitled Section'
                sections.push({ id, label })
              }
              cmp.components().forEach(walk)
            }
            walk(wrapper)
          }
          const seen = new Set()
          return sections
            .filter((s) => {
              if (seen.has(s.id)) return false
              seen.add(s.id)
              return true
            })
            .map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.label} (#{sec.id})
              </option>
            ))
        })()}
      </select>
    </Field>
  )
}

/** Shared “When clicked” config for buttons and hotspots (5 options, including Priority). */
export function ClickActionEditor({
  selected,
  editor,
  update,
}) {
  const [chainOpenSignal, setChainOpenSignal] = useState(0)
  const [subscribeOpenSignal, setSubscribeOpenSignal] = useState(0)
  const { campaignId, countryCode, operatorCode, funnelPageType } = useEditor()
  const campaign = useStore((s) => s.campaign)
  const attrs = selected?.getAttributes?.() || {}
  const href = attrs.href || ''
  const type = getClickActionType(attrs)
  const [subscribeApiTemplate, setSubscribeApiTemplate] = useState('')
  const [packOptions, setPackOptions] = useState(CLASSIC_PACK_OPTIONS)

  useEffect(() => {
    if (!campaignId) return undefined
    let cancelled = false
    getCampaignApiConfig(campaignId)
      .then((cfg) => {
        if (cancelled) return
        setSubscribeApiTemplate(String(cfg?.subscribeApi || ''))
        setPackOptions(
          editorPackOptions(cfg?.dcbConfigJson || cfg?.dcb_config_json, {
            universeDcb: String(campaign?.verificationMode || '').toUpperCase() === 'UNIVERSE_DCB',
          })
        )
      })
      .catch(() => {
        if (cancelled) return
        setSubscribeApiTemplate('')
        setPackOptions(CLASSIC_PACK_OPTIONS)
      })
    return () => {
      cancelled = true
    }
  }, [campaignId, campaign?.verificationMode])

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

  const pageEditHref = (() => {
    if (type !== 'page' || !campaignId) return null
    const options = getCampaignPageOptions()
    const matched = options.find((o) => o.id.toLowerCase() === (href || '').toLowerCase())
    const pageId = matched?.id || options[0]?.id || 'OTP'
    // Don't offer edit for the page currently open in the canvas
    if (String(pageId).toUpperCase() === String(funnelPageType || '').toUpperCase()) {
      return null
    }
    return campaignEditPath(countryCode, operatorCode, campaignId, pageId)
  })()

  const setClickType = (next) => {
    if (next === 'none') {
      selected.removeAttributes('data-action')
      selected.removeAttributes('data-actions')
      selected.removeAttributes('data-subscribe-routes')
      selected.removeAttributes('href')
      selected.removeAttributes('target')
      const currentStyle = selected.getStyle() || {}
      if (currentStyle.cursor === 'pointer') {
        const nextStyle = { ...currentStyle }
        delete nextStyle.cursor
        selected.setStyle(nextStyle)
      }
    } else if (next === 'chain') {
      selected.removeAttributes('data-subscribe-routes')
      selected.addAttributes({
        'data-action': 'CHAIN',
        'data-actions': JSON.stringify([
          {
            type: 'api',
            url: '',
            rules: [
              { key: 'currentStatus', value: 'active', go: 'page', page: 'THANKYOU', url: '' },
              { key: 'currentStatus', value: 'parking', go: 'page', page: 'LOW_BALANCE', url: '' },
              { key: 'currentStatus', value: 'pending', go: 'page', page: 'INPROGRESS', url: '' },
            ],
            missAction: 'page',
            missPage: 'CONFIRM',
            missUrl: '',
            failAction: 'page',
            failPage: 'ERROR',
            failUrl: '',
          },
        ]),
        href: '#',
      })
      setStyleProp(selected, 'cursor', 'pointer')
      setChainOpenSignal((n) => n + 1)
    } else if (next === 'subscribeRoute') {
      selected.removeAttributes('data-actions')
      selected.addAttributes({
        'data-action': 'SUBSCRIBE_ROUTE',
        'data-subscribe-routes': JSON.stringify(DEFAULT_SUBSCRIBE_ROUTES),
        href: '#',
      })
      selected.removeAttributes('target')
      setStyleProp(selected, 'cursor', 'pointer')
      setSubscribeOpenSignal((n) => n + 1)
    } else if (next === 'flow') {
      selected.removeAttributes('data-actions')
      selected.removeAttributes('data-subscribe-routes')
      // Keep Confirm billing on CONFIRM pages; HOME / others use Subscribe API
      const prev = String(attrs['data-action'] || '').toUpperCase()
      const page = String(funnelPageType || '').toUpperCase()
      const flowAction =
        prev === 'CONFIRM' || page === 'CONFIRM' ? 'CONFIRM' : 'SUBSCRIBE'
      selected.addAttributes({ 'data-action': flowAction, href: '#' })
      selected.removeAttributes('target')
      setStyleProp(selected, 'cursor', 'pointer')
    } else if (next === 'anchor') {
      selected.removeAttributes('data-action')
      selected.removeAttributes('data-actions')
      selected.removeAttributes('data-subscribe-routes')
      const anchors = listSectionAnchorsOnPage(editor, selected)
      selected.addAttributes({ href: anchors.length > 0 ? `#${anchors[0]}` : '#' })
      setStyleProp(selected, 'cursor', 'pointer')
    } else if (next === 'page') {
      selected.removeAttributes('data-action')
      selected.removeAttributes('data-actions')
      selected.removeAttributes('data-subscribe-routes')
      selected.addAttributes({ href: 'OTP' })
      setStyleProp(selected, 'cursor', 'pointer')
    } else {
      selected.removeAttributes('data-action')
      selected.removeAttributes('data-actions')
      selected.removeAttributes('data-subscribe-routes')
      selected.addAttributes({ href: 'https://' })
      setStyleProp(selected, 'cursor', 'pointer')
    }
    update()
  }

  return (
    <>
      <Field label="When clicked">
        <select
          className={inputClass}
          value={type}
          onChange={(e) => setClickType(e.target.value)}
        >
          <option value="none">None (No link / action)</option>
          <option value="flow">
            {String(funnelPageType || '').toUpperCase() === 'CONFIRM' ||
            attrs['data-action'] === 'CONFIRM'
              ? 'Continue signup flow (Confirm API)'
              : 'Continue signup flow (OTP / Confirm path)'}
          </option>
          <option value="subscribeRoute">Hit Subscribe API + choose pages</option>
          <option value="anchor">Scroll to a section</option>
          <option value="page">Go to another page</option>
          <option value="external">Open a website</option>
          <option value="chain">Try checks in order</option>
        </select>
      </Field>

      {type === 'chain' && (
        <PriorityChainTrigger
          selected={selected}
          editor={editor}
          update={update}
          openSignal={chainOpenSignal}
        />
      )}

      {type === 'subscribeRoute' && (
        <SubscribeRouteTrigger
          selected={selected}
          update={update}
          openSignal={subscribeOpenSignal}
        />
      )}

      {type === 'flow' && (
        <p className="text-[11px] text-fg-muted leading-relaxed -mt-1">
          {attrs['data-action'] === 'CONFIRM' ||
          String(funnelPageType || '').toUpperCase() === 'CONFIRM' ? (
            <>
              Hits this campaign&apos;s Confirm / billing API, then opens Thank you or the
              outcome page from Flow Builder. For single-page subscribe with custom
              destinations, use &quot;Hit Subscribe API + choose pages&quot;.
            </>
          ) : (
            <>
              Follows Subscription flow (OTP / Confirm path from campaign settings) — does
              not pick Thank you vs OTP on this button. For that, use &quot;Hit Subscribe API +
              choose pages&quot;. Add a pack below to subscribe immediately from this button.
            </>
          )}
        </p>
      )}

      {(type === 'flow' || type === 'subscribeRoute') && (
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
      )}

      {(type === 'flow' || type === 'subscribeRoute') &&
        hasMixedConversionTriggers({
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

      {(type === 'flow' || type === 'subscribeRoute') && attrs['data-pack'] && (
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

      {type === 'anchor' && (
        <SectionAnchorSelect
          editor={editor}
          value={href.replace(/^#/, '')}
          onChange={(id) => {
            selected.addAttributes({ href: `#${id}` })
            update()
          }}
        />
      )}

      {type === 'page' && (
        <CampaignPageSelect
          href={href}
          editor={editor}
          editHref={pageEditHref}
          onChange={(pageId) => {
            selected.addAttributes({ href: pageId })
            update()
          }}
        />
      )}

      {type === 'external' && (
        <Field label="Website address (URL)">
          <input
            className={inputClass}
            placeholder="e.g. https://google.com"
            value={href}
            onChange={(e) => {
              selected.addAttributes({ href: e.target.value })
              update()
            }}
          />
        </Field>
      )}
    </>
  )
}

export default memo(ClickActionEditor)
