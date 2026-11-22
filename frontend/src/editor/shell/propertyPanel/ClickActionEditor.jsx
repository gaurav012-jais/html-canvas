import { memo, useState, useEffect } from 'react'
import { getCampaignApiConfig } from '../../../services/api/campaigns'
import { campaignEditPath } from '../../../utils/routes'
import { PriorityChainTrigger } from '../PriorityChainModal'
import { SubscribeRouteTrigger } from '../SubscribeRouteModal'
import { DEFAULT_SUBSCRIBE_ROUTES } from '../../utils/subscribeRoutes'
import { CLASSIC_PACK_OPTIONS, editorPackOptions } from '../../../components/dashboard/dcbConfig'
import { listSectionAnchorsOnPage } from '../../utils/sectionAnchor'
import { setStyleProp } from '../../utils/blockActions'
import { useEditor } from '../../context/EditorContext'
import useStore from '../../../store/useStore'
import { inputClass } from './TypographyControls'
import { Field } from './propertyPanelUtils'
import {
  getCampaignPageOptions,
  isLockedSystemAction,
  getClickActionType,
} from './actions/clickActionConstants'
import { CampaignPageSelect } from './actions/CampaignPageSelect'
import { SectionAnchorSelect } from './actions/SectionAnchorSelect'
import { PackSubscribeFields } from './actions/PackSubscribeFields'

export {
  getCampaignPageOptions,
  isLockedSystemAction,
  getClickActionType,
  CampaignPageSelect,
  SectionAnchorSelect,
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

  const pageEditHref = (() => {
    if (type !== 'page' || !campaignId) return null
    const options = getCampaignPageOptions()
    const matched = options.find((o) => o.id.toLowerCase() === (href || '').toLowerCase())
    const pageId = matched?.id || options[0]?.id || 'OTP'
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
        <PackSubscribeFields
          selected={selected}
          attrs={attrs}
          editor={editor}
          update={update}
          campaign={campaign}
          packOptions={packOptions}
          subscribeApiTemplate={subscribeApiTemplate}
        />
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
