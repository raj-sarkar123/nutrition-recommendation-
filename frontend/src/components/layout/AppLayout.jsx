import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import BottomNav from './BottomNav';

/**
 * AppLayout wraps all authenticated pages.
 * 
 * KEY: There is NO loading state here. The ProtectedRoute in App.jsx handles
 * the initial auth load. Once the user is inside the layout, switching tabs
 * simply swaps the <Outlet /> — no spinner, no flash.
 */
export default function AppLayout() {
  return (
    <div className="mesh-bg min-h-screen pb-[100px]">
      <TopNav />
      <main className="max-w-md mx-auto px-6 mt-8">
        {/* Outlet renders the active page component directly — no suspense wrapper */}
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}