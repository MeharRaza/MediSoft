import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Table, fmt } from '../../components/ui'

export default function PurchaseReturn() {
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [returnItems, setReturnItems] = useState([])
  const [returns, setReturns] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => { api.purchase.getReturns().then(d => setReturns(Array.isArray(d) ? d : [])) }, [])

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const t = setTimeout(() => api.purchase.getPurchases({ search }).then(d => setSearchResults(Array.isArray(d) ? d.slice(0,10) : [])), 300)
    return () => clearTimeout(t)
  }, [search])

  const selectPurchase = async (p) => {
    setSearchResults([]); setSearch(p.invoice_no)
    const full = await api.purchase.getPurchaseById(p.id)
    const purchase = full || p
    setSelected(purchase)
    setReturnItems((purchase.items||[]).map(i => ({ ...i, return_qty: 0, max_qty: Number(i.qty)||0 })))
  }

  const updateItem = (idx, val) => {
    const updated = [...returnItems]; updated[idx].return_qty = Math.min(parseFloat(val)||0, updated[idx].max_qty); setReturnItems(updated)
  }

  const totalReturn = returnItems.reduce((s, i) => s + (parseFloat(i.return_qty)||0) * (i.purchase_price||0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const items = returnItems.filter(i => parseFloat(i.return_qty) > 0)
    if (!selected) return setMsg({ type: 'error', text: 'Select a purchase first.' })
    if (!items.length) return setMsg({ type: 'error', text: 'Enter return qty.' })
    setSubmitting(true); setMsg(null)
    try {
      await api.purchase.createReturn({ purchase_id: selected.id, supplier_id: selected.supplier_id, total: totalReturn, items: items.map(i => ({ product_id: i.product_id, batch_id: i.batch_id||null, qty: parseFloat(i.return_qty), price: i.purchase_price, total: parseFloat(i.return_qty)*i.purchase_price })) })
      setMsg({ type: 'success', text: 'Return processed.' }); setSelected(null); setReturnItems([]); setSearch('')
      api.purchase.getReturns().then(d => setReturns(Array.isArray(d) ? d : []))
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  const returnsCols = [
    { key: 'id',            label: 'Return #', render: v => <span className="font-mono text-[#003c90] font-bold text-[12px]">PRet-{v}</span> },
    { key: 'supplier_name', label: 'Supplier',  render: v => <span className="text-[12px]">{v||'—'}</span> },
    { key: 'total',         label: 'Amount', right: true, render: v => <span className="font-mono font-bold text-red-600 text-[12px]">PKR {fmt(v)}</span> },
    { key: 'created_at',    label: 'Date',   render: v => <span className="text-[11px] text-[#737784]">{v ? new Date(v).toLocaleDateString() : '-'}</span> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Purchase Return" subtitle="Return items to supplier" />
      <div className="p-5 space-y-5 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}
        <Card>
          <div className="px-5 py-4 border-b border-[#c3c6d5]"><h3 className="text-[15px] font-bold text-[#003c90]">New Purchase Return</h3></div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Search Purchase Invoice</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737784] text-[16px]">search</span>
                  <input type="text" value={search} onChange={e => { setSearch(e.target.value); setSelected(null) }} placeholder="Invoice# or supplier..." className="w-full pl-9 pr-3 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[13px] focus:border-[#003c90]" />
                  {searchResults.length > 0 && <div className="absolute top-full left-0 right-0 bg-white border border-[#c3c6d5] rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto">
                    {searchResults.map(p => <button key={p.id} onClick={() => selectPurchase(p)} className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-[#f2f4f6] border-b border-[#eceef0] last:border-0">
                      <div><p className="text-[12px] font-bold text-[#003c90]">{p.invoice_no}</p><p className="text-[11px] text-[#737784]">{p.supplier_name||'—'}</p></div>
                      <span className="text-[12px] font-mono font-bold">PKR {fmt(p.grand_total)}</span>
                    </button>)}
                  </div>}
                </div>
              </div>
              {selected && <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg"><p className="text-[12px] font-bold text-[#003c90]">{selected.invoice_no}</p><p className="text-[11px] text-[#737784]">Supplier: {selected.supplier_name||'—'}</p><p className="text-[11px] text-[#737784]">Total: PKR {fmt(selected.grand_total)}</p></div>}
            </div>
            {selected && returnItems.length > 0 && <form onSubmit={handleSubmit}>
              <div className="border border-[#c3c6d5] rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-[#f2f4f6] border-b border-[#c3c6d5]">{['Product','Batch','Orig Qty','Purch Price','Return Qty','Return Amt'].map(h => <th key={h} className={`px-3 py-2.5 text-[11px] font-bold text-[#434653] uppercase tracking-wider ${['Orig Qty','Purch Price','Return Qty','Return Amt'].includes(h)?'text-right':''}`}>{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-[#eceef0]">
                    {returnItems.map((item, idx) => <tr key={idx} className="hover:bg-[#f7f9fb]">
                      <td className="px-3 py-2 text-[12px] font-semibold">{item.product_name}</td>
                      <td className="px-3 py-2 text-[12px] font-mono">{item.batch_no||'—'}</td>
                      <td className="px-3 py-2 text-right text-[12px] font-mono">{item.max_qty}</td>
                      <td className="px-3 py-2 text-right text-[12px] font-mono">{fmt(item.purchase_price)}</td>
                      <td className="px-3 py-2 text-right"><input type="number" value={item.return_qty} min="0" max={item.max_qty} onChange={e => updateItem(idx, e.target.value)} className="w-20 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90]" /></td>
                      <td className="px-3 py-2 text-right text-[12px] font-mono font-bold text-red-600">{(parseFloat(item.return_qty)||0) > 0 ? `PKR ${fmt((parseFloat(item.return_qty)||0)*item.purchase_price)}` : '-'}</td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-[11px] font-semibold text-[#737784]">Total Return Amount</p><p className="text-[20px] font-bold text-red-700 font-mono">PKR {fmt(totalReturn)}</p></div>
                <Btn type="submit" variant="danger" size="lg" disabled={submitting || totalReturn === 0}>{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}<span className="material-symbols-outlined text-[18px]">keyboard_return</span>Process Return</Btn>
              </div>
            </form>}
            {!selected && <div className="py-10 text-center"><span className="material-symbols-outlined text-[48px] text-[#c3c6d5] block mb-2">search</span><p className="text-[13px] text-[#737784]">Search and select a purchase invoice to begin</p></div>}
          </div>
        </Card>
        <Card><div className="px-5 py-3 border-b border-[#c3c6d5]"><h3 className="text-[15px] font-bold text-[#003c90]">Returns History</h3></div><Table columns={returnsCols} data={returns} emptyMsg="No returns yet" /></Card>
      </div>
    </div>
  )
}
