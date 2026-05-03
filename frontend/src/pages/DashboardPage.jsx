import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import ProgressRing from '../components/ui/ProgressRing';
import MacroBar from '../components/ui/MacroBar';

export default function DashboardPage() {
  const [progress, setProgress] = useState({ total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0 });
  const [targets, setTargets] = useState({ daily_calorie_target: 2200, protein_target: 120, carbs_target: 200, fats_target: 65 });
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDailyProgress();
  }, []);

  const fetchDailyProgress = async () => {
    try {
      const { data } = await api.get('/progress/daily');
      setProgress(data.progress || { total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0 });
      setTargets(data.targets || { daily_calorie_target: 2200, protein_target: 120, carbs_target: 200, fats_target: 65 });
    } catch {
      // keep defaults
    } finally {
      setLoaded(true);
    }
  };

  // const rawRemaining = (targets?.daily_calorie_target || 2200) - (progress?.total_calories || 0);
  // const remaining = Math.max(rawRemaining, 0);
const totalCals = progress?.total_calories || 0;
  const targetCals = targets?.daily_calorie_target || 2200;
  
  const rawRemaining = targetCals - totalCals;
  const isOverBudget = rawRemaining < 0;
  const displayAmount = Math.abs(rawRemaining);
  
  // Cap the value at the max target so the ProgressRing doesn't break visually
  const cappedValue = Math.min(totalCals, targetCals);
  return (
    <div className="space-y-8">
      {/* Hero: Calorie Ring */}
      <section className="relative group">
        <div className="absolute -inset-4 bg-primary-container/20 blur-3xl rounded-full opacity-50 group-hover:opacity-70 transition-opacity" />
        <div className="glass-panel rounded-xl p-8 outline outline-1 outline-white/20 nova-shadow flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />
          {!loaded ? (
            /* Skeleton placeholder while data loads */
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="w-48 h-48 rounded-full bg-surface-container" />
              <div className="h-5 w-32 bg-surface-container rounded-lg" />
              <div className="h-3 w-48 bg-surface-container rounded-lg" />
            </div>
          ) : (
            <>
              {/* If your ProgressRing component supports a color prop, you can pass it here. 
                  Otherwise, we pass the capped value so the ring stays at 100% full visually. */}
              <ProgressRing
                value={cappedValue}
                max={targetCals}
                label={displayAmount.toLocaleString()}
                sublabel={isOverBudget ? "KCAL OVER" : "kcal left"}
              />
              
              <div className="mt-6 text-center">
                <h2 className={`font-headline text-xl font-bold tracking-tight ${isOverBudget ? 'text-red-500' : 'text-on-surface'}`}>
                  {isOverBudget 
                    ? 'Over Budget'
                    : rawRemaining > targetCals * 0.7
                      ? 'Ready to Fuel Up'
                      : rawRemaining > targetCals * 0.3
                        ? 'On Track'
                        : rawRemaining > 0
                          ? 'Almost There'
                          : 'Goal Reached'}
                </h2>
                <p className={`text-sm mt-1 ${isOverBudget ? 'text-red-500/80 font-medium' : 'text-on-surface-variant'}`}>
                  {isOverBudget
                    ? `You are ${displayAmount.toLocaleString()} kcal over your daily target.`
                    : rawRemaining > targetCals * 0.7
                      ? "You haven't logged much yet — time to start your day strong."
                      : rawRemaining > targetCals * 0.3
                        ? `${Math.round((totalCals / targetCals) * 100)}% consumed — great pacing so far.`
                        : rawRemaining > 0
                          ? `Only ${displayAmount.toLocaleString()} kcal left — finish with a light, high-protein meal.`
                          : 'Daily calorie target met. Focus on hydration and recovery.'}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* AI Insight */}
      <section className="px-2">
        <div className="ai-glow bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-4 transition-transform hover:scale-[1.02]">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <div>
            <h4 className="font-headline font-bold text-emerald-800 text-xs uppercase tracking-wider mb-0.5">Quick AI Check</h4>
            <p className="text-emerald-900/80 text-xs leading-tight">
              {(progress?.total_calories || 0) === 0
                ? 'No meals logged yet today. Scan a menu or add a meal to get personalised insights.'
                : (progress?.total_protein || 0) < (targets?.protein_target || 120) * 0.5
                  ? `Protein is at ${Math.round(progress?.total_protein || 0)}g — well below your ${targets?.protein_target || 120}g target. Prioritise lean protein in your next meal.`
                  // AFTER (fixed — use rawRemaining / displayAmount)
: rawRemaining > 0 && rawRemaining < (targets?.daily_calorie_target || 2200) * 0.3
  ? `${displayAmount.toLocaleString()} kcal remaining. Opt for fibre-rich, low-calorie options to finish strong.`
  : `You've consumed ${Math.round(((progress?.total_calories || 0) / (targets?.daily_calorie_target || 2200)) * 100)}% of your daily calories with ${Math.round(progress?.total_protein || 0)}g protein. ${rawRemaining > 0 ? 'Keep it balanced.' : 'Consider stopping for today.'}`}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/scan')}
          className="glass-panel p-6 rounded-xl outline outline-1 outline-white/20 shadow-[0px_12px_24px_rgba(0,77,54,0.04)] flex flex-col items-start gap-4 group hover:bg-white hover:scale-105 hover:shadow-[0px_20px_40px_rgba(0,77,54,0.1)] transition-all duration-300 ease-out-expo active:scale-95"
        >
          <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_a_photo</span>
          </div>
          <div>
            <span className="font-headline font-bold text-on-surface block">Scan Menu</span>
            <span className="text-xs text-on-surface-variant group-hover:text-primary transition-colors">Real-time Analysis</span>
          </div>
        </button>
        <button
          onClick={() => navigate('/tracker')}
          className="glass-panel p-6 rounded-xl outline outline-1 outline-white/20 shadow-[0px_12px_24px_rgba(0,77,54,0.04)] flex flex-col items-start gap-4 group hover:bg-white hover:scale-105 hover:shadow-[0px_20px_40px_rgba(0,77,54,0.1)] transition-all duration-300 ease-out-expo active:scale-95"
        >
          <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center text-secondary group-hover:scale-110 group-hover:bg-secondary group-hover:text-white transition-all duration-300">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant</span>
          </div>
          <div>
            <span className="font-headline font-bold text-on-surface block">Track Meal</span>
            <span className="text-xs text-on-surface-variant group-hover:text-secondary transition-colors">Instant Logging</span>
          </div>
        </button>
      </section>

      {/* Macro Breakdown */}
      <section className="space-y-4">
        <h3 className="font-headline text-sm font-bold tracking-widest uppercase text-on-surface-variant px-2">Nutrient Precision</h3>
        <div className="space-y-3">
          <MacroBar label="Protein" current={progress?.total_protein || 0} target={targets?.protein_target || 120} color="bg-primary" />
          <MacroBar label="Carbs" current={progress?.total_carbs || 0} target={targets?.carbs_target || 200} color="bg-secondary" />
          <MacroBar label="Fats" current={progress?.total_fats || 0} target={targets?.fats_target || 65} color="bg-tertiary-dim" />
        </div>
      </section>

      {/* AI Insight Banner */}
      <section className="pb-10">
        <div className="bg-primary-container/30 backdrop-blur-md border border-primary-container p-5 rounded-xl flex gap-4 items-start shadow-[0_0_15px_rgba(140,254,206,0.3)]">
          <div className="text-primary mt-1">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <div>
            <h4 className="font-headline font-bold text-on-primary-container text-sm">AI Insight</h4>
            <p className="text-on-primary-container/80 text-xs mt-1 leading-relaxed">
              Increasing fiber intake by 5g during your next meal will stabilize glucose spikes observed after your afternoon snack.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
