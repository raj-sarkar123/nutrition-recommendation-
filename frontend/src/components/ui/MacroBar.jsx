export default function MacroBar({ label, current, target, color = 'bg-primary' }) {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className="bg-surface-container-lowest p-4 rounded-xl flex items-center gap-4 group hover:bg-surface-container-low transition-colors duration-300 border border-white/50">
      <div className={`w-1.5 h-10 ${color} rounded-full`} />
      <div className="flex-1">
        <div className="flex justify-between items-end mb-2">
          <span className="font-headline font-bold text-on-surface">{label}</span>
          <span className="font-label text-xs text-on-surface-variant font-medium">
            {current}g / {target}g
          </span>
        </div>
        <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
          <div
            className={`h-full ${color} rounded-full transition-all duration-1000`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
