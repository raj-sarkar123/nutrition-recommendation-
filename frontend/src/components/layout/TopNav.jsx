import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TopNav() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 flex justify-between items-center px-6 py-3 max-w-md mx-auto bg-white/60 backdrop-blur-3xl rounded-2xl mt-4 outline outline-1 outline-white/15 nova-shadow">
      <div
        className="text-2xl font-bold tracking-tighter text-emerald-700 drop-shadow-[0_0_8px_rgba(140,254,206,0.6)] font-headline cursor-pointer"
        onClick={() => navigate('/dashboard')}
      >
        Nova
      </div>
      <div className="flex items-center gap-4">
        <button className="text-slate-500 hover:bg-emerald-50/50 p-2 rounded-xl transition-all duration-300 ease-out-expo active:scale-95">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div
          className="w-10 h-10 rounded-xl overflow-hidden outline outline-2 outline-primary-container/30 cursor-pointer"
          onClick={() => navigate('/profile')}
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary-container flex items-center justify-center text-primary font-bold text-sm">
              {user?.full_name?.charAt(0) || 'N'}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
