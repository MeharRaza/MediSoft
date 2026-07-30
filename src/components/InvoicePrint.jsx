import React from 'react'
import { fmt } from './ui'

// Thermal Receipt Print Component (80mm/58mm)
export default function InvoicePrint({ invoice, onClose }) {
  const handlePrint = () => {
    window.print()
  }

  if (!invoice) return null

  const date = new Date(invoice.created_at)
  const dateStr = date.toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })

  return (
    <>
      {/* Print Styles - Only visible when printing */}
      <style>{`
        @media print {
          /* Hide everything except receipt */
          body * {
            visibility: hidden;
          }
          
          #thermal-receipt, #thermal-receipt * {
            visibility: visible;
          }
          
          #thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            margin: 0;
            padding: 0;
          }
          
          /* Remove default margins */
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          /* Hide print button when printing */
          .no-print {
            display: none !important;
          }
        }
        
        /* Receipt styling */
        #thermal-receipt {
          font-family: 'Courier New', monospace;
          width: 80mm;
          background: white;
          padding: 5mm;
          font-size: 12px;
          line-height: 1.4;
        }
        
        .receipt-header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        
        .receipt-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        
        .receipt-subtitle {
          font-size: 11px;
        }
        
        .receipt-info {
          margin-bottom: 8px;
          font-size: 11px;
        }
        
        .receipt-info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
        }
        
        .receipt-items {
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 8px 0;
          margin-bottom: 8px;
        }
        
        .receipt-item {
          margin-bottom: 6px;
        }
        
        .item-name {
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .item-details {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }
        
        .receipt-totals {
          margin-bottom: 8px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
          font-size: 11px;
        }
        
        .total-row.grand {
          font-size: 14px;
          font-weight: bold;
          border-top: 1px solid #000;
          border-bottom: 1px double #000;
          padding-top: 4px;
          margin-top: 4px;
        }
        
        .receipt-footer {
          text-align: center;
          font-size: 10px;
          border-top: 1px dashed #000;
          padding-top: 8px;
        }
        
        .receipt-footer-line {
          margin-bottom: 2px;
        }
      `}</style>

      {/* Receipt Content */}
      <div id="thermal-receipt">
        {/* Header */}
        <div className="receipt-header">
          <div className="receipt-title">Harmain Medical Store</div>
          <div className="receipt-subtitle">Opposite Nadra Kiosik Main Bazar Raiwind</div>
          <div className="receipt-subtitle" style={{ fontSize: '11px', marginTop: '4px' }}>
            Phone #: 03228684603
          </div>
        </div>

        {/* Invoice Info */}
        <div className="receipt-info">
          <div className="receipt-info-row">
            <span>No. {invoice.invoice_no}</span>
            <span>{dateStr} {timeStr}</span>
          </div>
          <div className="receipt-info-row">
            <span>M/a: *{invoice.payment_method === 'cash' ? 'CASH SALES' : 'CREDIT SALES'}*</span>
          </div>
          {invoice.customer_name && (
            <div className="receipt-info-row">
              <span>Remarks: {invoice.customer_name}</span>
              <span>Ref.:</span>
            </div>
          )}
        </div>

        {/* Items Header */}
        <div style={{ 
          borderBottom: '1px solid #000', 
          paddingBottom: '4px', 
          marginBottom: '4px',
          fontSize: '11px',
          fontWeight: 'bold'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ flex: '2' }}>Item Name</span>
            <span style={{ width: '30px', textAlign: 'right' }}>Qty</span>
            <span style={{ width: '50px', textAlign: 'right' }}>Price</span>
            <span style={{ width: '35px', textAlign: 'right' }}>Disc</span>
            <span style={{ width: '60px', textAlign: 'right' }}>Total</span>
          </div>
        </div>

        {/* Items */}
        <div className="receipt-items" style={{ borderTop: 'none', paddingTop: '0' }}>
          {invoice.items?.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '4px', fontSize: '11px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '1px' }}>
                {item.product_name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ flex: '2' }}></span>
                <span style={{ width: '30px', textAlign: 'right' }}>{item.qty}</span>
                <span style={{ width: '50px', textAlign: 'right' }}>{fmt(item.sale_price)}</span>
                <span style={{ width: '35px', textAlign: 'right' }}>{item.discount_percent > 0 ? fmt(item.discount_percent) : '0'}</span>
                <span style={{ width: '60px', textAlign: 'right', fontWeight: 'bold' }}>{fmt(item.total)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="receipt-totals">
          <div className="total-row" style={{ fontSize: '11px' }}>
            <span>Total Items: {invoice.items?.length || 0}</span>
          </div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '6px', marginTop: '4px' }}>
            <div className="total-row">
              <span>Gross Total:</span>
              <span>{fmt(invoice.sub_total)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="total-row" style={{ fontWeight: 'bold' }}>
                <span>Disc:</span>
                <span>{fmt(invoice.discount)}</span>
              </div>
            )}
          </div>
          {invoice.customer_name && (
            <div className="total-row" style={{ marginTop: '6px', fontSize: '11px' }}>
              <span style={{ fontWeight: 'bold' }}>{invoice.customer_name.toUpperCase()}</span>
            </div>
          )}
          <div className="total-row grand" style={{ fontSize: '13px' }}>
            <span>Net Total</span>
            <span>{fmt(invoice.grand_total)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="receipt-footer" style={{ fontSize: '9px', lineHeight: '1.3' }}>
          <div className="receipt-footer-line">
            1. LOOSE ITEMS, VACCINES, INHALERS AND
          </div>
          <div className="receipt-footer-line">
            FRIDGE ITEMS WILL NOT BE RETURNED.
          </div>
          <div className="receipt-footer-line" style={{ marginTop: '4px', fontWeight: 'bold' }}>
            Thank You For Your Visit!
          </div>
        </div>
      </div>

      {/* Print Button (hidden when printing) */}
      <div className="no-print" style={{ 
        position: 'fixed', 
        bottom: '20px', 
        right: '20px', 
        display: 'flex', 
        gap: '10px',
        zIndex: 9999
      }}>
        <button
          onClick={onClose}
          style={{
            padding: '10px 20px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Close
        </button>
        <button
          onClick={handlePrint}
          style={{
            padding: '10px 20px',
            background: '#003c90',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
          Print Receipt
        </button>
      </div>
    </>
  )
}
