import { memo } from 'react'
import Button from '../../ui/Button'

export function CgRedirectCard({
  cgUrlDraft,
  setCgUrlDraft,
  savingCg,
  onSave,
}) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-fg">CG / home redirect URL</h3>
        <p className="text-xs text-fg-muted mt-1">
          With flow mode <strong>None</strong> and this URL set, users are redirected here on
          landing. With <strong>CG via HOME</strong>, they see HOME first and this URL is used
          when they tap Subscribe (still no HE). Also used as the HOME fallback when API HE cannot
          resolve MSISDN and no <code>failRedirectUrl</code> is set. Optional placeholders like{' '}
          <code className="font-mono">{'{{msisdn}}'}</code> /{' '}
          <code className="font-mono">{'{click_id}'}</code> are filled when present.
        </p>
      </div>
      <div className="px-5 py-4 flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono"
          value={cgUrlDraft}
          onChange={(e) => setCgUrlDraft(e.target.value)}
          placeholder="https://dsdp-cg.example/path"
        />
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={savingCg}
          onClick={onSave}
        >
          {savingCg ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

export default memo(CgRedirectCard)
