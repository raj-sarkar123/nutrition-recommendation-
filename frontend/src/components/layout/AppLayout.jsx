import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import TopNav from './TopNav';
import BottomNav from './BottomNav';

/*
  FIX: Added lightweight CSS-driven page transition.

  BEFORE: Outlet swapped page components instantly — the browser had to
  parse, layout, and paint a full new page in a single synchronous frame,
  which felt like a freeze/jump especially on mid-range Android devices.

  AFTER: Each route change triggers a 180ms fade+slide animation using a
  key on the wrapper div. React re-mounts the wrapper when the key changes,
  the CSS animation runs on the GPU (opacity + transform = compositor-only,
  zero reflow), and the transition feels intentional rather than abrupt.

  We use useRef to hold the container and apply the class directly via the
  DOM rather than useState, so the animation fires without triggering a
  React re-render (which would defeat the purpose).
*/

export default function AppLayout() {
  const location = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    // Remove then re-add class to retrigger the animation on every route change
    el.classList.remove('page-enter');
    // Force a reflow so the browser registers the class removal
    void el.offsetHeight;
    el.classList.add('page-enter');
  }, [location.pathname]);

  return (
    <div className="mesh-bg min-h-screen pb-[100px] overflow-x-hidden">
      <TopNav />
      <main
        ref={mainRef}
        className="max-w-md mx-auto px-6 mt-8 page-enter"
      >
        <Outlet />
      </main>
      <BottomNav />

      {/*
        Inline keyframe — keeps the animation co-located with the component
        that uses it, no global CSS changes needed.
        Using will-change: transform tells the browser to promote this layer
        before the animation starts, eliminating the first-frame jank.
      */}
      <style>{`
        .page-enter {
          animation: pageEnter 0.18s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform;
        }
        @keyframes pageEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}