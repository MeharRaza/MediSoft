import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Table, Modal, SearchInput } from '../../components/ui'

const emptyForm = () => ({ name: '', address: '', phone: '' })

export default function BranchManagement() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]         = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg]           = useState(null)

  useEffect(() => { fetchBranches() }, [])

  const fetchBranches = async () => {
    setLoading(true)
    try { const d = await api.settings.getBranches(); setBranches(Array.isArray(d)?d:[]) }
    catch (e) { setMsg({ type: 'error', text: e.message }) }
    finally { setLoading(false) }
  }

  const openAdd  = () => { setEditingId(null); setForm(emptyForm()); setModalOpen(true) }
  const openEdit = (b) => { setEditingId(b.id); setForm({ name: b.name||'', address: b.address||'', phone: b.phone||'' }); setModalOpen(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true); setMsg(null)
    try {
      if (editingId) { await api.settings.updateBranch({ id: editingId, ...form }); setMsg({ type: 'success', text: 'Branch updated.' }) }
      else { await api.settings.createBranch(form); setMsg({ type: 'success', text: 'Branch added.' }) }
      setModalOpen(false); fetchBranches()
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  const filtered = branches.filter(b => !search || (b.name||'').toLowerCase().includes(search.toLowerCase()))

  const cols = [
    { key: 'name',    label: 'Branch Name', render: v => <span className="text-[13px] font-semibold">{v}</span> },
    { key: 'address', label: 'Address',     render: v => <span className="text-[12px]">{v||'—'}</span> },
    { key: 'phone',   label: 'Phone',       render: v => <span className="text-[12px] font-mono">{v||'—'}</span> },
    { key: 'id',      label: 'Actions',     render: (_, row) => <Btn size="sm" variant="outline" onClick={() => openEdit(row)}><span className="material-symbols-outlined text-[14px]">edit</span>Edit</Btn> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Branch Management" subtitle="Manage pharmacy branches and locations" actions={<Btn variant="primary" onClick={openAdd}><span className="material-symbols-outlined text-[16px]">add</span>Add Branch</Btn>} />
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}
        <Card>
          <div className="px-5 py-3 border-b border-[#c3c6d5] flex items-center justify-between"><SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search branches..." className="w-64" /><span className="text-[12px] text-[#737784]">{branches.length} branch{branches.length !== 1 ? 'es' : ''}</span></div>
          {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : <Table columns={cols} data={filtered} emptyMsg="No branches found" />}
        </Card>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Branch' : 'Add Branch'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Branch Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus placeholder="e.g. Main Branch, Warehouse A" />
          <Input label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City" />
          <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-3 border-t border-[#c3c6d5]">
            <Btn type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={submitting}>{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}<span className="material-symbols-outlined text-[16px]">save</span>{editingId ? 'Update' : 'Add Branch'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
