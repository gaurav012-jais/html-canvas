import {
  Shield,
  UserCog,
  KeyRound,
  Ban,
  PauseCircle,
  CheckCircle2,
} from 'lucide-react'
import Button from '../../components/ui/Button'

export function UserCard({
  user: u,
  meta,
  editing,
  busy,
  editName,
  setEditName,
  editEmail,
  setEditEmail,
  editPassword,
  setEditPassword,
  onOpenEdit,
  onCancelEdit,
  onSaveEdit,
  onStatusChange,
}) {
  const isAdmin = u.role === 'admin'

  return (
    <div
      className={`surface-card overflow-hidden ${
        u.status === 'active' ? '' : 'opacity-80'
      }`}
    >
      <div className="flex flex-col gap-3 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              isAdmin
                ? 'bg-accent-muted text-accent'
                : 'bg-bg-muted text-fg-subtle'
            }`}
          >
            {isAdmin ? (
              <Shield className="w-4 h-4" />
            ) : (
              <UserCog className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Name"
                  />
                  <input
                    type="email"
                    className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                    disabled={isAdmin}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="New password (optional)"
                    minLength={6}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={busy}
                      onClick={() => onSaveEdit(u)}
                    >
                      {busy ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={onCancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-fg truncate">
                    {u.name}
                  </p>
                  <span className={`badge ${meta.badge}`}>{meta.label}</span>
                  {isAdmin && (
                    <span className="badge badge-muted flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-fg-muted mt-0.5 truncate">
                  {u.email}
                </p>
              </>
            )}
          </div>

          {!editing && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenEdit(u)}
                title="Edit email / password"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Edit
              </Button>
            </div>
          )}
        </div>

        {!editing && !isAdmin && (
          <div className="flex flex-wrap gap-2 pl-12">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || u.status === 'active'}
              onClick={() => onStatusChange(u, 'active')}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Activate
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || u.status === 'inactive'}
              onClick={() => onStatusChange(u, 'inactive')}
            >
              <PauseCircle className="w-3.5 h-3.5" />
              Inactive
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || u.status === 'suspended'}
              onClick={() => onStatusChange(u, 'suspended')}
            >
              <Ban className="w-3.5 h-3.5" />
              Suspend
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
