import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Select, Table, Modal, SearchInput, fmt, today } from '../../components/ui'

function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }

export default function PurchaseHistory() {
  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState(monthStart())
  const [toDate, setToDate] = useState(today())
  const [supplierId, setSupplierId] = useState('')
  const [search, setSearch] = useState('')
  const [viewPurchase, setViewPurchase] = useState(null)
  const [msg, setMsg] = useState(null)

  useEffect(() => { api.purchase.getSuppliers().then(s => setSuppliers(Array.isArray(s) ? s : [])); fetchPurchases() }, [])

  const fetchPurchases = async () => {
    console.log('🔍 [Frontend] Fetching purchases with filters:', { 
      from_date: fromDate, 
      to_date: toDate, 
      supplier_id: supplierId || undefined, 
      search: search || undefined 
    })
    setLoading(true)
    try { 
      const d = await api.purchase.getPurchases({ 
        from_date: fromDate, 
        to_date: toDate, 
        supplier_id: supplierId || undefined, 
        search: search || undefined 
      })
      console.log('✅ [Frontend] Received purchases:', d.length)
      setPurchases(Array.isArray(d) ? d : []) 
    }
    catch (e) { setMsg({ type: 'error', text: e.message }) }
    finally { setLoading(false) }
  }

  const viewDetail = async (row) => {
    const full = await api.purchase.getPurchaseById(row.id)
    setViewPurchase(full || row)
  }

  const totalAmount = purchases.reduce((s, p) => s + (Number(p.grand_total)||0), 0)
  const supplierOpts = [{ value: '', label: 'All Suppliers' }, ...suppliers.map(s => ({ value: String(s.id), label: s.name }))]

  const cols = [
    { key: 'invoice_no',    label: 'Invoice #', mono: true, render: v => <span className="font-mono font-semibold text-[#003c90] text-[12px]">{v}</span> },
    { key: 'supplier_name', label: 'Supplier',  render: v => <span className="text-[12px]">{v||'—'}</span> },
    { key: 'sub_total',     label: 'Sub Total', right: true, render: v => <span className="font-mono text-[12px]">PKR {fmt(v)}</span> },
    { key: 'grand_total',   label: 'Grand Total', right: true, render: v => <span className="font-mono font-bold text-[12px]">PKR {fmt(v)}</span> },
    { key: 'payment_method',label: 'Payment',   render: v => <span className="capitalize text-[12px]">{v}</span> },
    { key: 'created_at',    label: 'Date',       render: v => <span className="text-[11px] text-[#737784]">{v ? new Date(v).toLocaleDateString() : '-'}</span> },
    { key: 'id',            label: 'Actions',    render: (_, row) => <Btn size="sm" variant="outline" onClick={() => viewDetail(row)}><span className="material-symbols-outlined text-[14px]">visibility</span>View</Btn> },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Purchase History" subtitle="View all purchase invoices" actions={<Btn variant="primary" onClick={fetchPurchases}><span className="material-symbols-outlined text-[16px]">refresh</span>Refresh</Btn>} />
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {msg && <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold bg-red-50 text-[#ba1a1a] border border-red-200"><span className="material-symbols-outlined text-[18px]">error</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-[#003c90]">shopping_cart</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Purchases</p><p className="text-[22px] font-bold text-[#003c90]">{purchases.length}</p></div></Card>
          <Card className="p-4 flex items-center gap-3"><div className="p-2 bg-teal-50 rounded-lg"><span className="material-symbols-outlined text-[20px] text-teal-600">payments</span></div><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Amount</p><p className="text-[22px] font-bold text-teal-700">PKR {fmt(totalAmount)}</p></div></Card>
        </div>
        <Card className="p-4"><div className="flex flex-wrap items-end gap-3">
          <div className="relative">
            <SearchInput 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  fetchPurchases()
                }
              }}
              placeholder="Search invoice#, supplier, or product name..." 
              className="w-64" 
            />
          </div>
          <Input label="From Date" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
          <Input label="To Date"   type="date" value={toDate}   onChange={e => setToDate(e.target.value)}   className="w-40" />
          <Select label="Supplier" value={supplierId} onChange={e => setSupplierId(e.target.value)} options={supplierOpts} className="w-48" />
          <Btn variant="primary" onClick={fetchPurchases} className="mt-auto"><span className="material-symbols-outlined text-[16px]">filter_list</span>Apply</Btn>
        </div></Card>
        <Card>{loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div> : <Table columns={cols} data={purchases} emptyMsg="No purchases found" />}</Card>
      </div>
      <Modal open={!!viewPurchase} onClose={() => setViewPurchase(null)} title={`Purchase — ${viewPurchase?.invoice_no||''}`} width="max-w-2xl">
        {viewPurchase && <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-[#f7f9fb] rounded-lg border border-[#c3c6d5]">
            <div className="space-y-1.5 text-[12px]"><p><span className="font-semibold text-[#737784]">Invoice: </span><span className="font-mono font-bold text-[#003c90]">{viewPurchase.invoice_no}</span></p><p><span className="font-semibold text-[#737784]">Supplier: </span>{viewPurchase.supplier_name||'—'}</p><p><span className="font-semibold text-[#737784]">Date: </span>{new Date(viewPurchase.created_at).toLocaleString()}</p></div>
            <div className="space-y-1.5 text-[12px]"><p><span className="font-semibold text-[#737784]">Payment: </span><span className="capitalize">{viewPurchase.payment_method}</span></p><p><span className="font-semibold text-[#737784]">Grand Total: </span><span className="font-mono font-bold">PKR {fmt(viewPurchase.grand_total)}</span></p></div>
          </div>
          {viewPurchase.items?.length > 0 && <div className="border border-[#c3c6d5] rounded overflow-hidden"><table className="w-full text-left border-collapse"><thead><tr className="bg-[#f2f4f6] border-b border-[#c3c6d5]">{['Product','Batch','Expiry','Purch P.','Qty','Bonus','Total'].map(h => <th key={h} className={`px-3 py-2 text-[11px] font-bold text-[#434653] uppercase tracking-wider ${['Purch P.','Qty','Bonus','Total'].includes(h)?'text-right':''}`}>{h}</th>)}</tr></thead><tbody className="divide-y divide-[#eceef0]">{viewPurchase.items.map((item, i) => <tr key={i}><td className="px-3 py-2 text-[12px]">{item.product_name}</td><td className="px-3 py-2 text-[12px] font-mono">{item.batch_no||'—'}</td><td className="px-3 py-2 text-[12px]">{item.expiry_date||'—'}</td><td className="px-3 py-2 text-right text-[12px] font-mono">{fmt(item.purchase_price)}</td><td className="px-3 py-2 text-right text-[12px] font-mono">{item.qty}</td><td className="px-3 py-2 text-right text-[12px] font-mono">{item.bonus||0}</td><td className="px-3 py-2 text-right text-[12px] font-mono font-bold text-[#003c90]">PKR {fmt(item.total)}</td></tr>)}</tbody></table></div>}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#c3c6d5]"><Btn variant="outline" onClick={() => setViewPurchase(null)}>Close</Btn><Btn variant="primary"><span className="material-symbols-outlined text-[15px]">print</span>Print</Btn></div>
        </div>}
      </Modal>
    </div>
  )
}
