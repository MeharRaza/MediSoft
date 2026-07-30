import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, fmt, today } from '../../components/ui'

function yearStart() { return `${new Date().getFullYear()}-01-01` }

export default function ProfitLoss() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [fromDate, setFromDate] = useState(yearStart())
  const [toDate, setToDate]     = useState(today())

  useEffect(() => { fetchReport() }, [])

  const fetchReport = async () => {
    setLoading(true)
    try { const d = await api.reports.getProfitLoss({ from_date: fromDate, to_date: toDate }); setData(d) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Profit & Loss Statement" subtitle="Financial performance analysis" actions={<Btn variant="secondary"><span className="material-symbols-outlined text-[16px]">print</span>Print</Btn>} />
      <div className="p-5 space-y-5 flex-1 overflow-auto">
        <Card className="p-4"><div className="flex flex-wrap items-end gap-3">
          <Input label="From Date" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
          <Input label="To Date"   type="date" value={toDate}   onChange={e => setToDate(e.target.value)}   className="w-40" />
          <Btn variant="primary" onClick={fetchReport} className="mt-auto"><span className="material-symbols-outlined text-[16px]">filter_list</span>Apply</Btn>
        </div></Card>

        {loading ? <div className="flex items-center justify-center py-16"><div className="w-10 h-10 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : data && (
          <div className="max-w-2xl mx-auto">
            <Card className="overflow-hidden">
              <div className="px-6 py-4 bg-[#003c90] text-white text-center">
                <h3 className="text-[18px] font-bold">Profit & Loss Statement</h3>
                <p className="text-[12px] text-white/70">{new Date(fromDate).toLocaleDateString()} — {new Date(toDate).toLocaleDateString()}</p>
              </div>
              <div className="p-6 space-y-4">
                {/* Revenue */}
                <PLRow label="Sales Revenue" value={data.revenue} bold color="text-green-700" />
                <PLRow label="Cost of Goods Sold" value={-data.cogs} color="text-[#ba1a1a]" />
                <div className="border-t-2 border-[#c3c6d5] pt-3">
                  <PLRow label="Gross Profit" value={data.grossProfit} bold color={data.grossProfit >= 0 ? 'text-green-700' : 'text-[#ba1a1a]'} />
                </div>

                {data.expenses?.length > 0 && <div>
                  <p className="text-[11px] font-bold text-[#434653] uppercase tracking-wide mb-2">Operating Expenses</p>
                  {data.expenses.map((e, i) => <PLRow key={i} label={e.name} value={-e.amount} indent />)}
                  <PLRow label="Total Expenses" value={-data.totalExpenses} bold color="text-[#ba1a1a]" />
                </div>}

                <div className={`p-5 rounded-xl border-2 ${data.netProfit >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[12px] font-bold text-[#434653] uppercase tracking-wider">NET {data.netProfit >= 0 ? 'PROFIT' : 'LOSS'}</p>
                      <p className={`text-[32px] font-bold ${data.netProfit >= 0 ? 'text-green-700' : 'text-[#ba1a1a]'}`}>PKR {fmt(Math.abs(data.netProfit))}</p>
                    </div>
                    <span className={`material-symbols-outlined text-[48px] ${data.netProfit >= 0 ? 'text-green-400' : 'text-red-300'}`}>{data.netProfit >= 0 ? 'trending_up' : 'trending_down'}</span>
                  </div>
                  {data.revenue > 0 && <p className="text-[12px] font-semibold text-[#737784] mt-2">Profit Margin: {((data.netProfit / data.revenue) * 100).toFixed(1)}%</p>}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

function PLRow({ label, value, bold, color = 'text-[#191c1e]', indent = false }) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${bold ? 'border-b border-[#c3c6d5]' : ''}`}>
      <span className={`text-[13px] ${bold ? 'font-bold text-[#191c1e]' : 'font-medium text-[#434653]'} ${indent ? 'pl-4' : ''}`}>{label}</span>
      <span className={`font-mono ${bold ? 'font-bold text-[14px]' : 'text-[13px]'} ${color}`}>PKR {fmt(Math.abs(value))}{value < 0 ? ' (Dr)' : ''}</span>
    </div>
  )
}
