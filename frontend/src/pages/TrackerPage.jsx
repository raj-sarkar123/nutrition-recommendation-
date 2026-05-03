import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useScan } from "../context/ScanContext";
import BudgetWarningModal from "../components/ui/BudgetWarningModal";

const MEAL_SECTIONS = [
  { key: "breakfast", title: "Breakfast", icon: "wb_sunny" },
  { key: "lunch", title: "Lunch", icon: "light_mode" },
  { key: "dinner", title: "Dinner", icon: "nightlight" },
  { key: "snack", title: "Snacks", icon: "cookie" },
];

const EMPTY_ITEM = {
  food_name: "",
  calories: "",
  quantity: "",
  protein: "",
  carbs: "",
  fats: "",
};

export default function TrackerPage() {
  const navigate = useNavigate();
  const { currentScan } = useScan();

  const [meals, setMeals] = useState({
    breakfast: { id: null, meal_type: "breakfast", items: [] },
    lunch: { id: null, meal_type: "lunch", items: [] },
    dinner: { id: null, meal_type: "dinner", items: [] },
    snack: { id: null, meal_type: "snack", items: [] },
  });
  const [targets, setTargets] = useState({
    daily_calorie_target: 2200,
    protein_target: 120,
    carbs_target: 200,
    fats_target: 65,
  });
  const [addingTo, setAddingTo] = useState(null);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pendingAdd, setPendingAdd] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [mealsRes, progressRes] = await Promise.allSettled([
        api.get("/meals"),
        api.get("/progress/daily"),
      ]);

      if (mealsRes.status === "fulfilled") {
        const d = mealsRes.value.data;
        setMeals((prev) => ({
          ...prev,
          breakfast: d.breakfast || prev.breakfast,
          lunch: d.lunch || prev.lunch,
          dinner: d.dinner || prev.dinner,
          snack: d.snack || prev.snack,
        }));
      }

      if (progressRes.status === "fulfilled") {
        const t = progressRes.value.data?.targets;
        if (t) setTargets(t);
      }
    } catch (err) {
      console.error("TrackerPage fetchAll:", err);
    } finally {
      setLoaded(true);
    }
  };

  // ── Totals always derived from meals state ────────────────────────────────
  const computeTotals = useCallback(() => {
    let calories = 0, protein = 0, carbs = 0, fats = 0;
    for (const meal of Object.values(meals)) {
      for (const item of meal?.items || []) {
        calories += parseInt(item.calories) || 0;
        protein  += parseFloat(item.protein) || 0;
        carbs    += parseFloat(item.carbs) || 0;
        fats     += parseFloat(item.fats) || 0;
      }
    }
    return { calories, protein, carbs, fats };
  }, [meals]);

  const totals      = computeTotals();
  const rawRemaining = targets.daily_calorie_target - totals.calories;
  const isOverBudget = rawRemaining < 0;
  const displayAmount = Math.abs(rawRemaining);
  const calPct = Math.min((totals.calories / targets.daily_calorie_target) * 100, 100);

  // ── Add item ──────────────────────────────────────────────────────────────
  const handleAddItem = (mealType) => {
    if (!newItem.food_name.trim() || !newItem.calories) return;
    const itemCals = parseInt(newItem.calories) || 0;

    if (itemCals > rawRemaining) {
      setPendingAdd({
        mealType,
        overAmount: itemCals - rawRemaining,
        foodName: newItem.food_name,
        snapshot: { ...newItem },
      });
      return;
    }

    proceedWithAdd(mealType, null);
  };

  const cancelAdd = () => {
    setPendingAdd(null);
    setAddingTo(null);
    setNewItem(EMPTY_ITEM);
  };

  const proceedWithAdd = async (mealType, pending) => {
    // pending is passed directly to avoid stale closure on pendingAdd state
    const snap = pending?.snapshot ?? pendingAdd?.snapshot;
    const itemToAdd = snap ? { ...newItem, ...snap } : newItem;

    setPendingAdd(null);

    const mealId = meals[mealType]?.id;

    // Demo / offline mode
    if (!mealId || mealId.startsWith("demo-")) {
      const localItem = {
        id:        `local-${Date.now()}`,
        food_name: itemToAdd.food_name.trim(),
        calories:  parseInt(itemToAdd.calories) || 0,
        protein:   parseFloat(itemToAdd.protein) || 0,
        carbs:     parseFloat(itemToAdd.carbs) || 0,
        fats:      parseFloat(itemToAdd.fats) || 0,
        quantity:  itemToAdd.quantity || "1 serving",
        source:    "manual",
      };
      setMeals((prev) => ({
        ...prev,
        [mealType]: {
          ...prev[mealType],
          items: [...(prev[mealType]?.items || []), localItem],
        },
      }));
      setNewItem(EMPTY_ITEM);
      setAddingTo(null);
      return;
    }

    // Optimistic update
    const optimisticId = `opt-${Date.now()}`;
    const optimistic = {
      id:        optimisticId,
      food_name: itemToAdd.food_name.trim(),
      calories:  parseInt(itemToAdd.calories) || 0,
      protein:   parseFloat(itemToAdd.protein) || 0,
      carbs:     parseFloat(itemToAdd.carbs) || 0,
      fats:      parseFloat(itemToAdd.fats) || 0,
      quantity:  itemToAdd.quantity || "1 serving",
      source:    "manual",
    };

    setMeals((prev) => ({
      ...prev,
      [mealType]: {
        ...prev[mealType],
        items: [...(prev[mealType]?.items || []), optimistic],
      },
    }));
    setNewItem(EMPTY_ITEM);
    setAddingTo(null);
    setSaving(true);

    try {
      const { data: saved } = await api.post(`/meals/${mealId}/items`, {
        food_name: optimistic.food_name,
        calories:  optimistic.calories,
        protein:   optimistic.protein,
        carbs:     optimistic.carbs,
        fats:      optimistic.fats,
        quantity:  optimistic.quantity,
        source:    "manual",
      });

      const savedItem = Array.isArray(saved) ? saved[0] : (saved?.data || saved);

      setMeals((prev) => ({
        ...prev,
        [mealType]: {
          ...prev[mealType],
          items: prev[mealType].items.map((i) =>
            i.id === optimisticId ? { ...i, ...savedItem } : i
          ),
        },
      }));
    } catch (err) {
      console.error("addMealItem error:", err);
      // Rollback optimistic item on failure
      setMeals((prev) => ({
        ...prev,
        [mealType]: {
          ...prev[mealType],
          items: prev[mealType].items.filter((i) => i.id !== optimisticId),
        },
      }));
    } finally {
      setSaving(false);
    }
  };

  // ── Remove item ───────────────────────────────────────────────────────────
  const handleRemoveItem = async (mealType, itemId) => {
    setMeals((prev) => ({
      ...prev,
      [mealType]: {
        ...prev[mealType],
        items: prev[mealType]?.items?.filter((i) => i.id !== itemId) || [],
      },
    }));

    if (
      itemId.startsWith("local-") ||
      itemId.startsWith("opt-") ||
      itemId.startsWith("demo-")
    ) return;

    try {
      await api.delete(`/meals/items/${itemId}`);
    } catch (err) {
      console.error("removeItem error:", err);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32">

      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-[3.5rem] leading-none font-headline font-bold tracking-[-0.04em] text-on-surface">
          Daily Fuel.
        </h1>
        <p className="text-on-surface-variant font-medium">
          NutriScan AI ·{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      {/* Calorie Budget Card */}
      <section className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary-fixed to-transparent opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-700" />
        <div className="relative glass-panel rounded-[2rem] p-8 outline outline-1 outline-white/20 nova-shadow overflow-hidden">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-xs font-bold tracking-[0.1em] uppercase text-primary mb-1 block">
                Calorie Budget
              </span>
              <div className="text-5xl font-headline font-bold tracking-tighter text-on-surface">
                {totals.calories.toLocaleString()}
                <span className="text-xl font-medium text-on-surface-variant tracking-normal">
                  {" "}/ {targets.daily_calorie_target.toLocaleString()}
                </span>
              </div>
              <p className={`text-sm mt-1 font-medium ${isOverBudget ? "text-error" : "text-on-surface-variant"}`}>
                {!isOverBudget
                  ? `${displayAmount.toLocaleString()} kcal remaining`
                  : `${displayAmount.toLocaleString()} kcal over budget`}
              </p>
            </div>

            {/* SVG ring */}
            <div className="w-16 h-16 rounded-full flex items-center justify-center relative shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="transparent"
                  stroke="var(--md-sys-color-surface-container, #e8e8e8)" strokeWidth="5" />
                <circle cx="32" cy="32" r="28" fill="transparent"
                  stroke={isOverBudget ? "var(--md-sys-color-error, #b3261e)" : "var(--md-sys-color-primary, #00694b)"}
                  strokeDasharray="175.9"
                  strokeDashoffset={175.9 - (calPct / 100) * 175.9}
                  strokeWidth="5" strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <span
                className={`absolute material-symbols-outlined text-base ${isOverBudget ? "text-error" : "text-primary"}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >bolt</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5 w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${isOverBudget ? "bg-error" : "bg-primary shadow-[0_0_12px_rgba(0,105,75,0.4)]"}`}
              style={{ width: `${calPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* Last scan banner */}
      {currentScan?.extracted_items?.length > 0 && (
        <section className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
              restaurant_menu
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-primary">Last scan available</p>
            <p className="text-xs text-on-surface-variant">
              {currentScan.extracted_items.length} items — tap to add any to tracker
            </p>
          </div>
          <button
            onClick={() => navigate("/analysis")}
            className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold shrink-0 hover:scale-105 active:scale-95 transition-transform"
          >
            View
          </button>
        </section>
      )}

      {/* Meal Sections */}
      {MEAL_SECTIONS.map(({ key, title, icon }) => {
        const meal = meals[key];
        const mealCalories = meal?.items?.reduce((s, i) => s + (parseInt(i.calories) || 0), 0) || 0;

        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {icon}
                </span>
                <h2 className="text-xl font-headline font-semibold tracking-[-0.02em]">{title}</h2>
              </div>
              <span className="text-sm font-medium text-on-surface-variant">
                {meal?.items?.length ? `${mealCalories} kcal` : "Not logged"}
              </span>
            </div>

            <div className="space-y-3">
              {meal?.items?.map((item) => (
                <div
                  key={item.id}
                  className="glass-panel p-4 rounded-2xl outline outline-1 outline-white/20 flex items-center gap-4 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>
                      restaurant
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-on-surface truncate">{item.food_name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {item.quantity || "1 serving"}
                      {item.source === "scan" ? " · 📷 Scan" : item.source === "ai_verified" ? " · AI Verified" : " · Manual"}
                    </p>
                    {(parseFloat(item.protein) > 0 || parseFloat(item.carbs) > 0 || parseFloat(item.fats) > 0) && (
                      <p className="text-[10px] text-on-surface-variant mt-0.5">
                        {parseFloat(item.protein) > 0 ? `P:${Math.round(item.protein)}g ` : ""}
                        {parseFloat(item.carbs) > 0 ? `C:${Math.round(item.carbs)}g ` : ""}
                        {parseFloat(item.fats) > 0 ? `F:${Math.round(item.fats)}g` : ""}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-on-surface shrink-0">{item.calories} kcal</span>
                  <button onClick={() => handleRemoveItem(key, item.id)} className="text-outline hover:text-error transition-colors">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}

              {/* Add Item Form */}
              {addingTo === key ? (
                <div className="glass-panel p-4 rounded-2xl outline outline-1 outline-primary/20 space-y-3">
                  <input
                    className="w-full bg-transparent border-b border-outline-variant/30 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-on-surface-variant/50"
                    placeholder="Food name…"
                    value={newItem.food_name}
                    onChange={(e) => setNewItem((p) => ({ ...p, food_name: e.target.value }))}
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="bg-transparent border-b border-outline-variant/30 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-on-surface-variant/50"
                      placeholder="Calories *" type="number" min="0"
                      value={newItem.calories}
                      onChange={(e) => setNewItem((p) => ({ ...p, calories: e.target.value }))}
                    />
                    <input
                      className="bg-transparent border-b border-outline-variant/30 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-on-surface-variant/50"
                      placeholder="Quantity"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: "protein", label: "Protein (g)" },
                      { key: "carbs", label: "Carbs (g)" },
                      { key: "fats", label: "Fats (g)" },
                    ].map((f) => (
                      <input
                        key={f.key}
                        className="bg-transparent border-b border-outline-variant/30 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-on-surface-variant/50"
                        placeholder={f.label} type="number" min="0"
                        value={newItem[f.key]}
                        onChange={(e) => setNewItem((p) => ({ ...p, [f.key]: e.target.value }))}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleAddItem(key)}
                      disabled={!newItem.food_name.trim() || !newItem.calories || saving}
                      className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-1"
                    >
                      {saving && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                      Add
                    </button>
                    <button
                      onClick={() => { setAddingTo(null); setNewItem(EMPTY_ITEM); }}
                      className="flex-1 bg-surface-container py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-transform"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTo(key)}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-outline-variant/30 text-on-surface-variant font-medium flex items-center justify-center gap-2 hover:bg-white/40 hover:border-primary/40 hover:text-primary active:scale-[0.98] transition-all duration-200 group"
                >
                  <span className="material-symbols-outlined group-hover:scale-125 transition-transform">add</span>
                  Add Item
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Macro Summary Footer */}
      <footer className="glass-panel rounded-3xl p-6 outline outline-1 outline-white/20 shadow-lg">
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">
          Today's Macros
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Protein", value: Math.round(totals.protein), target: targets.protein_target || 120, color: "bg-emerald-500" },
            { label: "Carbs",   value: Math.round(totals.carbs),   target: targets.carbs_target   || 200, color: "bg-emerald-300" },
            { label: "Fats",    value: Math.round(totals.fats),    target: targets.fats_target    || 65,  color: "bg-emerald-600" },
          ].map((m) => (
            <div key={m.label} className="text-center space-y-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">{m.label}</span>
              <p className="text-lg font-bold text-on-surface">{m.value}g</p>
              <div className="w-full h-1 bg-surface-container rounded-full">
                <div
                  className={`h-full ${m.color} rounded-full transition-all duration-700`}
                  style={{ width: `${Math.min(Math.round((m.value / m.target) * 100), 100)}%` }}
                />
              </div>
              <p className="text-[9px] text-on-surface-variant">
                {Math.min(Math.round((m.value / m.target) * 100), 100)}% of {m.target}g
              </p>
            </div>
          ))}
        </div>
      </footer>

      {/* FAB */}
      <button
        onClick={() => navigate("/scan")}
        className="fixed bottom-28 right-6 w-14 h-14 bg-primary text-white rounded-2xl shadow-[0px_24px_48px_rgba(0,77,54,0.15)] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-300 z-40 outline outline-4 outline-white/20"
      >
        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          restaurant_menu
        </span>
      </button>

      {/* Budget Warning Modal */}
      {pendingAdd && (
        <BudgetWarningModal
          foodName={pendingAdd.foodName}
          overAmount={pendingAdd.overAmount}
          onConfirm={() => proceedWithAdd(pendingAdd.mealType, pendingAdd)}
          onCancel={cancelAdd}
        />
      )}
    </div>
  );
}