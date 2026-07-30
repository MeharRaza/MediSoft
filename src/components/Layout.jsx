import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp'

const navItems = [
  {
    label: 'Sales', icon: 'receipt_long',
    children: [
      { label: 'Fast Billing', path: '/sales/billing', icon: 'point_of_sale' },
      { label: 'Sales History', path: '/sales/history', icon: 'history' },
      { label: 'Sales Return', path: '/sales/return', icon: 'undo' },
      { label: 'Quotations', path: '/sales/quotations', icon: 'request_quote' },
      { label: 'Customers', path: '/sales/customers', icon: 'people' },
    ]
  },
  {
    label: 'Purchase', icon: 'shopping_cart',
    children: [
      { label: 'Purchase Entry', path: '/purchase/entry', icon: 'add_shopping_cart' },
      { label: 'Purchase History', path: '/purchase/history', icon: 'history' },
      { label: 'Purchase Return', path: '/purchase/return', icon: 'keyboard_return' },
      { label: 'Suppliers', path: '/purchase/suppliers', icon: 'local_shipping' },
      { label: 'Purchase Orders', path: '/purchase/orders', icon: 'assignment' },
    ]
  },
  {
    label: 'Inventory', icon: 'inventory_2',
    children: [
      { label: 'Products', path: '/inventory/products', icon: 'medication' },
      { label: 'Stock Adjustment', path: '/inventory/adjustment', icon: 'tune' },
      { label: 'Stock Transfer', path: '/inventory/transfer', icon: 'swap_horiz' },
      { label: 'Batch & Expiry', path: '/inventory/batches', icon: 'event_busy' },
    ]
  },
  {
    label: 'Accounts', icon: 'account_balance_wallet',
    children: [
      { label: 'Overview', path: '/accounts/dashboard', icon: 'dashboard' },
      { label: 'Vouchers', path: '/accounts/vouchers', icon: 'receipt' },
      { label: 'Ledger', path: '/accounts/ledger', icon: 'menu_book' },
      { label: 'Recovery', path: '/accounts/recovery', icon: 'currency_exchange' },
    ]
  },
  {
    label: 'HRM', icon: 'badge',
    children: [
      { label: 'Employees', path: '/hrm/employees', icon: 'manage_accounts' },
      { label: 'Payroll', path: '/hrm/payroll', icon: 'payments' },
      { label: 'Leaves', path: '/hrm/leaves', icon: 'event_note' },
    ]
  },
  {
    label: 'Reports', icon: 'bar_chart',
    children: [
      { label: 'Sales Report', path: '/reports/sales', icon: 'trending_up' },
      { label: 'Purchase Report', path: '/reports/purchase', icon: 'trending_down' },
      { label: 'Stock Report', path: '/reports/stock', icon: 'inventory' },
      { label: 'Profit & Loss', path: '/reports/pl', icon: 'monitoring' },
      { label: 'Expiry Report', path: '/reports/expiry', icon: 'event_busy' },
    ]
  },
  {
    label: 'Settings', icon: 'settings',
    children: [
      { label: 'Company', path: '/settings/company', icon: 'business' },
      { label: 'Users', path: '/settings/users', icon: 'group' },
      { label: 'Branches', path: '/settings/branches', icon: 'store' },
    ]
  },
]

