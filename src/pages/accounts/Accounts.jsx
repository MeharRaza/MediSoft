import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { PageHeader, Card, StatCard, Table, fmt } from '../../components/ui'

export default function Accounts() {
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { api.accounts.getDashboard().then(d => { setData(d); setLoading(false) }) }, [])

  const voucherTypeLbl = t => ({ cash_receipt: 'Cash Receipt', cash_payment: 'Cash Payment', bank_receipt: 'Bank Receipt', bank_payment: 'Bank Payment', journal: 'Journal' }[t] || t)

  const voucherCols = [
    { key: 'voucher_no',  label: 'Voucher #', mono: true, render: v => <span className="font-mono font-semibold text-[#003c90] text-[12px]">{v}</span> },
    { key: 'type',        label: 'Type',       render: v => <span className="text-[12px]">{voucherTypeLbl(v)}</span> },
    { key: 'date',        label: 'Date',       render: v => <span className="text-[11px] text-[#737784]">{v ? new Date(v).toLocaleDateString() : '-'}</span> },
    { key: 'description', label: 'Description', render: v => <span className="text-[12px]">{v||'—'}</span> },
    { key: 'total',       label: 'Amount', right: true, render: v => <span className="font-mono font-bold text-[12px]">PKR {fmt(v)}</span> },
  ]

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div>

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Accounts Overview" subtitle="Financial position and ledger summary" />
      <div className="p-5 space-y-5 flex-1 overflow-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Assets"         value={`PKR ${fmt(data?.totalAssets)}`}        icon="account_balance"  color="blue" />
          <StatCard label="Total Liabilities"    value={`PKR ${fmt(data?.totalLiabilities)}`}   icon="trending_down"    color="red" />
          <StatCard label="Receivable (Customers)" value={`PKR ${fmt(data?.pendingReceivable)}`} icon="currency_exchange" color="amber" />
          <StatCard label="Payable (Suppliers)"  value={`PKR ${fmt(data?.pendingPayable)}`}     icon="local_shipping"   color="teal" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Cash Receipt',  icon: 'add_circle',      path: '/accounts/vouchers', color: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'Cash Payment',  icon: 'remove_circle',   path: '/accounts/vouchers', color: 'bg-red-50 border-red-200 text-red-700' },
            { label: 'Bank Voucher',  icon: 'account_balance', path: '/accounts/vouchers', color: 'bg-blue-50 border-blue-200 text-blue-700' },
            { label: 'Ledger View',   icon: 'menu_book',       path: '/accounts/ledger',   color: 'bg-purple-50 border-purple-200 text-purple-700' },
          ].map(a => <button key={a.label} onClick={() => navigate(a.path)} className={`p-4 rounded-lg border flex flex-col items-center gap-2 hover:shadow-md transition-all ${a.color}`}>
            <span className="material-symbols-outlined text-[28px]">{a.icon}</span>
            <span className="text-[12px] font-bold">{a.label}</span>
          </button>)}
        </div>

        <Card>
          <div className="px-5 py-3 border-b border-[#c3c6d5] flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[#003c90]">Recent Vouchers</h3>
            <button onClick={() => navigate('/accounts/vouchers')} className="text-[12px] text-[#003c90] font-semibold hover:underline">View All</button>
          </div>
          <Table columns={voucherCols} data={data?.recentVouchers || []} emptyMsg="No vouchers yet" />
        </Card>
      </div>
    </div>
  )
}
