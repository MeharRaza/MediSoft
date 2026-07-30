import { useState, useEffect } from 'react'

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or Ctrl+/ to toggle shortcuts help
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === '/')) {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-12 h-12 bg-[#003c90] text-white rounded-full shadow-lg hover:bg-[#002a6b] flex items-center justify-center transition-all z-50"
        title="Keyboard Shortcuts (Ctrl+K)"
      >
        <span className="material-symbols-outlined text-[20px]">keyboard</span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-[#003c90] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[32px]">keyboard</span>
            <div>
              <h2 className="text-[20px] font-bold">Keyboard Shortcuts</h2>
              <p className="text-[12px] text-white/80">Fast navigation & control</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded transition">
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* General */}
          <Section title="General" icon="settings">
            <Shortcut keys={['Ctrl', 'K']} description="Toggle this shortcuts help" />
            <Shortcut keys={['Esc']} description="Close dialogs/modals" />
          </Section>

          {/* Sidebar Navigation - PRIMARY METHOD */}
          <Section title="Alt-Based Navigation (PRIMARY)" icon="rocket_launch">
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-[12px] font-bold text-green-900 mb-1">How It Works:</p>
              <p className="text-[11px] text-green-800">
                Press <kbd className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono">Alt</kbd> → Sidebar activates → 
                Press letter for menu (D/S/P/I/A/H/R/T) → Press letter for page
              </p>
            </div>
            
            <Shortcut keys={['Alt']} description="Activate sidebar navigation (yellow highlight)" color="green" />
            <Shortcut keys={['Esc']} description="Exit sidebar navigation" color="orange" />
            
            <div className="mt-3 space-y-2">
              <p className="text-[11px] font-bold text-[#003c90]">Main Menu Letters:</p>
              <Shortcut keys={['D']} description="Dashboard" />
              <Shortcut keys={['S']} description="Sales menu" color="green" />
              <Shortcut keys={['P']} description="Purchase menu" color="blue" />
              <Shortcut keys={['I']} description="Inventory menu" color="purple" />
              <Shortcut keys={['A']} description="Accounts menu" color="orange" />
              <Shortcut keys={['H']} description="HRM menu" color="teal" />
              <Shortcut keys={['R']} description="Reports menu" />
              <Shortcut keys={['T']} description="Settings menu" />
            </div>
          </Section>

          {/* Sub-menu shortcuts */}
          <Section title="Sub-Menu Letters (after opening menu)" icon="keyboard_command_key">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#003c90] mb-2">SALES (Alt → S → ...)</p>
                <Shortcut keys={['F']} description="Fast Billing" color="green" />
                <Shortcut keys={['H']} description="History" />
                <Shortcut keys={['R']} description="Return" />
                <Shortcut keys={['Q']} description="Quotations" />
                <Shortcut keys={['C']} description="Customers" />
                
                <p className="text-[11px] font-bold text-[#003c90] mb-2 mt-3">PURCHASE (Alt → P → ...)</p>
                <Shortcut keys={['E']} description="Entry" color="orange" />
                <Shortcut keys={['H']} description="History" />
                <Shortcut keys={['R']} description="Return" />
                <Shortcut keys={['S']} description="Suppliers" />
                <Shortcut keys={['O']} description="Orders" />
                
                <p className="text-[11px] font-bold text-[#003c90] mb-2 mt-3">INVENTORY (Alt → I → ...)</p>
                <Shortcut keys={['P']} description="Products" color="blue" />
                <Shortcut keys={['A']} description="Adjustment" />
                <Shortcut keys={['T']} description="Transfer" />
                <Shortcut keys={['B']} description="Batches" />
              </div>
              
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#003c90] mb-2">ACCOUNTS (Alt → A → ...)</p>
                <Shortcut keys={['O']} description="Overview" />
                <Shortcut keys={['V']} description="Vouchers" />
                <Shortcut keys={['L']} description="Ledger" />
                <Shortcut keys={['R']} description="Recovery" />
                
                <p className="text-[11px] font-bold text-[#003c90] mb-2 mt-3">HRM (Alt → H → ...)</p>
                <Shortcut keys={['E']} description="Employees" />
                <Shortcut keys={['P']} description="Payroll" />
                <Shortcut keys={['L']} description="Leaves" />
                
                <p className="text-[11px] font-bold text-[#003c90] mb-2 mt-3">REPORTS (Alt → R → ...)</p>
                <Shortcut keys={['S']} description="Sales Report" />
                <Shortcut keys={['P']} description="Purchase Report" />
                <Shortcut keys={['T']} description="Stock Report" />
                <Shortcut keys={['L']} description="Profit & Loss" />
                <Shortcut keys={['E']} description="Expiry Report" />
                
                <p className="text-[11px] font-bold text-[#003c90] mb-2 mt-3">SETTINGS (Alt → T → ...)</p>
                <Shortcut keys={['C']} description="Company" />
                <Shortcut keys={['U']} description="Users" />
                <Shortcut keys={['B']} description="Branches" />
              </div>
            </div>
          </Section>

          {/* Arrow Keys in Sidebar */}
          <Section title="Arrow Keys (when sidebar active)" icon="menu">
            <Shortcut keys={['↓']} description="Move down in menu" />
            <Shortcut keys={['↑']} description="Move up in menu" />
            <Shortcut keys={['→']} description="Expand parent menu" />
            <Shortcut keys={['←']} description="Collapse parent menu" />
            <Shortcut keys={['Enter']} description="Select menu item" color="green" />
          </Section>

          {/* Fast Billing Shortcuts */}
          <Section title="Fast Billing Shortcuts" icon="point_of_sale">
            <Shortcut keys={['Ctrl', 'S']} description="Save Bill" color="green" />
            <Shortcut keys={['Ctrl', 'P']} description="Toggle Payment Method (Cash/Credit)" />
            <Shortcut keys={['Ctrl', 'F']} description="Focus Flat Discount" />
            <Shortcut keys={['Ctrl', 'T']} description="Focus Percent Discount" />
            <Shortcut keys={['Ctrl', '←']} description="Previous Held Bill" />
            <Shortcut keys={['Ctrl', '→']} description="Next Held Bill" />
          </Section>

          {/* Form Controls */}
          <Section title="Form Controls" icon="edit_note">
            <Shortcut keys={['Tab']} description="Next field" />
            <Shortcut keys={['Shift', 'Tab']} description="Previous field" />
            <Shortcut keys={['Enter']} description="Submit form / Select item" />
            <Shortcut keys={['Ctrl', 'Enter']} description="Quick save (in forms)" />
          </Section>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-blue-600 text-[24px]">lightbulb</span>
              <div>
                <h4 className="text-[13px] font-bold text-blue-900 mb-1">Pro Tips:</h4>
                <ul className="text-[12px] text-blue-800 space-y-1">
                  <li>• <strong>Alt key</strong> = Start navigation, then use letters for menu & pages</li>
                  <li>• <strong>Example:</strong> Alt → S (Sales) → F (Fast Billing) = Opens Fast Billing</li>
                  <li>• <strong>Arrow keys</strong> work when sidebar is active (yellow highlight)</li>
                  <li>• <strong>Enter key</strong> for table navigation instead of Tab in forms</li>
                  <li>• Press <kbd className="px-1.5 py-0.5 bg-blue-200 rounded text-[11px] font-mono">Ctrl+K</kbd> anytime to see this help</li>
                  <li>• Hand-friendly navigation - no stretching for F-keys!</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[#003c90] text-[20px]">{icon}</span>
        <h3 className="text-[15px] font-bold text-[#191c1e]">{title}</h3>
      </div>
      <div className="space-y-2 pl-7">
        {children}
      </div>
    </div>
  )
}

function Shortcut({ keys, description, color = 'gray' }) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-700 border-gray-300',
    green: 'bg-green-50 text-green-700 border-green-300',
    blue: 'bg-blue-50 text-blue-700 border-blue-300',
    purple: 'bg-purple-50 text-purple-700 border-purple-300',
    orange: 'bg-orange-50 text-orange-700 border-orange-300',
    teal: 'bg-teal-50 text-teal-700 border-teal-300',
  }

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        {keys.map((key, i) => (
          <span key={i} className="flex items-center gap-1">
            <kbd className={`px-2 py-1 rounded border text-[11px] font-mono font-semibold ${colorClasses[color]}`}>
              {key}
            </kbd>
            {i < keys.length - 1 && <span className="text-[#737784] text-[11px]">+</span>}
          </span>
        ))}
      </div>
      <span className="text-[12px] text-[#434653]">{description}</span>
    </div>
  )
}