export default function Layout() {
  const [openMenu, setOpenMenu] = useState('Sales')
  const [sidebarFocused, setSidebarFocused] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0) // Track focused menu item
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const [clock, setClock] = useState(new Date().toLocaleTimeString())

  // Update clock
  useState(() => {
    const timer = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(timer)
  })

  // Build flat menu list for keyboard navigation
  const flatMenuItems = [
    { label: 'Dashboard', path: '/dashboard', type: 'link' },
    ...navItems.flatMap(parent => {
      const items = [{ label: parent.label, type: 'parent', parentLabel: parent.label }]
      if (openMenu === parent.label) {
        items.push(...parent.children.map(child => ({ 
          label: child.label, 
          path: child.path, 
          type: 'child',
          parentLabel: parent.label 
        })))
      }
      return items
    })
  ]

  // Keyboard navigation for sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt key activates sidebar navigation
      if (e.key === 'Alt' && !sidebarFocused) {
        e.preventDefault()
        setSidebarFocused(true)
        setFocusedIndex(0)
        return
      }

      // Only process keys when sidebar is focused
      if (!sidebarFocused) return

      if (e.key === 'Escape') {
        e.preventDefault()
        setSidebarFocused(false)
        setOpenMenu('') // Reset open menu when exiting
        return
      }

      // Letter-based navigation when sidebar is focused
      const key = e.key.toLowerCase()
      
      // PRIORITY 1: Check sub-menu shortcuts FIRST (if a menu is already open)
      if (openMenu === 'Sales') {
        const salesMap = {
          'f': '/sales/billing',
          'h': '/sales/history',
          'r': '/sales/return',
          'q': '/sales/quotations',
          'c': '/sales/customers'
        }
        if (salesMap[key]) {
          e.preventDefault()
          navigate(salesMap[key])
          setSidebarFocused(false)
          setOpenMenu('') // Reset open menu
          return
        }
      }
      
      if (openMenu === 'Purchase') {
        const purchaseMap = {
          'e': '/purchase/entry',
          'h': '/purchase/history',
          'r': '/purchase/return',
          's': '/purchase/suppliers',
          'o': '/purchase/orders'
        }
        if (purchaseMap[key]) {
          e.preventDefault()
          navigate(purchaseMap[key])
          setSidebarFocused(false)
          setOpenMenu('') // Reset open menu
          return
        }
      }
      
      if (openMenu === 'Inventory') {
        const inventoryMap = {
          'p': '/inventory/products',
          'a': '/inventory/adjustment',
          't': '/inventory/transfer',
          'b': '/inventory/batches'
        }
        if (inventoryMap[key]) {
          e.preventDefault()
          navigate(inventoryMap[key])
          setSidebarFocused(false)
          setOpenMenu('') // Reset open menu
          return
        }
      }
      
      if (openMenu === 'Accounts') {
        const accountsMap = {
          'o': '/accounts/dashboard',
          'v': '/accounts/vouchers',
          'l': '/accounts/ledger',
          'r': '/accounts/recovery'
        }
        if (accountsMap[key]) {
          e.preventDefault()
          navigate(accountsMap[key])
          setSidebarFocused(false)
          setOpenMenu('') // Reset open menu
          return
        }
      }
      
      if (openMenu === 'HRM') {
        const hrmMap = {
          'e': '/hrm/employees',
          'p': '/hrm/payroll',
          'l': '/hrm/leaves'
        }
        if (hrmMap[key]) {
          e.preventDefault()
          navigate(hrmMap[key])
          setSidebarFocused(false)
          setOpenMenu('') // Reset open menu
          return
        }
      }
      
      if (openMenu === 'Reports') {
        const reportsMap = {
          's': '/reports/sales',
          'p': '/reports/purchase',
          't': '/reports/stock',
          'l': '/reports/pl',
          'e': '/reports/expiry'
        }
        if (reportsMap[key]) {
          e.preventDefault()
          navigate(reportsMap[key])
          setSidebarFocused(false)
          setOpenMenu('') // Reset open menu
          return
        }
      }
      
      if (openMenu === 'Settings') {
        const settingsMap = {
          'c': '/settings/company',
          'u': '/settings/users',
          'b': '/settings/branches'
        }
        if (settingsMap[key]) {
          e.preventDefault()
          navigate(settingsMap[key])
          setSidebarFocused(false)
          setOpenMenu('') // Reset open menu
          return
        }
      }
      
      // PRIORITY 2: Main menu letter shortcuts (only if no sub-menu matched)
      if (key === 'd') {
        e.preventDefault()
        navigate('/dashboard')
        setSidebarFocused(false)
        setOpenMenu('') // Reset open menu
        return
      }
      
      // Check if we should open a main menu
      const mainMenuMap = {
        's': 'Sales',
        'p': 'Purchase',
        'i': 'Inventory',
        'a': 'Accounts',
        'h': 'HRM',
        'r': 'Reports',
        't': 'Settings'
      }
      
      if (mainMenuMap[key]) {
        e.preventDefault()
        const menuName = mainMenuMap[key]
        // Open the menu and stay in navigation mode for sub-menu selection
        setOpenMenu(menuName)
        return
      }
      
      // Arrow navigation (existing)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex(prev => (prev + 1) % flatMenuItems.length)
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex(prev => (prev - 1 + flatMenuItems.length) % flatMenuItems.length)
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        const item = flatMenuItems[focusedIndex]
        if (item.type === 'parent') {
          // Toggle parent menu
          setOpenMenu(openMenu === item.parentLabel ? '' : item.parentLabel)
        } else if (item.type === 'link' || item.type === 'child') {
          // Navigate to page
          navigate(item.path)
          setSidebarFocused(false)
        }
      }

      if (e.key === 'ArrowRight' && flatMenuItems[focusedIndex].type === 'parent') {
        e.preventDefault()
        const item = flatMenuItems[focusedIndex]
        if (openMenu !== item.parentLabel) {
          setOpenMenu(item.parentLabel)
        }
      }

      if (e.key === 'ArrowLeft' && flatMenuItems[focusedIndex].type === 'parent') {
        e.preventDefault()
        const item = flatMenuItems[focusedIndex]
        if (openMenu === item.parentLabel) {
          setOpenMenu('')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarFocused, focusedIndex, flatMenuItems, openMenu, navigate])

  // Helper to check if menu item is focused
  const isFocused = (index) => sidebarFocused && focusedIndex === index

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f9fb]">
      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp />
      
      {/* Sidebar */}
      <aside className={`w-60 flex flex-col h-screen bg-white border-r shrink-0 z-40 transition-all ${
        sidebarFocused ? 'border-yellow-400 border-r-4 shadow-lg' : 'border-[#c3c6d5]'
      }`}>
        {/* Sidebar Navigation Indicator */}
        {sidebarFocused && (
          <div className="px-3 py-1.5 bg-yellow-100 border-b border-yellow-300 flex items-center justify-between">
            <span className="text-[10px] font-bold text-yellow-800 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">keyboard</span>
              KEYBOARD NAVIGATION
            </span>
            <span className="text-[9px] text-yellow-700">ESC to exit</span>
          </div>
        )}
        
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#c3c6d5]">
          <h1 className="text-[18px] font-bold text-[#003c90]" style={{ fontFamily: 'Hanken Grotesk' }}>
            Harmain Medical Store
          </h1>
          <p className="text-[10px] text-[#737784] tracking-widest font-semibold">PHARMACY MANAGEMENT</p>
        </div>

        {/* Quick Billing */}
        <div className="px-3 py-3 border-b border-[#c3c6d5]">
          <button
            onClick={() => navigate('/sales/billing')}
            className="w-full py-2 bg-[#003c90] text-white text-[12px] font-semibold rounded flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
            Quick Billing (Alt+S→F)
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          <NavLink to="/dashboard" className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 text-[12px] font-semibold transition-all ${
              isFocused(0) ? 'bg-yellow-100 ring-2 ring-yellow-400' : ''
            } ${isActive ? 'text-[#003c90] bg-blue-50 border-r-2 border-[#003c90]' : 'text-[#434653] hover:bg-[#f2f4f6]'}`
          }>
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            Dashboard
          </NavLink>

          {navItems.map((item, parentIdx) => {
            const parentIndex = 1 + navItems.slice(0, parentIdx).reduce((sum, prev) => 
              sum + 1 + (openMenu === prev.label ? prev.children.length : 0), 0
            )
            
            return (
              <div key={item.label}>
                <button
                  onClick={() => setOpenMenu(openMenu === item.label ? '' : item.label)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-[12px] font-semibold text-[#434653] hover:bg-[#f2f4f6] transition-colors ${
                    isFocused(parentIndex) ? 'bg-yellow-100 ring-2 ring-yellow-400' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    {item.label}
                  </span>
                  <span className="material-symbols-outlined text-[16px]">
                    {openMenu === item.label ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {openMenu === item.label && (
                  <div className="bg-[#f7f9fb] border-l-2 border-[#c3c6d5] ml-4">
                    {item.children.map((child, childIdx) => {
                      const childIndex = parentIndex + 1 + childIdx
                      
                      return (
                        <NavLink key={child.path} to={child.path}
                          className={({ isActive }) =>
                            `flex items-center gap-2 px-4 py-2 text-[11px] transition-all ${
                              isFocused(childIndex) ? 'bg-yellow-100 ring-2 ring-yellow-400' : ''
                            } ${isActive ? 'text-[#003c90] font-bold bg-blue-50 border-r-2 border-[#003c90]' : 'text-[#434653] hover:bg-[#eceef0] font-medium'}`
                          }
                        >
                          <span className="material-symbols-outlined text-[15px]">{child.icon}</span>
                          {child.label}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-[#c3c6d5] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-bold text-[#191c1e]">{user?.full_name}</p>
              <p className="text-[10px] text-[#737784] capitalize">{user?.role}</p>
            </div>
            <button onClick={logout} title="Sign Out"
              className="p-1.5 text-[#ba1a1a] hover:bg-red-50 rounded transition-colors">
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-11 bg-white border-b border-[#c3c6d5] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-[#434653]">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            System Online
            <span className="text-[#c3c6d5]">|</span>
            <span className="font-semibold text-[#003c90]">Main Branch</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#434653]">
            <span className="font-mono">{clock}</span>
            <span className="text-[#c3c6d5]">|</span>
            <span className="font-semibold text-[#003c90]">v1.3.8</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
