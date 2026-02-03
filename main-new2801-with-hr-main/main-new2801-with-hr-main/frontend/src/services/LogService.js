/**
 * Log Service - Frontend API client
 */
import api from '../lib/api';

class LogService {
  async getErrorCodes() {
    const response = await api.get('/admin/error-codes');
    return response.data.codes;
  }

  async listLogs({ venue_id, level, code, q, since, until, limit, cursor }) {
    const params = new URLSearchParams();
    
    if (venue_id) params.append('venue_id', venue_id);
    if (level) params.append('level', level);
    if (code) params.append('code', code);
    if (q) params.append('q', q);
    if (since) params.append('since', since);
    if (until) params.append('until', until);
    if (limit) params.append('limit', limit);
    if (cursor) params.append('cursor', cursor);
    
    const response = await api.get(`/admin/logs?${params}`);
    return response.data;
  }

  async ackLog(logId) {
    const response = await api.post(`/admin/logs/${logId}/ack`, {
      acknowledged: true
    });
    return response.data;
  }
}

export default new LogService();
