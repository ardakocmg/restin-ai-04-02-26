// Global Search Service - Used by KDS/POS/Admin
import api from '../lib/api';

class SearchService {
  constructor() {
    this.cache = {
      KDS: [],
      POS: [],
      ADMIN: []
    };
    this.lastQuery = {};
  }

  async search({ q, context = 'ADMIN', scope = 'auto', station = null }) {
    if (!q || q.length < 2) {
      return this.getEmptyResults();
    }

    try {
      const params = { q, context, scope };
      if (station) params.station = station;
      
      const response = await api.get('/search', { params });
      
      // Cache successful results
      this.cache[context] = response.data;
      this.lastQuery[context] = q;
      
      return response.data;
    } catch (error) {
      console.warn('[Search] API failed, using local fallback:', error);
      return this.localFallback(q, context);
    }
  }

  localFallback(q, context) {
    const cached = this.cache[context] || this.getEmptyResults();
    const lowerQ = q.toLowerCase();
    
    // Filter cached results
    const filtered = {};
    
    for (const [key, items] of Object.entries(cached)) {
      if (!Array.isArray(items)) continue;
      
      filtered[key] = items.filter(item => {
        const searchText = JSON.stringify(item).toLowerCase();
        return searchText.includes(lowerQ);
      });
    }
    
    return filtered;
  }

  getEmptyResults() {
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

  clearCache(context = null) {
    if (context) {
      this.cache[context] = this.getEmptyResults();
    } else {
      this.cache = { KDS: [], POS: [], ADMIN: [] };
    }
  }
}

const searchService = new SearchService();
export default searchService;
