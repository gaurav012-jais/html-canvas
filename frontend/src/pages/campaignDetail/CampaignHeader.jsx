import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Pencil, AlertCircle } from 'lucide-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

function CompactStatusToggle({ active, onToggle, disabled, activating, blockedReason }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={active ? 'Deactivate campaign' : 'Activate campaign'}
      disabled={disabled || activating}
      title={blockedReason || (active ? 'Deactivate' : 'Activate')}
      onClick={onToggle}
      className={`
        relative inline-flex h-7 w-12 shrink-0 items-center rounded-full
        transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
        disabled:cursor-not-allowed disabled:opacity-50
        ${active ? 'bg-success' : 'bg-bg-canvas border border-border'}
      `}
    >
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white shadow-sm
          transition-transform duration-200
          ${active ? 'translate-x-[1.15rem]' : 'translate-x-0.5'}
        `}
      />
    </button>
  )
}

function CampaignHeader({
  campaign,
  backToMarket,
  onNavigateBack,
  editingName,
  setEditingName,
  nameDraft,
  setNameDraft,
  savingName,
  onSaveName,
  canActivate,
  activating,
  activateBlockedReason,
  onToggleActive,
}) {
  return (
    <>
      <button
        type="button"
        onClick={onNavigateBack}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg mb-3 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to market
      </button>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-fg-subtle mb-1">
            <Link to="/markets" className="hover:text-fg">
              Markets
            </Link>
            {' / '}
            <Link to={backToMarket} className="hover:text-fg">
              {campaign.country} / {campaign.operator}
            </Link>
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            {editingName ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="max-w-md"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveName()
                    if (e.key === 'Escape') {
                      setNameDraft(campaign.name || '')
                      setEditingName(false)
                    }
                  }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onSaveName}
                  disabled={savingName || !nameDraft.trim()}
                >
                  {savingName ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNameDraft(campaign.name || '')
                    setEditingName(false)
                  }}
                  disabled={savingName}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <h1 className="page-header-title">{campaign.name}</h1>
                <button
                  type="button"
                  className="p-1.5 text-fg-muted hover:text-accent rounded-md hover:bg-accent-muted transition-colors"
                  title="Edit campaign name"
                  onClick={() => setEditingName(true)}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </>
            )}
            <span className={`badge ${campaign.active ? 'badge-success' : 'badge-muted'}`}>
              {campaign.active ? 'Active' : 'Draft'}
            </span>
            {!canActivate && !campaign.active && (
              <span className="text-[11px] text-warning flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Pages incomplete
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs text-fg-muted">
            {campaign.active ? 'Live' : 'Offline'}
          </span>
          <CompactStatusToggle
            active={!!campaign.active}
            onToggle={onToggleActive}
            disabled={!campaign.active && !canActivate}
            activating={activating}
            blockedReason={activateBlockedReason}
          />
        </div>
      </div>
    </>
  )
}

export default memo(CampaignHeader)
