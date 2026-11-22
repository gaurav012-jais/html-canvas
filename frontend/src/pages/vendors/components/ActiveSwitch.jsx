export function ActiveSwitch({ active, onToggle, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`
        relative inline-flex h-6 w-11 shrink-0 items-center rounded-full
        transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
        disabled:cursor-not-allowed disabled:opacity-50
        ${active ? 'bg-success' : 'bg-bg-canvas border border-border'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
          transition-transform duration-200
          ${active ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  )
}
