import React, { useEffect, useRef, useState } from 'react'
import { fmt } from './ui'
import { api } from '../lib/api'

// Thermal Receipt Print Component (80mm) - Proper Table Format
export default function InvoicePrint({ invoice, onClose, autoPrint = false }) {
  const printButtonRef = useRef(null)
  const closeButtonRef = useRef(null)
  const hasAutoPrinted = useRef(false) // Track if auto-print already happened
  const [settings, setSettings] = useState({
    store_name: 'Harmain Medical Store',
    tagline: '',
    address: 'Opposite Nadra Kiosk Main Bazar Raiwind',
    phone: '03228684603',
    paper_width: '85mm',
    header_font_size: 20,
    address_font_size: 13,
    meta_font_size: 12,
    item_font_size: 12,
    total_font_size: 14,
    footer_font_size: 11,
    footer_terms: 'LOOSE ITEMS, VACCINES, INHALERS AND FRIDGE ITEMS WILL NOT BE RETURNED.',
    thank_you_msg: 'Thank You For Your Visit!',
    show_discount_col: 1,
    show_customer_name: 1
  })

  useEffect(() => {
    api.settings.getInvoiceSettings().then(s => {
      if (s) {
        setSettings(prev => ({ ...prev, ...s }))
      }
    }).catch(() => {})
  }, [])

  // Auto-print on mount if autoPrint is true (for Ctrl+P)
  useEffect(() => {
    if (autoPrint && !hasAutoPrinted.current) {
      console.log('🖨️ Opening print dialog...')
      hasAutoPrinted.current = true
      
      // Open browser print dialog with receipt loaded
      setTimeout(() => {
        window.print()
        setTimeout(() => onClose(), 1000)
      }, 300)
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

  // Debug: Check what customer data we have
  console.log('📄 Invoice Print Data:', {
    invoice_no: invoice.invoice_no,
    customer_id: invoice.customer_id,
    customer_name: invoice.customer_name,
    full_invoice: invoice
  })

  // Group items by product name (merge split batches)
  const groupedItems = invoice.items?.reduce((acc, item) => {
    const existing = acc.find(i => i.product_name === item.product_name && i.sale_price === item.sale_price)
    if (existing) {
      // Merge quantities and totals
      existing.qty += item.qty
      existing.total += item.total
    } else {
      // Add new item
      acc.push({ ...item })
    }
    return acc
  }, []) || []

  console.log('🔄 Original items:', invoice.items?.length, '→ Grouped items:', groupedItems.length)
  console.log('📊 Item discounts:', groupedItems.map(i => ({ 
    name: i.product_name, 
    discount_percent: i.discount_percent,
    has_discount: (i.discount_percent || 0) > 0
  })))

  const date = new Date(invoice.created_at)
  const dateStr = date.toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 0mm !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .invoice-modal-backdrop,
          .invoice-modal-container {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          #thermal-receipt, #thermal-receipt * {
            visibility: visible;
          }
          
          #thermal-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 2mm 3.5mm 6mm 3.5mm !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            transform: none !important;
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
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          width: 100%;
          max-width: 380px;
          background: #ffffff;
          padding: 16px 14px;
          box-sizing: border-box;
          font-size: ${settings.item_font_size || 12}px;
          line-height: 1.35;
          color: #000000;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          margin: 0 auto;
        }
        
        .center {
          text-align: center;
        }
        
        .bold {
          font-weight: bold;
        }
        
        .line {
          border-top: 1px dashed #000000;
          margin: 4px 0;
          width: 100%;
        }
        
        .space-between {
          display: flex;
          justify-content: space-between;
        }
      `}</style>

      {/* Receipt Content */}
      <div id="thermal-receipt">
        {/* Header - Centered */}
        <div className="center bold" style={{ fontSize: `${settings.header_font_size || 18}px`, letterSpacing: '0.2px' }}>
          {settings.store_name || 'Harmain Medical Store'}
        </div>
        {settings.tagline ? (
          <div className="center" style={{ fontSize: `${(settings.address_font_size || 12) - 1}px`, fontStyle: 'italic', marginTop: '1px' }}>
            {settings.tagline}
          </div>
        ) : null}
        {settings.address ? (
          <div className="center" style={{ fontSize: `${settings.address_font_size || 12}px`, marginTop: '2px', lineHeight: 1.3 }}>
            {settings.address}
          </div>
        ) : null}
        {settings.phone ? (
          <div className="center" style={{ fontSize: `${settings.address_font_size || 12}px`, marginTop: '2px' }}>
            Phone #: {settings.phone}
          </div>
        ) : null}
        
        <div className="line"></div>
        
        {/* Invoice Details */}
        <div className="space-between" style={{ fontSize: `${settings.meta_font_size || 11}px` }}>
          <span>No. {invoice.invoice_no}</span>
          <span>{dateStr} {timeStr}</span>
        </div>
        <div style={{ fontSize: `${settings.meta_font_size || 11}px` }}>
          M/s: {invoice.customer_name || 'Walk-in Customer'}
        </div>
        
        <div className="line"></div>
        
        {/* Items Header - Grid Layout with Discount column */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: settings.show_discount_col ? '44% 12% 15% 13% 16%' : '52% 14% 16% 18%',
          fontSize: `${Math.max(10, (settings.item_font_size || 12) - 1)}px`,
          marginBottom: '3px',
          fontWeight: 'bold',
          letterSpacing: '0.2px'
        }}>
          <div>Item</div>
          <div style={{ textAlign: 'right' }}>Qty</div>
          <div style={{ textAlign: 'right' }}>Price</div>
          {settings.show_discount_col ? <div style={{ textAlign: 'right' }}>Disc</div> : null}
          <div style={{ textAlign: 'right' }}>Total</div>
        </div>
        
        {/* Items - Single Row per Item (Merged by product name) with Discount */}
        {groupedItems.map((item, idx) => {
          // Calculate per-item discount amount
          const itemBase = item.qty * item.sale_price
          const itemDiscAmt = itemBase * ((item.discount_percent || 0) / 100)
          
          return (
            <div key={idx} style={{ 
              display: 'grid',
              gridTemplateColumns: settings.show_discount_col ? '44% 12% 15% 13% 16%' : '52% 14% 16% 18%',
              fontSize: `${settings.item_font_size || 12}px`,
              marginBottom: '3px',
              alignItems: 'baseline'
            }}>
              <div style={{ fontWeight: '600', wordBreak: 'break-word', paddingRight: '4px', lineHeight: 1.25 }}>{item.product_name}</div>
              <div style={{ textAlign: 'right' }}>{item.qty}</div>
              <div style={{ textAlign: 'right' }}>{fmt(item.sale_price)}</div>
              {settings.show_discount_col ? (
                <div style={{ textAlign: 'right' }}>
                  {itemDiscAmt > 0 ? fmt(itemDiscAmt) : '-'}
                </div>
              ) : null}
              <div style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(item.total)}</div>
            </div>
          )
        })}
        
        <div className="line"></div>
        
        {/* Totals - Space-between for full width edge-to-edge alignment */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${settings.total_font_size || 14}px`, padding: '1px 0' }}>
          <span style={{ fontWeight: '500' }}>Gross Total:</span>
          <span style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(invoice.sub_total)}</span>
        </div>
        
        {invoice.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${settings.total_font_size || 14}px`, padding: '1px 0' }}>
            <span style={{ fontWeight: '500' }}>Discount:</span>
            <span style={{ textAlign: 'right', fontWeight: 'bold' }}>- {fmt(invoice.discount)}</span>
          </div>
        )}
        
        <div className="line"></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${(settings.total_font_size || 14) + 3}px`, fontWeight: '900', padding: '2px 0' }}>
          <span>Net Total</span>
          <span style={{ textAlign: 'right' }}>Rs. {fmt(invoice.grand_total)}</span>
        </div>

        {invoice.paid_amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${settings.meta_font_size || 12}px`, marginTop: '3px' }}>
            <span>Paid ({invoice.payment_method || 'Cash'}):</span>
            <span style={{ textAlign: 'right' }}>{fmt(invoice.paid_amount)}</span>
          </div>
        )}
        {invoice.change_amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${settings.meta_font_size || 12}px` }}>
            <span>Change:</span>
            <span style={{ textAlign: 'right' }}>{fmt(invoice.change_amount)}</span>
          </div>
        )}
        
        <div className="line"></div>
        
        {/* Footer */}
        <div className="center" style={{ fontSize: `${settings.footer_font_size || 11}px`, marginTop: '5px', lineHeight: 1.35 }}>
          {settings.footer_terms ? (
            <div style={{ whiteSpace: 'pre-line' }}>{settings.footer_terms}</div>
          ) : (
            <>
              <div>LOOSE ITEMS, VACCINES, INHALERS AND</div>
              <div>FRIDGE ITEMS WILL NOT BE RETURNED.</div>
            </>
          )}
          {settings.thank_you_msg ? (
            <div style={{ marginTop: '4px', fontWeight: 'bold' }}>{settings.thank_you_msg}</div>
          ) : null}
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
