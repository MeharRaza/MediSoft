import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Select, fmt, today } from '../../components/ui'

const emptyItem = () => ({ 
  product_id: null, 
  product_name: '', 
  company_name: '', // Will NOT be auto-filled from supplier
  rack_location: '',
  pcs_in_pack: 1,
  barcode: '',
  expiry_date: '', 
  purchase_price: 0, // PER BOX
  sale_price: 0,     // PER BOX
  qty_in_boxes: 0, 
  qty_loose: 0, 
  qty: 0, 
  bonus: 0, 
  discount_percent: 0, 
  total: 0,
  profit_percent: 0 // Calculated from box prices including bonus
})

function calcTotal(item, gstTaxPercent = 0) {
  // Calculate base amount: purchase_price (per box) × number of boxes PURCHASED (not bonus)
  const boxes = parseFloat(item.qty_in_boxes) || 0
  const bonusBoxes = parseFloat(item.bonus) || 0
  const base = (parseFloat(item.purchase_price)||0) * boxes
  const discountPercent = parseFloat(item.discount_percent) || 0
  const total = base * (1 - discountPercent / 100)
  
  // Calculate profit % based on MARGIN (Sale Price base)
  // IMPORTANT: Include bonus boxes AND discount in the calculation
  // If we buy 1 box for Rs. 100 with 2% discount and get 1 free:
  // - Actual cost = Rs. 98 (after discount)
  // - With bonus: Rs. 98 ÷ 2 = Rs. 49 per box
  const purchasePricePerBox = parseFloat(item.purchase_price) || 0
  const salePricePerBox = parseFloat(item.sale_price) || 0
  const totalBoxes = boxes + bonusBoxes
  
  let profitPercent = 0
  
  if (salePricePerBox > 0 && totalBoxes > 0) {
    // Apply discount to purchase price first
    const discountedPurchasePrice = purchasePricePerBox * (1 - discountPercent / 100)
    
    // Calculate effective cost per box (including bonus)
    const effectiveCostPerBox = (discountedPurchasePrice * boxes) / totalBoxes
    
    // MARGIN Formula: (Sale - EffectiveCost) / Sale × 100
    profitPercent = ((salePricePerBox - effectiveCostPerBox) / salePricePerBox) * 100
    // Adjust profit for GST tax
    profitPercent = profitPercent - (parseFloat(gstTaxPercent) || 0)
  }
  
  return { total, profit_percent: profitPercent }
}

