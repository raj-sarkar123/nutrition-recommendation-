import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useNutrition } from '../context/NutritionContext';

// ── helpers ──────────────────────────────────────────────────────────────────
const pct = (val, target) =>
  target > 0 ? Math.min(Math.round((val / target) * 100), 100) : 0;

const topMealType = (meals) => {
  const totals = {};
  for (const [type, meal] of Object.entries(meals)) {
    totals[type] = (meal?.items || []).reduce(
      (s, i) => s + (parseInt(i.calories) || 0), 0
    );
  }
  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
};

const scanRatio = (meals) => {
  let scanned = 0, total = 0;
  for (const meal of Object.values(meals)) {
    for (const item of meal?.items || []) {
      total++;
      if (item.source === 'scan' || item.source === 'ai_verified') scanned++;
    }
  }
  return total > 0 ? Math.round((scanned / total) * 100) : 0;
};

const avgCalPerItem = (meals) => {
  let totalCal = 0, totalItems = 0;
  for (const meal of Object.values(meals)) {
    for (const item of meal?.items || []) {
      totalCal += parseInt(item.calories) || 0;
      totalItems++;
    }
  }
  return totalItems > 0 ? Math.round(totalCal / totalItems) : 0;
};

// ── insight generator ─────────────────────────────────────────────────────────
const generateInsights = (meals, progress, targets) => {
  const insights = [];
  if (!progress || !targets) return insights;

  const { total_calories, total_protein, total_carbs, total_fats, goal_met } = progress;
  const { daily_calorie_target, protein_target, carbs_target, fats_target } = targets;

  const calOver = total_calories - daily_calorie_target;
  const proteinPct = pct(total_protein, protein_target);
  const carbsPct = pct(total_carbs, carbs_target);
  const fatsPct = pct(total_fats, fats_target);

  if (calOver > 0) {
    insights.push({
      id: 'cal-over', type: 'warning', icon: 'local_fire_department',
      title: 'Over calorie budget',
      body: `You've exceeded your daily target by ${calOver.toLocaleString()} kcal today. Consider lighter options for your next meal.`,
      tag: 'Calories', color: 'coral',
    });
  } else if (goal_met) {
    insights.push({
      id: 'goal-met', type: 'success', icon: 'emoji_events',
      title: 'Goal met today!',
      body: `You stayed within your ${daily_calorie_target.toLocaleString()} kcal target. Great discipline — keep it up!`,
      tag: 'Calories', color: 'teal',
    });
  } else {
    const remaining = daily_calorie_target - total_calories;
    insights.push({
      id: 'cal-remaining', type: 'info', icon: 'bolt',
      title: `${remaining.toLocaleString()} kcal remaining`,
      body: `You're on track for today. You still have room for a balanced meal or a healthy snack.`,
      tag: 'Calories', color: 'blue',
    });
  }

  if (proteinPct < 60) {
    insights.push({
      id: 'protein-low', type: 'warning', icon: 'fitness_center',
      title: 'Protein intake is low',
      body: `You're at ${total_protein}g — only ${proteinPct}% of your ${protein_target}g target. Try adding eggs, paneer, chicken, or Greek yogurt.`,
      tag: 'Protein', color: 'amber',
    });
  } else if (proteinPct >= 90) {
    insights.push({
      id: 'protein-great', type: 'success', icon: 'fitness_center',
      title: 'Strong protein day',
      body: `${total_protein}g logged — you're at ${proteinPct}% of your target. Excellent for muscle recovery.`,
      tag: 'Protein', color: 'teal',
    });
  }

  if (carbsPct > 100) {
    insights.push({
      id: 'carbs-over', type: 'warning', icon: 'grain',
      title: 'Carbs over target',
      body: `${total_carbs}g logged vs ${carbs_target}g target. Watch refined carbs in your remaining meals.`,
      tag: 'Carbs', color: 'amber',
    });
  }

  if (fatsPct > 100) {
    insights.push({
      id: 'fats-over', type: 'warning', icon: 'water_drop',
      title: 'Fats slightly elevated',
      body: `${total_fats}g consumed vs ${fats_target}g target. Opt for grilled over fried options tonight.`,
      tag: 'Fats', color: 'coral',
    });
  }

  const [topType, topCal] = topMealType(meals);
  if (topCal > 0) {
    const label = topType.charAt(0).toUpperCase() + topType.slice(1);
    const shareOfTotal = total_calories > 0 ? Math.round((topCal / total_calories) * 100) : 0;
    insights.push({
      id: 'top-meal', type: 'info', icon: 'restaurant',
      title: `${label} is your biggest meal`,
      body: `${label} accounts for ${shareOfTotal}% of today's calories (${topCal} kcal). Distributing more evenly can help manage hunger.`,
      tag: 'Meal Pattern', color: 'purple',
    });
  }

  const ratio = scanRatio(meals);
  if (ratio > 50) {
    insights.push({
      id: 'scan-good', type: 'success', icon: 'qr_code_scanner',
      title: 'Great use of scanning',
      body: `${ratio}% of your food items were logged via scan or AI verification — more accurate than manual entry.`,
      tag: 'Accuracy', color: 'teal',
    });
  } else if (ratio > 0) {
    insights.push({
      id: 'scan-tip', type: 'tip', icon: 'qr_code_scanner',
      title: 'Scan more for accuracy',
      body: `Only ${ratio}% of items were scanned. Using the menu scanner gives more reliable calorie estimates.`,
      tag: 'Accuracy', color: 'blue',
    });
  }

  const avg = avgCalPerItem(meals);
  if (avg > 400) {
    insights.push({
      id: 'high-avg', type: 'tip', icon: 'scale',
      title: 'High-calorie items detected',
      body: `Your average item is ~${avg} kcal. Swapping one high-cal item for a lighter option could save 200–300 kcal daily.`,
      tag: 'Tip', color: 'amber',
    });
  }

  const dinnerItems = meals?.dinner?.items || [];
  const hour = new Date().getHours();
  if (dinnerItems.length === 0 && hour >= 18) {
    insights.push({
      id: 'dinner-empty', type: 'tip', icon: 'nightlight',
      title: "Don't forget to log dinner",
      body: "Dinner hasn't been logged yet. Tracking your evening meal helps complete your daily nutrition picture.",
      tag: 'Reminder', color: 'purple',
    });
  }

  return insights;
};

