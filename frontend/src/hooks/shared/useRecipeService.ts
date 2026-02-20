/**
 * Unified Recipe Service Hook
 * 
 * Shared data layer for POS ComboMeals + Inventory Recipe pages.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../lib/api';
import { logger } from '../../lib/logger';

export interface Recipe {
    id: string;
    name: string;
    category?: string;
    type?: string; // recipe | combo | sub_recipe
    portions?: number;
    cost_per_portion?: number;
    selling_price?: number;
    margin_pct?: number;
    ingredients?: RecipeIngredient[];
    tags?: string[];
    allergens?: string[];
    image?: string;
    venue_id: string;
    active?: boolean;
}

export interface RecipeIngredient {
    item_id: string;
    item_name: string;
    quantity: number;
    unit: string;
    cost?: number;
}

interface UseRecipeServiceOptions {
    venueId: string;
    type?: string;
    search?: string;
    enabled?: boolean;
}

export function useRecipeService(options: UseRecipeServiceOptions) {
    const { venueId, type, search, enabled = true } = options;

    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRecipes = useCallback(async () => {
        if (!venueId || !enabled) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (type) params.append('type', type);
            if (search) params.append('search', search);
            const res = await api.get(`/venues/${venueId}/recipes?${params.toString()}`);
            const data = res.data?.recipes || res.data || [];
            setRecipes(Array.isArray(data) ? data : []);
        } catch (err) {
            logger.error('Failed to fetch recipes:', err as Record<string, unknown>);
            setError('Failed to load recipes');
            setRecipes([]);
        } finally {
            setLoading(false);
        }
    }, [venueId, type, search, enabled]);

    useEffect(() => {
        fetchRecipes();
    }, [fetchRecipes]);

    const combos = useMemo(
        () => recipes.filter((r) => r.type === 'combo'),
        [recipes]
    );

    const getRecipeDetail = useCallback(
        async (recipeId: string) => {
            try {
                const res = await api.get(`/recipes/${recipeId}`);
                return res.data;
            } catch (err) {
                logger.error('Failed to fetch recipe detail:', err as Record<string, unknown>);
                return null;
            }
        },
        []
    );

    return {
        recipes,
        combos,
        loading,
        error,
        refetch: fetchRecipes,
        getRecipeDetail,
    };
}

export default useRecipeService;
