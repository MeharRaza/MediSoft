import { useState, useEffect, useMemo } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { PageHeader, Card, StatCard, Btn, Badge, SearchInput } from '../components/ui'

const ACTION_FILTERS = [
  { value: 'ALL', label: 'All Activities' },
  { value: 'SALE_CREATED', label: 'Sales Invoices' },
  { value: 'SALE_RETURNED', label: 'Sales Returns' },
  { value: 'STOCK_ADJUSTED', label: 'Stock Adjustments' },
  { value: 'SETTINGS_UPDATED', label: 'Settings Updates' },
  { value: 'USER_CREATED', label: 'User Operations' }
]

function getTodayStr() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getYesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDaysAgoStr(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMonthStartStr() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

export default function Logs() {
  const currentUser = useAuthStore(s => s.user)

  // Rights evaluation
  const isAdmin = currentUser?.role === 'admin' || Boolean(currentUser?.rights?.all)
  const canViewAll = isAdmin || Boolean(currentUser?.rights?.['logs.view_all'])
  const canViewOwn = isAdmin || Boolean(currentUser?.rights?.['logs.view_own']) || canViewAll

  // Duration Filter defaults to current date (today)
  const [fromDate, setFromDate] = useState(getTodayStr())
  const [toDate, setToDate] = useState(getTodayStr())
  const [actionFilter, setActionFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  // Users & Active Tab
  const [allUsers, setAllUsers] = useState([])
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL', 'admin', 'username'
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch available users for dynamic tabs
  useEffect(() => {
    api.settings.getUsers().then(users => {
      if (Array.isArray(users)) {
        setAllUsers(users)
      }
    }).catch(() => {})
  }, [])

  // If cashier can only view own logs, lock activeTab to their username
  useEffect(() => {
    if (!canViewAll && currentUser?.username) {
      setActiveTab(currentUser.username)
    }
  }, [canViewAll, currentUser])

  // Fetch logs whenever date range or active tab changes
  useEffect(() => {
    fetchLogs()
  }, [fromDate, toDate, activeTab, canViewAll])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const filters = {
        from_date: fromDate,
        to_date: toDate,
        limit: 500
      }

      // Filter by user based on active tab and permissions
      if (!canViewAll) {
        filters.username = currentUser?.username || ''
      } else if (activeTab !== 'ALL') {
        filters.username = activeTab
      }

      const res = await api.reports.getActivityLogs(filters)
      setLogs(Array.isArray(res) ? res : [])
    } catch (err) {
      console.warn('Failed to load activity logs:', err)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  // Filter logs locally for search and action type
  const filteredLogs = useMemo(() => {
    return logs.filter(item => {
      // Action filter
      if (actionFilter !== 'ALL') {
        if (actionFilter === 'USER_CREATED') {
          if (item.action !== 'USER_CREATED' && item.action !== 'USER_UPDATED') return false
        } else if (item.action !== actionFilter) {
          return false
        }
      }

      // Keyword search
      if (search.trim()) {
        const q = search.toLowerCase()
        const text = `${item.username || ''} ${item.action || ''} ${item.details || ''} ${item.counter_name || ''}`.toLowerCase()
        if (!text.includes(q)) return false
      }

      return true
    })
  }, [logs, actionFilter, search])

  // Summary KPIs for current duration & tab
  const stats = useMemo(() => {
    let salesCount = 0
    let salesTotal = 0
    let returnCount = 0
    let returnTotal = 0
    let stockAdjustCount = 0

    filteredLogs.forEach(l => {
      if (l.action === 'SALE_CREATED') {
        salesCount++
        // Try parsing "for PKR 1234" from details
        const match = l.details?.match(/PKR\s*([\d,]+(\.\d+)?)/i)
        if (match && match[1]) {
          salesTotal += parseFloat(match[1].replace(/,/g, '')) || 0
        }
      } else if (l.action === 'SALE_RETURNED') {
        returnCount++
        const match = l.details?.match(/PKR\s*([\d,]+(\.\d+)?)/i)
        if (match && match[1]) {
          returnTotal += parseFloat(match[1].replace(/,/g, '')) || 0
        }
      } else if (l.action === 'STOCK_ADJUSTED') {
        stockAdjustCount++
      }
    })

    return {
      total: filteredLogs.length,
      salesCount,
      salesTotal,
      returnCount,
      returnTotal,
      stockAdjustCount
    }
  }, [filteredLogs])

  // Dynamic Tabs definition
  const tabs = useMemo(() => {
    if (!canViewAll) {
      return [
        {
          id: currentUser?.username || 'me',
          label: currentUser?.full_name ? `${currentUser.full_name} (My Logs)` : 'My Activity Logs',
          role: currentUser?.role || 'cashier',
          icon: 'badge'
        }
      ]
    }

    const t = [
      { id: 'ALL', label: 'All Activity (Overview)', role: 'all', icon: 'list_alt' },
      { id: 'admin', label: 'Admin (Master Server)', role: 'admin', icon: 'shield_person' }
    ]

    // Cashiers
    const cashiers = allUsers.filter(u => u.role === 'cashier' || u.role === 'manager')
    cashiers.forEach(c => {
      if (c.username !== 'admin') {
        t.push({
          id: c.username,
          label: c.full_name || c.username,
          role: c.role,
          icon: 'point_of_sale'
        })
      }
    })

    return t
  }, [canViewAll, allUsers, currentUser])

  const formatTimestamp = (ts) => {
    if (!ts) return '-'
    try {
      const d = new Date(ts.replace(' ', 'T'))
      if (isNaN(d.getTime())) return ts
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return ts
    }
  }

  const formatDate = (ts) => {
    if (!ts) return '-'
    try {
      const d = new Date(ts.replace(' ', 'T'))
      if (isNaN(d.getTime())) return ts
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return ts
    }
  }

  const renderActionBadge = (action) => {
    switch (action) {
      case 'SALE_CREATED':
        return <Badge label="SALE INVOICE" type="success" />
      case 'SALE_RETURNED':
        return <Badge label="SALE RETURN" type="error" />
      case 'STOCK_ADJUSTED':
        return <Badge label="STOCK ADJUSTED" type="warning" />
      case 'SETTINGS_UPDATED':
        return <Badge label="SETTINGS CHANGED" type="info" />
      case 'USER_CREATED':
        return <Badge label="USER CREATED" type="info" />
      case 'USER_UPDATED':
        return <Badge label="USER UPDATED" type="neutral" />
      default:
        return <Badge label={action?.replace(/_/g, ' ') || 'LOG'} type="neutral" />
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader
        title="Activity & Audit Logs"
        subtitle="Track cashier sales performance, stock changes, and system modifications by duration"
        actions={
          <div className="flex items-center gap-2">
            <Btn variant="outline" onClick={fetchLogs} disabled={loading}>
              <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              Refresh Logs
            </Btn>
          </div>
        }
      />

      <div className="p-6 space-y-5 flex-1 overflow-auto max-w-7xl mx-auto w-full">
        {/* User Tabs */}
        <div className="flex items-center gap-2 border-b border-[#c3c6d5] pb-2 overflow-x-auto">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#003c90] text-white shadow-sm'
                    : 'bg-white border border-[#c3c6d5] text-[#434653] hover:bg-slate-100 hover:text-[#191c1e]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.role === 'cashier' && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    Counter
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Duration Calendar & Filter Controls */}
        <Card className="p-4 bg-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Date Calendar Pickers */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[12px] font-bold text-[#737784] uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#003c90]">calendar_today</span>
                Duration:
              </span>

              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="px-3 py-1.5 border border-[#c3c6d5] rounded-lg text-[13px] font-semibold text-[#191c1e] bg-white focus:outline-none focus:ring-2 focus:ring-[#003c90]"
                />
                <span className="text-[12px] font-bold text-[#737784]">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="px-3 py-1.5 border border-[#c3c6d5] rounded-lg text-[13px] font-semibold text-[#191c1e] bg-white focus:outline-none focus:ring-2 focus:ring-[#003c90]"
                />
              </div>

              {/* Quick Duration Preset Buttons */}
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                <button
                  type="button"
                  onClick={() => { setFromDate(getTodayStr()); setToDate(getTodayStr()); }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                    fromDate === getTodayStr() && toDate === getTodayStr()
                      ? 'bg-blue-100 text-[#003c90]'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => { setFromDate(getYesterdayStr()); setToDate(getYesterdayStr()); }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                    fromDate === getYesterdayStr() && toDate === getYesterdayStr()
                      ? 'bg-blue-100 text-[#003c90]'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => { setFromDate(getDaysAgoStr(7)); setToDate(getTodayStr()); }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => { setFromDate(getMonthStartStr()); setToDate(getTodayStr()); }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                >
                  This Month
                </button>
              </div>
            </div>

            {/* Action Type & Search Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="px-3 py-1.5 border border-[#c3c6d5] rounded-lg text-[13px] font-semibold text-[#191c1e] bg-white focus:outline-none focus:ring-2 focus:ring-[#003c90]"
              >
                {ACTION_FILTERS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              <SearchInput
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search details, invoice #..."
                className="w-56"
              />
            </div>
          </div>
        </Card>

        {/* Dynamic Metric Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Activities"
            value={stats.total}
            icon="history_toggle_off"
            color="blue"
            sub={`Events from ${fromDate} to ${toDate}`}
          />
          <StatCard
            label="Sales Generated"
            value={`PKR ${stats.salesTotal.toLocaleString()}`}
            icon="point_of_sale"
            color="green"
            sub={`${stats.salesCount} invoice(s) completed`}
          />
          <StatCard
            label="Sales Returns"
            value={`PKR ${stats.returnTotal.toLocaleString()}`}
            icon="undo"
            color="red"
            sub={`${stats.returnCount} return(s) processed`}
          />
          <StatCard
            label="Stock Adjustments"
            value={stats.stockAdjustCount}
            icon="tune"
            color="amber"
            sub="Manual stock updates"
          />
        </div>

        {/* Chronological Activity Log Table */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-[#c3c6d5] flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#003c90]">manage_history</span>
              <h3 className="text-[14px] font-bold text-[#191c1e]">
                Audit Trail Stream ({filteredLogs.length} Records)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              Showing logs for: <strong className="text-slate-800">{activeTab === 'ALL' ? 'All Counters' : activeTab}</strong>
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-[#737784]">
              <span className="w-6 h-6 border-2 border-[#003c90]/30 border-t-[#003c90] rounded-full animate-spin inline-block mb-2" />
              <p className="text-[13px] font-semibold">Loading activity logs for {fromDate} to {toDate}...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-[#737784] space-y-2">
              <span className="material-symbols-outlined text-[44px] text-slate-300">find_in_page</span>
              <p className="text-[14px] font-bold text-slate-700">No activity recorded for this date duration</p>
              <p className="text-[12px] text-slate-500">
                Sales, stock adjustments, and settings changes will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">User / Account</th>
                    <th className="py-3 px-4">Terminal Station</th>
                    <th className="py-3 px-4">Activity Type</th>
                    <th className="py-3 px-4">Action Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map(item => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="font-bold text-slate-800 text-[12px]">{formatTimestamp(item.created_at)}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{formatDate(item.created_at)}</p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{item.username || 'System'}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                            item.role === 'admin'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {item.role || 'user'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-600">
                          <span className="material-symbols-outlined text-[15px] text-slate-400">devices</span>
                          <span className="font-semibold text-[11px]">{item.counter_name || 'Main Counter / Server'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderActionBadge(item.action)}
                      </td>
                      <td className="py-3 px-4 font-normal text-slate-700 leading-relaxed max-w-xl">
                        {item.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

