import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Badge, Table, fmt } from '../../components/ui'

export default function Payroll() {
  const [payroll, setPayroll] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth]     = useState(new Date().toISOString().slice(0, 7))
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg]         = useState(null)

  useEffect(() => { fetchPayroll() }, [month])

  const fetchPayroll = async () => {
    setLoading(true)
    try { const d = await api.hrm.getPayroll(month); setPayroll(Array.isArray(d)?d:[]) }
    catch (e) { setMsg({ type: 'error', text: e.message }) }
    finally { setLoading(false) }
  }

  const generatePayroll = async () => {
    setGenerating(true); setMsg(null)
    try {
      const result = await api.hrm.generatePayroll(month)
      setMsg({ type: 'success', text: `Payroll generated for ${result.count} employees.` })
      fetchPayroll()
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setGenerating(false) }
  }

  const totalPayable = payroll.reduce((s, p) => s + (Number(p.net_salary)||0), 0)
  const paidCount    = payroll.filter(p => p.status === 'paid').length

  const cols = [
    { key: 'emp_code',    label: 'Code',      mono: true, render: v => <span className="text-[11px] font-mono text-[#737784]">{v}</span> },
    { key: 'full_name',   label: 'Employee',   render: v => <span className="text-[13px] font-semibold">{v}</span> },
    { key: 'designation', label: 'Role',       render: v => <span className="text-[12px]">{v||'—'}</span> },
    { key: 'basic_salary',label: 'Basic',      right: true, render: v => <span className="font-mono text-[12px]">PKR {fmt(v)}</span> },
    { key: 'allowances',  label: 'Allowances', right: true, render: v => <span className="font-mono text-[12px] text-green-700">+PKR {fmt(v)}</span> },
    { key: 'deductions',  label: 'Deductions', right: true, render: v => <span className="font-mono text-[12px] text-[#ba1a1a]">-PKR {fmt(v)}</span> },
    { key: 'net_salary',  label: 'Net Salary', right: true, render: v => <span className="font-mono font-bold text-[13px] text-[#003c90]">PKR {fmt(v)}</span> },
    { key: 'status',      label: 'Status',     render: v => v === 'paid' ? <Badge label="PAID" type="success" /> : <Badge label="PENDING" type="warning" /> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Payroll" subtitle="Monthly salary management" actions={
        <div className="flex items-center gap-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-1.5 border border-[#c3c6d5] rounded text-[13px] focus:border-[#003c90]" />
          <Btn variant="secondary" onClick={generatePayroll} disabled={generating}>{generating && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}<span className="material-symbols-outlined text-[16px]">calculate</span>Generate Payroll</Btn>
        </div>
      } />
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-[#003c90]">group</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Employees</p><p className="text-[22px] font-bold text-[#003c90]">{payroll.length}</p></div></Card>
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-teal-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-teal-600">payments</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Payable</p><p className="text-[22px] font-bold text-teal-700">PKR {fmt(totalPayable)}</p></div></Card>
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-green-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-green-600">check_circle</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Paid</p><p className="text-[22px] font-bold text-green-700">{paidCount} / {payroll.length}</p></div></Card>
        </div>
        <Card>
          {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div>
            : payroll.length === 0 ? <div className="py-16 text-center"><span className="material-symbols-outlined text-[48px] text-[#c3c6d5] block mb-2">payments</span><p className="text-[13px] text-[#737784]">No payroll for {month}. Click "Generate Payroll" to create.</p></div>
            : <Table columns={cols} data={payroll} emptyMsg="No payroll data" />}
        </Card>
      </div>
    </div>
  )
}
