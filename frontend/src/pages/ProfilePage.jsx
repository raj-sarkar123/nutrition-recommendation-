import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import NovaButton from '../components/ui/NovaButton';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    full_name: user?.full_name || 'User',
    email: user?.email || '',
    membership_tier: 'premium',
    profile: { current_weight: 0, target_weight: 0, goal: '' }
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/users/profile');
      setProfile(data);
    } catch {
      // keep defaults from user context
    } finally {
      setLoaded(true);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = profile?.full_name || user?.full_name || 'User';

  return (
    <div className="space-y-8 pb-20">
      {/* Profile Header */}
     
<section className="relative">
  {/* Banner */}
  <div className="h-24 rounded-t-xl bg-gradient-to-r from-primary to-primary-fixed" />
  
  <div className="bg-surface-container-lowest/60 backdrop-blur-2xl rounded-b-xl px-8 pb-8 outline outline-1 outline-white/20 nova-shadow text-center">
    <div className="relative -mt-12 mb-4 inline-block">
      <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-primary to-primary-fixed shadow-xl">
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full border-4 border-white" />
        ) : (
          <div className="w-full h-full rounded-full border-4 border-white bg-primary-container flex items-center justify-center text-primary text-3xl font-headline font-bold">
            {displayName.charAt(0)}
          </div>
        )}
      </div>
      <div className="absolute bottom-1 right-1 w-6 h-6 bg-primary border-4 border-white rounded-full" />
    </div>
    <h1 className="text-2xl font-headline font-bold tracking-tight text-on-surface">{displayName}</h1>
    <p className="text-on-surface-variant font-medium text-sm">Premium Member since 2023</p>
    <div className="mt-6 inline-flex items-center gap-2 bg-secondary-container px-4 py-1.5 rounded-full">
      <span className="material-symbols-outlined text-[18px] text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
      <span className="text-[10px] font-bold tracking-widest uppercase text-on-secondary-container">NutriScan Elite</span>
    </div>
  </div>
</section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-4">
        <div className="col-span-2 bg-surface-container-low rounded-xl p-6 flex items-center justify-between group transition-all duration-300 hover:bg-surface-container-lowest">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">Current Weight</p>
            <p className="text-3xl font-headline font-bold text-primary tracking-tighter">
              {profile?.profile?.current_weight || 64.2} <span className="text-lg font-medium opacity-60">kg</span>
            </p>
          </div>
          <div className="h-12 w-24 overflow-hidden rounded-lg">
            <div className="w-full h-full bg-primary-fixed/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-shimmer" />
            </div>
          </div>
        </div>
        <div className="bg-surface-container-low rounded-xl p-6 transition-all duration-300 hover:bg-surface-container-lowest">
          <span className="material-symbols-outlined text-primary mb-3">flag</span>
          <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">Goal</p>
          <p className="text-xl font-headline font-bold text-on-surface">{profile?.profile?.goal || 'Lean Tone'}</p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-6 transition-all duration-300 hover:bg-surface-container-lowest">
          <span className="material-symbols-outlined text-primary mb-3">target</span>
          <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">Target</p>
          <p className="text-xl font-headline font-bold text-on-surface">{profile?.profile?.target_weight || 62.0} kg</p>
        </div>
      </section>

      {/* Settings */}
      <section className="space-y-3">
        <h2 className="text-sm font-headline font-bold text-on-surface-variant px-2">Account Preferences</h2>
        <div className="bg-surface-container-low rounded-xl overflow-hidden divide-y divide-surface-variant/30">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-surface-container-lowest/40 backdrop-blur-sm hover:bg-white transition-colors cursor-pointer group/item">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-fixed/50 flex items-center justify-center text-primary group-hover/item:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined">dark_mode</span>
              </div>
              <span className="font-medium">Dark Mode</span>
            </div>
            <div className="w-12 h-6 bg-surface-container rounded-full relative p-1 cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full shadow transition-transform" />
            </div>
          </div>

          {/* Settings Items */}
          {[
            { icon: 'shield_person', label: 'Privacy & Data' },
            { icon: 'notifications_active', label: 'Smart Insights' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between p-4 hover:bg-white/60 transition-colors group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary-container/50 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined">{item.icon}</span>
                </div>
                <span className="font-medium">{item.label}</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
            </div>
          ))}
        </div>
      </section>

      {/* Logout */}
      <section className="pt-4">
        <NovaButton variant="error" onClick={handleLogout}>
          <span className="material-symbols-outlined">logout</span>
          Logout {displayName}
        </NovaButton>
        <p className="text-center text-[10px] text-on-surface-variant mt-6 tracking-widest uppercase">NutriScan AI v2.4.0</p>
      </section>
    </div>
  );
}
