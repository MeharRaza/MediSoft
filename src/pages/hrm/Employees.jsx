import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Select, Table, Modal, SearchInput, fmt } from '../../components/ui'

const emptyForm = () => ({ full_name: '', designation: '', department: '', phone: '', email: '', address: '', join_date: '', basic_salary: '', branch_id: '1' })

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [branches, setBranches]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]           = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg]             = useState(null)

  useEffect(() => {
    api.hrm.getEmployees().then(e => { setEmployees(Array.isArray(e)?e:[]); setLoading(false) })
    api.settings.getBranches().then(b => setBranches(Array.isArray(b)?b:[]))
  }, [])

  const fetchEmployees = () => api.hrm.getEmployees().then(e => setEmployees(Array.isArray(e)?e:[]))
  const openAdd  = () => { setEditingId(null); setForm(emptyForm()); setModalOpen(true) }
  const openEdit = (e) => { setEditingId(e.id); setForm({ full_name: e.full_name||'', designation: e.designation||'', department: e.department||'', phone: e.phone||'', email: e.email||'', address: e.address||'', join_date: e.join_date||'', basic_salary: e.basic_salary||'', branch_id: String(e.branch_id||1) }); setModalOpen(true) }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!form.full_name.trim()) return
    setSubmitting(true); setMsg(null)
    const payload = { ...form, basic_salary: parseFloat(form.basic_salary)||0, branch_id: parseInt(form.branch_id)||1 }
    try {
      if (editingId) { await api.hrm.updateEmployee({ id: editingId, ...payload }); setMsg({ type: 'success', text: 'Employee updated.' }) }
      else { await api.hrm.createEmployee(payload); setMsg({ type: 'success', text: 'Employee added.' }) }
      setModalOpen(false); fetchEmployees()
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (e) => {
    if (!window.confirm(`Delete employee "${e.full_name}"?`)) return
    try { await api.hrm.deleteEmployee(e.id); setMsg({ type: 'success', text: 'Deleted.' }); fetchEmployees() }
    catch (err) { setMsg({ type: 'error', text: err.message }) }
  }

  const filtered = employees.filter(e => !search || (e.full_name||'').toLowerCase().includes(search.toLowerCase()) || (e.emp_code||'').includes(search))
  const totalSalary = employees.reduce((s, e) => s + (Number(e.basic_salary)||0), 0)
  const branchOpts = [{ value: '1', label: 'Main Branch' }, ...branches.map(b => ({ value: String(b.id), label: b.name }))]

  const cols = [
    { key: 'emp_code',      label: 'Code',        mono: true, render: v => <span className="font-mono text-[11px] text-[#737784]">{v}</span> },
    { key: 'full_name',     label: 'Name',         render: v => <span className="text-[13px] font-semibold">{v}</span> },
    { key: 'designation',   label: 'Designation',  render: v => <span className="text-[12px]">{v||'—'}</span> },
    { key: 'department',    label: 'Department',   render: v => <span className="text-[12px]">{v||'—'}</span> },
    { key: 'basic_salary',  label: 'Salary',       right: true, render: v => <span className="font-mono font-bold text-[12px]">PKR {fmt(v)}</span> },
    { key: 'branch_name',   label: 'Branch',       render: v => <span className="text-[12px]">{v||'—'}</span> },
    { key: 'id',            label: 'Actions',      render: (_, row) => <div className="flex gap-1.5"><Btn size="sm" variant="outline" onClick={() => openEdit(row)}><span className="material-symbols-outlined text-[14px]">edit</span></Btn><Btn size="sm" variant="danger" onClick={() => handleDelete(row)}><span className="material-symbols-outlined text-[14px]">delete</span></Btn></div> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Employees" subtitle="Manage pharmacy staff and HR records" actions={<Btn variant="primary" onClick={openAdd}><span className="material-symbols-outlined text-[16px]">person_add</span>Add Employee</Btn>} />
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-[#003c90]">badge</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Employees</p><p className="text-[22px] font-bold text-[#003c90]">{employees.length}</p></div></Card>
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-teal-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-teal-600">payments</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Monthly Salary Bill</p><p className="text-[22px] font-bold text-teal-700">PKR {fmt(totalSalary)}</p></div></Card>
        </div>
        <Card><div className="px-5 py-3 border-b border-[#c3c6d5] flex items-center justify-between"><SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or code..." className="w-64" /><Btn variant="outline" size="sm" onClick={fetchEmployees}><span className="material-symbols-outlined text-[14px]">refresh</span></Btn></div>
          {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : <Table columns={cols} data={filtered} emptyMsg="No employees found" />}
        </Card>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Employee' : 'Add Employee'} width="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required autoFocus />
            <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Designation" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="Pharmacist, Cashier..." />
            <Input label="Department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Sales, Accounts..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="Join Date" type="date" value={form.join_date} onChange={e => setForm(f => ({ ...f, join_date: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Basic Salary (PKR)" type="number" value={form.basic_salary} onChange={e => setForm(f => ({ ...f, basic_salary: e.target.value }))} placeholder="0" />
            <Select label="Branch" value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))} options={branchOpts} />
          </div>
          <Input label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-3 border-t border-[#c3c6d5]">
            <Btn type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={submitting}>{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}<span className="material-symbols-outlined text-[16px]">save</span>{editingId ? 'Update' : 'Add Employee'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
