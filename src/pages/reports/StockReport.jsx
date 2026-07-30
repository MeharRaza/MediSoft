import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Select, Table, SearchInput, fmt } from '../../components/ui'

export default function StockReport() {
  const [data, setData]         = useState({ products: [], totalValue: 0 })
  const [categories, setCategories] = useState([])
  const [loading, setLoading]   = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [search, setSearch]     = useState('')

  useEffect(() => {
    api.inventory.getCategories().then(c => setCategories(Array.isArray(c)?c:[]))
    fetchReport()
  }, [])

  const fetchReport = async () => {
    setLoading(true)
    try { const d = await api.reports.getStockReport({ category_id: categoryId||undefined }); setData(d || { products: [], totalValue: 0 }) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtered = data.products.filter(p => !search || (p.name||'').toLowerCase().includes(search.toLowerCase()))
  const catOpts  = [{ value: '', label: 'All Categories' }, ...categories.map(c => ({ value: String(c.id), label: c.name }))]

  const cols = [
    { key: 'name',         label: 'Product',    render: v => <span className="text-[12px] font-semibold text-[#003c90]">{v}</span> },
    { key: 'category_name',label: 'Category',   render: v => <span className="px-2 py-0.5 bg-[#eceef0] rounded text-[10px] font-bold">{v||'—'}</span> },
    { key: 'stock',        label: 'Stock Qty',  right: true, render: (v, row) => <span className={`font-mono font-bold text-[12px] ${v <= row.alert_qty ? 'text-[#ba1a1a]' : 'text-[#006a6a]'}`}>{fmt(v)}</span> },
    { key: 'alert_qty',    label: 'Alert Qty',  right: true, render: v => <span className="font-mono text-[12px] text-amber-600">{fmt(v)}</span> },
    { key: 'sale_price',   label: 'Sale Price', right: true, render: v => <span className="font-mono text-[12px]">PKR {fmt(v)}</span> },
    { key: 'trade_price',  label: 'Trade Price',right: true, render: v => <span className="font-mono text-[12px]">PKR {fmt(v)}</span> },
    { key: 'stock_value',  label: 'Stock Value',right: true, render: v => <span className="font-mono font-bold text-[12px] text-[#003c90]">PKR {fmt(v)}</span> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Stock Report" subtitle="Current inventory valuation and stock levels" actions={<Btn variant="secondary"><span className="material-symbols-outlined text-[16px]">download</span>Export</Btn>} />
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        <Card className="p-4"><div className="flex flex-wrap items-end gap-3">
          <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product..." className="w-56" />
          <Select label="Category" value={categoryId} onChange={e => setCategoryId(e.target.value)} options={catOpts} className="w-40" />
          <Btn variant="primary" onClick={fetchReport} className="mt-auto"><span className="material-symbols-outlined text-[16px]">filter_list</span>Apply</Btn>
        </div></Card>

        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 border-l-4 border-[#003c90]"><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Products</p><p className="text-[26px] font-bold text-[#003c90]">{filtered.length}</p></Card>
          <Card className="p-4 border-l-4 border-red-500"><p className="text-[11px] font-semibold text-[#737784] uppercase">Low Stock Items</p><p className="text-[26px] font-bold text-[#ba1a1a]">{filtered.filter(p => p.stock <= p.alert_qty).length}</p></Card>
          <Card className="p-4 border-l-4 border-green-500"><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Stock Value</p><p className="text-[22px] font-bold text-green-700">PKR {fmt(filtered.reduce((s,p)=>s+(p.stock_value||0),0))}</p></Card>
        </div>

        <Card>{loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : <Table columns={cols} data={filtered} emptyMsg="No products found" />}</Card>
      </div>
    </div>
  )
}
