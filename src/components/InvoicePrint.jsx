import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fmt } from './ui'
import { api } from '../lib/api'

const getInitialSettings = () => {
  const fallback = {
    store_name: 'Harmain Medical Store',
    tagline: '',
    address: 'Opposite Nadra Kiosik Main Bazar Raiwind',
    phone: '03228684603',
    header_font_size: 19,
    address_font_size: 13.5,
    meta_font_size: 12.5,
    item_font_size: 12.5,
    total_font_size: 13,
    net_total_font_size: 16,
    footer_font_size: 10,
    footer_terms: 'LOOSE ITEMS, VACCINES, INHALERS AND\nFRIDGE ITEMS WILL NOT BE RETURNED.',
    thank_you_msg: 'Thank You For Your Visit!',
    header_bold: 0,
    tagline_bold: 0,
    address_bold: 0,
    phone_bold: 0,
    meta_bold: 0,
    table_header_bold: 0,
    item_bold: 0,
    total_bold: 0,
    net_total_bold: 1,
    footer_terms_bold: 0,
    thank_you_bold: 0
  }
  try {
    const cached = localStorage.getItem('invoice_settings_cache')
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed && typeof parsed === 'object') {
        return {
          ...fallback,
          ...parsed,
          header_font_size: Number(parsed.header_font_size) >= 16 ? Number(parsed.header_font_size) : 19,
          address_font_size: Number(parsed.address_font_size) >= 12 ? Number(parsed.address_font_size) : 13.5,
          meta_font_size: Number(parsed.meta_font_size) >= 12 ? Number(parsed.meta_font_size) : 12.5,
          item_font_size: Number(parsed.item_font_size) >= 12 ? Number(parsed.item_font_size) : 12.5,
          total_font_size: Number(parsed.total_font_size) >= 12 ? Number(parsed.total_font_size) : 13,
          net_total_font_size: Number(parsed.net_total_font_size) >= 14 ? Number(parsed.net_total_font_size) : 16,
          footer_font_size: Number(parsed.footer_font_size) >= 9.5 ? Number(parsed.footer_font_size) : 10
        }
      }
    }
  } catch (e) {}
  return fallback
}

