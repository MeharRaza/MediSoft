import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Table, fmt, today } from '../../components/ui'

function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }

export default function PurchaseReport() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [fromDate, setFromDate] = useState(monthStart())
  const [toDate, setToDate]     = useState(today())

  useEffect(() => { fetchReport() }, [])

  const fetchReport = async () => {
    setLoading(true)
    try { const d = await api.reports.getPurchaseSummary({ from_date: fromDate, to_date: toDate }); setData(d) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const supplierCols = [
    { key: 'supplier_name', label: 'Supplier',   render: v => <span className="text-[12px] font-semibold">{v||'—'}</span> },
    { key: 'purchases',     label: 'Invoices',   right: true, render: v => <span className="font-mono text-[12px]">{v}</span> },
    { key: 'total',         label: 'Total Amt',  right: true, render: v => <span className="font-mono font-bold text-[12px] text-[#003c90]">PKR {fmt(v)}</span> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Purchase Report" subtitle="Purchase analysis by date and supplier" />
      <div className="p-5 space-y-5 flex-1 overflow-auto">
        <Card className="p-4"><div className="flex flex-wrap items-end gap-3">
          <Input label="From Date" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
          <Input label="To Date"   type="date" value={toDate}   onChange={e => setToDate(e.target.value)}   className="w-40" />
          <Btn variant="primary" onClick={fetchReport} className="mt-auto"><span className="material-symbols-outlined text-[16px]">filter_list</span>Apply</Btn>
        </div></Card>
        {loading ? <div className="flex items-center justify-center py-16"><div className="w-10 h-10 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : data && <>
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 border-l-4 border-teal-500"><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Purchases</p><p className="text-[26px] font-bold text-teal-700">{data.summary.total_purchases}</p></Card>
            <Card className="p-4 border-l-4 border-[#003c90]"><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Amount</p><p className="text-[26px] font-bold text-[#003c90]">PKR {fmt(data.summary.total_amount)}</p></Card>
            <Card className="p-4 border-l-4 border-amber-500"><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Discount</p><p className="text-[26px] font-bold text-amber-700">PKR {fmt(data.summary.total_discount)}</p></Card>
          </div>
          {data.bySupplier?.length > 0 && <Card><div className="px-5 py-3 border-b border-[#c3c6d5]"><h3 className="text-[15px] font-bold text-[#003c90]">By Supplier</h3></div><Table columns={supplierCols} data={data.bySupplier} emptyMsg="No data" /></Card>}
        </>}
      </div>
    </div>
  )
}
