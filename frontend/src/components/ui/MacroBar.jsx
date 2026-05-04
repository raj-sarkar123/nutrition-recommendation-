export default function MacroBar({ label, current, target, color = 'bg-primary' }) {
  const isOver = current > target;
  const percentage = Math.min((current / target) * 100, 100);
  const displayCurrent = Math.round(current);
  const displayTarget = Math.round(target);

  const activeColor = isOver ? 'bg-error' : color;
  const containerStyle = isOver
    ? 'bg-error/5 border-error/20'
    : 'bg-surface-container-lowest border-white/50 hover:bg-surface-container-low';

  return (
    <div className={`p-4 rounded-xl flex items-center gap-4 group transition-colors duration-300 border ${containerStyle}`}>
      <div className={`w-1.5 h-10 ${activeColor} rounded-full`} />
      <div className="flex-1">
        <div className="flex justify-between items-end mb-2">
          <span className={`font-headline font-bold ${isOver ? 'text-error' : 'text-on-surface'}`}>{label}</span>
          <span className={`font-label text-xs font-medium ${isOver ? 'text-error' : 'text-on-surface-variant'}`}>
            {isOver ? `+${displayCurrent - displayTarget}g over` : `${displayCurrent}g / ${displayTarget}g`}
          </span>
        </div>
        <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
          <div
            className={`h-full ${activeColor} rounded-full transition-all duration-1000`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
