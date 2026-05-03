import { useState, useEffect } from 'react';
import api from '../api/axios';
import ProgressRing from '../components/ui/ProgressRing';

// Day labels — Mon-first order
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function todayMonIndex() {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

// ── Over-budget ring drawn manually so we can show red overflow arc ───────────
function CalorieRing({ calories, target, size = 256, strokeWidth = 24 }) {
  const isOver     = calories > target;
  const pct        = Math.min((calories / target) * 100, 100);
  const overPct    = isOver ? Math.min(((calories - target) / target) * 100, 100) : 0;

  const r          = (size - strokeWidth) / 2;
  const cx         = size / 2;
  const cy         = size / 2;
  const circ       = 2 * Math.PI * r;

  const normalOffset = circ - (pct / 100) * circ;
  const overOffset   = circ - (overPct / 100) * circ;

  const displayPct    = Math.round((calories / target) * 100);
  const remaining     = target - calories;
  const isOverDisplay = remaining < 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="var(--md-sys-color-surface-container, #e8e8e8)"
          strokeWidth={strokeWidth}
        />
        {/* Normal fill — primary color up to 100% */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={isOver ? 'var(--md-sys-color-error, #b3261e)' : 'var(--md-sys-color-primary, #00694b)'}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={normalOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.7s ease, stroke 0.3s ease' }}
        />
        {/* Over-budget secondary arc — brighter red on top */}
        {isOver && (
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke="rgba(220,50,50,0.4)"
            strokeWidth={strokeWidth - 4}
            strokeDasharray={circ}
            strokeDashoffset={overOffset}
            strokeLinecap="round"
            className="animate-pulse"
          />
        )}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <span className={`text-4xl font-headline font-bold tracking-tight leading-none ${isOver ? 'text-error' : 'text-on-surface'}`}>
          {displayPct}%
        </span>
        <span className="text-xs text-on-surface-variant font-medium mt-2 leading-tight">
          {calories.toLocaleString()} / {target.toLocaleString()} kcal
        </span>
        {isOver && (
          <span className="mt-1.5 px-2.5 py-0.5 bg-error/10 rounded-full text-[10px] font-bold text-error tracking-wide">
            +{Math.abs(remaining).toLocaleString()} over
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const [weekly,    setWeekly]    = useState(DAY_LABELS.map(d => ({ day: d, calories: 0, goal_met: false })));
  const [streak,    setStreak]    = useState(0);
  const [dailyGoal, setDailyGoal] = useState({ calories: 0, target: 2200, protein: 0, carbs: 0, fats: 0 });
  const [targets,   setTargets]   = useState({ protein_target: 120, carbs_target: 200, fats_target: 65 });
  const [loaded,    setLoaded]    = useState(false);

  useEffect(() => {
    Promise.all([fetchWeekly(), fetchStreak(), fetchDaily()])
      .finally(() => setLoaded(true));
  }, []);

  const fetchWeekly = async () => {
    try {
      const { data } = await api.get('/progress/weekly');
      const raw = data.weekly || [];
      const normalised = DAY_LABELS.map(label => {
        const found = raw.find(d => d.day === label);
        return found || { day: label, calories: 0, goal_met: false };
      });
      setWeekly(normalised);
    } catch { /* keep defaults */ }
  };

  const fetchStreak = async () => {
    try {
      const { data } = await api.get('/progress/streak');
      setStreak(data.streak || 0);
    } catch { /* keep 0 */ }
  };

  const fetchDaily = async () => {
    try {
      const { data } = await api.get('/progress/daily');
      const p = data.progress || {};
      const t = data.targets  || {};
      setDailyGoal({
        calories: p.total_calories || 0,
        target:   t.daily_calorie_target || 2200,
        protein:  p.total_protein || 0,
        carbs:    p.total_carbs   || 0,
        fats:     p.total_fats    || 0,
      });
      setTargets(t);
    } catch { /* keep defaults */ }
  };

  const maxCalories    = Math.max(...weekly.map(d => d.calories), 1);
  const percentage     = Math.min(Math.round((dailyGoal.calories / dailyGoal.target) * 100), 100);
  const isOverBudget   = dailyGoal.calories > dailyGoal.target;
  const todayIdx       = todayMonIndex();

  const metabolicScore = dailyGoal.target > 0
    ? Math.min(100, Math.round((1 - Math.abs(dailyGoal.calories - dailyGoal.target) / dailyGoal.target) * 100))
    : 0;

  const weeklyAvg = weekly.length
    ? Math.round(weekly.reduce((s, d) => s + d.calories, 0) / weekly.length)
    : 0;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="space-y-10 pb-20 animate-pulse">
        <div className="h-14 w-40 bg-surface-container rounded-2xl" />
        <div className="flex justify-center py-8">
          <div className="w-64 h-64 rounded-full bg-surface-container" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-surface-container rounded-2xl" />)}
        </div>
        <div className="h-40 bg-surface-container rounded-3xl" />
        <div className="h-64 bg-surface-container rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">

      {/* Hero */}
      <section className="space-y-2">
        <h1 className={`text-[3.5rem] font-headline font-extrabold tracking-[-0.04em] leading-[0.9] ${isOverBudget ? 'text-error' : 'text-primary'}`}>
          Insights
        </h1>
        <p className="text-on-surface-variant font-medium tracking-tight">
          Your NutriScan AI analysis for this week.
        </p>
      </section>

      {/* Over-budget banner */}
      {isOverBudget && (
        <section className="bg-error/8 border border-error/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-error/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-error text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-error">Daily budget exceeded</p>
            <p className="text-xs text-on-surface-variant">
              You're{' '}
              <span className="font-semibold text-error">
                {(dailyGoal.calories - dailyGoal.target).toLocaleString()} kcal
              </span>{' '}
              over your {dailyGoal.target.toLocaleString()} kcal target today.
            </p>
          </div>
          <div className="shrink-0 bg-error text-white text-xs font-bold px-3 py-1.5 rounded-full">
            {Math.round((dailyGoal.calories / dailyGoal.target) * 100)}%
          </div>
        </section>
      )}

      {/* Goal Ring — custom component that handles over-budget */}
      <section className="relative flex justify-center py-8">
        <CalorieRing
          calories={dailyGoal.calories}
          target={dailyGoal.target}
          size={256}
          strokeWidth={24}
        />
      </section>

      {/* Today macro summary */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { label: 'Protein', value: dailyGoal.protein, target: targets.protein_target || 120, unit: 'g', color: 'bg-primary' },
          { label: 'Carbs',   value: dailyGoal.carbs,   target: targets.carbs_target   || 200, unit: 'g', color: 'bg-secondary' },
          { label: 'Fats',    value: dailyGoal.fats,    target: targets.fats_target    || 65,  unit: 'g', color: 'bg-tertiary-dim' },
        ].map(m => {
          const pct     = Math.min(Math.round(((m.value || 0) / m.target) * 100), 100);
          const isOver  = (m.value || 0) > m.target;
          return (
            <div key={m.label} className={`rounded-2xl p-4 space-y-2 ${isOver ? 'bg-error/5 outline outline-1 outline-error/20' : 'bg-surface-container-lowest'}`}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">{m.label}</p>
              <p className={`text-xl font-headline font-bold ${isOver ? 'text-error' : 'text-on-surface'}`}>
                {Math.round(m.value || 0)}<span className="text-sm font-medium opacity-60">{m.unit}</span>
              </p>
              <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-error' : m.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className={`text-[9px] ${isOver ? 'text-error font-semibold' : 'text-on-surface-variant'}`}>
                {isOver ? `+${Math.round((m.value || 0) - m.target)}${m.unit} over` : `${pct}% of ${m.target}${m.unit}`}
              </p>
            </div>
          );
        })}
      </section>

      {/* Streak Tracker */}
      <section className="bg-surface-container-lowest/60 backdrop-blur-2xl rounded-[2rem] p-6 nova-shadow outline outline-1 outline-white/15">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-xl font-headline font-semibold tracking-tight text-on-surface">Current Streak</h2>
            <p className="text-on-surface-variant text-xs font-medium">
              {streak > 0 ? `🔥 ${streak} day${streak !== 1 ? 's' : ''} — keep it up!` : 'Log today to start your streak!'}
            </p>
          </div>
          <div className="text-right">
            <span className={`text-3xl font-headline font-bold ${streak > 0 ? 'text-primary' : 'text-on-surface-variant'}`}>
              {streak}
            </span>
            <span className="text-xs font-bold text-on-surface-variant uppercase block">Days</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          {weekly.map((day, i) => {
            const isToday   = i === todayIdx;
            const isPast    = i < todayIdx;
            const isFuture  = i > todayIdx;
            const isGoalMet = day.goal_met;

            return (
              <div key={day.day} className={`flex flex-col items-center gap-2 ${isFuture ? 'opacity-30' : ''}`}>
                <span className="text-[10px] font-bold text-on-surface-variant">{day.day}</span>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  isGoalMet && (isPast || isToday)
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : isToday
                    ? 'bg-primary-fixed text-primary outline outline-2 outline-primary/30'
                    : isPast && day.calories > 0
                    ? 'bg-surface-container-high text-on-surface-variant'
                    : 'bg-surface-container-high opacity-50'
                }`}>
                  {isGoalMet && (isPast || isToday) && (
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  )}
                  {isToday && !isGoalMet && (
                    <span className="material-symbols-outlined text-sm">bolt</span>
                  )}
                  {isPast && !isGoalMet && day.calories > 0 && (
                    <span className="text-[10px] font-bold">
                      {day.calories >= 1000 ? `${(day.calories / 1000).toFixed(1)}k` : day.calories}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Weekly Chart */}
      <div className="grid grid-cols-2 gap-4">
        <section className="col-span-2 bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-container overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-headline font-semibold text-lg">Weekly Consumption</h3>
              <p className="text-xs text-on-surface-variant">CALORIE ACCURACY OVER TIME</p>
            </div>
            {weeklyAvg > 0 && (
              <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Avg {weeklyAvg.toLocaleString()} kcal/day
              </span>
            )}
          </div>
          <div className="relative h-48 flex items-end justify-between gap-2 px-2 pt-4">
            {/* Grid lines */}
            <div className="absolute inset-x-0 bottom-0 top-4 flex flex-col justify-between pointer-events-none opacity-5">
              {[...Array(5)].map((_, i) => <div key={i} className="border-t border-on-surface w-full" />)}
            </div>

            {/* Target line */}
            <div
              className="absolute left-2 right-2 h-[2px] bg-primary/30 z-10"
              style={{ bottom: `${Math.min((dailyGoal.target / maxCalories) * 100, 95)}%` }}
            />

            {/* Bars */}
            {weekly.map((day, i) => {
              const height    = maxCalories > 0 ? (day.calories / maxCalories) * 100 : 0;
              const isToday   = i === todayIdx;
              const isGoalMet = day.goal_met;
              const isDayOver = day.calories > dailyGoal.target;

              return (
                <div key={day.day} className="w-full h-full flex flex-col justify-end items-center gap-2 relative z-10">
                  <div
                    className={`w-full rounded-t-xl transition-all duration-500 relative group ${
                      isToday && isDayOver
                        ? 'bg-error shadow-[0_0_20px_rgba(179,38,30,0.3)]'
                        : isToday
                        ? 'bg-primary shadow-[0_0_20px_rgba(0,105,75,0.3)]'
                        : isDayOver
                        ? 'bg-error/50'
                        : isGoalMet
                        ? 'bg-emerald-400/60 hover:bg-emerald-400/80'
                        : day.calories > 0
                        ? 'bg-primary-dim/30 hover:bg-primary-dim/50'
                        : 'bg-surface-container-high'
                    }`}
                    style={{ height: `${Math.max(height, day.calories > 0 ? 4 : 0)}%`, minHeight: day.calories > 0 ? '4px' : '0' }}
                  >
                    {(isToday || day.calories > 0) && (
                      <span className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold whitespace-nowrap ${
                        isDayOver ? 'text-error' : isToday ? 'text-primary' : 'opacity-0 group-hover:opacity-100'
                      } transition-opacity`}>
                        {day.calories >= 1000 ? `${(day.calories / 1000).toFixed(1)}k` : day.calories}
                        {isDayOver && '⚠'}
                      </span>
                    )}
                    {isToday && (
                      <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full animate-pulse ${isDayOver ? 'bg-error' : 'bg-primary'}`} />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold ${
                    isDayOver ? 'text-error' : isToday ? 'text-primary' : 'text-on-surface-variant'
                  }`}>
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex gap-4 flex-wrap text-[10px] text-on-surface-variant">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Today</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400/60 inline-block" /> Goal met</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error/50 inline-block" /> Over budget</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-primary/30 inline-block" /> Target</span>
          </div>
        </section>

        {/* Diagnostic Cards */}
        <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-4">
          <div className="w-10 h-10 rounded-xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
            <span className="material-symbols-outlined">nutrition</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase">Protein Today</p>
            <p className="text-2xl font-headline font-bold text-on-surface">
              {Math.round(dailyGoal.protein)}<span className="text-sm font-medium opacity-60">g</span>
            </p>
            <p className="text-[10px] text-on-surface-variant mt-1">
              of {targets.protein_target || 120}g target
            </p>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined">monitoring</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase">Accuracy</p>
            <p className={`text-2xl font-headline font-bold ${metabolicScore < 50 ? 'text-error' : metabolicScore < 80 ? 'text-amber-600' : 'text-on-surface'}`}>
              {metabolicScore}%
            </p>
            <p className="text-[10px] text-on-surface-variant mt-1">vs calorie target</p>
          </div>
        </div>
      </div>

      {/* AI Clinical Summary */}
      <section className="bg-inverse-surface text-surface rounded-[2.5rem] p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-20">
          <span className="material-symbols-outlined text-6xl">psychology_alt</span>
        </div>
        <h4 className="text-primary-fixed font-headline font-bold mb-2">Nova Clinical Advisory</h4>
        <p className="text-on-surface-variant leading-relaxed text-sm">
          {dailyGoal.calories === 0
            ? "No meals logged today. Start tracking your meals to receive personalised AI insights on your nutritional patterns."
            : isOverBudget
            ? `You've exceeded your daily target by ${(dailyGoal.calories - dailyGoal.target).toLocaleString()} kcal (${Math.round((dailyGoal.calories / dailyGoal.target) * 100)}% consumed). Focus on hydration and avoid further calorie intake today.`
            : dailyGoal.calories < dailyGoal.target * 0.5
            ? `You've consumed ${dailyGoal.calories.toLocaleString()} kcal — only ${percentage}% of your daily target. Make sure to eat a balanced meal before the day ends.`
            : `You're on track at ${percentage}% of your daily goal (${dailyGoal.calories.toLocaleString()} kcal). Keep prioritising lean protein and fibre-rich foods for optimal metabolic balance.`
          }
        </p>
        {streak > 0 && (
          <p className="text-on-surface-variant text-xs mt-3 opacity-70">
            🔥 {streak}-day streak — you're building great habits!
          </p>
        )}
        <button className="mt-6 flex items-center gap-2 text-primary-fixed text-xs font-bold uppercase tracking-widest">
          Full Diagnostic Report
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </section>
    </div>
  );
}