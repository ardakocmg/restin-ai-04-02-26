/**
 * Reporting Service - Frontend API client
 */
import api from '../lib/api';

class ReportingService {
  async listDefs(venueId, category = null, q = null) {
    const params = new URLSearchParams({ venue_id: venueId });
    if (category) params.append('category', category);
    if (q) params.append('q', q);
    
    const response = await api.get(`/reports/defs?${params}`);
    return response.data;
  }

  async runReport(venueId, reportKey, params = {}, format = 'json') {
    const response = await api.post('/reports/run', {
      venue_id: venueId,
      report_key: reportKey,
      params,
      format
    });
    return response.data;
  }

  async listRuns(venueId, reportKey = null, status = null) {
    const params = new URLSearchParams({ venue_id: venueId });
    if (reportKey) params.append('report_key', reportKey);
    if (status) params.append('status', status);
    
    const response = await api.get(`/reports/runs?${params}`);
    return response.data;
  }

  async getRun(runId) {
    const response = await api.get(`/reports/runs/${runId}`);
    return response.data;
  }

  async searchReports(q, venueId) {
    const params = new URLSearchParams({
      q,
      context: 'ADMIN',
      mode: 'reports'
    });
    
    const response = await api.get(`/search?${params}`);
    return response.data.report_suggestions || [];
  }

  // Cache management
  cacheKey(venueId, reportKey, params) {
    return `report_${venueId}_${reportKey}_${JSON.stringify(params)}`;
  }

  getCachedResult(venueId, reportKey, params) {
    const key = this.cacheKey(venueId, reportKey, params);
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    try {
      const data = JSON.parse(cached);
      const age = Date.now() - data.timestamp;
      if (age > 300000) return null; // 5 min TTL
      return data.result;
    } catch {
      return null;
    }
  }

  setCachedResult(venueId, reportKey, params, result) {
    const key = this.cacheKey(venueId, reportKey, params);
    localStorage.setItem(key, JSON.stringify({
      result,
      timestamp: Date.now()
    }));
  }
}

export default new ReportingService();
