import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Select, Badge, Table, SearchInput, fmt, today } from '../../components/ui'

const emptyItem = () => ({ product_id: null, product_name: '', qty: 1, sale_price: 0, discount_percent: 0, total: 0 })

export default function Quotations() {
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading]       = useState(true)
  const [customers, setCustomers]   = useState([])
  const [form, setForm]             = useState({ customer_id: '', notes: '' })
  const [items, setItems]           = useState([emptyItem()])
  const [productSearch, setProductSearch] = useState({})
  const [productResults, setProductResults] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg]               = useState(null)
  const [search, setSearch]         = useState('')

  useEffect(() => { fetchQuotations(); api.sales.getCustomers().then(setCustomers) }, [])

  const fetchQuotations = async () => {
    setLoading(true)
    try { const d = await api.sales.getQuotations(); setQuotations(Array.isArray(d) ? d : []) }
    catch (e) { setMsg({ type: 'error', text: e.message }) }
    finally { setLoading(false) }
  }

  const handleProductSearch = (idx, val) => {
    setProductSearch(p => ({ ...p, [idx]: val }))
    if (!val.trim()) { setProductResults(p => ({ ...p, [idx]: [] })); return }
    setTimeout(() => api.inventory.searchProduct(val).then(r => setProductResults(p => ({ ...p, [idx]: r || [] }))), 250)
  }

  const selectProduct = (idx, p) => {
    const updated = [...items]
    updated[idx] = { ...updated[idx], product_id: p.id, product_name: p.name, sale_price: p.batch_sale_price || p.sale_price || 0 }
    updated[idx].total = updated[idx].qty * updated[idx].sale_price * (1 - updated[idx].discount_percent / 100)
    setItems(updated)
    setProductSearch(ps => ({ ...ps, [idx]: p.name })); setProductResults(pr => ({ ...pr, [idx]: [] }))
  }

  const updateItem = (idx, field, val) => {
    const updated = [...items]; updated[idx][field] = val
    updated[idx].total = (parseFloat(updated[idx].qty)||0) * (parseFloat(updated[idx].sale_price)||0) * (1 - (parseFloat(updated[idx].discount_percent)||0)/100)
    setItems(updated)
  }

  const subTotal = items.reduce((s, i) => s + (parseFloat(i.total)||0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validItems = items.filter(i => i.product_id && parseFloat(i.qty) > 0)
    if (!validItems.length) return setMsg({ type: 'error', text: 'Add at least one product.' })
    setSubmitting(true); setMsg(null)
    try {
      await api.sales.createQuotation({ ...form, customer_id: form.customer_id || null, total: subTotal, items: validItems.map(i => ({ product_id: i.product_id, qty: parseFloat(i.qty), price: parseFloat(i.sale_price), discount_percent: parseFloat(i.discount_percent)||0, total: parseFloat(i.total) })) })
      setMsg({ type: 'success', text: 'Quotation created.' }); setForm({ customer_id: '', notes: '' }); setItems([emptyItem()]); setProductSearch({}); setProductResults({}); fetchQuotations()
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  const handleConvert = async (quote) => {
    if (!window.confirm(`Convert quotation to sale invoice?`)) return
    try { await api.sales.convertQuotation(quote.id); setMsg({ type: 'success', text: 'Converted successfully.' }); fetchQuotations() }
    catch (err) { setMsg({ type: 'error', text: err.message }) }
  }

  const statusBadge = s => s === 'pending' ? <Badge label="PENDING" type="warning" /> : s === 'converted' ? <Badge label="CONVERTED" type="success" /> : <Badge label="CANCELLED" type="error" />
  const customerOpts = [{ value: '', label: 'Walk-in Customer' }, ...customers.map(c => ({ value: String(c.id), label: c.name }))]
  const filtered = quotations.filter(q => !search || (q.quote_no||'').toLowerCase().includes(search.toLowerCase()) || (q.customer_name||'').toLowerCase().includes(search.toLowerCase()))

  const cols = [
    { key: 'quote_no',      label: 'Quote #', mono: true, render: v => <span className="font-mono font-semibold text-[#003c90] text-[12px]">{v||'-'}</span> },
    { key: 'customer_name', label: 'Customer', render: v => <span className="text-[12px]">{v||'Walk-in'}</span> },
    { key: 'total',         label: 'Total', right: true, render: v => <span className="font-mono font-bold text-[12px]">PKR {fmt(v)}</span> },
    { key: 'created_at',    label: 'Date', render: v => <span className="text-[11px] text-[#737784]">{v ? new Date(v).toLocaleDateString() : '-'}</span> },
    { key: 'status',        label: 'Status', render: v => statusBadge(v) },
    { key: 'id',            label: 'Actions', render: (_, row) => row.status === 'pending' && <Btn size="sm" variant="secondary" onClick={() => handleConvert(row)}><span className="material-symbols-outlined text-[14px]">receipt</span>Convert</Btn> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Quotations" subtitle="Create and manage sales quotations" />
      <div className="p-5 space-y-5 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}
        <Card>
          <div className="px-5 py-4 border-b border-[#c3c6d5]"><h3 className="text-[15px] font-bold text-[#003c90]">Create Quotation</h3></div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Select label="Customer" value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} options={customerOpts} />
              <Input label="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><p className="text-[11px] font-bold text-[#434653] uppercase tracking-wide">Items</p><Btn type="button" size="sm" variant="outline" onClick={() => setItems([...items, emptyItem()])}><span className="material-symbols-outlined text-[14px]">add</span>Add Row</Btn></div>
              <div className="border border-[#c3c6d5] rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-[#f2f4f6] border-b border-[#c3c6d5]">{['#','Product','Qty','Price','Disc%','Total',''].map(h => <th key={h} className={`px-3 py-2.5 text-[11px] font-bold text-[#434653] uppercase tracking-wider ${['Qty','Price','Disc%','Total'].includes(h)?'text-right':''}`}>{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-[#eceef0]">
                    {items.map((item, idx) => <tr key={idx} className="hover:bg-[#f7f9fb] group">
                      <td className="px-3 py-2 text-[12px] font-mono text-[#737784]">{idx+1}</td>
                      <td className="px-3 py-2 relative w-56">
                        <input type="text" value={productSearch[idx]!==undefined ? productSearch[idx] : (item.product_name||'')} onChange={e => handleProductSearch(idx, e.target.value)} placeholder="Search product..." className="w-full px-2 py-1 border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90]" />
                        {productResults[idx]?.length > 0 && <div className="absolute top-full left-3 right-0 bg-white border border-[#c3c6d5] rounded-lg shadow-xl z-40 max-h-48 overflow-y-auto">
                          {productResults[idx].map(p => <button type="button" key={p.id} onClick={() => selectProduct(idx, p)} className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#f2f4f6] border-b border-[#eceef0] last:border-0 text-[12px]"><span className="font-semibold">{p.name}</span><span className="text-[#003c90] font-mono ml-2">PKR {fmt(p.sale_price)}</span></button>)}
                        </div>}
                      </td>
                      <td className="px-3 py-2 text-right"><input type="number" min="0.01" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} className="w-16 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90]" /></td>
                      <td className="px-3 py-2 text-right"><input type="number" min="0" value={item.sale_price} onChange={e => updateItem(idx, 'sale_price', e.target.value)} className="w-24 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] font-mono focus:border-[#003c90]" /></td>
                      <td className="px-3 py-2 text-right"><input type="number" min="0" max="100" value={item.discount_percent} onChange={e => updateItem(idx, 'discount_percent', e.target.value)} className="w-14 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90]" /></td>
                      <td className="px-3 py-2 text-right text-[12px] font-bold font-mono text-[#003c90]">{fmt(item.total)}</td>
                      <td className="px-3 py-2"><button type="button" onClick={() => items.length > 1 && setItems(items.filter((_,i) => i!==idx))} className="opacity-0 group-hover:opacity-100 p-1 text-[#737784] hover:text-[#ba1a1a] transition-all"><span className="material-symbols-outlined text-[18px]">delete</span></button></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Btn type="submit" variant="primary" size="lg" disabled={submitting}>{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}<span className="material-symbols-outlined text-[18px]">save</span>Save Quotation</Btn>
              <div className="px-5 py-3 bg-[#003c90]/5 border border-[#003c90]/20 rounded-lg flex items-center gap-4"><span className="text-[13px] font-bold text-[#003c90]">Grand Total</span><span className="text-[22px] font-bold font-mono text-[#003c90]">PKR {fmt(subTotal)}</span></div>
            </div>
          </form>
        </Card>
        <Card>
          <div className="px-5 py-3 border-b border-[#c3c6d5] flex items-center justify-between"><h3 className="text-[15px] font-bold text-[#003c90]">All Quotations</h3><SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-52" /></div>
          {loading ? <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : <Table columns={cols} data={filtered} emptyMsg="No quotations found" />}
        </Card>
      </div>
    </div>
  )
}