// Thermal Receipt Print Component (80mm) - Exact match to user desired layout
export default function InvoicePrint({ invoice, onClose, autoPrint = false, settings: propSettings }) {
  const printButtonRef = useRef(null)
  const closeButtonRef = useRef(null)
  const hasAutoPrinted = useRef(false)
  
  const [settings, setSettings] = useState(() => {
    const base = getInitialSettings()
    if (propSettings && typeof propSettings === 'object' && Object.keys(propSettings).length > 0) {
      return {
        ...base,
        ...propSettings,
        header_font_size: Number(propSettings.header_font_size) || base.header_font_size,
        address_font_size: Number(propSettings.address_font_size) || base.address_font_size,
        meta_font_size: Number(propSettings.meta_font_size) || base.meta_font_size,
        item_font_size: Number(propSettings.item_font_size) || base.item_font_size,
        total_font_size: Number(propSettings.total_font_size) || base.total_font_size,
        net_total_font_size: Number(propSettings.net_total_font_size) || base.net_total_font_size,
        footer_font_size: Number(propSettings.footer_font_size) || base.footer_font_size
      }
    }
    return base
  })
  
  const [readyToPrint, setReadyToPrint] = useState(() => Boolean(propSettings))

  useEffect(() => {
    if (propSettings && typeof propSettings === 'object' && Object.keys(propSettings).length > 0) {
      setSettings(prev => ({
        ...prev,
        ...propSettings,
        header_font_size: Number(propSettings.header_font_size) || prev.header_font_size || 19,
        address_font_size: Number(propSettings.address_font_size) || prev.address_font_size || 13.5,
        meta_font_size: Number(propSettings.meta_font_size) || prev.meta_font_size || 12.5,
        item_font_size: Number(propSettings.item_font_size) || prev.item_font_size || 12.5,
        total_font_size: Number(propSettings.total_font_size) || prev.total_font_size || 13,
        net_total_font_size: Number(propSettings.net_total_font_size) || prev.net_total_font_size || 16,
        footer_font_size: Number(propSettings.footer_font_size) || prev.footer_font_size || 10
      }))
      setReadyToPrint(true)
      return
    }

    api.settings.getInvoiceSettings().then(s => {
      if (s) {
        setSettings(prev => {
          const merged = {
            ...prev,
            store_name: s.store_name || prev.store_name,
            tagline: s.tagline || prev.tagline,
            address: s.address || prev.address,
            phone: s.phone || prev.phone,
            header_font_size: Number(s.header_font_size) || prev.header_font_size || 19,
            address_font_size: Number(s.address_font_size) || prev.address_font_size || 13.5,
            meta_font_size: Number(s.meta_font_size) || prev.meta_font_size || 12.5,
            item_font_size: Number(s.item_font_size) || prev.item_font_size || 12.5,
            total_font_size: Number(s.total_font_size) || prev.total_font_size || 13,
            net_total_font_size: Number(s.net_total_font_size) || prev.net_total_font_size || 16,
            footer_font_size: Number(s.footer_font_size) || prev.footer_font_size || 10,
            footer_terms: s.footer_terms || prev.footer_terms,
            thank_you_msg: s.thank_you_msg || prev.thank_you_msg,
            header_bold: s.header_bold !== undefined ? (s.header_bold ? 1 : 0) : prev.header_bold,
            tagline_bold: s.tagline_bold !== undefined ? (s.tagline_bold ? 1 : 0) : prev.tagline_bold,
            address_bold: s.address_bold !== undefined ? (s.address_bold ? 1 : 0) : prev.address_bold,
            phone_bold: s.phone_bold !== undefined ? (s.phone_bold ? 1 : 0) : prev.phone_bold,
            meta_bold: s.meta_bold !== undefined ? (s.meta_bold ? 1 : 0) : prev.meta_bold,
            table_header_bold: s.table_header_bold !== undefined ? (s.table_header_bold ? 1 : 0) : prev.table_header_bold,
            item_bold: s.item_bold !== undefined ? (s.item_bold ? 1 : 0) : prev.item_bold,
            total_bold: s.total_bold !== undefined ? (s.total_bold ? 1 : 0) : prev.total_bold,
            net_total_bold: s.net_total_bold !== undefined ? (s.net_total_bold ? 1 : 0) : prev.net_total_bold,
            footer_terms_bold: s.footer_terms_bold !== undefined ? (s.footer_terms_bold ? 1 : 0) : prev.footer_terms_bold,
            thank_you_bold: s.thank_you_bold !== undefined ? (s.thank_you_bold ? 1 : 0) : prev.thank_you_bold
          }
          try { localStorage.setItem('invoice_settings_cache', JSON.stringify(merged)) } catch (e) {}
          return merged
        })
      }
      setReadyToPrint(true)
    }).catch(() => {
      setReadyToPrint(true)
    })
  }, [propSettings])

  // Auto-print on mount if autoPrint is true (for Ctrl+P)
  useEffect(() => {
    if (autoPrint && readyToPrint && !hasAutoPrinted.current) {
      console.log('🖨️ Triggering auto-print...')
      hasAutoPrinted.current = true
      
      const timer = setTimeout(() => {
        window.print()
        setTimeout(() => onClose(), 800)
      }, 350)
      return () => clearTimeout(timer)
    } else if (!autoPrint) {
      printButtonRef.current?.focus()
    }
  }, [autoPrint, readyToPrint, onClose])

  // Keyboard navigation for buttons
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        if (document.activeElement === closeButtonRef.current) {
          printButtonRef.current?.focus()
        } else {
          closeButtonRef.current?.focus()
        }
      } else if (e.key === 'Enter') {
        if (document.activeElement === closeButtonRef.current) {
          onClose()
        } else if (document.activeElement === printButtonRef.current) {
          handlePrint()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handlePrint = () => {
    if (autoPrint && hasAutoPrinted.current) return
    window.print()
  }

  if (!invoice) return null

  // Group items by product name (merge split batches)
  const groupedItems = invoice.items?.reduce((acc, item) => {
    const existing = acc.find(i => i.product_name === item.product_name && i.sale_price === item.sale_price)
    if (existing) {
      existing.qty += item.qty
      existing.total += item.total
      if (item.discount_percent) existing.discount_percent = item.discount_percent
    } else {
      acc.push({ ...item })
    }
    return acc
  }, []) || []

  // Compute base price and per-item PKR discount amount
  let totalCalculatedItemDisc = 0
  const processedItems = groupedItems.map(item => {
    const qty = Number(item.qty) || 0
    const price = Number(item.sale_price) || 0
    const base = qty * price
    const total = Number(item.total) || 0
    
    let discAmt = 0
    if (item.discount_percent && Number(item.discount_percent) > 0) {
      discAmt = base * (Number(item.discount_percent) / 100)
    } else {
      const diff = base - total
      if (diff > 0.05) {
        discAmt = diff
      }
    }
    totalCalculatedItemDisc += discAmt
    return {
      ...item,
      base,
      discAmt
    }
  })

  const hasItemDiscount = processedItems.some(i => i.discAmt > 0.01)
  const showDiscountCol = Boolean(hasItemDiscount)

  // Totals calculations
  const computedGross = processedItems.reduce((sum, i) => sum + i.base, 0)
  const rawInvoiceSubTotal = Number(invoice.sub_total) || 0
  const rawInvoiceDiscount = Number(invoice.discount) || 0
  const rawGrandTotal = Number(invoice.grand_total) || 0

  const displayGross = computedGross > 0 ? computedGross : Math.max(rawInvoiceSubTotal, rawGrandTotal + rawInvoiceDiscount)
  const totalDiscAmt = Math.max(
    rawInvoiceDiscount,
    totalCalculatedItemDisc,
    Math.max(0, displayGross - rawGrandTotal)
  )
  const displayNet = rawGrandTotal > 0 ? rawGrandTotal : Math.max(0, displayGross - totalDiscAmt)

  const date = new Date(invoice.created_at)
  const dateStr = date.toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: false })

  // Render receipt content function (reused for both screen preview and print portal)
  const renderReceiptContent = () => (
    <>
      {/* Header - Centered */}
      <div className="center" style={{ 
        fontSize: `${settings.header_font_size || 19}px`, 
        fontWeight: settings.header_bold ? 'bold' : 'normal',
        lineHeight: 1.25, 
        letterSpacing: '0.2px' 
      }}>
        {settings.store_name || 'Harmain Medical Store'}
      </div>
      {settings.tagline && (
        <div className="center" style={{ 
          fontSize: `${(settings.address_font_size || 13.5) - 1}px`, 
          fontWeight: settings.tagline_bold ? 'bold' : 'normal',
          fontStyle: 'italic', 
          marginTop: '1px' 
        }}>
          {settings.tagline}
        </div>
      )}
      <div className="center" style={{ 
        fontSize: `${settings.address_font_size || 13.5}px`, 
        fontWeight: settings.address_bold ? 'bold' : 'normal',
        marginTop: '2px', 
        lineHeight: 1.3 
      }}>
        {settings.address || 'Opposite Nadra Kiosik Main Bazar Raiwind'}
      </div>
      <div className="center" style={{ 
        fontSize: `${settings.address_font_size || 13.5}px`, 
        fontWeight: settings.phone_bold ? 'bold' : 'normal',
        marginTop: '2px', 
        lineHeight: 1.3 
      }}>
        Phone #: {settings.phone || '03228684603'}
      </div>
      
      <div className="line"></div>
      
      {/* Invoice Details */}
      <div className="space-between" style={{ 
        fontSize: `${settings.meta_font_size || 12.5}px`,
        fontWeight: settings.meta_bold ? 'bold' : 'normal'
      }}>
        <span>No. {invoice.invoice_no}</span>
        <span>{dateStr} {timeStr}</span>
      </div>
      <div style={{ 
        fontSize: `${settings.meta_font_size || 12.5}px`, 
        fontWeight: settings.meta_bold ? 'bold' : 'normal',
        marginTop: '1px' 
      }}>
        M/a: {invoice.customer_name || 'Walk-in Customer'}
      </div>
      
      <div className="line"></div>
      
      {/* Items Header - Grid Layout (Adaptive: 5 cols when discount exists, 4 cols otherwise) */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: showDiscountCol ? '38% 12% 16% 16% 18%' : '48% 14% 18% 20%',
        fontSize: `${(Number(settings.item_font_size) || 12.5) + 0.5}px`,
        marginBottom: '3px',
        fontWeight: settings.table_header_bold ? 'bold' : 'normal',
        lineHeight: 1.3
      }}>
        <div>Item Name</div>
        <div style={{ textAlign: 'right' }}>Qty</div>
        <div style={{ textAlign: 'right' }}>Price</div>
        {showDiscountCol && <div style={{ textAlign: 'right' }}>Disc</div>}
        <div style={{ textAlign: 'right' }}>Total</div>
      </div>
      
      {/* Items - Single Row per Item (Merged by product name) */}
      {processedItems.map((item, idx) => (
        <div key={idx} style={{ 
          display: 'grid',
          gridTemplateColumns: showDiscountCol ? '38% 12% 16% 16% 18%' : '48% 14% 18% 20%',
          fontSize: `${settings.item_font_size || 12.5}px`,
          fontWeight: settings.item_bold ? 'bold' : 'normal',
          marginBottom: '3px',
          lineHeight: 1.3
        }}>
          <div style={{ wordBreak: 'break-word', paddingRight: '2px' }}>{item.product_name}</div>
          <div style={{ textAlign: 'right' }}>{item.qty}</div>
          <div style={{ textAlign: 'right' }}>{fmt(item.sale_price)}</div>
          {showDiscountCol && (
            <div style={{ textAlign: 'right' }}>
              {item.discAmt > 0.01 ? fmt(item.discAmt) : '-'}
            </div>
          )}
          <div style={{ textAlign: 'right' }}>{fmt(item.total)}</div>
        </div>
      ))}
      
      <div className="line"></div>
      
      {/* Totals - Labels centered, values right-aligned */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        fontSize: `${settings.total_font_size || 13}px`, 
        fontWeight: settings.total_bold ? 'bold' : 'normal',
        margin: '2px 0' 
      }}>
        <span style={{ flex: 1, textAlign: 'center' }}>Gross Total:</span>
        <span style={{ textAlign: 'right', minWidth: '85px' }}>{fmt(displayGross)}</span>
      </div>
      
      {totalDiscAmt > 0.01 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: `${settings.total_font_size || 13}px`, 
          fontWeight: settings.total_bold ? 'bold' : 'normal',
          margin: '2px 0' 
        }}>
          <span style={{ flex: 1, textAlign: 'center' }}>Discount:</span>
          <span style={{ textAlign: 'right', minWidth: '85px' }}>{fmt(totalDiscAmt)}</span>
        </div>
      )}
      
      <div className="line"></div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        fontSize: `${settings.net_total_font_size || 16}px`, 
        fontWeight: settings.net_total_bold ? 'bold' : 'normal', 
        margin: '3px 0' 
      }}>
        <span style={{ flex: 1, textAlign: 'center' }}>Net Total</span>
        <span style={{ textAlign: 'right', minWidth: '90px' }}>{fmt(displayNet)}</span>
      </div>
      
      <div className="line"></div>
      
      {/* Footer */}
      <div className="center" style={{ fontSize: `${settings.footer_font_size || 10}px`, marginTop: '4px', lineHeight: 1.35 }}>
        {settings.footer_terms ? (
          <div style={{ whiteSpace: 'pre-line', fontWeight: settings.footer_terms_bold ? 'bold' : 'normal' }}>
            {settings.footer_terms}
          </div>
        ) : (
          <div style={{ fontWeight: settings.footer_terms_bold ? 'bold' : 'normal' }}>
            <div>LOOSE ITEMS, VACCINES, INHALERS AND</div>
            <div>FRIDGE ITEMS WILL NOT BE RETURNED.</div>
          </div>
        )}
        {settings.thank_you_msg && (
          <div style={{ 
            marginTop: '4px', 
            fontWeight: settings.thank_you_bold ? 'bold' : 'normal', 
            fontSize: `${(Number(settings.footer_font_size) || 10) + 0.5}px` 
          }}>
            {settings.thank_you_msg}
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media screen {
          #thermal-receipt-portal {
            display: none !important;
          }
        }

        @media print {
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            min-width: 80mm !important;
            max-width: 80mm !important;
            background: #ffffff !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* CRITICAL: Hiding #root removes all background pages, sidebars, and modals
             from layout calculation so Chromium Blink NEVER scales or shrinks the receipt! */
          #root {
            display: none !important;
          }
          
          .no-print {
            display: none !important;
          }

          #thermal-receipt-portal {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 76mm !important;
            max-width: 76mm !important;
            margin: 0 auto !important;
            padding: 1mm 1.5mm 3mm 1.5mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            font-family: Arial, Helvetica, sans-serif !important;
            color: #000000 !important;
            line-height: 1.35 !important;
          }

          #thermal-receipt-portal * {
            visibility: visible !important;
          }
          
          .line {
            border-top: 1px dashed #000000 !important;
            width: 100% !important;
            display: block !important;
            margin: 4px 0 !important;
          }
        }
        
        #thermal-receipt-modal {
          font-family: Arial, Helvetica, sans-serif;
          width: 74mm;
          max-width: 100%;
          background: #ffffff;
          padding: 2mm 3mm;
          font-size: 12.5px;
          line-height: 1.35;
          color: #000000;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          margin: 0 auto;
          box-sizing: border-box;
        }
        
        .center {
          text-align: center;
        }
        
        .bold {
          font-weight: bold;
        }
        
        .line {
          border-top: 1px dashed #000000;
          width: 100%;
          display: block;
          margin: 4px 0;
        }
        
        .space-between {
          display: flex;
          justify-content: space-between;
        }
      `}</style>

      {/* Screen Modal Preview Content */}
      <div id="thermal-receipt-modal">
        {renderReceiptContent()}
      </div>

      {/* Print Portal: Attached directly to document.body outside #root for 100% full-width printing */}
      {typeof document !== 'undefined' && createPortal(
        <div id="thermal-receipt-portal">
          {renderReceiptContent()}
        </div>,
        document.body
      )}

      {/* Action Buttons (Screen Only) */}
      <div className="no-print" style={{ 
        position: 'fixed', 
        bottom: '20px', 
        right: '20px', 
        display: 'flex', 
        gap: '10px',
        zIndex: 9999
      }}>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          style={{
            padding: '10px 20px',
            background: '#6c757d',
            color: 'white',
            border: '2px solid transparent',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            outline: 'none',
            transition: 'all 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#495057'}
          onBlur={(e) => e.target.style.borderColor = 'transparent'}
        >
          Close (Esc)
        </button>
        <button
          ref={printButtonRef}
          onClick={handlePrint}
          style={{
            padding: '10px 20px',
            background: '#003c90',
            color: 'white',
            border: '2px solid transparent',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            outline: 'none',
            transition: 'all 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#0056b3'}
          onBlur={(e) => e.target.style.borderColor = 'transparent'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
          Print Receipt (Enter)
        </button>
      </div>
    </>
  )
}
