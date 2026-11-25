import { memo } from 'react'
import { Trash2 } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { PRESET_SCOPES } from '../cacheConstants'

function CacheScopesGrid({ stats, onPurgeScope, purgingScope }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {PRESET_SCOPES.map((scope) => {
        const Icon = scope.icon
        const isPurging = purgingScope === scope.id
        const scopeCount = stats?.groups?.[scope.id]

        return (
          <div
            key={scope.id}
            className="surface-card p-5 flex flex-col justify-between space-y-4 hover:border-border-hover transition-colors"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${scope.bg} ${scope.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-fg text-sm">{scope.title}</h3>
                    <code className="text-[11px] font-mono text-fg-subtle">
                      {scope.pattern}
                    </code>
                  </div>
                </div>
                <span className={`badge ${scope.badge} text-[10px]`}>
                  {scopeCount != null ? `${scopeCount} keys` : 'Scoped'}
                </span>
              </div>
              <p className="text-xs text-fg-muted leading-relaxed">
                {scope.description}
              </p>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-fg-subtle">
                Affects active sessions & templates
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPurgeScope(scope)}
                disabled={isPurging}
                className="gap-1.5 text-xs text-danger hover:text-danger-hover hover:border-danger/40"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isPurging ? 'animate-spin' : ''}`} />
                {isPurging ? 'Purging…' : 'Purge Scope'}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default memo(CacheScopesGrid)
