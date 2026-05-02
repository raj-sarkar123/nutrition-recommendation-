import { useLocation, useNavigate } from 'react-router-dom';
import { useScan } from '../../context/ScanContext';

const tabs = [
  { icon: 'home_health', label: 'Home', path: '/dashboard' },
  { icon: 'restaurant_menu', label: 'Scan', path: '/scan' },
  { icon: 'monitoring', label: 'Insights', path: '/progress' },
  { icon: 'psychology_alt', label: 'Coach', path: '/profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentScan } = useScan();

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/tracker';
    if (path === '/scan') return location.pathname === '/scan' || location.pathname === '/analysis';
    return location.pathname === path;
  };

  const handleTabClick = (path) => {
    // If tapping Scan tab and there's an active scan result, go to analysis
    if (path === '/scan' && currentScan) {
      navigate('/analysis');
    } else {
      navigate(path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-6 pb-8 pt-4 max-w-md mx-auto bg-white/60 backdrop-blur-3xl rounded-t-[2rem] border-t border-white/15 shadow-[0px_-12px_32px_rgba(0,77,54,0.05)]">
      {tabs.map((tab) => (
        <button
          key={tab.path}
          onClick={() => handleTabClick(tab.path)}
          className={`flex flex-col items-center justify-center p-3 transition-all ease-out-expo duration-300 cursor-pointer ${
            isActive(tab.path)
              ? 'bg-emerald-500 text-white rounded-2xl shadow-[0_0_15px_rgba(0,105,75,0.4)] scale-110'
              : 'text-slate-400 hover:text-emerald-600 hover:scale-105'
          }`}
        >
          <span
            className="material-symbols-outlined"
            style={isActive(tab.path) ? { fontVariationSettings: "'FILL' 1" } : {}}
          >
            {tab.icon}
          </span>
          <span className="text-[10px] font-medium tracking-widest uppercase mt-1 font-label">
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
