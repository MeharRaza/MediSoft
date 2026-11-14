import React, { useEffect, useRef, useState } from 'react'
import { fmt } from './ui'
import { api } from '../lib/api'

const getInitialSettings = () => {
  try {
    const cached = localStorage.getItem('invoice_settings_cache')
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch (e) {}
  return {
    store_name: 'Harmain Medical Store',
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
    thank_you_msg: 'Thank You For Your Visit!'
  }
}

// Thermal Receipt Print Component (80mm) - Exact match to user desired layout
export default function InvoicePrint({ invoice, onClose, autoPrint = false }) {
  const printButtonRef = useRef(null)
  const closeButtonRef = useRef(null)
  const hasAutoPrinted = useRef(false)
  const [settings, setSettings] = useState(getInitialSettings)

  useEffect(() => {
    api.settings.getInvoiceSettings().then(s => {
      if (s) {
        setSettings(prev => {
          const merged = {
            ...prev,
            store_name: s.store_name || prev.store_name,
            address: s.address || prev.address,
            phone: s.phone || prev.phone,
            header_font_size: Number(s.header_font_size) || prev.header_font_size,
            address_font_size: Number(s.address_font_size) || prev.address_font_size,
            meta_font_size: Number(s.meta_font_size) || prev.meta_font_size,
            item_font_size: Number(s.item_font_size) || prev.item_font_size,
            total_font_size: Number(s.total_font_size) || prev.total_font_size,
            net_total_font_size: Number(s.net_total_font_size) || prev.net_total_font_size,
            footer_font_size: Number(s.footer_font_size) || prev.footer_font_size,
            footer_terms: s.footer_terms || prev.footer_terms,
            thank_you_msg: s.thank_you_msg || prev.thank_you_msg
          }
          try { localStorage.setItem('invoice_settings_cache', JSON.stringify(merged)) } catch (e) {}
          return merged
        })
      }
    }).catch(() => {})
  }, [])

  // Auto-print on mount if autoPrint is true (for Ctrl+P)
  useEffect(() => {
    if (autoPrint && !hasAutoPrinted.current) {
      console.log('🖨️ Opening print dialog...')
      hasAutoPrinted.current = true
      
      // Open browser print dialog with receipt loaded
      const timer = setTimeout(() => {
        window.print()
        setTimeout(() => onClose(), 800)
      }, 350)
      return () => clearTimeout(timer)
    } else if (!autoPrint) {
      printButtonRef.current?.focus()
    }
  }, [autoPrint, onClose])

  // Keyboard navigation for buttons
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Tab navigation between buttons
      if (e.key === 'Tab') {
        e.preventDefault()
        if (document.activeElement === closeButtonRef.current) {
          printButtonRef.current?.focus()
        } else {
          closeButtonRef.current?.focus()
        }
      }
      // Enter to trigger focused button
      else if (e.key === 'Enter') {
        if (document.activeElement === closeButtonRef.current) {
          onClose()
        } else if (document.activeElement === printButtonRef.current) {
          handlePrint()
        }
      }
      // Escape to close
      else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handlePrint = () => {
    // Prevent double print during auto-print mode
    if (autoPrint && hasAutoPrinted.current) {
      console.log('⚠️ Print already triggered, ignoring duplicate')
      return
    }
    window.print()
  }

  if (!invoice) return null

  // Group items by product name (merge split batches)
  const groupedItems = invoice.items?.reduce((acc, item) => {
    const existing = acc.find(i => i.product_name === item.product_name && i.sale_price === item.sale_price)
    if (existing) {
      existing.qty += item.qty
      existing.total += item.total
    } else {
      acc.push({ ...item })
    }
    return acc
  }, []) || []

  const date = new Date(invoice.created_at)
  const dateStr = date.toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            height: auto !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          #thermal-receipt, #thermal-receipt * {
            visibility: visible;
          }
          
          #thermal-receipt {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            transform: none !important;
            width: 100% !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 1mm 2.5mm 3mm 2.5mm !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
          }
          
          .line {
            border-top: 1px dashed #000000 !important;
            width: 100% !important;
            display: block !important;
            margin: 4px 0 !important;
          }
          
          .no-print {
            display: none !important;
          }
        }
        
        #thermal-receipt {
          font-family: Arial, Helvetica, sans-serif;
          width: 72mm;
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
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
        }
      `}</style>

      {/* Receipt Content */}
      <div id="thermal-receipt">
        {/* Header - Centered */}
        <div className="center bold" style={{ fontSize: `${settings.header_font_size || 19}px`, lineHeight: 1.25, letterSpacing: '0.2px' }}>
          {settings.store_name || 'Harmain Medical Store'}
        </div>
        <div className="center" style={{ fontSize: `${settings.address_font_size || 13.5}px`, marginTop: '2px', lineHeight: 1.3 }}>
          {settings.address || 'Opposite Nadra Kiosik Main Bazar Raiwind'}
        </div>
        <div className="center" style={{ fontSize: `${settings.address_font_size || 13.5}px`, marginTop: '2px', lineHeight: 1.3 }}>
          Phone #: {settings.phone || '03228684603'}
        </div>
        
        <div className="line"></div>
        
        {/* Invoice Details */}
        <div className="space-between" style={{ fontSize: `${settings.meta_font_size || 12.5}px` }}>
          <span>No. {invoice.invoice_no}</span>
          <span>{dateStr} {timeStr}</span>
        </div>
        <div style={{ fontSize: `${settings.meta_font_size || 12.5}px`, marginTop: '1px' }}>
          M/a: {invoice.customer_name || 'Walk-in Customer'}
        </div>
        
        <div className="line"></div>
        
        {/* Items Header - Grid Layout (4 columns matching exact desired layout) */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '46% 14% 18% 22%',
          fontSize: `${(Number(settings.item_font_size) || 12.5) + 0.5}px`,
          marginBottom: '3px',
          fontWeight: 'bold',
          lineHeight: 1.3
        }}>
          <div>Item Name</div>
          <div style={{ textAlign: 'right' }}>Qty</div>
          <div style={{ textAlign: 'right' }}>Price</div>
          <div style={{ textAlign: 'right' }}>Total</div>
        </div>
        
        {/* Items - Single Row per Item (Merged by product name) */}
        {groupedItems.map((item, idx) => (
          <div key={idx} style={{ 
            display: 'grid',
            gridTemplateColumns: '46% 14% 18% 22%',
            fontSize: `${settings.item_font_size || 12.5}px`,
            marginBottom: '3px',
            lineHeight: 1.3
          }}>
            <div style={{ wordBreak: 'break-word', paddingRight: '2px', fontWeight: '500' }}>{item.product_name}</div>
            <div style={{ textAlign: 'right' }}>{item.qty}</div>
            <div style={{ textAlign: 'right' }}>{fmt(item.sale_price)}</div>
            <div style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(item.total)}</div>
          </div>
        ))}
        
        <div className="line"></div>
        
        {/* Totals - Labels centered, values right-aligned */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${settings.total_font_size || 13}px`, margin: '2px 0' }}>
          <span style={{ flex: 1, textAlign: 'center' }}>Gross Total:</span>
          <span style={{ textAlign: 'right', minWidth: '85px', fontWeight: 'bold' }}>{fmt(invoice.sub_total)}</span>
        </div>
        
        {invoice.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${settings.total_font_size || 13}px`, margin: '2px 0' }}>
            <span style={{ flex: 1, textAlign: 'center' }}>Discount:</span>
            <span style={{ textAlign: 'right', minWidth: '85px', fontWeight: 'bold' }}>{fmt(invoice.discount)}</span>
          </div>
        )}
        
        <div className="line"></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${settings.net_total_font_size || 16}px`, fontWeight: 'bold', margin: '3px 0' }}>
          <span style={{ flex: 1, textAlign: 'center' }}>Net Total</span>
          <span style={{ textAlign: 'right', minWidth: '90px' }}>{fmt(invoice.grand_total)}</span>
        </div>
        
        <div className="line"></div>
        
        {/* Footer */}
        <div className="center" style={{ fontSize: `${settings.footer_font_size || 10}px`, marginTop: '4px', lineHeight: 1.35 }}>
          {settings.footer_terms ? (
            <div style={{ whiteSpace: 'pre-line' }}>{settings.footer_terms}</div>
          ) : (
            <>
              <div>LOOSE ITEMS, VACCINES, INHALERS AND</div>
              <div>FRIDGE ITEMS WILL NOT BE RETURNED.</div>
            </>
          )}
          {settings.thank_you_msg && (
            <div style={{ marginTop: '4px', fontWeight: 'bold', fontSize: `${(Number(settings.footer_font_size) || 10) + 0.5}px` }}>
              {settings.thank_you_msg}
            </div>
          )}
        </div>
      </div>

      {/* Print Button */}
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
          Close
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
          Print Receipt
        </button>
      </div>
    </>
  )
}
