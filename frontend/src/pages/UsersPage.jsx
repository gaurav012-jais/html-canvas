import { memo, useEffect, useState } from 'react'
import {
  Search,
  UserCog,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import EmptyState from '../components/ui/EmptyState'
import useStore from '../store/useStore'
import {
  listUsers,
  createUser,
  updateUser,
  setUserStatus,
} from '../services/api/users'
import { useAuth } from '../context/AuthContext'
import { CreateUserCard } from './users/CreateUserCard'
import { UserCard } from './users/UserCard'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', badge: 'badge-success' },
  { value: 'inactive', label: 'Inactive', badge: 'badge-muted' },
  { value: 'suspended', label: 'Suspended', badge: 'badge-danger' },
]

function statusMeta(status) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0]
}

function UsersPage() {
  const addToast = useStore((s) => s.addToast)
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await listUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      addToast(err.message || 'Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadUsers, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = search.trim()
    ? users.filter((u) => {
        const q = search.toLowerCase()
        return (
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.status || '').toLowerCase().includes(q)
        )
      })
    : users

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) return
    setCreating(true)
    try {
      await createUser({
        name: name.trim(),
        email: email.trim(),
        password,
      })
      setName('')
      setEmail('')
      setPassword('')
      addToast('User created', 'success')
      await loadUsers()
    } catch (err) {
      addToast(err.message || 'Failed to create user', 'error')
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (u) => {
    setEditId(u.id)
    setEditName(u.name || '')
    setEditEmail(u.email || '')
    setEditPassword('')
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditName('')
    setEditEmail('')
    setEditPassword('')
  }

  const handleSaveEdit = async (u) => {
    setSavingId(u.id)
    try {
      const payload = {
        name: editName.trim(),
        email: editEmail.trim(),
      }
      if (editPassword.trim()) {
        payload.password = editPassword.trim()
      }
      await updateUser(u.id, payload)
      addToast('User updated', 'success')
      cancelEdit()
      await loadUsers()
    } catch (err) {
      addToast(err.message || 'Failed to update user', 'error')
    } finally {
      setSavingId(null)
    }
  }

  const handleStatus = async (u, status) => {
    if (u.role === 'admin') {
      addToast('Cannot change admin status', 'error')
      return
    }
    setSavingId(u.id)
    try {
      await setUserStatus(u.id, status)
      addToast(`User marked ${status}`, 'success')
      await loadUsers()
    } catch (err) {
      addToast(err.message || 'Failed to update status', 'error')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-header-title">User Management</h1>
          <p className="page-header-description">
            Create users, set email/password, and suspend or deactivate accounts.
            Only <span className="font-medium text-fg">{currentUser?.email}</span> has admin access.
          </p>
        </div>

        <CreateUserCard
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          creating={creating}
          onSubmit={handleCreate}
        />

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full text-sm border border-border rounded-lg pl-9 pr-3 py-2 bg-bg-surface text-fg"
              placeholder="Search by name, email, or status…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-fg-muted">
            {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
          </span>
        </div>

        {loading ? (
          <div className="surface-card p-12 text-center text-fg-muted text-sm">
            Loading users…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title={search ? 'No users match your search' : 'No users created yet'}
            description={
              search
                ? 'Try a different search term.'
                : 'Add your first team member using the form above.'
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                meta={statusMeta(u.status || 'active')}
                editing={editId === u.id}
                busy={savingId === u.id}
                editName={editName}
                setEditName={setEditName}
                editEmail={editEmail}
                setEditEmail={setEditEmail}
                editPassword={editPassword}
                setEditPassword={setEditPassword}
                onOpenEdit={openEdit}
                onCancelEdit={cancelEdit}
                onSaveEdit={handleSaveEdit}
                onStatusChange={handleStatus}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default memo(UsersPage)
