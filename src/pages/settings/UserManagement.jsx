import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Select, Table, Modal, Badge, SearchInput } from '../../components/ui'

const ROLES = [{ value: 'admin', label: 'Admin' }, { value: 'manager', label: 'Manager' }, { value: 'cashier', label: 'Cashier' }]
const emptyForm = () => ({ username: '', password: '', full_name: '', role: 'cashier', branch_id: '1', is_active: true })

export default function UserManagement() {
  const [users, setUsers]       = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]         = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg]           = useState(null)

  useEffect(() => {
    api.settings.getUsers().then(u => { setUsers(Array.isArray(u)?u:[]); setLoading(false) })
    api.settings.getBranches().then(b => setBranches(Array.isArray(b)?b:[]))
  }, [])

  const fetchUsers = () => api.settings.getUsers().then(u => setUsers(Array.isArray(u)?u:[]))
  const openAdd  = () => { setEditingId(null); setForm(emptyForm()); setModalOpen(true) }
  const openEdit = (u) => { setEditingId(u.id); setForm({ username: u.username||'', password: '', full_name: u.full_name||'', role: u.role||'cashier', branch_id: String(u.branch_id||1), is_active: u.is_active!==0 }); setModalOpen(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username.trim() || !form.full_name.trim()) return
    if (!editingId && !form.password.trim()) return setMsg({ type: 'error', text: 'Password required for new users.' })
    setSubmitting(true); setMsg(null)
    const payload = { username: form.username, full_name: form.full_name, role: form.role, branch_id: parseInt(form.branch_id)||1, is_active: form.is_active?1:0, rights: {} }
    if (form.password) payload.password = form.password
    try {
      if (editingId) { await api.settings.updateUser({ id: editingId, ...payload }); setMsg({ type: 'success', text: 'User updated.' }) }
      else { await api.settings.createUser(payload); setMsg({ type: 'success', text: 'User created.' }) }
      setModalOpen(false); fetchUsers()
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (u) => {
    if (!window.confirm(`Deactivate user "${u.username}"?`)) return
    try { await api.settings.deleteUser(u.id); setMsg({ type: 'success', text: 'User deactivated.' }); fetchUsers() }
    catch (err) { setMsg({ type: 'error', text: err.message }) }
  }

  const filtered = users.filter(u => !search || (u.username||'').toLowerCase().includes(search.toLowerCase()) || (u.full_name||'').toLowerCase().includes(search.toLowerCase()))
  const branchOpts = [{ value: '1', label: 'Main Branch' }, ...branches.map(b => ({ value: String(b.id), label: b.name }))]
  const roleColor  = r => r === 'admin' ? 'error' : r === 'manager' ? 'info' : 'neutral'

  const cols = [
    { key: 'username',  label: 'Username',  mono: true, render: v => <span className="font-mono font-semibold text-[#003c90] text-[12px]">{v}</span> },
    { key: 'full_name', label: 'Full Name',  render: v => <span className="text-[13px] font-semibold">{v}</span> },
    { key: 'role',      label: 'Role',       render: v => <Badge label={v?.toUpperCase()} type={roleColor(v)} /> },
    { key: 'is_active', label: 'Status',     render: v => <Badge label={v?'ACTIVE':'INACTIVE'} type={v?'success':'error'} /> },
    { key: 'id',        label: 'Actions',    render: (_, row) => <div className="flex gap-1.5"><Btn size="sm" variant="outline" onClick={() => openEdit(row)}><span className="material-symbols-outlined text-[14px]">edit</span></Btn><Btn size="sm" variant="danger" onClick={() => handleDelete(row)}><span className="material-symbols-outlined text-[14px]">person_off</span></Btn></div> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="User Management" subtitle="Manage system users and access rights" actions={<Btn variant="primary" onClick={openAdd}><span className="material-symbols-outlined text-[16px]">person_add</span>Add User</Btn>} />
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}
        <Card><div className="px-5 py-3 border-b border-[#c3c6d5] flex items-center justify-between"><SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search username or name..." className="w-64" /><Btn variant="outline" size="sm" onClick={fetchUsers}><span className="material-symbols-outlined text-[14px]">refresh</span></Btn></div>
          {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : <Table columns={cols} data={filtered} emptyMsg="No users found" />}
        </Card>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit User' : 'Add User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required autoFocus />
            <Input label="Username *" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
          </div>
          <Input label={editingId ? 'New Password (leave blank to keep)' : 'Password *'} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} options={ROLES} />
            <Select label="Branch" value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))} options={branchOpts} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 rounded text-[#003c90]" /><span className="text-[12px] font-semibold text-[#434653]">User is Active</span></label>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#c3c6d5]">
            <Btn type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={submitting}>{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}<span className="material-symbols-outlined text-[16px]">save</span>{editingId ? 'Update' : 'Create User'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
