import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useMemo } from 'react';

// ── helpers ──────────────────────────────────────────────────────────────────
const pct = (val, target) =>
  target > 0 ? Math.min(Math.round((val / target) * 100), 100) : 0;

const topMealType = (meals) => {
  const totals = {};
  for (const [type, meal] of Object.entries(meals)) {
    totals[type] = (meal?.items || []).reduce(
      (s, i) => s + (parseInt(i.calories) || 0),
      0
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

  // Calorie status
  if (calOver > 0) {
    insights.push({
      id: 'cal-over',
      type: 'warning',
      icon: 'local_fire_department',
      title: 'Over calorie budget',
      body: `You've exceeded your daily target by ${calOver.toLocaleString()} kcal today. Consider lighter options for your next meal.`,
      tag: 'Calories',
      color: 'coral',
    });
  } else if (goal_met) {
    insights.push({
      id: 'goal-met',
      type: 'success',
      icon: 'emoji_events',
      title: 'Goal met today!',
      body: `You stayed within your ${daily_calorie_target.toLocaleString()} kcal target. Great discipline — keep it up!`,
      tag: 'Calories',
      color: 'teal',
    });
  } else {
    const remaining = daily_calorie_target - total_calories;
    insights.push({
      id: 'cal-remaining',
      type: 'info',
      icon: 'bolt',
      title: `${remaining.toLocaleString()} kcal remaining`,
      body: `You're on track for today. You still have room for a balanced meal or a healthy snack.`,
      tag: 'Calories',
      color: 'blue',
    });
  }

  // Protein
  if (proteinPct < 60) {
    insights.push({
      id: 'protein-low',
      type: 'warning',
      icon: 'fitness_center',
      title: 'Protein intake is low',
      body: `You're at ${total_protein}g — only ${proteinPct}% of your ${protein_target}g target. Try adding eggs, paneer, chicken, or Greek yogurt.`,
      tag: 'Protein',
      color: 'amber',
    });
  } else if (proteinPct >= 90) {
    insights.push({
      id: 'protein-great',
      type: 'success',
      icon: 'fitness_center',
      title: 'Strong protein day',
      body: `${total_protein}g logged — you're at ${proteinPct}% of your target. Excellent for muscle recovery.`,
      tag: 'Protein',
      color: 'teal',
    });
  }

  // Carbs
  if (carbsPct > 100) {
    insights.push({
      id: 'carbs-over',
      type: 'warning',
      icon: 'grain',
      title: 'Carbs over target',
      body: `${total_carbs}g logged vs ${carbs_target}g target. Watch refined carbs in your remaining meals.`,
      tag: 'Carbs',
      color: 'amber',
    });
  }

  // Fats
  if (fatsPct > 100) {
    insights.push({
      id: 'fats-over',
      type: 'warning',
      icon: 'water_drop',
      title: 'Fats slightly elevated',
      body: `${total_fats}g consumed vs ${fats_target}g target. Opt for grilled over fried options tonight.`,
      tag: 'Fats',
      color: 'coral',
    });
  }

  // Top meal
  const [topType, topCal] = topMealType(meals);
  if (topCal > 0) {
    const label = topType.charAt(0).toUpperCase() + topType.slice(1);
    const shareOfTotal = total_calories > 0 ? Math.round((topCal / total_calories) * 100) : 0;
    insights.push({
      id: 'top-meal',
      type: 'info',
      icon: 'restaurant',
      title: `${label} is your biggest meal`,
      body: `${label} accounts for ${shareOfTotal}% of today's calories (${topCal} kcal). Distributing more evenly can help manage hunger.`,
      tag: 'Meal Pattern',
      color: 'purple',
    });
  }

  // Scan ratio
  const ratio = scanRatio(meals);
  if (ratio > 50) {
    insights.push({
      id: 'scan-good',
      type: 'success',
      icon: 'qr_code_scanner',
      title: 'Great use of scanning',
      body: `${ratio}% of your food items were logged via scan or AI verification — more accurate than manual entry.`,
      tag: 'Accuracy',
      color: 'teal',
    });
  } else if (ratio > 0) {
    insights.push({
      id: 'scan-tip',
      type: 'tip',
      icon: 'qr_code_scanner',
      title: 'Scan more for accuracy',
      body: `Only ${ratio}% of items were scanned. Using the menu scanner gives more reliable calorie estimates.`,
      tag: 'Accuracy',
      color: 'blue',
    });
  }

  // Avg cal per item
  const avg = avgCalPerItem(meals);
  if (avg > 400) {
    insights.push({
      id: 'high-avg',
      type: 'tip',
      icon: 'scale',
      title: 'High-calorie items detected',
      body: `Your average item is ~${avg} kcal. Swapping one high-cal item for a lighter option could save 200–300 kcal daily.`,
      tag: 'Tip',
      color: 'amber',
    });
  }

  // Empty dinner nudge
  const dinnerItems = meals?.dinner?.items || [];
  const hour = new Date().getHours();
  if (dinnerItems.length === 0 && hour >= 18) {
    insights.push({
      id: 'dinner-empty',
      type: 'tip',
      icon: 'nightlight',
      title: "Don't forget to log dinner",
      body: "Dinner hasn't been logged yet. Tracking your evening meal helps complete your daily nutrition picture.",
      tag: 'Reminder',
      color: 'purple',
    });
  }

  return insights;
};

// ── color maps ────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  teal:   { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-500', tag: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  coral:  { bg: 'bg-red-500/10',     border: 'border-red-400/20',     icon: 'text-red-400',     tag: 'bg-red-500/15 text-red-700 dark:text-red-300'           },
  amber:  { bg: 'bg-amber-500/10',   border: 'border-amber-400/20',   icon: 'text-amber-500',   tag: 'bg-amber-500/15 text-amber-700 dark:text-amber-300'     },
  blue:   { bg: 'bg-blue-500/10',    border: 'border-blue-400/20',    icon: 'text-blue-400',    tag: 'bg-blue-500/15 text-blue-700 dark:text-blue-300'        },
  purple: { bg: 'bg-violet-500/10',  border: 'border-violet-400/20',  icon: 'text-violet-400',  tag: 'bg-violet-500/15 text-violet-700 dark:text-violet-300'  },
};

// ── MacroRing ─────────────────────────────────────────────────────────────────
function MacroRing({ label, value, target, color }) {
  const p = pct(value, target);
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ - (p / 100) * circ;

  const strokeMap = {
    'text-emerald-500': '#10b981',
    'text-amber-500':   '#f59e0b',
    'text-rose-400':    '#fb7185',
  };
  const stroke = strokeMap[color] || '#10b981';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="transparent" stroke="var(--md-sys-color-surface-container, #e8e8e8)" strokeWidth="5" />
          <circle
            cx="32" cy="32" r={r} fill="transparent"
            stroke={stroke}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeWidth="5"
            strokeLinecap="round"
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
      className={`glass-panel rounded-2xl p-4 outline outline-1 ${c.border} ${c.bg} flex gap-4 items-start`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.bg} border ${c.border}`}>
        <span
          className={`material-symbols-outlined text-base ${c.icon}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {insight.icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="font-bold text-sm text-on-surface">{insight.title}</p>
          <span className={`text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${c.tag}`}>
            {insight.tag}
          </span>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">{insight.body}</p>
      </div>
    </div>
  );
}

// ── AI Insight Card ───────────────────────────────────────────────────────────
function AIInsightCard({ meals, progress, targets }) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const allItems = Object.values(meals)
    .flatMap((m) => m?.items || [])
    .map((i) => `${i.food_name} (${i.calories} kcal, P:${i.protein}g C:${i.carbs}g F:${i.fats}g)`);

  const fetchInsight = async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const res = await api.post('/progress/insights', {
        meals,
        progress,
        targets
      });
      const text = res.data?.insight || '';
      setInsight(text);
      setFetched(true);
    } catch {
      setInsight('Unable to generate AI insight right now. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative glass-panel rounded-2xl p-5 outline outline-1 outline-primary/20 overflow-hidden">
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
        </div>
        <div>
          <p className="font-bold text-sm text-on-surface">AI Nutritionist</p>
          <p className="text-[10px] text-on-surface-variant">Powered by Claude</p>
        </div>
        <span className="ml-auto text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          Beta
        </span>
      </div>

      {!fetched && !loading && (
        <button
          onClick={fetchInsight}
          className="w-full py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/15 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-base">psychology</span>
          Analyse my meals
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-2">
          <span className="material-symbols-outlined text-primary animate-spin text-base">progress_activity</span>
          <p className="text-sm text-on-surface-variant">Analysing your nutrition…</p>
        </div>
      )}

      {fetched && insight && (
        <p className="text-sm text-on-surface leading-relaxed">{insight}</p>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function SmartInsightsPage() {
  const { user } = useAuth();
  const [meals, setMeals] = useState(null);
  const [progress, setProgress] = useState(null);
  const [targets, setTargets] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [mealsRes, progressRes] = await Promise.allSettled([
        api.get('/meals'),
        api.get('/progress/daily'),
      ]);
      if (mealsRes.status === 'fulfilled') setMeals(mealsRes.value.data);
      if (progressRes.status === 'fulfilled') {
        setProgress(progressRes.value.data?.progress);
        setTargets(progressRes.value.data?.targets);
      }
    } catch (err) {
      console.error('SmartInsights fetch error:', err);
    } finally {
      setLoaded(true);
    }
  };

  // ✅ replace with
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

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-xs font-bold tracking-[0.12em] uppercase text-primary">Smart Insights</p>
        <h1 className="text-[2.8rem] leading-none font-headline font-bold tracking-[-0.04em] text-on-surface">
          Today's<br />Analysis.
        </h1>
        <p className="text-on-surface-variant font-medium text-sm">
          {totalLogged} items logged ·{' '}
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </header>

      {/* Macro Overview */}
      {progress && targets && (
        <section className="glass-panel rounded-[1.5rem] p-5 outline outline-1 outline-white/20 nova-shadow">
          <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-4">
            Macro Progress
          </p>
          <div className="flex justify-around">
            <MacroRing label="Protein" value={progress.total_protein}  target={targets.protein_target} color="text-emerald-500" />
            <MacroRing label="Carbs"   value={progress.total_carbs}    target={targets.carbs_target}   color="text-amber-500"   />
            <MacroRing label="Fats"    value={progress.total_fats}     target={targets.fats_target}    color="text-rose-400"    />
          </div>

          {/* Calorie bar */}
          <div className="mt-5 pt-4 border-t border-outline-variant/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-on-surface-variant">Calories</span>
              <span className="text-xs font-bold text-on-surface">
                {progress.total_calories.toLocaleString()} / {targets.daily_calorie_target.toLocaleString()} kcal
              </span>
            </div>
            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  progress.total_calories > targets.daily_calorie_target ? 'bg-error' : 'bg-primary'
                }`}
                style={{ width: `${pct(progress.total_calories, targets.daily_calorie_target)}%` }}
              />
            </div>
          </div>
        </section>
      )}

      {/* AI Insight */}
      {meals && progress && targets && (
        <AIInsightCard meals={meals} progress={progress} targets={targets} />
      )}

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
              activeFilter === f
                ? 'bg-primary text-white'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Insight Cards */}
      <section className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">
              sentiment_satisfied
            </span>
            <p className="text-sm font-medium">No insights for this category today.</p>
          </div>
        ) : (
          filtered.map((insight, i) => (
            <InsightCard key={insight.id} insight={insight} index={i} />
          ))
        )}
      </section>

      {/* Meal Breakdown */}
      {meals && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant px-1">
            Meal Breakdown
          </h2>
          <div className="glass-panel rounded-2xl p-4 outline outline-1 outline-white/20 space-y-3">
            {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => {
              const meal = meals[type];
              const cal = (meal?.items || []).reduce(
                (s, i) => s + (parseInt(i.calories) || 0), 0
              );
              const share = progress?.total_calories > 0
                ? Math.round((cal / progress.total_calories) * 100)
                : 0;
              const icons = { breakfast: 'wb_sunny', lunch: 'light_mode', dinner: 'nightlight', snack: 'cookie' };
              const label = type.charAt(0).toUpperCase() + type.slice(1);
              return (
                <div key={type} className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-primary text-base shrink-0"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {icons[type]}
                  </span>
                  <span className="text-xs font-bold text-on-surface-variant w-20 shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-on-surface w-16 text-right shrink-0">
                    {cal > 0 ? `${cal} kcal` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Refresh */}
      <button
        onClick={fetchData}
        className="w-full py-3 rounded-2xl bg-surface-container text-on-surface-variant text-sm font-semibold flex items-center justify-center gap-2 hover:bg-surface-container-high active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-base">refresh</span>
        Refresh insights
      </button>
    </div>
  );
}