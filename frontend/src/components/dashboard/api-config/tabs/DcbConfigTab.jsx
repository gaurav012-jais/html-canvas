import React, { memo } from 'react'
import { Download } from 'lucide-react'
import Button from '../../../ui/Button'
import Input from '../../../ui/Input'
import { ApiField as Field } from '../common/ApiField'
import {
  DEFAULT_DCB_CONFIG,
  buildDcbApiGuide,
  previewConfirmPayload,
  previewPincodePayload,
} from '../../dcbConfig'
import { downloadTextFile } from '../../../../utils/download'
import useStore from '../../../../store/useStore'

function DcbConfigTab({ campaignId, dcbConfig, setDcbConfig }) {
  const setDcbField = (key, value) => {
    setDcbConfig((current) => ({ ...current, [key]: value }))
  }
  const setResponsePath = (key, value) => {
    setDcbConfig((current) => ({
      ...current,
      responsePaths: { ...current.responsePaths, [key]: value },
    }))
  }
  const setEndpoint = (key, value) => {
    setDcbConfig((current) => ({
      ...current,
      endpoints: { ...current.endpoints, [key]: value },
    }))
  }
  const setRequestField = (key, value) => {
    setDcbConfig((current) => ({
      ...current,
      request: { ...current.request, [key]: value },
    }))
  }
  const pincodePreview = JSON.stringify(previewPincodePayload(dcbConfig), null, 2)
  const confirmPreview = JSON.stringify(previewConfirmPayload(dcbConfig), null, 2)
  const setMapping = (index, key, value) => {
    setDcbConfig((current) => ({
      ...current,
      purchaseTypeMappings: current.purchaseTypeMappings.map((mapping, mappingIndex) =>
        mappingIndex === index ? { ...mapping, [key]: value } : mapping
      ),
    }))
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-bg-subtle/60 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">Universe Telecom DCB</p>
            <p className="mt-1 text-xs leading-relaxed text-fg-muted">
              These settings are used by the backend proxy for entitlement checks, PIN confirmation, and activation
              polling. Provider request IDs are never saved in the browser. Field names / endpoints yahan change
              karo — Download guide usi se regenerate hota hai.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              downloadTextFile(
                `dcb-api-guide-campaign-${campaignId || 'draft'}.md`,
                buildDcbApiGuide(dcbConfig),
                'text/markdown;charset=utf-8',
              )
              useStore.getState().addToast('DCB API guide downloaded', 'success')
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Download API guide
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Base URL">
            <Input
              value={dcbConfig.baseUrl}
              onChange={(event) => setDcbField('baseUrl', event.target.value)}
              placeholder={DEFAULT_DCB_CONFIG.baseUrl}
            />
          </Field>
        </div>
        <Field label="Merchant ID">
          <Input value={dcbConfig.merchantId} onChange={(event) => setDcbField('merchantId', event.target.value)} />
        </Field>
        <Field label="Service ID">
          <Input value={dcbConfig.serviceId} onChange={(event) => setDcbField('serviceId', event.target.value)} />
        </Field>
        <Field label="Operator code">
          <Input
            value={dcbConfig.operatorCode}
            onChange={(event) => setDcbField('operatorCode', event.target.value)}
          />
        </Field>
        <Field label="Poll interval (ms)">
          <Input
            type="number"
            min={250}
            value={dcbConfig.pollIntervalMs}
            onChange={(event) => setDcbField('pollIntervalMs', event.target.value)}
          />
        </Field>
        <Field label="Poll timeout (ms)">
          <Input
            type="number"
            min={1000}
            value={dcbConfig.pollTimeoutMs}
            onChange={(event) => setDcbField('pollTimeoutMs', event.target.value)}
          />
        </Field>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-bg-elevated p-4">
        <div>
          <p className="text-sm font-semibold text-fg">PIN request API</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">
            Pack select ke baad ye call hoti hai. Path ya full URL dono chalenge. Neeche wale names Universe body
            ke field names hain — API change ho to yahin rename karo.
          </p>
        </div>
        <Field label="PIN API path" hint="POST">
          <Input
            value={dcbConfig.endpoints.pincode}
            onChange={(event) => setEndpoint('pincode', event.target.value)}
            placeholder="/api/dcb/pincode"
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="merchantId field">
            <Input
              value={dcbConfig.request.merchantIdField}
              onChange={(event) => setRequestField('merchantIdField', event.target.value)}
            />
          </Field>
          <Field label="serviceId field">
            <Input
              value={dcbConfig.request.serviceIdField}
              onChange={(event) => setRequestField('serviceIdField', event.target.value)}
            />
          </Field>
          <Field label="purchaseTypeId field">
            <Input
              value={dcbConfig.request.purchaseTypeIdField}
              onChange={(event) => setRequestField('purchaseTypeIdField', event.target.value)}
            />
          </Field>
          <Field label="msisdn field">
            <Input
              value={dcbConfig.request.msisdnField}
              onChange={(event) => setRequestField('msisdnField', event.target.value)}
            />
          </Field>
          <Field label="transactionChannel field">
            <Input
              value={dcbConfig.request.transactionChannelField}
              onChange={(event) => setRequestField('transactionChannelField', event.target.value)}
            />
          </Field>
          <Field label="operator field">
            <Input
              value={dcbConfig.request.operatorField}
              onChange={(event) => setRequestField('operatorField', event.target.value)}
            />
          </Field>
          <Field label="subscription field">
            <Input
              value={dcbConfig.request.subscriptionField}
              onChange={(event) => setRequestField('subscriptionField', event.target.value)}
            />
          </Field>
        </div>
        <details className="rounded-lg border border-border bg-bg-subtle/50 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-fg-muted">Example PIN body with these fields</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-bg-base p-2 font-mono text-[11px] text-fg-muted">
            {pincodePreview}
          </pre>
        </details>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-bg-elevated p-4">
        <div>
          <p className="text-sm font-semibold text-fg">PIN confirm / verify API</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">
            PIN submit par ye call hoti hai. Path se PIN response ka ID nikalta hai
            (jaise <code className="font-mono">data.PinInfo.ID</code>), field us ID ko
            confirm body mein bhejta hai (jaise <code className="font-mono">id</code>).
            User sirf SMS PIN type karta hai.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-end">
          <div className="sm:col-span-1">
            <Field label="HTTP Method" hint="PUT / POST / GET">
              <select
                className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-fg outline-none focus:border-primary cursor-pointer"
                value={dcbConfig.confirmMethod || dcbConfig.endpoints?.confirmMethod || 'PUT'}
                onChange={(event) => {
                  const method = event.target.value
                  setDcbConfig((current) => ({
                    ...current,
                    confirmMethod: method,
                    endpoints: { ...current.endpoints, confirmMethod: method },
                  }))
                }}
              >
                <option value="PUT">PUT</option>
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </select>
            </Field>
          </div>
          <div className="sm:col-span-3">
            <Field
              label="Confirm API path"
              hint={dcbConfig.confirmMethod || dcbConfig.endpoints?.confirmMethod || 'PUT'}
            >
              <Input
                value={dcbConfig.endpoints.confirm}
                onChange={(event) => setEndpoint('confirm', event.target.value)}
                placeholder="/api/dcb/confirmation"
              />
            </Field>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Confirm body ID field" hint="verify payload key">
            <Input
              value={dcbConfig.request.requestIdField}
              onChange={(event) => setRequestField('requestIdField', event.target.value)}
              placeholder="id"
            />
          </Field>
          <Field label="Confirm body PIN field">
            <Input
              value={dcbConfig.request.pinField}
              onChange={(event) => setRequestField('pinField', event.target.value)}
              placeholder="pinCode"
            />
          </Field>
          <Field label="PIN response ID path" hint="read from pincode JSON">
            <Input
              value={dcbConfig.responsePaths.requestId}
              onChange={(event) => setResponsePath('requestId', event.target.value)}
              placeholder="data.PinInfo.ID"
            />
          </Field>
        </div>
        <details className="rounded-lg border border-border bg-bg-subtle/50 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-fg-muted">Example confirm body with these fields</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-bg-base p-2 font-mono text-[11px] text-fg-muted">
            {confirmPreview}
          </pre>
        </details>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-bg-elevated p-4">
        <div>
          <p className="text-sm font-semibold text-fg">Other Universe endpoints</p>
          <p className="mt-0.5 text-[11px] text-fg-muted">
            Public config packs ke IDs verify karta hai. Subscriptions confirm ke baad 2s polling ke liye.
          </p>
        </div>
        <Field label="Public config path" hint="GET">
          <Input
            value={dcbConfig.endpoints.publicConfig}
            onChange={(event) => setEndpoint('publicConfig', event.target.value)}
            placeholder="/api/dcb/config/public"
          />
        </Field>
        <Field label="Subscriptions path" hint="GET">
          <Input
            value={dcbConfig.endpoints.subscriptions}
            onChange={(event) => setEndpoint('subscriptions', event.target.value)}
            placeholder="/api/dcb/subscriptions"
          />
        </Field>
        <Field label="current query field">
          <Input
            value={dcbConfig.request.currentField}
            onChange={(event) => setRequestField('currentField', event.target.value)}
          />
        </Field>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-bg-elevated p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-fg">Purchase type mappings</p>
            <p className="mt-0.5 text-[11px] text-fg-muted">
              Map each canvas pack key to the Universe purchaseTypeId.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-fg-muted hover:bg-bg-subtle"
            onClick={() =>
              setDcbConfig((current) => ({
                ...current,
                purchaseTypeMappings: [
                  ...current.purchaseTypeMappings,
                  { packKey: '', label: '', purchaseTypeId: '' },
                ],
              }))
            }
          >
            + Add mapping
          </button>
        </div>
        <label className="flex items-start gap-2 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2.5 text-sm text-fg">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={dcbConfig.skipSinglePackPage === true}
            onChange={(event) => setDcbField('skipSinglePackPage', event.target.checked)}
          />
          <span>
            <span className="font-medium">Skip pack page when only one pack</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-fg-muted">
              After the number check, send the PIN for that pack and open the PIN page. Two or more packs still show the pack page. Low balance and other operator outcomes open their own page instead of the pack picker.
            </span>
          </span>
        </label>
        {dcbConfig.purchaseTypeMappings.map((mapping, index) => (
          <div
            key={`${mapping.packKey}-${index}`}
            className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-bg-subtle/40 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <Input
              aria-label={`Pack key ${index + 1}`}
              value={mapping.packKey}
              onChange={(event) => setMapping(index, 'packKey', event.target.value)}
              placeholder="daily"
            />
            <Input
              aria-label={`Plan label ${index + 1}`}
              value={mapping.label}
              onChange={(event) => setMapping(index, 'label', event.target.value)}
              placeholder="Daily"
            />
            <Input
              aria-label={`Purchase type ID ${index + 1}`}
              value={mapping.purchaseTypeId}
              onChange={(event) => setMapping(index, 'purchaseTypeId', event.target.value)}
              placeholder="purchaseTypeId"
            />
            <button
              type="button"
              className="rounded-lg border border-red-200 px-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              onClick={() =>
                setDcbConfig((current) => ({
                  ...current,
                  purchaseTypeMappings: current.purchaseTypeMappings.filter(
                    (_, mappingIndex) => mappingIndex !== index
                  ),
                }))
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <details className="rounded-xl border border-border bg-bg-elevated p-4">
        <summary className="cursor-pointer text-sm font-semibold text-fg">Response paths</summary>
        <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
          Dot/bracket paths used by the backend response normalizer. Invalid paths never grant entitlement.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Object.entries(dcbConfig.responsePaths).map(([key, value]) => (
            <Field key={key} label={key}>
              <Input value={value} onChange={(event) => setResponsePath(key, event.target.value)} />
            </Field>
          ))}
        </div>
      </details>
    </div>
  )
}

export default memo(DcbConfigTab)
