import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Select, Table, fmt } from '../../components/ui'

export default function Recovery() {
  const [customers, setCustomers]  = useState([])
  const [recoveries, setRecoveries] = useState([])
  const [form, setForm]            = useState({ customer_id: '', amount: '', payment_method: 'cash', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg]              = useState(null)

  useEffect(() => {
    api.sales.getCustomers().then(c => setCustomers(Array.isArray(c)?c:[]))
    api.accounts.getRecoveries().then(r => setRecoveries(Array.isArray(r)?r:[]))
  }, [])

  const selectedCustomer = customers.find(c => String(c.id) === String(form.customer_id))
  const customersWithBalance = customers.filter(c => Number(c.balance||0) > 0)
  const totalPending = customersWithBalance.reduce((s, c) => s + Number(c.balance||0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customer_id) return setMsg({ type: 'error', text: 'Select a customer.' })
    if (!form.amount || parseFloat(form.amount) <= 0) return setMsg({ type: 'error', text: 'Enter valid amount.' })
    setSubmitting(true); setMsg(null)
    try {
      await api.accounts.createRecovery({ customer_id: parseInt(form.customer_id), amount: parseFloat(form.amount), payment_method: form.payment_method, notes: form.notes })
      setMsg({ type: 'success', text: 'Recovery recorded.' })
      setForm({ customer_id: '', amount: '', payment_method: 'cash', notes: '' })
      api.sales.getCustomers().then(c => setCustomers(Array.isArray(c)?c:[]))
      api.accounts.getRecoveries().then(r => setRecoveries(Array.isArray(r)?r:[]))
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  const customerOpts = [{ value: '', label: 'Select Customer' }, ...customersWithBalance.map(c => ({ value: String(c.id), label: `${c.name} (Due: PKR ${fmt(c.balance)})` }))]
  const paymentOpts  = [{ value: 'cash', label: 'Cash' }, { value: 'bank', label: 'Bank Transfer' }, { value: 'cheque', label: 'Cheque' }]

  const recoveryCols = [
    { key: 'customer_name', label: 'Customer',   render: v => <span className="text-[12px] font-semibold">{v||'—'}</span> },
    { key: 'amount',        label: 'Recovered',  right: true, render: v => <span className="font-mono font-bold text-green-700 text-[12px]">PKR {fmt(v)}</span> },
    { key: 'payment_method',label: 'Method',     render: v => <span className="capitalize text-[12px]">{v}</span> },
    { key: 'created_at',    label: 'Date',        render: v => <span className="text-[11px] text-[#737784]">{v ? new Date(v).toLocaleDateString() : '-'}</span> },
    { key: 'notes',         label: 'Notes',       render: v => <span className="text-[12px]">{v||'—'}</span> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Customer Recovery" subtitle="Record payments received against outstanding balances" />
      <div className="p-5 space-y-5 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-amber-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-amber-600">group</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Customers with Balance</p><p className="text-[22px] font-bold text-amber-700">{customersWithBalance.length}</p></div></Card>
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-red-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">account_balance_wallet</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Pending Recovery</p><p className="text-[22px] font-bold text-[#ba1a1a]">PKR {fmt(totalPending)}</p></div></Card>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <Card className="p-5">
            <h3 className="text-[15px] font-bold text-[#003c90] mb-4">Record Recovery</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select label="Customer *" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))} options={customerOpts} />
              {selectedCustomer && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg"><p className="text-[12px] font-bold text-amber-700">{selectedCustomer.name}</p><p className="text-[11px] text-[#737784]">Outstanding Balance: <span className="font-bold text-[#ba1a1a]">PKR {fmt(selectedCustomer.balance)}</span></p></div>}
              <div><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Amount *</label><input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="Enter amount received..." className="w-full px-3 py-2 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[16px] font-bold text-right focus:border-[#003c90]" /></div>
              <Select label="Payment Method" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} options={paymentOpts} />
              <Input label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Cheque no., reference, etc." />
              <Btn type="submit" variant="primary" className="w-full justify-center py-3" disabled={submitting}>{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}<span className="material-symbols-outlined text-[18px]">currency_exchange</span>Record Recovery</Btn>
            </form>
          </Card>

          <Card className="p-4">
            <h3 className="text-[14px] font-bold text-[#003c90] mb-3">Customers with Outstanding Balance</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {customersWithBalance.length === 0 ? <p className="text-[12px] text-[#737784] text-center py-8">All balances clear</p> :
                customersWithBalance.map(c => <div key={c.id} className="flex items-center justify-between p-2.5 bg-[#f7f9fb] rounded-lg border border-[#c3c6d5]">
                  <div><p className="text-[12px] font-semibold">{c.name}</p><p className="text-[10px] text-[#737784]">{c.phone||'—'}</p></div>
                  <span className="text-[12px] font-bold font-mono text-[#ba1a1a]">PKR {fmt(c.balance)}</span>
                </div>)}
            </div>
          </Card>
        </div>

        <Card>
          <div className="px-5 py-3 border-b border-[#c3c6d5]"><h3 className="text-[15px] font-bold text-[#003c90]">Recovery History</h3></div>
          <Table columns={recoveryCols} data={recoveries} emptyMsg="No recoveries recorded yet" />
        </Card>
      </div>
    </div>
  )
}
