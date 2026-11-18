import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Select, Table, Modal, Badge, SearchInput } from '../../components/ui'

const ROLES = [
  { value: 'admin', label: 'Admin (Full Access)' },
  { value: 'manager', label: 'Manager' },
  { value: 'cashier', label: 'Cashier (Counter Terminal)' }
]

const PERMISSION_DEFINITIONS = [
  {
    key: 'billing.create',
    label: 'Fast Billing & Checkout',
    desc: 'Create sale invoices and bill customers',
    category: 'Billing'
  },
  {
    key: 'billing.discount',
    label: 'Custom Discounts (Percent & Flat)',
    desc: 'Allow cashier to change or add discounts on invoices',
    category: 'Billing'
  },
  {
    key: 'billing.history',
    label: 'Medicine Sales History (Ctrl+H)',
    desc: 'View customer price history for selected medicine',
    category: 'Billing'
  },
  {
    key: 'billing.returns',
    label: 'Process Sales Returns',
    desc: 'Accept returned medicine and issue refunds',
    category: 'Billing'
  },
  {
    key: 'inventory.view_profit',
    label: 'View Trade Price & Profit %',
    desc: 'Display medicine cost prices and profit margins in billing',
    category: 'Inventory'
  },
  {
    key: 'inventory.purchases',
    label: 'Purchase Entry & Supplier Bills',
    desc: 'Access purchase entry, purchase orders and supplier ledger',
    category: 'Inventory'
  },
  {
    key: 'reports.financial',
    label: 'Financial & Profit Reports',
    desc: 'View daily profit/loss, sales summaries and financial accounts',
    category: 'Reports'
  },
  {
    key: 'settings.access',
    label: 'System Settings & Terminals',
    desc: 'Configure printers, store info, users and LAN terminals',
    category: 'Settings'
  }
]

const DEFAULT_CASHIER_RIGHTS = {
  'billing.create': true,
  'billing.discount': false,
  'billing.history': true,
  'billing.returns': false,
  'inventory.view_profit': false,
  'inventory.purchases': false,
  'reports.financial': false,
  'settings.access': false
}

const DEFAULT_ADMIN_RIGHTS = {
  all: true,
  'billing.create': true,
  'billing.discount': true,
  'billing.history': true,
  'billing.returns': true,
  'inventory.view_profit': true,
  'inventory.purchases': true,
  'reports.financial': true,
  'settings.access': true
}

