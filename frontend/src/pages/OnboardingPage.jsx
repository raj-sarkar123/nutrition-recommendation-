import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import NovaInput from '../components/ui/NovaInput';
import NovaButton from '../components/ui/NovaButton';

const goals = [
  { id: 'lose', title: 'Lose Weight', subtitle: 'Targeted Reduction', desc: 'Optimize fat oxidation and caloric deficit parameters while preserving lean muscle mass.', icon: 'trending_down' },
  { id: 'maintain', title: 'Maintain', subtitle: 'Balance', desc: 'Sustainable energy balance and vitality metrics.', icon: 'balance' },
  { id: 'gain', title: 'Gain', subtitle: 'Growth', desc: 'Hypertrophy-focused nutrient density protocols.', icon: 'fitness_center' },
];

const diets = ['Keto', 'Vegan', 'Paleo', 'Mediterranean', 'Low-Carb', 'Intermittent Fasting'];

export default function OnboardingPage() {
  const [selectedGoal, setSelectedGoal] = useState('lose');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [selectedDiets, setSelectedDiets] = useState(['Keto']);
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  const toggleDiet = (diet) => {
    setSelectedDiets(prev =>
      prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.put('/users/onboarding', {
        goal: selectedGoal,
        current_weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        dietary_preferences: selectedDiets,
      });
      updateUser({ isNewUser: false });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      updateUser({ isNewUser: false }); // Clear flag even on error in demo mode
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mesh-gradient font-body text-on-surface min-h-screen flex flex-col">
      <main className="flex-grow flex flex-col items-center px-6 pt-12 pb-32 max-w-xl mx-auto w-full">
        {/* Progress Indicator */}
        <div className="w-full flex justify-center gap-2 mb-12">
          <div className="h-1.5 w-8 bg-primary rounded-full transition-all duration-500" />
          <div className="h-1.5 w-6 bg-surface-container rounded-full" />
          <div className="h-1.5 w-6 bg-surface-container rounded-full" />
          <div className="h-1.5 w-6 bg-surface-container rounded-full" />
        </div>

        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold tracking-[-0.04em] font-headline text-on-surface mb-3">Goal Selection</h1>
          <p className="text-on-surface-variant font-medium">Define your metabolic path with clinical precision.</p>
        </div>

        {/* Goal Cards */}
        <div className="grid grid-cols-1 gap-4 w-full mb-12">
          {/* Featured Goal */}
          {goals.filter(g => g.id === selectedGoal).map(goal => (
            <div key={goal.id} className="glass-panel p-6 rounded-2xl border-2 border-primary shadow-[0_0_20px_rgba(0,105,75,0.15)] relative overflow-hidden group cursor-pointer transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent opacity-50" />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-primary font-bold text-sm tracking-widest uppercase">{goal.subtitle}</span>
                  <h3 className="text-2xl font-bold font-headline text-on-surface tracking-tight">{goal.title}</h3>
                </div>
                <div className="bg-primary text-white p-2 rounded-xl shadow-[0_8px_16px_rgba(0,105,75,0.3)]">
                  <span className="material-symbols-outlined">{goal.icon}</span>
                </div>
              </div>
              <p className="mt-4 text-on-surface-variant text-sm leading-relaxed max-w-[80%]">{goal.desc}</p>
              <div className="mt-4 flex gap-2">
                <span className="px-3 py-1 bg-primary-container text-on-primary-container rounded-full text-[10px] font-bold tracking-wider uppercase">Active Selection</span>
              </div>
            </div>
          ))}

          {/* Other Goals */}
          <div className="grid grid-cols-2 gap-4">
            {goals.filter(g => g.id !== selectedGoal).map(goal => (
              <div
                key={goal.id}
                onClick={() => setSelectedGoal(goal.id)}
                className="bg-surface-container-low p-6 rounded-2xl border border-white/20 hover:bg-surface-container-lowest transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1"
              >
                <div className="bg-surface-container-high p-2 w-fit rounded-xl mb-4 group-hover:bg-primary-container transition-all duration-300 group-hover:scale-110">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">{goal.icon}</span>
                </div>
                <h3 className="text-xl font-bold font-headline text-on-surface tracking-tight">{goal.title}</h3>
                <p className="mt-2 text-on-surface-variant text-xs leading-relaxed">{goal.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Biometrics */}
        <section className="w-full space-y-8 mb-12">
          <h2 className="text-lg font-bold font-headline text-on-surface border-l-4 border-primary pl-4">Physical Biometrics</h2>
          <div className="grid grid-cols-2 gap-8">
            <NovaInput label="Current Weight" placeholder="00.0" value={weight} onChange={(e) => setWeight(e.target.value)} unit="kg" />
            <NovaInput label="Height" placeholder="000" value={height} onChange={(e) => setHeight(e.target.value)} unit="cm" />
          </div>
        </section>

        {/* Dietary Preferences */}
        <section className="w-full space-y-6 mb-16">
          <h2 className="text-lg font-bold font-headline text-on-surface border-l-4 border-primary pl-4">Dietary Architecture</h2>
          <div className="flex flex-wrap gap-3">
            {diets.map(diet => (
              <button
                key={diet}
                onClick={() => toggleDiet(diet)}
                className={`px-5 py-2.5 rounded-full text-sm transition-all active:scale-95 ${
                  selectedDiets.includes(diet)
                    ? 'glass-panel border border-primary text-primary font-semibold shadow-sm scale-105'
                    : 'bg-surface-container-low border border-white/30 text-on-surface-variant font-medium hover:bg-white/50 hover:border-primary/50 hover:text-primary'
                }`}
              >
                {diet}
              </button>
            ))}
          </div>
        </section>

        {/* Submit */}
        <NovaButton onClick={handleSubmit} loading={loading}>
          Initialize Profile
          <span className="material-symbols-outlined">arrow_forward</span>
        </NovaButton>
      </main>

      {/* Ambient Background */}
      <div className="fixed top-1/4 -left-20 w-64 h-64 bg-primary-fixed/20 blur-[120px] -z-10 rounded-full" />
      <div className="fixed bottom-1/4 -right-20 w-80 h-80 bg-tertiary-fixed/15 blur-[120px] -z-10 rounded-full" />
    </div>
  );
}
