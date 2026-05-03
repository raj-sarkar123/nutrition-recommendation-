import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NovaInput from '../components/ui/NovaInput';
import NovaButton from '../components/ui/NovaButton';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) return setError('Please fill in all fields.');
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      navigate(data.onboarding_completed ? '/dashboard' : '/onboarding');
    } catch (err) {
      const apiError = err.response?.data?.error;
      setError(typeof apiError === 'string' ? apiError : apiError?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-surface">
      {/* Mesh Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary-fixed/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary-container/30 blur-[100px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-primary-container/10 blur-[80px] rounded-full" />
      </div>

      <main className="w-full max-w-[480px] px-6 relative z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="relative mb-12 w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-24 h-24 glass-panel rounded-full flex items-center justify-center outline outline-1 outline-white/30 shadow-2xl">
            <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              cognition
            </span>
          </div>
          <div className="absolute w-full h-full border border-primary/20 rounded-full scale-125 border-dashed" />
        </div>

        {/* Hero */}
        <header className="text-center mb-10">
          <h1 className="font-headline font-extrabold text-[3rem] leading-tight tracking-[-0.04em] text-on-surface mb-2">
            Your AI, Your <span className="text-primary">Nutrients.</span>
          </h1>
          <p className="font-body text-on-surface-variant text-lg max-w-[320px] mx-auto">
            Precision nutrition scanning powered by Nova's clinical intelligence.
          </p>
        </header>

        {/* Form */}
        <section className="w-full glass-panel rounded-[2rem] p-8 nova-shadow outline outline-1 outline-white/15">
          <form onSubmit={handleSubmit} className="space-y-6">
            <NovaInput
              label="Email Address"
              type="email"
              icon="alternate_email"
              placeholder="name@medical.ai"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <NovaInput
              label="Password"
              type="password"
              icon="lock_open"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            {error && (
              <div className="bg-error-container/10 border border-error/20 rounded-xl p-3 text-error text-sm text-center">
                {error}
              </div>
            )}

            <NovaButton type="submit" loading={loading}>
              Sign In
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
            </NovaButton>
          </form>

          {/* Social Login */}
          <div className="mt-8 pt-8 border-t border-outline-variant/10">
            <p className="text-center text-xs text-on-surface-variant mb-6 font-medium tracking-wide">OR CONTINUE WITH</p>
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 py-3 px-4 glass-panel outline outline-1 outline-outline-variant/20 rounded-xl hover:bg-white transition-all duration-300 ease-out-expo active:scale-95">
                <span className="text-sm font-semibold tracking-tight">Google</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-3 px-4 glass-panel outline outline-1 outline-outline-variant/20 rounded-xl hover:bg-white transition-all duration-300 ease-out-expo active:scale-95">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>ios</span>
                <span className="text-sm font-semibold tracking-tight">Apple</span>
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 text-center pb-12">
          <p className="text-on-surface-variant font-medium">
            New to the platform?{' '}
            <Link to="/signup" className="text-primary font-bold hover:underline ml-1">Create Account</Link>
          </p>
          <div className="mt-12 flex justify-center gap-6 text-[10px] text-outline uppercase tracking-widest font-bold">
            <a className="hover:text-primary transition-colors" href="#">Privacy</a>
            <a className="hover:text-primary transition-colors" href="#">Terms</a>
            <a className="hover:text-primary transition-colors" href="#">Support</a>
          </div>
        </footer>
      </main>

      {/* Scan Line */}
      <div className="fixed top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-30 blur-sm" />
    </div>
  );
}
