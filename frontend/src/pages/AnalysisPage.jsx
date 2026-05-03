import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useScan } from "../context/ScanContext";
import BudgetWarningModal from "../components/ui/BudgetWarningModal";

// ── Classification colour helpers ─────────────────────────────────────────────
const classColors = {
  recommended: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-700", badge: "bg-emerald-500 text-white" },
  moderate:    { bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-700",   badge: "bg-amber-500 text-white" },
  avoid:       { bg: "bg-red-500/10",     border: "border-red-500/30",     text: "text-red-700",     badge: "bg-red-500 text-white" },
};

const ScoreBar = ({ score }) => {
  const color = score >= 70 ? "bg-emerald-500" : score >= 45 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-bold text-on-surface-variant w-6 text-right">{score}</span>
    </div>
  );
};

// ── FoodItem card ─────────────────────────────────────────────────────────────
function FoodItemCard({ item, onAddToTracker, adding }) {
  const c = classColors[item.classification] || classColors.moderate;

  return (
    <div className={`relative rounded-2xl border p-4 ${c.bg} ${c.border} transition-all duration-300 hover:scale-[1.01]`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-headline font-bold text-on-surface truncate">{item.food_name}</h3>
          {item.description && (
            <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed line-clamp-2">{item.description}</p>
          )}
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.badge}`}>
          {item.classification}
        </span>
      </div>

      <ScoreBar score={item.score || 0} />

      <div className="mt-3 grid grid-cols-4 gap-1 text-center">
        {[
          { label: "kcal",    value: item.calories },
          { label: "Protein", value: `${item.protein   ?? "—"}g` },
          { label: "Carbs",   value: `${item.net_carbs ?? "—"}g` },
          { label: "Fats",    value: `${item.fats      ?? "—"}g` },
        ].map((m) => (
          <div key={m.label} className="bg-white/40 rounded-xl py-2">
            <p className="text-[10px] text-on-surface-variant font-medium">{m.label}</p>
            <p className="text-sm font-bold text-on-surface">{m.value}</p>
          </div>
        ))}
      </div>

      {item.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-white/60 rounded-full text-[9px] font-semibold text-on-surface-variant uppercase tracking-wider">
              {tag}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => onAddToTracker(item)}
        disabled={adding === item.food_name}
        className="mt-4 w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-wait"
      >
        {adding === item.food_name ? (
          <>
            <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
            Adding…
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-base">add_circle</span>
            Add to Today's Tracker
          </>
        )}
      </button>
    </div>
  );
}

// ── History Entry ─────────────────────────────────────────────────────────────
function HistoryEntry({ entry, onSelect, onDelete }) {
  const items = entry.extracted_items || entry.results || [];
  const date  = new Date(entry.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time  = new Date(entry.savedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="glass-panel rounded-2xl p-4 outline outline-1 outline-white/20 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-on-surface-variant font-medium">{date} · {time}</p>
          <p className="font-headline font-bold text-on-surface">{items.length} items extracted</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onSelect(entry)}
            className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:scale-105 active:scale-95 transition-transform"
          >
            View
          </button>
          <button onClick={() => onDelete(entry.id)} className="p-1.5 text-outline hover:text-error transition-colors">
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {items.slice(0, 3).map((it, i) => {
          const c = classColors[it.classification] || classColors.moderate;
          return (
            <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.badge}`}>
              {it.food_name}
            </span>
          );
        })}
        {items.length > 3 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-container text-on-surface-variant">
            +{items.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AnalysisPage() {
  const navigate = useNavigate();
  const { currentScan, setCurrentScan, history, deleteHistoryEntry, clearHistory } = useScan();

  const [tab, setTab]           = useState("results");
  const [adding, setAdding]     = useState(null);
  const [toast, setToast]       = useState("");
  const [toastType, setToastType] = useState("success"); // 'success' | 'error'
  const [filter, setFilter]     = useState("all");

  // ── Budget modal state ────────────────────────────────────────────────────
  const [pendingItem, setPendingItem] = useState(null); // { item, overAmount }

  const items    = currentScan?.extracted_items || currentScan?.results || [];
  const filtered = filter === "all" ? items : items.filter((it) => it.classification === filter);
  const counts   = {
    all:         items.length,
    recommended: items.filter((i) => i.classification === "recommended").length,
    moderate:    items.filter((i) => i.classification === "moderate").length,
    avoid:       items.filter((i) => i.classification === "avoid").length,
  };

  const showToast = (msg, type = "success") => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(""), 2800);
  };

  // ── Core save logic — shared between direct add and modal confirm ─────────
  const saveItemToTracker = useCallback(async (item) => {
    try {
      await api.post("/meals/quick-add", {
        meal_type: "lunch",
        food_name: item.food_name,
        calories:  item.calories   || 0,
        protein:   item.protein    || 0,
        carbs:     item.net_carbs  || 0,
        fats:      item.fats       || 0,
        source:    "scan",
      });
      showToast(`✓ ${item.food_name} added to tracker`);
    } catch {
      showToast(`✗ Failed to add ${item.food_name}`, "error");
    } finally {
      setAdding(null);
    }
  }, []);

  // ── handleAddToTracker — checks budget first ──────────────────────────────
  const handleAddToTracker = async (item) => {
    setAdding(item.food_name);
    try {
      // Fetch live budget — this is what makes the dashboard update correctly
      const { data } = await api.get("/progress/daily");
      const target       = data?.targets?.daily_calorie_target || 2200;
      const currentTotal = data?.progress?.total_calories      || 0;
      const remaining    = target - currentTotal;

      if (item.calories > remaining) {
        // Show modal instead of window.confirm
        setPendingItem({ item, overAmount: item.calories - remaining });
        // Keep adding spinner until modal resolves
        return;
      }

      await saveItemToTracker(item);
    } catch {
      showToast(`✗ Failed to add ${item.food_name}`, "error");
      setAdding(null);
    }
  };

  // ── Modal handlers ────────────────────────────────────────────────────────
  const handleModalConfirm = async () => {
    const item = pendingItem?.item;
    setPendingItem(null);
    if (item) await saveItemToTracker(item);
  };

  const handleModalCancel = () => {
    setPendingItem(null);
    setAdding(null);
  };

  const handleSelectHistory = (entry) => {
    setCurrentScan(entry);
    setTab("results");
  };

  return (
    <div className="space-y-6 pb-32">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm animate-fade-in text-white ${toastType === "error" ? "bg-error" : "bg-primary"}`}>
          {toast}
        </div>
      )}

      {/* Header */}
      <section className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-[3rem] font-headline font-extrabold tracking-[-0.04em] leading-none text-on-surface">
            Menu <span className="text-primary">Analysis</span>
          </h1>
          <button
            onClick={() => navigate("/scan")}
            className="p-2.5 rounded-xl bg-primary-container text-primary hover:scale-110 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined">camera_alt</span>
          </button>
        </div>
        <p className="text-on-surface-variant font-medium text-sm">
          {items.length > 0
            ? `${items.length} items detected · tap any item to add to tracker`
            : "No scan loaded yet. Scan a menu to see results."}
        </p>
      </section>

      {/* Tab Bar */}
      <div className="flex gap-2 bg-surface-container p-1 rounded-2xl">
        {[
          { id: "results", label: "Results",                      icon: "analytics" },
          { id: "history", label: `History (${history.length})`, icon: "history"   },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tab === t.id ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Results Tab */}
      {tab === "results" && (
        <>
          {items.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <span className="material-symbols-outlined text-5xl text-outline/40">restaurant_menu</span>
              <p className="text-on-surface-variant font-medium">No results to display.</p>
              <button
                onClick={() => navigate("/scan")}
                className="mx-auto flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-semibold hover:scale-105 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined">camera_alt</span>
                Scan a Menu
              </button>
            </div>
          ) : (
            <>
              {/* Filter chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: "all",         label: `All (${counts.all})`,                   color: "bg-surface-container" },
                  { id: "recommended", label: `✓ Recommended (${counts.recommended})`, color: "bg-emerald-500/20"   },
                  { id: "moderate",    label: `~ Moderate (${counts.moderate})`,        color: "bg-amber-500/20"     },
                  { id: "avoid",       label: `✕ Avoid (${counts.avoid})`,             color: "bg-red-500/20"       },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                      filter === f.id
                        ? `${f.color} text-on-surface scale-105 shadow-sm outline outline-1 outline-primary/30`
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {filtered.map((item, i) => (
                  <FoodItemCard
                    key={i}
                    item={item}
                    onAddToTracker={handleAddToTracker}
                    adding={adding}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <>
          {history.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <span className="material-symbols-outlined text-5xl text-outline/40">history</span>
              <p className="text-on-surface-variant font-medium">No scan history yet.</p>
              <p className="text-xs text-on-surface-variant">Scanned menus will appear here and persist across sessions.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button onClick={clearHistory} className="text-xs text-error font-semibold flex items-center gap-1 hover:underline">
                  <span className="material-symbols-outlined text-sm">delete_sweep</span>
                  Clear All
                </button>
              </div>
              <div className="space-y-4">
                {history.map((entry) => (
                  <HistoryEntry
                    key={entry.id}
                    entry={entry}
                    onSelect={handleSelectHistory}
                    onDelete={deleteHistoryEntry}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Budget Warning Modal */}
      {pendingItem && (
        <BudgetWarningModal
          foodName={pendingItem.item.food_name}
          overAmount={pendingItem.overAmount}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}
    </div>
  );
}