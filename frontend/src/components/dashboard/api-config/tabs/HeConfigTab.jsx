import React, { memo } from 'react'
import { Check, Smartphone, WifiOff } from 'lucide-react'
import Input from '../../../ui/Input'
import { ApiField as Field } from '../common/ApiField'

export const HE_MODES = [
  {
    id: 'header',
    title: 'Carrier Header (Standard)',
    subtitle: 'Gateway injects X-MSISDN on mobile data (no setup)',
  },
  {
    id: 'safaricom_masked',
    title: 'Token → Masked MSISDN',
    subtitle: 'Safaricom Kenya (session token + fetch masked number)',
  },
  {
    id: 'custom_http',
    title: 'Custom Resolve URL',
    subtitle: 'GET an operator endpoint returning MSISDN',
  },
  {
    id: 'none',
    title: 'Off',
    subtitle: 'Skip network auto-detect; rely on OTP / manual input',
  },
]

function HeConfigTab({ form, setForm, heFields, setHeField, heConfigPreview }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-bg-subtle/60 px-4 py-3">
        <p className="text-sm font-medium text-fg">How phone detection works</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">
          Most campaigns need nothing here — the carrier sends the number in a network header. Use Token + MSISDN only
          when the operator gives you two APIs (token, then number). If the number is missing, users go to the campaign
          CG URL (or an optional fail URL below).
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-fg">Detection mode</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HE_MODES.map((mode) => {
            const active = form.heProvider === mode.id
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setForm({ ...form, heProvider: mode.id })}
                className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                  active
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-border-focus hover:bg-bg-subtle/50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      active ? 'border-accent bg-accent text-white' : 'border-border bg-bg-elevated'
                    }`}
                  >
                    {active ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-fg">{mode.title}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-fg-muted">{mode.subtitle}</span>
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {form.heProvider === 'header' && (
        <div className="flex gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-xs leading-relaxed text-fg-muted">
            Recommended default. On operator mobile data the gateway injects{' '}
            <code className="rounded bg-bg-subtle px-1 py-0.5 font-mono text-[11px]">X-MSISDN</code>. No extra URLs
            needed.
          </p>
        </div>
      )}

      {form.heProvider === 'none' && (
        <div className="flex gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
          <p className="text-xs leading-relaxed text-fg-muted">
            Auto-detect is off. Users enter their number via OTP (or your page flow). No HE token calls on HOME.
          </p>
        </div>
      )}

      {form.heProvider === 'custom_http' && (
        <div className="space-y-4 rounded-xl border border-border bg-bg-elevated p-4">
          <div>
            <p className="text-sm font-semibold text-fg">Operator resolve API</p>
            <p className="mt-0.5 text-xs text-fg-muted">
              One URL that returns MSISDN. Used when the carrier does not send a header.
            </p>
          </div>
          <Field label="Resolve URL" hint="required">
            <Input
              value={heFields.resolveUrl}
              onChange={(e) => {
                setHeField('resolveUrl', e.target.value)
                setForm({ ...form, resolveMsisdnUrl: e.target.value })
              }}
              placeholder="https://operator.example/resolve-msisdn"
            />
          </Field>
          <Field label="Fail message" hint="optional">
            <Input
              value={heFields.failMessage}
              onChange={(e) => setHeField('failMessage', e.target.value)}
              placeholder="Please use mobile data"
            />
          </Field>
          <div className="rounded-lg border border-border bg-bg-subtle/50 p-3 space-y-3">
            <p className="text-xs font-semibold text-fg">After HE resolve</p>
            <p className="text-[11px] text-fg-muted leading-relaxed">
              Success/fail filled → HOME skip (silent redirect). Both empty → show HOME after detect; MSISDN still used
              on Subscribe / OTP.
            </p>
            <Field label="Success redirect" hint="optional — empty = stay on HOME. {click_id} filled if present.">
              <Input
                value={heFields.successRedirectUrl}
                onChange={(e) => setHeField('successRedirectUrl', e.target.value)}
                placeholder="https://…/next?ext_id={click_id}"
              />
            </Field>
            <Field label="Fail redirect" hint="optional — else campaign CG. {click_id} filled if present.">
              <Input
                value={heFields.failRedirectUrl}
                onChange={(e) => setHeField('failRedirectUrl', e.target.value)}
                placeholder="https://cg.example/fallback?ext_id={click_id}"
              />
            </Field>
          </div>
        </div>
      )}

      {form.heProvider === 'safaricom_masked' && (
        <div className="space-y-4 rounded-xl border border-border bg-bg-elevated p-4">
          <div>
            <p className="text-sm font-semibold text-fg">Token → MSISDN APIs</p>
            <p className="mt-0.5 text-xs text-fg-muted">
              Safaricom Kenya: POST token with <code className="font-mono text-[11px]">X-Session-ID</code>, then GET
              masked MSISDN with Bearer + partner headers.
            </p>
          </div>

          <div className="relative space-y-4 pl-4 before:absolute before:bottom-3 before:left-[7px] before:top-3 before:w-px before:bg-border">
            <div className="relative space-y-1.5">
              <span className="absolute -left-4 top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                1
              </span>
              <Field label="Token URL" hint="required — POST + X-Session-ID">
                <Input
                  value={heFields.tokenUrl}
                  onChange={(e) => setHeField('tokenUrl', e.target.value)}
                  placeholder="https://evisaf.wellnesss360.com/safcom/hetoken"
                />
              </Field>
            </div>
            <div className="relative space-y-1.5">
              <span className="absolute -left-4 top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                2
              </span>
              <Field label="Masked / MSISDN URL" hint="required — Bearer + X-App">
                <Input
                  value={heFields.maskedUrl}
                  onChange={(e) => setHeField('maskedUrl', e.target.value)}
                  placeholder="https://identity.safaricom.com/partner/api/v2/fetchMaskedMsisdn"
                />
              </Field>
            </div>
          </div>

          <Field label="Fail message" hint="optional">
            <Input
              value={heFields.failMessage}
              onChange={(e) => setHeField('failMessage', e.target.value)}
              placeholder="Please use Safaricom Mobile Data"
            />
          </Field>

          <div className="rounded-lg border border-border bg-bg-subtle/50 p-3 space-y-3">
            <p className="text-xs font-semibold text-fg">After HE resolve</p>
            <p className="text-[11px] text-fg-muted leading-relaxed">
              <strong>Success/fail filled</strong> → HOME never shown; loading then redirect (MSISDN → success, missing
              → fail/CG).
              <br />
              <strong>Both empty</strong> → show HOME after detect (funnel). Number still used later on Subscribe / OTP
              / Priority.
            </p>
            <Field label="Success redirect" hint="optional — {click_id} filled if present, else empty = stay on HOME">
              <Input
                value={heFields.successRedirectUrl}
                onChange={(e) => setHeField('successRedirectUrl', e.target.value)}
                placeholder="https://dsdp-cg.safaricom.com/consent-gateway/300002437?ext_id={click_id}"
              />
            </Field>
            <Field label="Fail redirect" hint="optional — {click_id} filled if present, else campaign CG">
              <Input
                value={heFields.failRedirectUrl}
                onChange={(e) => setHeField('failRedirectUrl', e.target.value)}
                placeholder="https://dsdp-cg.safaricom.com/consent-gateway/300002437?ext_id={click_id}"
              />
            </Field>
          </div>

          {heConfigPreview ? (
            <details className="rounded-lg border border-border bg-bg-subtle/50 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-fg-muted">
                Advanced — saved JSON preview
              </summary>
              <pre className="mt-2 max-h-36 overflow-auto rounded-md bg-bg-base p-2 font-mono text-[11px] text-fg-muted">
                {heConfigPreview}
              </pre>
            </details>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default memo(HeConfigTab)
