/**
 * Voice AI Service — Frontend API Client
 * Pillar 4: 24/7 AI Receptionist
 */
import api from '@/lib/api';

export interface VoiceConfig {
    tenantId: string;
    persona: string;
    knowledgeBase: string[];
    enabled: boolean;
}

export interface CallLog {
    id: string;
    timestamp: string;
    duration: number;
    outcome: 'success' | 'failed' | 'missed';
    aiTokensUsed: number;
    cost: number;
    callerNumber?: string;
    summary?: string;
}

class VoiceService {
    async getConfig(tenantId: string): Promise<VoiceConfig> {
        const response = await api.get(`/voice/config/${tenantId}`);
        return response.data;
    }

    async updateConfig(tenantId: string, config: Partial<VoiceConfig>): Promise<VoiceConfig> {
        const response = await api.put(`/voice/config/${tenantId}`, config);
        return response.data;
    }

    async getCallLogs(tenantId: string, limit = 50): Promise<CallLog[]> {
        const response = await api.get(`/voice/logs/${tenantId}?limit=${limit}`);
        return response.data;
    }

    async testCall(tenantId: string, phoneNumber: string): Promise<{ success: boolean; message: string }> {
        const response = await api.post('/voice/test', { tenantId, phoneNumber });
        return response.data;
    }
}

export const voiceService = new VoiceService();
