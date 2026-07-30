import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Table, Modal, SearchInput, fmt } from '../../components/ui'

const emptyForm = () => ({ name: '', contact_person: '', phone: '', email: '', address: '', opening_balance: '', companies: [] })

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]           = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg]             = useState(null)
  const [companyInput, setCompanyInput] = useState('') // For adding new companies

  useEffect(() => { fetchSuppliers() }, [])

  const fetchSuppliers = async () => {
    setLoading(true)
    try { const d = await api.purchase.getSuppliers(); setSuppliers(Array.isArray(d) ? d : []) }
    catch (e) { setMsg({ type: 'error', text: e.message }) }
    finally { setLoading(false) }
  }

  const openAdd  = () => { setEditingId(null); setForm(emptyForm()); setCompanyInput(''); setModalOpen(true) }
  const openEdit = async (s) => { 
    setEditingId(s.id)
    // Fetch companies for this supplier
    const companies = await api.purchase.getSupplierCompanies(s.id)
    setForm({ 
      name: s.name||'', 
      contact_person: s.contact_person||'', 
      phone: s.phone||'', 
      email: s.email||'', 
      address: s.address||'', 
      opening_balance: s.opening_balance??'',
      companies: companies.map(c => c.company_name)
    })
    setCompanyInput('')
    setModalOpen(true)
  }

  const addCompany = () => {
    if (companyInput.trim() && !form.companies.includes(companyInput.trim())) {
      setForm({ ...form, companies: [...form.companies, companyInput.trim()] })
      setCompanyInput('')
    }
  }

  const removeCompany = (company) => {
    setForm({ ...form, companies: form.companies.filter(c => c !== company) })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true); setMsg(null)
    const payload = { name: form.name.trim(), contact_person: form.contact_person, phone: form.phone, email: form.email, address: form.address, opening_balance: parseFloat(form.opening_balance)||0 }
    try {
      let supplierId = editingId
      if (editingId) { 
        await api.purchase.updateSupplier({ id: editingId, ...payload })
        setMsg({ type: 'success', text: 'Supplier updated.' })
      } else { 
        const result = await api.purchase.createSupplier(payload)
        supplierId = result.id
        setMsg({ type: 'success', text: 'Supplier added.' })
      }
      
      // Save companies
      if (form.companies.length > 0) {
        await api.purchase.addSupplierCompanies({ supplierId, companies: form.companies })
      }
      
      setModalOpen(false); fetchSuppliers()
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete supplier "${s.name}"?`)) return
    try { await api.purchase.deleteSupplier(s.id); setMsg({ type: 'success', text: 'Deleted.' }); fetchSuppliers() }
    catch (err) { setMsg({ type: 'error', text: err.message }) }
  }

  const filtered = suppliers.filter(s => !search || (s.name||'').toLowerCase().includes(search.toLowerCase()) || (s.phone||'').includes(search))
  const totalPayable = suppliers.reduce((s, sup) => s + Math.max(Number(sup.balance||0), 0), 0)

  const columns = [
    { key: 'name',           label: 'Name',    render: v => <span className="text-[13px] font-semibold">{v}</span> },
    { key: 'contact_person', label: 'Contact', render: v => <span className="text-[12px]">{v||'—'}</span> },
    { key: 'phone',          label: 'Phone',   render: v => <span className="text-[12px] font-mono">{v||'—'}</span> },
    { key: 'balance',        label: 'Balance', right: true, render: v => { const b = Number(v||0); return <span className={`text-[12px] font-mono font-bold ${b > 0 ? 'text-[#ba1a1a]' : 'text-green-700'}`}>PKR {fmt(b)}</span> } },
    { key: 'id',             label: 'Actions', render: (_, row) => <div className="flex gap-1.5"><Btn size="sm" variant="outline" onClick={() => openEdit(row)}><span className="material-symbols-outlined text-[14px]">edit</span></Btn><Btn size="sm" variant="danger" onClick={() => handleDelete(row)}><span className="material-symbols-outlined text-[14px]">delete</span></Btn></div> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Suppliers" subtitle="Manage supplier accounts" actions={<Btn variant="primary" onClick={openAdd}><span className="material-symbols-outlined text-[16px]">add</span>Add Supplier</Btn>} />
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-teal-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-teal-600">local_shipping</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Suppliers</p><p className="text-[22px] font-bold text-teal-700">{suppliers.length}</p></div></Card>
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-red-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">account_balance_wallet</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Payable</p><p className="text-[22px] font-bold text-[#ba1a1a]">PKR {fmt(totalPayable)}</p></div></Card>
        </div>
        <Card><div className="px-5 py-3 border-b border-[#c3c6d5] flex items-center justify-between"><SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..." className="w-64" /><Btn variant="outline" size="sm" onClick={fetchSuppliers}><span className="material-symbols-outlined text-[14px]">refresh</span></Btn></div>
          {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : <Table columns={columns} data={filtered} emptyMsg="No suppliers found" />}
        </Card>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Supplier' : 'Add Supplier'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Company Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Person" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
            <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input label="Opening Balance" type="number" value={form.opening_balance} onChange={e => setForm({ ...form, opening_balance: e.target.value })} placeholder="0.00" />
          </div>
          <Input label="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          
          {/* Companies Multi-Select */}
          <div>
            <label className="block text-[11px] font-semibold text-[#434653] mb-2 uppercase tracking-wide">
              Companies (Medicine Manufacturers)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={companyInput}
                onChange={e => setCompanyInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompany() } }}
                placeholder="e.g., Sami, Ferozsons, Abbott..."
                className="flex-1 px-3 py-2 border border-[#c3c6d5] rounded text-[13px] focus:border-[#003c90] focus:outline-none focus:ring-2 focus:ring-[#003c90]/20"
              />
              <button
                type="button"
                onClick={addCompany}
                className="px-4 py-2 bg-[#003c90] text-white rounded text-[12px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add
              </button>
            </div>
            {form.companies.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-[#f7f9fb] border border-[#c3c6d5] rounded">
                {form.companies.map((company, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#003c90] rounded-full text-[12px] font-semibold text-[#003c90]">
                    {company}
                    <button
                      type="button"
                      onClick={() => removeCompany(company)}
                      className="ml-1 text-red-600 hover:text-red-700"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {form.companies.length === 0 && (
              <p className="text-[11px] text-[#737784] italic">No companies added yet. Add companies that this supplier provides.</p>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-3 border-t border-[#c3c6d5]">
            <Btn type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={submitting}>{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}<span className="material-symbols-outlined text-[16px]">save</span>{editingId ? 'Save Changes' : 'Add Supplier'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
