/**
 * 🧠 Restin.AI — Unified AI Client
 * ==================================
 * All AI calls are proxied through the backend API.
 * Frontend NEVER calls AI providers directly (API keys stay server-side).
 *
 * Usage:
 *   import { aiClient } from '@/lib/ai/ai-client';
 *   const result = await aiClient.complete("What are today's sales?", { taskType: 'copilot' });
 */

import api from '../api';

// ─── Response Types ────────────────────────────────────────────

export interface AICompletionResponse {
    text: string;
    provider: string;
    model: string;
    tokens_in: number;
    tokens_out: number;
    latency_ms: number;
    cost_usd: number;
    error?: string;
}

export interface AIEmbeddingResponse {
    vectors: number[][];
    provider: string;
    model: string;
    dimensions: number;
    tokens_used: number;
}

export interface AIImageResponse {
    url: string;
    base64: string;
    provider: string;
    model: string;
    revised_prompt: string;
}

export interface AIProviderInfo {
    provider: string;
    display_name: string;
    url: string;
    free_tier: string;
    capabilities: string[];
    key_format: string;
    status: 'connected' | 'disconnected' | 'error';
    masked_key: string;
    connected_at: string;
    last_tested: string;
}

export interface AIModelInfo {
    id: string;
    provider: string;
    category: string;
    tier: string;
    name: string;
    description: string;
    free?: boolean;
    rpm: number;
    tpm: number | null;
    rpd: number | null;
}

export interface FallbackChain {
    provider: string;
    model: string;
}

// ─── Completion Options ────────────────────────────────────────

export interface CompletionOptions {
    taskType?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    overrideProvider?: string;
    overrideModel?: string;
}

// ─── AI Client ─────────────────────────────────────────────────

export const aiClient = {
    /**
     * Text completion via smart routing.
     * The backend decides which provider/model to use based on task type.
     */
    complete: async (
        prompt: string,
        options: CompletionOptions = {}
    ): Promise<AICompletionResponse> => {
        const { data } = await api.post<AICompletionResponse>('/ai/complete', {
            prompt,
            task_type: options.taskType || 'default',
            system_prompt: options.systemPrompt || '',
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 1024,
            override_provider: options.overrideProvider || '',
            override_model: options.overrideModel || '',
        });
        return data;
    },

    /**
     * Generate embeddings for RAG / semantic search.
     */
    embed: async (texts: string[]): Promise<AIEmbeddingResponse> => {
        const { data } = await api.post<AIEmbeddingResponse>('/ai/embed', { texts });
        return data;
    },

    /**
     * Generate an image using configured provider.
     */
    generateImage: async (prompt: string): Promise<AIImageResponse> => {
        const { data } = await api.post<AIImageResponse>('/ai/image', { prompt });
        return data;
    },

    /**
     * Text-to-speech.
     */
    synthesize: async (text: string, voice?: string): Promise<Blob> => {
        const response = await api.post('/ai/tts', { text, voice }, { responseType: 'blob' });
        return response.data as Blob;
    },

    /**
     * Speech-to-text.
     */
    transcribe: async (audioBlob: Blob): Promise<{ text: string; confidence: number }> => {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        const { data } = await api.post('/ai/stt', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    },

    // ─── Provider Management ─────────────────────────────────────

    /**
     * Get all available provider info (display name, free tier, capabilities).
     */
    getProviderInfo: async (): Promise<{ providers: Record<string, AIProviderInfo> }> => {
        const { data } = await api.get('/ai/providers/info');
        return data;
    },

    /**
     * Get connection status of all providers for the current tenant.
     */
    getProviderStatus: async (): Promise<{ providers: AIProviderInfo[] }> => {
        const { data } = await api.get('/ai/providers/status');
        return data;
    },

    /**
     * Save an API key for a provider.
     */
    saveProviderKey: async (
        provider: string,
        apiKey: string,
        extraConfig: Record<string, string> = {}
    ): Promise<{ status: string; masked_key: string }> => {
        const { data } = await api.post(`/ai/providers/keys/${provider}`, {
            api_key: apiKey,
            extra_config: extraConfig,
        });
        return data;
    },

    /**
     * Remove a provider's API key.
     */
    deleteProviderKey: async (provider: string): Promise<{ status: string }> => {
        const { data } = await api.delete(`/ai/providers/keys/${provider}`);
        return data;
    },

    /**
     * Test connectivity with a stored provider key.
     */
    testProviderKey: async (
        provider: string
    ): Promise<{ status: string; message: string; latency_ms: number }> => {
        const { data } = await api.post(`/ai/providers/keys/${provider}/test`);
        return data;
    },

    // ─── Model Registry ──────────────────────────────────────────

    /**
     * Get all available models across all providers.
     */
    getModels: async (params?: {
        category?: string;
        provider?: string;
        freeOnly?: boolean;
    }): Promise<{ models: Record<string, AIModelInfo> }> => {
        const { data } = await api.get('/ai/settings/models', { params });
        return data;
    },

    /**
     * Get routing configuration (fallback chains + task mapping).
     */
    getRouting: async (): Promise<{
        chains: Record<string, FallbackChain[]>;
        task_mapping: Record<string, string>;
    }> => {
        const { data } = await api.get('/ai/providers/routing');
        return data;
    },
};

export default aiClient;
