import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, Select } from '../../components/ui'

const CURRENCIES = [{ value: 'PKR', label: 'PKR — Pakistani Rupee' }, { value: 'USD', label: 'USD — US Dollar' }, { value: 'AED', label: 'AED — UAE Dirham' }]
const isElectron = typeof window !== 'undefined' && window.api

export default function CompanySettings() {
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', ntn: '', currency: 'PKR', tax_rate: 0 })
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg]           = useState(null)
  const [version, setVersion]   = useState('')
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [backupInfo, setBackupInfo] = useState(null)
  const [backupLoading, setBackupLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  useEffect(() => {
    api.settings.getCompanyInfo().then(d => {
      if (d) setForm({ name: d.name||'', address: d.address||'', phone: d.phone||'', email: d.email||'', ntn: d.ntn||'', currency: d.currency||'PKR', tax_rate: d.tax_rate||0 })
      setLoading(false)
    })
    // Get app version
    if (isElectron && window.api?.updater) {
      window.api.updater.getVersion().then(v => setVersion(v?.current || ''))
    }
    // Get backup info
    if (isElectron && window.api?.settings?.getBackupInfo) {
      window.api.settings.getBackupInfo().then(info => setBackupInfo(info))
    }
  }, [])

  const checkUpdate = async () => {
    if (!isElectron || !window.api?.updater) return setMsg({ type: 'info', text: 'Update check only works in installed app.' })
    setCheckingUpdate(true)
    await window.api.updater.check()
    setTimeout(() => setCheckingUpdate(false), 3000)
    setMsg({ type: 'info', text: 'Checking for updates...' })
  }

  const createBackup = async () => {
    if (!isElectron || !window.api?.settings?.createManualBackup) {
      return setMsg({ type: 'error', text: 'Backup feature only works in installed app.' })
    }
    setBackupLoading(true)
    setMsg(null)
    try {
      const result = await window.api.settings.createManualBackup()
      if (result.success) {
        setMsg({ type: 'success', text: result.message })
      } else {
        setMsg({ type: 'info', text: result.message })
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setBackupLoading(false)
    }
  }

  const restoreBackup = async () => {
    if (!isElectron || !window.api?.settings?.restoreBackup) {
      return setMsg({ type: 'error', text: 'Restore feature only works in installed app.' })
    }
    if (!confirm('⚠️ WARNING: This will replace your current database.\n\nMake sure you have selected the correct backup file.\n\nContinue?')) {
      return
    }
    setBackupLoading(true)
    setMsg(null)
    try {
      const result = await window.api.settings.restoreBackup()
      if (result.success) {
        setMsg({ type: 'success', text: result.message })
        if (result.needsRestart) {
          setTimeout(() => {
            alert('Please close and restart the application now.')
          }, 2000)
        }
      } else {
        setMsg({ type: 'info', text: result.message })
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setBackupLoading(false)
    }
  }

  const openBackupFolder = async () => {
    if (isElectron && window.api?.settings?.openBackupFolder) {
      await window.api.settings.openBackupFolder()
    }
  }

  const fixStockData = async () => {
    if (!isElectron || !window.api?.inventory?.syncQtySold) {
      return setMsg({ type: 'error', text: 'Fix Stock feature only works in installed app.' })
    }
    
    const confirmed = window.confirm(
      '⚠️ Stock Data Fix\n\n' +
      'This will:\n' +
      '1. Fix return items with missing batch links\n' +
      '2. Recalculate qty_sold for ALL batches from actual sales\n\n' +
      'Result: All stock values will be accurate.\n\n' +
      'Continue?'
    )
    
    if (!confirmed) return
    
    setSyncing(true)
    setMsg(null)
    setSyncResult(null)
    
    try {
      const result = await window.api.inventory.syncQtySold({ dryRun: false })
      setSyncResult(result)
      setMsg({ 
        type: 'success', 
        text: `✅ Stock fix complete!\n\nBatches updated: ${result.needsUpdate}\nNULL returns fixed: ${result.nullReturnsFixes}\nProducts corrected: ${result.productsAffected}`
      })
    } catch (err) {
      setMsg({ type: 'error', text: `Failed: ${err.message}` })
    } finally {
      setSyncing(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true); setMsg(null)
    try {
      await api.settings.saveCompanyInfo({ ...form, tax_rate: parseFloat(form.tax_rate)||0 })
      setMsg({ type: 'success', text: 'Company information saved.' })
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-[#003c90]/20 border-t-[#003c90] rounded-full animate-spin" /></div>

  const setF = (field, val) => setForm(f => ({ ...f, [field]: val }))

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Company Settings" subtitle="Configure your pharmacy details" />
      <div className="p-5 flex-1 overflow-auto">
        {msg && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold mb-4 whitespace-pre-line ${msg.type === 'error' ? 'bg-red-50 text-[#ba1a1a] border border-red-200' : msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}><span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : msg.type === 'success' ? 'check_circle' : 'info'}</span>{msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><span className="material-symbols-outlined text-[16px]">close</span></button></div>}
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card className="p-6 max-w-2xl col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-xl bg-[#003c90] flex items-center justify-center"><span className="material-symbols-outlined text-white text-[32px]">local_pharmacy</span></div>
              <div>
                <h3 className="text-[16px] font-bold text-[#191c1e]">{form.name||'Your Pharmacy'}</h3>
                <p className="text-[12px] text-[#737784]">MediSoft Pro — Pharmacy Management System</p>
                {version && <p className="text-[11px] text-[#003c90] font-semibold">Version {version}</p>}
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Company / Pharmacy Name *" value={form.name} onChange={e => setF('name', e.target.value)} required />
              <Input label="Address" value={form.address} onChange={e => setF('address', e.target.value)} placeholder="Street, City, Province" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone" type="tel" value={form.phone} onChange={e => setF('phone', e.target.value)} />
                <Input label="Email" type="email" value={form.email} onChange={e => setF('email', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="NTN / Tax Number" value={form.ntn} onChange={e => setF('ntn', e.target.value)} />
                <Select label="Currency" value={form.currency} onChange={e => setF('currency', e.target.value)} options={CURRENCIES} />
              </div>
              <div><label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">Default Tax Rate (%)</label><input type="number" min="0" max="100" step="0.1" value={form.tax_rate} onChange={e => setF('tax_rate', e.target.value)} className="w-32 px-3 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[13px] focus:border-[#003c90]" /></div>
              <div className="pt-4 border-t border-[#c3c6d5] flex items-center justify-between">
                <Btn type="submit" variant="primary" size="lg" disabled={submitting}>{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}<span className="material-symbols-outlined text-[18px]">save</span>Save Settings</Btn>
                <Btn type="button" variant="outline" size="lg" onClick={checkUpdate} disabled={checkingUpdate}>
                  {checkingUpdate ? <span className="w-4 h-4 border-2 border-[#003c90]/30 border-t-[#003c90] rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">system_update</span>}
                  Check for Updates
                </Btn>
              </div>
            </form>
          </Card>

          {/* Backup & Restore Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[#003c90] text-[24px]">backup</span>
              <h3 className="text-[15px] font-bold text-[#191c1e]">Backup & Restore</h3>
            </div>
            <p className="text-[12px] text-[#737784] mb-4">Protect your data with manual backups. Save to USB, external drive, or cloud.</p>
            
            {backupInfo && (
              <div className="space-y-2 mb-4 p-3 bg-[#f7f9fb] rounded border border-[#c3c6d5]">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#737784]">Database Size:</span>
                  <span className="font-semibold text-[#191c1e]">{(backupInfo.databaseSize / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#737784]">Auto Backups:</span>
                  <span className="font-semibold text-[#191c1e]">{backupInfo.autoBackupCount} files</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Btn 
                type="button" 
                variant="primary" 
                size="md" 
                fullWidth 
                onClick={createBackup}
                disabled={backupLoading}
              >
                {backupLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[16px]">save</span>
                )}
                Create Backup
              </Btn>

              <Btn 
                type="button" 
                variant="outline" 
                size="md" 
                fullWidth 
                onClick={restoreBackup}
                disabled={backupLoading}
              >
                <span className="material-symbols-outlined text-[16px]">restore</span>
                Restore from Backup
              </Btn>

              <Btn 
                type="button" 
                variant="outline" 
                size="md" 
                fullWidth 
                onClick={openBackupFolder}
              >
                <span className="material-symbols-outlined text-[16px]">folder_open</span>
                Open Backup Folder
              </Btn>
              
              <div className="mt-4 pt-4 border-t border-[#e5e7eb]">
                <Btn 
                  type="button" 
                  variant="danger" 
                  size="md" 
                  fullWidth 
                  onClick={fixStockData}
                  disabled={syncing}
                >
                  {syncing ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">sync</span>
                  )}
                  Fix Stock Data
                </Btn>
                
                {syncResult && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-[10px] text-green-800">
                    <div>✅ Synced: {syncResult.total} batches</div>
                    <div>🔧 Fixed: {syncResult.needsUpdate} drifts</div>
                    <div>⚠️ Oversold: {syncResult.oversold} batches</div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex gap-2">
                <span className="material-symbols-outlined text-yellow-700 text-[16px]">info</span>
                <div className="text-[10px] text-yellow-800">
                  <p className="font-semibold mb-1">Important:</p>
                  <p>• Automatic backups (last 10) are saved on app startup</p>
                  <p>• Manual backups let you save to external locations</p>
                  <p>• Keep backups on USB or cloud for safety</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
