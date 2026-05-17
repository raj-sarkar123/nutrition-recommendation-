// src/context/NutritionContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';

const NutritionContext = createContext(null);

const DEFAULT_PROGRESS = { total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0 };
const DEFAULT_TARGETS = { daily_calorie_target: 2200, protein_target: 120, carbs_target: 200, fats_target: 65 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function normalizeProgress(p) {
    if (!p) return DEFAULT_PROGRESS;
    return {
        ...p,
        total_calories: Number(p.total_calories) || 0,
        total_protein: Number(p.total_protein) || 0,
        total_carbs: Number(p.total_carbs) || 0,
        total_fats: Number(p.total_fats) || 0,
    };
}

export function NutritionProvider({ children }) {
    const [progress, setProgress] = useState(() => {
        try {
            const cached = localStorage.getItem('nutriscan_progress');
            return cached ? normalizeProgress(JSON.parse(cached)) : DEFAULT_PROGRESS;
        } catch { return DEFAULT_PROGRESS; }
    });

    const [targets, setTargets] = useState(() => {
        try {
            const cached = localStorage.getItem('nutriscan_targets');
            return cached ? JSON.parse(cached) : DEFAULT_TARGETS;
        } catch { return DEFAULT_TARGETS; }
    });

    const [initialLoading, setInitialLoading] = useState(() => {
        return !localStorage.getItem('nutriscan_progress');
    });

    const [refreshing, setRefreshing] = useState(false);
    const lastFetchedAt = useRef(
        parseInt(localStorage.getItem('nutriscan_progress_ts') || '0', 10)
    );

    // ✅ Added `force` param — bypasses cache when called after a meal log
    const fetchDailyProgress = useCallback(async ({ silent = false, force = false } = {}) => {
        const now = Date.now();
        const isFresh = now - lastFetchedAt.current < CACHE_TTL;

        // Skip only if fresh AND not forced — never skip after invalidation
        if (isFresh && localStorage.getItem('nutriscan_progress') && !force) return;

        if (!silent) setRefreshing(true);

        try {
            const { data } = await api.get('/progress/daily');
            const newProgress = normalizeProgress(data.progress);
            const newTargets = data.targets || DEFAULT_TARGETS;

            setProgress(newProgress);
            setTargets(newTargets);

            localStorage.setItem('nutriscan_progress', JSON.stringify(newProgress));
            localStorage.setItem('nutriscan_targets', JSON.stringify(newTargets));
            localStorage.setItem('nutriscan_progress_ts', String(Date.now()));
            lastFetchedAt.current = Date.now();
        } catch {
            // Keep showing cached data on network error
        } finally {
            setInitialLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchDailyProgress();
    }, [fetchDailyProgress]);

    // ✅ Pure refetch — no optimistic delta, backend is sole source of truth.
    // Calling with no args is safe; force=true bypasses the TTL cache.
    const invalidateAndRefresh = useCallback(async () => {
        localStorage.removeItem('nutriscan_progress_ts');
        lastFetchedAt.current = 0;
        await fetchDailyProgress({ silent: true, force: true });
    }, [fetchDailyProgress]);

    return (
        <NutritionContext.Provider value={{
            progress,
            targets,
            initialLoading,
            refreshing,
            refetch: () => fetchDailyProgress({ silent: true }),
            invalidateAndRefresh,
        }}>
            {children}
        </NutritionContext.Provider>
    );
}

export const useNutrition = () => {
    const ctx = useContext(NutritionContext);
    if (!ctx) throw new Error('useNutrition must be used inside NutritionProvider');
    return ctx;
};