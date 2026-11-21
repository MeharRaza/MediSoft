import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Select, Table, SearchInput, fmt } from '../../components/ui'

export default function StockReport() {
  const [data, setData] = useState({ products: [], totalValue: 0 })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [search, setSearch] = useState('')
  const [stockStatus, setStockStatus] = useState('all') // all, low, out, in
  
  // Pagination State
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  useEffect(() => {
    api.inventory.getCategories().then(c => setCategories(Array.isArray(c) ? c : []))
    fetchReport()
  }, [])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const d = await api.reports.getStockReport({ category_id: categoryId || undefined })
      setData(d || { products: [], totalValue: 0 })
      setPage(1)
    } catch (e) {
      console.error('[StockReport] Error fetching report:', e)
    } finally {
      setLoading(false)
    }
  }

  // Filtered dataset
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.products.filter(p => {
      // 1. Search term match (Name, Generic Name, Barcode)
      if (q) {
        const matchesName = (p.name || '').toLowerCase().includes(q)
        const matchesGeneric = (p.generic_name || '').toLowerCase().includes(q)
        const matchesBarcode = (p.barcode || '').toLowerCase().includes(q)
        if (!matchesName && !matchesGeneric && !matchesBarcode) return false
      }

      // 2. Stock level status filter
      const stock = Number(p.stock) || 0
      const alert = Number(p.alert_qty) || 0
      if (stockStatus === 'low') {
        if (!(stock <= alert && stock > 0)) return false
      } else if (stockStatus === 'out') {
        if (stock > 0) return false
      } else if (stockStatus === 'in') {
        if (stock <= alert) return false
      }

      return true
    })
  }, [data.products, search, stockStatus])

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [search, stockStatus, categoryId])

  // Calculate Accurate KPI Totals (across all filtered products)
  const totalStockCount = filteredProducts.length
  const lowStockCount = filteredProducts.filter(p => (Number(p.stock) || 0) <= (Number(p.alert_qty) || 0) && (Number(p.stock) || 0) > 0).length
  const outOfStockCount = filteredProducts.filter(p => (Number(p.stock) || 0) <= 0).length
  const totalStockUnits = filteredProducts.reduce((s, p) => s + (Number(p.stock) || 0), 0)
  const totalStockValue = filteredProducts.reduce((s, p) => s + (Number(p.stock_value) || 0), 0)

  // Smart Pagination Slice
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filteredProducts.length / Number(pageSize)) || 1
  const paginatedProducts = useMemo(() => {
    if (pageSize === 'all') return filteredProducts
    const size = Number(pageSize) || 50
    const start = (page - 1) * size
    return filteredProducts.slice(start, start + size)
  }, [filteredProducts, page, pageSize])

  // CSV Export
  const handleExportCSV = () => {
    if (filteredProducts.length === 0) return
    const headers = ['Product Name', 'Generic Name', 'Barcode', 'Category', 'Stock Qty', 'Alert Qty', 'Sale Price (PKR)', 'Trade Price (PKR)', 'Stock Value (PKR)']
    const rows = filteredProducts.map(p => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.generic_name || '').replace(/"/g, '""')}"`,
      `"${(p.barcode || '').replace(/"/g, '""')}"`,
      `"${(p.category_name || '').replace(/"/g, '""')}"`,
      fmt(p.stock),
      fmt(p.alert_qty),
      fmt(p.sale_price),
      fmt(p.trade_price),
      fmt(p.stock_value)
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Stock_Report_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const catOpts = [
    { value: '', label: 'All Categories' },
    ...categories.map(c => ({ value: String(c.id), label: c.name }))
  ]

  const statusOpts = [
    { value: 'all', label: 'All Stock Levels' },
    { value: 'in', label: 'Healthy Stock (> Alert)' },
    { value: 'low', label: 'Low Stock Alert (<= Alert)' },
    { value: 'out', label: 'Out of Stock (<= 0)' },
  ]

  const cols = [
    {
      key: 'name',
      label: 'Product',
      render: (v, row) => (
        <div>
          <div className="text-[12px] font-semibold text-[#003c90]">{v}</div>
          {row.generic_name && (
            <div className="text-[10px] text-[#737784] font-medium">{row.generic_name}</div>
          )}
        </div>
      )
    },
    {
      key: 'category_name',
      label: 'Category',
      render: v => <span className="px-2 py-0.5 bg-[#eceef0] text-[#434653] rounded text-[10px] font-bold">{v || '—'}</span>
    },
    {
      key: 'stock',
      label: 'Stock Qty',
      right: true,
      render: (v, row) => {
        const val = Number(v) || 0
        const alert = Number(row.alert_qty) || 0
        const isOut = val <= 0
        const isLow = val <= alert && !isOut
        return (
          <span className={`font-mono font-bold text-[12px] px-2 py-0.5 rounded ${
            isOut ? 'bg-red-100 text-red-700' : isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {fmt(val)}
          </span>
        )
      }
    },
    {
      key: 'alert_qty',
      label: 'Alert Qty',
      right: true,
      render: v => <span className="font-mono text-[12px] text-amber-600 font-semibold">{fmt(v)}</span>
    },
    {
      key: 'sale_price',
      label: 'Sale Price',
      right: true,
      render: v => <span className="font-mono text-[12px] text-[#191c1e]">PKR {fmt(v)}</span>
    },
    {
      key: 'trade_price',
      label: 'Trade Price',
      right: true,
      render: v => <span className="font-mono text-[12px] text-[#434653]">PKR {fmt(v)}</span>
    },
    {
      key: 'stock_value',
      label: 'Stock Value',
      right: true,
      render: v => <span className="font-mono font-bold text-[12px] text-[#003c90]">PKR {fmt(v)}</span>
    },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader
        title="Stock Report"
        subtitle="Current inventory valuation and stock levels"
        actions={
          <div className="flex items-center gap-2">
            <Btn variant="secondary" onClick={handleExportCSV} disabled={filteredProducts.length === 0}>
              <span className="material-symbols-outlined text-[16px]">download</span>Export CSV
            </Btn>
            <Btn variant="primary" onClick={fetchReport}>
              <span className="material-symbols-outlined text-[16px]">refresh</span>Refresh
            </Btn>
          </div>
        }
      />

      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {/* Filter Controls */}
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Search Product</label>
              <SearchInput
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Product name, generic, barcode..."
                className="w-full"
              />
            </div>

            <div className="w-48">
              <Select
                label="Category"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                options={catOpts}
              />
            </div>

            <div className="w-48">
              <Select
                label="Stock Level"
                value={stockStatus}
                onChange={e => setStockStatus(e.target.value)}
                options={statusOpts}
              />
            </div>

            <Btn variant="primary" onClick={fetchReport} className="h-[38px] px-4">
              <span className="material-symbols-outlined text-[16px]">filter_list</span>Apply
            </Btn>

            {(search || categoryId || stockStatus !== 'all') && (
              <Btn
                variant="outline"
                onClick={() => {
                  setSearch('')
                  setCategoryId('')
                  setStockStatus('all')
                }}
                className="h-[38px] px-3 text-[#737784]"
              >
                Clear
              </Btn>
            )}
          </div>
        </Card>

        {/* Accurate Financial & Stock Stat Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-[#003c90] flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <span className="material-symbols-outlined text-[24px] text-[#003c90]">inventory_2</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#737784] uppercase tracking-wide">Total Products</p>
              <p className="text-[24px] font-bold text-[#003c90]">{totalStockCount.toLocaleString()}</p>
              <p className="text-[10px] text-[#737784]">{fmt(totalStockUnits)} total units</p>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-amber-500 flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-xl">
              <span className="material-symbols-outlined text-[24px] text-amber-600">warning</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#737784] uppercase tracking-wide">Low Stock Alert</p>
              <p className="text-[24px] font-bold text-amber-700">{lowStockCount.toLocaleString()}</p>
              <p className="text-[10px] text-amber-600 font-medium">At or below reorder level</p>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-red-500 flex items-center gap-3">
            <div className="p-2.5 bg-red-50 rounded-xl">
              <span className="material-symbols-outlined text-[24px] text-red-600">remove_shopping_cart</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#737784] uppercase tracking-wide">Out of Stock</p>
              <p className="text-[24px] font-bold text-red-700">{outOfStockCount.toLocaleString()}</p>
              <p className="text-[10px] text-red-500 font-medium">Zero or negative inventory</p>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-emerald-600 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <span className="material-symbols-outlined text-[24px] text-emerald-600">account_balance_wallet</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#737784] uppercase tracking-wide">Total Stock Value</p>
              <p className="text-[22px] font-bold text-emerald-700">PKR {fmt(totalStockValue)}</p>
              <p className="text-[10px] text-[#737784]">At purchase trade price</p>
            </div>
          </Card>
        </div>

        {/* Data Table Card with Smart Pagination */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-9 h-9 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" />
              <p className="text-[12px] font-medium text-[#737784]">Calculating stock valuation...</p>
            </div>
          ) : (
            <>
              <Table
                columns={cols}
                data={paginatedProducts}
                emptyMsg="No products match the selected filters"
              />

              {/* Bottom Pagination Bar */}
              <div className="px-5 py-3.5 bg-[#f8fafc] border-t border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#434653]">
                <div className="flex items-center gap-3">
                  <span>
                    Showing <strong className="text-[#191c1e]">{filteredProducts.length === 0 ? 0 : (page - 1) * (pageSize === 'all' ? filteredProducts.length : pageSize) + 1}</strong> to <strong className="text-[#191c1e]">{pageSize === 'all' ? filteredProducts.length : Math.min(page * pageSize, filteredProducts.length)}</strong> of <strong className="text-[#003c90]">{filteredProducts.length.toLocaleString()}</strong> products
                  </span>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1.5">
                    <span>Rows:</span>
                    <select
                      value={pageSize}
                      onChange={e => {
                        setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))
                        setPage(1)
                      }}
                      className="px-2 py-1 border border-[#c3c6d5] rounded bg-white text-[11px] font-bold text-[#191c1e] focus:outline-none focus:ring-1 focus:ring-[#003c90]"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={250}>250</option>
                      <option value="all">All ({filteredProducts.length})</option>
                    </select>
                  </div>
                </div>

                {pageSize !== 'all' && totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className="px-2 py-1 border border-[#c3c6d5] rounded hover:bg-[#f2f4f6] disabled:opacity-40 disabled:hover:bg-white text-[11px] font-bold transition-colors"
                      title="First Page"
                    >
                      « First
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-2.5 py-1 border border-[#c3c6d5] rounded hover:bg-[#f2f4f6] disabled:opacity-40 disabled:hover:bg-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                      Prev
                    </button>

                    <span className="px-3 py-1 bg-blue-50 text-[#003c90] border border-blue-200 font-bold rounded text-[11px]">
                      Page {page} of {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-2.5 py-1 border border-[#c3c6d5] rounded hover:bg-[#f2f4f6] disabled:opacity-40 disabled:hover:bg-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                    >
                      Next
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                      className="px-2 py-1 border border-[#c3c6d5] rounded hover:bg-[#f2f4f6] disabled:opacity-40 disabled:hover:bg-white text-[11px] font-bold transition-colors"
                      title="Last Page"
                    >
                      Last »
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
