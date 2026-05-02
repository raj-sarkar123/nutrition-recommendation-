import { useState } from 'react';

export default function NovaInput({ label, type = 'text', placeholder, value, onChange, icon, unit, error, name }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-2">
      {label && (
        <label className="font-label text-xs font-bold tracking-[0.1em] uppercase text-on-surface-variant ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-xl text-outline group-focus-within:text-primary transition-colors duration-300">
            {icon}
          </span>
        )}
        <input
          type={type === 'password' && showPassword ? 'text' : type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full bg-transparent border-0 border-b border-outline-variant/30 py-3 focus:ring-0 focus:border-primary transition-all duration-300 ease-out-expo placeholder:text-outline/50 font-medium text-on-surface outline-none ${icon ? 'pl-9' : 'pl-1'} ${unit ? 'pr-10' : ''}`}
        />
        {/* Focus animation line */}
        <div className="absolute bottom-0 left-0 h-0.5 bg-primary w-0 group-focus-within:w-full transition-all duration-500 ease-out-expo" />
        {unit && (
          <span className="absolute bottom-3 right-0 text-on-surface-variant font-medium group-focus-within:text-primary transition-colors">
            {unit}
          </span>
        )}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-outline/50 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        )}
      </div>
      {error && <p className="text-error text-xs mt-1 ml-1">{error}</p>}
    </div>
  );
}
