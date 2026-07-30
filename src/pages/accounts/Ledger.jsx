import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Select, fmt, today } from '../../components/ui'

function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }

export default function Ledger() {
  const [entries, setEntries] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading]   = useState(false)
  const [accountId, setAccountId] = useState('')
  const [fromDate, setFromDate]   = useState(monthStart())
  const [toDate, setToDate]       = useState(today())

  useEffect(() => { api.accounts.getAccounts().then(a => setAccounts(Array.isArray(a)?a:[])) }, [])

  const fetchLedger = async () => {
    setLoading(true)
    try { const d = await api.accounts.getLedger({ account_id: accountId||undefined, from_date: fromDate, to_date: toDate }); setEntries(Array.isArray(d)?d:[]) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // Calculate running balance
  let balance = 0
  const rows = entries.map(e => {
    balance += (parseFloat(e.debit)||0) - (parseFloat(e.credit)||0)
    return { ...e, running_balance: balance }
  })

  const totalDebit  = entries.reduce((s, e) => s + (parseFloat(e.debit)||0), 0)
  const totalCredit = entries.reduce((s, e) => s + (parseFloat(e.credit)||0), 0)
  const acctOpts    = [{ value: '', label: 'All Accounts' }, ...accounts.map(a => ({ value: String(a.id), label: `${a.code} - ${a.name}` }))]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Ledger" subtitle="Account transaction history and running balance" />
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        <Card className="p-4"><div className="flex flex-wrap items-end gap-3">
          <Select label="Account" value={accountId} onChange={e => setAccountId(e.target.value)} options={acctOpts} className="w-64" />
          <Input label="From Date" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
          <Input label="To Date"   type="date" value={toDate}   onChange={e => setToDate(e.target.value)}   className="w-40" />
          <Btn variant="primary" onClick={fetchLedger} className="mt-auto"><span className="material-symbols-outlined text-[16px]">filter_list</span>Apply</Btn>
        </div></Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-[#f2f4f6] border-b border-[#c3c6d5]">
                {['Date','Voucher #','Account','Description','Debit','Credit','Balance'].map(h => <th key={h} className={`px-4 py-2.5 text-[11px] font-bold text-[#434653] uppercase tracking-wider ${['Debit','Credit','Balance'].includes(h)?'text-right':''}`}>{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-[#eceef0]">
                {loading ? <tr><td colSpan={7} className="px-4 py-10 text-center"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin mx-auto" /></td></tr>
                  : rows.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-[13px] text-[#737784]">Select an account and apply filters to view ledger</td></tr>
                  : rows.map((e, i) => <tr key={i} className="hover:bg-[#f7f9fb] transition-colors">
                    <td className="px-4 py-2 text-[11px] text-[#737784]">{e.date ? new Date(e.date).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-2 text-[12px] font-mono font-semibold text-[#003c90]">{e.voucher_no}</td>
                    <td className="px-4 py-2 text-[12px]">{e.account_name}</td>
                    <td className="px-4 py-2 text-[12px] text-[#434653]">{e.description||e.voucher_desc||'—'}</td>
                    <td className="px-4 py-2 text-right text-[12px] font-mono text-green-700">{e.debit > 0 ? fmt(e.debit) : '-'}</td>
                    <td className="px-4 py-2 text-right text-[12px] font-mono text-red-700">{e.credit > 0 ? fmt(e.credit) : '-'}</td>
                    <td className={`px-4 py-2 text-right text-[12px] font-mono font-bold ${e.running_balance >= 0 ? 'text-green-700' : 'text-[#ba1a1a]'}`}>{fmt(Math.abs(e.running_balance))} {e.running_balance >= 0 ? 'Dr' : 'Cr'}</td>
                  </tr>)}
                {rows.length > 0 && <tr className="bg-[#f7f9fb] border-t-2 border-[#c3c6d5] font-bold">
                  <td colSpan={4} className="px-4 py-2.5 text-[12px] font-bold text-[#434653]">TOTALS</td>
                  <td className="px-4 py-2.5 text-right text-[13px] font-mono font-bold text-green-700">PKR {fmt(totalDebit)}</td>
                  <td className="px-4 py-2.5 text-right text-[13px] font-mono font-bold text-red-700">PKR {fmt(totalCredit)}</td>
                  <td className="px-4 py-2.5 text-right text-[13px] font-mono font-bold text-[#003c90]">{fmt(Math.abs(totalDebit - totalCredit))} {totalDebit >= totalCredit ? 'Dr' : 'Cr'}</td>
                </tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
