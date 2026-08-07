import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import UpdateNotifier from './components/UpdateNotifier'
import TaskSwitcher from './components/TaskSwitcher'
import Login from './pages/Login'
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
import ExpiryReport from './pages/reports/ExpiryReport'
import CompanySettings from './pages/settings/CompanySettings'
import UserManagement from './pages/settings/UserManagement'
import BranchManagement from './pages/settings/BranchManagement'

// ─── REMOVED OLD NAVIGATION HISTORY ──────────────────────
// Replaced with new TaskSwitcher component

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
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><LayoutWithTaskSwitcher /></PrivateRoute>}>
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
          <Route path="reports/expiry"   element={<ExpiryReport />} />
          {/* Settings */}
          <Route path="settings/company"  element={<CompanySettings />} />
          <Route path="settings/users"    element={<UserManagement />} />
          <Route path="settings/branches" element={<BranchManagement />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  )
}
