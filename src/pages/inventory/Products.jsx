import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, SearchInput, fmt } from '../../components/ui'

const emptyForm = () => ({ barcode: '', name: '', generic_name: '', category_id: '', manufacturer_id: '', rack_location: '', pcs_in_pack: 1, sale_price: 0, trade_price: 0, alert_qty: 10, is_active: true, batch_no: '', expiry_date: '', initial_qty: 0, purchase_price: 0 })

export default function Products() {
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [form, setForm]             = useState(emptyForm())
  const [editingId, setEditingId]   = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg]               = useState(null)
  const [newCatName, setNewCatName] = useState('')

  useEffect(() => {
    fetchProducts()
    api.inventory.getCategories().then(c => setCategories(Array.isArray(c) ? c : []))
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try { 
      const d = await api.inventory.getProducts({ search: search||undefined, is_active: 1 }) // Only show active products
      console.log('📦 Products fetched:', d.slice(0, 3)) // Show first 3 products
      console.log('🔍 Check company_name field:', d.map(p => ({ id: p.id, name: p.name, company_name: p.company_name, generic_name: p.generic_name })))
      setProducts(Array.isArray(d) ? d : [])
    }
    catch (e) { setMsg({ type: 'error', text: e.message }) }
    finally { setLoading(false) }
  }

  const handleSearch = () => fetchProducts()

  const handleSave = async () => {
    if (!form.name.trim()) return setMsg({ type: 'error', text: 'Product name is required.' })
    setSubmitting(true); setMsg(null)
    const payload = { 
      ...form, 
      category_id: form.category_id||null, 
      pcs_in_pack: parseInt(form.pcs_in_pack)||1, 
      sale_price: parseFloat(form.sale_price)||0, 
      trade_price: parseFloat(form.trade_price)||0, 
      alert_qty: parseFloat(form.alert_qty)||10, 
      is_active: form.is_active?1:0,
      // Batch data
      batch_no: form.batch_no || null,
      expiry_date: form.expiry_date || null,
      initial_qty: parseFloat(form.initial_qty) || 0,
      purchase_price: parseFloat(form.purchase_price) || parseFloat(form.trade_price) || 0
    }
    try {
      if (editingId) { await api.inventory.updateProduct({ id: editingId, ...payload }); setMsg({ type: 'success', text: 'Product updated.' }) }
      else { await api.inventory.createProduct(payload); setMsg({ type: 'success', text: 'Product saved with batch.' }) }
      setForm(emptyForm()); setEditingId(null); fetchProducts()
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  const handleEdit = (p) => {
    setEditingId(p.id)
    setForm({ 
      barcode: p.barcode||'', 
      name: p.name||'', 
      generic_name: p.generic_name||'', 
      category_id: p.category_id||'', 
      manufacturer_id: p.manufacturer_id||'', 
      rack_location: p.rack_location||'', 
      pcs_in_pack: p.pcs_in_pack||1, 
      sale_price: p.sale_price||0, 
      trade_price: p.trade_price||0, 
      alert_qty: p.alert_qty||10, 
      is_active: p.is_active!==0,
      // Don't load batch data when editing - batches are managed separately
      batch_no: '',
      expiry_date: '',
      initial_qty: 0,
      purchase_price: 0
    })
    window.scrollTo(0, 0)
  }

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return
    console.log('🗑️ Deleting product:', p.id, p.name)
    try { 
      const result = await api.inventory.deleteProduct(p.id)
      console.log('✅ Delete result:', result)
      setMsg({ type: 'success', text: 'Product deleted successfully.' })
      fetchProducts()
    }
    catch (err) { 
      console.error('❌ Delete error:', err)
      setMsg({ type: 'error', text: err.message })
    }
  }

  const addCategory = async () => {
    if (!newCatName.trim()) return
    await api.inventory.createCategory({ name: newCatName.toUpperCase() })
    setNewCatName('')
    api.inventory.getCategories().then(c => setCategories(Array.isArray(c) ? c : []))
  }

  const filtered = products.filter(p => !search || (p.name||'').toLowerCase().includes(search.toLowerCase()) || (p.barcode||'').includes(search) || (p.generic_name||'').toLowerCase().includes(search.toLowerCase()))

  const setF = (field, value) => setForm(f => ({ ...f, [field]: value }))

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Product Definition" subtitle="Create and manage pharmacy products" 
        actions={<Btn variant="outline" onClick={fetchProducts} disabled={loading}>
          {loading && <span className="w-4 h-4 border-2 border-[#003c90]/30 border-t-[#003c90] rounded-full animate-spin" />}
          <span className="material-symbols-outlined text-[16px]">refresh</span>Refresh
        </Btn>} 
      />
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}

        {/* Product Form */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-[#003c90] flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">add_box</span>{editingId ? 'Edit Product' : 'Add New Product'}</h3>
            <div className="flex gap-2">
              <Btn variant="secondary" onClick={handleSave} disabled={submitting}>{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}<span className="material-symbols-outlined text-[16px]">save</span>{editingId ? 'UPDATE' : 'SAVE'}</Btn>
              <Btn variant="outline" onClick={() => { setForm(emptyForm()); setEditingId(null) }}><span className="material-symbols-outlined text-[16px]">close</span>CLEAR</Btn>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Category</label>
              <div className="flex gap-1">
                <select value={form.category_id} onChange={e => setF('category_id', e.target.value)} className="flex-1 px-2 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[12px] focus:border-[#003c90]">
                  <option value="">Select</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" onClick={() => { const name = prompt('New category name:'); if(name) api.inventory.createCategory({ name: name.toUpperCase() }).then(() => api.inventory.getCategories().then(c => setCategories(Array.isArray(c)?c:[]))) }} className="px-2 border border-[#c3c6d5] rounded bg-[#f2f4f6] hover:bg-[#eceef0] text-[#003c90]"><span className="material-symbols-outlined text-[16px]">add</span></button>
              </div>
            </div>
            <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Barcode</label><input type="text" value={form.barcode} onChange={e => setF('barcode', e.target.value)} className="w-full px-2 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[12px] focus:border-[#003c90]" /></div>
            <div className="col-span-4"><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Product Name <span className="text-red-500">*</span></label><input type="text" value={form.name} onChange={e => setF('name', e.target.value)} className="w-full px-2 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[12px] focus:border-[#003c90]" placeholder="Enter product name..." /></div>
            <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Company Name</label><input type="text" value={form.generic_name} onChange={e => setF('generic_name', e.target.value)} className="w-full px-2 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[12px] focus:border-[#003c90]" placeholder="Manufacturer/Supplier" /></div>
            <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Rack Location</label><input type="text" value={form.rack_location} onChange={e => setF('rack_location', e.target.value)} className="w-full px-2 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[12px] focus:border-[#003c90]" /></div>
            <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Pcs in Pack</label><input type="number" min="1" value={form.pcs_in_pack} onChange={e => setF('pcs_in_pack', e.target.value)} className="w-full px-2 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[12px] text-right focus:border-[#003c90]" /></div>
            <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Sale Price/Box</label><input type="number" min="0" step="0.01" value={form.sale_price} onChange={e => setF('sale_price', e.target.value)} className="w-full px-2 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[12px] text-right font-bold text-[#003c90] focus:border-[#003c90]" /></div>
            <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Trade Price/Box</label><input type="number" min="0" step="0.01" value={form.trade_price} onChange={e => setF('trade_price', e.target.value)} className="w-full px-2 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[12px] text-right focus:border-[#003c90]" /></div>
            <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Alert Qty</label><input type="number" min="0" value={form.alert_qty} onChange={e => setF('alert_qty', e.target.value)} className="w-full px-2 py-1.5 border border-red-300 rounded bg-[#f7f9fb] text-[12px] text-right focus:border-red-500" /></div>
            <div className="col-span-2 flex items-end pb-1"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={e => setF('is_active', e.target.checked)} className="w-4 h-4 rounded border-[#c3c6d5] text-[#003c90]" /><span className="text-[11px] font-semibold text-[#434653]">IS ACTIVE</span></label></div>
          </div>
          
          {/* Initial Batch Info - Only for new products */}
          {!editingId && (
            <div className="mt-4 pt-4 border-t border-[#c3c6d5]">
              <p className="text-[12px] font-bold text-[#003c90] mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                Initial Stock & Batch (Optional)
              </p>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Batch No</label><input type="text" value={form.batch_no} onChange={e => setF('batch_no', e.target.value)} placeholder="e.g. B001" className="w-full px-2 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[12px] focus:border-[#003c90]" /></div>
                <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Expiry Date</label><input type="date" value={form.expiry_date} onChange={e => setF('expiry_date', e.target.value)} className="w-full px-2 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[12px] focus:border-[#003c90]" /></div>
                <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Initial Qty</label><input type="number" min="0" value={form.initial_qty} onChange={e => setF('initial_qty', e.target.value)} placeholder="0" className="w-full px-2 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[12px] text-right focus:border-[#003c90]" /></div>
                <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Purchase Price</label><input type="number" min="0" step="0.01" value={form.purchase_price} onChange={e => setF('purchase_price', e.target.value)} placeholder="0.00" className="w-full px-2 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[12px] text-right focus:border-[#003c90]" /></div>
                <div className="col-span-4 flex items-end pb-1">
                  <p className="text-[10px] text-[#737784] leading-tight">
                    <span className="material-symbols-outlined text-[12px] align-middle">info</span> Add batch details to create initial stock automatically
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Search + Table */}
        <Card className="flex flex-col flex-1">
          <div className="px-4 py-3 border-b border-[#c3c6d5] flex items-center gap-3">
            <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product name, barcode, company..." className="w-80" />
            <Btn variant="primary" size="sm" onClick={handleSearch}><span className="material-symbols-outlined text-[14px]">search</span>Search</Btn>
            <Btn variant="outline" size="sm" onClick={fetchProducts} disabled={loading}>
              {loading && <span className="w-4 h-4 border-2 border-[#003c90]/30 border-t-[#003c90] rounded-full animate-spin" />}
              <span className="material-symbols-outlined text-[14px]">refresh</span>Refresh
            </Btn>
          </div>
          <div className="overflow-auto flex-1">
            {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> :
              <table className="w-full text-left border-collapse table-dense">
                <thead><tr className="bg-[#f2f4f6] border-b border-[#c3c6d5] sticky top-0">{['PID','Barcode','Product Name','Category','Company','Pcs/Pk','Stock','Sale','Trade','Actions'].map(h => <th key={h} className={`px-3 py-2 text-[10px] font-bold text-[#434653] uppercase tracking-wider ${['Pcs/Pk','Stock','Sale','Trade'].includes(h)?'text-right':''}`}>{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-[#eceef0]">
                  {filtered.length === 0 ? <tr><td colSpan={10} className="px-4 py-10 text-center text-[13px] text-[#737784]">No products found</td></tr> :
                    filtered.map(p => <tr key={p.id} className="hover:bg-[#f7f9fb] group transition-colors">
                      <td className="px-3 py-1.5 text-[11px] font-mono text-[#737784]">{p.id}</td>
                      <td className="px-3 py-1.5 text-[11px] font-mono">{p.barcode||'—'}</td>
                      <td className="px-3 py-1.5 text-[12px] font-semibold text-[#003c90]">{p.name}</td>
                      <td className="px-3 py-1.5"><span className="px-2 py-0.5 bg-[#eceef0] rounded text-[10px] font-bold text-[#434653]">{p.category_name||'—'}</span></td>
                      <td className="px-3 py-1.5 text-[11px] text-[#737784]">{p.company_name||'—'}</td>
                      <td className="px-3 py-1.5 text-right text-[11px] font-mono">{p.pcs_in_pack}</td>
                      <td className="px-3 py-1.5 text-right"><span className={`text-[12px] font-bold font-mono ${p.stock <= p.alert_qty ? 'text-[#ba1a1a]' : 'text-[#006a6a]'}`}>{fmt(p.stock)}</span></td>
                      <td className="px-3 py-1.5 text-right text-[12px] font-mono">{fmt(p.sale_price)}</td>
                      <td className="px-3 py-1.5 text-right text-[12px] font-mono">{fmt(p.trade_price)}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEdit(p)} 
                            className="px-2 py-1 text-[10px] font-semibold text-[#003c90] hover:bg-[#003c90] hover:text-white border border-[#003c90] rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => {
                              // Direct delete - no confirmation popup
                              console.log('🗑️ Deleting product instantly:', p.id, p.name)
                              api.inventory.deleteProduct(p.id)
                                .then(() => {
                                  setMsg({ type: 'success', text: 'Product deleted successfully.' })
                                  fetchProducts()
                                })
                                .catch(err => setMsg({ type: 'error', text: err.message }))
                            }} 
                            className="px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-600 hover:text-white border border-red-600 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            }
          </div>
          <div className="px-4 py-2 bg-[#006a6a] text-white text-[11px] flex justify-between items-center">
            <span>Total Products: <strong>{filtered.length}</strong></span>
            <span>Total Stock Value: <strong>PKR {fmt(filtered.reduce((s,p) => s + (p.stock||0)*(p.trade_price||0), 0))}</strong></span>
          </div>
        </Card>
      </div>
    </div>
  )
}
