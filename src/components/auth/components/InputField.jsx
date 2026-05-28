import { useState } from 'react'

const EyeIcon = ({ crossed = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
    <circle cx="12" cy="12" r="3" />
    {crossed && <path d="M4 4l16 16" />}
  </svg>
)

const InputField = ({ id, label, type = 'text', name, value, onChange, placeholder, required = false, error, disabled = false, autoComplete }) => {
  const isPasswordField = type === 'password'
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isPasswordHovered, setIsPasswordHovered] = useState(false)

  const resolvedType = isPasswordField && (isPasswordVisible || isPasswordHovered) ? 'text' : type
  const resolvedAutoComplete = autoComplete || (type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off')

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name || id}
          type={resolvedType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={resolvedAutoComplete}
          className={[
            'w-full rounded-md border px-3 py-2 text-sm text-zinc-900 outline-none transition-colors',
            'placeholder:text-zinc-400',
            'focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200',
            isPasswordField ? 'pr-10' : '',
            error ? 'border-red-400 bg-red-50' : 'border-zinc-300 bg-white',
            disabled ? 'cursor-not-allowed opacity-60' : '',
          ].join(' ')}
        />

        {isPasswordField && (
          <button
            type="button"
            aria-label={isPasswordVisible || isPasswordHovered ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={isPasswordVisible}
            onClick={() => setIsPasswordVisible((current) => !current)}
            onMouseEnter={() => setIsPasswordHovered(true)}
            onMouseLeave={() => setIsPasswordHovered(false)}
            onMouseDown={(event) => event.preventDefault()}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-800"
            disabled={disabled}
          >
            <EyeIcon crossed={!(isPasswordVisible || isPasswordHovered)} />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default InputField
