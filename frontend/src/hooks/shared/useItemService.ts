/**
 * Unified Item Service Hook
 * 
 * Shared data layer for POS + Inventory modules.
 * Fetches inventory items with stock levels, allergens, and categories.
 */
import { useCallback,useEffect,useMemo,useState } from 'react';
import api from '../../lib/api';
import { logger } from '../../lib/logger';

export interface InventoryItem {
    id: string;
    name: string;
    sku?: string;
    category?: string;
    category_id?: string;
    price?: number;
    cost_price?: number;
    unit?: string;
    stock_quantity?: number;
    min_stock?: number;
    max_stock?: number;
    allergens?: string[];
    tags?: string[];
    image?: string;
    venue_id: string;
    active?: boolean;
    supplier_id?: string;
}

interface UseItemServiceOptions {
    venueId: string;
    category?: string;
    search?: string;
    lowStockOnly?: boolean;
    enabled?: boolean;
}

export function useItemService(options: UseItemServiceOptions) {
    const { venueId, category, search, lowStockOnly = false, enabled = true } = options;

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = useCallback(async () => {
        if (!venueId || !enabled) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/venues/${venueId}/inventory`);
            const data = res.data?.items || res.data || [];
            setItems(Array.isArray(data) ? data : []);
        } catch (err) {
            logger.error('Failed to fetch inventory items:', err as /**/any);
            setError('Failed to load items');
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [venueId, enabled]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Filtered views
    const filteredItems = useMemo(() => {
        let result = items;
        if (category) {
            result = result.filter((i) => i.category === category || i.category_id === category);
        }
        if (search) {
            const s = search.toLowerCase();
            result = result.filter(
                (i) => i.name?.toLowerCase().includes(s) || i.sku?.toLowerCase().includes(s)
            );
        }
        if (lowStockOnly) {
            result = result.filter(
                (i) => i.stock_quantity !== undefined && i.min_stock !== undefined && i.stock_quantity <= i.min_stock
            );
        }
        return result;
    }, [items, category, search, lowStockOnly]);

    const lowStockItems = useMemo(
        () => items.filter((i) => i.stock_quantity !== undefined && i.min_stock !== undefined && i.stock_quantity <= i.min_stock),
        [items]
    );

    const categories = useMemo(
        () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))),
        [items]
    );

    return {
        items: filteredItems,
        allItems: items,
        lowStockItems,
        categories,
        loading,
        error,
        refetch: fetchItems,
    };
}

export default useItemService;
