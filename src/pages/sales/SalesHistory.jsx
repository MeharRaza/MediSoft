import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Select, Badge, Table, Modal, SearchInput, fmt, today } from '../../components/ui'
import InvoicePrint from '../../components/InvoicePrint'

function monthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function todayDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function statusBadge(status) {
  if (status === 'paid')   return <Badge label="PAID"   type="success" />
  if (status === 'credit') return <Badge label="CREDIT" type="info" />
  if (status === 'voided') return <Badge label="VOIDED" type="error" />
  return <Badge label={status || 'N/A'} type="neutral" />
}

export default function SalesHistory() {
  const [invoices, setInvoices] = useState([])
  const [returns, setReturns] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const searchInputRef = useRef()
  const searchDropdownRef = useRef()
  const [status, setStatus]     = useState('')
  const [fromDate, setFromDate] = useState(todayDate()) // Changed: Default to today
  const [toDate, setToDate]     = useState(todayDate()) // Changed: Default to today
  const [viewInvoice, setViewInvoice] = useState(null)
  const [invoiceDetails, setInvoiceDetails] = useState(null) // Full invoice with items
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [msg, setMsg]           = useState(null)
  const [printInvoice, setPrintInvoice] = useState(null) // For print modal
  
  // Item History Feature
  const [showItemHistory, setShowItemHistory] = useState(false)
  const [itemHistorySearch, setItemHistorySearch] = useState('')
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [itemHistory, setItemHistory] = useState(null)
  const [loadingItemHistory, setLoadingItemHistory] = useState(false)

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const data = await api.sales.getInvoices({ from_date: fromDate, to_date: toDate, status: status || undefined, search: search || undefined })
      setInvoices(Array.isArray(data) ? data : [])
      
      // Also fetch returns for the same period
      const returnsData = await api.sales.getReturns({ from_date: fromDate, to_date: toDate })
      setReturns(Array.isArray(returnsData) ? returnsData : [])
    } catch (e) {
      setMsg({ type: 'error', text: 'Failed to load invoices: ' + e.message })
      console.error('❌ Error loading invoices:', e)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchInvoices() }, [])
  
  // Load all products for item history search
  useEffect(() => {
    api.inventory.getProducts({ loadAll: true }).then(data => setProducts(Array.isArray(data) ? data : []))
  }, [])
  
  // Real-time search suggestions (invoices + products)
  useEffect(() => {
    if (!search || search.length < 2) {
      setSearchSuggestions([])
      setSelectedSuggestionIndex(-1)
      return
    }
    
    const searchLower = search.toLowerCase()
    
    // Search in invoices (invoice number, customer name)
    const invoiceSuggestions = invoices
      .filter(inv => 
        inv.invoice_no.toLowerCase().includes(searchLower) ||
        (inv.customer_name && inv.customer_name.toLowerCase().includes(searchLower))
      )
      .slice(0, 5)
      .map(inv => ({
        type: 'invoice',
        display: `${inv.invoice_no} - ${inv.customer_name || 'Walk-in'} - PKR ${fmt(inv.grand_total)}`,
        value: inv.invoice_no,
        data: inv
      }))
    
    // Search in products (product name)
    const productSuggestions = products
      .filter(p => p.name.toLowerCase().includes(searchLower))
      .slice(0, 5)
      .map(p => ({
        type: 'product',
        display: `${p.name} (Product)`,
        value: p.name,
        data: p
      }))
    
    // Combine suggestions (invoices first, then products)
    const allSuggestions = [...invoiceSuggestions, ...productSuggestions]
    setSearchSuggestions(allSuggestions)
    setSelectedSuggestionIndex(allSuggestions.length > 0 ? 0 : -1)
  }, [search, invoices, products])
  
  // Keyboard navigation for search dropdown
  const handleSearchKeyDown = (e) => {
    if (searchSuggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        fetchInvoices()
      }
      return
    }
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev < searchSuggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : searchSuggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0 && searchSuggestions[selectedSuggestionIndex]) {
          const suggestion = searchSuggestions[selectedSuggestionIndex]
          setSearch(suggestion.value)
          setSearchSuggestions([])
          setSelectedSuggestionIndex(-1)
          // Auto-trigger search after selection
          setTimeout(() => fetchInvoices(), 100)
        } else {
          fetchInvoices()
        }
        break
      case 'Escape':
        e.preventDefault()
        setSearchSuggestions([])
        setSelectedSuggestionIndex(-1)
        break
    }
  }
  
  // Select suggestion on click
  const handleSelectSuggestion = (suggestion) => {
    setSearch(suggestion.value)
    setSearchSuggestions([])
    setSelectedSuggestionIndex(-1)
    setTimeout(() => fetchInvoices(), 100)
  }

  // Fetch full invoice details when viewing
  const handleViewInvoice = async (invoice) => {
    setViewInvoice(invoice)
    setLoadingDetails(true)
    try {
      const details = await api.sales.getInvoiceById(invoice.id)
      setInvoiceDetails(details)
    } catch (e) {
      setMsg({ type: 'error', text: 'Failed to load invoice details: ' + e.message })
    } finally {
      setLoadingDetails(false)
    }
  }

  const closeInvoiceModal = () => {
    setViewInvoice(null)
    setInvoiceDetails(null)
  }
  
  // Load item history for selected product
  const handleViewItemHistory = async (product) => {
    setSelectedProduct(product)
    setLoadingItemHistory(true)
    try {
      const data = await api.sales.getProductHistory(product.id)
      setItemHistory(data)
      setShowItemHistory(true)
    } catch (e) {
      setMsg({ type: 'error', text: 'Failed to load item history: ' + e.message })
    } finally {
      setLoadingItemHistory(false)
    }
  }
  
  const closeItemHistoryModal = () => {
    setShowItemHistory(false)
    setSelectedProduct(null)
    setItemHistory(null)
    setItemHistorySearch('')
  }
  
  const handlePrintInvoice = () => {
    if (invoiceDetails) {
      setPrintInvoice(invoiceDetails)
    }
  }
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-PK', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  // Filter products based on search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(itemHistorySearch.toLowerCase()) ||
    (p.generic_name && p.generic_name.toLowerCase().includes(itemHistorySearch.toLowerCase()))
  )

  const totalAmount  = invoices.reduce((s, i) => s + (Number(i.grand_total) || 0), 0)
  const creditAmount = invoices.filter(i => i.status === 'credit').reduce((s, i) => s + (Number(i.grand_total) - Number(i.paid_amount || 0)), 0)
  const totalReturns = returns.reduce((s, r) => s + (Number(r.total) || 0), 0)
  const netSales = totalAmount - totalReturns

  const columns = [
    { key: 'invoice_no',    label: 'Invoice #',   mono: true, render: v => <span className="font-mono font-semibold text-[#003c90] text-[12px]">{v}</span> },
    { key: 'customer_name', label: 'Customer',    render: v => <span className="text-[12px]">{v || 'Walk-in'}</span> },
    { key: 'grand_total',   label: 'Total',       right: true, render: v => <span className="font-mono font-bold text-[12px]">PKR {fmt(v)}</span> },
    { key: 'paid_amount',   label: 'Paid',        right: true, render: v => <span className="font-mono text-green-700 text-[12px]">PKR {fmt(v)}</span> },
    { key: 'status',        label: 'Status',      render: v => statusBadge(v) },
    { key: 'created_at',    label: 'Date & Time', render: v => {
      if (!v) return <span className="text-[11px] text-[#737784]">-</span>
      const date = new Date(v)
      const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      return (
        <div className="text-[11px]">
          <div className="font-semibold text-[#191c1e]">{dateStr}</div>
          <div className="text-[#737784]">{timeStr}</div>
        </div>
      )
    }},
    { key: 'id',            label: 'Actions',     render: (_, row) => <Btn size="sm" variant="outline" onClick={() => handleViewInvoice(row)}><span className="material-symbols-outlined text-[14px]">visibility</span>View</Btn> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Sales History" subtitle="View and filter all sales invoices"
        actions={
          <div className="flex gap-2">
            <Btn variant="outline" onClick={() => setShowItemHistory(true)}>
              <span className="material-symbols-outlined text-[16px]">history</span>Item History
            </Btn>
            <Btn variant="primary" onClick={fetchInvoices}>
              <span className="material-symbols-outlined text-[16px]">refresh</span>Refresh
            </Btn>
          </div>
        } />
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          <span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}
          <button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button>
        </div>}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-[#003c90]">receipt_long</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase tracking-wide">Total Invoices</p><p className="text-[22px] font-bold text-[#003c90]">{invoices.length}</p><p className="text-[9px] text-[#737784] mt-0.5">{fromDate === toDate ? `On ${new Date(fromDate).toLocaleDateString('en-GB')}` : `${new Date(fromDate).toLocaleDateString('en-GB')} to ${new Date(toDate).toLocaleDateString('en-GB')}`}</p></div></Card>
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-green-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-green-600]">payments</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase tracking-wide">Gross Sales</p><p className="text-[22px] font-bold text-green-700">PKR {fmt(totalAmount)}</p><p className="text-[9px] text-[#737784] mt-0.5">For selected period</p></div></Card>
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-blue-600">credit_card</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase tracking-wide">Credit Outstanding</p><p className="text-[22px] font-bold text-blue-700">PKR {fmt(creditAmount)}</p><p className="text-[9px] text-[#737784] mt-0.5">{invoices.filter(i => i.status === 'credit').length} invoices</p></div></Card>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-red-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-red-600">keyboard_return</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase tracking-wide">Sales Returns</p><p className="text-[22px] font-bold text-red-700">PKR {fmt(totalReturns)}</p><p className="text-[9px] text-[#737784] mt-0.5">{returns.length} returns in period</p></div></Card>
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-[#003c90]/10 rounded-lg"><span className="material-symbols-outlined text-[20px] text-[#003c90]">check_circle</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase tracking-wide">Net Sales</p><p className="text-[22px] font-bold text-[#003c90]">PKR {fmt(netSales)}</p><p className="text-[9px] text-[#737784] mt-0.5">Gross - Returns</p></div></Card>
          <Card className="p-4 flex items-center gap-3 opacity-50"><div className="p-2 bg-gray-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-gray-400">info</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase tracking-wide">Filter Status</p><p className="text-[10px] text-[#737784] mt-1 leading-relaxed">{status ? `Status: ${status.toUpperCase()}` : 'All statuses'} {search ? `| Search: "${search}"` : ''}</p></div></Card>
        </div>
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative w-56">
              <label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Search</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737784] text-[18px]">search</span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Invoice#, Customer, Product..."
                  className="w-full pl-9 pr-4 py-2 border border-[#c3c6d5] rounded-full bg-white text-[13px] focus:border-[#003c90] transition-colors"
                />
              </div>
              {/* Dropdown Suggestions */}
              {searchSuggestions.length > 0 && (
                <div 
                  ref={searchDropdownRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#c3c6d5] rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto"
                >
                  {searchSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className={`w-full px-4 py-2.5 text-left text-[12px] transition-colors border-b border-[#eceef0] last:border-0 ${
                        idx === selectedSuggestionIndex
                          ? 'bg-[#003c90] text-white'
                          : 'hover:bg-[#f2f4f6] text-[#191c1e]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-[16px] ${
                          idx === selectedSuggestionIndex ? 'text-white' : 'text-[#003c90]'
                        }`}>
                          {suggestion.type === 'invoice' ? 'receipt_long' : 'inventory_2'}
                        </span>
                        <span>{suggestion.display}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input label="From Date" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
            <Input label="To Date"   type="date" value={toDate}   onChange={e => setToDate(e.target.value)}   className="w-40" />
            <Select label="Status" value={status} onChange={e => setStatus(e.target.value)} className="w-36"
              options={[{value:'',label:'All Status'},{value:'paid',label:'Paid'},{value:'credit',label:'Credit'},{value:'voided',label:'Voided'}]} />
            <Btn variant="primary" onClick={fetchInvoices} className="mt-auto"><span className="material-symbols-outlined text-[16px]">filter_list</span>Apply</Btn>
          </div>
        </Card>
        <Card>{loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : <Table columns={columns} data={invoices} emptyMsg="No invoices found" />}</Card>
      </div>
      <Modal open={!!viewInvoice} onClose={closeInvoiceModal} title={`Invoice — ${viewInvoice?.invoice_no || ''}`} width="max-w-4xl">
        {viewInvoice && <div className="space-y-4">
          {/* Invoice Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-[#f7f9fb] rounded-lg border border-[#c3c6d5]">
            <div className="space-y-2">
              <p className="text-[12px]"><span className="font-semibold text-[#737784]">Invoice: </span><span className="font-mono font-bold text-[#003c90]">{viewInvoice.invoice_no}</span></p>
              <p className="text-[12px]"><span className="font-semibold text-[#737784]">Customer: </span>{viewInvoice.customer_name || 'Walk-in'}</p>
              <p className="text-[12px]"><span className="font-semibold text-[#737784]">Date: </span>{new Date(viewInvoice.created_at).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[12px]"><span className="font-semibold text-[#737784]">Status: </span>{statusBadge(viewInvoice.status)}</p>
              <p className="text-[12px]"><span className="font-semibold text-[#737784]">Sub Total: </span><span className="font-mono">PKR {fmt(viewInvoice.sub_total)}</span></p>
              {viewInvoice.discount > 0 && (
                <p className="text-[12px]"><span className="font-semibold text-[#737784]">Discount: </span><span className="font-mono text-red-600">- PKR {fmt(viewInvoice.discount)}</span></p>
              )}
              <p className="text-[12px]"><span className="font-semibold text-[#737784]">Grand Total: </span><span className="font-mono font-bold">PKR {fmt(viewInvoice.grand_total)}</span></p>
              <p className="text-[12px]"><span className="font-semibold text-[#737784]">Paid: </span><span className="font-mono text-green-700">PKR {fmt(viewInvoice.paid_amount)}</span></p>
            </div>
          </div>

          {/* Sold Items Table */}
          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" />
            </div>
          ) : invoiceDetails?.items?.length > 0 ? (
            <div className="border border-[#c3c6d5] rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-[#f2f4f6] border-b border-[#c3c6d5]">
                <h3 className="text-[13px] font-bold text-[#003c90] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                  Sold Items ({invoiceDetails.items.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f7f9fb] border-b border-[#c3c6d5]">
                      <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase tracking-wider">#</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase tracking-wider">Product</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase tracking-wider">Generic</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase tracking-wider text-right">Qty</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase tracking-wider text-right">Price</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase tracking-wider text-right">Disc%</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase tracking-wider text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eceef0]">
                    {invoiceDetails.items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-[#f7f9fb]">
                        <td className="px-3 py-2 text-[11px] text-[#737784]">{idx + 1}</td>
                        <td className="px-3 py-2 text-[12px] font-semibold text-[#191c1e]">{item.product_name}</td>
                        <td className="px-3 py-2 text-[11px] text-[#737784]">{item.generic_name || '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <span className="inline-block px-2 py-0.5 bg-[#eceef0] rounded text-[11px] font-bold font-mono text-[#003c90]">
                            {item.qty}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-[12px] font-mono">{fmt(item.sale_price)}</td>
                        <td className="px-3 py-2 text-right text-[11px] text-[#737784]">{item.discount_percent || 0}%</td>
                        <td className="px-3 py-2 text-right text-[12px] font-bold font-mono text-[#003c90]">{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#f7f9fb]">
                      <td colSpan="6" className="px-3 py-2 text-right text-[11px] font-semibold text-[#737784]">Sub Total:</td>
                      <td className="px-3 py-2 text-right text-[12px] font-mono text-[#434653]">PKR {fmt(viewInvoice.sub_total)}</td>
                    </tr>
                    {viewInvoice.discount > 0 && (
                      <tr className="bg-[#f7f9fb]">
                        <td colSpan="6" className="px-3 py-2 text-right text-[11px] font-semibold text-red-600">Discount:</td>
                        <td className="px-3 py-2 text-right text-[12px] font-mono text-red-600">- PKR {fmt(viewInvoice.discount)}</td>
                      </tr>
                    )}
                    <tr className="bg-[#f2f4f6] border-t-2 border-[#003c90]">
                      <td colSpan="6" className="px-3 py-2 text-right text-[12px] font-bold text-[#003c90]">Grand Total:</td>
                      <td className="px-3 py-2 text-right text-[14px] font-bold font-mono text-[#003c90]">PKR {fmt(viewInvoice.grand_total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-[13px] text-[#737784]">No items found</div>
          )}

          {/* Return History Section */}
          {invoiceDetails?.returns?.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden bg-red-50/30">
              <div className="px-4 py-2 bg-red-100 border-b border-red-200">
                <h3 className="text-[13px] font-bold text-red-700 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">keyboard_return</span>
                  Return History ({invoiceDetails.returns.length})
                </h3>
              </div>
              <div className="p-3">
                <div className="space-y-2">
                  {invoiceDetails.returns.map((ret, idx) => (
                    <div key={ret.id} className="p-3 bg-white border border-red-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-[11px] font-bold text-red-700">Return #{ret.id}</p>
                          <p className="text-[10px] text-[#737784]">{new Date(ret.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[12px] font-bold font-mono text-red-700">- PKR {fmt(ret.total)}</p>
                        </div>
                      </div>
                      <div className="text-[11px] text-[#434653]">
                        <p className="font-semibold mb-1">Returned Items:</p>
                        <p className="text-[10px] text-[#737784]">{ret.returned_items || 'No items info'}</p>
                      </div>
                      {ret.notes && (
                        <div className="mt-2 pt-2 border-t border-red-100">
                          <p className="text-[10px] text-[#737784]"><span className="font-semibold">Notes:</span> {ret.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-red-200">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-bold text-red-700">Total Returned:</span>
                    <span className="font-bold font-mono text-red-700">- PKR {fmt(invoiceDetails.returns.reduce((s, r) => s + r.total, 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#c3c6d5]">
            <Btn variant="outline" onClick={closeInvoiceModal}>Close</Btn>
            <Btn variant="primary" onClick={handlePrintInvoice}><span className="material-symbols-outlined text-[15px]">print</span>Print</Btn>
          </div>
        </div>}
      </Modal>
      
      {/* Print Invoice Modal */}
      {printInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl max-w-[400px] max-h-[90vh] overflow-auto">
            <InvoicePrint invoice={printInvoice} onClose={() => setPrintInvoice(null)} />
          </div>
        </div>
      )}
      
      {/* Item History Modal */}
      <Modal open={showItemHistory} onClose={closeItemHistoryModal} title="Item Sales History" width="max-w-5xl">
        {!selectedProduct ? (
          <div className="space-y-4">
            <p className="text-[13px] text-[#737784]">Search for a product to view its complete sales history</p>
            <SearchInput 
              value={itemHistorySearch} 
              onChange={e => setItemHistorySearch(e.target.value)} 
              placeholder="Search by product name or generic name..." 
              autoFocus
            />
            
            {itemHistorySearch && (
              <div className="border border-[#c3c6d5] rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-[#737784]">No products found</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#f2f4f6] sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-[11px] font-bold text-[#434653] uppercase tracking-wider">Product Name</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-[#434653] uppercase tracking-wider">Generic Name</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-[#434653] uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-[#434653] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eceef0]">
                      {filteredProducts.slice(0, 20).map(product => (
                        <tr key={product.id} className="hover:bg-[#f7f9fb]">
                          <td className="px-4 py-3 text-[12px] font-semibold text-[#191c1e]">{product.name}</td>
                          <td className="px-4 py-3 text-[11px] text-[#737784]">{product.generic_name || '—'}</td>
                          <td className="px-4 py-3 text-[11px] text-[#737784]">{product.category_name || '—'}</td>
                          <td className="px-4 py-3">
                            <Btn size="sm" variant="outline" onClick={() => handleViewItemHistory(product)}>
                              <span className="material-symbols-outlined text-[14px]">visibility</span>View History
                            </Btn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ) : loadingItemHistory ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" />
            <span className="ml-3 text-[13px] text-[#737784]">Loading history...</span>
          </div>
        ) : itemHistory ? (
          <div className="space-y-4">
            {/* Product Info */}
            <div className="p-4 bg-[#f7f9fb] rounded-lg border border-[#c3c6d5]">
              <h3 className="text-[14px] font-bold text-[#003c90]">{selectedProduct.name}</h3>
              {selectedProduct.generic_name && (
                <p className="text-[12px] text-[#737784] mt-1">{selectedProduct.generic_name}</p>
              )}
              <button 
                onClick={() => { setSelectedProduct(null); setItemHistory(null); }} 
                className="text-[11px] text-[#003c90] hover:underline mt-2"
              >
                ← Back to search
              </button>
            </div>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-5 gap-4">
              <div className="p-4 bg-[#f7f9fb] rounded-lg border border-[#c3c6d5]">
                <p className="text-[11px] text-[#737784] font-semibold uppercase">Total Sales</p>
                <p className="text-[20px] font-bold text-[#003c90] mt-1">{itemHistory.stats.total_sales}</p>
              </div>
              <div className="p-4 bg-[#f7f9fb] rounded-lg border border-[#c3c6d5]">
                <p className="text-[11px] text-[#737784] font-semibold uppercase">Total Quantity</p>
                <p className="text-[20px] font-bold text-[#003c90] mt-1">{itemHistory.stats.total_quantity}</p>
              </div>
              <div className="p-4 bg-[#f7f9fb] rounded-lg border border-[#c3c6d5]">
                <p className="text-[11px] text-[#737784] font-semibold uppercase">Avg Price</p>
                <p className="text-[16px] font-bold text-[#003c90] mt-1">PKR {fmt(itemHistory.stats.avg_price)}</p>
              </div>
              <div className="p-4 bg-[#f7f9fb] rounded-lg border border-[#c3c6d5]">
                <p className="text-[11px] text-[#737784] font-semibold uppercase">Max Price</p>
                <p className="text-[16px] font-bold text-green-600 mt-1">PKR {fmt(itemHistory.stats.max_price)}</p>
              </div>
              <div className="p-4 bg-[#f7f9fb] rounded-lg border border-[#c3c6d5]">
                <p className="text-[11px] text-[#737784] font-semibold uppercase">Min Price</p>
                <p className="text-[16px] font-bold text-amber-600 mt-1">PKR {fmt(itemHistory.stats.min_price)}</p>
              </div>
            </div>
            
            {/* Sales History Table */}
            {itemHistory.history.length === 0 ? (
              <div className="py-8 text-center">
                <span className="material-symbols-outlined text-[48px] text-[#c3c6d5] block mb-2">inventory_2</span>
                <p className="text-[13px] text-[#737784]">No sales history found for this product</p>
              </div>
            ) : (
              <div className="border border-[#c3c6d5] rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-[#f2f4f6] border-b border-[#c3c6d5]">
                  <h4 className="text-[13px] font-bold text-[#003c90]">Last 50 Sales</h4>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#f7f9fb] sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-[11px] font-bold text-[#434653] uppercase tracking-wider">Invoice</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-[#434653] uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-[#434653] uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-[#434653] uppercase tracking-wider text-right">Qty</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-[#434653] uppercase tracking-wider text-right">Price</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-[#434653] uppercase tracking-wider text-right">Total</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-[#434653] uppercase tracking-wider">Cashier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eceef0]">
                      {itemHistory.history.map((sale, idx) => (
                        <tr key={idx} className="hover:bg-[#f7f9fb] transition-colors">
                          <td className="px-4 py-3 text-[12px] font-mono font-semibold text-[#003c90]">{sale.invoice_no}</td>
                          <td className="px-4 py-3 text-[11px] text-[#434653]">{formatDate(sale.sale_date)}</td>
                          <td className="px-4 py-3 text-[12px] text-[#191c1e]">{sale.customer_name || 'Walk-in'}</td>
                          <td className="px-4 py-3 text-[12px] font-semibold text-right text-[#003c90]">{sale.qty}</td>
                          <td className="px-4 py-3 text-[12px] font-mono text-right">{fmt(sale.sale_price)}</td>
                          <td className="px-4 py-3 text-[13px] font-mono font-bold text-right text-[#003c90]">{fmt(sale.total)}</td>
                          <td className="px-4 py-3 text-[11px] text-[#737784]">{sale.cashier_name || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
