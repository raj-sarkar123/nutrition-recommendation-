import { useState, useEffect } from 'react';
import api from '../api/axios';
import ProgressRing from '../components/ui/ProgressRing';

// Day labels — Mon-first order
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Map JS Date.getDay() (0=Sun) to our Mon-first index
function todayMonIndex() {
  const d = new Date().getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1;   // Sun→6, Mon→0 … Sat→5
}

export default function ProgressPage() {
  const [weekly,   setWeekly]   = useState(DAY_LABELS.map(d => ({ day: d, calories: 0, goal_met: false })));
  const [streak,   setStreak]   = useState(0);
  const [dailyGoal, setDailyGoal] = useState({ calories: 0, target: 2200, protein: 0, carbs: 0, fats: 0 });
  const [targets,  setTargets]  = useState({ protein_target: 120, carbs_target: 200, fats_target: 65 });
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    Promise.all([fetchWeekly(), fetchStreak(), fetchDaily()])
      .finally(() => setLoaded(true));
  }, []);

  const fetchWeekly = async () => {
    try {
      const { data } = await api.get('/progress/weekly');
      // Normalise to exactly 7 entries in Mon-first order
      const raw = data.weekly || [];
      const normalised = DAY_LABELS.map((label, i) => {
        const found = raw.find(d => d.day === label);
        return found || { day: label, calories: 0, goal_met: false };
      });
      setWeekly(normalised);
    } catch {
      // keep defaults
    }
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

  const maxCalories = Math.max(...weekly.map(d => d.calories), 1);
  const percentage  = Math.min(Math.round((dailyGoal.calories / dailyGoal.target) * 100), 100);
  const todayIdx    = todayMonIndex();

  // Protein peak from weekly — just use today's value from daily or max from weekly
  const proteinPeak = Math.round(dailyGoal.protein) || 0;

  // Metabolic score: how close today's calories are to target (0–100%)
  const metabolicScore = dailyGoal.target > 0
    ? Math.min(100, Math.round((1 - Math.abs(dailyGoal.calories - dailyGoal.target) / dailyGoal.target) * 100))
    : 0;

  // Weekly average
  const weeklyAvg = weekly.length
    ? Math.round(weekly.reduce((s, d) => s + d.calories, 0) / weekly.length)
    : 0;

  // vs last week — we only have this week's data; show a placeholder if 0
  const weekTotal = weekly.reduce((s, d) => s + d.calories, 0);

  return (
    <div className="space-y-10 pb-20">
      {/* Hero */}
      <section className="space-y-2">
        <h1 className="text-[3.5rem] font-headline font-extrabold tracking-[-0.04em] leading-[0.9] text-primary">Insights</h1>
        <p className="text-on-surface-variant font-medium tracking-tight">Your NutriScan AI analysis for this week.</p>
      </section>

      {/* Goal Ring */}
      <section className="relative flex justify-center py-8">
        <ProgressRing
          value={dailyGoal.calories}
          max={dailyGoal.target}
          size={256}
          strokeWidth={24}
          label={`${percentage}%`}
          sublabel={`${dailyGoal.calories.toLocaleString()} / ${dailyGoal.target.toLocaleString()} kcal`}
        />
      </section>

      {/* Today macro summary */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { label: 'Protein', value: dailyGoal.protein, target: targets.protein_target || 120, unit: 'g', color: 'bg-primary' },
          { label: 'Carbs',   value: dailyGoal.carbs,   target: targets.carbs_target   || 200, unit: 'g', color: 'bg-secondary' },
          { label: 'Fats',    value: dailyGoal.fats,    target: targets.fats_target    || 65,  unit: 'g', color: 'bg-tertiary-dim' },
        ].map(m => {
          const pct = Math.min(Math.round(((m.value || 0) / m.target) * 100), 100);
          return (
            <div key={m.label} className="bg-surface-container-lowest rounded-2xl p-4 space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">{m.label}</p>
              <p className="text-xl font-headline font-bold text-on-surface">
                {Math.round(m.value || 0)}<span className="text-sm font-medium opacity-60">{m.unit}</span>
              </p>
              <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div className={`h-full ${m.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[9px] text-on-surface-variant">{pct}% of {m.target}{m.unit}</p>
            </div>
          );
        })}
      </section>

      {/* Streak Tracker */}
      <section className="bg-surface-container-lowest/60 backdrop-blur-2xl rounded-[2rem] p-6 nova-shadow outline outline-1 outline-white/15">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-xl font-headline font-semibold tracking-tight text-on-surface">Current Streak</h2>
            <p className="text-on-surface-variant text-xs font-medium font-label">
              {streak > 0 ? 'Keep it up!' : 'Log today to start your streak!'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-headline font-bold text-primary">{streak}</span>
            <span className="text-xs font-bold text-on-surface-variant uppercase font-label block">Days</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          {weekly.map((day, i) => {
            const isToday  = i === todayIdx;
            const isPast   = i < todayIdx;
            const isFuture = i > todayIdx;
            const isGoalMet = day.goal_met;

            return (
              <div key={day.day} className={`flex flex-col items-center gap-2 ${isFuture ? 'opacity-40' : ''}`}>
                <span className="text-[10px] font-bold text-on-surface-variant font-label">{day.day}</span>
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    isGoalMet && (isPast || isToday)
                      ? 'bg-primary text-white shadow-lg'
                      : isToday
                      ? 'bg-primary-fixed text-primary outline outline-1 outline-primary/20'
                      : isPast && day.calories > 0
                      ? 'bg-surface-container-high text-on-surface-variant'
                      : 'bg-surface-container-high'
                  }`}
                >
                  {isGoalMet && (isPast || isToday) && (
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  )}
                  {isToday && !isGoalMet && <span className="material-symbols-outlined text-sm">bolt</span>}
                  {isPast && !isGoalMet && day.calories > 0 && (
                    <span className="text-[10px] font-bold">{Math.round(day.calories / 100) * 100 > 999 ? `${(day.calories / 1000).toFixed(1)}k` : day.calories}</span>
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
              <p className="text-xs text-on-surface-variant font-label">CALORIE ACCURACY OVER TIME</p>
            </div>
            {weeklyAvg > 0 && (
              <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-label">
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
              className="absolute left-2 right-2 h-[2px] bg-primary/30 border-dashed z-10"
              style={{ bottom: `${(dailyGoal.target / maxCalories) * 100}%` }}
            />

            {/* Bars */}
            {weekly.map((day, i) => {
              const height      = maxCalories > 0 ? (day.calories / maxCalories) * 100 : 0;
              const isToday     = i === todayIdx;
              const isGoalMet   = day.goal_met;

              return (
                <div key={day.day} className="w-full h-full flex flex-col justify-end items-center gap-2 relative z-10">
                  <div
                    className={`w-full rounded-t-xl transition-all duration-500 relative group ${
                      isToday
                        ? 'bg-primary shadow-[0_0_20px_rgba(0,105,75,0.3)]'
                        : isGoalMet
                        ? 'bg-emerald-400/60 hover:bg-emerald-400/80'
                        : day.calories > 0
                        ? 'bg-primary-dim/30 hover:bg-primary-dim/50'
                        : 'bg-surface-container-high'
                    }`}
                    style={{ height: `${Math.max(height, day.calories > 0 ? 4 : 0)}%`, minHeight: day.calories > 0 ? '4px' : '0' }}
                  >
                    {(isToday || day.calories > 0) && (
                      <span className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold ${
                        isToday ? 'text-primary' : 'opacity-0 group-hover:opacity-100'
                      } transition-opacity whitespace-nowrap`}>
                        {day.calories >= 1000 ? `${(day.calories / 1000).toFixed(1)}k` : day.calories}
                      </span>
                    )}
                    {isToday && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold font-label ${isToday ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex gap-4 text-[10px] text-on-surface-variant">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Today</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400/60 inline-block" /> Goal met</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-primary/30 inline-block" /> Target</span>
          </div>
        </section>

        {/* Diagnostic Cards */}
        <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-4">
          <div className="w-10 h-10 rounded-xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
            <span className="material-symbols-outlined">nutrition</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase font-label">Protein Today</p>
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
            <p className="text-xs font-bold text-on-surface-variant uppercase font-label">Accuracy</p>
            <p className="text-2xl font-headline font-bold text-on-surface">{metabolicScore}%</p>
            <p className="text-[10px] text-on-surface-variant mt-1">vs calorie target</p>
          </div>
        </div>
      </div>

      {/* AI Clinical Summary — dynamic copy based on real data */}
      <section className="bg-inverse-surface text-surface rounded-[2.5rem] p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-20">
          <span className="material-symbols-outlined text-6xl">psychology_alt</span>
        </div>
        <h4 className="text-primary-fixed font-headline font-bold mb-2">Nova Clinical Advisory</h4>
        <p className="text-on-surface-variant leading-relaxed text-sm">
          {dailyGoal.calories === 0
            ? "No meals logged today. Start tracking your meals to receive personalised AI insights on your nutritional patterns."
            : dailyGoal.calories < dailyGoal.target * 0.5
            ? `You've consumed ${dailyGoal.calories.toLocaleString()} kcal — only ${percentage}% of your daily target. Make sure to eat a balanced meal before the day ends.`
            : dailyGoal.calories > dailyGoal.target * 1.1
            ? `You've exceeded your daily target by ${(dailyGoal.calories - dailyGoal.target).toLocaleString()} kcal. Consider low-calorie, high-protein options for your remaining meals.`
            : `You're on track at ${percentage}% of your daily goal (${dailyGoal.calories.toLocaleString()} kcal). Keep prioritising lean protein and fibre-rich foods for optimal metabolic balance.`
          }
        </p>
        {streak > 0 && (
          <p className="text-on-surface-variant text-xs mt-3 opacity-70">
            🔥 {streak}-day streak — you're building great habits!
          </p>
        )}
        <button className="mt-6 flex items-center gap-2 text-primary-fixed text-xs font-bold font-label uppercase tracking-widest">
          Full Diagnostic Report
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </section>
    </div>
  );
}