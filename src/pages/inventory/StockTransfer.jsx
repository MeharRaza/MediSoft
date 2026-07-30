import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Select, fmt } from '../../components/ui'

export default function StockTransfer() {
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [batches, setBatches] = useState([])
  const [branches, setBranches] = useState([])
  const [form, setForm] = useState({ batch_id: '', from_branch_id: '1', to_branch_id: '', qty: '' })
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => { api.settings.getBranches().then(b => setBranches(Array.isArray(b)?b:[])) }, [])

  useEffect(() => {
    if (!productSearch.trim()) { setProductResults([]); return }
    const t = setTimeout(() => api.inventory.searchProduct(productSearch).then(r => setProductResults(Array.isArray(r)?r:[])), 250)
    return () => clearTimeout(t)
  }, [productSearch])

  const selectProduct = async (p) => {
    setSelectedProduct(p); setProductSearch(p.name); setProductResults([])
    const b = await api.inventory.getBatches(p.id); setBatches(Array.isArray(b)?b:[])
    setForm(f => ({ ...f, batch_id: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.batch_id) return setMsg({ type: 'error', text: 'Select a batch.' })
    if (!form.to_branch_id) return setMsg({ type: 'error', text: 'Select destination branch.' })
    if (form.from_branch_id === form.to_branch_id) return setMsg({ type: 'error', text: 'From and To branches must be different.' })
    if (!form.qty || parseFloat(form.qty) <= 0) return setMsg({ type: 'error', text: 'Enter valid quantity.' })
    setSubmitting(true); setMsg(null)
    try {
      await api.inventory.transferStock({ from_batch_id: parseInt(form.batch_id), from_branch_id: parseInt(form.from_branch_id), to_branch_id: parseInt(form.to_branch_id), qty: parseFloat(form.qty) })
      setMsg({ type: 'success', text: `${form.qty} units transferred successfully.` })
      const b = await api.inventory.getBatches(selectedProduct.id); setBatches(Array.isArray(b)?b:[])
      setForm(f => ({ ...f, batch_id: '', qty: '' }))
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  const selectedBatch = batches.find(b => String(b.id) === String(form.batch_id))
  const branchOpts = [{ value: '', label: 'Select Branch' }, ...branches.map(b => ({ value: String(b.id), label: b.name }))]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Stock Transfer" subtitle="Transfer stock between branches" />
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}
        <div className="grid grid-cols-2 gap-5">
          <Card className="p-5">
            <h3 className="text-[14px] font-bold text-[#003c90] mb-4">Select Product & Batch</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737784] text-[18px]">search</span>
              <input type="text" value={productSearch} onChange={e => { setProductSearch(e.target.value); setSelectedProduct(null) }} placeholder="Search product..." className="w-full pl-10 pr-4 py-2 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[13px] focus:border-[#003c90]" />
              {productResults.length > 0 && <div className="absolute top-full left-0 right-0 bg-white border border-[#c3c6d5] rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto">
                {productResults.map(p => <button key={p.id} onClick={() => selectProduct(p)} className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#f2f4f6] border-b border-[#eceef0] last:border-0">
                  <span className="text-[12px] font-semibold">{p.name}</span><span className={`text-[12px] font-bold ${p.stock<=p.alert_qty?'text-[#ba1a1a]':'text-[#006a6a]'}`}>Stock: {p.stock}</span>
                </button>)}
              </div>}
            </div>
            {batches.length > 0 && <div className="mt-4 space-y-2">
              <p className="text-[11px] font-bold text-[#434653] uppercase tracking-wide">Select Batch</p>
              {batches.map(b => <div key={b.id} onClick={() => setForm(f => ({ ...f, batch_id: String(b.id) }))} className={`p-3 rounded-lg border cursor-pointer transition-all ${String(form.batch_id)===String(b.id)?'border-[#003c90] bg-blue-50':'border-[#c3c6d5] hover:border-[#003c90]/50'}`}>
                <div className="flex justify-between"><div><p className="text-[12px] font-semibold">{b.batch_no||'N/A'}</p><p className="text-[11px] text-[#737784]">Expiry: {b.expiry_date||'—'}</p></div><span className={`text-[13px] font-bold font-mono ${b.qty<=0?'text-[#ba1a1a]':'text-[#006a6a]'}`}>{fmt(b.qty)}</span></div>
              </div>)}
            </div>}
          </Card>

          <Card className="p-5">
            <h3 className="text-[14px] font-bold text-[#003c90] mb-4">Transfer Details</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select label="From Branch" value={form.from_branch_id} onChange={e => setForm(f => ({ ...f, from_branch_id: e.target.value }))} options={branchOpts} />
              <Select label="To Branch" value={form.to_branch_id} onChange={e => setForm(f => ({ ...f, to_branch_id: e.target.value }))} options={branchOpts} />
              <div><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Quantity to Transfer <span className="text-red-500">*</span></label>
                <input type="number" min="0.01" step="0.01" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} placeholder="Enter qty" className="w-full px-3 py-2 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[14px] font-bold text-center focus:border-[#003c90]" />
              </div>
              {selectedBatch && form.qty && <div className="p-3 bg-[#f7f9fb] border border-[#c3c6d5] rounded-lg text-[12px]">
                <p className="font-semibold text-[#434653]">Available: <span className="font-mono font-bold">{fmt(selectedBatch.qty)}</span></p>
                <p className="font-semibold text-[#434653]">After Transfer: <span className="font-mono font-bold text-amber-600">{fmt(selectedBatch.qty - (parseFloat(form.qty)||0))}</span></p>
              </div>}
              <Btn type="submit" variant="primary" className="w-full justify-center py-3" disabled={submitting || !selectedProduct || !form.batch_id}>
                {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span className="material-symbols-outlined text-[18px]">swap_horiz</span>Transfer Stock
              </Btn>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
