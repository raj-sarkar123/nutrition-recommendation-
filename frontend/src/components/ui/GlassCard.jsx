export default function GlassCard({ children, className = '', glow = false, onClick }) {
  return (
    <div
      className={`glass-panel rounded-[2rem] p-8 outline outline-1 outline-white/20 nova-shadow ${glow ? 'nova-glow' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
