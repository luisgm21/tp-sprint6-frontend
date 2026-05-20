const SIZE_MAP = {
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-8 w-8 border-[3px]',
}

const TONE_MAP = {
  dark: 'border-zinc-300 border-t-zinc-800',
  light: 'border-zinc-300/40 border-t-white',
}

const LoadingSpinner = ({
  text,
  size = 'md',
  tone = 'dark',
  inline = false,
  className = '',
}) => {
  const containerClass = inline
    ? 'inline-flex items-center gap-2'
    : 'flex items-center justify-center gap-3'

  return (
    <div className={`${containerClass} ${className}`} role="status" aria-live="polite">
      <span
        className={`shrink-0 animate-spin rounded-full border-solid ${SIZE_MAP[size] || SIZE_MAP.md} ${TONE_MAP[tone] || TONE_MAP.dark}`}
        aria-hidden="true"
      />
      {text && <span className="text-sm font-medium">{text}</span>}
    </div>
  )
}

export default LoadingSpinner
