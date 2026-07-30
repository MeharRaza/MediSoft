import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Table, fmt, today } from '../../components/ui'

function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }

export default function SalesReport() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [fromDate, setFromDate] = useState(monthStart())
  const [toDate, setToDate]     = useState(today())

  useEffect(() => { fetchReport() }, [])

  const fetchReport = async () => {
    setLoading(true)
    try { const d = await api.reports.getSalesSummary({ from_date: fromDate, to_date: toDate }); setData(d) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const maxDaily = Math.max(...(data?.daily?.map(d => d.total)||[1]), 1)

  const topProductCols = [
    { key: 'name',       label: 'Product',    render: v => <span className="text-[12px] font-semibold">{v}</span> },
    { key: 'qty_sold',   label: 'Qty Sold',   right: true, render: v => <span className="font-mono text-[12px]">{fmt(v)}</span> },
    { key: 'total_sales',label: 'Total Sales', right: true, render: v => <span className="font-mono font-bold text-[12px] text-[#003c90]">PKR {fmt(v)}</span> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Sales Report" subtitle="Detailed sales analysis and trends" actions={<Btn variant="secondary"><span className="material-symbols-outlined text-[16px]">download</span>Export</Btn>} />
      <div className="p-5 space-y-5 flex-1 overflow-auto">
        <Card className="p-4"><div className="flex flex-wrap items-end gap-3">
          <Input label="From Date" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
          <Input label="To Date"   type="date" value={toDate}   onChange={e => setToDate(e.target.value)}   className="w-40" />
          <Btn variant="primary" onClick={fetchReport} className="mt-auto"><span className="material-symbols-outlined text-[16px]">filter_list</span>Apply</Btn>
        </div></Card>

        {loading ? <div className="flex items-center justify-center py-16"><div className="w-10 h-10 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : data && <>
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 flex items-center gap-3 border-l-4 border-[#003c90]"><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Invoices</p><p className="text-[26px] font-bold text-[#003c90]">{data.summary.total_invoices}</p></div></Card>
            <Card className="p-4 flex items-center gap-3 border-l-4 border-green-500"><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Sales</p><p className="text-[26px] font-bold text-green-700">PKR {fmt(data.summary.total_sales)}</p></div></Card>
            <Card className="p-4 flex items-center gap-3 border-l-4 border-blue-500"><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Cash Sales</p><p className="text-[26px] font-bold text-blue-700">PKR {fmt(data.summary.cash_sales)}</p></div></Card>
            <Card className="p-4 flex items-center gap-3 border-l-4 border-amber-500"><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Credit Sales</p><p className="text-[26px] font-bold text-amber-700">PKR {fmt(data.summary.credit_sales)}</p></div></Card>
            <Card className="p-4 flex items-center gap-3 border-l-4 border-red-400"><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Discount</p><p className="text-[26px] font-bold text-red-600">PKR {fmt(data.summary.total_discount)}</p></div></Card>
            <Card className="p-4 flex items-center gap-3 border-l-4 border-teal-500"><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Tax</p><p className="text-[26px] font-bold text-teal-700">PKR {fmt(data.summary.total_tax)}</p></div></Card>
          </div>

          {data.daily?.length > 0 && <Card className="p-5">
            <h3 className="text-[15px] font-bold text-[#003c90] mb-4">Daily Sales</h3>
            <div className="flex items-end gap-2 h-32 mb-3">
              {data.daily.map((d, i) => <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-[#003c90]/20 hover:bg-[#003c90] rounded-t transition-colors" style={{ height: `${Math.max((d.total/maxDaily)*100, 4)}%` }} title={`PKR ${fmt(d.total)}`} />
              </div>)}
            </div>
            <div className="flex gap-2">
              {data.daily.map((d, i) => <div key={i} className="flex-1 text-center"><span className="text-[9px] text-[#737784]">{new Date(d.day).getDate()}</span></div>)}
            </div>
          </Card>}

          {data.topProducts?.length > 0 && <Card>
            <div className="px-5 py-3 border-b border-[#c3c6d5]"><h3 className="text-[15px] font-bold text-[#003c90]">Top 10 Products</h3></div>
            <Table columns={topProductCols} data={data.topProducts} emptyMsg="No data" />
          </Card>}
        </>}
      </div>
    </div>
  )
}
