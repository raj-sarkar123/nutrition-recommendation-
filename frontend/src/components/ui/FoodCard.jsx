export default function FoodCard({ food, onClick }) {
  const classStyles = {
    recommended: {
      badge: 'bg-primary-container/80 text-on-primary-container ring-1 ring-primary/10',
      badgeText: 'Safe',
      chevronHover: 'group-hover:text-primary',
    },
    moderate: {
      badge: 'bg-secondary-container/80 text-on-secondary-container ring-1 ring-secondary/10',
      badgeText: 'Moderate',
      chevronHover: 'group-hover:text-secondary',
    },
    avoid: {
      badge: 'bg-error-container/80 text-white ring-1 ring-error/10',
      badgeText: 'Avoid',
      chevronHover: 'group-hover:text-error',
    },
  };

  const style = classStyles[food.classification] || classStyles.moderate;

  return (
    <div
      onClick={onClick}
      className={`bg-white/60 backdrop-blur-xl p-4 rounded-2xl flex gap-4 items-center outline outline-1 outline-white/15 shadow-sm hover:shadow-md hover:bg-white/90 hover:-translate-y-0.5 transition-all duration-300 ease-out-expo group cursor-pointer ${food.classification === 'avoid' ? 'opacity-80' : ''}`}
    >
      <div className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-surface-container-high flex items-center justify-center ${food.classification === 'avoid' ? 'grayscale group-hover:grayscale-0' : ''} transition-all duration-500`}>
        {food.image_url ? (
          <img src={food.image_url} alt={food.food_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <span className="material-symbols-outlined text-2xl text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant</span>
        )}
      </div>
      <div className="flex-grow">
        <div className="flex justify-between items-start">
          <h4 className="font-headline font-bold text-on-surface text-sm">{food.food_name}</h4>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${style.badge}`}>
            {style.badgeText}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-primary">local_fire_department</span>
            <span className="text-xs text-on-surface-variant">{food.calories} kcal</span>
          </div>
          {food.tags && food.tags[0] && (
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-primary">bolt</span>
              <span className="text-xs text-on-surface-variant">{food.tags[0]}</span>
            </div>
          )}
        </div>
      </div>
      <span className={`material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform ${style.chevronHover}`}>
        chevron_right
      </span>
    </div>
  );
}
