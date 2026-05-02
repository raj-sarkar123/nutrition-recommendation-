export default function NovaButton({ children, onClick, type = 'button', variant = 'primary', className = '', disabled = false, loading = false }) {
  const base = 'w-full py-5 rounded-2xl font-headline font-bold text-lg tracking-tight flex items-center justify-center gap-2 transition-all duration-300 ease-out-expo active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-primary text-on-primary shadow-[0_0_20px_rgba(0,105,75,0.3)] hover:shadow-[0_0_30px_rgba(0,105,75,0.5)] hover:scale-[1.02]',
    secondary: 'glass-panel outline outline-1 outline-outline-variant/20 text-on-surface hover:bg-white',
    error: 'bg-error-container text-on-error-container shadow-[0_4px_24px_rgba(179,27,37,0.1)] hover:scale-[1.02]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <>
          <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
          Processing...
        </>
      ) : children}
    </button>
  );
}