export default function PurchaseEntry() {
  const [suppliers, setSuppliers] = useState([])
  const [form, setForm] = useState({ supplier_id: '', invoice_no: '', invoice_date: today(), payment_method: 'cash', notes: '', gst_tax_percent: 0 })
  const [items, setItems] = useState([emptyItem()])
  const [productSearch, setProductSearch] = useState({})
  const [productResults, setProductResults] = useState({})
  const [companySearch, setCompanySearch] = useState({}) // NEW: Company autocomplete
  const [companyResults, setCompanyResults] = useState({}) // NEW: Filtered companies
  const [dropdownPosition, setDropdownPosition] = useState({}) // Track input positions
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState({}) // Track selected item in dropdown
  const [supplierProducts, setSupplierProducts] = useState([]) // NEW: Quick list for selected supplier
  const [showSupplierProducts, setShowSupplierProducts] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState(null)
  
  // NEW: Supplier-Company System
  const [supplierCompanies, setSupplierCompanies] = useState([]) // Companies for selected supplier
  const [selectedCompany, setSelectedCompany] = useState('') // Currently selected company
  const [companyProducts, setCompanyProducts] = useState([]) // Products filtered by company
  const [showCompanyProducts, setShowCompanyProducts] = useState(false)
  
  // Hold Purchase Entry System (with localStorage persistence)
  const [heldPurchases, setHeldPurchases] = useState(() => {
    const saved = localStorage.getItem('purchaseEntry_heldPurchases')
    return saved ? JSON.parse(saved) : []
  })
  const [currentPurchaseIndex, setCurrentPurchaseIndex] = useState(-1)
  
  // Save held purchases to localStorage
  useEffect(() => {
    localStorage.setItem('purchaseEntry_heldPurchases', JSON.stringify(heldPurchases))
  }, [heldPurchases])
  
  // Refs for auto-hold (to avoid dependency issues)
  const itemsAutoHoldRef = useRef(items)
  const formAutoHoldRef = useRef(form)
  const currentPurchaseIndexRef = useRef(currentPurchaseIndex)
  
  useEffect(() => {
    itemsAutoHoldRef.current = items
    formAutoHoldRef.current = form
    currentPurchaseIndexRef.current = currentPurchaseIndex
  }, [items, form, currentPurchaseIndex])
  
  // Auto-hold: Save current purchase entry when navigating away
  useEffect(() => {
    console.log('🔧 Auto-hold listener registered for Purchase Entry')
    
    return () => {
      console.log('🚪 Purchase Entry unmounting - checking for auto-hold...')
      
      // When component unmounts (user navigating away)
      const currentItems = itemsAutoHoldRef.current
      const currentForm = formAutoHoldRef.current
      const currentIndex = currentPurchaseIndexRef.current
      
      console.log('📦 Current items count:', currentItems.length)
      
      // NO VALIDATION - Save even if empty (just like Fast Billing empty cart issue you wanted)
      // Only skip if items array is completely empty AND it's not a held purchase
      const shouldSave = currentItems.length > 0 || currentIndex >= 0
      
      console.log('✅ Should save:', shouldSave)
      
      if (shouldSave) {
        const purchaseToHold = {
          form: { ...currentForm },
          items: [...currentItems],
          timestamp: new Date().toISOString()
        }
        
        // Get latest held purchases from localStorage
        const saved = localStorage.getItem('purchaseEntry_heldPurchases')
        const existingPurchases = saved ? JSON.parse(saved) : []
        
        if (currentIndex >= 0) {
          // Update existing held purchase
          existingPurchases[currentIndex] = purchaseToHold
          console.log('🔄 Auto-hold: Updating existing held purchase at index', currentIndex)
        } else {
          // Add new held purchase (no validation)
          existingPurchases.push(purchaseToHold)
          console.log('➕ Auto-hold: Adding new held purchase (no validation)')
        }
        
        // Save to localStorage
        localStorage.setItem('purchaseEntry_heldPurchases', JSON.stringify(existingPurchases))
        console.log('💾 Auto-hold: Purchase entry saved automatically on navigation')
      } else {
        console.log('⏭️ Auto-hold: Skipped (empty items array)')
      }
    }
  }, []) // Empty dependencies - uses refs
  
  // Load held purchase on mount if available - REMOVED AUTO-LOAD
  // User will manually navigate to held purchases
  useEffect(() => {
    // Just load the held purchases from localStorage, don't auto-restore
    const saved = localStorage.getItem('purchaseEntry_heldPurchases')
    if (saved) {
      const purchases = JSON.parse(saved)
      setHeldPurchases(purchases)
    }
  }, []) // Only run once on mount

  useEffect(() => { 
    api.purchase.getSuppliers().then(s => setSuppliers(Array.isArray(s) ? s : []))
    // Auto-load next invoice number
    api.purchase.getNextInvoiceNo().then(invNo => {
      setForm(f => ({ ...f, invoice_no: invNo }))
    })
  }, [])

  // Keyboard shortcut: Ctrl+S to Save Purchase (case-insensitive)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        console.log('⌨️ Ctrl+S pressed - Saving purchase...')
        if (!submitting) {
          handleSave()
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [submitting]) // Re-attach when submitting state changes

  // NEW: Load supplier's companies when supplier changes
  useEffect(() => {
    if (form.supplier_id) {
      // Load companies for this supplier
      api.purchase.getSupplierCompanies(form.supplier_id).then(companies => {
        const companyNames = companies.map(c => c.company_name)
        setSupplierCompanies(companyNames)
        // Reset company selection
        setSelectedCompany('')
        setCompanyProducts([])
      }).catch(() => {
        setSupplierCompanies([])
        setSelectedCompany('')
        setCompanyProducts([])
      })
      
      // Also load supplier's previous products (for backward compatibility)
      api.purchase.getSupplierProducts(form.supplier_id).then(products => {
        setSupplierProducts(Array.isArray(products) ? products : [])
      }).catch(() => setSupplierProducts([]))
    } else {
      setSupplierCompanies([])
      setSelectedCompany('')
      setCompanyProducts([])
      setSupplierProducts([])
    }
  }, [form.supplier_id])
  
  // NEW: Load products when company is selected
  useEffect(() => {
    if (selectedCompany) {
      console.log('🏢 Loading products for company:', selectedCompany)
      api.purchase.getProductsByCompany(selectedCompany).then(products => {
        console.log('✅ Company products loaded:', products)
        setCompanyProducts(Array.isArray(products) ? products : [])
        setShowCompanyProducts(true)
      }).catch(err => {
        console.error('❌ Error loading company products:', err)
        setCompanyProducts([])
      })
    } else {
      setCompanyProducts([])
      setShowCompanyProducts(false)
    }
  }, [selectedCompany])

  // Get selected supplier name
  const getSupplierName = () => {
    if (!form.supplier_id) return ''
    const supplier = suppliers.find(s => String(s.id) === String(form.supplier_id))
    return supplier ? supplier.name : ''
  }

  const handleProductSearch = (idx, val) => {
    setProductSearch(p => ({ ...p, [idx]: val }))
    
    // IMPORTANT: Also update product_name in items array so validation works
    const updated = [...items]
    updated[idx].product_name = val
    
    // DO NOT auto-fill company name from supplier
    // User will type it manually or use autocomplete
    
    setItems(updated)
    
    if (!val.trim()) { 
      setProductResults(p => ({ ...p, [idx]: [] }))
      return 
    }
    console.log('🔍 Searching for:', val)
    const timer = setTimeout(() => {
      api.inventory.searchProduct(val).then(r => {
        console.log('✅ Search results:', r)
        setProductResults(p => ({ ...p, [idx]: r || [] }))
      }).catch(err => {
        console.error('❌ Search error:', err)
        setProductResults(p => ({ ...p, [idx]: [] }))
      })
    }, 300)
    return () => clearTimeout(timer)
  }

  // NEW: Handle company autocomplete search
  const handleCompanySearch = (idx, val) => {
    setCompanySearch(s => ({ ...s, [idx]: val }))
    
    // Update company_name in items
    const updated = [...items]
    updated[idx].company_name = val
    setItems(updated)
    
    if (!val.trim()) {
      setCompanyResults(r => ({ ...r, [idx]: [] }))
      return
    }
    
    // Simple approach: Get unique company names from products table
    // Company names are stored in products.generic_name field
    const timer = setTimeout(() => {
      // Use products table to get existing company names
      api.inventory.getProducts({}).then(products => {
        const uniqueCompanies = new Set()
        products.forEach(p => {
          if (p.company_name && p.company_name.toLowerCase().includes(val.toLowerCase())) {
            uniqueCompanies.add(p.company_name)
          }
        })
        const results = Array.from(uniqueCompanies).map(name => ({ name }))
        console.log(`🏢 Company search for "${val}":`, results)
        setCompanyResults(r => ({ ...r, [idx]: results }))
      }).catch(err => {
        console.error('Company search error:', err)
        setCompanyResults(r => ({ ...r, [idx]: [] }))
      })
    }, 300)
    
    return () => clearTimeout(timer)
  }

  // NEW: Select company from autocomplete
  const selectCompany = (idx, company) => {
    const updated = [...items]
    updated[idx].company_name = company.name
    setItems(updated)
    setCompanySearch(s => ({ ...s, [idx]: company.name }))
    setCompanyResults(r => ({ ...r, [idx]: [] }))
  }

  const selectProduct = (idx, p) => {
    const updated = [...items]
    updated[idx] = { 
      ...updated[idx], 
      product_id: p.id, 
      product_name: p.name,
      rack_location: p.rack_location || '',
      pcs_in_pack: p.pcs_in_pack || 1,
      barcode: p.barcode || '',
      purchase_price: p.trade_price || 0, 
      sale_price: p.sale_price || 0,
      qty_in_boxes: 0,
      qty_loose: 0,
      qty: 0,
      // Use product's company name from database (if exists)
      company_name: p.company_name || updated[idx].company_name || ''
    }
    const calc = calcTotal(updated[idx], form.gst_tax_percent)
    updated[idx].total = calc.total
    updated[idx].profit_percent = calc.profit_percent
    setItems(updated)
    setProductSearch(ps => ({ ...ps, [idx]: p.name }))
    setProductResults(pr => ({ ...pr, [idx]: [] }))
    
    // Also update company search field to show the auto-filled company
    if (p.company_name) {
      setCompanySearch(cs => ({ ...cs, [idx]: p.company_name }))
    }
  }

  const updateItem = (idx, field, val) => {
    const updated = [...items]
    updated[idx][field] = val
    
    // Calculate total qty from boxes + loose + BONUS
    if (field === 'qty_in_boxes' || field === 'qty_loose' || field === 'bonus' || field === 'pcs_in_pack') {
      const boxes = parseInt(updated[idx].qty_in_boxes) || 0
      const loose = parseInt(updated[idx].qty_loose) || 0
      const bonusBoxes = parseInt(updated[idx].bonus) || 0
      const pcsInPack = parseInt(updated[idx].pcs_in_pack) || 1
      // Total qty = (Purchased boxes + Bonus boxes) × pcs_in_pack + loose
      updated[idx].qty = ((boxes + bonusBoxes) * pcsInPack) + loose
    }
    
    const calc = calcTotal(updated[idx], form.gst_tax_percent)
    updated[idx].total = calc.total
    updated[idx].profit_percent = calc.profit_percent
    setItems(updated)
  }

  const addRow = () => {
    const newItem = emptyItem()
    // DO NOT auto-fill company name - user will type manually
    setItems([...items, newItem])
    // Clear search state for new row
    setProductSearch(ps => ({ ...ps, [items.length]: '' }))
    setProductResults(pr => ({ ...pr, [items.length]: [] }))
  }
  const removeRow = (idx) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)) }

  const subTotal = items.reduce((s, i) => s + (parseFloat(i.total)||0), 0)
  const gstTaxAmount = subTotal * (parseFloat(form.gst_tax_percent) || 0) / 100
  const grandTotal = subTotal + gstTaxAmount

  // Post Permanently - Ctrl+Q
  const handleSave = async () => {
    // Debug: Check items before validation
    console.log('📦 All items before validation:', items)
    
    // Filter items: either has product_id OR has product_name filled
    const validItems = items.filter(i => (i.product_id || i.product_name.trim()) && parseFloat(i.qty) > 0)
    
    console.log('✅ Valid items after filter:', validItems)
    console.log('📊 Items with company_name:', validItems.map(i => ({
      product_name: i.product_name,
      company_name: i.company_name
    })))
    
    if (!form.invoice_no.trim()) return setMsg({ type: 'error', text: 'Enter invoice number.' })
    if (!validItems.length) return setMsg({ type: 'error', text: 'Add at least one product with quantity.' })
    setSubmitting(true); setMsg(null)
    try {
      const result = await api.purchase.createPurchase({ 
        ...form, 
        supplier_id: form.supplier_id || null, 
        branch_id: 1, 
        sub_total: subTotal,
        gst_tax_percent: parseFloat(form.gst_tax_percent) || 0,
        tax: gstTaxAmount, 
        grand_total: grandTotal, 
        paid_amount: form.payment_method === 'cash' ? grandTotal : 0, 
        items: validItems.map(i => ({ 
          product_id: i.product_id, 
          product_name: i.product_name,
          company_name: i.company_name,
          rack_location: i.rack_location,
          pcs_in_pack: parseInt(i.pcs_in_pack) || 1,
          barcode: i.barcode,
          expiry_date: i.expiry_date, 
          purchase_price: parseFloat(i.purchase_price)||0,  // PER BOX
          sale_price: parseFloat(i.sale_price)||0,          // PER BOX
          qty: parseFloat(i.qty),
          qty_in_boxes: parseInt(i.qty_in_boxes)||0,
          qty_loose: parseInt(i.qty_loose)||0,
          bonus: parseFloat(i.bonus)||0, 
          discount_percent: parseFloat(i.discount_percent)||0, 
          total: parseFloat(i.total),
          profit_percent: parseFloat(i.profit_percent)||0 // Include calculated profit %
        })) 
      })
      setMsg({ type: 'success', text: `Purchase saved! Invoice: ${result.invoice_no}` })
      
      // If this was a held purchase, remove it from held purchases
      if (currentPurchaseIndex >= 0) {
        const saved = localStorage.getItem('purchaseEntry_heldPurchases')
        const existingPurchases = saved ? JSON.parse(saved) : []
        existingPurchases.splice(currentPurchaseIndex, 1)
        localStorage.setItem('purchaseEntry_heldPurchases', JSON.stringify(existingPurchases))
        setHeldPurchases(existingPurchases)
        setCurrentPurchaseIndex(-1)
      }
      
      // Load next invoice number for new purchase
      api.purchase.getNextInvoiceNo().then(invNo => {
        setForm({ supplier_id: '', invoice_no: invNo, invoice_date: today(), payment_method: 'cash', notes: '', gst_tax_percent: 0 })
      })
      setItems([emptyItem()])
      setProductSearch({})
      setProductResults({})
      setCompanySearch({})
      setCompanyResults({})
      setSelectedCompany('') // Reset company selection
      setSupplierCompanies([]) // Reset supplier companies
      setCompanyProducts([]) // Reset company products
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  // Delete current held purchase - INSTANT (NO POPUP)
  const deleteCurrentHeldPurchase = useCallback(() => {
    console.log('🗑️ Deleting current held purchase instantly...')
    
    // Direct delete - no confirmation popup
    const updatedPurchases = heldPurchases.filter((_, idx) => idx !== currentPurchaseIndex)
    
    // Update state immediately
    setHeldPurchases(updatedPurchases)
    setCurrentPurchaseIndex(-1)
    
    // Defer heavy updates to next tick
    setTimeout(() => {
      setItems([emptyItem()])
      setProductSearch({})
      setProductResults({})
      setCompanySearch({})
      setCompanyResults({})
      setSelectedCompany('') // Reset company selection
      setSupplierCompanies([]) // Reset supplier companies
      setCompanyProducts([]) // Reset company products
      localStorage.setItem('purchaseEntry_heldPurchases', JSON.stringify(updatedPurchases))
      console.log('✅ Held purchase deleted instantly (no freeze)')
    }, 0)
  }, [heldPurchases, currentPurchaseIndex])
  
  // Delete all held purchases - INSTANT (NO POPUP)
  const deleteAllHeldPurchases = useCallback(() => {
    console.log('🗑️ Deleting ALL held purchases instantly...')
    
    // Direct delete - no confirmation popup
    setHeldPurchases([])
    setCurrentPurchaseIndex(-1)
    
    // Defer heavy updates to next tick
    setTimeout(() => {
      setItems([emptyItem()])
      setProductSearch({})
      setProductResults({})
      setCompanySearch({})
      setCompanyResults({})
      setSelectedCompany('') // Reset company selection
      setSupplierCompanies([]) // Reset supplier companies
      setCompanyProducts([]) // Reset company products
      localStorage.removeItem('purchaseEntry_heldPurchases')
      console.log('✅ All held purchases cleared instantly (no freeze)')
    }, 0)
  }, [])

  const supplierOpts = [{ value: '', label: 'Select Supplier' }, ...suppliers.map(s => ({ value: String(s.id), label: s.name }))]


  const handleHoldPurchase = () => {
    // Validate: Don't hold if items array is empty or has only one empty item
    const hasValidItems = items.length > 1 || (items.length === 1 && items[0].product_id)
    
    if (!hasValidItems) {
      setMsg({ type: 'error', text: 'Cannot hold empty purchase entry. Add at least one product.' })
      return
    }
    
    const purchaseToHold = {
      form: {...form},
      items: [...items],
      timestamp: new Date().toISOString()
    }
    
    if (currentPurchaseIndex >= 0) {
      // Update existing held purchase
      const updated = [...heldPurchases]
      updated[currentPurchaseIndex] = purchaseToHold
      setHeldPurchases(updated)
      localStorage.setItem('purchaseEntry_heldPurchases', JSON.stringify(updated))
    } else {
      // Add new held purchase
      const updated = [...heldPurchases, purchaseToHold]
      setHeldPurchases(updated)
      localStorage.setItem('purchaseEntry_heldPurchases', JSON.stringify(updated))
    }
    
    setMsg({ type: 'success', text: 'Purchase held successfully' })
    
    // Reset to new purchase
    setCurrentPurchaseIndex(-1)
    api.purchase.getNextInvoiceNo().then(invNo => {
      setForm({ supplier_id: '', invoice_no: invNo, invoice_date: today(), payment_method: 'cash', notes: '', gst_tax_percent: 0 })
    })
    setItems([emptyItem()])
    setProductSearch({})
    setProductResults({})
    setCompanySearch({})
    setCompanyResults({})
    setSelectedCompany('') // Reset company selection
    setSupplierCompanies([]) // Reset supplier companies
    setCompanyProducts([]) // Reset company products
  }

  // Navigate between held purchases
  const navigatePurchase = (direction) => {
    if (heldPurchases.length === 0) {
      alert('No held purchases available')
      return
    }
    
    let newIndex
    if (direction === 'prev') {
      if (currentPurchaseIndex <= 0) {
        newIndex = heldPurchases.length - 1
      } else {
        newIndex = currentPurchaseIndex - 1
      }
    } else {
      if (currentPurchaseIndex === -1 || currentPurchaseIndex >= heldPurchases.length - 1) {
        newIndex = 0
      } else {
        newIndex = currentPurchaseIndex + 1
      }
    }
    
    loadHeldPurchase(newIndex)
  }

  // Load a held purchase
  const loadHeldPurchase = (index) => {
    if (index < 0 || index >= heldPurchases.length) return
    
    const purchase = heldPurchases[index]
    setForm(purchase.form)
    setItems(purchase.items)
    setCurrentPurchaseIndex(index)
  }

  // Refs to access current state without re-registering listeners
  const itemsRef = useRef(items)
  const formRef = useRef(form)
  
  useEffect(() => {
    itemsRef.current = items
    formRef.current = form
  }, [items, form])

  // Keyboard shortcuts - Ctrl+Arrow navigation for held purchases
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+← → Previous held purchase
      if (e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        e.stopPropagation()
        navigatePurchase('prev')
        return
      }
      
      // Ctrl+→ → Next held purchase
      if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault()
        e.stopPropagation()
        navigatePurchase('next')
        return
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [heldPurchases, currentPurchaseIndex]) // Include dependencies for state updates

  // Global Enter key navigation (replaces Tab)
  useEffect(() => {
    const handleGlobalEnter = (e) => {
      // Only handle Enter in input/select/textarea fields
      const target = e.target
      if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
      
      if (e.key === 'Enter' && !e.ctrlKey && !e.altKey) {
        // Check if any dropdown is open - if so, skip global navigation
        const hasOpenDropdown = Object.keys(productResults).some(idx => 
          productResults[idx] && productResults[idx].length > 0
        )
        const hasOpenCompanyDropdown = Object.keys(companyResults).some(idx => 
          companyResults[idx] && companyResults[idx].length > 0
        )
        
        // Skip navigation if dropdown is open - let dropdown handle Enter
        if (hasOpenDropdown || hasOpenCompanyDropdown) {
          return
        }
        
        e.preventDefault()
        
        if (e.shiftKey) {
          // Shift+Enter → Previous field
          const allInputs = Array.from(document.querySelectorAll('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'))
          const currentIndex = allInputs.findIndex(input => input === target)
          if (currentIndex > 0) {
            allInputs[currentIndex - 1].focus()
            allInputs[currentIndex - 1].select?.()
          }
        } else {
          // Enter → Next field
          const allInputs = Array.from(document.querySelectorAll('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'))
          const currentIndex = allInputs.findIndex(input => input === target)
          if (currentIndex < allInputs.length - 1) {
            allInputs[currentIndex + 1].focus()
            allInputs[currentIndex + 1].select?.()
          }
        }
      }
      
      // NEW: Arrow Up/Down navigation between rows
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Only handle arrows in table input fields, not in dropdowns
        if (target.closest('table')) {
          const hasOpenDropdown = Object.keys(productResults).some(idx => 
            productResults[idx] && productResults[idx].length > 0
          )
          const hasOpenCompanyDropdown = Object.keys(companyResults).some(idx => 
            companyResults[idx] && companyResults[idx].length > 0
          )
          
          // Skip if dropdown is open - let dropdown handle arrows
          if (hasOpenDropdown || hasOpenCompanyDropdown) {
            return
          }
          
          e.preventDefault()
          
          // Get all table inputs
          const tableInputs = Array.from(document.querySelectorAll('table input:not([disabled]):not([type="hidden"])'))
          const currentIndex = tableInputs.findIndex(input => input === target)
          
          if (currentIndex === -1) return
          
          // Get current row and column
          const currentRow = target.closest('tr')
          const currentCell = target.closest('td')
          const allCells = Array.from(currentRow.querySelectorAll('td'))
          const columnIndex = allCells.indexOf(currentCell)
          
          if (e.key === 'ArrowDown') {
            // Move to same column in next row
            const nextRow = currentRow.nextElementSibling
            if (nextRow) {
              const nextCells = Array.from(nextRow.querySelectorAll('td'))
              const nextInput = nextCells[columnIndex]?.querySelector('input:not([disabled])')
              if (nextInput) {
                nextInput.focus()
                nextInput.select?.()
              }
            }
          } else if (e.key === 'ArrowUp') {
            // Move to same column in previous row
            const prevRow = currentRow.previousElementSibling
            if (prevRow) {
              const prevCells = Array.from(prevRow.querySelectorAll('td'))
              const prevInput = prevCells[columnIndex]?.querySelector('input:not([disabled])')
              if (prevInput) {
                prevInput.focus()
                prevInput.select?.()
              }
            }
          }
        }
      }
      
      // NEW: Arrow Left/Right navigation between fields in same row
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Only handle in table input fields
        if (target.closest('table')) {
          // Check if cursor is at start (for left) or end (for right)
          const cursorPos = target.selectionStart
          const textLength = target.value.length
          
          // Only navigate if cursor is at edge
          const shouldNavigateLeft = e.key === 'ArrowLeft' && cursorPos === 0
          const shouldNavigateRight = e.key === 'ArrowRight' && cursorPos === textLength
          
          if (shouldNavigateLeft || shouldNavigateRight) {
            const hasOpenDropdown = Object.keys(productResults).some(idx => 
              productResults[idx] && productResults[idx].length > 0
            )
            const hasOpenCompanyDropdown = Object.keys(companyResults).some(idx => 
              companyResults[idx] && companyResults[idx].length > 0
            )
            
            // Skip if dropdown is open
            if (hasOpenDropdown || hasOpenCompanyDropdown) {
              return
            }
            
            e.preventDefault()
            
            // Get current row and column
            const currentRow = target.closest('tr')
            const currentCell = target.closest('td')
            const allCells = Array.from(currentRow.querySelectorAll('td'))
            const columnIndex = allCells.indexOf(currentCell)
            
            if (e.key === 'ArrowRight') {
              // Move to next field in same row
              for (let i = columnIndex + 1; i < allCells.length; i++) {
                const nextInput = allCells[i]?.querySelector('input:not([disabled])')
                if (nextInput) {
                  nextInput.focus()
                  nextInput.select?.()
                  break
                }
              }
            } else if (e.key === 'ArrowLeft') {
              // Move to previous field in same row
              for (let i = columnIndex - 1; i >= 0; i--) {
                const prevInput = allCells[i]?.querySelector('input:not([disabled])')
                if (prevInput) {
                  prevInput.focus()
                  prevInput.select?.()
                  break
                }
              }
            }
          }
        }
      }
    }
    
    document.addEventListener('keydown', handleGlobalEnter, true) // Use capture phase
    return () => document.removeEventListener('keydown', handleGlobalEnter, true)
  }, [productResults, companyResults]) // Add dependencies to detect dropdown state

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader 
        title="Purchase Entry"
        subtitle="Record inbound stock and procurement" 
        actions={
          <>
            {/* Held Purchases Indicator */}
            {heldPurchases.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg">
                  <span className="material-symbols-outlined text-[16px] text-amber-700">schedule</span>
                  <span className="text-[11px] font-bold text-amber-900">
                    {currentPurchaseIndex >= 0 
                      ? `Purchase ${currentPurchaseIndex + 1} of ${heldPurchases.length}` 
                      : `${heldPurchases.length} Held Purchase${heldPurchases.length > 1 ? 's' : ''}`}
                  </span>
                  {currentPurchaseIndex >= 0 && (
                    <>
                      <span className="text-[10px] text-amber-700">|</span>
                      <span className="text-[10px] text-amber-700">
                        {items.filter(i => (i.product_id || i.product_name.trim()) && parseFloat(i.qty) > 0).length} item{items.filter(i => (i.product_id || i.product_name.trim()) && parseFloat(i.qty) > 0).length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => navigatePurchase('prev')}
                  className="px-2 py-1 hover:bg-[#f2f4f6] rounded text-[#737784] hover:text-[#003c90] text-[16px] font-bold border border-gray-300"
                  title="Previous Purchase (Ctrl+←)"
                >
                  ◀
                </button>
                <button
                  onClick={() => navigatePurchase('next')}
                  className="px-2 py-1 hover:bg-[#f2f4f6] rounded text-[#737784] hover:text-[#003c90] text-[16px] font-bold border border-gray-300"
                  title="Next Purchase (Ctrl+→)"
                >
                  ▶
                </button>
                {/* Delete Current Held Purchase */}
                {currentPurchaseIndex >= 0 && (
                  <button
                    onClick={deleteCurrentHeldPurchase}
                    className="px-2 py-1 hover:bg-red-50 rounded text-red-600 hover:text-red-700 text-[14px] font-semibold border border-red-300"
                    title="Delete this held purchase"
                  >
                    🗑️ Delete
                  </button>
                )}
                {/* Clear ALL Held Purchases */}
                <button
                  onClick={deleteAllHeldPurchases}
                  className="px-2 py-1 hover:bg-red-50 rounded text-red-600 hover:text-red-700 border-l border-[#c3c6d5] ml-1 pl-2 text-[14px] font-semibold border border-red-300"
                  title="Clear ALL held purchases"
                >
                  🗑️ Clear All
                </button>
                <div className="h-6 w-px bg-[#c3c6d5]" />
              </div>
            )}
            
            <Btn variant="outline" size="sm">Import CSV</Btn>
            
            <Btn 
              variant="outline" 
              onClick={handleHoldPurchase}
              className="border-amber-400 text-amber-700 hover:bg-amber-50 font-semibold"
            >
              ⏸ Hold
            </Btn>
            <Btn variant="primary" onClick={handleSave} disabled={submitting} className="font-semibold">
              {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              💾 Save Purchase
            </Btn>
          </>
        } 
      />
      
      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : msg.type === 'info' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-green-50 text-green-700 border border-green-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : msg.type === 'info' ? 'info' : 'check_circle'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}
        
        {/* Header Form */}
        <Card className="p-5">
          <div className="grid grid-cols-4 gap-4">
            <Select label="Supplier" value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} options={supplierOpts} />
            <Input label="Invoice Number" value={form.invoice_no} onChange={e => setForm({ ...form, invoice_no: e.target.value })} placeholder="INV-2024-0001" required />
            <Input label="Invoice Date" type="date" value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} />
          </div>
        </Card>

        {/* Company Selection - Show when supplier is selected and has companies */}
        {form.supplier_id && supplierCompanies.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-[18px] text-[#003c90]">business</span>
              <span className="text-[13px] font-bold text-[#003c90]">
                Select Company from {getSupplierName()}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {supplierCompanies.map((company, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedCompany(company)}
                  className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                    selectedCompany === company
                      ? 'bg-[#003c90] text-white border-2 border-[#003c90]'
                      : 'bg-white text-[#003c90] border-2 border-[#c3c6d5] hover:border-[#003c90]'
                  }`}
                >
                  {company}
                </button>
              ))}
              {selectedCompany && (
                <button
                  type="button"
                  onClick={() => setSelectedCompany('')}
                  className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-red-50 text-red-600 border-2 border-red-300 hover:bg-red-100 transition-all"
                >
                  ✕ Clear Selection
                </button>
              )}
            </div>
            {selectedCompany && companyProducts.length > 0 && (
              <div className="mt-3 text-[11px] text-green-700 font-semibold">
                ✓ {companyProducts.length} product{companyProducts.length !== 1 ? 's' : ''} available from {selectedCompany}
              </div>
            )}
          </Card>
        )}

        {/* Line Items */}
        <Card className="overflow-visible">
          <div className="px-4 py-3 border-b border-[#c3c6d5] flex items-center justify-between bg-[#f7f9fb]">
            <span className="text-[13px] font-bold text-[#003c90] flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">list_alt</span>Line Items</span>
            <div className="flex gap-2">
              {/* Company Products Button (Priority) */}
              {companyProducts.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => setShowCompanyProducts(!showCompanyProducts)} 
                  className="px-3 py-1.5 text-[11px] font-semibold border-2 border-[#003c90] bg-[#003c90] text-white rounded hover:opacity-90 transition-opacity flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">business</span>
                  {showCompanyProducts ? 'Hide' : 'Show'} {selectedCompany} Products ({companyProducts.length})
                </button>
              )}
              {/* Supplier Products Button (Fallback) */}
              {supplierProducts.length > 0 && !selectedCompany && (
                <button 
                  type="button" 
                  onClick={() => setShowSupplierProducts(!showSupplierProducts)} 
                  className="px-3 py-1.5 text-[11px] font-semibold border border-[#003c90] text-[#003c90] rounded hover:bg-[#003c90]/5 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">history</span>
                  {showSupplierProducts ? 'Hide' : 'Show'} Supplier Products ({supplierProducts.length})
                </button>
              )}
            </div>
          </div>
          
          {/* Company Products Quick List (Priority) */}
          {showCompanyProducts && companyProducts.length > 0 && (
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
              <p className="text-[11px] font-semibold text-blue-900 mb-2 uppercase">
                📦 {selectedCompany} Products:
              </p>
              <div className="flex flex-wrap gap-2">
                {companyProducts.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const emptyIdx = items.findIndex(i => !i.product_id)
                      if (emptyIdx >= 0) {
                        selectProduct(emptyIdx, p)
                      } else {
                        addRow()
                        setTimeout(() => selectProduct(items.length, p), 50)
                      }
                    }}
                    className="px-3 py-1.5 bg-white border border-blue-300 rounded text-[11px] font-semibold text-[#003c90] hover:bg-blue-100 transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Supplier Products Quick List (Fallback when no company selected) */}
          {showSupplierProducts && supplierProducts.length > 0 && !selectedCompany && (
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
              <p className="text-[11px] font-semibold text-amber-900 mb-2 uppercase">Previously Purchased from this Supplier:</p>
              <div className="flex flex-wrap gap-2">
                {supplierProducts.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const emptyIdx = items.findIndex(i => !i.product_id)
                      if (emptyIdx >= 0) {
                        selectProduct(emptyIdx, p)
                      } else {
                        addRow()
                        setTimeout(() => selectProduct(items.length, p), 50)
                      }
                    }}
                    className="px-3 py-1.5 bg-white border border-amber-300 rounded text-[11px] font-semibold text-[#003c90] hover:bg-amber-100 transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto overflow-y-auto" style={{maxHeight: '400px'}}>
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#f2f4f6] z-20 shadow-sm">
                <tr className="bg-[#f2f4f6] border-b-2 border-[#003c90]">
                  {['Product Name','Company','Rack','pcs/pack','Expiry','Purchase/Box','Sale/Box','Boxes','Loose','Total Qty','Bonus','Disc%','Net Amt','Profit%',''].map(h => <th key={h} className={`px-3 py-2.5 text-[11px] font-bold text-[#434653] uppercase tracking-wider whitespace-nowrap bg-[#f2f4f6] ${['pcs/pack','Purchase/Box','Sale/Box','Boxes','Loose','Total Qty','Bonus','Disc%','Net Amt','Profit%'].includes(h)?'text-right':''}`}>{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eceef0]">
                {items.map((item, idx) => <tr key={idx} className="hover:bg-[#f7f9fb] group">
                  {/* Product Name */}
                  <td className="px-3 py-2" style={{ minWidth: '350px', maxWidth: '350px' }}>
                    <div className="relative">
                      <input 
                        type="text" 
                        id={`product-search-${idx}`}
                        value={productSearch[idx]!==undefined?productSearch[idx]:(item.product_name||'')} 
                        onChange={e => handleProductSearch(idx, e.target.value)} 
                        onFocus={e => {
                          const rect = e.target.getBoundingClientRect()
                          setDropdownPosition(p => ({...p, [idx]: {top: rect.bottom + 4, left: rect.left}}))
                        }}
                        onKeyDown={e => {
                          const results = productResults[idx] || []
                          const currentIdx = selectedDropdownIndex[idx] || 0
                          
                          if (e.key === 'ArrowDown' && results.length > 0) {
                            e.preventDefault()
                            const newIdx = (currentIdx + 1) % results.length
                            setSelectedDropdownIndex(s => ({...s, [idx]: newIdx}))
                            // Auto-scroll to selected item
                            setTimeout(() => {
                              const item = document.getElementById(`dropdown-item-${idx}-${newIdx}`)
                              item?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                            }, 0)
                          }
                          if (e.key === 'ArrowUp' && results.length > 0) {
                            e.preventDefault()
                            const newIdx = currentIdx === 0 ? results.length - 1 : currentIdx - 1
                            setSelectedDropdownIndex(s => ({...s, [idx]: newIdx}))
                            // Auto-scroll to selected item
                            setTimeout(() => {
                              const item = document.getElementById(`dropdown-item-${idx}-${newIdx}`)
                              item?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                            }, 0)
                          }
                          if (e.key === 'Enter' && results.length > 0 && results[currentIdx]) {
                            e.preventDefault()
                            selectProduct(parseInt(idx), results[currentIdx])
                            setDropdownPosition(dp => ({...dp, [idx]: null}))
                            setSelectedDropdownIndex(s => ({...s, [idx]: 0}))
                          }
                          if (e.key === 'Escape') {
                            setDropdownPosition(dp => ({...dp, [idx]: null}))
                            setSelectedDropdownIndex(s => ({...s, [idx]: 0}))
                          }
                        }}
                        placeholder="Search or enter new..." 
                        className="w-full px-2 py-1 border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90] bg-transparent" 
                      />
                    </div>
                  </td>
                  {/* Company Name - Autocomplete */}
                  <td className="px-3 py-2">
                    <div className="relative">
                      <input 
                        type="text" 
                        value={companySearch[idx]!==undefined?companySearch[idx]:(item.company_name||'')} 
                        onChange={e => handleCompanySearch(idx, e.target.value)} 
                        onKeyDown={e => {
                          const results = companyResults[idx] || []
                          if (e.key === 'Enter' && results.length > 0) {
                            e.preventDefault()
                            selectCompany(idx, results[0])
                          }
                        }}
                        placeholder="Type company..." 
                        className="w-32 px-2 py-1 border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90] bg-transparent" 
                      />
                      {/* Company Autocomplete Dropdown */}
                      {companyResults[idx] && companyResults[idx].length > 0 && (
                        <div className="absolute z-50 top-full left-0 mt-1 w-48 bg-white border border-[#c3c6d5] rounded shadow-lg max-h-32 overflow-y-auto">
                          {companyResults[idx].map((comp, compIdx) => (
                            <button
                              key={compIdx}
                              type="button"
                              onClick={() => selectCompany(idx, comp)}
                              className="w-full text-left px-2 py-1.5 text-[11px] hover:bg-[#f2f4f6] transition-colors"
                            >
                              {comp.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  {/* Rack */}
                  <td className="px-3 py-2">
                    <input type="text" value={item.rack_location} onChange={e => updateItem(idx,'rack_location',e.target.value)} placeholder="A-12" className="w-20 px-2 py-1 border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90] bg-transparent" />
                  </td>
                  {/* pcs/pack */}
                  <td className="px-3 py-2 text-right">
                    <input type="number" min="1" value={item.pcs_in_pack} onChange={e => updateItem(idx,'pcs_in_pack',e.target.value)} className="w-16 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] font-mono focus:border-[#003c90] bg-transparent" />
                  </td>
                  {/* Expiry - Plain text input (MM/YYYY format) */}
                  <td className="px-3 py-2">
                    <input 
                      type="date" 
                      value={item.expiry_date} 
                      onChange={e => updateItem(idx,'expiry_date',e.target.value)} 
                      className="w-32 px-2 py-1 border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90] bg-transparent" 
                    />
                  </td>
                  {/* Purchase P. */}
                  <td className="px-3 py-2 text-right">
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={item.purchase_price} 
                      onChange={e => updateItem(idx,'purchase_price',e.target.value)} 
                      className="w-24 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] font-mono focus:border-[#003c90] bg-transparent" 
                    />
                  </td>
                  {/* Sale P. */}
                  <td className="px-3 py-2 text-right">
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={item.sale_price} 
                      onChange={e => updateItem(idx,'sale_price',e.target.value)} 
                      className="w-24 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] font-mono focus:border-[#003c90] bg-transparent" 
                    />
                  </td>
                  {/* Boxes */}
                  <td className="px-3 py-2 text-right"><input type="number" min="0" value={item.qty_in_boxes} onChange={e => updateItem(idx,'qty_in_boxes',e.target.value)} placeholder="0" className="w-16 px-2 py-1 text-right border-2 border-[#003c90]/30 rounded text-[12px] font-bold text-[#003c90] focus:border-[#003c90] bg-transparent" /></td>
                  {/* Loose */}
                  <td className="px-3 py-2 text-right"><input type="number" min="0" value={item.qty_loose} onChange={e => updateItem(idx,'qty_loose',e.target.value)} placeholder="0" className="w-16 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90] bg-transparent" /></td>
                  {/* Total Qty */}
                  <td className="px-3 py-2 text-right">
                    <span className="inline-block px-2 py-1 bg-[#eceef0] rounded text-[12px] font-bold font-mono text-[#003c90]">{item.qty || 0}</span>
                  </td>
                  {/* Bonus */}
                  <td className="px-3 py-2 text-right"><input type="number" min="0" value={item.bonus} onChange={e => updateItem(idx,'bonus',e.target.value)} className="w-14 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90] bg-transparent" /></td>
                  {/* Disc% */}
                  <td className="px-3 py-2 text-right">
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={item.discount_percent} 
                      onChange={e => updateItem(idx,'discount_percent',e.target.value)}
                      onKeyDown={e => {
                        if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') {
                          // Check if this is the last row and last editable field
                          if (idx === items.length - 1) {
                            e.preventDefault()
                            addRow()
                            // Focus on product search of new row after a brief delay
                            setTimeout(() => {
                              document.getElementById(`product-search-${items.length}`)?.focus()
                            }, 50)
                          }
                        }
                      }}
                      className="w-14 px-2 py-1 text-right border border-[#c3c6d5] rounded text-[12px] focus:border-[#003c90] bg-transparent" 
                    />
                  </td>
                  {/* Net Amt */}
                  <td className="px-3 py-2 text-right text-[12px] font-bold font-mono text-[#003c90]">{fmt(item.total)}</td>
                  {/* Profit % */}
                  <td className="px-3 py-2 text-right">
                    <span className={`text-[12px] font-bold ${item.profit_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.profit_percent.toFixed(1)}%
                    </span>
                  </td>
                  {/* Delete */}
                  <td className="px-3 py-2 text-center">
                    <button 
                      type="button" 
                      onClick={() => removeRow(idx)} 
                      className="px-2 py-1 text-[12px] font-semibold text-red-600 hover:text-white hover:bg-red-600 border border-red-300 rounded transition-all" 
                      title="Delete"
                    >
                      ✕ Del
                    </button>
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>
          
          {/* Add Row Button - Bottom */}
          <div className="px-4 py-3 border-t border-[#c3c6d5]">
            <Btn type="button" size="sm" variant="outline" onClick={addRow} className="w-full justify-center">
              <span className="material-symbols-outlined text-[14px]">add</span>
              Add Row (Tab from last field)
            </Btn>
          </div>
        </Card>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4"><Input label="Notes / Remarks" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Shipment notes..." /></Card>
          <div className="bg-[#003c90] text-white rounded-lg p-5 space-y-3">
            <div className="flex justify-between border-b border-white/10 pb-2 text-[13px]">
              <span>Sub Total</span>
              <span className="font-mono">PKR {fmt(subTotal)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2 text-[13px]">
              <span>GST Tax</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  step="0.1"
                  value={form.gst_tax_percent}
                  onChange={e => {
                    const newGst = parseFloat(e.target.value) || 0
                    setForm({ ...form, gst_tax_percent: newGst })
                    // Recalculate all items with new GST
                    const updated = items.map(item => {
                      const calc = calcTotal(item, newGst)
                      return { ...item, total: calc.total, profit_percent: calc.profit_percent }
                    })
                    setItems(updated)
                  }}
                  className="w-16 px-2 py-1 text-right bg-white/10 border border-white/30 rounded text-[12px] font-mono text-white focus:bg-white/20 focus:border-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
                <span className="text-[11px]">%</span>
                <span className="font-mono ml-2">PKR {fmt(gstTaxAmount)}</span>
              </div>
            </div>
            <div className="flex justify-between items-end pt-1">
              <div><span className="text-[11px] text-white/60 uppercase tracking-widest block">Grand Total</span><span className="text-[32px] font-bold">PKR {fmt(grandTotal)}</span></div>
              <button onClick={handleSave} disabled={submitting} className="px-6 py-3 bg-white text-[#003c90] font-bold text-[13px] rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-2">
                {submitting ? <span className="w-4 h-4 border-2 border-[#003c90]/30 border-t-[#003c90] rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">print</span>}Confirm & Print
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Search Dropdowns (rendered outside table for z-index) */}
      {Object.keys(productResults).map(idx => {
        if (!productResults[idx]?.length || !dropdownPosition[idx]) return null
        const selectedIdx = selectedDropdownIndex[idx] || 0
        return (
          <div 
            key={`dropdown-${idx}`}
            style={{
              position: 'fixed',
              top: dropdownPosition[idx].top + 'px',
              left: dropdownPosition[idx].left + 'px',
              zIndex: 9999
            }}
            className="w-96 bg-white border-2 border-[#003c90] rounded-lg shadow-2xl max-h-64 overflow-y-auto"
            id={`dropdown-container-${idx}`}
          >
            {productResults[idx].map((p, pIdx) => (
              <button 
                key={p.id} 
                type="button" 
                id={`dropdown-item-${idx}-${pIdx}`}
                onClick={() => {
                  selectProduct(parseInt(idx), p)
                  setDropdownPosition(dp => ({...dp, [idx]: null}))
                  setSelectedDropdownIndex(s => ({...s, [idx]: 0}))
                }} 
                className={`w-full flex items-center justify-between px-3 py-2 text-left border-b border-[#eceef0] last:border-0 text-[12px] transition-colors ${
                  pIdx === selectedIdx ? 'bg-[#003c90] text-white' : 'hover:bg-[#f2f4f6]'
                }`}
                onMouseEnter={() => setSelectedDropdownIndex(s => ({...s, [idx]: pIdx}))}
              >
                <span className="font-semibold">{p.name}</span>
                <span className={`font-mono ml-2 text-[10px] ${pIdx === selectedIdx ? 'text-white' : 'text-[#003c90]'}`}>{p.pcs_in_pack}/pk</span>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}
