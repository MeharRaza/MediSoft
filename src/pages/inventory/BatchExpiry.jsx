import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Table, Btn, fmt } from '../../components/ui'

export default function BatchExpiry() {
  const [data, setData]       = useState({ expired: [], expiring30: [], expiring90: [], all: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('all')
  const [search, setSearch]   = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const expiryData = await api.reports.getExpiryReport()
      const allBatches = await api.inventory.getAllBatches()
      setData({
        expired: expiryData?.expired || [],
        expiring30: expiryData?.expiring30 || [],
        expiring90: expiryData?.expiring90 || [],
        all: allBatches || []
      })
    } catch (err) {
      console.error('Error loading batches:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const cols = [
    { key: 'product_name', label: 'Product',    render: v => <span className="text-[12px] font-semibold">{v}</span> },
    { key: 'batch_no',     label: 'Batch #',    mono: true, render: v => <span className="text-[12px] font-mono">{v||'—'}</span> },
    { key: 'expiry_date',  label: 'Expiry Date', render: (v) => {
      if (!v) return '-'
      const days = Math.floor((new Date(v) - new Date()) / 86400000)
      const cls  = days < 0 ? 'text-[#ba1a1a] font-bold' : days < 30 ? 'text-amber-600 font-bold' : days < 180 ? 'text-amber-500' : 'text-green-600'
      return <span className={`text-[12px] font-mono ${cls}`}>{v} {days < 0 ? `(${Math.abs(days)}d ago)` : `(${days}d left)`}</span>
    }},
    { key: 'qty',          label: 'Stock (Pills)', right: true, render: v => <span className="text-[12px] font-mono font-bold text-[#003c90]">{fmt(v)}</span> },
    { key: 'qty_in_boxes', label: 'Boxes', right: true, render: v => <span className="text-[11px] font-mono text-[#737784]">{v || 0}</span> },
    { key: 'qty_loose',    label: 'Loose', right: true, render: v => <span className="text-[11px] font-mono text-[#737784]">{v || 0}</span> },
  ]

  const tabs = [
    { key: 'all',        label: 'All Batches',       count: data.all.length,        color: 'text-[#003c90] bg-blue-50 border-[#003c90]' },
    { key: 'expired',    label: 'Expired',           count: data.expired.length,    color: 'text-[#ba1a1a] bg-red-50 border-[#ba1a1a]' },
    { key: 'expiring30', label: 'Expiring (30 days)', count: data.expiring30.length, color: 'text-amber-700 bg-amber-50 border-amber-500' },
    { key: 'expiring90', label: 'Expiring (6 months)', count: data.expiring90.length, color: 'text-yellow-700 bg-yellow-50 border-yellow-500' },
  ]

  const currentData = data[tab] || []
  
  // Filter by search query
  const filteredData = search.trim() 
    ? currentData.filter(item => 
        (item.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.batch_no || '').toLowerCase().includes(search.toLowerCase())
      )
    : currentData

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader 
        title="Batch & Expiry Management" 
        subtitle="Track product expiry dates and batches"
        actions={
          <Btn variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            {loading && <span className="w-4 h-4 border-2 border-[#003c90]/30 border-t-[#003c90] rounded-full animate-spin" />}
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh
          </Btn>
        }
      />
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 flex items-center gap-3 border-l-4 border-[#003c90]">
            <div className="p-2 bg-blue-50 rounded-lg">
              <span className="material-symbols-outlined text-[20px] text-[#003c90]">inventory_2</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#737784] uppercase">Total Batches</p>
              <p className="text-[26px] font-bold text-[#003c90]">{data.all.length}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3 border-l-4 border-[#ba1a1a]">
            <div className="p-2 bg-red-50 rounded-lg">
              <span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">dangerous</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#737784] uppercase">Expired Items</p>
              <p className="text-[26px] font-bold text-[#ba1a1a]">{data.expired.length}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3 border-l-4 border-amber-500">
            <div className="p-2 bg-amber-50 rounded-lg">
              <span className="material-symbols-outlined text-[20px] text-amber-600]">warning</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#737784] uppercase">Expiring (30d)</p>
              <p className="text-[26px] font-bold text-amber-700">{data.expiring30.length}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3 border-l-4 border-yellow-500">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <span className="material-symbols-outlined text-[20px] text-yellow-600]">event_busy</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#737784] uppercase">Expiring (6mo)</p>
              <p className="text-[26px] font-bold text-yellow-700">{data.expiring90.length}</p>
            </div>
          </Card>
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center gap-4">
          <div className="flex gap-2 flex-1">
            {tabs.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-lg border text-[12px] font-bold transition-all ${tab === t.key ? t.color : 'bg-white border-[#c3c6d5] text-[#434653] hover:border-[#003c90]/50'}`}>
              {t.label} <span className="ml-1 px-1.5 py-0.5 bg-white/50 rounded text-[11px]">{t.count}</span>
            </button>)}
          </div>
          
          {/* Search Field */}
          <div className="relative w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737784] text-[16px]">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by product name or batch..."
              className="w-full pl-9 pr-3 py-2 border border-[#c3c6d5] rounded-lg text-[12px] bg-white focus:border-[#003c90] transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#f2f4f6] rounded"
              >
                <span className="material-symbols-outlined text-[16px] text-[#737784]">close</span>
              </button>
            )}
          </div>
        </div>

        <Card>
          {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div>
            : <Table columns={cols} data={filteredData} emptyMsg={search ? `No results found for "${search}"` : (tab === 'all' ? 'No batches found' : `No ${tab === 'expired' ? 'expired' : 'expiring'} items found`)} />}
        </Card>
      </div>
    </div>
  )
}
