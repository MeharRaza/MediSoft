import React, { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../../lib/api'
import { fmt, Badge } from '../../components/ui'
import InvoicePrint from '../../components/InvoicePrint'

export default function FastBilling() {
  const [items, setItems] = useState([])
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
  const [customerSearch, setCustomerSearch] = useState('')
  const searchRef = useRef()
  const searchDropdownRef = useRef() // For dropdown scrolling
  const inputRefs = useRef({}) // For cart table navigation
  const handleFinishSaleRef = useRef() // For Ctrl+S shortcut
  const handleFinishSaleWithPrintRef = useRef() // For Ctrl+P shortcut
  
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
    api.sales.getCustomers().then(setCustomers)
    searchRef.current?.focus()
    
    // Keyboard shortcuts
    const handle = (e) => {
      // Save Bill: Ctrl+S
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        e.stopPropagation()
        handleFinishSaleRef.current?.()
        return
      }
      
      // Print Bill: Ctrl+P (Save with invoice print)
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault()
        e.stopPropagation()
        handleFinishSaleWithPrintRef.current?.()
        return
      }
      
      // Focus on Flat Discount: Ctrl+F
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        e.stopPropagation()
        document.getElementById('flat-discount-input')?.focus()
        document.getElementById('flat-discount-input')?.select()
        return
      }
      
      // Focus on Percent Discount: Ctrl+T
      if (e.ctrlKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        e.stopPropagation()
        document.getElementById('percent-discount-input')?.focus()
        document.getElementById('percent-discount-input')?.select()
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
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, []) // Empty dependencies - functions are stable

  // Product search
  useEffect(() => {
    if (!searchQ.trim()) { 
      setSearchResults([])
      setSelectedIndex(-1)
      return 
    }
    const t = setTimeout(() => {
      api.inventory.searchProduct(searchQ).then(results => {
        console.log('🔍 FastBilling Search Results:', results)
        results.forEach(r => {
          console.log(`  - ${r.name}: current_purchase_item_id=${r.current_purchase_item_id}, stock=${r.stock}`)
        })
        setSearchResults(results)
        setSelectedIndex(results.length > 0 ? 0 : -1) // Auto-select first result
      })
    }, 200)
    return () => clearTimeout(t)
  }, [searchQ])

  // Keyboard navigation for search results
  const handleSearchKeyDown = (e) => {
    if (searchResults.length === 0) return

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

    const fields = ['qty', 'sale_price', 'discount_percent']
    const currentFieldIndex = fields.indexOf(field)
    
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
          inputRefs.current[`${rowIndex}-${nextField}`]?.focus()
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
          inputRefs.current[`${rowIndex + 1}-${field}`]?.focus()
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        // Move to same field in previous row
        if (rowIndex > 0) {
          inputRefs.current[`${rowIndex - 1}-${field}`]?.focus()
        }
        break

      case 'Enter':
        e.preventDefault()
        // Move to next field, or next row if at end of row
        if (currentFieldIndex < fields.length - 1) {
          const nextField = fields[currentFieldIndex + 1]
          inputRefs.current[`${rowIndex}-${nextField}`]?.focus()
        } else if (rowIndex < items.length - 1) {
          // Move to first field of next row
          inputRefs.current[`${rowIndex + 1}-${fields[0]}`]?.focus()
        } else {
          // Last field of last row - go back to search
          searchRef.current?.focus()
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
            inputRefs.current[`${rowIndex - 1}-${fields[fields.length - 1]}`]?.focus()
          } else {
            // First field of first row - go to search
            searchRef.current?.focus()
          }
        } else {
          // Tab - move forwards
          if (currentFieldIndex < fields.length - 1) {
            const nextField = fields[currentFieldIndex + 1]
            inputRefs.current[`${rowIndex}-${nextField}`]?.focus()
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

  const addItem = (product) => {
    console.log('➕ Adding product to cart:', {
      id: product.id,
      name: product.name,
      current_purchase_item_id: product.current_purchase_item_id,
      current_stock: product.current_stock,
      stock: product.stock,
      rack_location: product.rack_location,
      manufacturer_name: product.company_name,
      current_sale_price: product.current_sale_price,
      sale_price: product.sale_price,
      pcs_in_pack: product.pcs_in_pack,
      profit_percent: product.profit_percent
    })
    
    setSearchQ('')
    setSearchResults([])
    setSelectedIndex(-1)
    const existing = items.findIndex(i => i.product_id === product.id && i.purchase_item_id === product.current_purchase_item_id)
    if (existing >= 0) {
      // Product already exists - increment quantity and focus on it
      const updated = [...items]
      updated[existing].qty += 1
      updated[existing].total = calcTotal(updated[existing])
      setItems(updated)
      // Focus on existing item's quantity field
      setTimeout(() => {
        inputRefs.current[`${existing}-qty`]?.focus()
        inputRefs.current[`${existing}-qty`]?.select()
      }, 100)
    } else {
      // New product - add to cart
      // Backend returns per-box prices, convert to per-pill for cart
      const salePerPill = (product.current_sale_price || product.sale_price || 0) / (product.pcs_in_pack || 1)
      const purchasePerPill = (product.current_purchase_price || product.trade_price || 0) / (product.pcs_in_pack || 1)
      
      const item = {
        product_id: product.id,
        name: product.name,
        category: product.category_name,
        rack_location: product.rack_location || 'N/A',
        manufacturer_name: product.company_name || 'N/A',
        purchase_item_id: product.current_purchase_item_id || null,
        expiry_date: product.current_expiry || '',
        qty: 1,
        sale_price: salePerPill, // Per pill for calculation
        purchase_price: purchasePerPill, // For profit calculation
        profit_percent: product.profit_percent || 0,
        discount_percent: 0,
        total: salePerPill,
        current_stock: product.current_stock || 0,
        total_stock: product.stock || 0,
        pcs_in_pack: product.pcs_in_pack || 1,
      }
      console.log('✅ Item added to cart:', item)
      const newIndex = items.length
      setItems(prev => [...prev, item])
      // Focus on new item's quantity field
      setTimeout(() => {
        inputRefs.current[`${newIndex}-qty`]?.focus()
        inputRefs.current[`${newIndex}-qty`]?.select()
      }, 100)
    }
  }

  const calcTotal = (item) => {
    const base = item.qty * item.sale_price
    const disc = base * (item.discount_percent / 100)
    return base - disc
  }

  const updateItem = (idx, field, value) => {
    const updated = [...items]
    updated[idx][field] = value
    updated[idx].total = calcTotal(updated[idx])
    setItems(updated)
  }

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx))

  const subTotal  = items.reduce((s, i) => s + i.total, 0)
  const percentDiscAmt = subTotal * (percentDiscount / 100) // First apply percentage
  const afterPercent = subTotal - percentDiscAmt
  const totalDiscAmt = percentDiscAmt + parseFloat(flatDiscount || 0) // Then add flat discount
  const grandTotal = subTotal - totalDiscAmt
  const change    = (parseFloat(paidAmount) || 0) - grandTotal
  
  // Calculate total profit
  const totalProfit = items.reduce((sum, item) => {
    const costPrice = (item.purchase_price || 0) * item.qty
    const sellingPrice = item.total // After item-level discount
    return sum + (sellingPrice - costPrice)
  }, 0)
  
  // Profit after both discounts
  const finalProfit = totalProfit - totalDiscAmt

  const handleFinishSale = useCallback(async () => {
    if (items.length === 0) return
    
    console.log('💰 Finishing sale with items:', items.map(i => ({
      product_id: i.product_id,
      name: i.name,
      purchase_item_id: i.purchase_item_id,
      qty: i.qty
    })))
    
    setSaving(true)
    try {
      const result = await api.sales.createInvoice({
        customer_id: selectedCustomer?.id || null,
        payment_method: paymentMethod,
        sub_total: subTotal,
        discount: totalDiscAmt,
        tax: 0,
        grand_total: grandTotal,
        paid_amount: parseFloat(paidAmount) || (paymentMethod === 'cash' ? grandTotal : 0),
        change_amount: Math.max(change, 0),
        items: items.map(i => ({
          product_id: i.product_id,
          purchase_item_id: i.purchase_item_id,
          expiry_date: i.expiry_date,
          qty: parseFloat(i.qty),
          sale_price: i.sale_price,
          discount_percent: i.discount_percent,
          total: i.total,
        })),
      })
      setSuccess(result.invoice_no || 'INV')
      
      // DISABLED: Invoice printing (no printer available yet)
      // try {
      //   const invoiceDetails = await api.sales.getInvoiceById(result.id)
      //   setPrintInvoice(invoiceDetails)
      // } catch (e) {
      //   console.error('Failed to fetch invoice for printing:', e)
      // }
      
      // If this was a held bill, remove it from held bills
      if (currentBillIndex >= 0) {
        const saved = localStorage.getItem('fastBilling_heldBills')
        const existingBills = saved ? JSON.parse(saved) : []
        existingBills.splice(currentBillIndex, 1)
        localStorage.setItem('fastBilling_heldBills', JSON.stringify(existingBills))
        setHeldBills(existingBills)
        setCurrentBillIndex(-1)
      }
      
      setItems([]); setSearchQ(''); setSelectedCustomer(null)
      setPaidAmount(''); setPercentDiscount(0); setFlatDiscount(0)
      setSaving(false)
      setTimeout(() => { setSuccess(null); searchRef.current?.focus() }, 2500)
    } catch (e) {
      alert('Error: ' + e.message)
      setSaving(false)
    }
  }, [items, selectedCustomer, paymentMethod, subTotal, totalDiscAmt, grandTotal, paidAmount, change, currentBillIndex, heldBills])
  
  // Save and Print - for Ctrl+P
  const handleFinishSaleWithPrint = useCallback(async () => {
    if (items.length === 0) return
    
    console.log('💰🖨️ Finishing sale with print:', items.map(i => ({
      product_id: i.product_id,
      name: i.name,
      purchase_item_id: i.purchase_item_id,
      qty: i.qty
    })))
    
    setSaving(true)
    try {
      const result = await api.sales.createInvoice({
        customer_id: selectedCustomer?.id || null,
        payment_method: paymentMethod,
        sub_total: subTotal,
        discount: totalDiscAmt,
        tax: 0,
        grand_total: grandTotal,
        paid_amount: parseFloat(paidAmount) || (paymentMethod === 'cash' ? grandTotal : 0),
        change_amount: Math.max(change, 0),
        items: items.map(i => ({
          product_id: i.product_id,
          purchase_item_id: i.purchase_item_id,
          expiry_date: i.expiry_date,
          qty: parseFloat(i.qty),
          sale_price: i.sale_price,
          discount_percent: i.discount_percent,
          total: i.total,
        })),
      })
      setSuccess(result.invoice_no || 'INV')
      
      // ENABLED for Ctrl+P: Show invoice for print
      try {
        const invoiceDetails = await api.sales.getInvoiceById(result.id)
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
      
      setItems([]); setSearchQ(''); setSelectedCustomer(null)
      setPaidAmount(''); setPercentDiscount(0); setFlatDiscount(0)
      setSaving(false)
      setTimeout(() => { setSuccess(null); searchRef.current?.focus() }, 2500)
    } catch (e) {
      alert('Error: ' + e.message)
      setSaving(false)
    }
  }, [items, selectedCustomer, paymentMethod, subTotal, totalDiscAmt, grandTotal, paidAmount, change, currentBillIndex, heldBills])
  
  // Update ref whenever handleFinishSale changes
  useEffect(() => {
    handleFinishSaleRef.current = handleFinishSale
    handleFinishSaleWithPrintRef.current = handleFinishSaleWithPrint
  }, [handleFinishSale, handleFinishSaleWithPrint])

  // Hold current bill and start new one
  const handleHoldBill = () => {
    if (items.length === 0) {
      alert('Cart is empty. Nothing to hold.')
      return
    }
    
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
      setHeldBills(prev => {
        const updated = [...prev]
        updated[currentBillIndex] = billToHold
        return updated
      })
    } else {
      // Add new held bill
      setHeldBills(prev => [...prev, billToHold])
    }
    
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
  }

  // Navigate between held bills
  const navigateBill = (direction) => {
    if (heldBills.length === 0) {
      alert('No held bills available')
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
              type="text"
              value={customerSearch || selectedCustomer?.name || ''}
              onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null) }}
              placeholder="Walk-in Customer"
              className="w-full pl-8 pr-3 py-1.5 border border-[#c3c6d5] rounded text-[12px] bg-[#f7f9fb]"
            />
            {customerSearch && (
              <div className="absolute top-full left-0 right-0 bg-white border border-[#c3c6d5] rounded shadow-lg z-20 max-h-40 overflow-y-auto">
                {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                  <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch('') }}
                    className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#f2f4f6] transition-colors">
                    {c.name} {c.balance > 0 && <span className="text-red-500 text-[10px]">Bal: {fmt(c.balance)}</span>}
                  </button>
                ))}
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
                        : totalStock <= 0 ? 'text-red-600' : totalStock < 20 ? 'text-amber-600' : 'text-green-600'
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
                <tr><td colSpan={9} className="px-4 py-16 text-center">
                  <span className="material-symbols-outlined text-[48px] text-[#c3c6d5] block mb-2">shopping_cart</span>
                  <p className="text-[13px] text-[#737784]">Search and add products above</p>
                </td></tr>
              ) : items.map((item, idx) => {
                // Calculate remaining stock after this sale for CURRENT PURCHASE ENTRY
                const currentRemaining = item.current_stock - item.qty
                const pcsInPack = item.pcs_in_pack || 1
                const currentBoxes = pcsInPack > 1 ? Math.floor(currentRemaining / pcsInPack) : 0
                const currentLoose = pcsInPack > 1 ? currentRemaining % pcsInPack : currentRemaining
                
                // Calculate total remaining across ALL purchase entries
                const totalRemaining = item.total_stock - item.qty
                const totalBoxes = pcsInPack > 1 ? Math.floor(totalRemaining / pcsInPack) : 0
                const totalLoose = pcsInPack > 1 ? totalRemaining % pcsInPack : totalRemaining
                
                return (
                <React.Fragment key={idx}>
                  <tr className="hover:bg-[#f7f9fb] group transition-colors border-b border-[#eceef0]">
                    <td className="px-3 py-2 text-[11px] font-mono text-[#737784]">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <p className="text-[12px] font-semibold text-[#191c1e]">{item.name}</p>
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
                        min="0.01" 
                        step="1"
                        onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 1)}
                        onKeyDown={e => handleCartKeyDown(e, idx, 'qty')}
                        onFocus={e => e.target.select()}
                        className="w-16 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90] focus:ring-2 focus:ring-[#003c90]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                        {item.profit_percent !== undefined && (
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
                        min="0" 
                        max="100"
                        onChange={e => updateItem(idx, 'discount_percent', parseFloat(e.target.value) || 0)}
                        onKeyDown={e => handleCartKeyDown(e, idx, 'discount_percent')}
                        onFocus={e => e.target.select()}
                        className="w-14 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90] focus:ring-2 focus:ring-[#003c90]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-[12px] font-bold font-mono text-[#003c90]">
                      {fmt(item.total)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => removeItem(idx)}
                        className="px-2.5 py-1 bg-white hover:bg-red-50 border border-red-300 rounded text-red-600 hover:text-red-700 text-[11px] font-semibold transition-colors">
                        Del
                      </button>
                    </td>
                  </tr>
                  {/* Remaining Stock Inline Row */}
                  <tr className="hover:bg-[#f7f9fb] border-b border-[#eceef0]">
                    <td colSpan={9} className="px-3 pb-2 pt-0">
                      <div className="space-y-0.5">
                        {/* Current Purchase Entry Stock */}
                        <p className={`text-[10px] font-semibold ${
                          currentRemaining < 0 
                            ? 'text-red-600' 
                            : currentRemaining < 10 
                              ? 'text-amber-600' 
                              : 'text-green-600'
                        }`}>
                          {currentRemaining < 0 ? (
                            <>
                              <span className="material-symbols-outlined text-[12px] inline-block align-middle mr-1">warning</span>
                              Insufficient stock in current purchase! Need {Math.abs(currentRemaining)} more pills
                            </>
                          ) : (
                            <>
                              Current Purchase Remaining: <span className="font-bold">{currentRemaining} pills</span>
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
                  min="0" 
                  max="100"
                  onChange={e => setPercentDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="flex-1 px-2 py-1.5 border border-[#c3c6d5] rounded text-[14px] font-mono text-right focus:border-[#003c90] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                  min="0" 
                  max={afterPercent}
                  onChange={e => setFlatDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="flex-1 px-2 py-1.5 border border-[#c3c6d5] rounded text-[14px] font-mono text-right focus:border-[#003c90] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[11px] text-gray-600 w-12">PKR</span>
                <span className="font-mono text-red-500 font-semibold w-24 text-right">- PKR {fmt(flatDiscount)}</span>
              </div>
            </div>
            <div className="py-1.5 border-b border-[#eceef0] bg-red-50/30 px-2 rounded">
              <div className="flex items-center justify-between">
                <span className="text-[#737784] font-semibold text-[12px]">Total Discount</span>
                <span className="font-mono text-red-600 font-bold">- PKR {fmt(totalDiscAmt)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-[#eceef0]">
              <span className="text-[#737784] font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-green-600">trending_up</span>
                Profit
              </span>
              <span className={`font-mono font-semibold ${finalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                PKR {fmt(finalProfit)}
              </span>
            </div>
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
            <div className="flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-lg">
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
                  title="Hold Bill"
                >
                  <span className="material-symbols-outlined text-[16px]">pause</span>Hold
                </button>
                <button className="py-2 border border-[#c3c6d5] text-[#434653] rounded text-[12px] font-semibold hover:bg-[#f2f4f6] transition-colors flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">print</span>Quote
                </button>
              </div>
              <button
                onClick={handleFinishSale}
                disabled={items.length === 0 || loading}
                className="w-full py-4 bg-[#003c90] text-white font-bold text-[15px] rounded-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg"
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl max-w-[400px] max-h-[90vh] overflow-auto">
            <InvoicePrint invoice={printInvoice} onClose={() => setPrintInvoice(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
