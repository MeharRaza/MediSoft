import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Select, fmt } from '../../components/ui'

export default function StockAdjustment() {
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [batches, setBatches] = useState([])
  const [form, setForm] = useState({ batch_id: '', type: 'add', qty: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!productSearch.trim()) { setProductResults([]); return }
    const t = setTimeout(() => api.inventory.searchProduct(productSearch).then(r => setProductResults(Array.isArray(r)?r:[])), 250)
    return () => clearTimeout(t)
  }, [productSearch])

  const selectProduct = async (p) => {
    setSelectedProduct(p); setProductSearch(p.name); setProductResults([])
    const b = await api.inventory.getBatches(p.id)
    setBatches(Array.isArray(b)?b:[])
    setForm({ batch_id: '', type: 'add', qty: '', reason: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.batch_id) return setMsg({ type: 'error', text: 'Select a batch.' })
    if (!form.qty || parseFloat(form.qty) <= 0) return setMsg({ type: 'error', text: 'Enter valid quantity.' })
    setSubmitting(true); setMsg(null)
    try {
      await api.inventory.adjustStock({ product_id: selectedProduct.id, batch_id: parseInt(form.batch_id), type: form.type, qty: parseFloat(form.qty), reason: form.reason })
      setMsg({ type: 'success', text: `Stock ${form.type === 'add' ? 'added' : 'removed'} successfully.` })
      const b = await api.inventory.getBatches(selectedProduct.id); setBatches(Array.isArray(b)?b:[])
      setForm({ batch_id: '', type: 'add', qty: '', reason: '' })
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  const selectedBatch = batches.find(b => String(b.id) === String(form.batch_id))

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Stock Adjustment" subtitle="Add or remove stock manually" />
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}

        <div className="grid grid-cols-2 gap-5">
          {/* Product Selection */}
          <Card className="p-5">
            <h3 className="text-[14px] font-bold text-[#003c90] mb-4">Step 1: Select Product</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737784] text-[18px]">search</span>
              <input type="text" value={productSearch} onChange={e => { setProductSearch(e.target.value); setSelectedProduct(null) }} placeholder="Search product by name or barcode..." className="w-full pl-10 pr-4 py-2 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[13px] focus:border-[#003c90]" />
              {productResults.length > 0 && <div className="absolute top-full left-0 right-0 bg-white border border-[#c3c6d5] rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto">
                {productResults.map(p => <button key={p.id} onClick={() => selectProduct(p)} className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#f2f4f6] border-b border-[#eceef0] last:border-0">
                  <div><p className="text-[12px] font-semibold text-[#191c1e]">{p.name}</p><p className="text-[11px] text-[#737784]">{p.category_name}</p></div>
                  <span className={`text-[12px] font-bold ${p.stock<=p.alert_qty?'text-[#ba1a1a]':'text-[#006a6a]'}`}>Stock: {p.stock}</span>
                </button>)}
              </div>}
            </div>
            {selectedProduct && <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-[13px] font-bold text-[#003c90]">{selectedProduct.name}</p>
              <p className="text-[11px] text-[#737784]">{selectedProduct.category_name} • Current Stock: <strong className="text-[#191c1e]">{selectedProduct.stock}</strong></p>
            </div>}

            {batches.length > 0 && <div className="mt-4">
              <p className="text-[11px] font-bold text-[#434653] uppercase tracking-wide mb-2">Available Batches ({batches.length})</p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {batches.map(b => {
                  const pcsInPack = selectedProduct?.pcs_in_pack || 1
                  const boxes = pcsInPack > 1 ? Math.floor(b.qty / pcsInPack) : 0
                  const loose = pcsInPack > 1 ? b.qty % pcsInPack : b.qty
                  
                  return (
                    <div 
                      key={b.id} 
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${String(form.batch_id) === String(b.id) ? 'border-[#003c90] bg-blue-50' : 'border-[#c3c6d5] hover:border-[#003c90]/50 bg-white'}`} 
                      onClick={() => setForm(f => ({ ...f, batch_id: String(b.id) }))}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1">
                          <p className="text-[12px] font-bold text-[#003c90]">Batch: {b.batch_no || 'N/A'}</p>
                          <p className="text-[10px] text-[#737784] mt-0.5">
                            Expiry: <span className={b.expiry_date ? 'font-semibold' : ''}>{b.expiry_date || '—'}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-[14px] font-bold font-mono ${b.qty <= 0 ? 'text-[#ba1a1a]' : 'text-[#006a6a]'}`}>
                            {fmt(b.qty)} pills
                          </p>
                          {pcsInPack > 1 && (
                            <p className="text-[10px] text-[#737784] font-semibold mt-0.5">
                              ({boxes} box{boxes !== 1 ? 'es' : ''} + {loose} loose)
                            </p>
                          )}
                        </div>
                      </div>
                      {String(form.batch_id) === String(b.id) && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <p className="text-[10px] text-[#003c90] font-semibold">✓ Selected for adjustment</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>}
          </Card>

          {/* Adjustment Form */}
          <Card className="p-5">
            <h3 className="text-[14px] font-bold text-[#003c90] mb-4">Step 2: Adjustment Details</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-[11px] font-bold text-[#434653] uppercase tracking-wide mb-2">Adjustment Type</p>
                <div className="flex gap-3">
                  {[['add','Add Stock','add_circle'],['remove','Remove Stock','remove_circle']].map(([val, label, icon]) => <button key={val} type="button" onClick={() => setForm(f => ({ ...f, type: val }))} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-[13px] font-bold transition-all ${form.type === val ? (val==='add'?'border-green-500 bg-green-50 text-green-700':'border-red-500 bg-red-50 text-red-700') : 'border-[#c3c6d5] text-[#434653] hover:border-[#003c90]/50'}`}>
                    <span className="material-symbols-outlined text-[20px]">{icon}</span>{label}
                  </button>)}
                </div>
              </div>
              <div><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Quantity <span className="text-red-500">*</span></label>
                <input type="number" min="0.01" step="0.01" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} placeholder="Enter quantity" className="w-full px-3 py-2 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[14px] font-bold text-center focus:border-[#003c90]" />
              </div>
              {selectedBatch && <div className="p-3 bg-[#f7f9fb] border border-[#c3c6d5] rounded-lg text-[12px]">
                <p className="font-semibold text-[#434653]">Current: <span className="font-mono font-bold text-[#191c1e]">{fmt(selectedBatch.qty)}</span></p>
                {form.qty && <p className="font-semibold text-[#434653]">After: <span className={`font-mono font-bold ${form.type==='add'?'text-green-700':'text-[#ba1a1a]'}`}>{fmt(form.type==='add' ? selectedBatch.qty + parseFloat(form.qty||0) : selectedBatch.qty - parseFloat(form.qty||0))}</span></p>}
              </div>}
              <div><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Reason</label>
                <input type="text" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Physical count, Damage, etc." className="w-full px-3 py-2 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[13px] focus:border-[#003c90]" />
              </div>
              <Btn type="submit" variant="primary" className="w-full justify-center py-3" disabled={submitting || !selectedProduct || !form.batch_id}>
                {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span className="material-symbols-outlined text-[18px]">tune</span>Apply Adjustment
              </Btn>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
