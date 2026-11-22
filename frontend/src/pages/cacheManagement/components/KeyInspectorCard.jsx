import { memo, useState } from 'react'
import { Search, RefreshCw, Trash2, Copy, Check } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { copyToClipboard } from '../../../utils/clipboard'

function KeyInspectorCard({
  scanPattern,
  setScanPattern,
  keysList,
  loadingKeys,
  onScan,
  onDeleteKey,
}) {
  const [copiedKey, setCopiedKey] = useState(null)

  const handleCopy = (key) => {
    copyToClipboard(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  return (
    <div className="surface-card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-fg">Key Inspector</h3>
          <p className="text-xs text-fg-muted mt-0.5">
            Search, inspect TTL, or manually delete specific Redis keys matching a pattern.
          </p>
        </div>
        <form
          className="flex items-center gap-2 w-full sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault()
            onScan()
          }}
        >
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-fg-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={scanPattern}
              onChange={(e) => setScanPattern(e.target.value)}
              placeholder="e.g. flow:*, otp:*"
              className="w-full text-xs font-mono bg-bg-base border border-border rounded-xl pl-9 pr-3 py-2 text-fg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={loadingKeys}
            className="shrink-0 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingKeys ? 'animate-spin' : ''}`} />
            Scan
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-bg-muted/50 border-b border-border text-fg-muted font-medium">
              <th className="px-4 py-2.5">Key Name</th>
              <th className="px-3 py-2.5 w-24">Type</th>
              <th className="px-3 py-2.5 w-24">TTL</th>
              <th className="px-3 py-2.5 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono">
            {loadingKeys ? (
              <tr>
                <td colSpan="4" className="text-center py-8 text-fg-muted">
                  Scanning Redis for &ldquo;{scanPattern}&rdquo;…
                </td>
              </tr>
            ) : keysList.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-8 text-fg-muted">
                  No keys matched pattern &ldquo;{scanPattern}&rdquo;
                </td>
              </tr>
            ) : (
              keysList.map((k) => (
                <tr key={k.key} className="hover:bg-bg-muted/30 group">
                  <td className="px-4 py-2 text-fg break-all font-semibold">
                    {k.key}
                  </td>
                  <td className="px-3 py-2 text-fg-subtle">
                    <span className="badge badge-muted uppercase text-[10px]">
                      {k.type || 'string'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-fg-muted tabular-nums">
                    {k.ttl === -1 ? 'Persistent' : k.ttl === -2 ? 'Expired' : `${k.ttl}s`}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleCopy(k.key)}
                        title="Copy key"
                        className="p-1 h-7 w-7 text-fg-subtle hover:text-fg"
                      >
                        {copiedKey === k.key ? (
                          <Check className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onDeleteKey(k.key)}
                        title="Delete key"
                        className="p-1 h-7 w-7 text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default memo(KeyInspectorCard)
