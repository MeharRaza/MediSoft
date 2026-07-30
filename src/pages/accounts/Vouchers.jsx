import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Select, Table, SearchInput, fmt, today } from '../../components/ui'

const TYPES = [{ value: 'cash_receipt', label: 'Cash Receipt' }, { value: 'cash_payment', label: 'Cash Payment' }, { value: 'bank_receipt', label: 'Bank Receipt' }, { value: 'bank_payment', label: 'Bank Payment' }, { value: 'journal', label: 'Journal Voucher' }]
const emptyEntry = () => ({ account_id: '', debit: '', credit: '', description: '' })

export default function Vouchers() {
  const [vouchers, setVouchers]   = useState([])
  const [accounts, setAccounts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState({ type: 'cash_receipt', date: today(), description: '' })
  const [entries, setEntries]     = useState([emptyEntry(), emptyEntry()])
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg]             = useState(null)
  const [filterType, setFilterType] = useState('')
  const [search, setSearch]       = useState('')

  useEffect(() => {
    api.accounts.getAccounts().then(a => setAccounts(Array.isArray(a) ? a : []))
    fetchVouchers()
  }, [])

  const fetchVouchers = async () => {
    setLoading(true)
    try { const d = await api.accounts.getVouchers({ type: filterType||undefined, search: search||undefined }); setVouchers(Array.isArray(d) ? d : []) }
    catch (e) { setMsg({ type: 'error', text: e.message }) }
    finally { setLoading(false) }
  }

  const updateEntry = (idx, field, val) => { const e = [...entries]; e[idx][field] = val; setEntries(e) }
  const addEntry    = () => setEntries([...entries, emptyEntry()])
  const removeEntry = (idx) => { if (entries.length > 2) setEntries(entries.filter((_, i) => i !== idx)) }

  const totalDebit  = entries.reduce((s, e) => s + (parseFloat(e.debit)||0), 0)
  const totalCredit = entries.reduce((s, e) => s + (parseFloat(e.credit)||0), 0)
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01

  const handleSave = async () => {
    if (!form.type || !form.date) return setMsg({ type: 'error', text: 'Fill all required fields.' })
    const validEntries = entries.filter(e => e.account_id && ((parseFloat(e.debit)||0) + (parseFloat(e.credit)||0)) > 0)
    if (validEntries.length < 2) return setMsg({ type: 'error', text: 'Add at least 2 entries.' })
    if (!isBalanced) return setMsg({ type: 'error', text: 'Debit and Credit must be equal.' })
    setSubmitting(true); setMsg(null)
    try {
      await api.accounts.createVoucher({ type: form.type, date: form.date, description: form.description, total: totalDebit, entries: validEntries.map(e => ({ account_id: parseInt(e.account_id), debit: parseFloat(e.debit)||0, credit: parseFloat(e.credit)||0, description: e.description })) })
      setMsg({ type: 'success', text: 'Voucher saved.' })
      setForm({ type: 'cash_receipt', date: today(), description: '' }); setEntries([emptyEntry(), emptyEntry()]); fetchVouchers()
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  const acctOpts = [{ value: '', label: 'Select Account' }, ...accounts.map(a => ({ value: String(a.id), label: `${a.code} - ${a.name}` }))]
  const typeOpts = [{ value: '', label: 'All Types' }, ...TYPES]

  const cols = [
    { key: 'voucher_no',  label: 'Voucher #', mono: true, render: v => <span className="font-mono font-semibold text-[#003c90] text-[12px]">{v}</span> },
    { key: 'type',        label: 'Type',       render: v => <span className="text-[12px]">{TYPES.find(t => t.value === v)?.label || v}</span> },
    { key: 'date',        label: 'Date',       render: v => <span className="text-[11px] text-[#737784]">{v ? new Date(v).toLocaleDateString() : '-'}</span> },
    { key: 'description', label: 'Description', render: v => <span className="text-[12px]">{v||'—'}</span> },
    { key: 'total',       label: 'Amount', right: true, render: v => <span className="font-mono font-bold text-[12px]">PKR {fmt(v)}</span> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Vouchers" subtitle="Create and manage accounting vouchers" />
      <div className="p-5 space-y-5 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}

        <Card className="p-5">
          <h3 className="text-[15px] font-bold text-[#003c90] mb-4">Create Voucher</h3>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <Select label="Voucher Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} options={TYPES} />
            <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes..." />
          </div>

          {/* Entries Table */}
          <div className="border border-[#c3c6d5] rounded-lg overflow-hidden mb-4">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-[#f2f4f6] border-b border-[#c3c6d5]">{['Account','Debit','Credit','Description',''].map(h => <th key={h} className={`px-3 py-2.5 text-[11px] font-bold text-[#434653] uppercase tracking-wider ${['Debit','Credit'].includes(h)?'text-right':''}`}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#eceef0]">
                {entries.map((entry, idx) => <tr key={idx} className="hover:bg-[#f7f9fb] group">
                  <td className="px-3 py-2 w-52"><select value={entry.account_id} onChange={e => updateEntry(idx,'account_id',e.target.value)} className="w-full px-2 py-1 border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90] bg-transparent"><option value="">Select Account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></td>
                  <td className="px-3 py-2 text-right"><input type="number" min="0" step="0.01" value={entry.debit} onChange={e => updateEntry(idx,'debit',e.target.value)} placeholder="0.00" className="w-28 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] font-mono focus:border-[#003c90]" /></td>
                  <td className="px-3 py-2 text-right"><input type="number" min="0" step="0.01" value={entry.credit} onChange={e => updateEntry(idx,'credit',e.target.value)} placeholder="0.00" className="w-28 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] font-mono focus:border-[#003c90]" /></td>
                  <td className="px-3 py-2"><input type="text" value={entry.description} onChange={e => updateEntry(idx,'description',e.target.value)} placeholder="Narration..." className="w-full px-2 py-1 border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90]" /></td>
                  <td className="px-3 py-2"><button type="button" onClick={() => removeEntry(idx)} className="opacity-0 group-hover:opacity-100 p-1 text-[#737784] hover:text-[#ba1a1a]"><span className="material-symbols-outlined text-[18px]">delete</span></button></td>
                </tr>)}
                <tr className="bg-[#f7f9fb] border-t-2 border-[#c3c6d5]">
                  <td className="px-3 py-2 text-[11px] font-bold text-[#434653] uppercase">Totals</td>
                  <td className="px-3 py-2 text-right"><span className="font-mono font-bold text-[13px] text-green-700">PKR {fmt(totalDebit)}</span></td>
                  <td className="px-3 py-2 text-right"><span className="font-mono font-bold text-[13px] text-red-700">PKR {fmt(totalCredit)}</span></td>
                  <td colSpan={2} className="px-3 py-2">{isBalanced ? <span className="text-[11px] text-green-600 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span>Balanced</span> : <span className="text-[11px] text-[#ba1a1a] font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span>Diff: {fmt(Math.abs(totalDebit-totalCredit))}</span>}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between">
            <Btn variant="outline" size="sm" onClick={addEntry}><span className="material-symbols-outlined text-[14px]">add</span>Add Entry</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={submitting || !isBalanced}>{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}<span className="material-symbols-outlined text-[16px]">save</span>Save Voucher</Btn>
          </div>
        </Card>

        <Card>
          <div className="px-5 py-3 border-b border-[#c3c6d5] flex flex-wrap items-center gap-3">
            <h3 className="text-[15px] font-bold text-[#003c90]">Voucher History</h3>
            <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-48 ml-auto" />
            <Select value={filterType} onChange={e => setFilterType(e.target.value)} options={typeOpts} className="w-40" />
            <Btn variant="primary" size="sm" onClick={fetchVouchers}><span className="material-symbols-outlined text-[14px]">filter_list</span>Apply</Btn>
          </div>
          {loading ? <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : <Table columns={cols} data={vouchers} emptyMsg="No vouchers found" />}
        </Card>
      </div>
    </div>
  )
}
