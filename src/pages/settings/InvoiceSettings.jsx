import React, { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input } from '../../components/ui'
import InvoicePrint from '../../components/InvoicePrint'

function BoldToggle({ value, onChange, label }) {
  const isBold = Boolean(value)
  return (
    <button
      type="button"
      onClick={() => onChange(isBold ? 0 : 1)}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border transition-all select-none ${
        isBold
          ? 'bg-[#003c90] text-white border-[#003c90] shadow-sm'
          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100 hover:text-gray-900'
      }`}
      title={label ? `${label}: ${isBold ? 'Bold (On)' : 'Unbold'}` : 'Toggle Bold'}
    >
      <span className={`text-[12px] leading-none ${isBold ? 'font-black' : 'font-normal'}`}>B</span>
      <span>{isBold ? 'Bold' : 'Unbold'}</span>
    </button>
  )
}

export default function InvoiceSettings() {
  const [form, setForm] = useState({
    store_name: 'Harmain Medical Store',
    tagline: '',
    address: 'Opposite Nadra Kiosik Main Bazar Raiwind',
    phone: '03228684603',
    paper_width: '80mm',
    header_font_size: 19,
    address_font_size: 13.5,
    meta_font_size: 12.5,
    item_font_size: 12.5,
    total_font_size: 13,
    net_total_font_size: 16,
    footer_font_size: 10,
    footer_terms: 'LOOSE ITEMS, VACCINES, INHALERS AND\nFRIDGE ITEMS WILL NOT BE RETURNED.',
    thank_you_msg: 'Thank You For Your Visit!',
    show_discount_col: 0,
    show_customer_name: 1,
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
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [showTestPrint, setShowTestPrint] = useState(false)

  const sampleInvoice = {
    invoice_no: 'INV-15666',
    created_at: new Date().toISOString(),
    customer_name: 'Walk-in Customer',
    items: [
      { product_name: 'OMEGA 20MG CAP', qty: 3, sale_price: 27.86, total: 83.57 },
      { product_name: 'KESTINE 10MG TAB', qty: 3, sale_price: 21.24, total: 63.71 },
      { product_name: 'MYTEKA 10MG TAB', qty: 3, sale_price: 39.57, total: 118.71 },
      { product_name: 'DR KOFF CANDY(RS#10)', qty: 10, sale_price: 10.00, total: 100.00 },
      { product_name: 'GOURMET 1.5 LTR (LEMON)', qty: 1, sale_price: 160.00, total: 160.00 }
    ],
    sub_total: 525.99,
    discount: 26.30,
    grand_total: 499.69
  }

  useEffect(() => {
    api.settings.getInvoiceSettings().then(s => {
      if (s) {
        setForm(prev => ({
          ...prev,
          ...s,
          header_font_size: Number(s.header_font_size) || 19,
          address_font_size: Number(s.address_font_size) || 13.5,
          meta_font_size: Number(s.meta_font_size) || 12.5,
          item_font_size: Number(s.item_font_size) || 12.5,
          total_font_size: Number(s.total_font_size) || 13,
          net_total_font_size: Number(s.net_total_font_size) || 16,
          footer_font_size: Number(s.footer_font_size) || 10,
          show_discount_col: s.show_discount_col ?? 0,
          show_customer_name: s.show_customer_name ?? 1,
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
        }))
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [form])

  const handleChange = (field, val) => {
    setForm(prev => {
      const next = { ...prev, [field]: val }
      if (field === 'item_font_size') {
        next.meta_font_size = val
      }
      if (field === 'total_font_size') {
        next.net_total_font_size = Math.round((val + 3) * 10) / 10
      }
      try { localStorage.setItem('invoice_settings_cache', JSON.stringify(next)) } catch (e) {}
      return next
    })
    setMsg(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      try { localStorage.setItem('invoice_settings_cache', JSON.stringify(form)) } catch (e) {}
      const res = await api.settings.saveInvoiceSettings(form)
      if (res && res.success !== false) {
        setMsg({ type: 'success', text: '✓ Invoice & Receipt settings saved successfully!' })
      } else {
        setMsg({ type: 'error', text: res?.error || 'Failed to save settings.' })
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error saving settings.' })
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(null), 5000)
    }
  }

  const handleReset = () => {
    if (!confirm('Reset invoice settings to recommended standard values?')) return
    const defaults = {
      store_name: 'Harmain Medical Store',
      tagline: '',
      address: 'Opposite Nadra Kiosik Main Bazar Raiwind',
      phone: '03228684603',
      paper_width: '80mm',
      header_font_size: 19,
      address_font_size: 13.5,
      meta_font_size: 12.5,
      item_font_size: 12.5,
      total_font_size: 13,
      net_total_font_size: 16,
      footer_font_size: 10,
      footer_terms: 'LOOSE ITEMS, VACCINES, INHALERS AND\nFRIDGE ITEMS WILL NOT BE RETURNED.',
      thank_you_msg: 'Thank You For Your Visit!',
      show_discount_col: 0,
      show_customer_name: 1,
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
    setForm(defaults)
    try { localStorage.setItem('invoice_settings_cache', JSON.stringify(defaults)) } catch (e) {}
    setMsg({ type: 'info', text: 'Reset to defaults. Click "Save Settings" to apply.' })
  }

  const handleTestPrint = () => {
    try { localStorage.setItem('invoice_settings_cache', JSON.stringify(form)) } catch (e) {}
    setShowTestPrint(true)
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] pb-12">
      <PageHeader 
        title="Invoice Print Settings" 
        subtitle="Customize store name, address, phone, typography and slip width for thermal receipt printer"
        actions={
          <div className="flex items-center gap-2">
            <Btn variant="outline" onClick={handleTestPrint} className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">print</span>
              Print Test Receipt
            </Btn>
            <Btn onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 bg-[#003c90] hover:bg-[#002d6d]">
              <span className="material-symbols-outlined text-[18px]">save</span>
              {saving ? 'Saving...' : 'Save Settings (Ctrl+S)'}
            </Btn>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-6">
        {msg && (
          <div className={`mb-6 p-4 rounded-lg flex items-center justify-between text-[13px] font-semibold ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
            msg.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)} className="text-gray-400 hover:text-gray-700">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: SETTINGS FORM (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Header Branding Card */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e2e8f0]">
                <span className="material-symbols-outlined text-[#003c90] text-[22px]">storefront</span>
                <h3 className="text-[16px] font-bold text-[#0f172a]">Pharmacy & Header Details</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[12px] font-bold text-[#334155]">
                      Store / Pharmacy Name <span className="text-red-500">*</span>
                    </label>
                    <BoldToggle value={form.header_bold} onChange={v => handleChange('header_bold', v)} label="Store Name" />
                  </div>
                  <Input 
                    value={form.store_name}
                    onChange={e => handleChange('store_name', e.target.value)}
                    placeholder="e.g. Harmain Medical Store"
                    className="font-semibold text-[#003c90]"
                  />
                  <p className="text-[11px] text-[#64748b] mt-1">This is printed at the very top of each customer receipt.</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[12px] font-bold text-[#334155]">
                      Sub-title / Tagline <span className="text-[11px] font-normal text-gray-500">(Optional)</span>
                    </label>
                    <BoldToggle value={form.tagline_bold} onChange={v => handleChange('tagline_bold', v)} label="Tagline" />
                  </div>
                  <Input 
                    value={form.tagline}
                    onChange={e => handleChange('tagline', e.target.value)}
                    placeholder="e.g. Wholesale & Retail Chemist"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[12px] font-bold text-[#334155]">
                      Store Address
                    </label>
                    <BoldToggle value={form.address_bold} onChange={v => handleChange('address_bold', v)} label="Address" />
                  </div>
                  <Input 
                    value={form.address}
                    onChange={e => handleChange('address', e.target.value)}
                    placeholder="e.g. Opposite Nadra Kiosk Main Bazar Raiwind"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[12px] font-bold text-[#334155]">
                      Phone / Contact Number
                    </label>
                    <BoldToggle value={form.phone_bold} onChange={v => handleChange('phone_bold', v)} label="Phone" />
                  </div>
                  <Input 
                    value={form.phone}
                    onChange={e => handleChange('phone', e.target.value)}
                    placeholder="e.g. 03228684603"
                  />
                </div>
              </div>
            </Card>

            {/* Paper Sizing Card */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e2e8f0]">
                <span className="material-symbols-outlined text-[#003c90] text-[22px]">receipt_long</span>
                <h3 className="text-[16px] font-bold text-[#0f172a]">Thermal Paper Width & Format</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-2">
                    Thermal Roll Paper Width
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleChange('paper_width', '85mm')}
                      className={`p-3.5 rounded-lg border text-left transition-all ${
                        form.paper_width === '85mm' 
                          ? 'border-[#003c90] bg-blue-50/70 ring-2 ring-[#003c90]/20' 
                          : 'border-[#cbd5e1] hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[14px] text-[#0f172a]">85mm (Wide Roll)</span>
                        {form.paper_width === '85mm' && <span className="text-[#003c90] text-[18px]">✓</span>}
                      </div>
                      <p className="text-[11px] text-[#64748b] mt-1">Recommended for wide slips, prevents blank margins on sides.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChange('paper_width', '80mm')}
                      className={`p-3.5 rounded-lg border text-left transition-all ${
                        form.paper_width === '80mm' 
                          ? 'border-[#003c90] bg-blue-50/70 ring-2 ring-[#003c90]/20' 
                          : 'border-[#cbd5e1] hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[14px] text-[#0f172a]">80mm (Standard POS)</span>
                        {form.paper_width === '80mm' && <span className="text-[#003c90] text-[18px]">✓</span>}
                      </div>
                      <p className="text-[11px] text-[#64748b] mt-1">Standard compact 3-inch thermal printer roll.</p>
                    </button>
                  </div>
                </div>

                <div className="pt-2 text-[12px] text-gray-500 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#003c90]">info</span>
                  <span><strong>Automatic Disc Column:</strong> Receipt par "Disc" column sirf tab show hoga jab kisi item par specific discount diya jaye ga. Baghair discount ke clean 4 columns rahengay.</span>
                </div>
              </div>
            </Card>

            {/* Typography & Font Sizes Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e2e8f0]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#003c90] text-[22px]">format_size</span>
                  <h3 className="text-[16px] font-bold text-[#0f172a]">Font Size & Slip Tuning (85mm Optimized)</h3>
                </div>
                <span className="text-[11px] font-semibold bg-blue-100 text-[#003c90] px-2.5 py-0.5 rounded-full">
                  Live Synced
                </span>
              </div>

              <div className="space-y-5">
                {/* Header Title Font Size */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[12px] font-bold text-[#334155]">Store Name Size (Title)</label>
                    <div className="flex items-center gap-2">
                      <BoldToggle value={form.header_bold} onChange={v => handleChange('header_bold', v)} label="Store Name" />
                      <span className="text-[12px] font-mono font-bold text-[#003c90] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {form.header_font_size} px
                      </span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="14" 
                    max="24" 
                    step="1"
                    value={form.header_font_size}
                    onChange={e => handleChange('header_font_size', Number(e.target.value))}
                    className="w-full accent-[#003c90] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>14px (Compact)</span>
                    <span>18px (Recommended)</span>
                    <span>24px (Large)</span>
                  </div>
                </div>

                {/* Address & Phone Font Size */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[12px] font-bold text-[#334155]">Address & Phone Size</label>
                    <div className="flex items-center gap-2">
                      <BoldToggle value={form.address_bold} onChange={v => handleChange('address_bold', v)} label="Address" />
                      <span className="text-[12px] font-mono font-bold text-[#003c90] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {form.address_font_size} px
                      </span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="11" 
                    max="16" 
                    step="0.5"
                    value={form.address_font_size}
                    onChange={e => handleChange('address_font_size', Number(e.target.value))}
                    className="w-full accent-[#003c90] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>11px</span>
                    <span>13.5px (Recommended)</span>
                    <span>16px</span>
                  </div>
                </div>

                {/* Invoice Details (No, Date, Customer) */}
                <div className="p-3 bg-gray-50/80 rounded-lg border border-gray-200 flex justify-between items-center">
                  <div>
                    <div className="text-[12px] font-bold text-[#334155]">Invoice Info (No. INV, Date, Customer)</div>
                    <div className="text-[11px] text-gray-500">Details row right below header</div>
                  </div>
                  <BoldToggle value={form.meta_bold} onChange={v => handleChange('meta_bold', v)} label="Invoice Info" />
                </div>

                {/* Table Header Row */}
                <div className="p-3 bg-gray-50/80 rounded-lg border border-gray-200 flex justify-between items-center">
                  <div>
                    <div className="text-[12px] font-bold text-[#334155]">Table Header (Item Name, Qty, Price, Total)</div>
                    <div className="text-[11px] text-gray-500">Items table column titles row</div>
                  </div>
                  <BoldToggle value={form.table_header_bold} onChange={v => handleChange('table_header_bold', v)} label="Table Header" />
                </div>

                {/* Items Table Font Size */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[12px] font-bold text-[#334155]">Medicines & Items Names</label>
                    <div className="flex items-center gap-2">
                      <BoldToggle value={form.item_bold} onChange={v => handleChange('item_bold', v)} label="Items" />
                      <span className="text-[12px] font-mono font-bold text-[#003c90] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {form.item_font_size} px
                      </span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="15" 
                    step="0.5"
                    value={form.item_font_size}
                    onChange={e => handleChange('item_font_size', Number(e.target.value))}
                    className="w-full accent-[#003c90] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>10px (Compact)</span>
                    <span>12.5px (Recommended)</span>
                    <span>15px (Large)</span>
                  </div>
                </div>

                {/* Totals Font Size */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[12px] font-bold text-[#334155]">Gross Total & Discount</label>
                    <div className="flex items-center gap-2">
                      <BoldToggle value={form.total_bold} onChange={v => handleChange('total_bold', v)} label="Totals" />
                      <span className="text-[12px] font-mono font-bold text-[#003c90] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {form.total_font_size} px
                      </span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="11" 
                    max="18" 
                    step="0.5"
                    value={form.total_font_size}
                    onChange={e => handleChange('total_font_size', Number(e.target.value))}
                    className="w-full accent-[#003c90] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>11px</span>
                    <span>13px (Default)</span>
                    <span>18px (Prominent)</span>
                  </div>
                </div>

                {/* Net Total Row */}
                <div className="p-3 bg-gray-50/80 rounded-lg border border-gray-200 flex justify-between items-center">
                  <div>
                    <div className="text-[12px] font-bold text-[#334155]">Net Total (Final Amount)</div>
                    <div className="text-[11px] text-gray-500">Highlighted final bill amount row</div>
                  </div>
                  <BoldToggle value={form.net_total_bold} onChange={v => handleChange('net_total_bold', v)} label="Net Total" />
                </div>

                {/* Footer Notice Font Size */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[12px] font-bold text-[#334155]">Footer Notice / Policy Size</label>
                    <div className="flex items-center gap-2">
                      <BoldToggle value={form.footer_terms_bold} onChange={v => handleChange('footer_terms_bold', v)} label="Footer Policy" />
                      <span className="text-[12px] font-mono font-bold text-[#003c90] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {form.footer_font_size} px
                      </span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="8" 
                    max="14" 
                    step="0.5"
                    value={form.footer_font_size}
                    onChange={e => handleChange('footer_font_size', Number(e.target.value))}
                    className="w-full accent-[#003c90] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>8px</span>
                    <span>10px (Standard)</span>
                    <span>14px</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Footer Policy & Return Terms Card */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e2e8f0]">
                <span className="material-symbols-outlined text-[#003c90] text-[22px]">policy</span>
                <h3 className="text-[16px] font-bold text-[#0f172a]">Return Policy & Thank You Note</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[12px] font-bold text-[#334155]">
                      Return Policy / Notice
                    </label>
                    <BoldToggle value={form.footer_terms_bold} onChange={v => handleChange('footer_terms_bold', v)} label="Policy Notice" />
                  </div>
                  <textarea 
                    rows="3"
                    value={form.footer_terms}
                    onChange={e => handleChange('footer_terms', e.target.value)}
                    placeholder="Enter items return policy or terms"
                    className="w-full px-3 py-2 text-[13px] border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003c90]"
                  />
                  <p className="text-[11px] text-[#64748b] mt-1">Printed below the total. E.g. Vaccine / fridge item warning.</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[12px] font-bold text-[#334155]">
                      Thank You Message
                    </label>
                    <BoldToggle value={form.thank_you_bold} onChange={v => handleChange('thank_you_bold', v)} label="Thank You Msg" />
                  </div>
                  <Input 
                    value={form.thank_you_msg}
                    onChange={e => handleChange('thank_you_msg', e.target.value)}
                    placeholder="e.g. Thank You For Your Visit!"
                  />
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-[13px] text-gray-600 hover:text-gray-900 underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                Reset to Standard Defaults
              </button>
              <Btn onClick={handleSave} disabled={saving} className="bg-[#003c90] hover:bg-[#002d6d] px-6 py-2.5">
                {saving ? 'Saving Changes...' : 'Save Settings (Ctrl+S)'}
              </Btn>
            </div>

          </div>

          {/* RIGHT: LIVE THERMAL SLIP PREVIEW (5 cols) */}
          <div className="lg:col-span-5 sticky top-6">
            <div className="bg-slate-800 text-white px-4 py-2.5 rounded-t-xl flex items-center justify-between text-[12px] font-bold shadow-md">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Thermal Slip Preview
              </span>
              <span className="text-[11px] text-slate-300 font-mono">
                {form.paper_width}
              </span>
            </div>

            {/* Realistic Thermal Paper Slip */}
            <div className="bg-[#e2e8f0] p-4 rounded-b-xl shadow-inner flex justify-center overflow-x-auto">
              <div 
                id="thermal-receipt-preview"
                style={{
                  width: '72mm',
                  maxWidth: '100%',
                  background: '#ffffff',
                  color: '#000000',
                  padding: '2mm 3mm',
                  boxSizing: 'border-box',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  borderRadius: '2px',
                  lineHeight: 1.35
                }}
              >
                {/* Header Title */}
                <div 
                  style={{
                    textAlign: 'center',
                    fontWeight: form.header_bold ? 'bold' : 'normal',
                    fontSize: `${form.header_font_size}px`,
                    letterSpacing: '0.2px',
                    wordBreak: 'break-word',
                    lineHeight: 1.25
                  }}
                >
                  {form.store_name || 'Harmain Medical Store'}
                </div>

                {/* Tagline */}
                {form.tagline ? (
                  <div 
                    style={{
                      textAlign: 'center',
                      fontSize: `${form.address_font_size - 1}px`,
                      fontWeight: form.tagline_bold ? 'bold' : 'normal',
                      fontStyle: 'italic',
                      marginTop: '1px'
                    }}
                  >
                    {form.tagline}
                  </div>
                ) : null}

                {/* Address */}
                <div 
                  style={{
                    textAlign: 'center',
                    fontSize: `${form.address_font_size}px`,
                    fontWeight: form.address_bold ? 'bold' : 'normal',
                    marginTop: '2px',
                    lineHeight: 1.3
                  }}
                >
                  {form.address || 'Opposite Nadra Kiosik Main Bazar Raiwind'}
                </div>

                {/* Phone */}
                <div 
                  style={{
                    textAlign: 'center',
                    fontSize: `${form.address_font_size}px`,
                    fontWeight: form.phone_bold ? 'bold' : 'normal',
                    marginTop: '2px',
                    lineHeight: 1.3
                  }}
                >
                  Phone #: {form.phone || '03228684603'}
                </div>

                {/* Divider Line */}
                <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

                {/* Invoice Meta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${form.meta_font_size}px`, fontWeight: form.meta_bold ? 'bold' : 'normal' }}>
                  <span>No. INV-15666</span>
                  <span>14/11/2026 13:16</span>
                </div>
                <div style={{ fontSize: `${form.meta_font_size}px`, fontWeight: form.meta_bold ? 'bold' : 'normal', marginTop: '1px' }}>
                  M/a: Walk-in Customer
                </div>

                {/* Divider Line */}
                <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

                {/* Table Header (clean 4 cols because sample invoice has no per-item discount) */}
                <div 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48% 14% 18% 20%',
                    fontSize: `${(Number(form.item_font_size) || 12.5) + 0.5}px`,
                    fontWeight: form.table_header_bold ? 'bold' : 'normal',
                    marginBottom: '3px',
                    lineHeight: 1.3
                  }}
                >
                  <div>Item Name</div>
                  <div style={{ textAlign: 'right' }}>Qty</div>
                  <div style={{ textAlign: 'right' }}>Price</div>
                  <div style={{ textAlign: 'right' }}>Total</div>
                </div>

                {/* Sample Items */}
                <div style={{ fontSize: `${form.item_font_size}px` }}>
                  {sampleInvoice.items.map((item, idx) => (
                    <div 
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '48% 14% 18% 20%',
                        marginBottom: '3px',
                        lineHeight: 1.3,
                        fontWeight: form.item_bold ? 'bold' : 'normal'
                      }}
                    >
                      <div style={{ wordBreak: 'break-word', paddingRight: '2px' }}>{item.product_name}</div>
                      <div style={{ textAlign: 'right' }}>{item.qty}</div>
                      <div style={{ textAlign: 'right' }}>{item.sale_price.toFixed(2)}</div>
                      <div style={{ textAlign: 'right' }}>{item.total.toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                {/* Divider Line */}
                <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

                {/* Gross Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${form.total_font_size}px`, fontWeight: form.total_bold ? 'bold' : 'normal', margin: '2px 0' }}>
                  <span style={{ flex: 1, textAlign: 'center' }}>Gross Total:</span>
                  <span style={{ textAlign: 'right', minWidth: '85px' }}>525.99</span>
                </div>

                {/* Discount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${form.total_font_size}px`, fontWeight: form.total_bold ? 'bold' : 'normal', margin: '2px 0' }}>
                  <span style={{ flex: 1, textAlign: 'center' }}>Discount:</span>
                  <span style={{ textAlign: 'right', minWidth: '85px' }}>26.30</span>
                </div>

                {/* Divider Line */}
                <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

                {/* Net Total */}
                <div 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: `${form.net_total_font_size || 16}px`,
                    fontWeight: form.net_total_bold ? 'bold' : 'normal',
                    margin: '3px 0'
                  }}
                >
                  <span style={{ flex: 1, textAlign: 'center' }}>Net Total</span>
                  <span style={{ textAlign: 'right', minWidth: '90px' }}>499.69</span>
                </div>

                {/* Divider Line */}
                <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }}></div>

                {/* Footer Notice */}
                <div 
                  style={{
                    textAlign: 'center',
                    fontSize: `${form.footer_font_size}px`,
                    marginTop: '5px',
                    lineHeight: 1.35
                  }}
                >
                  {form.footer_terms ? (
                    <div style={{ whiteSpace: 'pre-line', fontWeight: form.footer_terms_bold ? 'bold' : 'normal' }}>
                      {form.footer_terms}
                    </div>
                  ) : null}
                  {form.thank_you_msg ? (
                    <div style={{ marginTop: '4px', fontWeight: form.thank_you_bold ? 'bold' : 'normal' }}>
                      {form.thank_you_msg}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="text-center mt-3">
              <p className="text-[11px] text-[#64748b]">
                Preview changes reflect immediately on physical thermal print.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actual Print Modal for Test Receipt */}
      {showTestPrint && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center invoice-modal-backdrop">
          <div className="bg-white rounded-lg shadow-2xl max-w-[420px] max-h-[90vh] overflow-auto invoice-modal-container">
            <InvoicePrint 
              invoice={sampleInvoice} 
              onClose={() => setShowTestPrint(false)} 
              autoPrint={true} 
              settings={form}
            />
          </div>
        </div>
      )}
    </div>
  )
}

