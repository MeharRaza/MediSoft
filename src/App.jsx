import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import UpdateNotifier from './components/UpdateNotifier'
import TaskSwitcher from './components/TaskSwitcher'
import Login from './pages/Login'
import Activation from './pages/Activation'
import Dashboard from './pages/Dashboard'
import FastBilling from './pages/sales/FastBilling'
import SalesHistory from './pages/sales/SalesHistory'
import SalesReturn from './pages/sales/SalesReturn'
import Quotations from './pages/sales/Quotations'
import Customers from './pages/sales/Customers'
import PurchaseEntry from './pages/purchase/PurchaseEntry'
import PurchaseHistory from './pages/purchase/PurchaseHistory'
import PurchaseReturn from './pages/purchase/PurchaseReturn'
import Suppliers from './pages/purchase/Suppliers'
import PurchaseOrders from './pages/purchase/PurchaseOrders'
import Products from './pages/inventory/Products'
import StockAdjustment from './pages/inventory/StockAdjustment'
import StockTransfer from './pages/inventory/StockTransfer'
import BatchExpiry from './pages/inventory/BatchExpiry'
import Accounts from './pages/accounts/Accounts'
import Vouchers from './pages/accounts/Vouchers'
import Ledger from './pages/accounts/Ledger'
import Recovery from './pages/accounts/Recovery'
import Employees from './pages/hrm/Employees'
import Payroll from './pages/hrm/Payroll'
import Leaves from './pages/hrm/Leaves'
import SalesReport from './pages/reports/SalesReport'
import PurchaseReport from './pages/reports/PurchaseReport'
import StockReport from './pages/reports/StockReport'
import ProfitLoss from './pages/reports/ProfitLoss'
import Expenses from './pages/reports/Expenses'
import ExpiryReport from './pages/reports/ExpiryReport'
import CompanySettings from './pages/settings/CompanySettings'
import InvoiceSettings from './pages/settings/InvoiceSettings'
import UserManagement from './pages/settings/UserManagement'
import BranchManagement from './pages/settings/BranchManagement'
import TerminalSettings from './pages/settings/TerminalSettings'

// ─── HARDWARE LICENSE GUARD & SUBSCRIPTION LOCK ──────────────
function LicenseGuard({ children }) {
  const [status, setStatus] = useState(null)
  const [lockInfo, setLockInfo] = useState(null)
  const [checkingHeartbeat, setCheckingHeartbeat] = useState(false)

  const verifyLicense = async (manual = false) => {
    try {
      if (window.api?.license?.getStatus) {
        const res = await window.api.license.getStatus()
        
        // 1. Check offline verification result
        if (res.isSuspended || res.isExpired) {
          setLockInfo({
            isSuspended: res.isSuspended,
            isExpired: res.isExpired,
            error: res.error,
            storeName: res.license?.storeName,
            key: res.license?.key
          })
          setStatus(false)
          return
        }

        setStatus(!!res.isActivated)

        // 2. Online Heartbeat Check (Silent Background check if key exists)
        if (res.isActivated && res.license?.key && !res.isCashierTerminal) {
          if (manual) setCheckingHeartbeat(true)
          fetch(`https://posapi.asiansol.com/api/license/heartbeat?key=${encodeURIComponent(res.license.key)}`, {
            signal: AbortSignal.timeout(4000)
          })
            .then(r => r.json())
            .then(hb => {
              if (hb && hb.Valid === false) {
                setLockInfo({
                  isSuspended: hb.IsSuspended,
                  isExpired: hb.IsExpired,
                  error: hb.IsSuspended ? 'Software has been suspended by Administrator.' : 'Monthly subscription has expired. Please pay renewal fee to unlock.',
                  storeName: hb.Store || res.license?.storeName,
                  key: res.license?.key
                })
                setStatus(false)
              } else if (hb && hb.Valid === true) {
                setLockInfo(null)
                setStatus(true)
              }
            })
            .catch(() => {}) // Offline fallback: ignore network timeouts
            .finally(() => {
              if (manual) setCheckingHeartbeat(false)
            })
        }
      } else {
        // Fallback if running outside Electron
        setStatus(true)
      }
    } catch (err) {
      console.error('[LicenseGuard] Error:', err)
      setStatus(false)
    }
  }

  useEffect(() => {
    verifyLicense()
  }, []) // Verify once on mount; subsequent navigations are instant (0ms delay)

  if (status === null) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-white text-[13px] font-semibold tracking-wider">
            Checking Hardware License...
          </span>
        </div>
      </div>
    )
  }

  // Remote Kill Switch or Monthly Subscription Expiry Lock Screen
  if (lockInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-900/10">
            <span className="material-symbols-outlined text-[36px]">lock</span>
          </div>
          <h2 className="text-[20px] font-bold text-slate-900 mb-1">
            {lockInfo.isSuspended ? 'Software Service Suspended' : 'Subscription Expired'}
          </h2>
          <p className="text-[13px] text-slate-600 mb-5 leading-relaxed">
            {lockInfo.error || 'Aapki pharmacy ka software subscription expire ya suspend ho chuka hai. Dobara unlock karne ke liye AsianSol Technologies se contact karein.'}
          </p>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-[12px] space-y-1.5 mb-5">
            <div className="flex justify-between">
              <span className="text-slate-500">Pharmacy:</span>
              <span className="font-bold text-slate-800">{lockInfo.storeName || 'MediSoft Store'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">License Key:</span>
              <code className="font-mono font-bold text-slate-800">{lockInfo.key || 'N/A'}</code>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-500">Support / Renewal:</span>
              <span className="font-bold text-[#003c90]">AsianSol Technologies</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => verifyLicense(true)}
            disabled={checkingHeartbeat}
            className="w-full py-3 bg-[#003c90] hover:bg-[#002d6b] text-white font-bold text-[13px] rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {checkingHeartbeat ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            )}
            <span>{checkingHeartbeat ? 'Verifying with Server...' : 'Re-check License Status'}</span>
          </button>
        </div>
      </div>
    )
  }

  if (!status) {
    return <Navigate to="/activate" replace />
  }

  return children
}

