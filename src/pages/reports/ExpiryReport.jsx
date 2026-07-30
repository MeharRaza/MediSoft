import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Table, fmt } from '../../components/ui'

export default function ExpiryReport() {
  const [data, setData]   = useState({ expired: [], expiring30: [], expiring90: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('expired')

  useEffect(() => { api.reports.getExpiryReport().then(d => { setData(d || { expired: [], expiring30: [], expiring90: [] }); setLoading(false) }) }, [])

  const cols = [
    { key: 'product_name', label: 'Product', render: v => <span className="text-[12px] font-semibold">{v}</span> },
    { key: 'batch_no',     label: 'Batch #', mono: true, render: v => <span className="text-[12px] font-mono">{v||'—'}</span> },
    { key: 'expiry_date',  label: 'Expiry Date', render: v => {
      if (!v) return '-'
      const days = Math.floor((new Date(v) - new Date()) / 86400000)
      return <span className={`text-[12px] font-mono ${days < 0 ? 'text-[#ba1a1a] font-bold' : days < 30 ? 'text-amber-600 font-bold' : 'text-yellow-600'}`}>{v} {days < 0 ? `(Expired ${Math.abs(days)}d ago)` : `(${days}d left)`}</span>
    }},
    { key: 'qty',  label: 'Qty', right: true, render: v => <span className="font-mono font-bold text-[12px] text-[#ba1a1a]">{fmt(v)}</span> },
  ]

  const tabs = [
    { key: 'expired',    label: 'Expired',     count: data.expired.length,    color: 'bg-red-50 border-[#ba1a1a] text-[#ba1a1a]' },
    { key: 'expiring30', label: 'Within 30d',  count: data.expiring30.length, color: 'bg-amber-50 border-amber-500 text-amber-700' },
    { key: 'expiring90', label: 'Within 6mo',  count: data.expiring90.length, color: 'bg-yellow-50 border-yellow-500 text-yellow-700' },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Expiry Report" subtitle="Products expiring or already expired" />
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 border-l-4 border-[#ba1a1a]"><p className="text-[11px] font-semibold text-[#737784] uppercase">Expired</p><p className="text-[26px] font-bold text-[#ba1a1a]">{data.expired.length}</p><p className="text-[11px] text-[#737784]">Qty: {fmt(data.expired.reduce((s,i)=>s+i.qty,0))}</p></Card>
          <Card className="p-4 border-l-4 border-amber-500"><p className="text-[11px] font-semibold text-[#737784] uppercase">Expiring (30d)</p><p className="text-[26px] font-bold text-amber-700">{data.expiring30.length}</p><p className="text-[11px] text-[#737784]">Qty: {fmt(data.expiring30.reduce((s,i)=>s+i.qty,0))}</p></Card>
          <Card className="p-4 border-l-4 border-yellow-500"><p className="text-[11px] font-semibold text-[#737784] uppercase">Expiring (6mo)</p><p className="text-[26px] font-bold text-yellow-700">{data.expiring90.length}</p><p className="text-[11px] text-[#737784]">Qty: {fmt(data.expiring90.reduce((s,i)=>s+i.qty,0))}</p></Card>
        </div>
        <div className="flex gap-2">{tabs.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-lg border text-[12px] font-bold transition-all ${tab === t.key ? t.color : 'bg-white border-[#c3c6d5] text-[#434653]'}`}>{t.label} ({t.count})</button>)}</div>
        <Card>{loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : <Table columns={cols} data={data[tab]||[]} emptyMsg="No items in this category" />}</Card>
      </div>
    </div>
  )
}
