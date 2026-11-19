import React, { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../../lib/api'
import { fmt, Badge, Modal } from '../../components/ui'
import InvoicePrint from '../../components/InvoicePrint'
import InAppAlert from '../../components/InAppAlert'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { onLanEvent } from '../../lib/lanClient'

export default function FastBilling() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin' || Boolean(user?.rights?.all)
  const canDiscount = isAdmin || Boolean(user?.rights?.['billing.discount'])
  const canViewProfit = isAdmin || Boolean(user?.rights?.['inventory.view_profit'])
  const canViewHistory = isAdmin || Boolean(user?.rights?.['billing.history'])

  const [items, setItems] = useState([])
  const [inAppAlert, setInAppAlert] = useState(null)
  const showAlert = useCallback((cfg) => setInAppAlert(cfg), [])
  const closeAlert = useCallback(() => setInAppAlert(null), [])
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(-1) // For keyboard navigation
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paidAmount, setPaidAmount] = useState('')
  const [percentDiscount, setPercentDiscount] = useState(0) // Percentage discount
  const [flatDiscount, setFlatDiscount] = useState(0) // Flat discount in PKR
  const [loading, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)
  const [printInvoice, setPrintInvoice] = useState(null) // For print modal after sale
  const [autoPrint, setAutoPrint] = useState(false) // For auto-print (Ctrl+P)
  const [invoiceSettings, setInvoiceSettings] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerDropdownIndex, setSelectedCustomerDropdownIndex] = useState(0) // For customer dropdown keyboard navigation
  
  // Item History Popup (Ctrl+H)
  const [historyPopup, setHistoryPopup] = useState(null) // { product_id, name, data }
  const [historyLoading, setHistoryLoading] = useState(false)
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1) // Track which row is focused
  const searchRef = useRef()
  const searchDropdownRef = useRef() // For dropdown scrolling
  const inputRefs = useRef({}) // For cart table navigation
  const handleFinishSaleRef = useRef() // For Ctrl+S shortcut
  const handleFinishSaleWithPrintRef = useRef() // For Ctrl+P shortcut
  const handleHoldBillRef = useRef() // For F8 shortcut
  
  // Refs for auto-hold to avoid re-running cleanup on every state change
  const itemsRef = useRef([])
  const selectedCustomerRef = useRef(null)
  const paymentMethodRef = useRef('cash')
  const paidAmountRef = useRef('')
  const percentDiscountRef = useRef(0)
  const flatDiscountRef = useRef(0)
  const currentBillIndexRef = useRef(-1)
  
  // Hold Bill System (with localStorage persistence)
  const [heldBills, setHeldBills] = useState(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('fastBilling_heldBills')
    return saved ? JSON.parse(saved) : []
  })
  const [currentBillIndex, setCurrentBillIndex] = useState(-1) // -1 means new/active bill
  
  // Save held bills to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('fastBilling_heldBills', JSON.stringify(heldBills))
  }, [heldBills])
  
  // Auto-hold: Save current cart when navigating away from Fast Billing
  useEffect(() => {
    return () => {
      // When component unmounts (user navigating away)
      // Only auto-save if cart has VALID items (product_id + qty > 0)
      const currentItems = itemsRef.current
      const hasValidItems = currentItems.length > 0 && currentItems.some(item => 
        item.product_id && item.qty > 0
      )
      
      if (hasValidItems) {
        const billToHold = {
          items: [...currentItems],
          customer: selectedCustomerRef.current,
          paymentMethod: paymentMethodRef.current,
          paidAmount: paidAmountRef.current,
          percentDiscount: percentDiscountRef.current,
          flatDiscount: flatDiscountRef.current,
          timestamp: new Date().toISOString()
        }
        
        // Get latest held bills from localStorage
        const saved = localStorage.getItem('fastBilling_heldBills')
        const existingBills = saved ? JSON.parse(saved) : []
        
        const currentIndex = currentBillIndexRef.current
        
        if (currentIndex >= 0) {
          // Update existing held bill
          existingBills[currentIndex] = billToHold
          console.log('🔄 Auto-hold: Updated existing held bill at index', currentIndex)
        } else {
          // Add new held bill only if cart has valid data
          existingBills.push(billToHold)
          console.log('🔄 Auto-hold: Added new held bill')
        }
        
        // Save to localStorage
        localStorage.setItem('fastBilling_heldBills', JSON.stringify(existingBills))
        console.log('💾 Auto-hold: Cart saved automatically on navigation')
      }
    }
  }, []) // Empty dependencies - only runs on mount/unmount
  
  // Update refs whenever state changes (for auto-hold)
  useEffect(() => {
    itemsRef.current = items
    selectedCustomerRef.current = selectedCustomer
    paymentMethodRef.current = paymentMethod
    paidAmountRef.current = paidAmount
    percentDiscountRef.current = percentDiscount
    flatDiscountRef.current = flatDiscount
    currentBillIndexRef.current = currentBillIndex
  }, [items, selectedCustomer, paymentMethod, paidAmount, percentDiscount, flatDiscount, currentBillIndex])
  
  // Load held bill on mount if available - REMOVED AUTO-LOAD
  // User will manually navigate to held bills using Ctrl+Left/Right
  useEffect(() => {
    // Just load the held bills from localStorage, don't auto-restore
    const saved = localStorage.getItem('fastBilling_heldBills')
    if (saved) {
      const bills = JSON.parse(saved)
      setHeldBills(bills)
    }
  }, []) // Only run once on mount

  useEffect(() => {
    // Load invoice settings for instant receipt printing match
    const loadSettings = () => {
      api.settings.getInvoiceSettings().then(s => {
        if (s) setInvoiceSettings(s)
      }).catch(() => {})
    }
    loadSettings()

    window.addEventListener('invoice-settings-updated', loadSettings)
    window.addEventListener('company-updated', loadSettings)
    return () => {
      window.removeEventListener('invoice-settings-updated', loadSettings)
      window.removeEventListener('company-updated', loadSettings)
    }
  }, [])

  useEffect(() => {
    // Load customers - with optional walk-in names if API exists
    const loadCustomers = async () => {
      try {
        const registeredCustomers = await api.sales.getCustomers()
        console.log('👥 Loaded customers:', registeredCustomers.length, 'registered')
        
        // Try to load walk-in names if the API exists
        let walkInNames = []
        if (api.sales.getRecentWalkInNames) {
          try {
            walkInNames = await api.sales.getRecentWalkInNames()
            console.log('� Recent walk-in names:', walkInNames.length)
          } catch (err) {
            console.warn('⚠️ Could not load walk-in names:', err.message)
          }
        } else {
          console.log('⚠️ Walk-in names API not available (old version)')
        }
        
        // Combine: registered customers + walk-in names (with id: null)
        const allCustomers = [
          ...registeredCustomers,
          ...walkInNames.map(w => ({ id: null, name: w.name, balance: 0 }))
        ]
        
        // Remove duplicates (prefer registered customers)
        const uniqueCustomers = allCustomers.reduce((acc, curr) => {
          const existing = acc.find(c => c.name.toLowerCase() === curr.name.toLowerCase())
          if (!existing) {
            acc.push(curr)
          } else if (curr.id !== null && existing.id === null) {
            // Replace walk-in with registered customer
            const idx = acc.indexOf(existing)
            acc[idx] = curr
          }
          return acc
        }, [])
        
        console.log('   Total unique:', uniqueCustomers.length, 'customers')
        console.log('   First 5:', uniqueCustomers.slice(0, 5).map(c => c.name))
        setCustomers(uniqueCustomers)
      } catch (err) {
        console.error('❌ Error loading customers:', err)
        // Last resort fallback
        try {
          const customers = await api.sales.getCustomers()
          setCustomers(customers)
        } catch (e) {
          console.error('❌ Critical: Cannot load customers:', e)
        }
      }
    }
    
    loadCustomers()
    searchRef.current?.focus()
    
    // Reload customers when window regains focus
    const handleFocus = () => {
      console.log('🔄 Window focused - reloading customers...')
      loadCustomers()
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Keyboard shortcuts - separate useEffect
  useEffect(() => {
    const handle = (e) => {
      // Save Bill: Ctrl+S (case-insensitive)
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        e.stopPropagation()
        console.log('⌨️ Ctrl+S pressed - saving...')
        handleFinishSaleRef.current?.()
        return
      }
      
      // Print Bill: Ctrl+P (Save with invoice print, case-insensitive)
      if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        e.stopPropagation()
        console.log('⌨️ Ctrl+P pressed - saving with print...')
        handleFinishSaleWithPrintRef.current?.()
        return
      }
      
      // Focus on Flat Discount: Ctrl+F
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        e.stopPropagation()
        if (!canDiscount) {
          showAlert({
            type: 'warning',
            title: 'Access Restricted',
            message: 'Custom discounts are locked for your cashier account.'
          })
          return
        }
        document.getElementById('flat-discount-input')?.focus()
        document.getElementById('flat-discount-input')?.select()
        return
      }
      
      // Focus on Percent Discount: Ctrl+T
      if (e.ctrlKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        e.stopPropagation()
        if (!canDiscount) {
          showAlert({
            type: 'warning',
            title: 'Access Restricted',
            message: 'Custom discounts are locked for your cashier account.'
          })
          return
        }
        document.getElementById('percent-discount-input')?.focus()
        document.getElementById('percent-discount-input')?.select()
        return
      }
      
      // Focus on Customer Name Field: Ctrl+N
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        e.stopPropagation()
        document.getElementById('customer-search-input')?.focus()
        document.getElementById('customer-search-input')?.select()
        return
      }
      
      // Reload Customers: Ctrl+R
      if (e.ctrlKey && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        e.stopPropagation()
        console.log('🔄 Manual customer reload (Ctrl+R)...')
        
        api.sales.getCustomers().then(async (registeredCustomers) => {
          let walkInNames = []
          if (api.sales.getRecentWalkInNames) {
            try {
              walkInNames = await api.sales.getRecentWalkInNames()
            } catch (err) {
              console.warn('⚠️ Walk-in names failed:', err.message)
            }
          }
          
          const allCustomers = [
            ...registeredCustomers,
            ...walkInNames.map(w => ({ id: null, name: w.name, balance: 0 }))
          ]
          const uniqueCustomers = allCustomers.reduce((acc, curr) => {
            const existing = acc.find(c => c.name.toLowerCase() === curr.name.toLowerCase())
            if (!existing) {
              acc.push(curr)
            } else if (curr.id !== null && existing.id === null) {
              const idx = acc.indexOf(existing)
              acc[idx] = curr
            }
            return acc
          }, [])
          console.log('   Reloaded:', uniqueCustomers.length, 'customers')
          setCustomers(uniqueCustomers)
        }).catch(err => {
          console.error('❌ Error reloading:', err)
        })
        return
      }
      
      // Jump to Search Bar: Ctrl+I (from anywhere, especially payment panel)
      if (e.ctrlKey && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        e.stopPropagation()
        searchRef.current?.focus()
        searchRef.current?.select()
        return
      }
      
      // Jump to Customer Field: Ctrl+U
      if (e.ctrlKey && e.key.toLowerCase() === 'u') {
        e.preventDefault()
        e.stopPropagation()
        document.getElementById('customer-search-input')?.focus()
        document.getElementById('customer-search-input')?.select()
        return
      }
      
      // Navigate Bills: Ctrl+Left/Right
      if (e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        e.stopPropagation()
        navigateBill('prev')
        return
      }
      if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault()
        e.stopPropagation()
        navigateBill('next')
        return
      }
      
      // Hold Bill: F8
      if (e.key === 'F8') {
        console.log('⌨️ F8 key pressed!')
        e.preventDefault()
        e.stopPropagation()
        handleHoldBillRef.current?.()
        return
      }
      
      // Delete Current Row: Ctrl+D
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        e.stopPropagation()
        console.log('⌨️ Ctrl+D pressed - Deleting current row...')
        
        // Find which cart row is currently focused
        const focusedElement = document.activeElement
        const currentRow = focusedElement.closest('tr')
        
        if (currentRow && currentRow.closest('tbody')) {
          // Get the row index
          const tbody = currentRow.closest('tbody')
          const rows = Array.from(tbody.querySelectorAll('tr'))
          const rowIndex = rows.indexOf(currentRow)
          
          console.log('📌 Deleting cart row index:', rowIndex)
          
          if (rowIndex >= 0 && items.length > 1) {
            // Delete the row
            const updatedItems = items.filter((_, idx) => idx !== rowIndex)
            setItems(updatedItems)
            console.log('✅ Cart row deleted successfully')
            
            // Focus on the same row index or previous row
            setTimeout(() => {
              const newRows = document.querySelectorAll('tbody tr')
              const targetRow = newRows[Math.min(rowIndex, newRows.length - 1)]
              if (targetRow) {
                const firstInput = targetRow.querySelector('input')
                if (firstInput) {
                  firstInput.focus()
                  firstInput.select()
                }
              }
            }, 50)
          } else if (items.length <= 1) {
            // If only one item, clear it instead of deleting
            setItems([])
            searchRef.current?.focus()
            console.log('⚠️ Last item cleared, focus returned to search')
          }
        } else {
          console.error('❌ No cart row focused!')
        }
        return
      }
    }
    
    console.log('⌨️ Keyboard shortcuts registered')
    window.addEventListener('keydown', handle)
    return () => {
      console.log('⌨️ Keyboard shortcuts unregistered')
      window.removeEventListener('keydown', handle)
    }
  }, [items]) // Add items dependency for Ctrl+D to access current items state

  // Product search
  useEffect(() => {
    if (!searchQ.trim()) { 
      setSearchResults([])
      setSelectedIndex(-1)
      return 
    }
    const t = setTimeout(() => {
      api.inventory.searchProduct(searchQ).then(results => {
        setSearchResults(Array.isArray(results) ? results : [])
        setSelectedIndex(results?.length > 0 ? 0 : -1) // Auto-select first result
      }).catch(err => {
        console.error('❌ Search error:', err)
        setSearchResults([])
      })
    }, 60)
    return () => clearTimeout(t)
  }, [searchQ])

  // Live Multi-Counter Stock Sync: auto-refresh search results when other cashiers make a sale
  useEffect(() => {
    const unsubscribe = onLanEvent((event) => {
      if (event?.type === 'sale:created' || event?.type === 'stock:updated') {
        if (searchQ && searchQ.trim()) {
          api.inventory.searchProduct(searchQ).then(results => {
            setSearchResults(Array.isArray(results) ? results : [])
          }).catch(() => {})
        }
      }
    })
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [searchQ])

  // Keyboard navigation for search results
  const handleSearchKeyDown = (e) => {
    if (searchResults.length === 0) return

    // Ctrl+H shortcut directly from search dropdown to view history
    if (e.ctrlKey && e.key.toLowerCase() === 'h') {
      e.preventDefault()
      e.stopPropagation()
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        openHistoryPopup({ product_id: searchResults[selectedIndex].id, name: searchResults[selectedIndex].name })
      }
      return
    }

    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault()
        const nextIndex = selectedIndex < searchResults.length - 1 ? selectedIndex + 1 : 0
        setSelectedIndex(nextIndex)
        // Auto-scroll dropdown to show selected item
        scrollToSelectedItem(nextIndex)
        break
      case 'ArrowUp':
        e.preventDefault()
        const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : searchResults.length - 1
        setSelectedIndex(prevIndex)
        // Auto-scroll dropdown to show selected item
        scrollToSelectedItem(prevIndex)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          addItem(searchResults[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setSearchQ('')
        setSearchResults([])
        setSelectedIndex(-1)
        break
    }
  }

  // Auto-scroll dropdown to show selected item
  const scrollToSelectedItem = (index) => {
    if (searchDropdownRef.current) {
      const dropdown = searchDropdownRef.current
      const selectedButton = dropdown.children[index]
      if (selectedButton) {
        const dropdownHeight = dropdown.clientHeight
        const buttonTop = selectedButton.offsetTop
        const buttonHeight = selectedButton.clientHeight
        const scrollTop = dropdown.scrollTop
        
        // Scroll down if item is below visible area
        if (buttonTop + buttonHeight > scrollTop + dropdownHeight) {
          dropdown.scrollTop = buttonTop + buttonHeight - dropdownHeight
        }
        // Scroll up if item is above visible area
        else if (buttonTop < scrollTop) {
          dropdown.scrollTop = buttonTop
        }
      }
    }
  }

  // Keyboard navigation for cart table (Arrow keys navigation)
  const handleCartKeyDown = (e, rowIndex, field) => {
    if (items.length === 0) return

    const fields = ['qty', 'sale_price', 'discount_percent', 'delete']
    const currentFieldIndex = fields.indexOf(field)
    
    // Ctrl+H - Show item history popup
    if (e.ctrlKey && e.key.toLowerCase() === 'h') {
      e.preventDefault()
      e.stopPropagation()
      const item = items[rowIndex]
      if (item) openHistoryPopup(item)
      return
    }
    
    // Shift+Enter - Jump to payment panel (MUST BE FIRST!)
    if (e.shiftKey && e.key === 'Enter') {
      e.preventDefault()
      document.getElementById('global-discount-input')?.focus()
      return
    }

    switch(e.key) {
      case 'ArrowRight':
        e.preventDefault()
        // Move to next field in same row
        if (currentFieldIndex < fields.length - 1) {
          const nextField = fields[currentFieldIndex + 1]
          if (nextField === 'delete') {
            inputRefs.current[`${rowIndex}-delete-btn`]?.focus()
          } else {
            inputRefs.current[`${rowIndex}-${nextField}`]?.focus()
          }
        }
        break

      case 'ArrowLeft':
        e.preventDefault()
        // Move to previous field in same row
        if (currentFieldIndex > 0) {
          const prevField = fields[currentFieldIndex - 1]
          inputRefs.current[`${rowIndex}-${prevField}`]?.focus()
        }
        break

      case 'ArrowDown':
        e.preventDefault()
        // Move to same field in next row
        if (rowIndex < items.length - 1) {
          if (field === 'delete') {
            inputRefs.current[`${rowIndex + 1}-delete-btn`]?.focus()
          } else {
            inputRefs.current[`${rowIndex + 1}-${field}`]?.focus()
          }
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        // Move to same field in previous row
        if (rowIndex > 0) {
          if (field === 'delete') {
            inputRefs.current[`${rowIndex - 1}-delete-btn`]?.focus()
          } else {
            inputRefs.current[`${rowIndex - 1}-${field}`]?.focus()
          }
        }
        break

      case 'Enter':
        e.preventDefault()
        if (field === 'delete') {
          // Delete button - remove item
          removeItem(rowIndex)
          // Focus on search after delete
          searchRef.current?.focus()
        } else {
          // Enter key moves through fields in SAME row, then to search
          // It does NOT go to delete button or next row
          if (currentFieldIndex < fields.length - 2) {
            // Move to next input field (not delete)
            // fields.length - 2 because last element is 'delete'
            const nextField = fields[currentFieldIndex + 1]
            inputRefs.current[`${rowIndex}-${nextField}`]?.focus()
          } else {
            // At Disc% field (last input) - go to search bar
            searchRef.current?.focus()
          }
        }
        break

      case 'Tab':
        e.preventDefault()
        if (e.shiftKey) {
          // Shift+Tab - move backwards
          if (currentFieldIndex > 0) {
            const prevField = fields[currentFieldIndex - 1]
            inputRefs.current[`${rowIndex}-${prevField}`]?.focus()
          } else if (rowIndex > 0) {
            const lastField = fields[fields.length - 1]
            if (lastField === 'delete') {
              inputRefs.current[`${rowIndex - 1}-delete-btn`]?.focus()
            } else {
              inputRefs.current[`${rowIndex - 1}-${lastField}`]?.focus()
            }
          } else {
            // First field of first row - go to search
            searchRef.current?.focus()
          }
        } else {
          // Tab - move forwards
          if (currentFieldIndex < fields.length - 1) {
            const nextField = fields[currentFieldIndex + 1]
            if (nextField === 'delete') {
              inputRefs.current[`${rowIndex}-delete-btn`]?.focus()
            } else {
              inputRefs.current[`${rowIndex}-${nextField}`]?.focus()
            }
          } else if (rowIndex < items.length - 1) {
            // Last field of current row - move to first field of next row
            inputRefs.current[`${rowIndex + 1}-${fields[0]}`]?.focus()
          } else {
            // Last field of last row - go back to search
            searchRef.current?.focus()
          }
        }
        break
    }
  }

  // Helper to set ref
  const setInputRef = (rowIndex, field) => (el) => {
    if (el) {
      inputRefs.current[`${rowIndex}-${field}`] = el
    }
  }

  // Open item history popup
  const openHistoryPopup = async (item) => {
    if (!canViewHistory) {
      showAlert({
        type: 'warning',
        title: 'Access Restricted',
        message: 'Medicine sales history is locked for your cashier account.'
      })
      return
    }
    setHistoryPopup({ product_id: item.product_id, name: item.name, data: null })
    setHistoryLoading(true)
    try {
      const data = await api.sales.getProductHistory(item.product_id)
      setHistoryPopup({ product_id: item.product_id, name: item.name, data })
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const addItem = async (product) => {
    const availableStock = parseFloat(product.stock) || 0
    
    setSearchQ('')
    setSearchResults([])
    setSelectedIndex(-1)

    // Calculate current total quantity of this product already in cart
    const currentQtyInCart = items
      .filter(i => i.product_id === product.id)
      .reduce((sum, i) => sum + (parseFloat(i.qty) || 0), 0)

    // ZERO STOCK CASE: Allow adding to cart with qty = 0 so user can view history (Ctrl+H)
    if (availableStock <= 0) {
      const existingIdx = items.findIndex(i => i.product_id === product.id)
      if (existingIdx !== -1) {
        inputRefs.current[`${existingIdx}-qty`]?.focus()
        inputRefs.current[`${existingIdx}-qty`]?.select()
        return
      }

      try {
        const groups = await api.inventory.getFifoSplits(product.id, 0)
        if (!groups || groups.length === 0) return

        const mappedGroups = groups.map(g => ({
          ...g,
          qty: 0,
          total_stock: 0,
          current_stock: 0,
          discount_percent: 0,
          total: 0
        }))

        setItems(prev => {
          const updated = [...prev, ...mappedGroups]
          const targetFocusIndex = updated.length - 1
          setTimeout(() => {
            inputRefs.current[`${targetFocusIndex}-qty`]?.focus()
            inputRefs.current[`${targetFocusIndex}-qty`]?.select()
          }, 100)
          return updated
        })
      } catch (err) {
        console.error('Failed to add zero stock item to cart:', err)
      }
      return
    }

    // NORMAL STOCK CASE (availableStock > 0)
    const targetQty = currentQtyInCart + 1
    if (targetQty > availableStock) {
      showAlert({
        title: 'Stock Limit Reached',
        message: `Only ${availableStock} available in stock for "${product.name}". Cannot add more.`,
        type: 'warning'
      })
      return
    }

    try {
      const groups = await api.inventory.getFifoSplits(product.id, targetQty)
      if (!groups || groups.length === 0) return

      // Preserve discount percent from existing item if any
      const existingItem = items.find(i => i.product_id === product.id)
      const existingDisc = existingItem?.discount_percent || 0

      const mappedGroups = groups.map(g => {
        const disc = existingDisc
        const base = g.qty * g.sale_price
        const total = base * (1 - disc / 100)
        return {
          ...g,
          discount_percent: disc,
          total: Math.round(total * 100) / 100
        }
      })

      setItems(prev => {
        const otherItems = prev.filter(i => i.product_id !== product.id)
        const updated = [...otherItems, ...mappedGroups]
        const targetFocusIndex = updated.length - 1
        setTimeout(() => {
          inputRefs.current[`${targetFocusIndex}-qty`]?.focus()
          inputRefs.current[`${targetFocusIndex}-qty`]?.select()
        }, 100)
        return updated
      })
    } catch (err) {
      console.error('Failed to add item with FIFO splits:', err)
    }
  }

  const handleQtyCommit = async (idx) => {
    const targetItem = items[idx]
    if (!targetItem || targetItem.price_overridden) return

    const maxStock = parseFloat(targetItem.total_stock) || 0
    if (maxStock <= 0) {
      // Out of stock product, remain 0
      return
    }

    // Calculate total quantity requested for this product across cart
    const productItems = items.filter(i => i.product_id === targetItem.product_id)
    let totalRequestedQty = productItems.reduce((sum, i) => sum + (parseFloat(i.qty) || 0), 0)
    if (totalRequestedQty <= 0) return

    if (maxStock > 0 && totalRequestedQty > maxStock) {
      showAlert({
        title: 'Stock Limit Exceeded',
        message: `Only ${maxStock} available in stock for "${targetItem.name}". Quantity adjusted to ${maxStock}.`,
        type: 'warning'
      })
      totalRequestedQty = maxStock
    }

    try {
      const groups = await api.inventory.getFifoSplits(targetItem.product_id, totalRequestedQty)
      if (!groups || groups.length === 0) return

      const existingDisc = targetItem.discount_percent || 0
      const mappedGroups = groups.map(g => {
        const disc = existingDisc
        const base = g.qty * g.sale_price
        const total = base * (1 - disc / 100)
        return {
          ...g,
          discount_percent: disc,
          total: Math.round(total * 100) / 100
        }
      })

      setItems(prev => {
        const firstIndex = prev.findIndex(i => i.product_id === targetItem.product_id)
        if (firstIndex === -1) return prev
        const before = prev.slice(0, firstIndex).filter(i => i.product_id !== targetItem.product_id)
        const after = prev.slice(firstIndex).filter(i => i.product_id !== targetItem.product_id)
        return [...before, ...mappedGroups, ...after]
      })
    } catch (err) {
      console.error('Failed to update item with FIFO splits:', err)
    }
  }

  const calcTotal = (item) => {
    const base = item.qty * item.sale_price
    const disc = base * (item.discount_percent / 100)
    return base - disc
  }

  const updateItem = (idx, field, value) => {
    const updated = [...items]
    if (field === 'qty') {
      const enteredQty = parseFloat(value) || 0
      const maxStock = parseFloat(updated[idx].total_stock || updated[idx].current_stock) || 0
      
      if (maxStock <= 0) {
        if (enteredQty > 0) {
          showAlert({
            title: 'Item Out of Stock',
            message: `"${updated[idx].name}" is OUT OF STOCK (0 in stock). Quantity cannot be set above 0.`,
            type: 'warning'
          })
        }
        value = 0
      } else if (enteredQty > maxStock) {
        showAlert({
          title: 'Stock Limit Exceeded',
          message: `Only ${maxStock} available in stock for "${updated[idx].name}". Quantity adjusted to ${maxStock}.`,
          type: 'warning'
        })
        value = maxStock
      }
      // Quantity modified: clear stale splits so old batch qty is never used
      delete updated[idx].splits
    } else if (field === 'sale_price') {
      updated[idx].price_overridden = true
    }
    updated[idx][field] = value
    updated[idx].total = calcTotal(updated[idx])
    setItems(updated)
  }

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx))

  const grossTotal = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.sale_price) || 0), 0)
  const subTotal  = items.reduce((s, i) => s + i.total, 0)
  
  // Calculate per-item discounts total
  const perItemDiscAmt = items.reduce((sum, item) => {
    const itemBase = (parseFloat(item.qty) || 0) * (parseFloat(item.sale_price) || 0)
    const itemDisc = itemBase * ((parseFloat(item.discount_percent) || 0) / 100)
    return sum + itemDisc
  }, 0)
  
  const percentDiscAmt = subTotal * (percentDiscount / 100) // First apply percentage
  const afterPercent = subTotal - percentDiscAmt
  const totalDiscAmt = percentDiscAmt + parseFloat(flatDiscount || 0) // Then add flat discount
  
  // Grand total discount including per-item discounts
  const grandTotalDiscount = perItemDiscAmt + totalDiscAmt
  
  const grandTotal = subTotal - totalDiscAmt
  const change    = (parseFloat(paidAmount) || 0) - grandTotal
  
  // Calculate total profit using effective cost and item-level revenue
  const totalProfit = items.reduce((sum, item) => {
    // Effective cost per unit (per pill/piece)
    const unitCost = (item.profit_percent && item.profit_percent !== 0)
      ? ((parseFloat(item.sale_price) || 0) * (1 - (parseFloat(item.profit_percent) || 0) / 100))
      : ((item.purchase_price !== undefined && item.purchase_price !== null && item.purchase_price !== '')
          ? parseFloat(item.purchase_price) || 0
          : 0)
    const costTotal = unitCost * (parseFloat(item.qty) || 0)
    
    // Selling revenue for this item after item-level discount
    const itemRevenue = parseFloat(item.total) || ((parseFloat(item.qty) || 0) * (parseFloat(item.sale_price) || 0) * (1 - (parseFloat(item.discount_percent) || 0) / 100))
    return sum + (itemRevenue - costTotal)
  }, 0)
  
  // Final Net Profit after invoice-level discount (percentage + flat)
  const finalProfit = totalProfit - (parseFloat(totalDiscAmt) || 0)

  const handleFinishSale = useCallback(async () => {
    if (items.length === 0) return
    
    // Check for zero-stock, zero-qty, or unpurchased items
    const invalidItems = items.filter(item => 
      !item.purchase_item_id || 
      (parseFloat(item.qty) || 0) <= 0 || 
      (parseFloat(item.total_stock) || 0) <= 0 ||
      (parseFloat(item.qty) || 0) > (parseFloat(item.total_stock) || 0)
    )
    if (invalidItems.length > 0) {
      const names = invalidItems.map(i => `• ${i.name} (Stock: ${i.total_stock || 0}, Qty: ${i.qty})`).join('\n')
      showAlert({
        title: 'Cannot Save Bill — Out of Stock Item',
        message: `The following item(s) cannot be billed because they are out of stock or have 0 quantity:\n\n${names}\n\nPlease remove them before completing the sale.`,
        type: 'warning',
        actionLabel: 'Remove Out-of-Stock Items',
        onAction: () => {
          setItems(prev => prev.filter(i => 
            (parseFloat(i.qty) || 0) > 0 && 
            (parseFloat(i.total_stock) || 0) > 0 && 
            (parseFloat(i.qty) || 0) <= (parseFloat(i.total_stock) || 0) &&
            i.purchase_item_id
          ))
        }
      })
      return
    }
    
    console.log('💰 Finishing sale with items:', items.map(i => ({
      product_id: i.product_id,
      name: i.name,
      purchase_item_id: i.purchase_item_id,
      qty: i.qty,
      sale_price: i.sale_price
    })))
    
    setSaving(true)
    try {
      const result = await api.sales.createInvoice({
        customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer ? selectedCustomer.name : (customerSearch.trim() || null),
        payment_method: paymentMethod,
        sub_total: grossTotal,
        discount: grandTotalDiscount,
        tax: 0,
        grand_total: grandTotal,
        paid_amount: parseFloat(paidAmount) || (paymentMethod === 'cash' ? grandTotal : 0),
        change_amount: Math.max(change, 0),
        items: items.map(i => {
          const itemQty = parseFloat(i.qty) || 0
          const splitsTotal = (i.splits && Array.isArray(i.splits))
            ? i.splits.reduce((sum, sp) => sum + (parseFloat(sp.qty) || 0), 0)
            : 0
          const isSplitsValid = Boolean(i.splits && Math.abs(splitsTotal - itemQty) < 0.001)

          return {
            product_id: i.product_id,
            purchase_item_id: i.purchase_item_id,
            expiry_date: i.expiry_date,
            qty: itemQty,
            sale_price: i.sale_price,
            discount_percent: i.discount_percent,
            total: i.total,
            splits: isSplitsValid ? i.splits : null,
            price_overridden: Boolean(i.price_overridden)
          }
        }),
      })
      setSuccess(result.invoice_no || 'INV')
      
      // If this was a held bill, remove it from held bills
      if (currentBillIndex >= 0) {
        const saved = localStorage.getItem('fastBilling_heldBills')
        const existingBills = saved ? JSON.parse(saved) : []
        existingBills.splice(currentBillIndex, 1)
        localStorage.setItem('fastBilling_heldBills', JSON.stringify(existingBills))
        setHeldBills(existingBills)
        setCurrentBillIndex(-1)
      }
      
      setItems([]); setSearchQ(''); setSelectedCustomer(null); setCustomerSearch('')
      setPaidAmount(''); setPercentDiscount(0); setFlatDiscount(0)
      setSaving(false)
      setTimeout(() => { setSuccess(null); searchRef.current?.focus() }, 2500)
    } catch (e) {
      showAlert({
        title: 'Sale Error',
        message: e.message || 'An error occurred while saving invoice.',
        type: 'error'
      })
      setSaving(false)
    }
  }, [items, selectedCustomer, paymentMethod, subTotal, grossTotal, totalDiscAmt, grandTotalDiscount, grandTotal, paidAmount, change, currentBillIndex, heldBills, showAlert])
  
  // Save and Print - for Ctrl+P
  const handleFinishSaleWithPrint = useCallback(async () => {
    if (items.length === 0) return
    
    // Check for zero-stock, zero-qty, or unpurchased items
    const invalidItems = items.filter(item => 
      !item.purchase_item_id || 
      (parseFloat(item.qty) || 0) <= 0 || 
      (parseFloat(item.total_stock) || 0) <= 0 ||
      (parseFloat(item.qty) || 0) > (parseFloat(item.total_stock) || 0)
    )
    if (invalidItems.length > 0) {
      const names = invalidItems.map(i => `• ${i.name} (Stock: ${i.total_stock || 0}, Qty: ${i.qty})`).join('\n')
      showAlert({
        title: 'Cannot Save Bill — Out of Stock Item',
        message: `The following item(s) cannot be billed because they are out of stock or have 0 quantity:\n\n${names}\n\nPlease remove them before saving.`,
        type: 'warning',
        actionLabel: 'Remove Out-of-Stock Items',
        onAction: () => {
          setItems(prev => prev.filter(i => 
            (parseFloat(i.qty) || 0) > 0 && 
            (parseFloat(i.total_stock) || 0) > 0 && 
            (parseFloat(i.qty) || 0) <= (parseFloat(i.total_stock) || 0) &&
            i.purchase_item_id
          ))
        }
      })
      return
    }
    
    console.log('💰🖨️ Finishing sale with print:', items.map(i => ({
      product_id: i.product_id,
      name: i.name,
      purchase_item_id: i.purchase_item_id,
      qty: i.qty,
      sale_price: i.sale_price
    })))
    
    console.log('👤 Customer info:', {
      selectedCustomer,
      customerSearch,
      will_send: selectedCustomer ? selectedCustomer.name : (customerSearch.trim() || null)
    })
    
    setSaving(true)
    try {
      const result = await api.sales.createInvoice({
        customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer ? selectedCustomer.name : (customerSearch.trim() || null),
        payment_method: paymentMethod,
        sub_total: grossTotal,
        discount: grandTotalDiscount,
        tax: 0,
        grand_total: grandTotal,
        paid_amount: parseFloat(paidAmount) || (paymentMethod === 'cash' ? grandTotal : 0),
        change_amount: Math.max(change, 0),
        items: items.map(i => {
          const itemQty = parseFloat(i.qty) || 0
          const splitsTotal = (i.splits && Array.isArray(i.splits))
            ? i.splits.reduce((sum, sp) => sum + (parseFloat(sp.qty) || 0), 0)
            : 0
          const isSplitsValid = Boolean(i.splits && Math.abs(splitsTotal - itemQty) < 0.001)

          return {
            product_id: i.product_id,
            purchase_item_id: i.purchase_item_id,
            expiry_date: i.expiry_date,
            qty: itemQty,
            sale_price: i.sale_price,
            discount_percent: i.discount_percent,
            total: i.total,
            splits: isSplitsValid ? i.splits : null,
            price_overridden: Boolean(i.price_overridden)
          }
        }),
      })
      setSuccess(result.invoice_no || 'INV')
      
      // ENABLED for Ctrl+P: Show invoice for print
      try {
        const [invoiceDetails, freshSettings] = await Promise.all([
          api.sales.getInvoiceById(result.id),
          api.settings.getInvoiceSettings() // Always fresh from DB!
        ])
        if (freshSettings) setInvoiceSettings(freshSettings)
        setAutoPrint(true) // Enable auto-print for Ctrl+P
        setPrintInvoice(invoiceDetails)
      } catch (e) {
        console.error('Failed to fetch invoice for printing:', e)
      }
      
      // If this was a held bill, remove it from held bills
      if (currentBillIndex >= 0) {
        const saved = localStorage.getItem('fastBilling_heldBills')
        const existingBills = saved ? JSON.parse(saved) : []
        existingBills.splice(currentBillIndex, 1)
        localStorage.setItem('fastBilling_heldBills', JSON.stringify(existingBills))
        setHeldBills(existingBills)
        setCurrentBillIndex(-1)
      }
      
      setItems([]); setSearchQ(''); setSelectedCustomer(null); setCustomerSearch('')
      setPaidAmount(''); setPercentDiscount(0); setFlatDiscount(0)
      setSaving(false)
      setTimeout(() => { setSuccess(null); searchRef.current?.focus() }, 2500)
    } catch (e) {
      showAlert({
        title: 'Sale Error',
        message: e.message || 'An error occurred while saving invoice.',
        type: 'error'
      })
      setSaving(false)
    }
  }, [items, selectedCustomer, paymentMethod, subTotal, grossTotal, totalDiscAmt, grandTotalDiscount, grandTotal, paidAmount, change, currentBillIndex, heldBills, showAlert])
  
  // Hold current bill and start new one
  const handleHoldBill = useCallback(() => {
    console.log('🔔 handleHoldBill called! Items:', items.length)
    
    if (items.length === 0) {
      console.log('⚠️ Cart is empty, showing alert')
      showAlert({
        title: 'Hold Bill',
        message: 'Cart is empty. Nothing to hold.',
        type: 'info'
      })
      return
    }
    
    console.log('✅ Creating bill to hold with', items.length, 'items')
    const billToHold = {
      items: [...items],
      customer: selectedCustomer,
      paymentMethod,
      paidAmount,
      percentDiscount,
      flatDiscount,
      timestamp: new Date().toISOString()
    }
    
    if (currentBillIndex >= 0) {
      // Update existing held bill
      console.log('🔄 Updating existing held bill at index', currentBillIndex)
      setHeldBills(prev => {
        const updated = [...prev]
        updated[currentBillIndex] = billToHold
        console.log('💾 Updated held bills:', updated.length, 'total')
        return updated
      })
    } else {
      // Add new held bill
      console.log('➕ Adding new held bill')
      setHeldBills(prev => {
        const newBills = [...prev, billToHold]
        console.log('💾 New held bills array:', newBills.length, 'total')
        return newBills
      })
    }
    
    console.log('🧹 Resetting cart to new bill')
    // Reset to new bill
    setCurrentBillIndex(-1)
    setItems([])
    setSelectedCustomer(null)
    setPaymentMethod('cash')
    setPaidAmount('')
    setPercentDiscount(0)
    setFlatDiscount(0)
    setSearchQ('')
    
    searchRef.current?.focus()
    console.log('✅ handleHoldBill completed successfully')
  }, [items, selectedCustomer, paymentMethod, paidAmount, percentDiscount, flatDiscount, currentBillIndex, showAlert])
  
  // Update ref whenever handleFinishSale changes
  useEffect(() => {
    handleFinishSaleRef.current = handleFinishSale
    handleFinishSaleWithPrintRef.current = handleFinishSaleWithPrint
    handleHoldBillRef.current = handleHoldBill
  }, [handleFinishSale, handleFinishSaleWithPrint, handleHoldBill])

  // Navigate between held bills
  const navigateBill = (direction) => {
    if (heldBills.length === 0) {
      showAlert({
        title: 'Held Bills',
        message: 'No held bills available.',
        type: 'info'
      })
      return
    }
    
    // Save current bill if it has items
    if (items.length > 0 && currentBillIndex === -1) {
      handleHoldBill()
      return
    }
    
    let newIndex
    if (direction === 'prev') {
      if (currentBillIndex <= 0) {
        newIndex = heldBills.length - 1 // Go to last
      } else {
        newIndex = currentBillIndex - 1
      }
    } else { // next
      if (currentBillIndex === -1 || currentBillIndex >= heldBills.length - 1) {
        newIndex = 0 // Go to first
      } else {
        newIndex = currentBillIndex + 1
      }
    }
    
    loadHeldBill(newIndex)
  }

  // Load a held bill
  const loadHeldBill = (index) => {
    if (index < 0 || index >= heldBills.length) return
    
    const bill = heldBills[index]
    setItems(bill.items)
    setSelectedCustomer(bill.customer)
    setPaymentMethod(bill.paymentMethod)
    setPaidAmount(bill.paidAmount)
    setPercentDiscount(bill.percentDiscount || 0)
    setFlatDiscount(bill.flatDiscount || 0)
    setCurrentBillIndex(index)
    searchRef.current?.focus()
  }

  // Delete a held bill
  const deleteHeldBill = (index) => {
    if (!window.confirm('Delete this held bill?')) return
    
    setHeldBills(prev => prev.filter((_, idx) => idx !== index))
    
    if (currentBillIndex === index) {
      // If deleting current bill, reset to new
      setCurrentBillIndex(-1)
      setItems([])
      setSelectedCustomer(null)
      setPaymentMethod('cash')
      setPaidAmount('')
      setPercentDiscount(0)
      setFlatDiscount(0)
    } else if (currentBillIndex > index) {
      // Adjust index if we deleted a bill before current
      setCurrentBillIndex(prev => prev - 1)
    }
  }

  const expiryBadge = (exp) => {
    if (!exp) return null
    const days = (new Date(exp) - new Date()) / 86400000
    if (days < 0)   return <span className="badge-error">EXPIRED</span>
    if (days < 90)  return <span className="badge-warning">{exp}</span>
    return <span className="badge-success">{exp}</span>
  }

  return (
    <div className="flex h-[calc(100vh-44px)] overflow-hidden">
      {/* Left — Cart */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-5 py-3 bg-white border-b border-[#c3c6d5] flex items-center gap-4">
          <h2 className="text-[17px] font-bold text-[#003c90]" style={{ fontFamily: 'Hanken Grotesk' }}>
            Fast Billing
          </h2>
          
          {/* Held Bills Indicator */}
          {heldBills.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-6 w-px bg-[#c3c6d5]" />
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-300 rounded-lg">
                <span className="material-symbols-outlined text-[16px] text-amber-700">schedule</span>
                <span className="text-[11px] font-bold text-amber-900">
                  {currentBillIndex >= 0 
                    ? `Bill ${currentBillIndex + 1} of ${heldBills.length}` 
                    : `${heldBills.length} Held Bill${heldBills.length > 1 ? 's' : ''}`}
                </span>
                {currentBillIndex >= 0 && (
                  <>
                    <span className="text-[10px] text-amber-700">|</span>
                    <span className="text-[10px] text-amber-700">
                      {items.length} item{items.length !== 1 ? 's' : ''} • PKR {fmt(grandTotal)}
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={() => navigateBill('prev')}
                className="px-2.5 py-1 bg-white hover:bg-[#f2f4f6] rounded border border-[#c3c6d5] text-[#434653] hover:text-[#003c90] text-[11px] font-semibold transition-colors"
                title="Previous Bill (Ctrl+←)"
              >
                Previous
              </button>
              <button
                onClick={() => navigateBill('next')}
                className="px-2.5 py-1 bg-white hover:bg-[#f2f4f6] rounded border border-[#c3c6d5] text-[#434653] hover:text-[#003c90] text-[11px] font-semibold transition-colors"
                title="Next Bill (Ctrl+→)"
              >
                Next
              </button>
              {/* Delete Current Held Bill - NO POPUP */}
              {currentBillIndex >= 0 && (
                <button
                  onClick={() => {
                    // Direct delete - no confirmation popup
                    const updatedBills = heldBills.filter((_, idx) => idx !== currentBillIndex)
                    setHeldBills(updatedBills)
                    localStorage.setItem('fastBilling_heldBills', JSON.stringify(updatedBills))
                    // Clear cart and reset
                    setItems([])
                    setSelectedCustomer(null)
                    setPaidAmount('')
                    setPercentDiscount(0)
                    setFlatDiscount(0)
                    setCurrentBillIndex(-1)
                    console.log('✅ Held bill deleted instantly (no freeze)')
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-red-50 rounded border border-red-300 text-red-600 hover:text-red-700 text-[11px] font-semibold transition-colors"
                  title="Delete this held bill"
                >
                  Delete
                </button>
              )}
              {/* Clear ALL Held Bills - NO POPUP */}
              <button
                onClick={() => {
                  // Direct delete - no confirmation popup
                  localStorage.removeItem('fastBilling_heldBills')
                  setHeldBills([])
                  setCurrentBillIndex(-1)
                  setItems([])
                  setSelectedCustomer(null)
                  setPaidAmount('')
                  setPercentDiscount(0)
                  setFlatDiscount(0)
                  console.log('✅ All held bills cleared instantly (no freeze)')
                }}
                className="px-2.5 py-1 bg-white hover:bg-red-50 rounded border border-red-300 text-red-600 hover:text-red-700 text-[11px] font-semibold transition-colors"
                title="Clear ALL held bills"
              >
                Clear All
              </button>
            </div>
          )}
          
          <span className="text-[11px] bg-[#eceef0] px-2.5 py-1 rounded-full text-[#434653] font-semibold">
            {items.length} items
          </span>
          <div className="flex-1" />
          {/* Customer select */}
          <div className="relative w-56">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-[#737784]">person</span>
            <input
              id="customer-search-input"
              type="text"
              value={customerSearch || selectedCustomer?.name || ''}
              onChange={e => { 
                const searchVal = e.target.value
                setCustomerSearch(searchVal); 
                setSelectedCustomer(null);
                setSelectedCustomerDropdownIndex(0); // Reset selection
                
                // Debug: Show matching customers
                if (searchVal) {
                  const matches = customers.filter(c => c.name.toLowerCase().includes(searchVal.toLowerCase()))
                  console.log(`🔍 Search "${searchVal}": ${matches.length} matches`, matches.map(c => c.name))
                }
              }}
              onKeyDown={e => {
                if (!customerSearch) return;
                
                const matchingCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()));
                const totalOptions = matchingCustomers.length + 1; // +1 for "Use as Walk-in" button
                
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedCustomerDropdownIndex(prev => (prev + 1) % totalOptions);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedCustomerDropdownIndex(prev => prev === 0 ? totalOptions - 1 : prev - 1);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  
                  // Check if selecting a customer or the "Use as Walk-in" option
                  if (selectedCustomerDropdownIndex < matchingCustomers.length) {
                    // Select existing customer
                    const selectedCust = matchingCustomers[selectedCustomerDropdownIndex];
                    setSelectedCustomer(selectedCust);
                    setCustomerSearch('');
                    setSelectedCustomerDropdownIndex(0);
                  } else {
                    // Use as walk-in customer
                    setSelectedCustomer({ name: customerSearch, id: null });
                    setCustomerSearch('');
                    setSelectedCustomerDropdownIndex(0);
                  }
                } else if (e.key === 'Escape') {
                  setCustomerSearch('');
                  setSelectedCustomerDropdownIndex(0);
                }
              }}
              placeholder="Walk-in Customer"
              className="w-full pl-8 pr-3 py-1.5 border border-[#c3c6d5] rounded text-[12px] bg-[#f7f9fb]"
            />
            {customerSearch && (
              <div className="absolute top-full left-0 right-0 bg-white border border-[#c3c6d5] rounded shadow-lg z-20 max-h-60 overflow-y-auto mt-1">
                {/* Show matching customers */}
                {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length > 0 ? (
                  <>
                    {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map((c, idx) => (
                      <button 
                        key={c.id} 
                        onClick={() => { 
                          setSelectedCustomer(c); 
                          setCustomerSearch('');
                          setSelectedCustomerDropdownIndex(0);
                        }}
                        className={`w-full text-left px-3 py-2 text-[12px] hover:bg-[#f2f4f6] transition-colors border-b border-[#eceef0] flex items-center gap-2 ${
                          selectedCustomerDropdownIndex === idx ? 'bg-[#e3f2fd]' : ''
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px] text-[#003c90]">person</span>
                        <span className="flex-1">{c.name}</span>
                        {c.balance > 0 && <span className="text-red-500 text-[10px] font-semibold">Bal: {fmt(c.balance)}</span>}
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="px-3 py-2 text-[11px] text-[#737784] italic">
                    No matching customer found
                  </div>
                )}
                
                {/* Add new customer button */}
                <button 
                  onClick={() => {
                    // Use the typed name as customer name
                    setSelectedCustomer({ name: customerSearch, id: null })
                    // Clear search to close dropdown
                    setCustomerSearch('');
                    setSelectedCustomerDropdownIndex(0);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-[12px] bg-[#f7f9fb] hover:bg-[#eceef0] transition-colors flex items-center gap-2 border-t-2 border-[#003c90] ${
                    selectedCustomerDropdownIndex === customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length ? 'bg-[#e3f2fd]' : ''
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px] text-[#003c90]">add_circle</span>
                  <span className="text-[#003c90] font-semibold">Use "{customerSearch}" as Walk-in</span>
                </button>
              </div>
            )}
          </div>
          <button onClick={() => {
            // Clear cart + Delete held bill (Option A)
            
            // Always delete from held bills when Clear is clicked
            if (currentBillIndex >= 0) {
              // User loaded a held bill with Ctrl+← - delete it
              const updatedBills = heldBills.filter((_, idx) => idx !== currentBillIndex)
              setHeldBills(updatedBills)
              localStorage.setItem('fastBilling_heldBills', JSON.stringify(updatedBills))
              setCurrentBillIndex(-1)
            } else if (heldBills.length > 0) {
              // No held bill loaded but bills exist - delete first one
              const updatedBills = heldBills.slice(1)
              setHeldBills(updatedBills)
              localStorage.setItem('fastBilling_heldBills', JSON.stringify(updatedBills))
            }
            
            // Always clear current cart
            setItems([])
            setSelectedCustomer(null)
            setPaidAmount('')
            setPercentDiscount(0)
            setFlatDiscount(0)
          }}
            className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded text-[12px] font-semibold hover:bg-red-50 transition-colors">
            <span className="material-symbols-outlined text-[16px]">delete_sweep</span>Clear
          </button>
        </div>

        {/* Product Search */}
        <div className="px-5 py-2.5 bg-[#f7f9fb] border-b border-[#c3c6d5] relative">
          <div className="relative max-w-xl">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737784] text-[20px]">search</span>
            <input
              ref={searchRef}
              type="text" 
              value={searchQ} 
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search product or scan barcode"
              className="w-full pl-10 pr-4 py-2 border-2 border-[#003c90]/30 rounded-lg text-[13px] bg-white focus:border-[#003c90] transition-colors"
            />
          </div>
          {searchResults.length > 0 && (
            <div 
              ref={searchDropdownRef}
              className="absolute top-full left-5 right-5 bg-white border border-[#c3c6d5] rounded-lg shadow-xl z-30 max-h-64 overflow-y-auto"
            >
              {searchResults.map((p, idx) => {
                // Current active batch stock
                const currentStock = p.current_batch_stock || 0
                const currentBoxes = p.current_batch_boxes || 0
                const currentLoose = p.current_batch_loose || 0
                
                // Total stock across all batches - Calculate from total pills
                const totalStock = p.stock || 0
                const pcsInPack = p.pcs_in_pack || 1
                const totalBoxes = pcsInPack > 1 ? Math.floor(totalStock / pcsInPack) : 0
                const totalLoose = pcsInPack > 1 ? totalStock % pcsInPack : totalStock
                
                return (
                <button 
                  key={p.id} 
                  onClick={() => addItem(p)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors border-b border-[#eceef0] last:border-0 ${
                    idx === selectedIndex 
                      ? 'bg-[#003c90] text-white' 
                      : 'hover:bg-[#f2f4f6]'
                  }`}
                >
                  <div>
                    <p className={`text-[13px] font-semibold ${idx === selectedIndex ? 'text-white' : 'text-[#191c1e]'}`}>
                      {p.name}
                    </p>
                    <p className={`text-[11px] ${idx === selectedIndex ? 'text-white/80' : 'text-[#737784]'}`}>
                      {p.company_name || 'N/A'}
                      {pcsInPack > 1 && (
                        <span className={`ml-2 text-[10px] font-semibold ${idx === selectedIndex ? 'text-white/90' : 'text-[#003c90]'} px-2 py-0.5 rounded ${idx === selectedIndex ? 'bg-white/20' : 'bg-blue-100'}`}>
                          {pcsInPack} pills/box
                        </span>
                      )}
                    </p>
                    {(p.current_purchase_price || p.trade_price) && (
                      <p className={`text-[10px] mt-0.5 ${idx === selectedIndex ? 'text-white/70' : 'text-[#737784]'}`}>
                        Purchase: PKR {fmt(p.current_purchase_price || p.trade_price)}/box
                      </p>
                    )}
                    {p.current_expiry && (
                      <p className={`text-[10px] mt-0.5 ${idx === selectedIndex ? 'text-white/70' : 'text-amber-600'}`}>
                        Exp: {p.current_expiry}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className={`text-[13px] font-bold ${idx === selectedIndex ? 'text-white' : 'text-[#003c90]'}`}>
                      PKR {fmt(p.current_sale_price || p.sale_price)}/box
                    </p>
                    {/* Total Stock (All Batches) - Highlighted */}
                    <p className={`text-[11px] font-bold mt-1 ${
                      idx === selectedIndex 
                        ? 'text-white'
                        : totalStock <= 0 ? 'text-red-600' : totalStock < 20 ? 'text-amber-600' : 'text-blue-600'
                    }`}>
                      Total: {totalStock} pills
                    </p>
                    {p.pcs_in_pack > 1 && totalBoxes >= 0 && (
                      <p className={`text-[10px] font-semibold ${idx === selectedIndex ? 'text-white/80' : 'text-[#434653]'}`}>
                        ({totalBoxes} box{totalBoxes !== 1 ? 'es' : ''} + {totalLoose})
                      </p>
                    )}
                  </div>
                </button>
              )}
              )}
            </div>
          )}
        </div>

        {/* Cart Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#f2f4f6] z-10">
              <tr>
                {['#', 'Product', 'Company', 'Rack', 'Expiry', 'Qty', 'Price', 'Disc%', 'Total', ''].map(h => (
                  <th key={h} className={`px-3 py-2.5 text-[11px] font-bold text-[#434653] uppercase tracking-wider border-b border-[#c3c6d5] ${['Qty','Price','Disc%','Total'].includes(h) ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-16 text-center">
                  <span className="material-symbols-outlined text-[48px] text-[#c3c6d5] block mb-2">shopping_cart</span>
                  <p className="text-[13px] text-[#737784]">Search and add products above</p>
                </td></tr>
              ) : items.map((item, idx) => {
                const isOutOfStock = (parseFloat(item.total_stock) || 0) <= 0 || (parseFloat(item.qty) || 0) <= 0
                // Calculate remaining stock after this sale for CURRENT PURCHASE ENTRY
                const currentRemaining = Math.max(0, (parseFloat(item.current_stock) || 0) - (parseFloat(item.qty) || 0))
                const pcsInPack = item.pcs_in_pack || 1
                const currentBoxes = pcsInPack > 1 ? Math.floor(currentRemaining / pcsInPack) : 0
                const currentLoose = pcsInPack > 1 ? currentRemaining % pcsInPack : currentRemaining
                
                // Calculate total remaining across ALL purchase entries for this product
                const productCartTotal = items
                  .filter(i => i.product_id === item.product_id)
                  .reduce((sum, i) => sum + (parseFloat(i.qty) || 0), 0)
                const totalRemaining = (parseFloat(item.total_stock) || 0) - productCartTotal
                const totalBoxes = pcsInPack > 1 ? Math.floor(totalRemaining / pcsInPack) : 0
                const totalLoose = pcsInPack > 1 ? totalRemaining % pcsInPack : totalRemaining
                
                return (
                <React.Fragment key={idx}>
                  <tr className={`hover:bg-[#f7f9fb] group transition-colors border-b border-[#eceef0] ${isOutOfStock ? 'bg-red-50/40' : ''}`}>
                    <td className="px-3 py-2 text-[11px] font-mono text-[#737784]">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[12px] font-semibold text-[#191c1e]">{item.name}</p>
                        {isOutOfStock && (
                          <span className="px-1.5 py-0.5 bg-red-100 border border-red-200 text-red-700 text-[9px] font-bold rounded">
                            OUT OF STOCK
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#737784]">{item.category}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[11px] text-[#434653]">{item.manufacturer_name || '—'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-block px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-[10px] font-bold text-amber-700">
                        {item.rack_location || 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 py-2">{expiryBadge(item.expiry_date)}</td>
                    <td className="px-3 py-2 text-right">
                      <input 
                        ref={setInputRef(idx, 'qty')}
                        type="number" 
                        value={item.qty} 
                        min="0" 
                        step="1"
                        onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                        onBlur={() => handleQtyCommit(idx)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleQtyCommit(idx)
                          handleCartKeyDown(e, idx, 'qty')
                        }}
                        onFocus={e => e.target.select()}
                        className={`w-16 px-2 py-1 text-right border rounded text-[12px] focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          isOutOfStock 
                            ? 'border-red-300 bg-red-50/50 text-red-700 font-bold focus:border-red-500 focus:ring-red-200' 
                            : 'border-[#c3c6d5] focus:border-[#003c90] focus:ring-[#003c90]/20'
                        }`}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <input 
                          ref={setInputRef(idx, 'sale_price')}
                          type="number" 
                          value={item.sale_price} 
                          min="0"
                          onChange={e => updateItem(idx, 'sale_price', parseFloat(e.target.value) || 0)}
                          onKeyDown={e => handleCartKeyDown(e, idx, 'sale_price')}
                          onFocus={e => e.target.select()}
                          className="w-24 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] font-mono focus:border-[#003c90] focus:ring-2 focus:ring-[#003c90]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        {canViewProfit && item.profit_percent !== undefined && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            item.profit_percent >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                          }`}>
                            {item.profit_percent >= 0 ? '+' : ''}{item.profit_percent.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input 
                        ref={setInputRef(idx, 'discount_percent')}
                        type="number" 
                        value={item.discount_percent} 
                        disabled={!canDiscount}
                        min="0" 
                        max="100"
                        onChange={e => updateItem(idx, 'discount_percent', parseFloat(e.target.value) || 0)}
                        onKeyDown={e => handleCartKeyDown(e, idx, 'discount_percent')}
                        onFocus={e => e.target.select()}
                        className={`w-14 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          canDiscount
                            ? 'focus:border-[#003c90] focus:ring-2 focus:ring-[#003c90]/20'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        title={!canDiscount ? 'Discounts locked by Admin' : ''}
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-[12px] font-bold font-mono text-[#003c90]">
                      {fmt(item.total)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {canViewHistory && (
                          <button 
                            type="button"
                            onClick={() => openHistoryPopup(item)}
                            title="View Sales History (Ctrl+H)"
                            className="p-1 text-[#003c90] hover:bg-blue-50 border border-blue-200 rounded transition-colors focus:ring-2 focus:ring-[#003c90]/30"
                          >
                            <span className="material-symbols-outlined text-[15px] block">history</span>
                          </button>
                        )}
                        <button 
                          type="button"
                          ref={el => {
                            if (el) {
                              inputRefs.current[`${idx}-delete-btn`] = el
                            }
                          }}
                          onClick={() => removeItem(idx)}
                          onKeyDown={e => handleCartKeyDown(e, idx, 'delete')}
                          className="px-2 py-1 bg-white hover:bg-red-50 border border-red-300 rounded text-red-600 hover:text-red-700 text-[11px] font-semibold transition-colors focus:ring-2 focus:ring-red-300 focus:outline-none"
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Remaining Stock Inline Row */}
                  <tr className={`border-b border-[#eceef0] ${isOutOfStock ? 'bg-red-50/20' : 'hover:bg-[#f7f9fb]'}`}>
                    <td colSpan={10} className="px-3 pb-2 pt-0">
                      <div className="space-y-0.5">
                        {isOutOfStock ? (
                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            <span className="font-bold text-red-700 bg-red-100/90 border border-red-200 px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">warning</span>
                              OUT OF STOCK (0 Available)
                            </span>
                            <span className="text-[10px] text-[#737784]">
                              Item added for history inspection • Press <kbd className="px-1.5 py-0.5 bg-white border border-[#c3c6d5] rounded font-mono text-[9px] text-[#003c90] font-bold shadow-xs">Ctrl+H</kbd> to view sales history
                            </span>
                          </div>
                        ) : (
                          <>
                            {/* Current Purchase Entry Stock */}
                            <p className={`text-[10px] font-semibold ${
                              totalRemaining < 0 
                                ? 'text-red-600' 
                                : currentRemaining < 5 
                                  ? 'text-amber-600' 
                                  : 'text-green-600'
                            }`}>
                              {item.splits && item.splits.length > 1 ? (
                                <>
                                  <span className="material-symbols-outlined text-[12px] inline-block align-middle mr-1 text-blue-600">call_split</span>
                                  Multi-batch line: <span className="font-bold text-[#003c90]">{item.qty} pills</span> (from {item.splits.length} batches @ {fmt(item.sale_price)})
                                </>
                              ) : currentRemaining === 0 ? (
                                <>
                                  Current Batch: <span className="font-bold text-amber-700">0 remaining (Fully allocated)</span>
                                </>
                              ) : (
                                <>
                                  Current Batch Remaining: <span className="font-bold">{currentRemaining} pills</span>
                                  {pcsInPack > 1 && currentBoxes >= 0 && (
                                    <span className="ml-1">
                                      ({currentBoxes} box{currentBoxes !== 1 ? 'es' : ''} + {currentLoose} loose)
                                    </span>
                                  )}
                                </>
                              )}
                            </p>
                            {/* Total Stock (All Purchase Entries) */}
                            <p className={`text-[9px] font-medium ${
                              totalRemaining < 0 
                                ? 'text-red-600' 
                                : totalRemaining < 10 
                                  ? 'text-amber-600' 
                                  : 'text-[#737784]'
                            }`}>
                              Total Stock Remaining: <span className="font-semibold">{totalRemaining} pills</span>
                              {pcsInPack > 1 && totalBoxes >= 0 && (
                                <span className="ml-1">
                                  ({totalBoxes} box{totalBoxes !== 1 ? 'es' : ''} + {totalLoose} loose)
                                </span>
                              )}
                            </p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right — Payment */}
      <div className="w-80 flex flex-col bg-white border-l border-[#c3c6d5] shadow-lg">
        <div className="px-5 py-4 border-b border-[#c3c6d5]">
          <h3 className="text-[15px] font-bold text-[#191c1e]" style={{ fontFamily: 'Hanken Grotesk' }}>Payment</h3>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Totals */}
          <div className="space-y-2.5 text-[13px]">
            <div className="flex justify-between items-center py-1.5 border-b border-[#eceef0]">
              <span className="text-[#737784] font-medium">Sub Total</span>
              <span className="font-mono font-semibold">PKR {fmt(subTotal)}</span>
            </div>
            <div className="py-1.5 border-b border-[#eceef0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#737784] font-medium">Percent Discount (Ctrl+T)</span>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  id="percent-discount-input"
                  value={percentDiscount} 
                  disabled={!canDiscount}
                  min="0" 
                  max="100"
                  onChange={e => setPercentDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={`flex-1 px-2 py-1.5 border border-[#c3c6d5] rounded text-[14px] font-mono text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    canDiscount ? 'focus:border-[#003c90]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                  title={!canDiscount ? 'Discounts locked by Admin' : ''}
                />
                <span className="text-[11px] text-gray-600 w-12">% Off</span>
                <span className="font-mono text-red-500 font-semibold w-24 text-right">- PKR {fmt(percentDiscAmt)}</span>
              </div>
            </div>
            <div className="py-1.5 border-b border-[#eceef0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#737784] font-medium">Flat Discount (Ctrl+F)</span>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  id="flat-discount-input"
                  value={flatDiscount} 
                  disabled={!canDiscount}
                  min="0" 
                  max={afterPercent}
                  onChange={e => setFlatDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={`flex-1 px-2 py-1.5 border border-[#c3c6d5] rounded text-[14px] font-mono text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    canDiscount ? 'focus:border-[#003c90]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                  title={!canDiscount ? 'Discounts locked by Admin' : ''}
                />
                <span className="text-[11px] text-gray-600 w-12">PKR</span>
                <span className="font-mono text-red-500 font-semibold w-24 text-right">- PKR {fmt(flatDiscount)}</span>
              </div>
            </div>
            <div className="py-1.5 border-b border-[#eceef0] bg-red-50/30 px-2 rounded">
              <div className="flex items-center justify-between">
                <span className="text-[#737784] font-semibold text-[12px]">Total Discount</span>
                <span className="font-mono text-red-600 font-bold">- PKR {fmt(grandTotalDiscount)}</span>
              </div>
              {(perItemDiscAmt > 0 || totalDiscAmt > 0) && (
                <div className="flex flex-col gap-0.5 mt-1 text-[10px] text-[#737784]">
                  {perItemDiscAmt > 0 && (
                    <div className="flex justify-between">
                      <span>Per-Item Disc:</span>
                      <span className="font-mono">PKR {fmt(perItemDiscAmt)}</span>
                    </div>
                  )}
                  {totalDiscAmt > 0 && (
                    <div className="flex justify-between">
                      <span>Overall Disc:</span>
                      <span className="font-mono">PKR {fmt(totalDiscAmt)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {canViewProfit && (
              <div className="flex justify-between items-center py-1.5 border-b border-[#eceef0]">
                <span className="text-[#737784] font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-green-600">trending_up</span>
                  Profit
                </span>
                <span className={`font-mono font-semibold ${finalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  PKR {fmt(finalProfit)}
                </span>
              </div>
            )}
            
            {/* Zero Stock Warning */}
            {items.some(item => item.stock <= 0 || item.qty === 0) && (
              <div className="p-3 bg-red-50 border-2 border-red-500 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-red-600 text-[20px]">warning</span>
                  <div className="flex-1">
                    <p className="text-red-700 font-bold text-[12px] mb-1">⚠️ OUT OF STOCK</p>
                    <p className="text-red-600 text-[11px] leading-tight">
                      {items.filter(i => i.stock <= 0 || i.qty === 0).map(i => i.name).join(', ')}
                    </p>
                    <p className="text-red-500 text-[10px] mt-2 italic">
                      Remove these items to save the bill
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center p-3 bg-[#003c90]/5 rounded-lg border border-[#003c90]/20">
              <span className="text-[#003c90] font-bold text-[14px]">Grand Total</span>
              <span className="font-mono font-bold text-[#003c90] text-[20px]">PKR {fmt(grandTotal)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <p className="text-[11px] font-bold text-[#434653] uppercase tracking-wide mb-2">Payment Method (Ctrl+P)</p>
            <div className="grid grid-cols-2 gap-2">
              {[['cash','payments','Cash'],['credit','credit_card','Credit']].map(([val, icon, label]) => (
                <button key={val} onClick={() => setPaymentMethod(val)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded border-2 text-[12px] font-semibold transition-all ${paymentMethod === val ? 'border-[#003c90] bg-[#003c90]/5 text-[#003c90]' : 'border-[#c3c6d5] text-[#434653] hover:border-[#003c90]/50'}`}
                  title={`Toggle to ${label} (Ctrl+P)`}
                >
                  <span className="material-symbols-outlined text-[16px]">{icon}</span>{label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Paid */}
          <div>
            <p className="text-[11px] font-bold text-[#434653] uppercase tracking-wide mb-1.5">Amount Received (Ctrl+Shift+A)</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737784] text-[12px] font-semibold">PKR</span>
              <input 
                type="number"
                id="paid-amount-input"
                value={paidAmount}
                onChange={e => setPaidAmount(e.target.value)}
                placeholder={fmt(grandTotal)}
                className="w-full pl-14 pr-3 py-3 border-2 border-[#c3c6d5] rounded-lg text-[20px] font-mono font-bold text-right focus:border-[#003c90] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Change */}
          {paidAmount && (
            <div className={`flex justify-between items-center p-3 rounded-lg ${change >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <span className={`font-bold text-[13px] ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {change >= 0 ? 'Change' : 'Balance Due'}
              </span>
              <span className={`font-mono font-bold text-[18px] ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                PKR {fmt(Math.abs(change))}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-5 py-4 border-t border-[#c3c6d5] space-y-2">
          {success ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-[#003c90] text-white rounded-lg">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span className="font-bold text-[14px]">{success} — Sale Complete!</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleHoldBill}
                  disabled={items.length === 0}
                  className="py-2 border border-amber-500 text-amber-700 bg-amber-50 rounded text-[12px] font-semibold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Hold Bill (F8)"
                >
                  <span className="material-symbols-outlined text-[16px]">pause</span>Hold (F8)
                </button>
                <button className="py-2 border border-[#c3c6d5] text-[#434653] rounded text-[12px] font-semibold hover:bg-[#f2f4f6] transition-colors flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">print</span>Quote
                </button>
              </div>
              <button
                onClick={handleFinishSale}
                disabled={items.length === 0 || loading}
                className="w-full py-4 bg-[#003c90] text-white font-bold text-[15px] rounded-lg flex items-center justify-center gap-2 hover:bg-[#002d6e] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[22px]">check_circle</span>
                )}
                FINISH SALE (Ctrl+S / F10)
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Print Invoice Modal */}
      {printInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center invoice-modal-backdrop">
          <div className="bg-white rounded-lg shadow-2xl max-w-[420px] max-h-[90vh] overflow-auto invoice-modal-container">
            <InvoicePrint 
              invoice={printInvoice} 
              onClose={() => {
                setPrintInvoice(null)
                setAutoPrint(false)
              }} 
              autoPrint={autoPrint} 
              settings={invoiceSettings}
            />
          </div>
        </div>
      )}

      {/* Item History Modal (Ctrl+H) */}
      <Modal
        open={!!historyPopup}
        onClose={() => setHistoryPopup(null)}
        title={`Sales History — ${historyPopup?.name || ''}`}
        width="max-w-4xl"
      >
        {historyLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" />
            <span className="ml-3 text-[13px] text-[#737784]">Loading history...</span>
          </div>
        ) : historyPopup?.data ? (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-[#f7f9fb] rounded-lg border border-[#c3c6d5] text-center">
                <p className="text-[10px] text-[#737784] font-semibold uppercase">Total Sales</p>
                <p className="text-[20px] font-bold text-[#003c90]">{historyPopup.data.stats?.total_sales || 0}</p>
              </div>
              <div className="p-3 bg-[#f7f9fb] rounded-lg border border-[#c3c6d5] text-center">
                <p className="text-[10px] text-[#737784] font-semibold uppercase">Total Qty Sold</p>
                <p className="text-[20px] font-bold text-[#003c90]">{historyPopup.data.stats?.total_quantity || 0}</p>
              </div>
              <div className="p-3 bg-[#f7f9fb] rounded-lg border border-[#c3c6d5] text-center">
                <p className="text-[10px] text-[#737784] font-semibold uppercase">Avg Price</p>
                <p className="text-[20px] font-bold text-[#003c90]">PKR {fmt(historyPopup.data.stats?.avg_price || 0)}</p>
              </div>
            </div>

            {/* History Table */}
            {historyPopup.data.history?.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[#737784]">No sales history found</div>
            ) : (
              <div className="border border-[#c3c6d5] rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#f2f4f6] sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase">Invoice</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase">Date</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase">Customer</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase text-right">Qty</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase text-right">Price</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase text-right">Total</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase text-right">Discount</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase text-right">Net Total</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-[#434653] uppercase text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eceef0]">
                      {historyPopup.data.history.map((sale, idx) => {
                        const date = new Date(sale.sale_date)
                        const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        const timeStr = date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })
                        // Calculate discount:
                        // 1. Item-level discount (discount_percent on item)
                        // 2. Invoice-level discount (proportional share)
                        const itemSubtotal = sale.qty * sale.sale_price
                        const itemDisc = sale.discount_percent > 0 
                          ? itemSubtotal * (sale.discount_percent / 100) 
                          : 0
                        // Invoice-level discount proportional to this item
                        const invoiceDiscPct = (sale.invoice_sub_total > 0 && sale.invoice_discount > 0)
                          ? (sale.invoice_discount / sale.invoice_sub_total) * 100
                          : 0
                        const invoiceDiscAmt = itemSubtotal * (invoiceDiscPct / 100)
                        const totalDiscAmt = itemDisc + invoiceDiscAmt
                        const discPct = itemSubtotal > 0 ? (totalDiscAmt / itemSubtotal * 100).toFixed(1) : 0
                        const netTotal = itemSubtotal - totalDiscAmt // Total - Discount
                        return (
                          <tr key={idx} className="hover:bg-[#f7f9fb] transition-colors">
                            <td className="px-3 py-2 text-[12px] font-mono font-semibold text-[#003c90]">{sale.invoice_no}</td>
                            <td className="px-3 py-2 text-[11px] text-[#434653]">
                              <div>{dateStr}</div>
                              <div className="text-[10px] text-[#737784]">{timeStr}</div>
                            </td>
                            <td className="px-3 py-2 text-[11px] text-[#434653]">{sale.customer_name || 'Walk-in'}</td>
                            <td className="px-3 py-2 text-[12px] font-mono font-bold text-right text-[#003c90]">{sale.qty}</td>
                            <td className="px-3 py-2 text-[12px] font-mono text-right">{fmt(sale.sale_price)}</td>
                            <td className="px-3 py-2 text-[12px] font-mono text-right">{fmt(itemSubtotal)}</td>
                            <td className="px-3 py-2 text-right">
                              {totalDiscAmt > 0 ? (
                                <span className="text-[11px] font-mono text-red-600">
                                   -{fmt(totalDiscAmt)}
                                  <span className="text-[10px] text-[#737784] ml-1">({discPct}%)</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#737784]">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-[12px] font-mono font-bold text-right text-[#003c90]">{fmt(netTotal)}</td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => {
                                  setHistoryPopup(null)
                                  navigate('/sales/return', { state: { invoiceNo: sale.invoice_no } })
                                }}
                                className="px-2 py-1 bg-red-50 border border-red-200 text-red-600 rounded text-[10px] font-semibold hover:bg-red-100 transition-colors flex items-center gap-1 mx-auto"
                                title="Process Return"
                              >
                                <span className="material-symbols-outlined text-[12px]">undo</span>
                                Return
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="text-[10px] text-[#737784] text-center">
              Showing last {historyPopup.data.history?.length || 0} sales • Press Esc to close
            </div>
          </div>
        ) : null}
      </Modal>

      {/* In-App Alert Dialog (replaces native window alerts) */}
      <InAppAlert
        open={!!inAppAlert}
        onClose={closeAlert}
        title={inAppAlert?.title}
        message={inAppAlert?.message}
        type={inAppAlert?.type || 'warning'}
        actionLabel={inAppAlert?.actionLabel}
        onAction={inAppAlert?.onAction}
      />
    </div>
  )
}


