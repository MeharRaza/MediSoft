import React, { useEffect, useRef } from 'react'
import { fmt } from './ui'

// Thermal Receipt Print Component (80mm) - Proper Table Format
export default function InvoicePrint({ invoice, onClose, autoPrint = false }) {
  const printButtonRef = useRef(null)
  const closeButtonRef = useRef(null)
  const hasAutoPrinted = useRef(false) // Track if auto-print already happened

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

  const date = new Date(invoice.created_at)
  const dateStr = date.toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          
          #thermal-receipt, #thermal-receipt * {
            visibility: visible;
          }
          
          #thermal-receipt {
            position: absolute;
            left: 50%;
            top: 0;
            transform: translateX(-50%);
            width: 72mm;
            margin: 0;
            padding: 0;
          }
          
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .no-print {
            display: none !important;
          }
        }
        
        #thermal-receipt {
          font-family: Arial, Helvetica, sans-serif;
          width: 72mm;
          background: white;
          padding: 2mm 4mm;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
        }
        
        .center {
          text-align: center;
        }
        
        .bold {
          font-weight: bold;
        }
        
        .line {
          border-top: 1px dashed #000;
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
        
        .items-table th,
        .items-table td {
          text-align: right;
          padding: 2px 4px;
        }
        
        .items-table th:first-child,
        .items-table td:first-child {
          text-align: left;
        }
      `}</style>

      {/* Receipt Content */}
      <div id="thermal-receipt">
        {/* Header - Centered */}
        <div className="center bold" style={{ fontSize: '16px' }}>
          Harmain Medical Store
        </div>
        <div className="center" style={{ fontSize: '13px', marginTop: '2px' }}>
          Opposite Nadra Kiosik Main Bazar Raiwind
        </div>
        <div className="center" style={{ fontSize: '13px', marginTop: '2px' }}>
          Phone #: 03228684603
        </div>
        
        <div className="line"></div>
        
        {/* Invoice Details */}
        <div className="space-between" style={{ fontSize: '11px' }}>
          <span>No. {invoice.invoice_no}</span>
          <span>{dateStr} {timeStr}</span>
        </div>
        <div style={{ fontSize: '11px' }}>
          M/a: {invoice.customer_name || 'Walk-in Customer'}
        </div>
        
        <div className="line"></div>
        
        {/* Items Header - Grid Layout */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '45% 15% 20% 20%',
          fontSize: '11px',
          marginBottom: '3px'
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
            gridTemplateColumns: '45% 15% 20% 20%',
            fontSize: '11px',
            marginBottom: '3px'
          }}>
            <div>{item.product_name}</div>
            <div style={{ textAlign: 'right' }}>{item.qty}</div>
            <div style={{ textAlign: 'right' }}>{fmt(item.sale_price)}</div>
            <div style={{ textAlign: 'right' }}>{fmt(item.total)}</div>
          </div>
        ))}
        
        <div className="line"></div>
        
        {/* Totals - Labels centered, values right-aligned */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
          <span style={{ flex: 1, textAlign: 'center' }}>Gross Total:</span>
          <span style={{ textAlign: 'right', minWidth: '80px' }}>{fmt(invoice.sub_total)}</span>
        </div>
        
        {invoice.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ flex: 1, textAlign: 'center' }}>Discount:</span>
            <span style={{ textAlign: 'right', minWidth: '80px' }}>{fmt(invoice.discount)}</span>
          </div>
        )}
        
        <div className="line"></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' }}>
          <span style={{ flex: 1, textAlign: 'center' }}>Net Total</span>
          <span style={{ textAlign: 'right', minWidth: '80px' }}>{fmt(invoice.grand_total)}</span>
        </div>
        
        <div className="line"></div>
        
        {/* Footer */}
        <div className="center" style={{ fontSize: '9px', marginTop: '4px' }}>
          <div>LOOSE ITEMS, VACCINES, INHALERS AND</div>
          <div>FRIDGE ITEMS WILL NOT BE RETURNED.</div>
          <div style={{ marginTop: '4px', fontWeight: 'bold' }}>Thank You For Your Visit!</div>
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
