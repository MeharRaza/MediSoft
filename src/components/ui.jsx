// Shared UI primitives

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#c3c6d5]">
      <div>
        <h2 className="text-[20px] font-bold text-[#003c90]" style={{ fontFamily: 'Hanken Grotesk' }}>{title}</h2>
        {subtitle && <p className="text-[12px] text-[#737784]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white border border-[#c3c6d5] rounded-lg shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function StatCard({ label, value, icon, color = 'blue', sub }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   text: 'text-[#003c90]',  icon: 'text-[#003c90]'  },
    green:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: 'text-green-600'  },
    red:    { bg: 'bg-red-50',    text: 'text-red-700',    icon: 'text-red-600'    },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: 'text-amber-600'  },
    teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   icon: 'text-teal-600'   },
  }
  const c = colors[color] || colors.blue
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-[#737784] uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-[26px] font-bold ${c.text}`} style={{ fontFamily: 'Hanken Grotesk' }}>{value}</p>
          {sub && <p className="text-[11px] text-[#737784] mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${c.bg}`}>
          <span className={`material-symbols-outlined text-[22px] ${c.icon}`}>{icon}</span>
        </div>
      </div>
    </Card>
  )
}

export function Btn({ children, onClick, variant = 'primary', size = 'md', className = '', type = 'button', disabled = false }) {
  const variants = {
    primary:   'bg-[#003c90] text-white hover:opacity-90',
    secondary: 'bg-[#006a6a] text-white hover:opacity-90',
    outline:   'border border-[#c3c6d5] text-[#434653] bg-white hover:bg-[#f2f4f6]',
    danger:    'bg-[#ba1a1a] text-white hover:opacity-90',
    ghost:     'text-[#434653] hover:bg-[#f2f4f6]',
  }
  const sizes = { sm: 'px-3 py-1.5 text-[11px]', md: 'px-4 py-2 text-[12px]', lg: 'px-6 py-2.5 text-[13px]' }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`font-semibold rounded flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  )
}

export function Input({ label, value, onChange, type = 'text', placeholder = '', required = false, className = '', readOnly = false, autoFocus = false }) {
  return (
    <div className={className}>
      {label && <label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        required={required} readOnly={readOnly} autoFocus={autoFocus}
        className="w-full px-3 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[13px] text-[#191c1e] focus:border-[#003c90] focus:bg-white transition-colors"
      />
    </div>
  )
}

export function Select({ label, value, onChange, options = [], required = false, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-[11px] font-semibold text-[#434653] mb-1 uppercase tracking-wide">{label}</label>}
      <select value={value} onChange={onChange} required={required}
        className="w-full px-3 py-1.5 border border-[#c3c6d5] rounded bg-[#f7f9fb] text-[13px] text-[#191c1e] focus:border-[#003c90] focus:bg-white transition-colors">
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

export function Badge({ label, type = 'neutral' }) {
  const cls = {
    success: 'badge-success', warning: 'badge-warning',
    error: 'badge-error', info: 'badge-info', neutral: 'badge-neutral',
  }
  return <span className={cls[type] || cls.neutral}>{label}</span>
}

export function Table({ columns, data, emptyMsg = 'No data found' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#f2f4f6] border-b border-[#c3c6d5]">
            {columns.map(col => (
              <th key={col.key} className={`px-3 py-2.5 text-[11px] font-bold text-[#434653] uppercase tracking-wider whitespace-nowrap ${col.right ? 'text-right' : ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eceef0]">
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-[13px] text-[#737784]">{emptyMsg}</td></tr>
          ) : data.map((row, i) => (
            <tr key={row.id || i} className="hover:bg-[#f7f9fb] transition-colors group">
              {columns.map(col => (
                <td key={col.key} className={`px-3 py-2 text-[12px] text-[#191c1e] ${col.right ? 'text-right font-mono' : ''} ${col.mono ? 'font-mono' : ''}`}>
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-2xl w-full ${width} mx-4 max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#c3c6d5]">
          <h3 className="text-[16px] font-bold text-[#003c90]" style={{ fontFamily: 'Hanken Grotesk' }}>{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#f2f4f6] rounded transition-colors">
            <span className="material-symbols-outlined text-[20px] text-[#737784]">close</span>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function SearchInput({ value, onChange, onKeyDown, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737784] text-[18px]">search</span>
      <input
        type="text" 
        value={value} 
        onChange={onChange} 
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 border border-[#c3c6d5] rounded-full bg-white text-[13px] focus:border-[#003c90] transition-colors"
      />
    </div>
  )
}

export function fmt(n) {
  if (n === null || n === undefined) return '0.00'
  return Number(n).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function today() {
  return new Date().toISOString().split('T')[0]
}
