import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

const PRIVACY_SECTIONS = [
  {
    icon: "database",
    title: "Data We Collect",
    body: "We collect basic profile information such as your name, email, and health-related inputs like weight, goals, and dietary preferences to personalize your experience.",
  },
  {
    icon: "lightbulb",
    title: "How We Use Your Data",
    body: "Your data is used to provide personalized nutrition tracking, AI-based recommendations, and improve app performance. We do NOT sell your data.",
  },
  {
    icon: "lock",
    title: "Data Security",
    body: "We use secure authentication and encrypted communication. While no system is 100% secure, we follow industry best practices to safeguard your information.",
  },
  {
    icon: "manage_accounts",
    title: "Your Rights",
    body: "You can update or delete your data anytime. You fully control your profile, preferences, and account information.",
  },
  {
    icon: "share",
    title: "Third-Party Services",
    body: "We may use trusted providers for auth, hosting, or analytics. Each operates under its own privacy and security policies.",
  },
  {
    icon: "update",
    title: "Policy Updates",
    body: "We may update this policy periodically. Any significant changes will be surfaced inside the app.",
  },
];

export default function PrivacyModal({ open, onClose }) {
  const overlayRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => closeButtonRef.current?.focus(), 60);
  }, [open]);

  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  if (!open) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes _pmFade  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes _pmSlide {
          from { opacity: 0; transform: translateY(28px) scale(0.97) }
          to   { opacity: 1; transform: translateY(0)   scale(1) }
        }
        ._pm-overlay { animation: _pmFade  0.2s ease both; }
        ._pm-card    { animation: _pmSlide 0.28s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className="_pm-overlay fixed inset-0 flex items-end sm:items-center justify-center sm:p-4"
        style={{
          zIndex: 9999,
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Privacy and Data"
      >
        {/* Modal Card */}
        <div
          className="_pm-card relative w-full sm:max-w-sm flex flex-col rounded-t-[1.75rem] sm:rounded-[1.75rem] overflow-hidden"
          style={{
            maxHeight: "88dvh",
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
          }}
        >
          {/* Header */}
          <div className="h-14 bg-primary/10 flex items-center px-5 gap-3 shrink-0">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
            >
              shield_person
            </span>
            <p className="font-headline font-bold text-primary tracking-tight text-base leading-none">
              Privacy & Data
            </p>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="ml-auto w-8 h-8 rounded-xl bg-white border border-surface-variant/30 hover:bg-surface-container active:scale-90 flex items-center justify-center transition-all duration-150"
            >
              <span className="material-symbols-outlined text-on-surface">
                close
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-1">
            {PRIVACY_SECTIONS.map((sec, i) => (
              <div
                key={sec.title}
                className={`flex items-start gap-3 py-4 ${i < PRIVACY_SECTIONS.length - 1
                    ? "border-b border-surface-variant/30"
                    : ""
                  }`}
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-primary text-[17px]">
                    {sec.icon}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">
                    {sec.title}
                  </p>
                  <p className="text-sm text-on-surface leading-relaxed">
                    {sec.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            className="shrink-0 px-5 py-4"
            style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
          >
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-primary text-white font-semibold text-sm tracking-wide hover:opacity-90 active:scale-[0.98] transition-all duration-150"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}