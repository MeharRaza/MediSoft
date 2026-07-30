import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Select, Table, Badge, fmt } from '../../components/ui'

const emptyItem = () => ({ product_id: null, product_name: '', qty: 1, purchase_price: 0, current_stock: 0 })

export default function PurchaseOrders() {
  const [pos, setPos]           = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState({ supplier_id: '', notes: '' })
  const [items, setItems]       = useState([emptyItem()])
  const [productSearch, setProductSearch] = useState({})
  const [productResults, setProductResults] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg]           = useState(null)
  
  // NEW: Supplier-Company System
  const [supplierCompanies, setSupplierCompanies] = useState([]) // Companies for selected supplier
  const [selectedCompany, setSelectedCompany] = useState('') // Currently selected company
  const [companyProducts, setCompanyProducts] = useState([]) // Products filtered by company
  const [showCompanyProducts, setShowCompanyProducts] = useState(false)

  useEffect(() => { fetchPOs(); api.purchase.getSuppliers().then(s => setSuppliers(Array.isArray(s) ? s : [])) }, [])
  
  // NEW: Load supplier's companies when supplier changes
  useEffect(() => {
    if (form.supplier_id) {
      // Load companies for this supplier
      api.purchase.getSupplierCompanies(form.supplier_id).then(companies => {
        const companyNames = companies.map(c => c.company_name)
        setSupplierCompanies(companyNames)
        // Reset company selection
        setSelectedCompany('')
        setCompanyProducts([])
      }).catch(() => {
        setSupplierCompanies([])
        setSelectedCompany('')
        setCompanyProducts([])
      })
    } else {
      setSupplierCompanies([])
      setSelectedCompany('')
      setCompanyProducts([])
    }
  }, [form.supplier_id])
  
  // NEW: Load products when company is selected
  useEffect(() => {
    if (selectedCompany) {
      console.log('🏢 Loading products for company:', selectedCompany)
      api.purchase.getProductsByCompany(selectedCompany).then(products => {
        console.log('✅ Company products loaded:', products)
        setCompanyProducts(Array.isArray(products) ? products : [])
        setShowCompanyProducts(true)
      }).catch(err => {
        console.error('❌ Error loading company products:', err)
        setCompanyProducts([])
      })
    } else {
      setCompanyProducts([])
      setShowCompanyProducts(false)
    }
  }, [selectedCompany])

  const fetchPOs = async () => {
    setLoading(true)
    try { const d = await api.purchase.getPOs(); setPos(Array.isArray(d) ? d : []) }
    catch (e) { setMsg({ type: 'error', text: e.message }) }
    finally { setLoading(false) }
  }

  const handleProductSearch = (idx, val) => {
    setProductSearch(p => ({ ...p, [idx]: val }))
    if (!val.trim()) { setProductResults(p => ({ ...p, [idx]: [] })); return }
    setTimeout(() => api.inventory.searchProduct(val).then(r => setProductResults(p => ({ ...p, [idx]: r||[] }))), 250)
  }

  const selectProduct = (idx, p) => {
    const updated = [...items]
    updated[idx] = { 
      ...updated[idx], 
      product_id: p.id, 
      product_name: p.name, 
      purchase_price: p.trade_price||0,
      current_stock: p.stock || 0 // Add current stock
    }
    setItems(updated)
    setProductSearch(ps => ({ ...ps, [idx]: p.name }))
    setProductResults(pr => ({ ...pr, [idx]: [] }))
  }

  const updateItem = (idx, field, val) => { const u = [...items]; u[idx][field] = val; setItems(u) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validItems = items.filter(i => i.product_id && parseFloat(i.qty) > 0)
    if (!form.supplier_id) return setMsg({ type: 'error', text: 'Select a supplier.' })
    if (!validItems.length) return setMsg({ type: 'error', text: 'Add at least one product.' })
    setSubmitting(true); setMsg(null)
    try {
      await api.purchase.createPO({ supplier_id: form.supplier_id, notes: form.notes, items: validItems.map(i => ({ product_id: i.product_id, qty: parseFloat(i.qty), purchase_price: parseFloat(i.purchase_price)||0 })) })
      setMsg({ type: 'success', text: 'Purchase Order created.' })
      setForm({ supplier_id: '', notes: '' })
      setItems([emptyItem()])
      setProductSearch({})
      setProductResults({})
      setSelectedCompany('') // Reset company selection
      setSupplierCompanies([]) // Reset supplier companies
      setCompanyProducts([]) // Reset company products
      fetchPOs()
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  const statusBadge = s => s === 'pending' ? <Badge label="PENDING" type="warning" /> : s === 'received' ? <Badge label="RECEIVED" type="success" /> : <Badge label="CANCELLED" type="error" />
  const supplierOpts = [{ value: '', label: 'Select Supplier' }, ...suppliers.map(s => ({ value: String(s.id), label: s.name }))]
  
  // Get selected supplier name
  const getSupplierName = () => {
    if (!form.supplier_id) return ''
    const supplier = suppliers.find(s => String(s.id) === String(form.supplier_id))
    return supplier ? supplier.name : ''
  }

  const cols = [
    { key: 'po_number',    label: 'PO #', mono: true, render: v => <span className="font-mono font-semibold text-[#003c90] text-[12px]">{v}</span> },
    { key: 'supplier_name', label: 'Supplier', render: v => <span className="text-[12px]">{v||'—'}</span> },
    { key: 'status',       label: 'Status', render: v => statusBadge(v) },
    { key: 'created_at',   label: 'Date', render: v => <span className="text-[11px] text-[#737784]">{v ? new Date(v).toLocaleDateString() : '-'}</span> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Purchase Orders" subtitle="Generate and manage purchase orders" />
      <div className="p-5 space-y-5 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}
        <Card>
          <div className="px-5 py-4 border-b border-[#c3c6d5]"><h3 className="text-[15px] font-bold text-[#003c90]">Create Purchase Order</h3></div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select label="Supplier" value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} options={supplierOpts} />
              <div><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Notes</label><input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." className="w-full px-3 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[13px] focus:border-[#003c90]" /></div>
            </div>
            
            {/* Company Selection - Show when supplier is selected and has companies */}
            {form.supplier_id && supplierCompanies.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <span className="material-symbols-outlined text-[18px] text-[#003c90]">business</span>
                  <span className="text-[13px] font-bold text-[#003c90]">
                    Select Company from {getSupplierName()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {supplierCompanies.map((company, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedCompany(company)}
                      className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                        selectedCompany === company
                          ? 'bg-[#003c90] text-white border-2 border-[#003c90]'
                          : 'bg-white text-[#003c90] border-2 border-[#c3c6d5] hover:border-[#003c90]'
                      }`}
                    >
                      {company}
                    </button>
                  ))}
                  {selectedCompany && (
                    <button
                      type="button"
                      onClick={() => setSelectedCompany('')}
                      className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-red-50 text-red-600 border-2 border-red-300 hover:bg-red-100 transition-all"
                    >
                      ✕ Clear Selection
                    </button>
                  )}
                </div>
                {selectedCompany && companyProducts.length > 0 && (
                  <div className="mt-3 text-[11px] text-green-700 font-semibold">
                    ✓ {companyProducts.length} product{companyProducts.length !== 1 ? 's' : ''} available from {selectedCompany}
                  </div>
                )}
              </div>
            )}
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-[#434653] uppercase">Items</p>
                <div className="flex gap-2">
                  {/* Company Products Button */}
                  {companyProducts.length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => setShowCompanyProducts(!showCompanyProducts)} 
                      className="px-3 py-1.5 text-[11px] font-semibold border-2 border-[#003c90] bg-[#003c90] text-white rounded hover:opacity-90 transition-opacity flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">business</span>
                      {showCompanyProducts ? 'Hide' : 'Show'} {selectedCompany} Products ({companyProducts.length})
                    </button>
                  )}
                  <Btn type="button" size="sm" variant="outline" onClick={() => setItems([...items, emptyItem()])}><span className="material-symbols-outlined text-[14px]">add</span>Add Row</Btn>
                </div>
              </div>
              
              {/* Company Products Quick List */}
              {showCompanyProducts && companyProducts.length > 0 && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-[11px] font-semibold text-blue-900 mb-2 uppercase">
                    📦 {selectedCompany} Products:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {companyProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const emptyIdx = items.findIndex(i => !i.product_id)
                          if (emptyIdx >= 0) {
                            selectProduct(emptyIdx, p)
                          } else {
                            setItems([...items, emptyItem()])
                            setTimeout(() => selectProduct(items.length, p), 50)
                          }
                        }}
                        className="px-3 py-1.5 bg-white border border-blue-300 rounded text-[11px] font-semibold text-[#003c90] hover:bg-blue-100 transition-colors flex items-center gap-2"
                      >
                        <span>{p.name}</span>
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Stock: {p.stock || 0}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="border border-[#c3c6d5] rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-[#f2f4f6] border-b border-[#c3c6d5]">{['#','Product','Current Stock','Order Qty','Est. Price',''].map(h => <th key={h} className={`px-3 py-2.5 text-[11px] font-bold text-[#434653] uppercase tracking-wider ${['Current Stock','Order Qty','Est. Price'].includes(h)?'text-right':''}`}>{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-[#eceef0]">
                    {items.map((item, idx) => <tr key={idx} className="hover:bg-[#f7f9fb] group">
                      <td className="px-3 py-2 text-[12px] font-mono text-[#737784]">{idx+1}</td>
                      <td className="px-3 py-2 relative w-56">
                        <input type="text" value={productSearch[idx]!==undefined?productSearch[idx]:(item.product_name||'')} onChange={e => handleProductSearch(idx, e.target.value)} placeholder="Search product..." className="w-full px-2 py-1 border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90]" />
                        {productResults[idx]?.length > 0 && <div className="absolute top-full left-3 right-0 bg-white border border-[#c3c6d5] rounded-lg shadow-xl z-40 max-h-48 overflow-y-auto">{productResults[idx].map(p => <button key={p.id} type="button" onClick={() => selectProduct(idx, p)} className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#f2f4f6] border-b border-[#eceef0] last:border-0 text-[12px]"><span className="font-semibold">{p.name}</span><span className="text-[#003c90] font-mono ml-2">Stock: {p.stock || 0}</span></button>)}</div>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`inline-block px-2 py-1 rounded text-[12px] font-bold font-mono ${
                          item.current_stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.current_stock || 0} pcs
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right"><input type="number" min="0" step="0.01" value={item.qty} onChange={e => updateItem(idx,'qty',e.target.value)} className="w-20 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90]" /></td>
                      <td className="px-3 py-2 text-right"><input type="number" min="0" step="0.01" value={item.purchase_price} onChange={e => updateItem(idx,'purchase_price',e.target.value)} className="w-24 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] font-mono focus:border-[#003c90]" /></td>
                      <td className="px-3 py-2"><button type="button" onClick={() => items.length > 1 && setItems(items.filter((_,i)=>i!==idx))} className="opacity-0 group-hover:opacity-100 p-1 text-[#737784] hover:text-[#ba1a1a]"><span className="material-symbols-outlined text-[18px]">delete</span></button></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end"><Btn type="submit" variant="primary" size="lg" disabled={submitting}>{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}<span className="material-symbols-outlined text-[18px]">assignment</span>Create PO</Btn></div>
          </form>
        </Card>
        <Card><div className="px-5 py-3 border-b border-[#c3c6d5]"><h3 className="text-[15px] font-bold text-[#003c90]">Purchase Orders</h3></div>
          {loading ? <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : <Table columns={cols} data={pos} emptyMsg="No purchase orders yet" />}
        </Card>
      </div>
    </div>
  )
}
