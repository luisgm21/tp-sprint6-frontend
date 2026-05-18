const InputField = ({ id, label, type = 'text', value, onChange, placeholder, required = false, error }) => {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off'}
        className={[
          'rounded-md border px-3 py-2 text-sm text-zinc-900 outline-none transition-colors',
          'placeholder:text-zinc-400',
          'focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200',
          error ? 'border-red-400 bg-red-50' : 'border-zinc-300 bg-white',
        ].join(' ')}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default InputField