const emptyForm = () => ({
  username: '',
  password: '',
  full_name: '',
  role: 'cashier',
  branch_id: '1',
  is_active: true,
  rights: { ...DEFAULT_CASHIER_RIGHTS }
})

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    fetchUsers()
    api.settings.getBranches().then(b => setBranches(Array.isArray(b) ? b : []))
  }, [])

  const fetchUsers = () => {
    setLoading(true)
    api.settings.getUsers()
      .then(u => {
        setUsers(Array.isArray(u) ? u : [])
      })
      .finally(() => setLoading(false))
  }

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  const openEdit = (u) => {
    setEditingId(u.id)
    let parsedRights = {}
    try {
      parsedRights = u.rights ? (typeof u.rights === 'string' ? JSON.parse(u.rights) : u.rights) : {}
    } catch (e) {
      parsedRights = {}
    }

    setForm({
      username: u.username || '',
      password: '',
      full_name: u.full_name || '',
      role: u.role || 'cashier',
      branch_id: String(u.branch_id || 1),
      is_active: u.is_active !== 0,
      rights: u.role === 'admin' ? { ...DEFAULT_ADMIN_RIGHTS, ...parsedRights } : { ...DEFAULT_CASHIER_RIGHTS, ...parsedRights }
    })
    setModalOpen(true)
  }

  const handleRoleChange = (newRole) => {
    if (newRole === 'admin') {
      setForm(f => ({ ...f, role: newRole, rights: { ...DEFAULT_ADMIN_RIGHTS } }))
    } else {
      setForm(f => ({ ...f, role: newRole, rights: { ...DEFAULT_CASHIER_RIGHTS } }))
    }
  }

  const toggleRight = (key) => {
    setForm(f => ({
      ...f,
      rights: {
        ...f.rights,
        [key]: !f.rights?.[key]
      }
    }))
  }

  const handleSelectAllRights = (enableAll) => {
    const updated = {}
    PERMISSION_DEFINITIONS.forEach(p => {
      updated[p.key] = enableAll
    })
    if (enableAll && form.role === 'admin') updated.all = true
    setForm(f => ({ ...f, rights: updated }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username.trim() || !form.full_name.trim()) return
    if (!editingId && !form.password.trim()) {
      return setMsg({ type: 'error', text: 'Password is required for new users.' })
    }

    setSubmitting(true)
    setMsg(null)

    const payload = {
      username: form.username.trim(),
      full_name: form.full_name.trim(),
      role: form.role,
      branch_id: parseInt(form.branch_id) || 1,
      is_active: form.is_active ? 1 : 0,
      rights: form.role === 'admin' ? { ...form.rights, all: true } : form.rights
    }

    if (form.password) payload.password = form.password

    try {
      if (editingId) {
        await api.settings.updateUser({ id: editingId, ...payload })
        setMsg({ type: 'success', text: `User "${payload.username}" updated successfully.` })
      } else {
        await api.settings.createUser(payload)
        setMsg({ type: 'success', text: `User "${payload.username}" created successfully.` })
      }
      setModalOpen(false)
      fetchUsers()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (u) => {
    if (!window.confirm(`Deactivate user "${u.username}"?`)) return
    try {
      await api.settings.deleteUser(u.id)
      setMsg({ type: 'success', text: `User "${u.username}" deactivated.` })
      fetchUsers()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
  }

  const filtered = users.filter(u =>
    !search ||
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const branchOpts = [{ value: '1', label: 'Main Branch' }, ...branches.map(b => ({ value: String(b.id), label: b.name }))]
  const roleColor = r => r === 'admin' ? 'error' : r === 'manager' ? 'info' : 'neutral'

  const renderPermissionsSummary = (row) => {
    if (row.role === 'admin') {
      return <Badge label="ALL ACCESS" type="success" />
    }
    let rights = {}
    try {
      rights = row.rights ? (typeof row.rights === 'string' ? JSON.parse(row.rights) : row.rights) : {}
    } catch (e) {
      rights = {}
    }

    const enabledCount = Object.keys(rights).filter(k => k !== 'all' && rights[k]).length
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-semibold text-[#434653]">
          {enabledCount} of {PERMISSION_DEFINITIONS.length} allowed
        </span>
        {rights['billing.discount'] && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            Discount
          </span>
        )}
        {rights['inventory.purchases'] && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            Purchases
          </span>
        )}
        {rights['reports.financial'] && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-800 border border-green-200">
            Reports
          </span>
        )}
      </div>
    )
  }

  const cols = [
    {
      key: 'username',
      label: 'Username',
      mono: true,
      render: v => <span className="font-mono font-semibold text-[#003c90] text-[12px]">{v}</span>
    },
    {
      key: 'full_name',
      label: 'Full Name',
      render: v => <span className="text-[13px] font-semibold text-[#191c1e]">{v}</span>
    },
    {
      key: 'role',
      label: 'Role',
      render: v => <Badge label={v?.toUpperCase()} type={roleColor(v)} />
    },
    {
      key: 'permissions',
      label: 'Cashier Permissions',
      render: (_, row) => renderPermissionsSummary(row)
    },
    {
      key: 'is_active',
      label: 'Status',
      render: v => <Badge label={v ? 'ACTIVE' : 'INACTIVE'} type={v ? 'success' : 'error'} />
    },
    {
      key: 'id',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-1.5">
          <Btn size="sm" variant="outline" onClick={() => openEdit(row)}>
            <span className="material-symbols-outlined text-[14px]">edit</span>
          </Btn>
          <Btn size="sm" variant="danger" onClick={() => handleDelete(row)}>
            <span className="material-symbols-outlined text-[14px]">person_off</span>
          </Btn>
        </div>
      )
    },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader
        title="User & Cashier Management"
        subtitle="Manage cashiers, credentials and granular permissions checklist for counter PCs"
        actions={
          <Btn variant="primary" onClick={openAdd}>
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Add New User / Cashier
          </Btn>
        }
      />

      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {msg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${
            msg.type === 'error'
              ? 'bg-red-50 text-[#ba1a1a] border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            <span className="material-symbols-outlined text-[18px]">
              {msg.type === 'error' ? 'error' : 'check_circle'}
            </span>
            {msg.text}
            <button className="ml-auto" onClick={() => setMsg(null)}>
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        <Card>
          <div className="px-5 py-3 border-b border-[#c3c6d5] flex items-center justify-between">
            <SearchInput
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search username or full name..."
              className="w-72"
            />
            <Btn variant="outline" size="sm" onClick={fetchUsers}>
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Refresh
            </Btn>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" />
            </div>
          ) : (
            <Table columns={cols} data={filtered} emptyMsg="No users or cashiers found" />
          )}
        </Card>
      </div>

      {/* Add / Edit Modal with Granular Checklist */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Cashier / User' : 'Add Cashier / User'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="e.g. Counter 1 Cashier"
              required
              autoFocus
            />
            <Input
              label="Username *"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="e.g. cashier1"
              required
            />
          </div>

          <Input
            label={editingId ? 'New Password (leave blank to keep current)' : 'Password *'}
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder={editingId ? '••••••••' : 'Enter login password'}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Role"
              value={form.role}
              onChange={e => handleRoleChange(e.target.value)}
              options={ROLES}
            />
            <Select
              label="Branch"
              value={form.branch_id}
              onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}
              options={branchOpts}
            />
          </div>

          {/* Granular Cashier Permissions Checklist */}
          <div className="pt-3 border-t border-[#c3c6d5]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-bold text-[#191c1e] uppercase tracking-wide flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#003c90]">checklist</span>
                Permissions Checklist for this User
              </label>
              {form.role !== 'admin' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllRights(true)}
                    className="text-[11px] text-[#003c90] hover:underline font-semibold"
                  >
                    Select All
                  </button>
                  <span className="text-[#c3c6d5]">•</span>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, rights: { ...DEFAULT_CASHIER_RIGHTS } }))}
                    className="text-[11px] text-[#737784] hover:underline font-semibold"
                  >
                    Default
                  </button>
                </div>
              )}
            </div>

            {form.role === 'admin' ? (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-[12px] text-blue-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#003c90]">verified_user</span>
                Administrators have complete, unrestricted access to all modules and settings.
              </div>
            ) : (
              <div className="space-y-2 border border-[#c3c6d5] rounded-xl p-3 bg-[#f7f9fb]">
                {PERMISSION_DEFINITIONS.map(p => {
                  const isChecked = Boolean(form.rights?.[p.key])
                  return (
                    <label
                      key={p.key}
                      className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${
                        isChecked
                          ? 'bg-white border-[#003c90]/40 shadow-sm'
                          : 'bg-transparent border-transparent hover:bg-white/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRight(p.key)}
                        className="w-4 h-4 mt-0.5 rounded text-[#003c90] border-[#c3c6d5] focus:ring-[#003c90]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[12px] font-bold ${isChecked ? 'text-[#003c90]' : 'text-[#191c1e]'}`}>
                            {p.label}
                          </span>
                          <span className="text-[10px] font-semibold text-[#737784] uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                            {p.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#737784] mt-0.5 leading-snug">
                          {p.desc}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4 rounded text-[#003c90]"
            />
            <span className="text-[12px] font-semibold text-[#434653]">User Account is Active</span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#c3c6d5]">
            <Btn type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Btn>
            <Btn type="submit" variant="primary" disabled={submitting}>
              {submitting && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span className="material-symbols-outlined text-[16px]">save</span>
              {editingId ? 'Save Changes' : 'Create Cashier'}
            </Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
