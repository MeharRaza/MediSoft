import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Page metadata with icons and titles
const PAGE_INFO = {
  '/dashboard': { title: 'Dashboard', icon: 'dashboard', color: '#003c90' },
  '/sales/billing': { title: 'Fast Billing', icon: 'point_of_sale', color: '#00796b' },
  '/sales/history': { title: 'Sales History', icon: 'receipt_long', color: '#00796b' },
  '/sales/return': { title: 'Sales Return', icon: 'keyboard_return', color: '#c62828' },
  '/sales/customers': { title: 'Customers', icon: 'people', color: '#00796b' },
  '/sales/quotations': { title: 'Quotations', icon: 'description', color: '#00796b' },
  '/purchase/entry': { title: 'Purchase Entry', icon: 'shopping_cart', color: '#6a1b9a' },
  '/purchase/history': { title: 'Purchase History', icon: 'history', color: '#6a1b9a' },
  '/purchase/return': { title: 'Purchase Return', icon: 'undo', color: '#6a1b9a' },
  '/purchase/suppliers': { title: 'Suppliers', icon: 'store', color: '#6a1b9a' },
  '/purchase/orders': { title: 'Purchase Orders', icon: 'assignment', color: '#6a1b9a' },
  '/inventory/products': { title: 'Products', icon: 'inventory_2', color: '#e65100' },
  '/inventory/adjustment': { title: 'Stock Adjustment', icon: 'tune', color: '#e65100' },
  '/inventory/transfer': { title: 'Stock Transfer', icon: 'swap_horiz', color: '#e65100' },
  '/inventory/batches': { title: 'Batch & Expiry', icon: 'calendar_today', color: '#e65100' },
  '/accounts/dashboard': { title: 'Accounts', icon: 'account_balance', color: '#1565c0' },
  '/accounts/vouchers': { title: 'Vouchers', icon: 'receipt', color: '#1565c0' },
  '/accounts/ledger': { title: 'Ledger', icon: 'book', color: '#1565c0' },
  '/accounts/recovery': { title: 'Recovery', icon: 'payments', color: '#1565c0' },
  '/hrm/employees': { title: 'Employees', icon: 'badge', color: '#558b2f' },
  '/hrm/payroll': { title: 'Payroll', icon: 'account_balance_wallet', color: '#558b2f' },
  '/hrm/leaves': { title: 'Leaves', icon: 'event_busy', color: '#558b2f' },
  '/reports/sales': { title: 'Sales Report', icon: 'bar_chart', color: '#bf360c' },
  '/reports/purchase': { title: 'Purchase Report', icon: 'show_chart', color: '#bf360c' },
  '/reports/stock': { title: 'Stock Report', icon: 'assessment', color: '#bf360c' },
  '/reports/pl': { title: 'Profit & Loss', icon: 'trending_up', color: '#bf360c' },
  '/reports/expiry': { title: 'Expiry Report', icon: 'event', color: '#bf360c' },
  '/settings/company': { title: 'Company Settings', icon: 'business', color: '#424242' },
  '/settings/users': { title: 'User Management', icon: 'manage_accounts', color: '#424242' },
  '/settings/branches': { title: 'Branch Management', icon: 'domain', color: '#424242' },
}

