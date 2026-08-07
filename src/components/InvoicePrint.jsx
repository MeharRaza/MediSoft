import React, { useEffect, useRef } from 'react'
import { fmt } from './ui'

// Thermal Receipt Print Component (80mm) - Proper Table Format
export default function InvoicePrint({ invoice, onClose }) {
  const printButtonRef = useRef(null)
  const closeButtonRef = useRef(null)

  // Focus on Print button when component mounts
  useEffect(() => {
    printButtonRef.current?.focus()
  }, [])

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
    window.print()
  }

  if (!invoice) return null

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
        <div className="center" style={{ fontSize: '10px' }}>
          Opposite Nadra Kiosik Main Bazar Raiwind
        </div>
        <div className="center" style={{ fontSize: '10px' }}>
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
        
        {/* Items - Single Row per Item */}
        {invoice.items?.map((item, idx) => (
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
        
        {/* Totals */}
        <div className="space-between" style={{ fontSize: '11px' }}>
          <span>Gross Total:</span>
          <span>{fmt(invoice.sub_total)}</span>
        </div>
        
        {invoice.discount > 0 && (
          <div className="space-between" style={{ fontSize: '11px' }}>
            <span>Discount:</span>
            <span>{fmt(invoice.discount)}</span>
          </div>
        )}
        
        <div className="line"></div>
        
        <div className="space-between" style={{ fontSize: '13px' }}>
          <span>Net Total</span>
          <span>{fmt(invoice.grand_total)}</span>
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
