import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Table, Modal, SearchInput, fmt } from '../../components/ui'

const emptyForm = () => ({ name: '', phone: '', address: '', opening_balance: '', discount_percent: '' })

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]           = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg]             = useState(null)

  useEffect(() => { fetchCustomers() }, [])

  const fetchCustomers = async () => {
    setLoading(true)
    try { const d = await api.sales.getCustomers(); setCustomers(Array.isArray(d) ? d : []) }
    catch (e) { setMsg({ type: 'error', text: e.message }) }
    finally { setLoading(false) }
  }

  const openAdd = () => { setEditingId(null); setForm(emptyForm()); setModalOpen(true) }
  const openEdit = (c) => { setEditingId(c.id); setForm({ name: c.name||'', phone: c.phone||'', address: c.address||'', opening_balance: c.opening_balance??'', discount_percent: c.discount_percent??'' }); setModalOpen(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true); setMsg(null)
    const payload = { name: form.name.trim(), phone: form.phone, address: form.address, opening_balance: parseFloat(form.opening_balance)||0, discount_percent: parseFloat(form.discount_percent)||0 }
    try {
      if (editingId) { await api.sales.updateCustomer({ id: editingId, ...payload }); setMsg({ type: 'success', text: 'Customer updated.' }) }
      else { await api.sales.createCustomer(payload); setMsg({ type: 'success', text: 'Customer added.' }) }
      setModalOpen(false); fetchCustomers()
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete customer "${c.name}"?`)) return
    try { await api.sales.deleteCustomer(c.id); setMsg({ type: 'success', text: 'Deleted.' }); fetchCustomers() }
    catch (err) { setMsg({ type: 'error', text: err.message }) }
  }

  const filtered = customers.filter(c => !search || (c.name||'').toLowerCase().includes(search.toLowerCase()) || (c.phone||'').includes(search))
  const totalBalance = customers.reduce((s, c) => s + Math.max(Number(c.balance||0), 0), 0)

  const columns = [
    { key: 'name',             label: 'Name',    render: v => <span className="text-[13px] font-semibold">{v}</span> },
    { key: 'phone',            label: 'Phone',   render: v => <span className="text-[12px] font-mono">{v||'—'}</span> },
    { key: 'balance',          label: 'Balance', right: true, render: (v, row) => { const b = Number(row.balance||0); return <span className={`text-[12px] font-mono font-bold ${b > 0 ? 'text-[#ba1a1a]' : 'text-green-700'}`}>PKR {fmt(b)}</span> } },
    { key: 'discount_percent', label: 'Disc%',   right: true, render: v => <span className="text-[12px] font-mono">{v||0}%</span> },
    { key: 'id',               label: 'Actions', render: (_, row) => <div className="flex gap-1.5"><Btn size="sm" variant="outline" onClick={() => openEdit(row)}><span className="material-symbols-outlined text-[14px]">edit</span></Btn><Btn size="sm" variant="danger" onClick={() => handleDelete(row)}><span className="material-symbols-outlined text-[14px]">delete</span></Btn></div> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Customers" subtitle="Manage customer accounts and balances" actions={<Btn variant="primary" onClick={openAdd}><span className="material-symbols-outlined text-[16px]">person_add</span>Add Customer</Btn>} />
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-[#003c90]">group</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Customers</p><p className="text-[22px] font-bold text-[#003c90]">{customers.length}</p></div></Card>
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-red-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">account_balance_wallet</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Outstanding</p><p className="text-[22px] font-bold text-[#ba1a1a]">PKR {fmt(totalBalance)}</p></div></Card>
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-amber-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-amber-600">credit_score</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">With Balance Due</p><p className="text-[22px] font-bold text-amber-700">{customers.filter(c => Number(c.balance||0) > 0).length}</p></div></Card>
        </div>
        <Card>
          <div className="px-5 py-3 border-b border-[#c3c6d5] flex items-center justify-between"><SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..." className="w-64" /><Btn variant="outline" size="sm" onClick={fetchCustomers}><span className="material-symbols-outlined text-[14px]">refresh</span></Btn></div>
          {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : <Table columns={columns} data={filtered} emptyMsg="No customers found" />}
        </Card>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
          <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0300-1234567" />
          <Input label="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Opening Balance" type="number" value={form.opening_balance} onChange={e => setForm({ ...form, opening_balance: e.target.value })} placeholder="0.00" />
            <Input label="Discount %" type="number" value={form.discount_percent} onChange={e => setForm({ ...form, discount_percent: e.target.value })} placeholder="0" />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#c3c6d5]">
            <Btn type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={submitting}>{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}<span className="material-symbols-outlined text-[16px]">{editingId ? 'save' : 'person_add'}</span>{editingId ? 'Save Changes' : 'Add Customer'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
