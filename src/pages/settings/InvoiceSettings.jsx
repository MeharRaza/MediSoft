import React, { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input } from '../../components/ui'

export default function InvoiceSettings() {
  const [form, setForm] = useState({
    store_name: 'Harmain Medical Store',
    tagline: '',
    address: 'Opposite Nadra Kiosk Main Bazar Raiwind',
    phone: '03228684603',
    paper_width: '80mm',
    header_font_size: 16,
    address_font_size: 11,
    meta_font_size: 10.5,
    item_font_size: 11,
    total_font_size: 11,
    footer_font_size: 9.5,
    footer_terms: 'LOOSE ITEMS, VACCINES, INHALERS AND\nFRIDGE ITEMS WILL NOT BE RETURNED.',
    thank_you_msg: 'Thank You For Your Visit!',
    show_discount_col: 1,
    show_customer_name: 1
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    api.settings.getInvoiceSettings().then(s => {
      if (s) {
        setForm(prev => ({
          ...prev,
          ...s,
          header_font_size: Number(s.header_font_size) || 16,
          address_font_size: Number(s.address_font_size) || 11,
          meta_font_size: Number(s.meta_font_size) || 10.5,
          item_font_size: Number(s.item_font_size) || 11,
          total_font_size: Number(s.total_font_size) || 11,
          footer_font_size: Number(s.footer_font_size) || 9.5,
          show_discount_col: s.show_discount_col ?? 1,
          show_customer_name: s.show_customer_name ?? 1
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
    setForm(prev => ({ ...prev, [field]: val }))
    setMsg(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
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
    setForm({
      store_name: 'Harmain Medical Store',
      tagline: '',
      address: 'Opposite Nadra Kiosk Main Bazar Raiwind',
      phone: '03228684603',
      paper_width: '80mm',
      header_font_size: 16,
      address_font_size: 11,
      meta_font_size: 10.5,
      item_font_size: 11,
      total_font_size: 11,
      footer_font_size: 9.5,
      footer_terms: 'LOOSE ITEMS, VACCINES, INHALERS AND\nFRIDGE ITEMS WILL NOT BE RETURNED.',
      thank_you_msg: 'Thank You For Your Visit!',
      show_discount_col: 1,
      show_customer_name: 1
    })
    setMsg({ type: 'info', text: 'Reset to defaults. Click "Save Settings" to apply.' })
  }

  const handleTestPrint = () => {
    window.print()
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
                  <label className="block text-[12px] font-bold text-[#334155] mb-1">
                    Store / Pharmacy Name <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    value={form.store_name}
                    onChange={e => handleChange('store_name', e.target.value)}
                    placeholder="e.g. Harmain Medical Store"
                    className="font-semibold text-[#003c90]"
                  />
                  <p className="text-[11px] text-[#64748b] mt-1">This is printed at the very top of each customer receipt.</p>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1">
                    Sub-title / Tagline <span className="text-[11px] font-normal text-gray-500">(Optional)</span>
                  </label>
                  <Input 
                    value={form.tagline}
                    onChange={e => handleChange('tagline', e.target.value)}
                    placeholder="e.g. Wholesale & Retail Chemist"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1">
                    Store Address
                  </label>
                  <Input 
                    value={form.address}
                    onChange={e => handleChange('address', e.target.value)}
                    placeholder="e.g. Opposite Nadra Kiosk Main Bazar Raiwind"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1">
                    Phone / Contact Number
                  </label>
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

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-[#334155]">
                    <input 
                      type="checkbox"
                      checked={!!form.show_discount_col}
                      onChange={e => handleChange('show_discount_col', e.target.checked ? 1 : 0)}
                      className="w-4 h-4 text-[#003c90] rounded border-gray-300 focus:ring-[#003c90]"
                    />
                    <span>Show separate "Disc" (Discount) column in items list</span>
                  </label>
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
                    <span className="text-[12px] font-mono font-bold text-[#003c90] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {form.header_font_size} px
                    </span>
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
                    <span className="text-[12px] font-mono font-bold text-[#003c90] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {form.address_font_size} px
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="14" 
                    step="1"
                    value={form.address_font_size}
                    onChange={e => handleChange('address_font_size', Number(e.target.value))}
                    className="w-full accent-[#003c90] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>10px</span>
                    <span>12px (Standard)</span>
                    <span>14px</span>
                  </div>
                </div>

                {/* Items Table Font Size */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[12px] font-bold text-[#334155]">Medicines & Items Table Size</label>
                    <span className="text-[12px] font-mono font-bold text-[#003c90] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {form.item_font_size} px
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="9" 
                    max="13" 
                    step="1"
                    value={form.item_font_size}
                    onChange={e => handleChange('item_font_size', Number(e.target.value))}
                    className="w-full accent-[#003c90] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>9px (Dense)</span>
                    <span>11px (Clear)</span>
                    <span>13px (Spacious)</span>
                  </div>
                </div>

                {/* Totals Font Size */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[12px] font-bold text-[#334155]">Gross & Net Total Size</label>
                    <span className="text-[12px] font-mono font-bold text-[#003c90] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {form.total_font_size} px
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="11" 
                    max="16" 
                    step="1"
                    value={form.total_font_size}
                    onChange={e => handleChange('total_font_size', Number(e.target.value))}
                    className="w-full accent-[#003c90] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>11px</span>
                    <span>13px (Default)</span>
                    <span>16px (Prominent)</span>
                  </div>
                </div>

                {/* Footer Notice Font Size */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[12px] font-bold text-[#334155]">Footer Notice / Policy Size</label>
                    <span className="text-[12px] font-mono font-bold text-[#003c90] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {form.footer_font_size} px
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="8" 
                    max="12" 
                    step="1"
                    value={form.footer_font_size}
                    onChange={e => handleChange('footer_font_size', Number(e.target.value))}
                    className="w-full accent-[#003c90] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>8px</span>
                    <span>10px (Standard)</span>
                    <span>12px</span>
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
                  <label className="block text-[12px] font-bold text-[#334155] mb-1">
                    Return Policy / Notice
                  </label>
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
                  <label className="block text-[12px] font-bold text-[#334155] mb-1">
                    Thank You Message
                  </label>
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
                Live 85mm Thermal Slip Preview
              </span>
              <span className="text-[11px] text-slate-300 font-mono">
                {form.paper_width}
              </span>
            </div>

            {/* Realistic Thermal Paper Slip */}
            <div className="bg-[#e2e8f0] p-4 rounded-b-xl shadow-inner flex justify-center overflow-x-auto">
              <div 
                id="thermal-receipt"
                style={{
                  width: '72mm',
                  maxWidth: '100%',
                  background: '#ffffff',
                  color: '#000000',
                  padding: '2mm 4mm',
                  boxSizing: 'border-box',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  borderRadius: '2px',
                  lineHeight: 1.4
                }}
              >
                {/* Header Title */}
                <div 
                  style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    letterSpacing: '0.2px',
                    wordBreak: 'break-word'
                  }}
                >
                  {form.store_name || 'Harmain Medical Store'}
                </div>

                {/* Address */}
                <div 
                  style={{
                    textAlign: 'center',
                    fontSize: '13px',
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
                    fontSize: '13px',
                    marginTop: '2px'
                  }}
                >
                  Phone #: {form.phone || '03228684603'}
                </div>

                {/* Divider Line */}
                <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

                {/* Invoice Meta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span>No. INV-15666</span>
                  <span>14/11/2026 13:16</span>
                </div>
                <div style={{ fontSize: '11px' }}>
                  M/a: Walk-in Customer
                </div>

                {/* Divider Line */}
                <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

                {/* Table Header */}
                <div 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '45% 15% 20% 20%',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    marginBottom: '3px'
                  }}
                >
                  <div>Item Name</div>
                  <div style={{ textAlign: 'right' }}>Qty</div>
                  <div style={{ textAlign: 'right' }}>Price</div>
                  <div style={{ textAlign: 'right' }}>Total</div>
                </div>

                {/* Sample Items (matching user receipt photo!) */}
                <div style={{ fontSize: '11px' }}>
                  {/* Item 1 */}
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '45% 15% 20% 20%',
                      marginBottom: '3px'
                    }}
                  >
                    <div style={{ wordBreak: 'break-word', paddingRight: '2px' }}>OMEGA 20MG CAP</div>
                    <div style={{ textAlign: 'right' }}>3</div>
                    <div style={{ textAlign: 'right' }}>27.86</div>
                    <div style={{ textAlign: 'right' }}>83.57</div>
                  </div>

                  {/* Item 2 */}
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '45% 15% 20% 20%',
                      marginBottom: '3px'
                    }}
                  >
                    <div style={{ wordBreak: 'break-word', paddingRight: '2px' }}>KESTINE 10MG TAB</div>
                    <div style={{ textAlign: 'right' }}>3</div>
                    <div style={{ textAlign: 'right' }}>21.24</div>
                    <div style={{ textAlign: 'right' }}>63.71</div>
                  </div>

                  {/* Item 3 */}
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '45% 15% 20% 20%',
                      marginBottom: '3px'
                    }}
                  >
                    <div style={{ wordBreak: 'break-word', paddingRight: '2px' }}>MYTEKA 10MG TAB</div>
                    <div style={{ textAlign: 'right' }}>3</div>
                    <div style={{ textAlign: 'right' }}>39.57</div>
                    <div style={{ textAlign: 'right' }}>118.71</div>
                  </div>

                  {/* Item 4 */}
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '45% 15% 20% 20%',
                      marginBottom: '3px'
                    }}
                  >
                    <div style={{ wordBreak: 'break-word', paddingRight: '2px' }}>DR KOFF CANDY(RS#10)</div>
                    <div style={{ textAlign: 'right' }}>10</div>
                    <div style={{ textAlign: 'right' }}>10.00</div>
                    <div style={{ textAlign: 'right' }}>100.00</div>
                  </div>

                  {/* Item 5 */}
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '45% 15% 20% 20%',
                      marginBottom: '3px'
                    }}
                  >
                    <div style={{ wordBreak: 'break-word', paddingRight: '2px' }}>GOURMET 1.5 LTR (LEMON)</div>
                    <div style={{ textAlign: 'right' }}>1</div>
                    <div style={{ textAlign: 'right' }}>160.00</div>
                    <div style={{ textAlign: 'right' }}>160.00</div>
                  </div>
                </div>

                {/* Divider Line */}
                <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

                {/* Gross Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ flex: 1, textAlign: 'center' }}>Gross Total:</span>
                  <span style={{ textAlign: 'right', minWidth: '80px' }}>525.99</span>
                </div>

                {/* Discount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ flex: 1, textAlign: 'center' }}>Discount:</span>
                  <span style={{ textAlign: 'right', minWidth: '80px' }}>26.30</span>
                </div>

                {/* Divider Line */}
                <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

                {/* Net Total */}
                <div 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}
                >
                  <span style={{ flex: 1, textAlign: 'center' }}>Net Total</span>
                  <span style={{ textAlign: 'right', minWidth: '80px' }}>499.69</span>
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
                    <div style={{ whiteSpace: 'pre-line' }}>{form.footer_terms}</div>
                  ) : null}
                  {form.thank_you_msg ? (
                    <div style={{ marginTop: '4px', fontWeight: 'bold' }}>{form.thank_you_msg}</div>
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
    </div>
  )
}

