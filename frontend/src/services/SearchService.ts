/**
 * Search Service - Global search for KDS/POS/Admin
 * @module services/SearchService
 */
import api from '../lib/api';
import { logger } from '../lib/logger';

export type SearchContext = 'KDS' | 'POS' | 'ADMIN';

export interface SearchParams {
    q: string;
    context?: SearchContext;
    scope?: 'auto' | 'local' | 'remote';
    station?: string | null;
}

export interface SearchResults {
    tickets: unknown[];
    menu_items: unknown[];
    tables: unknown[];
    guests: unknown[];
    inventory: unknown[];
    orders: unknown[];
    users: unknown[];
    [key: string]: unknown[];
}

class SearchService {
    private cache: Record<SearchContext, SearchResults>;
    private lastQuery: Partial<Record<SearchContext, string>>;

    constructor() {
        this.cache = {
            KDS: this.getEmptyResults(),
            POS: this.getEmptyResults(),
            ADMIN: this.getEmptyResults()
        };
        this.lastQuery = {};
    }

    async search({ q, context = 'ADMIN', scope = 'auto', station = null }: SearchParams): Promise<SearchResults> {
        if (!q || q.length < 2) {
            return this.getEmptyResults();
        }

        try {
            const params: Record<string, string> = { q, context, scope };
            if (station) params.station = station;

            const response = await api.get('/search', { params });

            // Cache successful results
            this.cache[context] = response.data;
            this.lastQuery[context] = q;

            return response.data;
        } catch (error) {
            logger.warn('[Search] API failed, using local fallback', { error });
            return this.localFallback(q, context);
        }
    }

    private localFallback(q: string, context: SearchContext): SearchResults {
        const cached = this.cache[context] || this.getEmptyResults();
        const lowerQ = q.toLowerCase();

        // Filter cached results
        const filtered: SearchResults = this.getEmptyResults();

        for (const [key, items] of Object.entries(cached)) {
            if (!Array.isArray(items)) continue;

            filtered[key] = items.filter(item => {
                const searchText = JSON.stringify(item).toLowerCase();
                return searchText.includes(lowerQ);
            });
        }

        return filtered;
    }

    getEmptyResults(): SearchResults {
        return {
            tickets: [],
            menu_items: [],
            tables: [],
            guests: [],
            inventory: [],
            orders: [],
            users: []
        };
    }

    clearCache(context: SearchContext | null = null): void {
        if (context) {
            this.cache[context] = this.getEmptyResults();
        } else {
            this.cache = {
                KDS: this.getEmptyResults(),
                POS: this.getEmptyResults(),
                ADMIN: this.getEmptyResults()
            };
        }
    }
}

const searchService = new SearchService();
export default searchService;
