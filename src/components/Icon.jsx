/**
 * Icon Component - Replaces material-symbols-outlined with local SVG sprites
 * Works offline without Google Fonts dependency
 */

export default function Icon({ name, className = "", style = {} }) {
  return (
    <svg className={`icon ${className}`} style={style} aria-hidden="true">
      <use href={`/material-icons.svg#icon-${name}`} />
    </svg>
  )
}

// Usage:
// <Icon name="dashboard" className="text-[18px]" />
// Instead of:
// <span className="material-symbols-outlined text-[18px]">dashboard</span>
