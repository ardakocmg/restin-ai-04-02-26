/**
 * Reporting Service - Report definitions, runs, and caching
 * @module services/ReportingService
 */
import api from '../lib/api';

export interface ReportDefinition {
    key: string;
    name: string;
    description?: string;
    category: string;
    params_schema?: /**/any;
}

export interface ReportRun {
    id: string;
    venue_id: string;
    report_key: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    params: /**/any;
    result?: unknown;
    created_at: string;
    completed_at?: string;
}

export type ReportFormat = 'json' | 'csv' | 'pdf';

interface CachedResult {
    result: unknown;
    timestamp: number;
}

class ReportingService {
    async listDefs(venueId: string, category: string | null = null, q: string | null = null): Promise<ReportDefinition[]> {
        const params = new URLSearchParams({ venue_id: venueId });
        if (category) params.append('category', category);
        if (q) params.append('q', q);

        const response = await api.get(`/reports/defs?${params}`);
        return response.data;
    }

    async runReport(
        venueId: string,
        reportKey: string,
        params: /**/any = {},
        format: ReportFormat = 'json'
    ): Promise<ReportRun> {
        const response = await api.post('/reports/run', {
            venue_id: venueId,
            report_key: reportKey,
            params,
            format
        });
        return response.data;
    }

    async listRuns(
        venueId: string,
        reportKey: string | null = null,
        status: string | null = null
    ): Promise<ReportRun[]> {
        const params = new URLSearchParams({ venue_id: venueId });
        if (reportKey) params.append('report_key', reportKey);
        if (status) params.append('status', status);

        const response = await api.get(`/reports/runs?${params}`);
        return response.data;
    }

    async getRun(runId: string): Promise<ReportRun> {
        const response = await api.get(`/reports/runs/${runId}`);
        return response.data;
    }

    async searchReports(q: string, _venueId: string): Promise<ReportDefinition[]> {
        const params = new URLSearchParams({
            q,
            context: 'ADMIN',
            mode: 'reports'
        });

        const response = await api.get(`/search?${params}`);
        return response.data.report_suggestions || [];
    }

    // Cache management
    private cacheKey(venueId: string, reportKey: string, params: /**/any): string {
        return `report_${venueId}_${reportKey}_${JSON.stringify(params)}`;
    }

    getCachedResult(venueId: string, reportKey: string, params: /**/any): unknown | null {
        const key = this.cacheKey(venueId, reportKey, params);
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        try {
            const data: CachedResult = JSON.parse(cached);
            const age = Date.now() - data.timestamp;
            if (age > 300000) return null; // 5 min TTL
            return data.result;
        } catch {
            return null;
        }
    }

    setCachedResult(venueId: string, reportKey: string, params: /**/any, result: unknown): void {
        const key = this.cacheKey(venueId, reportKey, params);
        const data: CachedResult = {
            result,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(data));
    }
}

export default new ReportingService();
