import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import NovaButton from "../components/ui/NovaButton";
import NovaInput from "../components/ui/NovaInput";
import PrivacyModal from "../components/ui/PrivacyModal";

/* ─────────────────────────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────────────────────────── */
const GOAL_OPTIONS = [
  { value: "lose", label: "Lose Weight", icon: "trending_down" },
  { value: "maintain", label: "Maintain", icon: "balance" },
  { value: "gain", label: "Gain Muscle", icon: "trending_up" },
];

function profileToForm(data) {
  return {
    full_name: data.full_name ?? "",
    current_weight: data.profile?.current_weight ?? "",
    height: data.profile?.height ?? "",
    goal: data.profile?.goal || "maintain",
    daily_calorie_target: data.profile?.daily_calorie_target ?? "",
    protein_target: data.profile?.protein_target ?? "",
    carbs_target: data.profile?.carbs_target ?? "",
    fats_target: data.profile?.fats_target ?? "",
  };
}

/* ─────────────────────────────────────────────────────────────
   PROFILE PAGE
───────────────────────────────────────────────────────────── */
const PROFILE_CACHE_KEY = 'nutriscan_profile_cache';

function loadCachedProfile() {
  try {
    const cached = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch { /* ignore */ }
  return null;
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const cachedProfile = loadCachedProfile();
  const [profile, setProfile] = useState(cachedProfile);
  // Skip the full-screen spinner if we have cached profile data
  const [loaded, setLoaded] = useState(!!cachedProfile);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  const [form, setForm] = useState(profileToForm(cachedProfile || { profile: {} }));

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  // FIX #1: Track the blob URL separately so we can revoke it on cleanup
  const avatarBlobUrlRef = useRef(null);
  // Holds the avatar URL at the moment deletion starts so the image
  // stays visible for the full fade-out transition before state clears.
  const frozenAvatarRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const setField = (key) => (e) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  useEffect(() => {
    fetchProfile();
    // FIX #2: Revoke any lingering blob URL on unmount
    return () => {
      if (avatarBlobUrlRef.current) {
        URL.revokeObjectURL(avatarBlobUrlRef.current);
      }
    };
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get("/users/profile");
      setProfile(data);
      setForm(profileToForm(data));
      // Cache for instant render on next navigation
      try { sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
    } catch {
      /* keep defaults */
    } finally {
      setLoaded(true);
    }
  };

  const showToast = (msg, type = "success") => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(""), 2800);
  };

  /* ── Revoke current blob URL helper ── */
  const revokeBlobUrl = () => {
    if (avatarBlobUrlRef.current) {
      URL.revokeObjectURL(avatarBlobUrlRef.current);
      avatarBlobUrlRef.current = null;
    }
  };

  /* ── Avatar upload ── */
  const handleAvatarClick = () => setShowAvatarOptions(true);

  const handleRemoveAvatar = async () => {
    // Snapshot current avatar so the frozen ref keeps the <img> src stable
    // during the CSS transition regardless of when the API responds.
    frozenAvatarRef.current = resolvedAvatar;

    // 1. Close sheet + start fade-out immediately
    setShowAvatarOptions(false);
    setAvatarRemoving(true);

    // 2. Fire the API call in the background — don't block the UI on it.
    const apiPromise = api.delete("/users/avatar");

    // 3. Wait only for the CSS transition to finish (300ms + small buffer).
    await new Promise((r) => setTimeout(r, 320));

    // 4. Transition is done — clear avatar data first so the initials div
    //    renders into the DOM while the container is still invisible (opacity 0).
    updateUser({ avatar_url: null });
    setProfile((p) => {
      const updated = { ...p, avatar_url: null };
      try { sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
    revokeBlobUrl();
    setAvatarPreview(null);
    frozenAvatarRef.current = null;

    // 5. One rAF later the initials are painted; now fade the circle back in.
    requestAnimationFrame(() => {
      setAvatarRemoving(false);
    });

    // 6. Handle the API result asynchronously — toast only, no UI blocking.
    try {
      await apiPromise;
      showToast("Photo removed");
    } catch {
      showToast("Failed to remove photo", "error");
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // FIX #4: Revoke any previous blob URL before creating a new one
    revokeBlobUrl();
    const objectUrl = URL.createObjectURL(file);
    avatarBlobUrlRef.current = objectUrl;
    setAvatarPreview(objectUrl);

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const { data } = await api.post("/users/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      updateUser({ avatar_url: data.avatar_url });
      setProfile((prev) => ({ ...prev, avatar_url: data.avatar_url }));

      // FIX #5: Revoke the blob URL now that the server URL is available,
      // and clear the preview so resolvedAvatar falls through to the server URL.
      revokeBlobUrl();
      setAvatarPreview(null);

      showToast("Profile photo updated");
    } catch {
      // FIX #6: Revoke blob URL on failure path too, then clear the preview
      revokeBlobUrl();
      setAvatarPreview(null);
      showToast("Failed to upload photo", "error");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  /* ── Single save handler covering all fields ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/users/profile", {
        full_name: form.full_name || undefined,
        current_weight:
          form.current_weight !== ""
            ? parseFloat(form.current_weight)
            : undefined,
        height:
          form.height !== ""
            ? parseFloat(form.height)
            : undefined,
        goal: form.goal || undefined,
        daily_calorie_target:
          form.daily_calorie_target !== ""
            ? parseInt(form.daily_calorie_target)
            : undefined,
        protein_target:
          form.protein_target !== ""
            ? parseInt(form.protein_target)
            : undefined,
        carbs_target:
          form.carbs_target !== "" ? parseInt(form.carbs_target) : undefined,
        fats_target:
          form.fats_target !== "" ? parseInt(form.fats_target) : undefined,
      });

      if (form.full_name && form.full_name !== user?.full_name) {
        updateUser({ full_name: form.full_name });
      }

      setProfile((prev) => ({
        ...prev,
        full_name: form.full_name || prev.full_name,
        profile: {
          ...prev.profile,
          // FIX #7: Use ?? instead of || so that numeric 0 is treated as a
          // valid value rather than falling back to the previous value.
          current_weight:
            form.current_weight !== ""
              ? parseFloat(form.current_weight)
              : prev.profile?.current_weight,
          height:
            form.height !== ""
              ? parseFloat(form.height)
              : prev.profile?.height,
          goal: form.goal ?? prev.profile?.goal,
          daily_calorie_target:
            form.daily_calorie_target !== ""
              ? parseInt(form.daily_calorie_target)
              : prev.profile?.daily_calorie_target,
          protein_target:
            form.protein_target !== ""
              ? parseInt(form.protein_target)
              : prev.profile?.protein_target,
          carbs_target:
            form.carbs_target !== ""
              ? parseInt(form.carbs_target)
              : prev.profile?.carbs_target,
          fats_target:
            form.fats_target !== ""
              ? parseInt(form.fats_target)
              : prev.profile?.fats_target,
        },
      }));

      // Update session cache with latest profile
      setProfile(prev => {
        try { sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(prev)); } catch { /* ignore */ }
        return prev;
      });

      setEditing(false);
      showToast("Profile updated successfully");
    } catch {
      showToast("Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Cancel — restore all fields to last saved ── */
  const handleCancel = () => {
    // FIX #8: Use functional form of setProfile to guarantee we read the
    // latest profile state, not a potentially-stale closure value.
    setProfile((prev) => {
      if (prev) setForm(profileToForm(prev));
      return prev;
    });
    setEditing(false);
  };

  const handleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("nutriscan_theme", next ? "dark" : "light");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displayName = profile?.full_name || user?.full_name || "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const goalLabel =
    GOAL_OPTIONS.find((g) => g.value === (profile?.profile?.goal || form.goal))
      ?.label || "—";

  // Resolved avatar: prefer live upload preview → saved URL → null (shows initials)
  const resolvedAvatar =
    avatarPreview || profile?.avatar_url || user?.avatar_url || null;

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {showAvatarOptions && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/40"
          onClick={() => setShowAvatarOptions(false)}
        >
          <div
            // FIX #9: Use theme-aware background instead of hardcoded bg-white
            className="absolute bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 bg-surface-container-lowest dark:bg-surface-container rounded-t-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Profile preview */}
            {resolvedAvatar && (
              <div className="flex justify-center py-6 border-b border-surface-variant/20">
                <img
                  src={resolvedAvatar}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover"
                />
              </div>
            )}

            {/* Actions */}
            {/* FIX #10: Use theme-aware divider and text colors */}
            <div className="divide-y divide-surface-variant/20 text-center">
              {resolvedAvatar && (
                <button
                  onClick={() => {
                    setShowAvatarOptions(false);
                    setShowImagePreview(true);
                  }}
                  className="w-full py-4 text-sm font-medium text-on-surface"
                >
                  View Photo
                </button>
              )}

              <button
                onClick={() => {
                  // FIX #11: Trigger the file input BEFORE closing the sheet
                  // to avoid the click being swallowed on some browsers.
                  fileInputRef.current?.click();
                  setShowAvatarOptions(false);
                }}
                className="w-full py-4 text-sm font-semibold text-primary"
              >
                Upload New Photo
              </button>

              {resolvedAvatar && (
                <button
                  onClick={handleRemoveAvatar}
                  className="w-full py-4 text-sm font-semibold text-red-500"
                >
                  Remove Photo
                </button>
              )}

              <button
                onClick={() => setShowAvatarOptions(false)}
                className="w-full py-4 text-sm text-on-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showImagePreview && createPortal(
        <div
          className="fixed inset-0 z-[10000] bg-black flex items-center justify-center"
          onClick={() => setShowImagePreview(false)}
        >
          <img
            onClick={(e) => e.stopPropagation()}
            src={resolvedAvatar}
            alt="Profile"
            className="max-w-full max-h-full object-contain"
          />
          <button
            className="absolute top-5 right-5 text-white"
            onClick={() => setShowImagePreview(false)}
            aria-label="Close photo preview"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>,
        document.body
      )}

      <PrivacyModal
        open={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />

      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
        aria-label="Upload profile photo"
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-24 left-1/2 -translate-x-1/2 z-[9998] px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm text-white transition-all duration-300 ${toastType === "error" ? "bg-error" : "bg-primary"
            }`}
          style={{ whiteSpace: "nowrap" }}
        >
          {toast}
        </div>
      )}

      {/* ────────────── Profile Header ────────────── */}
      <section className="relative w-full max-w-xl mx-auto">
        {/* Modern floating glass card */}
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-[0_10px_60px_rgba(0,0,0,0.35)]">

          {/* Ambient gradients */}
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-secondary/10 blur-3xl rounded-full pointer-events-none" />

          {/* Inner content */}
          <div className="relative z-10 p-7 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

              {/* Avatar Section */}
              <div className="relative shrink-0">
                <button
                  onClick={handleAvatarClick}
                  disabled={avatarUploading || avatarRemoving}
                  aria-label="Change profile photo"
                  className="group relative"
                >
                  {/* Glow Ring */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/30 to-secondary/30 blur-md opacity-70 group-hover:opacity-100 transition duration-500" />

                  {/* Avatar */}
                  <div
                    className="relative w-24 h-24 rounded-full overflow-hidden border border-white/20 bg-surface shadow-2xl transition-all duration-300"
                    style={{
                      opacity: avatarRemoving ? 0 : 1,
                      transform: avatarRemoving ? "scale(0.9)" : "scale(1)",
                    }}
                  >
                    {(avatarRemoving ? frozenAvatarRef.current : resolvedAvatar) ? (
                      <img
                        src={avatarRemoving ? frozenAvatarRef.current : resolvedAvatar}
                        alt="Profile"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-container/50 to-secondary-container/50 text-primary text-2xl font-black">
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Overlay */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center rounded-full transition-all duration-300 ${avatarUploading
                        ? "bg-black/50 opacity-100"
                        : "bg-black/40 opacity-0 group-hover:opacity-100"
                      }`}
                  >
                    {avatarUploading ? (
                      <span className="material-symbols-outlined text-white animate-spin">
                        progress_activity
                      </span>
                    ) : (
                      <span
                        className="material-symbols-outlined text-white scale-90 group-hover:scale-110 transition-transform duration-300"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        photo_camera
                      </span>
                    )}
                  </div>
                </button>

                {/* Online Indicator */}
                <div
                  className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black shadow-lg"
                  style={{ opacity: avatarRemoving ? 0 : 1 }}
                />
              </div>

              {/* Details */}
              <div className="flex-1 text-center sm:text-left flex flex-col justify-center pt-1">

                {/* Premium Badge */}
                <div className="mb-3 inline-flex self-center sm:self-start items-center gap-2 px-3 py-1 rounded-full border border-primary/15 bg-primary/10 backdrop-blur-md">
                  <span
                    className="material-symbols-outlined text-primary text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>

                  <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-primary">
                    NutriScan Elite
                  </span>
                </div>

                {/* Name */}
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-on-surface leading-none">
                  {displayName}
                </h1>

                {/* Email */}
                <p className="mt-2 text-sm text-on-surface-variant font-medium tracking-wide">
                  {profile?.email || user?.email}
                </p>

                {/* Optional subtle divider */}
                <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────── Body Stats ────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant px-1">
          Body Stats
        </h2>

        {editing ? (
          <div className="glass-panel rounded-2xl p-5 outline outline-1 outline-white/20 space-y-5">
            <NovaInput
              label="Display name"
              value={form.full_name}
              onChange={setField("full_name")}
              placeholder="Your name"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-5">
              <NovaInput
                label="Current weight"
                type="number"
                unit="kg"
                value={form.current_weight}
                onChange={setField("current_weight")}
                placeholder="64.2"
              />
              <NovaInput
                label="Height"
                type="number"
                unit="cm"
                value={form.height}
                onChange={setField("height")}
                placeholder="170"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
                Goal
              </p>
              <div className="grid grid-cols-3 gap-2">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setForm((p) => ({ ...p, goal: g.value }))}
                    className={`py-3 rounded-xl flex flex-col items-center gap-1 text-xs font-semibold transition-all active:scale-95 ${form.goal === g.value
                      ? "bg-primary text-white"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {g.icon}
                    </span>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 bg-surface-container-low rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">
                  Current Weight
                </p>
                <p className="text-3xl font-headline font-bold text-primary tracking-tighter">
                  {profile?.profile?.current_weight ?? "—"}
                  <span className="text-lg font-medium opacity-60"> kg</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">
                  Height
                </p>
                <p className="text-xl font-headline font-bold text-on-surface">
                  {profile?.profile?.height ?? "—"} cm
                </p>
              </div>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-5">
              <span
                className="material-symbols-outlined text-primary mb-2 block"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                flag
              </span>
              <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">
                Goal
              </p>
              <p className="text-lg font-headline font-bold text-on-surface">
                {goalLabel}
              </p>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-5">
              <span
                className="material-symbols-outlined text-primary mb-2 block"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_fire_department
              </span>
              <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">
                Daily Target
              </p>
              <p className="text-lg font-headline font-bold text-on-surface">
                {profile?.profile?.daily_calorie_target ?? "—"}
                <span className="text-sm font-medium opacity-60"> kcal</span>
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ────────────── Macro Targets ────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant px-1">
          Macro Targets
        </h2>

        {editing ? (
          <div className="glass-panel rounded-2xl p-5 outline outline-1 outline-white/20 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: "protein_target", label: "Protein" },
                { key: "carbs_target", label: "Carbs" },
                { key: "fats_target", label: "Fats" },
              ].map((m) => (
                <NovaInput
                  key={m.key}
                  label={m.label}
                  type="number"
                  unit="g"
                  value={form[m.key]}
                  onChange={setField(m.key)}
                  placeholder="—"
                />
              ))}
            </div>
            <NovaInput
              label="Daily calorie target"
              type="number"
              unit="kcal"
              value={form.daily_calorie_target}
              onChange={setField("daily_calorie_target")}
              placeholder="2200"
            />
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-5 outline outline-1 outline-white/20 space-y-4">
            {[
              {
                label: "Protein",
                value: profile?.profile?.protein_target,
                color: "bg-emerald-500",
              },
              {
                label: "Carbs",
                value: profile?.profile?.carbs_target,
                color: "bg-amber-400",
              },
              {
                label: "Fats",
                value: profile?.profile?.fats_target,
                color: "bg-rose-400",
              },
            ].map((m) => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="text-xs font-bold text-on-surface-variant w-14">
                  {m.label}
                </span>
                <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className={`h-full ${m.color} rounded-full transition-all duration-700`}
                    style={{
                      width: m.value
                        ? `${Math.min((m.value / 200) * 100, 100)}%`
                        : "0%",
                    }}
                  />
                </div>
                <span className="text-sm font-bold text-on-surface w-14 text-right">
                  {m.value != null ? `${m.value}g` : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ────────────── Save / Cancel bar (edit mode only) ────────────── */}
      {editing && (
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
          >
            {saving ? (
              <span className="material-symbols-outlined text-base animate-spin">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined text-base">
                check_circle
              </span>
            )}
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-6 py-3.5 rounded-2xl bg-surface-container text-on-surface-variant font-semibold text-sm hover:bg-surface-container-high active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ────────────── Preferences ────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant px-1">
          Preferences
        </h2>
        <div className="bg-surface-container-low rounded-2xl overflow-hidden divide-y divide-surface-variant/20">
          {/* Edit Profile */}
          {!editing && (
            <div
              onClick={() => setEditing(true)}
              className="flex items-center justify-between p-4 hover:bg-surface-container transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-base">
                    manage_accounts
                  </span>
                </div>
                <div>
                  <span className="font-medium text-sm block">
                    Edit Profile
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Name, weight, goals &amp; macros
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
                chevron_right
              </span>
            </div>
          )}

          {/* Dark Mode */}
          <div
            role="switch"
            aria-checked={darkMode}
            aria-label="Toggle dark mode"
            onClick={handleDarkMode}
            className="flex items-center justify-between p-4 hover:bg-surface-container transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-fixed/50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-base">
                  {darkMode ? "dark_mode" : "light_mode"}
                </span>
              </div>
              <span className="font-medium text-sm">Dark Mode</span>
            </div>
            <div
              className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${darkMode ? "bg-primary" : "bg-surface-container-high"
                }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${darkMode ? "left-6" : "left-1"
                  }`}
              />
            </div>
          </div>

          {/* Privacy & Data — opens portal modal */}
          <div
            onClick={() => setShowPrivacyModal(true)}
            className="flex items-center justify-between p-4 hover:bg-surface-container transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary-container/50 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-base">
                  shield_person
                </span>
              </div>
              <span className="font-medium text-sm">Privacy &amp; Data</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
              chevron_right
            </span>
          </div>

          {/* Smart Insights */}
          <div
            onClick={() => navigate("/insights")}
            className="flex items-center justify-between p-4 hover:bg-surface-container transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary-container/50 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-base">
                  notifications_active
                </span>
              </div>
              <span className="font-medium text-sm">Smart Insights</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
              chevron_right
            </span>
          </div>
        </div>
      </section>

      {/* ────────────── Logout ────────────── */}
      <section className="pt-2 space-y-4">
        <NovaButton variant="error" onClick={handleLogout}>
          <span className="material-symbols-outlined">logout</span>
          Sign out
        </NovaButton>
        <p className="text-center text-[10px] text-on-surface-variant tracking-widest uppercase">
          NutriScan AI v2.4.0
        </p>
      </section>
    </div>
  );
}