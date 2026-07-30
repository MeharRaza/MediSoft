import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Table, fmt } from '../../components/ui'

export default function SalesReturn() {
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [returnItems, setReturnItems] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState(null)
  const [returns, setReturns] = useState([])

  useEffect(() => { api.sales.getReturns().then(d => setReturns(Array.isArray(d) ? d : [])) }, [])

  useEffect(() => {
    if (!invoiceSearch.trim()) { setSearchResults([]); return }
    const t = setTimeout(() => { api.sales.getInvoices({ search: invoiceSearch, limit: 10 }).then(d => setSearchResults(Array.isArray(d) ? d : [])) }, 300)
    return () => clearTimeout(t)
  }, [invoiceSearch])

  const selectInvoice = async (inv) => {
    setSearchResults([])
    setInvoiceSearch(inv.invoice_no)
    const full = await api.sales.getInvoiceById(inv.id)
    const invoice = full || inv
    setSelectedInvoice(invoice)
    setReturnItems((invoice.items || []).map(item => ({ 
      ...item, 
      return_qty: 0, 
      reason: 'Customer Request', 
      max_qty: Number(item.qty) || 0 
    })))
  }

  const updateItem = (idx, field, value) => {
    const updated = [...returnItems]; updated[idx][field] = value; setReturnItems(updated)
  }

  const totalReturn = returnItems.reduce((s, item) => {
    const qty = parseFloat(item.return_qty) || 0
    return s + qty * (item.sale_price || 0) * (1 - (item.discount_percent || 0) / 100)
  }, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const items = returnItems.filter(i => parseFloat(i.return_qty) > 0)
    if (!selectedInvoice) return setMsg({ type: 'error', text: 'Select an invoice first.' })
    if (items.length === 0) return setMsg({ type: 'error', text: 'Enter return qty for at least one item.' })
    setSubmitting(true); setMsg(null)
    try {
      await api.sales.createReturn({ 
        sale_id: selectedInvoice.id, 
        customer_id: selectedInvoice.customer_id, 
        total: totalReturn, 
        items: items.map(i => ({ 
          product_id: i.product_id, 
          batch_id: i.batch_id, 
          purchase_item_id: i.purchase_item_id, // Include purchase_item_id for stock return
          qty: parseFloat(i.return_qty), 
          price: i.sale_price, 
          total: parseFloat(i.return_qty) * i.sale_price * (1 - (i.discount_percent||0)/100) 
        })) 
      })
      setMsg({ type: 'success', text: 'Return processed successfully.' })
      setSelectedInvoice(null); setReturnItems([]); setInvoiceSearch('')
      api.sales.getReturns().then(d => setReturns(Array.isArray(d) ? d : []))
    } catch (err) { setMsg({ type: 'error', text: 'Error: ' + err.message }) }
    finally { setSubmitting(false) }
  }

  const returnsCols = [
    { key: 'id',            label: 'Return #', mono: true, render: v => <span className="font-mono text-[#003c90] font-bold text-[12px]">RET-{v}</span> },
    { key: 'customer_name', label: 'Customer', render: v => <span className="text-[12px]">{v || 'Walk-in'}</span> },
    { key: 'total',         label: 'Amount', right: true, render: v => <span className="font-mono font-bold text-red-600 text-[12px]">PKR {fmt(v)}</span> },
    { key: 'created_at',    label: 'Date', render: v => <span className="text-[11px] text-[#737784]">{v ? new Date(v).toLocaleDateString() : '-'}</span> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Sales Return" subtitle="Process returns against existing invoices" />
      <div className="p-5 space-y-5 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          <span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>{msg.text}
          <button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button>
        </div>}
        <Card>
          <div className="px-5 py-4 border-b border-[#c3c6d5]"><h3 className="text-[15px] font-bold text-[#003c90]">New Return</h3></div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Search Invoice</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737784] text-[16px]">search</span>
                  <input type="text" value={invoiceSearch} onChange={e => { setInvoiceSearch(e.target.value); setSelectedInvoice(null) }} placeholder="Search by Invoice#, Customer, or Product name..."
                    className="w-full pl-9 pr-3 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[13px] focus:border-[#003c90]" />
                  {searchResults.length > 0 && <div className="absolute top-full left-0 right-0 bg-white border border-[#c3c6d5] rounded-lg shadow-xl z-30 max-h-64 overflow-y-auto">
                    {searchResults.map(inv => {
                      // Database stores UTC time, need to convert to local
                      // SQLite datetime('now') returns UTC in format: YYYY-MM-DD HH:MM:SS
                      // Add 'Z' to indicate UTC, then JS will convert to local automatically
                      const saleDate = inv.created_at ? new Date(inv.created_at.replace(' ', 'T') + 'Z') : null
                      const dateStr = saleDate ? saleDate.toLocaleDateString() : '-'
                      const timeStr = saleDate ? saleDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'
                      
                      return <button key={inv.id} onClick={() => selectInvoice(inv)} className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#f2f4f6] border-b border-[#eceef0] last:border-0">
                        <div className="flex-1">
                          <p className="text-[12px] font-bold text-[#003c90]">{inv.invoice_no}</p>
                          <p className="text-[11px] text-[#737784]">👤 {inv.customer_name || 'Walk-in'}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] text-[#737784]">📅 {dateStr}</p>
                            <p className="text-[10px] text-[#737784]">🕐 {timeStr}</p>
                            {inv.items_count && <p className="text-[10px] text-green-700 font-semibold">📦 {inv.items_count} item{inv.items_count !== 1 ? 's' : ''}</p>}
                          </div>
                        </div>
                        <span className="text-[12px] font-mono font-bold text-right">PKR {fmt(inv.grand_total)}</span>
                      </button>
                    })}
                  </div>}
                </div>
              </div>
              {selectedInvoice && <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-[12px] font-bold text-[#003c90]">{selectedInvoice.invoice_no}</p>
                <p className="text-[11px] text-[#737784]">Customer: {selectedInvoice.customer_name || 'Walk-in'}</p>
                <p className="text-[11px] text-[#737784]">Total: PKR {fmt(selectedInvoice.grand_total)}</p>
              </div>}
            </div>
            {selectedInvoice && returnItems.length > 0 && <form onSubmit={handleSubmit}>
              <div className="border border-[#c3c6d5] rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-[#f2f4f6] border-b border-[#c3c6d5]">
                    {['Product','Orig Qty','Price','Return Qty','Return Amt'].map(h => <th key={h} className={`px-3 py-2.5 text-[11px] font-bold text-[#434653] uppercase tracking-wider ${['Orig Qty','Price','Return Qty','Return Amt'].includes(h) ? 'text-right' : ''}`}>{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-[#eceef0]">
                    {returnItems.map((item, idx) => {
                      const retAmt = (parseFloat(item.return_qty)||0) * (item.sale_price||0) * (1-(item.discount_percent||0)/100)
                      return <tr key={idx} className="hover:bg-[#f7f9fb]">
                        <td className="px-3 py-2 text-[12px] font-semibold">{item.product_name}</td>
                        <td className="px-3 py-2 text-right text-[12px] font-mono">{item.max_qty}</td>
                        <td className="px-3 py-2 text-right text-[12px] font-mono">{fmt(item.sale_price)}</td>
                        <td className="px-3 py-2 text-right"><input type="number" value={item.return_qty} min="0" max={item.max_qty}
                          onChange={e => updateItem(idx, 'return_qty', Math.min(parseFloat(e.target.value)||0, item.max_qty))}
                          className="w-20 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90]" /></td>
                        <td className="px-3 py-2 text-right text-[12px] font-mono font-bold text-red-600">{retAmt > 0 ? `PKR ${fmt(retAmt)}` : '-'}</td>
                      </tr>
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-[11px] font-semibold text-[#737784]">Total Return Amount</p><p className="text-[20px] font-bold text-red-700 font-mono">PKR {fmt(totalReturn)}</p></div>
                <Btn type="submit" variant="danger" size="lg" disabled={submitting || totalReturn === 0}>
                  {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span className="material-symbols-outlined text-[18px]">undo</span>Process Return
                </Btn>
              </div>
            </form>}
            {!selectedInvoice && <div className="py-10 text-center"><span className="material-symbols-outlined text-[48px] text-[#c3c6d5] block mb-2">search</span><p className="text-[13px] text-[#737784]">Search and select an invoice to begin return process</p></div>}
          </div>
        </Card>
        <Card>
          <div className="px-5 py-3 border-b border-[#c3c6d5]"><h3 className="text-[15px] font-bold text-[#003c90]">Returns History</h3></div>
          <Table columns={returnsCols} data={returns} emptyMsg="No returns processed yet" />
        </Card>
      </div>
    </div>
  )
}
