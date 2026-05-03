import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import NovaButton from "../components/ui/NovaButton";
import NovaInput from "../components/ui/NovaInput";


const GOAL_OPTIONS = [
  { value: "lose", label: "Lose Weight", icon: "trending_down" },
  { value: "maintain", label: "Maintain", icon: "balance" },
  { value: "gain", label: "Gain Muscle", icon: "trending_up" },
];

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  // Edit form state
  const [form, setForm] = useState({
    full_name: "",
    current_weight: "",
    target_weight: "",
    goal: "",
    daily_calorie_target: "",
    protein_target: "",
    carbs_target: "",
    fats_target: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get("/users/profile");
      setProfile(data);
      setForm({
        full_name: data.full_name || "",
        current_weight: data.profile?.current_weight ?? "",
        target_weight: data.profile?.target_weight ?? "",
        goal: data.profile?.goal || "maintain",
        daily_calorie_target: data.profile?.daily_calorie_target ?? "",
        protein_target: data.profile?.protein_target ?? "",
        carbs_target: data.profile?.carbs_target ?? "",
        fats_target: data.profile?.fats_target ?? "",
      });
    } catch {
      // keep defaults
    } finally {
      setLoaded(true);
    }
  };

  const showToast = (msg, type = "success") => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(""), 2800);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/users/profile", {
        full_name: form.full_name || undefined,
        current_weight:
          form.current_weight !== ""
            ? parseFloat(form.current_weight)
            : undefined,
        target_weight:
          form.target_weight !== ""
            ? parseFloat(form.target_weight)
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

      // Sync name change into AuthContext + localStorage
      if (form.full_name && form.full_name !== user?.full_name) {
        updateUser({ full_name: form.full_name });
      }

      // Optimistically update local profile state
      setProfile((prev) => ({
        ...prev,
        full_name: form.full_name || prev.full_name,
        profile: {
          ...prev.profile,
          current_weight:
            parseFloat(form.current_weight) || prev.profile?.current_weight,
          target_weight:
            parseFloat(form.target_weight) || prev.profile?.target_weight,
          goal: form.goal || prev.profile?.goal,
          daily_calorie_target:
            parseInt(form.daily_calorie_target) ||
            prev.profile?.daily_calorie_target,
          protein_target:
            parseInt(form.protein_target) || prev.profile?.protein_target,
          carbs_target:
            parseInt(form.carbs_target) || prev.profile?.carbs_target,
          fats_target: parseInt(form.fats_target) || prev.profile?.fats_target,
        },
      }));

      setEditing(false);
      showToast("Profile updated successfully");
    } catch {
      showToast("Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
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
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm text-white transition-all ${toastType === "error" ? "bg-error" : "bg-primary"}`}
        >
          {toast}
        </div>
      )}

      {/* Profile Header */}
      <section className="relative">
        <div className="h-24 rounded-t-[1.5rem] bg-gradient-to-r from-primary to-primary-fixed" />
        <div className="bg-surface-container-lowest/60 backdrop-blur-2xl rounded-b-[1.5rem] px-6 pb-6 outline outline-1 outline-white/20 nova-shadow text-center">
          <div className="relative -mt-12 mb-3 inline-block">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-primary to-primary-fixed shadow-xl">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full border-4 border-white"
                />
              ) : (
                <div className="w-full h-full rounded-full border-4 border-white bg-primary-container flex items-center justify-center text-primary text-2xl font-headline font-bold">
                  {initials}
                </div>
              )}
            </div>
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-primary border-[3px] border-white rounded-full" />
          </div>

          {editing ? (
            <div className="mb-3 max-w-[220px] mx-auto">
              <NovaInput
                value={form.full_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, full_name: e.target.value }))
                }
                placeholder="Your name"
              />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-headline font-bold tracking-tight text-on-surface">
                {displayName}
              </h1>
              <p className="text-on-surface-variant font-medium text-sm">
                {profile?.email || user?.email}
              </p>
            </>
          )}

          <div className="mt-3 inline-flex items-center gap-2 bg-secondary-container px-4 py-1.5 rounded-full">
            <span
              className="material-symbols-outlined text-[16px] text-on-secondary-container"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-on-secondary-container">
              NutriScan Elite
            </span>
          </div>

          {/* Edit / Save toggle */}
          <div className="mt-4 flex gap-2 justify-center">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-60"
                >
                  {saving ? (
                    <span className="material-symbols-outlined text-base animate-spin">
                      progress_activity
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-base">
                      check
                    </span>
                  )}
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-5 py-2 bg-surface-container text-on-surface rounded-xl text-sm font-semibold active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-5 py-2 bg-surface-container text-on-surface rounded-xl text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-all hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-base">
                  edit
                </span>
                Edit profile
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Stats / Edit Grid */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant px-1">
          Body Stats
        </h2>

        {editing ? (
          <div className="glass-panel rounded-2xl p-5 outline outline-1 outline-white/20 space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <NovaInput
                label="Current weight"
                type="number"
                unit="kg"
                value={form.current_weight}
                onChange={(e) =>
                  setForm((p) => ({ ...p, current_weight: e.target.value }))
                }
                placeholder="64.2"
              />
              <NovaInput
                label="Target weight"
                type="number"
                unit="kg"
                value={form.target_weight}
                onChange={(e) =>
                  setForm((p) => ({ ...p, target_weight: e.target.value }))
                }
                placeholder="62.0"
              />
            </div>

            {/* Goal selector */}
            <div className="space-y-2">
              <p className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
                Goal
              </p>
              <div className="grid grid-cols-3 gap-2">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setForm((p) => ({ ...p, goal: g.value }))}
                    className={`py-3 rounded-xl flex flex-col items-center gap-1 text-xs font-semibold transition-all active:scale-95 ${
                      form.goal === g.value
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
                  {profile?.profile?.current_weight || "—"}
                  <span className="text-lg font-medium opacity-60"> kg</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">
                  Target
                </p>
                <p className="text-xl font-headline font-bold text-on-surface">
                  {profile?.profile?.target_weight || "—"} kg
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
                {profile?.profile?.daily_calorie_target || "—"}
                <span className="text-sm font-medium opacity-60"> kcal</span>
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Macro Targets */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant px-1">
          Macro Targets
        </h2>

        {editing ? (
          <div className="glass-panel rounded-2xl p-5 outline outline-1 outline-white/20">
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  key: "protein_target",
                  label: "Protein",
                  color: "text-emerald-600",
                },
                {
                  key: "carbs_target",
                  label: "Carbs",
                  color: "text-amber-600",
                },
                { key: "fats_target", label: "Fats", color: "text-rose-500" },
              ].map((m) => (
                <NovaInput
                  key={m.key}
                  label={m.label}
                  type="number"
                  unit="g"
                  value={form[m.key]}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [m.key]: e.target.value }))
                  }
                  placeholder="—"
                />
              ))}
            </div>
            <div className="mt-4">
              <NovaInput
                label="Daily calorie target"
                type="number"
                unit="kcal"
                value={form.daily_calorie_target}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    daily_calorie_target: e.target.value,
                  }))
                }
                placeholder="2200"
              />
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-5 outline outline-1 outline-white/20 space-y-4">
            {[
              {
                label: "Protein",
                value: profile?.profile?.protein_target,
                total: profile?.profile?.daily_calorie_target,
                color: "bg-emerald-500",
              },
              {
                label: "Carbs",
                value: profile?.profile?.carbs_target,
                total: profile?.profile?.daily_calorie_target,
                color: "bg-amber-400",
              },
              {
                label: "Fats",
                value: profile?.profile?.fats_target,
                total: profile?.profile?.daily_calorie_target,
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
                  {m.value ? `${m.value}g` : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Settings */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant px-1">
          Preferences
        </h2>
        <div className="bg-surface-container-low rounded-2xl overflow-hidden divide-y divide-surface-variant/20">
          {/* Dark Mode — wired */}
          <div
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
            {/* Toggle pill */}
            <div
              className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${darkMode ? "bg-primary" : "bg-surface-container-high"}`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${darkMode ? "left-6" : "left-1"}`}
              />
            </div>
          </div>

          {[
            {
              icon: "shield_person",
              label: "Privacy & Data",
              onClick: () => {},
            },
            {
              icon: "notifications_active",
              label: "Smart Insights",
              onClick: () => navigate("/insights"),
            },
          ].map((item) => (
            <div
              key={item.label}
              onClick={item.onClick}
              className="flex items-center justify-between p-4 hover:bg-surface-container transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary-container/50 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-base">
                    {item.icon}
                  </span>
                </div>
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
                chevron_right
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Logout */}
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
