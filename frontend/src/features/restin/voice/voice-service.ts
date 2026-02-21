import api from '../../../lib/api';

/**
 * 📞 Voice Service (Pillar 4)
 * Manages Voice AI configuration, call logs, knowledge base, and simulation.
 * All endpoints backed by /api/voice/* routes.
 */
export const voiceService = {
    // === CONFIG ===
    getConfig: async (venueId: string) => {
        const { data } = await api.get(`/voice/config?venue_id=${venueId}`);
        return data;
    },

    updateConfig: async (venueId: string, config: /**/any) => {
        const { data } = await api.post(`/voice/config?venue_id=${venueId}`, config);
        return data;
    },

    // === CALL LOGS ===
    getLogs: async (venueId: string, limit = 50, status?: string) => {
        let url = `/voice/logs?venue_id=${venueId}&limit=${limit}`;
        if (status) url += `&status=${status}`;
        const { data } = await api.get(url);
        return data;
    },

    // === SIMULATION ===
    simulateCall: async (venueId: string, transcript: string) => {
        const { data } = await api.post(`/voice/call/simulate?venue_id=${venueId}`, { transcript });
        return data;
    },

    // === KNOWLEDGE BASE ===
    getKnowledge: async (venueId: string) => {
        const { data } = await api.get(`/voice/knowledge?venue_id=${venueId}`);
        return data;
    },

    uploadKnowledge: async (venueId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await api.post(`/voice/knowledge/upload?venue_id=${venueId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return data;
    },

    deleteKnowledge: async (docId: string) => {
        const { data } = await api.delete(`/voice/knowledge/${docId}`);
        return data;
    },

    // === ANALYTICS ===
    getStats: async (venueId: string) => {
        const { data } = await api.get(`/voice/stats?venue_id=${venueId}`);
        return data;
    },

    // === SEED DATA ===
    seedData: async (venueId: string) => {
        const { data } = await api.post(`/voice/seed?venue_id=${venueId}`);
        return data;
    },

    // === EXPORT ===
    exportLogsCSV: (logs: /**/any[]) => {
        const headers = ['Caller', 'Time', 'Duration (s)', 'Status', 'Guest Said', 'AI Response', 'Provider', 'Tokens'];
        const rows = logs.map((l: /**/any) => [
            l.caller || '',
            l.created_at || '',
            l.duration_seconds || 0,
            l.status || '',
            `"${String(l.transcript_in || '').replace(/"/g, '""')}"`,
            `"${String(l.transcript_out || '').replace(/"/g, '""')}"`,
            l.ai_provider || '',
            l.tokens_used || 0,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voice_call_logs_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // === VAPI INTEGRATION ===
    saveVapiKey: async (venueId: string, apiKey: string) => {
        const { data } = await api.post(`/voice/vapi/save-key?venue_id=${venueId}`, { api_key: apiKey });
        return data;
    },

    getVapiStatus: async (venueId: string) => {
        const { data } = await api.get(`/voice/vapi/status?venue_id=${venueId}`);
        return data;
    },

    syncVapiAssistant: async (venueId: string) => {
        const { data } = await api.post(`/voice/vapi/sync-assistant?venue_id=${venueId}`);
        return data;
    },

    setVapiPhone: async (venueId: string, phoneNumberId: string) => {
        const { data } = await api.post(`/voice/vapi/set-phone?venue_id=${venueId}`, { phone_number_id: phoneNumberId });
        return data;
    },

    testVapiCall: async (venueId: string, phoneNumber: string) => {
        const { data } = await api.post(`/voice/vapi/test-call?venue_id=${venueId}`, { phone_number: phoneNumber });
        return data;
    },

    disconnectVapi: async (venueId: string) => {
        const { data } = await api.post(`/voice/vapi/disconnect?venue_id=${venueId}`);
        return data;
    },
};
