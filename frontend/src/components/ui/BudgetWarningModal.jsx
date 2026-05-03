export default function BudgetWarningModal({ foodName, overAmount, onConfirm, onCancel }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
        <div className="relative w-full max-w-md">

          {/* Glow background */}
          <div className="absolute -inset-1 bg-gradient-to-r from-error/30 via-transparent to-error/20 blur-2xl opacity-40" />

          {/* Card */}
          <div className="relative glass-panel rounded-[2rem] p-6 outline outline-1 outline-white/20 shadow-2xl">

            {/* Header */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-error text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  warning
                </span>
              </div>

              <div>
                <h3 className="text-xl font-headline font-bold text-on-surface leading-tight">
                  Budget Exceeded
                </h3>
                <p className="text-xs text-on-surface-variant font-medium">
                  You're about to cross your daily limit
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">

              {/* Info card */}
              <div className="rounded-2xl p-4 bg-white/40 backdrop-blur-sm border border-white/30">
                <p className="text-sm text-on-surface leading-relaxed">
                  Adding{" "}
                  <span className="font-bold">{foodName}</span>{" "}
                  will exceed your budget by{" "}
                  <span className="font-bold text-error">
                    {overAmount.toLocaleString()} kcal
                  </span>.
                </p>
              </div>

              {/* Highlight pill */}
              <div className="flex justify-center">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-error/10 border border-error/20">
                  <span className="material-symbols-outlined text-error text-base">
                    trending_up
                  </span>
                  <span className="text-error font-semibold text-sm">
                    +{overAmount.toLocaleString()} kcal
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">

                <button
                  onClick={onCancel}
                  className="py-3 rounded-xl bg-surface-container text-on-surface font-semibold text-sm hover:bg-white/60 active:scale-95 transition-all duration-200"
                >
                  Cancel
                </button>

                <button
                  onClick={onConfirm}
                  className="py-3 rounded-xl bg-error text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-error/30 hover:scale-[1.02] active:scale-95 transition-all duration-200"
                >
                  <span className="material-symbols-outlined text-base">
                  add_circle
                  </span>
                  Confirm
                </button>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}