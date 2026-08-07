import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Table, Btn, fmt } from '../../components/ui'

export default function BatchExpiry() {
  const [data, setData]       = useState({ expired: [], expiring30: [], expiring90: [], all: [] })
  const [loading, setLoading] = useState(false)
  const [tab, setTab]         = useState('all')
  const [search, setSearch]   = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  
  // Autocomplete dropdown
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef(null)
  const dropdownRef = useRef(null)

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex]
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  // Fetch suggestions for autocomplete
  const fetchSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    
    try {
      const results = await api.inventory.getProducts({ search: query, loadAll: true })
      setSuggestions(results.slice(0, 10))
      setShowDropdown(results.length > 0)
    } catch (err) {
      console.error('Error fetching suggestions:', err)
    }
  }

  const handleSearchChange = (value) => {
    setSearch(value)
    fetchSuggestions(value)
    setSelectedIndex(-1)
  }

  const handleSelectSuggestion = (product) => {
    setSearch(product.name)
    setSuggestions([])
    setShowDropdown(false)
    fetchDataWithQuery(product.name)
  }

  const fetchDataWithQuery = async (query) => {
    if (!query.trim()) {
      console.log('⚠️ No search query - skipping API call')
      return
    }
    
    setLoading(true)
    setHasSearched(true)
    try {
      const expiryData = await api.reports.getExpiryReport({ search: query.trim() })
      const allBatches = await api.inventory.getAllBatches({ search: query.trim() })
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

  const fetchData = async () => {
    fetchDataWithQuery(search)
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelectSuggestion(suggestions[selectedIndex])
      } else {
        fetchData()
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const handleRefresh = () => {
    setSearch('')
    setData({ expired: [], expiring30: [], expiring90: [], all: [] })
    setHasSearched(false)
    setSuggestions([])
    setShowDropdown(false)
  }

  useEffect(() => {
    console.log('🔧 [BatchExpiry Page] Mounting - NOT loading data automatically')
    setData({ expired: [], expiring30: [], expiring90: [], all: [] })
    setHasSearched(false)
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
          hasSearched && (
            <Btn variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              {loading && <span className="w-4 h-4 border-2 border-[#003c90]/30 border-t-[#003c90] rounded-full animate-spin" />}
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Refresh
            </Btn>
          )
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
          <div className="relative w-80" ref={searchRef}>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737784] text-[16px]">search</span>
            <input
              type="text"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search product name..."
              className="w-full pl-9 pr-3 py-2 border border-[#c3c6d5] rounded-lg text-[12px] bg-white focus:border-[#003c90] transition-colors"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('')
                  setSuggestions([])
                  setShowDropdown(false)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#f2f4f6] rounded"
              >
                <span className="material-symbols-outlined text-[16px] text-[#737784]">close</span>
              </button>
            )}
            
            {/* Autocomplete Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#c3c6d5] rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                {suggestions.map((product, idx) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectSuggestion(product)}
                    className={`w-full px-3 py-2 text-left hover:bg-[#f7f9fb] border-b border-[#eceef0] last:border-b-0 transition-colors ${
                      idx === selectedIndex ? 'bg-[#e3f2fd]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[12px] font-semibold text-[#003c90]">{product.name}</p>
                        <p className="text-[10px] text-[#737784]">{product.company_name || product.generic_name || 'No company'}</p>
                      </div>
                      <p className={`text-[11px] font-bold ${product.stock > 0 ? 'text-[#006a6a]' : 'text-[#ba1a1a]'}`}>
                        Stock: {product.stock || 0}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <Btn variant="primary" size="sm" onClick={fetchData}>
            <span className="material-symbols-outlined text-[14px]">search</span>Search
          </Btn>
          
          {hasSearched && (
            <Btn variant="outline" size="sm" onClick={handleRefresh}>
              <span className="material-symbols-outlined text-[14px]">refresh</span>Clear
            </Btn>
          )}
        </div>

        <Card>
          {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div>
          : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="material-symbols-outlined text-[64px] text-[#c3c6d5] mb-4">inventory_2</span>
              <p className="text-[14px] font-semibold text-[#434653] mb-2">Search for Product Batches</p>
              <p className="text-[12px] text-[#737784]">Enter product name in search field and press Enter or click Search</p>
            </div>
          )
            : <Table columns={cols} data={filteredData} emptyMsg={search ? `No results found for "${search}"` : (tab === 'all' ? 'No batches found' : `No ${tab === 'expired' ? 'expired' : 'expiring'} items found`)} />}
        </Card>
      </div>
    </div>
  )
}