function PrivateRoute({ children }) {
  const user = useAuthStore(s => s.user)
  return user ? children : <Navigate to="/login" replace />
}

function LayoutWithTaskSwitcher() {
  return (
    <>
      <TaskSwitcher />
      <Layout />
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <UpdateNotifier />
      <Routes>
        <Route path="/activate" element={<Activation />} />
        <Route path="/login" element={<LicenseGuard><Login /></LicenseGuard>} />
        <Route path="/" element={<LicenseGuard><PrivateRoute><LayoutWithTaskSwitcher /></PrivateRoute></LicenseGuard>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          {/* Sales */}
          <Route path="sales/billing"  element={<FastBilling />} />
          <Route path="sales/history"  element={<SalesHistory />} />
          <Route path="sales/return"   element={<SalesReturn />} />
          <Route path="sales/quotations" element={<Quotations />} />
          <Route path="sales/customers" element={<Customers />} />
          {/* Purchase */}
          <Route path="purchase/entry"   element={<PurchaseEntry />} />
          <Route path="purchase/history" element={<PurchaseHistory />} />
          <Route path="purchase/return"  element={<PurchaseReturn />} />
          <Route path="purchase/suppliers" element={<Suppliers />} />
          <Route path="purchase/orders"  element={<PurchaseOrders />} />
          {/* Inventory */}
          <Route path="inventory/products"   element={<Products />} />
          <Route path="inventory/adjustment" element={<StockAdjustment />} />
          <Route path="inventory/transfer"   element={<StockTransfer />} />
          <Route path="inventory/batches"    element={<BatchExpiry />} />
          {/* Accounts */}
          <Route path="accounts/dashboard" element={<Accounts />} />
          <Route path="accounts/vouchers"  element={<Vouchers />} />
          <Route path="accounts/ledger"    element={<Ledger />} />
          <Route path="accounts/recovery"  element={<Recovery />} />
          {/* HRM */}
          <Route path="hrm/employees" element={<Employees />} />
          <Route path="hrm/payroll"   element={<Payroll />} />
          <Route path="hrm/leaves"    element={<Leaves />} />
          {/* Reports */}
          <Route path="reports/sales"    element={<SalesReport />} />
          <Route path="reports/purchase" element={<PurchaseReport />} />
          <Route path="reports/stock"    element={<StockReport />} />
          <Route path="reports/pl"       element={<ProfitLoss />} />
          <Route path="reports/expenses" element={<Expenses />} />
          <Route path="reports/expiry"   element={<ExpiryReport />} />
          {/* Settings */}
          <Route path="settings/company"  element={<CompanySettings />} />
          <Route path="settings/invoice"  element={<InvoiceSettings />} />
          <Route path="settings/users"    element={<UserManagement />} />
          <Route path="settings/branches" element={<BranchManagement />} />
          <Route path="settings/terminals" element={<TerminalSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  )
}
