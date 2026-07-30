import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Select, Table, Badge, fmt } from '../../components/ui'

const LEAVE_TYPES = [{ value: 'annual', label: 'Annual Leave' }, { value: 'sick', label: 'Sick Leave' }, { value: 'casual', label: 'Casual Leave' }, { value: 'unpaid', label: 'Unpaid Leave' }]
const emptyForm = () => ({ employee_id: '', type: 'annual', from_date: '', to_date: '', reason: '' })

export default function Leaves() {
  const [leaves, setLeaves]       = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg]             = useState(null)

  useEffect(() => {
    api.hrm.getEmployees().then(e => setEmployees(Array.isArray(e)?e:[]))
    fetchLeaves()
  }, [])

  const fetchLeaves = async () => {
    setLoading(true)
    try { const d = await api.hrm.getLeaves({}); setLeaves(Array.isArray(d)?d:[]) }
    catch (e) { setMsg({ type: 'error', text: e.message }) }
    finally { setLoading(false) }
  }

  const calcDays = (from, to) => {
    if (!from || !to) return 0
    return Math.max(Math.round((new Date(to) - new Date(from)) / 86400000) + 1, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.employee_id || !form.from_date || !form.to_date) return setMsg({ type: 'error', text: 'Fill all required fields.' })
    setSubmitting(true); setMsg(null)
    try {
      await api.hrm.createLeave({ ...form, employee_id: parseInt(form.employee_id), days: calcDays(form.from_date, form.to_date) })
      setMsg({ type: 'success', text: 'Leave request submitted.' })
      setForm(emptyForm()); fetchLeaves()
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  const updateLeave = async (id, status) => {
    try { await api.hrm.updateLeave({ id, status }); fetchLeaves() }
    catch (err) { setMsg({ type: 'error', text: err.message }) }
  }

  const statusBadge = s => s === 'pending' ? <Badge label="PENDING" type="warning" /> : s === 'approved' ? <Badge label="APPROVED" type="success" /> : <Badge label="REJECTED" type="error" />
  const empOpts = [{ value: '', label: 'Select Employee' }, ...employees.map(e => ({ value: String(e.id), label: `${e.emp_code} - ${e.full_name}` }))]

  const cols = [
    { key: 'full_name',  label: 'Employee',  render: v => <span className="text-[12px] font-semibold">{v}</span> },
    { key: 'type',       label: 'Type',      render: v => <span className="capitalize text-[12px]">{v}</span> },
    { key: 'from_date',  label: 'From',      render: v => <span className="text-[11px] font-mono">{v ? new Date(v).toLocaleDateString() : '-'}</span> },
    { key: 'to_date',    label: 'To',        render: v => <span className="text-[11px] font-mono">{v ? new Date(v).toLocaleDateString() : '-'}</span> },
    { key: 'days',       label: 'Days',      right: true, render: v => <span className="text-[12px] font-bold">{v}</span> },
    { key: 'reason',     label: 'Reason',    render: v => <span className="text-[12px]">{v||'—'}</span> },
    { key: 'status',     label: 'Status',    render: v => statusBadge(v) },
    { key: 'id',         label: 'Actions',   render: (_, row) => row.status === 'pending' && <div className="flex gap-1.5">
      <Btn size="sm" variant="primary" onClick={() => updateLeave(row.id, 'approved')}><span className="material-symbols-outlined text-[14px]">check</span>Approve</Btn>
      <Btn size="sm" variant="danger"  onClick={() => updateLeave(row.id, 'rejected')}><span className="material-symbols-outlined text-[14px]">close</span>Reject</Btn>
    </div> },
  ]

  const stats = { total: leaves.length, pending: leaves.filter(l=>l.status==='pending').length, approved: leaves.filter(l=>l.status==='approved').length }

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Leave Management" subtitle="Employee leave requests and approvals" />
      <div className="p-5 space-y-5 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-[#003c90]">event_note</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Requests</p><p className="text-[22px] font-bold text-[#003c90]">{stats.total}</p></div></Card>
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-amber-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-amber-600">pending</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Pending</p><p className="text-[22px] font-bold text-amber-700">{stats.pending}</p></div></Card>
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-green-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-green-600">check_circle</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Approved</p><p className="text-[22px] font-bold text-green-700">{stats.approved}</p></div></Card>
        </div>
        <Card className="p-5">
          <h3 className="text-[15px] font-bold text-[#003c90] mb-4">Apply for Leave</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
            <Select label="Employee *" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} options={empOpts} />
            <Select label="Leave Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} options={LEAVE_TYPES} />
            <div className="flex items-end gap-2">
              <Input label="From Date *" type="date" value={form.from_date} onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))} className="flex-1" />
              <Input label="To Date *"   type="date" value={form.to_date}   onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))} className="flex-1" />
              <div className="pb-0.5"><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase">Days</label><span className="px-3 py-1.5 bg-[#003c90] text-white rounded text-[13px] font-bold">{calcDays(form.from_date, form.to_date)}</span></div>
            </div>
            <div className="col-span-2"><Input label="Reason" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for leave..." /></div>
            <div className="flex items-end"><Btn type="submit" variant="primary" className="w-full justify-center" disabled={submitting}>{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}<span className="material-symbols-outlined text-[16px]">send</span>Submit Request</Btn></div>
          </form>
        </Card>
        <Card><div className="px-5 py-3 border-b border-[#c3c6d5]"><h3 className="text-[15px] font-bold text-[#003c90]">Leave Records</h3></div>
          {loading ? <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : <Table columns={cols} data={leaves} emptyMsg="No leave records found" />}
        </Card>
      </div>
    </div>
  )
}