// ── colour palette ────────────────────────────────────────────────────────────
const COLOR_MAP = {
  teal: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-500', tag: 'bg-emerald-500/15 text-emerald-700' },
  coral: { bg: 'bg-red-500/10', border: 'border-red-400/20', icon: 'text-red-400', tag: 'bg-red-500/15 text-red-700' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-400/20', icon: 'text-amber-500', tag: 'bg-amber-500/15 text-amber-700' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-400/20', icon: 'text-blue-400', tag: 'bg-blue-500/15 text-blue-700' },
  purple: { bg: 'bg-violet-500/10', border: 'border-violet-400/20', icon: 'text-violet-400', tag: 'bg-violet-500/15 text-violet-700' },
};

// ── MacroRing ─────────────────────────────────────────────────────────────────
function MacroRing({ label, value, target, color }) {
  const p = pct(value, target);
  const r = 26;
  const circ = 2 * Math.PI * r;
  const off = circ - (p / 100) * circ;
  const strokeMap = {
    'text-emerald-500': '#10b981',
    'text-amber-500': '#f59e0b',
    'text-rose-400': '#fb7185',
  };
  const stroke = strokeMap[color] || '#10b981';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="transparent"
            stroke="var(--md-sys-color-surface-container, #e8e8e8)" strokeWidth="5" />
          <circle cx="32" cy="32" r={r} fill="transparent"
            stroke={stroke}
            strokeDasharray={circ} strokeDashoffset={off}
            strokeWidth="5" strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold text-on-surface">{p}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className={`text-base font-bold ${color}`}>{value}g</p>
        <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">{label}</p>
        <p className="text-[9px] text-on-surface-variant">of {target}g</p>
      </div>
    </div>
  );
}

