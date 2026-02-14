/**
 * Log Service - Frontend API client for system logs
 * @module services/LogService
 */
import api from '../lib/api';

export interface ErrorCode {
    code: string;
    description: string;
    level: 'error' | 'warn' | 'info';
}

export interface LogEntry {
    id: string;
    level: 'error' | 'warn' | 'info' | 'debug';
    code?: string;
    message: string;
    timestamp: string;
    venue_id?: string;
    acknowledged?: boolean;
    metadata?: Record<string, unknown>;
}

export interface LogListParams {
    venue_id?: string;
    level?: string;
    code?: string;
    q?: string;
    since?: string;
    until?: string;
    limit?: number;
    cursor?: string;
}

export interface LogListResponse {
    logs: LogEntry[];
    cursor?: string;
    has_more: boolean;
}

class LogService {
    async getErrorCodes(): Promise<ErrorCode[]> {
        const response = await api.get('/manager/error-codes');
        return response.data.codes;
    }

    async listLogs(params: LogListParams): Promise<LogListResponse> {
        const urlParams = new URLSearchParams();

        if (params.venue_id) urlParams.append('venue_id', params.venue_id);
        if (params.level) urlParams.append('level', params.level);
        if (params.code) urlParams.append('code', params.code);
        if (params.q) urlParams.append('q', params.q);
        if (params.since) urlParams.append('since', params.since);
        if (params.until) urlParams.append('until', params.until);
        if (params.limit) urlParams.append('limit', String(params.limit));
        if (params.cursor) urlParams.append('cursor', params.cursor);

        const response = await api.get(`/manager/logs?${urlParams}`);
        return response.data;
    }

    async ackLog(logId: string): Promise<LogEntry> {
        const response = await api.post(`/manager/logs/${logId}/ack`, {
            acknowledged: true
        });
        return response.data;
    }
}

export default new LogService();
