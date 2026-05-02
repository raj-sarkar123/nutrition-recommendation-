import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NovaInput from '../components/ui/NovaInput';
import NovaButton from '../components/ui/NovaButton';

export default function SignupPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.full_name || !form.email || !form.password) return setError('All fields are required.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await signup(form.full_name, form.email, form.password);
      navigate('/onboarding');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 sm:p-12 relative bg-surface">
      <div className="fixed inset-0 z-0 mesh-gradient pointer-events-none" />

      <main className="relative z-10 w-full max-w-xl">
        {/* Logo */}
        <div className="flex flex-col items-center mb-12 text-center">
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-primary-fixed blur-2xl opacity-40 rounded-full" />
            <div className="relative w-16 h-16 glass-panel rounded-2xl flex items-center justify-center outline outline-1 outline-white/20 shadow-2xl">
              <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>biotech</span>
            </div>
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.04em] text-on-surface mb-3">
            Nova <span className="text-primary">Edition</span>
          </h1>
          <p className="font-body text-on-surface-variant max-w-sm leading-relaxed">
            Experience the future of molecular nutrition with NutriScan AI.
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-panel rounded-[2.5rem] p-8 md:p-12 nova-shadow outline outline-1 outline-white/25">
          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <button className="flex items-center justify-center gap-3 py-3.5 px-4 bg-surface-container-lowest/50 hover:bg-surface-container-lowest transition-all duration-300 rounded-2xl outline outline-1 outline-outline-variant/10 text-sm font-medium">
              <span>Google</span>
            </button>
            <button className="flex items-center justify-center gap-3 py-3.5 px-4 bg-surface-container-lowest/50 hover:bg-surface-container-lowest transition-all duration-300 rounded-2xl outline outline-1 outline-outline-variant/10 text-sm font-medium">
              <span>Apple ID</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center mb-10">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline-variant/20" /></div>
            <span className="relative px-4 bg-transparent text-[10px] font-bold tracking-widest text-outline uppercase font-label">Or join via email</span>
          </div>

          {/* Fields */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <NovaInput label="Full Identity" placeholder="Dr. Julian Thorne" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <NovaInput label="Medical Email" type="email" placeholder="julian@nutriscan.ai" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <NovaInput label="Secure Passkey" type="password" placeholder="••••••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

            {error && (
              <div className="bg-error-container/10 border border-error/20 rounded-xl p-3 text-error text-sm text-center">{error}</div>
            )}

            <div className="pt-8">
              <NovaButton type="submit" loading={loading} className="relative overflow-hidden group">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Join NutriScan
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </span>
              </NovaButton>
            </div>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm text-on-surface-variant">
              Already part of the ecosystem?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline decoration-primary/30 underline-offset-4">Sign In</Link>
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-outline/60 px-12 font-label uppercase tracking-widest">
          By joining, you consent to our <a className="hover:text-primary underline" href="#">Biometric Privacy Protocol</a> and <a className="hover:text-primary underline" href="#">Clinical Terms</a>.
        </p>
      </main>

      {/* Scan Line */}
      <div className="fixed top-0 left-0 w-full h-[2px] z-[100] opacity-30">
        <div className="h-full bg-gradient-to-r from-transparent via-primary to-transparent w-1/4 animate-scan-line" />
      </div>
    </div>
  );
}