export default function TaskSwitcher() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const [isOpen, setIsOpen] = useState(false)
  const [openPages, setOpenPages] = useState([]) // List of visited pages
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const isNavigatingRef = useRef(false)

  // Track visited pages
  useEffect(() => {
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false
      return
    }

    const currentPath = location.pathname
    
    setOpenPages(prev => {
      // Check if page already in list
      if (prev.includes(currentPath)) {
        return prev
      }
      // Add new page
      return [...prev, currentPath]
    })
  }, [location])

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Tab → Open task switcher
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault()
        
        if (openPages.length > 1) {
          if (!isOpen) {
            // Opening for first time - start from next item
            setIsOpen(true)
            setSelectedIndex(1)
          } else {
            // Already open - cycle to next
            setSelectedIndex(prev => (prev + 1) % openPages.length)
          }
        }
        return
      }

      // If task switcher is open and Tab pressed (without Ctrl)
      if (isOpen && e.key === 'Tab' && !e.ctrlKey) {
        e.preventDefault()
        e.stopPropagation()
        // Move selection to next
        setSelectedIndex(prev => (prev + 1) % openPages.length)
      } else if (isOpen && e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        // Navigate to selected page
        const targetPath = openPages[selectedIndex]
        isNavigatingRef.current = true
        navigate(targetPath)
        setIsOpen(false)
      } else if (isOpen && e.key === 'Shift') {
        e.preventDefault()
        e.stopPropagation()
        // Remove selected screen from list (close it)
        const selectedPath = openPages[selectedIndex]
        
        // Don't close if it's the only page left
        if (openPages.length > 1) {
          // Remove from list
          setOpenPages(prev => prev.filter(p => p !== selectedPath))
          
          // Adjust selected index
          if (selectedIndex >= openPages.length - 1) {
            setSelectedIndex(Math.max(0, selectedIndex - 1))
          }
          
          // If we're closing current page, navigate to next available
          if (selectedPath === location.pathname) {
            const remaining = openPages.filter(p => p !== selectedPath)
            if (remaining.length > 0) {
              const nextIndex = selectedIndex >= remaining.length ? remaining.length - 1 : selectedIndex
              isNavigatingRef.current = true
              navigate(remaining[nextIndex])
            }
          }
        }
      } else if (isOpen && e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        // Escape just closes the popup without switching
        setIsOpen(false)
      }
    }

    const handleKeyUp = (e) => {
      // Close task switcher when Ctrl is released (only if we're not actively holding it)
      if (e.key === 'Control' && isOpen) {
        const targetPath = openPages[selectedIndex]
        isNavigatingRef.current = true
        navigate(targetPath)
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isOpen, openPages, selectedIndex, navigate])

  // Close page handler
  const closePage = (path, e) => {
    e.stopPropagation()
    setOpenPages(prev => prev.filter(p => p !== path))
    
    // If closing current page, navigate to previous
    if (path === location.pathname && openPages.length > 1) {
      const currentIndex = openPages.indexOf(path)
      const newIndex = currentIndex > 0 ? currentIndex - 1 : 1
      const targetPath = openPages[newIndex]
      isNavigatingRef.current = true
      navigate(targetPath)
    }
    
    setIsOpen(false)
  }

  // Navigate to page
  const goToPage = (path) => {
    isNavigatingRef.current = true
    navigate(path)
    setIsOpen(false)
  }

  if (!isOpen || openPages.length <= 1) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl w-full mx-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#003c90] flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl">window</span>
              Task Switcher
            </h2>
            <p className="text-xs text-[#737784] mt-1">
              Press <kbd className="px-2 py-0.5 bg-[#f7f9fb] border border-[#c3c6d5] rounded text-[10px] font-mono">Tab</kbd> to cycle, <kbd className="px-2 py-0.5 bg-[#f7f9fb] border border-[#c3c6d5] rounded text-[10px] font-mono">Enter</kbd> to switch, <kbd className="px-2 py-0.5 bg-[#f7f9fb] border border-[#c3c6d5] rounded text-[10px] font-mono">Shift</kbd> to close, <kbd className="px-2 py-0.5 bg-[#f7f9fb] border border-[#c3c6d5] rounded text-[10px] font-mono">Esc</kbd> to cancel
            </p>
          </div>
        </div>

        {/* Open Pages Grid */}
        <div className="grid grid-cols-3 gap-3">
          {openPages.map((path, index) => {
            const info = PAGE_INFO[path] || { title: path, icon: 'description', color: '#757575' }
            const isSelected = index === selectedIndex
            const isCurrent = path === location.pathname

            return (
              <div
                key={path}
                onClick={() => goToPage(path)}
                className={`
                  relative p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${isSelected ? 'border-[#003c90] bg-[#003c90]/5 shadow-lg scale-105' : 'border-[#eceef0] hover:border-[#c3c6d5] hover:shadow'}
                `}
              >
                {/* Close Button */}
                <button
                  onClick={(e) => closePage(path, e)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors"
                  title="Close (data will be saved)"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>

                {/* Icon */}
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: info.color + '15' }}
                >
                  <span 
                    className="material-symbols-outlined text-3xl"
                    style={{ color: info.color }}
                  >
                    {info.icon}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-[#191c1e] truncate mb-1">
                  {info.title}
                </h3>

                {/* Current Page Badge */}
                {isCurrent && (
                  <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold uppercase rounded">
                    Current
                  </span>
                )}

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-xl border-4 border-[#003c90] pointer-events-none"></div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer Help */}
        <div className="mt-4 pt-3 border-t border-[#eceef0] text-center">
          <p className="text-xs text-[#737784]">
            💡 <span className="font-semibold">Tip:</span> Your work is automatically saved when you switch or close pages
          </p>
        </div>
      </div>
    </div>
  )
}
