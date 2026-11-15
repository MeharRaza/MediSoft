import React, { useEffect, useRef } from 'react'

export default function InAppAlert({ 
  open, 
  onClose, 
  title, 
  message, 
  type = 'warning', 
  actionLabel, 
  onAction,
  confirmLabel = 'OK (Enter)'
}) {
  const primaryBtnRef = useRef(null)

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        primaryBtnRef.current?.focus()
      }, 60)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose?.()
      } else if (e.key === 'Enter') {
        // If focused element is not already a button
        if (document.activeElement?.tagName !== 'BUTTON') {
          e.preventDefault()
          e.stopPropagation()
          if (onAction && actionLabel) {
            onAction()
          }
          onClose?.()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [open, onClose, onAction, actionLabel])

  if (!open) return null

  const isError = type === 'error'
  const isWarning = type === 'warning'
  const isInfo = type === 'info'

  const iconName = isError ? 'error' : isWarning ? 'warning' : 'info'
  const iconColor = isError ? 'text-red-600' : isWarning ? 'text-amber-500' : 'text-[#003c90]'
  const iconBg = isError ? 'bg-red-50 border-red-200' : isWarning ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
  const btnBg = isError 
    ? 'bg-red-600 hover:bg-red-700' 
    : isWarning 
      ? 'bg-amber-600 hover:bg-amber-700' 
      : 'bg-[#003c90] hover:bg-[#002d6e]'

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-[#c3c6d5] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl border ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
              <span className="material-symbols-outlined text-[28px]">{iconName}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-bold text-[#191c1e] mb-1.5" style={{ fontFamily: 'Hanken Grotesk' }}>
                {title || 'Notice'}
              </h3>
              <div className="text-[12px] text-[#434653] whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto">
                {message}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-[#f7f9fb] border-t border-[#eceef0] flex items-center justify-end gap-2.5">
          {actionLabel && onAction ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#c3c6d5] text-[#434653] hover:bg-[#eceef0] rounded-lg text-[12px] font-semibold transition-colors"
              >
                Cancel (Esc)
              </button>
              <button
                ref={primaryBtnRef}
                type="button"
                onClick={() => {
                  onAction()
                  onClose?.()
                }}
                className={`px-5 py-2 ${btnBg} text-white rounded-lg text-[12px] font-bold shadow-sm transition-colors flex items-center gap-1.5`}
              >
                <span className="material-symbols-outlined text-[16px]">auto_delete</span>
                {actionLabel}
              </button>
            </>
          ) : (
            <button
              ref={primaryBtnRef}
              type="button"
              onClick={onClose}
              className={`px-6 py-2 ${btnBg} text-white rounded-lg text-[12px] font-bold shadow-sm transition-colors`}
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

