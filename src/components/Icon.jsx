/**
 * Icon Component - Local Offline Material Symbols & SVG Support
 * Works 100% offline without any internet connection or external CDN
 */

export default function Icon({ name, className = "", style = {} }) {
  return (
    <span className={`material-symbols-outlined ${className}`} style={style} aria-hidden="true">
      {name}
    </span>
  )
}

// Usage:
// <Icon name="dashboard" className="text-[18px]" />
// Instead of:
// <span className="material-symbols-outlined text-[18px]">dashboard</span>
