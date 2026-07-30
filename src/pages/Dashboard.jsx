import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { StatCard, Card, Badge, fmt } from '../components/ui'

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.dashboard.getStats()
      .then(s => { 
        console.log('Dashboard stats loaded:', s)
        setStats(s)
        setLoading(false)
      })
      .catch(err => {
        console.error('Dashboard stats error:', err)
        setLoading(false)
        setStats({
          todaySales: 0,
          todaySalesCount: 0,
          profitToday: 0,
          lowStock: 0,
          expiryAlerts: 0,
          todayPurchase: 0,
          pendingRecovery: 0,
          recentSales: [],
          weeklySales: []
        })
      })
  }, [])

  const statusBadge = (s) => {
    if (s === 'paid')   return <Badge label="PAID"   type="success" />
    if (s === 'credit') return <Badge label="CREDIT" type="info" />
    if (s === 'voided') return <Badge label="VOIDED" type="error" />
    return <Badge label={s} type="neutral" />
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-10 h-10 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" />
    </div>
  )

  // Build chart bars from weekly sales
  const maxSale = Math.max(...(stats?.weeklySales?.map(d => d.total) || [1]), 1)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div>
            <h2 className="text-[26px] font-bold text-[#191c1e]" style={{ fontFamily: 'Hanken Grotesk' }}>
              Daily Performance
            </h2>
          </div>
          <p className="text-[13px] text-[#737784]">
            Real-time metrics — {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={() => navigate('/sales/billing')}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#003c90] text-white text-[13px] font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-md">
          <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
          New Invoice
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Sales" value={`PKR ${fmt(stats?.todaySales)}`} icon="payments" color="blue" sub={`${stats?.todaySalesCount} invoices`} />
        <StatCard label="Net Profit Today" value={`PKR ${fmt(stats?.profitToday)}`} icon="monitoring" color="green" sub="Estimated" />
        <StatCard label="Low Stock Items" value={stats?.lowStock} icon="warning" color="red" sub="Need reorder" />
        <StatCard label="Expiry Alerts" value={stats?.expiryAlerts} icon="event_busy" color="amber" sub="Within 6 months" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Today's Purchase" value={`PKR ${fmt(stats?.todayPurchase)}`} icon="shopping_cart" color="teal" />
        <StatCard label="Pending Recovery" value={`PKR ${fmt(stats?.pendingRecovery)}`} icon="currency_exchange" color="amber" sub="Customer dues" />
        <div className="bg-white border border-[#c3c6d5] rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#737784] uppercase tracking-wider">Quick Actions</p>
            <div className="flex flex-col gap-1.5 mt-2">
              <button onClick={() => navigate('/inventory/batches')}
                className="text-[11px] text-[#003c90] font-semibold hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">event_busy</span>View Expiry Alerts
              </button>
              <button onClick={() => navigate('/inventory/adjustment')}
                className="text-[11px] text-[#003c90] font-semibold hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">tune</span>Stock Adjustment
              </button>
              <button onClick={() => navigate('/accounts/recovery')}
                className="text-[11px] text-[#003c90] font-semibold hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">currency_exchange</span>Customer Recovery
              </button>
            </div>
          </div>
          <span className="material-symbols-outlined text-[40px] text-[#c3c6d5]">bolt</span>
        </div>
      </div>

      {/* Chart + Recent Sales */}
      <div className="grid grid-cols-3 gap-4">
        {/* Weekly Sales Chart */}
        <Card className="col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-[#191c1e]" style={{ fontFamily: 'Hanken Grotesk' }}>Weekly Sales</h3>
            <span className="text-[11px] text-[#737784]">Last 7 days</span>
          </div>
          {stats?.weeklySales?.length > 0 ? (
            <div className="flex items-end gap-3 h-36">
              {stats.weeklySales.map((d, i) => {
                const h = Math.max((d.total / maxSale) * 100, 4)
                const dayLabel = new Date(d.day).toLocaleDateString('en', { weekday: 'short' })
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full flex items-end justify-center" style={{ height: '120px' }}>
                      <div
                        className="w-full bg-[#003c90]/20 hover:bg-[#003c90] rounded-t transition-colors cursor-default"
                        style={{ height: `${h}%` }}
                        title={`PKR ${fmt(d.total)}`}
                      />
                    </div>
                    <span className="text-[10px] text-[#737784]">{dayLabel}</span>
                    <span className="text-[10px] font-bold text-[#003c90]">{fmt(d.total / 1000)}k</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center">
              <div className="flex items-end gap-3 w-full h-full">
                {weekDays.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-[#eceef0] rounded-t" style={{ height: `${[60,85,45,95,70,80,30][i]}%` }} />
                    <span className="text-[10px] text-[#737784]">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Low Stock */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold text-[#191c1e]">Low Stock Alert</h3>
            <button onClick={() => navigate('/inventory/products')} className="text-[11px] text-[#003c90] hover:underline font-semibold">View All</button>
          </div>
          <LowStockList />
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#c3c6d5]">
          <h3 className="text-[14px] font-bold text-[#191c1e]">Recent Transactions</h3>
          <button onClick={() => navigate('/sales/history')} className="text-[11px] text-[#003c90] font-semibold hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f2f4f6] border-b border-[#c3c6d5]">
                {['Invoice #', 'Customer', 'Amount', 'Status', 'Time'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-bold text-[#434653] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eceef0]">
              {stats?.recentSales?.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-[13px] text-[#737784]">No transactions today</td></tr>
              ) : (
                stats?.recentSales?.map(s => (
                  <tr key={s.id} className="hover:bg-[#f7f9fb] transition-colors">
                    <td className="px-4 py-2.5 text-[12px] font-mono font-semibold text-[#003c90]">{s.invoice_no}</td>
                    <td className="px-4 py-2.5 text-[12px] text-[#191c1e]">{s.customer_name || 'Walk-in'}</td>
                    <td className="px-4 py-2.5 text-[12px] font-mono font-bold">PKR {fmt(s.grand_total)}</td>
                    <td className="px-4 py-2.5">{statusBadge(s.status)}</td>
                    <td className="px-4 py-2.5 text-[11px] text-[#737784]">{new Date(s.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function LowStockList() {
  const [items, setItems] = useState([])
  useEffect(() => { 
    api.inventory.getLowStock()
      .then(setItems)
      .catch(err => {
        console.error('Low stock error:', err)
        setItems([])
      })
  }, [])
  if (items.length === 0) return <p className="text-[12px] text-[#737784] text-center py-4">All stock levels OK</p>
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {items.slice(0, 8).map(p => (
        <div key={p.id} className="flex items-center justify-between py-1">
          <span className="text-[12px] text-[#191c1e] truncate flex-1">{p.name}</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ml-2 ${p.stock <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
            {p.stock} left
          </span>
        </div>
      ))}
    </div>
  )
}
