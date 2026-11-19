import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Select, Badge, Table, fmt, today } from '../../components/ui'

function monthStart() { 
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` 
}

export default function SalesReport() {
  const [activeTab, setActiveTab] = useState('sales') // 'sales' | 'logs'
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [fromDate, setFromDate] = useState(monthStart())
  const [toDate, setToDate]     = useState(today())

  // Activity Logs State
  const [logs, setLogs]             = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [logAction, setLogAction]   = useState('')
  const [logSearch, setLogSearch]   = useState('')

  useEffect(() => { 
    if (activeTab === 'sales') {
      fetchReport() 
    } else {
      fetchLogs()
    }
  }, [activeTab])

  const fetchReport = async () => {
    setLoading(true)
    try { 
      const d = await api.reports.getSalesSummary({ from_date: fromDate, to_date: toDate })
      setData(d) 
    } catch (e) { 
      console.error(e) 
    } finally { 
      setLoading(false) 
    }
  }

  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const l = await api.reports.getActivityLogs({ 
        from_date: fromDate, 
        to_date: toDate, 
        action: logAction || undefined,
        search: logSearch || undefined
      })
      setLogs(Array.isArray(l) ? l : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingLogs(false)
    }
  }

  const maxDaily = Math.max(...(data?.daily?.map(d => d.total)||[1]), 1)

  const topProductCols = [
    { key: 'name',       label: 'Product',    render: v => <span className="text-[12px] font-semibold">{v}</span> },
    { key: 'qty_sold',   label: 'Qty Sold',   right: true, render: v => <span className="font-mono text-[12px]">{fmt(v)}</span> },
    { key: 'total_sales',label: 'Total Sales', right: true, render: v => <span className="font-mono font-bold text-[12px] text-[#003c90]">PKR {fmt(v)}</span> },
  ]

  const cashierCols = [
    { 
      key: 'cashier_name', 
      label: 'Cashier / Counter User', 
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#003c90]">person</span>
          <div>
            <div className="font-bold text-[13px] text-[#191c1e]">{v || 'Administrator'}</div>
            <div className="text-[10px] uppercase font-semibold text-[#737784] tracking-wider">{row.role || 'Cashier'}</div>
          </div>
        </div>
      ) 
    },
    { 
      key: 'total_invoices', 
      label: 'Bills Count', 
      right: true, 
      render: v => <span className="font-mono font-semibold text-[12px]">{v}</span> 
    },
    { 
      key: 'cash_collected', 
      label: 'Cash In Hand', 
      right: true, 
      render: v => <span className="font-mono text-[12px] text-green-700 font-bold">PKR {fmt(v)}</span> 
    },
    { 
      key: 'credit_sales', 
      label: 'Credit Sales', 
      right: true, 
      render: v => <span className="font-mono text-[12px] text-amber-700">PKR {fmt(v)}</span> 
    },
    { 
      key: 'total_discount', 
      label: 'Discounts', 
      right: true, 
      render: v => <span className="font-mono text-[12px] text-red-600">- PKR {fmt(v)}</span> 
    },
    { 
      key: 'total_sales', 
      label: 'Total Sales Revenue', 
      right: true, 
      render: v => <span className="font-mono font-black text-[13px] text-[#003c90]">PKR {fmt(v)}</span> 
    },
  ]

  const actionBadge = (action) => {
    switch (action) {
      case 'SALE_CREATED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
          <span className="material-symbols-outlined text-[12px]">point_of_sale</span> SALE
        </span>
      case 'SALE_RETURNED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
          <span className="material-symbols-outlined text-[12px]">keyboard_return</span> RETURN
        </span>
      case 'STOCK_ADJUSTED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="material-symbols-outlined text-[12px]">tune</span> STOCK
        </span>
      case 'SETTINGS_UPDATED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="material-symbols-outlined text-[12px]">settings</span> CONFIG
        </span>
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-50 text-gray-700 border border-gray-200">
          {action}
        </span>
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader 
        title="Reports & Audit Center" 
        subtitle="Detailed sales analysis, cashier breakdown, and system audit logs" 
      />

      {/* Tabs */}
      <div className="px-5 pt-3 border-b border-[#c3c6d5] bg-white flex gap-6">
        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-3 text-[13px] font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'sales'
              ? 'border-[#003c90] text-[#003c90]'
              : 'border-transparent text-[#737784] hover:text-[#191c1e]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">analytics</span>
          Sales & Cashier Breakdown
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 text-[13px] font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'logs'
              ? 'border-[#003c90] text-[#003c90]'
              : 'border-transparent text-[#737784] hover:text-[#191c1e]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">history</span>
          Cashier Activity & Audit Logs
        </button>
      </div>

      <div className="p-5 space-y-5 flex-1 overflow-auto">
        {/* Date Filter Bar */}
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <Input label="From Date" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
            <Input label="To Date"   type="date" value={toDate}   onChange={e => setToDate(e.target.value)}   className="w-40" />
            {activeTab === 'logs' && (
              <>
                <Select
                  label="Filter Action"
                  value={logAction}
                  onChange={e => setLogAction(e.target.value)}
                  className="w-44"
                  options={[
                    { value: '', label: 'All Actions' },
                    { value: 'SALE_CREATED', label: 'Sales (Created)' },
                    { value: 'SALE_RETURNED', label: 'Returns' },
                    { value: 'STOCK_ADJUSTED', label: 'Stock Adjustments' },
                    { value: 'SETTINGS_UPDATED', label: 'Settings Modified' },
                  ]}
                />
                <Input
                  label="Search Details"
                  placeholder="Invoice #, username..."
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  className="w-52"
                />
              </>
            )}
            <Btn variant="primary" onClick={activeTab === 'sales' ? fetchReport : fetchLogs} className="mt-auto">
              <span className="material-symbols-outlined text-[16px]">filter_list</span>
              Apply Filter
            </Btn>
          </div>
        </Card>

        {activeTab === 'sales' ? (
          loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" />
            </div>
          ) : data && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 flex items-center gap-3 border-l-4 border-[#003c90]"><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Invoices</p><p className="text-[26px] font-bold text-[#003c90]">{data.summary.total_invoices}</p></div></Card>
                <Card className="p-4 flex items-center gap-3 border-l-4 border-green-500"><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Sales</p><p className="text-[26px] font-bold text-green-700">PKR {fmt(data.summary.total_sales)}</p></div></Card>
                <Card className="p-4 flex items-center gap-3 border-l-4 border-blue-500"><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Cash Sales</p><p className="text-[26px] font-bold text-blue-700">PKR {fmt(data.summary.cash_sales)}</p></div></Card>
                <Card className="p-4 flex items-center gap-3 border-l-4 border-amber-500"><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Credit Sales</p><p className="text-[26px] font-bold text-amber-700">PKR {fmt(data.summary.credit_sales)}</p></div></Card>
                <Card className="p-4 flex items-center gap-3 border-l-4 border-red-400"><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Discount</p><p className="text-[26px] font-bold text-red-600">PKR {fmt(data.summary.total_discount)}</p></div></Card>
                <Card className="p-4 flex items-center gap-3 border-l-4 border-teal-500"><div><p className="text-[11px] font-semibold text-[#737784] uppercase">Total Tax</p><p className="text-[26px] font-bold text-teal-700">PKR {fmt(data.summary.total_tax)}</p></div></Card>
              </div>

              {/* Cashier / Counter Sales Breakdown Table */}
              <Card>
                <div className="px-5 py-3 border-b border-[#c3c6d5] flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-bold text-[#003c90] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
                      Cashier & Terminal Sales Performance
                    </h3>
                    <p className="text-[11px] text-[#737784]">Live sales, cash collected, and discount breakdown per cashier user</p>
                  </div>
                </div>
                <Table 
                  columns={cashierCols} 
                  data={data.byCashier || []} 
                  emptyMsg="No cashier sales recorded in this date range" 
                />
              </Card>

              {/* Daily Chart */}
              {data.daily?.length > 0 && (
                <Card className="p-5">
                  <h3 className="text-[15px] font-bold text-[#003c90] mb-4">Daily Sales Trend</h3>
                  <div className="flex items-end gap-2 h-32 mb-3">
                    {data.daily.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className="w-full bg-[#003c90]/20 hover:bg-[#003c90] rounded-t transition-colors" 
                          style={{ height: `${Math.max((d.total/maxDaily)*100, 4)}%` }} 
                          title={`PKR ${fmt(d.total)}`} 
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {data.daily.map((d, i) => (
                      <div key={i} className="flex-1 text-center">
                        <span className="text-[9px] text-[#737784]">{new Date(d.day).getDate()}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Top 10 Products */}
              {data.topProducts?.length > 0 && (
                <Card>
                  <div className="px-5 py-3 border-b border-[#c3c6d5]">
                    <h3 className="text-[15px] font-bold text-[#003c90]">Top 10 Fast-Selling Products</h3>
                  </div>
                  <Table columns={topProductCols} data={data.topProducts} emptyMsg="No product data" />
                </Card>
              )}
            </>
          )
        ) : (
          /* Activity & Audit Logs Tab */
          <Card>
            <div className="px-5 py-3 border-b border-[#c3c6d5] flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-[#003c90] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">manage_history</span>
                  Cashier & Admin Audit Log Stream
                </h3>
                <p className="text-[11px] text-[#737784]">Real-time chronological trace of sales, returns, stock adjustments, and settings</p>
              </div>
              <span className="text-[12px] font-semibold text-[#737784]">
                Total Records: <strong className="text-[#191c1e]">{logs.length}</strong>
              </span>
            </div>

            {loadingLogs ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-[#737784] text-[13px]">
                No activity logs found for the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#f2f4f6] text-[11px] font-bold text-[#434653] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Cashier / User</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Details / Activity Description</th>
                      <th className="px-4 py-3">Terminal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eceef0] text-[12px]">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#f7f9fb]">
                        <td className="px-4 py-3 whitespace-nowrap text-[#737784] font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-bold text-[#191c1e]">{log.username || 'System'}</span>
                          <span className="ml-1.5 text-[10px] text-[#737784] uppercase">({log.role || 'cashier'})</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {actionBadge(log.action)}
                        </td>
                        <td className="px-4 py-3 text-[#191c1e] font-medium max-w-md">
                          {log.details}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[#737784] text-[11px]">
                          {log.counter_name || 'Main Server'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