// ── InsightCard ───────────────────────────────────────────────────────────────
function InsightCard({ insight, index }) {
  const c = COLOR_MAP[insight.color] || COLOR_MAP.blue;
  return (
    <div
      className={`glass-panel rounded-2xl p-4 outline outline-1 ${c.border} ${c.bg} flex gap-4 items-start group hover:scale-[1.02] hover:shadow-[0px_20px_40px_rgba(0,77,54,0.1)] transition-all duration-300 ease-out-expo active:scale-[0.99]`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.bg} border ${c.border} group-hover:scale-110 transition-transform duration-300`}>
        <span className={`material-symbols-outlined text-base ${c.icon}`} style={{ fontVariationSettings: "'FILL' 1" }}>
          {insight.icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="font-headline font-bold text-sm text-on-surface">{insight.title}</p>
          <span className={`text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${c.tag}`}>{insight.tag}</span>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">{insight.body}</p>
      </div>
    </div>
  );
}

// ── AIInsightCard ─────────────────────────────────────────────────────────────
function AIInsightCard({ meals, progress, targets }) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchInsight = async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const res = await api.post('/progress/insights', { meals, progress, targets });
      setInsight(res.data?.insight || '');
      setFetched(true);
    } catch {
      setInsight('Unable to generate AI insight right now. Try again later.');
      setFetched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="px-2">
      <div className="ai-glow bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex flex-col gap-3 transition-transform hover:scale-[1.02]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <div className="flex-1">
            <h4 className="font-headline font-bold text-emerald-800 text-xs uppercase tracking-wider mb-0.5">AI Nutritionist</h4>
            {!fetched && !loading && (
              <p className="text-emerald-900/80 text-xs leading-tight">Tap below to get personalised insights based on today's meals.</p>
            )}
            {loading && <p className="text-emerald-900/80 text-xs leading-tight">Analysing your nutrition…</p>}
            {fetched && insight && <p className="text-emerald-900/80 text-xs leading-relaxed">{insight}</p>}
          </div>
          <span className="shrink-0 text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700">Beta</span>
        </div>
        {!fetched && !loading && (
          <button
            onClick={fetchInsight}
            className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-500/25 active:scale-95 transition-all duration-200"
          >
            <span className="material-symbols-outlined text-sm">psychology</span>
            Analyse my meals
          </button>
        )}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-1">
            <span className="material-symbols-outlined text-emerald-600 animate-spin text-base">progress_activity</span>
          </div>
        )}
      </div>
    </section>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function SmartInsightsPage() {
  // ✅ Use cached nutrition data — no skeleton flash on tab switch
  const { progress, targets, initialLoading } = useNutrition();

  const [meals, setMeals] = useState(null);
  const [mealsLoaded, setMealsLoaded] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => { fetchMeals(); }, []);

  const fetchMeals = async () => {
    try {
      const res = await api.get('/meals');
      setMeals(res.data);
    } catch (err) {
      console.error('SmartInsights meals fetch error:', err);
    } finally {
      setMealsLoaded(true);
    }
  };

  const insights = useMemo(() => {
    if (!meals || !progress || !targets) return [];
    return generateInsights(meals, progress, targets);
  }, [meals, progress, targets]);

  const filters = ['All', 'Calories', 'Protein', 'Carbs', 'Fats', 'Tip', 'Reminder'];
  const filtered = activeFilter === 'All'
    ? insights
    : insights.filter((i) => i.tag === activeFilter);

  const totalLogged = Object.values(meals || {}).reduce(
    (s, m) => s + (m?.items?.length || 0), 0
  );

  // Only show full skeleton on very first ever load (no cached data)
  if (initialLoading && !mealsLoaded) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-28">

      {/* Header */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-container/40 border border-primary-container">
          <span className="material-symbols-outlined text-primary text-sm" style={{ fontSize: '14px' }}>auto_awesome</span>
          <span className="text-xs font-semibold text-primary tracking-widest uppercase">Smart Insights</span>
        </div>
        <h1 className="text-[3.2rem] leading-[1.05] font-headline font-extrabold tracking-[-0.04em] text-on-surface">
          Today's<br /><span className="text-primary">Analysis.</span>
        </h1>
        <p className="text-sm text-on-surface-variant font-medium flex items-center gap-1.5">
          <span className="material-symbols-outlined text-outline" style={{ fontSize: '16px' }}>calendar_today</span>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </header>

      {/* Macro Progress */}
      {progress && targets && (
        <section className="relative group">
          <div className="absolute -inset-4 bg-primary-container/20 blur-3xl rounded-full opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="glass-panel rounded-xl p-6 outline outline-1 outline-white/20 nova-shadow relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />
            <h3 className="font-headline text-sm font-bold tracking-widest uppercase text-on-surface-variant mb-5">Nutrient Precision</h3>
            <div className="flex justify-around mb-5">
              <MacroRing label="Protein" value={progress.total_protein || 0} target={targets.protein_target || 120} color="text-emerald-500" />
              <MacroRing label="Carbs" value={progress.total_carbs || 0} target={targets.carbs_target || 200} color="text-amber-500" />
              <MacroRing label="Fats" value={progress.total_fats || 0} target={targets.fats_target || 65} color="text-rose-400" />
            </div>
            <div className="pt-4 border-t border-outline-variant/10 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">Calories</span>
                <span className="text-xs font-bold text-on-surface">
                  {(progress.total_calories || 0).toLocaleString()} / {(targets.daily_calorie_target || 0).toLocaleString()} kcal
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${(progress.total_calories || 0) > (targets.daily_calorie_target || 0) ? 'bg-error' : 'bg-primary shadow-[0_0_12px_rgba(0,105,75,0.4)]'}`}
                  style={{ width: `${pct(progress.total_calories, targets.daily_calorie_target)}%` }}
                />
              </div>
              <p className={`text-xs font-medium ${(progress.total_calories || 0) > (targets.daily_calorie_target || 0) ? 'text-error' : 'text-on-surface-variant'}`}>
                {(progress.total_calories || 0) > (targets.daily_calorie_target || 0)
                  ? `${((progress.total_calories || 0) - (targets.daily_calorie_target || 0)).toLocaleString()} kcal over budget`
                  : `${((targets.daily_calorie_target || 0) - (progress.total_calories || 0)).toLocaleString()} kcal remaining`}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* AI Insight */}
      {meals && progress && targets && (
        <AIInsightCard meals={meals} progress={progress} targets={targets} />
      )}

      {/* Meal Breakdown */}
      {meals && (
        <section className="space-y-4">
          <h3 className="font-headline text-sm font-bold tracking-widest uppercase text-on-surface-variant px-2">Meal Breakdown</h3>
          <div className="space-y-3">
            {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => {
              const meal = meals[type];
              const cal = (meal?.items || []).reduce((s, i) => s + (parseInt(i.calories) || 0), 0);
              const share = (progress?.total_calories || 0) > 0 ? Math.round((cal / progress.total_calories) * 100) : 0;
              const icons = { breakfast: 'wb_sunny', lunch: 'light_mode', dinner: 'nightlight', snack: 'cookie' };
              const label = type.charAt(0).toUpperCase() + type.slice(1);
              return (
                <div key={type} className="glass-panel p-4 rounded-2xl outline outline-1 outline-white/20 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{icons[type]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-semibold text-sm text-on-surface mb-1.5">{label}</p>
                    <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${share}%` }} />
                    </div>
                    <p className="text-[10px] text-on-surface-variant mt-1">{share}% of today's intake</p>
                  </div>
                  <span className="text-sm font-bold text-on-surface shrink-0">{cal > 0 ? `${cal} kcal` : '—'}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick Stats */}
      <section className="grid grid-cols-2 gap-4">
        <div className="glass-panel p-5 rounded-xl outline outline-1 outline-white/20 shadow-[0px_12px_24px_rgba(0,77,54,0.04)] flex flex-col items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-secondary-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant</span>
          </div>
          <div>
            <span className="font-headline font-bold text-on-surface block text-sm">Items Logged</span>
            <span className="text-2xl font-headline font-bold text-primary">{totalLogged}</span>
          </div>
        </div>
        <div className="glass-panel p-5 rounded-xl outline outline-1 outline-white/20 shadow-[0px_12px_24px_rgba(0,77,54,0.04)] flex flex-col items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-secondary-container flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
          </div>
          <div>
            <span className="font-headline font-bold text-on-surface block text-sm">Insights</span>
            <span className="text-2xl font-headline font-bold text-secondary">{insights.length}</span>
          </div>
        </div>
      </section>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 ${activeFilter === f ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Insight Cards */}
      <section className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-panel rounded-2xl p-10 outline outline-1 outline-white/20 text-center">
            <span className="material-symbols-outlined text-4xl mb-3 block opacity-30 text-on-surface-variant">sentiment_satisfied</span>
            <p className="text-sm font-medium text-on-surface-variant">No insights for this category today.</p>
          </div>
        ) : (
          filtered.map((insight, i) => <InsightCard key={insight.id} insight={insight} index={i} />)
        )}
      </section>

      {/* Macro footer */}
      {progress && targets && (
        <footer className="glass-panel rounded-3xl p-6 outline outline-1 outline-white/20 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Today's Macros</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Protein', value: Math.round(progress.total_protein || 0), target: targets.protein_target || 120, color: 'bg-emerald-500' },
              { label: 'Carbs', value: Math.round(progress.total_carbs || 0), target: targets.carbs_target || 200, color: 'bg-emerald-300' },
              { label: 'Fats', value: Math.round(progress.total_fats || 0), target: targets.fats_target || 65, color: 'bg-emerald-600' },
            ].map((m) => (
              <div key={m.label} className="text-center space-y-1">
                <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">{m.label}</span>
                <p className="text-lg font-bold text-on-surface">{m.value}g</p>
                <div className="w-full h-1 bg-surface-container rounded-full">
                  <div className={`h-full ${m.color} rounded-full transition-all duration-700`} style={{ width: `${Math.min(Math.round((m.value / m.target) * 100), 100)}%` }} />
                </div>
                <p className="text-[9px] text-on-surface-variant">{Math.min(Math.round((m.value / m.target) * 100), 100)}% of {m.target}g</p>
              </div>
            ))}
          </div>
        </footer>
      )}

      {/* Bottom AI banner */}
      <section className="pb-10">
        <div className="bg-primary-container/30 backdrop-blur-md border border-primary-container p-5 rounded-xl flex gap-4 items-start shadow-[0_0_15px_rgba(140,254,206,0.3)]">
          <div className="text-primary mt-1">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <div>
            <h4 className="font-headline font-bold text-on-primary-container text-sm">AI Insight</h4>
            <p className="text-on-primary-container/80 text-xs mt-1 leading-relaxed">
              {insights.find(i => i.type === 'warning')?.body || 'Log all meals consistently to unlock smarter, more personalised daily insights.'}
            </p>
          </div>
        </div>
      </section>

      {/* Refresh */}
      <button
        onClick={fetchMeals}
        className="w-full py-3.5 rounded-2xl bg-surface-container text-on-surface-variant text-sm font-semibold flex items-center justify-center gap-2 hover:bg-surface-container-high active:scale-[0.98] transition-all duration-200"
      >
        <span className="material-symbols-outlined text-base">refresh</span>
        Refresh insights
      </button>
    </div>
  );
}