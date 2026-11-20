import React, { memo } from 'react'
import Input from '../../../ui/Input'
import { ApiField as Field } from '../common/ApiField'

function clampPayoutPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 100
  return Math.min(100, Math.max(0, Math.round(n)))
}

function OtpConfigTab({ partnerConfig, setPartnerConfig }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-bg-subtle/60 px-4 py-3">
        <p className="text-xs leading-relaxed text-fg-muted">
          Partner generates and verifies OTP. Success when the response key matches the value below (default{' '}
          <code className="font-mono text-[11px]">responseCode = 0</code>
          ).
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-bg-elevated p-4">
        <Field label="Send URL">
          <Input
            value={partnerConfig.sendUrl}
            onChange={(e) => setPartnerConfig({ ...partnerConfig, sendUrl: e.target.value })}
            placeholder="https://…/otp/subscribe?msisdn={{msisdn}}"
          />
        </Field>
        <Field label="Verify URL">
          <Input
            value={partnerConfig.verifyUrl}
            onChange={(e) => setPartnerConfig({ ...partnerConfig, verifyUrl: e.target.value })}
            placeholder="https://…/otp/validate_otp?msisdn={{msisdn}}&otp={{otp}}"
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Send method">
            <select
              className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg"
              value={partnerConfig.method || 'GET'}
              onChange={(e) => setPartnerConfig({ ...partnerConfig, method: e.target.value })}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </Field>
          <Field label="Verify method">
            <select
              className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg"
              value={partnerConfig.verifyMethod || 'GET'}
              onChange={(e) =>
                setPartnerConfig({
                  ...partnerConfig,
                  verifyMethod: e.target.value,
                })
              }
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </Field>
        </div>
        {(partnerConfig.method === 'POST' || partnerConfig.bodyJson) && (
          <Field label="Send Body (JSON)" hint="Variables: {{msisdn}}, {{phone}}">
            <textarea
              className="min-h-[60px] w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 font-mono text-xs text-fg"
              value={partnerConfig.bodyJson || ''}
              onChange={(e) =>
                setPartnerConfig({
                  ...partnerConfig,
                  bodyJson: e.target.value,
                })
              }
              placeholder='{"msisdn": "{{msisdn}}"}'
            />
          </Field>
        )}
        {(partnerConfig.verifyMethod === 'POST' || partnerConfig.verifyBodyJson) && (
          <Field label="Verify Body (JSON)" hint="Variables: {{msisdn}}, {{otp}}, {{code}}">
            <textarea
              className="min-h-[60px] w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 font-mono text-xs text-fg"
              value={partnerConfig.verifyBodyJson || ''}
              onChange={(e) =>
                setPartnerConfig({
                  ...partnerConfig,
                  verifyBodyJson: e.target.value,
                })
              }
              placeholder='{"msisdn": "{{msisdn}}", "code": "{{otp}}"}'
            />
          </Field>
        )}
        <div className="rounded-lg border border-border bg-bg-subtle/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-fg">Success rule</p>
            <span className="text-[11px] text-fg-muted">For Beecell: Key = success, Value = true</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Key" hint="e.g. responseCode or success">
              <Input
                value={partnerConfig.successKey || 'responseCode'}
                onChange={(e) =>
                  setPartnerConfig({
                    ...partnerConfig,
                    successKey: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Value" hint="e.g. 0 or true">
              <Input
                value={partnerConfig.successValue ?? '0'}
                onChange={(e) =>
                  setPartnerConfig({
                    ...partnerConfig,
                    successValue: e.target.value,
                  })
                }
              />
            </Field>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-bg-subtle/50 p-3 space-y-2">
          <Field label="Default payout %" hint="Fallback if vendor assignment has none · 100 = show all">
            <Input
              type="number"
              min={0}
              max={100}
              value={partnerConfig.payoutPercent ?? 100}
              onChange={(e) =>
                setPartnerConfig({
                  ...partnerConfig,
                  payoutPercent: e.target.value,
                })
              }
              onBlur={() =>
                setPartnerConfig({
                  ...partnerConfig,
                  payoutPercent: clampPayoutPercent(partnerConfig.payoutPercent),
                })
              }
            />
          </Field>
          <p className="text-[11px] leading-relaxed text-fg-muted">
            Prefer payout % on each vendor assignment. This campaign default is used only
            when the assignment has no percent. After partner verify succeeds, that percent
            is returned as success to the vendor; the rest get invalid OTP (HELD in logs).
          </p>
        </div>
        <Field label="Headers (JSON)" hint="optional">
          <textarea
            className="min-h-[60px] w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 font-mono text-xs text-fg"
            value={partnerConfig.headersJson}
            onChange={(e) =>
              setPartnerConfig({
                ...partnerConfig,
                headersJson: e.target.value,
              })
            }
            placeholder="{}"
          />
        </Field>
      </div>
    </div>
  )
}

export default memo(OtpConfigTab)
