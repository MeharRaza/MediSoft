import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import UpdateNotifier from './components/UpdateNotifier'
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

// ─── NAVIGATION HISTORY TRACKER (CTRL+TAB) ──────────────────────
// Tracks page navigation history for Ctrl+Tab cycle navigation
function NavigationHistory() {
  const location = useLocation()
  const navigate = useNavigate()
  const historyRef = useRef([])
  const currentIndexRef = useRef(0)
  const isNavigatingWithCtrlTabRef = useRef(false) // Flag to track Ctrl+Tab navigation

  // Track navigation history
  useEffect(() => {
    const currentPath = location.pathname
    
    // Skip adding to history if we're navigating with Ctrl+Tab
    if (isNavigatingWithCtrlTabRef.current) {
      isNavigatingWithCtrlTabRef.current = false
      return
    }
    
    // Check if page already exists in history
    const existingIndex = historyRef.current.indexOf(currentPath)
    
    if (existingIndex !== -1) {
      // Page already in history - just update current index
      currentIndexRef.current = existingIndex
    } else {
      // New page - add to history
      historyRef.current.push(currentPath)
      currentIndexRef.current = historyRef.current.length - 1
    }
    
    console.log('📚 History:', historyRef.current.map((p, i) => i === currentIndexRef.current ? `[${p}]` : p))
  }, [location])

  // Ctrl+Tab navigation - Cycle through history
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Tab → Cycle to previous page in history
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault()
        
        if (historyRef.current.length > 1) {
          // Move to previous page (with wrap around)
          currentIndexRef.current = currentIndexRef.current - 1
          
          // Wrap around to end if at beginning
          if (currentIndexRef.current < 0) {
            currentIndexRef.current = historyRef.current.length - 1
          }
          
          const targetPath = historyRef.current[currentIndexRef.current]
          
          // Set flag before navigating
          isNavigatingWithCtrlTabRef.current = true
          
          console.log('🔄 Ctrl+Tab: Cycling to', targetPath)
          console.log('📍 Index:', currentIndexRef.current, 'of', historyRef.current.length - 1)
          
          navigate(targetPath)
        } else {
          console.log('⚠️ Only 1 page in history')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  return null
}

// ─── GLOBAL KEYBOARD SHORTCUTS (ALT-BASED MENU NAVIGATION) ──────────────────────
// Alt key activates sidebar menu, then letter keys navigate
function KeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt-based navigation will be implemented here
      // For now, no shortcuts
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  return null
}

function PrivateRoute({ children }) {
  const user = useAuthStore(s => s.user)
  return user ? children : <Navigate to="/login" replace />
}

function LayoutWithShortcuts() {
  return (
    <>
      <NavigationHistory />
      <KeyboardShortcuts />
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
        <Route path="/" element={<PrivateRoute><LayoutWithShortcuts /></PrivateRoute>}>
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
