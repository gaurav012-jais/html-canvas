import React from 'react'
import Input from '../../../../ui/Input'
import { ApiField } from '../../common/ApiField'
import { TemplateVariablesLegend } from '../../common/TemplateVariablesLegend'

export function OrangeBfAdvancedEndpoints({
  orangeBfConfig,
  setOrangeBfConfig,
}) {
  return (
    <details className="rounded-xl border border-border bg-bg-elevated p-4">
      <summary className="cursor-pointer text-sm font-semibold text-fg select-none">
        ⚙️ Advanced Custom Endpoints, Methods & Request Payloads
      </summary>
      <div className="mt-3 space-y-4">
        <p className="text-xs text-fg-muted">
          Override default URL paths, HTTP methods (GET/POST), request body JSON, and custom headers. You can use dynamic template variables.
        </p>

        <TemplateVariablesLegend />

        {/* Send OTP Custom Config */}
        <div className="space-y-2 rounded-lg border border-border/80 p-3 bg-bg-base">
          <p className="text-xs font-semibold text-fg">1. Send / Generate OTP API</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-3">
              <ApiField
                label="Custom Send OTP URL (optional)"
                hint="Leave blank for default /subapi/auth/otp/generate"
              >
                <Input
                  value={orangeBfConfig.sendUrl || ''}
                  onChange={(e) => setOrangeBfConfig((s) => ({ ...s, sendUrl: e.target.value }))}
                  placeholder="http://103.153.58.55/subapi/auth/otp/generate?msisdn={{msisdn}}&language=_E"
                />
              </ApiField>
            </div>
            <div>
              <ApiField label="Method">
                <select
                  className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                  value={orangeBfConfig.sendMethod || 'GET'}
                  onChange={(e) =>
                    setOrangeBfConfig((s) => ({ ...s, sendMethod: e.target.value }))
                  }
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </ApiField>
            </div>
          </div>
          {orangeBfConfig.sendMethod === 'POST' && (
            <ApiField
              label="Send OTP Request Body (JSON)"
              hint="Variables like {{msisdn}}, {{serviceId}} supported"
            >
              <textarea
                rows={3}
                className="w-full rounded-lg border border-border bg-bg-base p-2 font-mono text-xs text-fg outline-none focus:border-primary"
                value={orangeBfConfig.sendBodyJson || ''}
                onChange={(e) =>
                  setOrangeBfConfig((s) => ({ ...s, sendBodyJson: e.target.value }))
                }
                placeholder='{"msisdn": "{{msisdn}}", "serviceId": "{{serviceId}}", "channel": "{{channel}}"}'
              />
            </ApiField>
          )}
        </div>

        {/* Verify OTP Custom Config */}
        <div className="space-y-2 rounded-lg border border-border/80 p-3 bg-bg-base">
          <p className="text-xs font-semibold text-fg">2. Validate / Verify OTP API</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-3">
              <ApiField
                label="Custom Verify OTP URL (optional)"
                hint="Leave blank for default /subapi/auth/otp/validate"
              >
                <Input
                  value={orangeBfConfig.verifyUrl || ''}
                  onChange={(e) =>
                    setOrangeBfConfig((s) => ({ ...s, verifyUrl: e.target.value }))
                  }
                  placeholder="http://103.153.58.55/subapi/auth/otp/validate?msisdn={{msisdn}}&otp={{otp}}"
                />
              </ApiField>
            </div>
            <div>
              <ApiField label="Method">
                <select
                  className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                  value={orangeBfConfig.verifyMethod || 'GET'}
                  onChange={(e) =>
                    setOrangeBfConfig((s) => ({ ...s, verifyMethod: e.target.value }))
                  }
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </ApiField>
            </div>
          </div>
          {orangeBfConfig.verifyMethod === 'POST' && (
            <ApiField
              label="Verify OTP Request Body (JSON)"
              hint="Can include chained {{transactionId}}, {{msisdn}}, {{otp}}"
            >
              <textarea
                rows={3}
                className="w-full rounded-lg border border-border bg-bg-base p-2 font-mono text-xs text-fg outline-none focus:border-primary"
                value={orangeBfConfig.verifyBodyJson || ''}
                onChange={(e) =>
                  setOrangeBfConfig((s) => ({ ...s, verifyBodyJson: e.target.value }))
                }
                placeholder='{"msisdn": "{{msisdn}}", "otp": "{{otp}}", "transactionId": "{{transactionId}}"}'
              />
            </ApiField>
          )}
        </div>

        {/* CheckSub Custom Config */}
        <div className="space-y-2 rounded-lg border border-border/80 p-3 bg-bg-base">
          <p className="text-xs font-semibold text-fg">3. Check Subscription (CheckSub) API</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-3">
              <ApiField
                label="Custom CheckSub URL (optional)"
                hint="Leave blank for default /subapi/checksub"
              >
                <Input
                  value={orangeBfConfig.checksubUrl || ''}
                  onChange={(e) =>
                    setOrangeBfConfig((s) => ({ ...s, checksubUrl: e.target.value }))
                  }
                  placeholder="http://103.153.58.55/subapi/checksub?msisdn={{msisdn}}&serviceId={{serviceId}}"
                />
              </ApiField>
            </div>
            <div>
              <ApiField label="Method">
                <select
                  className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                  value={orangeBfConfig.checksubMethod || 'GET'}
                  onChange={(e) =>
                    setOrangeBfConfig((s) => ({ ...s, checksubMethod: e.target.value }))
                  }
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </ApiField>
            </div>
          </div>
          {orangeBfConfig.checksubMethod === 'POST' && (
            <ApiField label="CheckSub Request Body (JSON)">
              <textarea
                rows={2}
                className="w-full rounded-lg border border-border bg-bg-base p-2 font-mono text-xs text-fg outline-none focus:border-primary"
                value={orangeBfConfig.checksubBodyJson || ''}
                onChange={(e) =>
                  setOrangeBfConfig((s) => ({ ...s, checksubBodyJson: e.target.value }))
                }
                placeholder='{"msisdn": "{{msisdn}}", "serviceId": "{{serviceId}}"}'
              />
            </ApiField>
          )}
        </div>

        {/* 4. Subscription Engine Sync Custom Config */}
        <div className="space-y-3 rounded-lg border border-border/80 p-3 bg-bg-base">
          <div className="flex items-center justify-between pb-1 border-b border-border/40">
            <div>
              <p className="text-xs font-semibold text-fg">4. Subscription Engine Sync API (Post-OTP Success)</p>
              <p className="text-[11px] text-fg-muted">Calls carrier subscription engine synchronously after OTP verify succeeds.</p>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-fg">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={orangeBfConfig.syncEnabled !== false}
                onChange={(e) => setOrangeBfConfig((s) => ({ ...s, syncEnabled: e.target.checked }))}
              />
              <span>Enable Sync</span>
            </label>
          </div>

          {orangeBfConfig.syncEnabled !== false && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="sm:col-span-3">
                  <ApiField
                    label="Custom Sync URL (optional)"
                    hint="Leave blank for default /Subs_Engine/subscription/sync"
                  >
                    <Input
                      value={orangeBfConfig.syncUrl || ''}
                      onChange={(e) => setOrangeBfConfig((s) => ({ ...s, syncUrl: e.target.value }))}
                      placeholder="http://103.153.58.55/Subs_Engine/subscription/sync"
                    />
                  </ApiField>
                </div>
                <div>
                  <ApiField label="Method">
                    <select
                      className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                      value={orangeBfConfig.syncMethod || 'GET'}
                      onChange={(e) => setOrangeBfConfig((s) => ({ ...s, syncMethod: e.target.value }))}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                  </ApiField>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ApiField label="Sync Parent Service ID" hint="serviceId (e.g. Health Portal Livliness NAR)">
                  <Input
                    value={orangeBfConfig.syncServiceId ?? 'Health Portal Livliness NAR'}
                    onChange={(e) => setOrangeBfConfig((s) => ({ ...s, syncServiceId: e.target.value }))}
                    placeholder="Health Portal Livliness NAR"
                  />
                </ApiField>
                <ApiField label="Sync Sub-Service Plan ID" hint="subServiceId (e.g. Health Portal Livliness acte jour)">
                  <Input
                    value={orangeBfConfig.syncSubServiceId ?? 'Health Portal Livliness acte jour'}
                    onChange={(e) => setOrangeBfConfig((s) => ({ ...s, syncSubServiceId: e.target.value }))}
                    placeholder="Health Portal Livliness acte jour"
                  />
                </ApiField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <ApiField label="Request Type Flag (reqType)" hint="Default: 1">
                  <Input
                    value={orangeBfConfig.syncReqType ?? '1'}
                    onChange={(e) => setOrangeBfConfig((s) => ({ ...s, syncReqType: e.target.value }))}
                    placeholder="1"
                  />
                </ApiField>
                <div className="pb-1">
                  <button
                    type="button"
                    onClick={() =>
                      setOrangeBfConfig((s) => ({
                        ...s,
                        syncUrl:
                          'http://103.153.58.55/Subs_Engine/subscription/sync?msisdn={{msisdn}}&subServiceId={{subServiceId}}&serviceId={{serviceId}}&cpId={{cpId}}&channel={{channel}}&country={{country}}&operator={{operator}}&reqType=1',
                      }))
                    }
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    ⚡ Insert Full URL with Query Parameters
                  </button>
                </div>
              </div>

              {orangeBfConfig.syncMethod === 'POST' && (
                <ApiField label="Sync Request Body (JSON)">
                  <textarea
                    rows={2}
                    className="w-full rounded-lg border border-border bg-bg-base p-2 font-mono text-xs text-fg outline-none focus:border-primary"
                    value={orangeBfConfig.syncBodyJson || ''}
                    onChange={(e) => setOrangeBfConfig((s) => ({ ...s, syncBodyJson: e.target.value }))}
                    placeholder='{"msisdn": "{{msisdn}}", "serviceId": "{{serviceId}}", "subServiceId": "{{subServiceId}}", "reqType": 1}'
                  />
                </ApiField>
              )}
            </div>
          )}
        </div>

        {/* Custom Request Headers */}
        <ApiField
          label="Custom Request Headers (JSON, optional)"
          hint='e.g. {"Authorization": "Bearer ..."}'
        >
          <textarea
            rows={2}
            className="w-full rounded-lg border border-border bg-bg-base p-2 font-mono text-xs text-fg outline-none focus:border-primary"
            value={orangeBfConfig.headersJson || ''}
            onChange={(e) => setOrangeBfConfig((s) => ({ ...s, headersJson: e.target.value }))}
            placeholder='{"Content-Type": "application/json"}'
          />
        </ApiField>
      </div>
    </details>
  )
}
