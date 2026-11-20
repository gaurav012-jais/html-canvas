import React, { memo } from 'react'
import Input from '../../../ui/Input'
import { ApiField as Field } from '../common/ApiField'
import { PAGE_TYPES, PAGE_TYPE_LABELS } from '../../../../services/api/campaigns'

export const CHECKSUB_PAGE_OPTIONS = PAGE_TYPES.filter((id) =>
  ['THANKYOU', 'INPROGRESS', 'LOW_BALANCE', 'BLOCKED', 'ERROR', 'HOME', 'OTP', 'CONFIRM'].includes(id)
)

function ChecksubConfigTab({
  mode,
  form,
  setForm,
  checksubConfig,
  setChecksubConfig,
}) {
  return (
    <div className="space-y-4">
      {mode === 'UNIVERSE_DCB' ? (
        <div className="rounded-xl border border-border bg-bg-subtle/60 px-4 py-3">
          <p className="text-xs leading-relaxed text-fg-muted">
            Universe DCB subscription status check is handled via <code className="font-mono text-[11px]">/api/dcb/subscriptions</code> (configured in Universe DCB tab).
            Yahan aap customize kar sakte hain ki kis status pe kaunsa page dikhana hai (jaise <code className="font-mono text-[11px]">PENDING_PIN → OTP</code>, <code className="font-mono text-[11px]">ACTIVE → THANKYOU</code>). Agar rules empty chhodenge toh built-in DCB default mapping automatically use hogi.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-bg-subtle/60 px-4 py-3">
            <p className="text-xs leading-relaxed text-fg-muted">
              Checksub / blocklist / optional Confirm subscribe live here. OTP send/verify is on the Partner OTP
              tab. Placeholders: <code className="font-mono text-[11px]">{'{{msisdn}}'}</code>,{' '}
              <code className="font-mono text-[11px]">{'{{serviceId}}'}</code>,{' '}
              <code className="font-mono text-[11px]">{'{{country}}'}</code>,{' '}
              <code className="font-mono text-[11px]">{'{{operator}}'}</code>.
            </p>
          </div>
          <Field label="Subscription check URL (checksub)">
            <Input
              value={form.subscriptionApi}
              onChange={(e) => setForm({ ...form, subscriptionApi: e.target.value })}
              placeholder="https://…/checksub?msisdn={{msisdn}}&serviceId=WELLNESS"
            />
          </Field>
        </>
      )}

      <div className="rounded-xl border border-border bg-bg-elevated p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-fg">Checksub status mapping</p>
            <p className="text-[11px] text-fg-muted mt-0.5 leading-relaxed">
              When a number is found, map the partner response to continue the funnel, a campaign page, or an
              external website. Works with plain-text body (e.g. <code className="font-mono">INACTIVE</code>) or
              JSON fields. Leave empty to keep the built-in active/parking/pending mapping.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {mode === 'UNIVERSE_DCB' ? (
              <button
                type="button"
                className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-border text-fg-muted hover:bg-bg-subtle"
                onClick={() =>
                  setChecksubConfig({
                    statusField: 'status',
                    rules: [
                      { value: 'PENDING_PIN', go: 'page', page: 'OTP', url: '' },
                      { value: 'ACTIVE', go: 'page', page: 'THANKYOU', url: '' },
                      { value: 'NEW', go: 'page', page: 'HOME', url: '' },
                      { value: 'PARKED_NO_BALANCE', go: 'page', page: 'LOW_BALANCE', url: '' },
                      { value: 'SUSPENDED', go: 'page', page: 'LOW_BALANCE', url: '' },
                      { value: 'PENDING_CONFIRMATION', go: 'page', page: 'INPROGRESS', url: '' },
                      { value: 'DEACTIVATED', go: 'page', page: 'ERROR', url: '' },
                      { value: 'EXPIRED', go: 'page', page: 'ERROR', url: '' },
                      { value: 'FAILED', go: 'page', page: 'ERROR', url: '' },
                    ],
                    missGo: 'page',
                    missPage: 'ERROR',
                    missUrl: '',
                  })
                }
              >
                DCB preset
              </button>
            ) : null}
            <button
              type="button"
              className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-border text-fg-muted hover:bg-bg-subtle"
              onClick={() =>
                setChecksubConfig({
                  statusField: 'currentStatus',
                  rules: [
                    { value: 'active', go: 'page', page: 'THANKYOU', url: '' },
                    { value: 'parking', go: 'page', page: 'LOW_BALANCE', url: '' },
                    { value: 'grace', go: 'page', page: 'LOW_BALANCE', url: '' },
                    { value: 'pending', go: 'page', page: 'INPROGRESS', url: '' },
                    { value: 'new', go: 'continue', page: 'THANKYOU', url: '' },
                  ],
                  missGo: 'continue',
                  missPage: 'ERROR',
                  missUrl: '',
                })
              }
            >
              JSON preset
            </button>
            <button
              type="button"
              className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-border text-fg-muted hover:bg-bg-subtle"
              onClick={() =>
                setChecksubConfig({
                  statusField: 'body',
                  rules: [
                    { value: 'ACTIVE', go: 'page', page: 'THANKYOU', url: '' },
                    { value: 'INACTIVE', go: 'continue', page: 'THANKYOU', url: '' },
                  ],
                  missGo: 'continue',
                  missPage: 'ERROR',
                  missUrl: '',
                })
              }
            >
              Plain-text preset
            </button>
          </div>
        </div>

        <Field label="Status field" hint="body = whole response text; otherwise JSON key">
          <Input
            value={checksubConfig.statusField}
            onChange={(e) =>
              setChecksubConfig({
                ...checksubConfig,
                statusField: e.target.value,
              })
            }
            placeholder="body | currentStatus | status"
            list="checksub-status-fields"
          />
          <datalist id="checksub-status-fields">
            <option value="body" />
            <option value="currentStatus" />
            <option value="subscriptionStatus" />
            <option value="status" />
          </datalist>
        </Field>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-fg">Rules (first match wins)</p>
            <button
              type="button"
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50"
              onClick={() =>
                setChecksubConfig({
                  ...checksubConfig,
                  rules: [
                    ...checksubConfig.rules,
                    {
                      value: '',
                      go: 'continue',
                      page: 'THANKYOU',
                      url: '',
                    },
                  ],
                })
              }
            >
              + Add status
            </button>
          </div>

          {checksubConfig.rules.length === 0 ? (
            <p className="text-[11px] text-fg-muted rounded-lg border border-dashed border-border px-3 py-2">
              No rules yet — built-in mapping is used (active → thank you, parking → low balance, …).
            </p>
          ) : null}

          {checksubConfig.rules.map((rule, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-bg-subtle/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-indigo-600">Rule {idx + 1}</span>
                <button
                  type="button"
                  className="px-2 py-1 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() =>
                    setChecksubConfig({
                      ...checksubConfig,
                      rules: checksubConfig.rules.filter((_, i) => i !== idx),
                    })
                  }
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Equals">
                  <Input
                    value={rule.value}
                    onChange={(e) => {
                      const rules = [...checksubConfig.rules]
                      rules[idx] = { ...rules[idx], value: e.target.value }
                      setChecksubConfig({ ...checksubConfig, rules })
                    }}
                    placeholder="PENDING_PIN / ACTIVE / NEW"
                    list="checksub-status-values"
                  />
                  <datalist id="checksub-status-values">
                    <option value="PENDING_PIN" />
                    <option value="ACTIVE" />
                    <option value="TRIAL_ACTIVE" />
                    <option value="NEW" />
                    <option value="PARKED_NO_BALANCE" />
                    <option value="SUSPENDED" />
                    <option value="PENDING_CONFIRMATION" />
                    <option value="DEACTIVATED" />
                    <option value="EXPIRED" />
                    <option value="FAILED" />
                    <option value="CANCELLED" />
                  </datalist>
                </Field>
                <Field label="Then">
                  <select
                    className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg"
                    value={rule.go || 'continue'}
                    onChange={(e) => {
                      const rules = [...checksubConfig.rules]
                      rules[idx] = { ...rules[idx], go: e.target.value }
                      setChecksubConfig({ ...checksubConfig, rules })
                    }}
                  >
                    <option value="continue">Continue funnel</option>
                    <option value="page">Campaign page</option>
                    <option value="external">External website</option>
                  </select>
                </Field>
              </div>
              {rule.go === 'page' ? (
                <Field label="Page">
                  <select
                    className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg"
                    value={rule.page || 'THANKYOU'}
                    onChange={(e) => {
                      const rules = [...checksubConfig.rules]
                      rules[idx] = { ...rules[idx], page: e.target.value }
                      setChecksubConfig({ ...checksubConfig, rules })
                    }}
                  >
                    {CHECKSUB_PAGE_OPTIONS.map((id) => (
                      <option key={id} value={id}>
                        {PAGE_TYPE_LABELS[id] || id}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {rule.go === 'external' ? (
                <Field label="Website URL">
                  <Input
                    value={rule.url || ''}
                    onChange={(e) => {
                      const rules = [...checksubConfig.rules]
                      rules[idx] = { ...rules[idx], url: e.target.value }
                      setChecksubConfig({ ...checksubConfig, rules })
                    }}
                    placeholder="https://example.com"
                  />
                </Field>
              ) : null}
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-bg-subtle/40 p-3 space-y-2">
          <Field label="If nothing matches">
            <select
              className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg"
              value={checksubConfig.missGo || 'continue'}
              onChange={(e) =>
                setChecksubConfig({
                  ...checksubConfig,
                  missGo: e.target.value,
                })
              }
            >
              <option value="continue">Continue funnel</option>
              <option value="page">Campaign page</option>
              <option value="external">External website</option>
            </select>
          </Field>
          {checksubConfig.missGo === 'page' ? (
            <Field label="Page">
              <select
                className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg"
                value={checksubConfig.missPage || 'ERROR'}
                onChange={(e) =>
                  setChecksubConfig({
                    ...checksubConfig,
                    missPage: e.target.value,
                  })
                }
              >
                {CHECKSUB_PAGE_OPTIONS.map((id) => (
                  <option key={id} value={id}>
                    {PAGE_TYPE_LABELS[id] || id}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {checksubConfig.missGo === 'external' ? (
            <Field label="Website URL">
              <Input
                value={checksubConfig.missUrl || ''}
                onChange={(e) =>
                  setChecksubConfig({
                    ...checksubConfig,
                    missUrl: e.target.value,
                  })
                }
                placeholder="https://example.com"
              />
            </Field>
          ) : null}
        </div>
      </div>

      <Field
        label="Subscribe URL (Confirm / pack click)"
        hint="Template for every pack button. Use {{msisdn}}, {{pack}}, {{planId}}, {{serviceId}}, {{subServiceId}}. Buttons only override pack / service / sub-service — not the full URL."
      >
        <Input
          value={form.subscribeApi}
          onChange={(e) => setForm({ ...form, subscribeApi: e.target.value })}
          placeholder="https://…/subscribe?msisdn={{msisdn}}"
        />
      </Field>
      <Field label="Blocklist / DND URL" hint="optional">
        <Input
          value={form.blocklistApi}
          onChange={(e) => setForm({ ...form, blocklistApi: e.target.value })}
          placeholder="https://…"
        />
      </Field>
      <Field label="Headers (JSON)" hint="optional">
        <textarea
          className="min-h-[80px] w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 font-mono text-sm text-fg"
          value={form.headersJson}
          onChange={(e) => setForm({ ...form, headersJson: e.target.value })}
          placeholder='{"Authorization":"Bearer ..."}'
        />
      </Field>
    </div>
  )
}

export default memo(ChecksubConfigTab)
