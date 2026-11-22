import { Plus } from 'lucide-react'
import Button from '../../components/ui/Button'

export function CreateUserCard({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  creating,
  onSubmit,
}) {
  return (
    <div className="surface-card p-5 mb-6">
      <h2 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Create user
      </h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="sm:w-44 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <Button type="submit" variant="primary" size="sm" disabled={creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  )
}
