/**
 * Document Service - Unified document upload/OCR for all modules
 * @module services/DocumentService
 */
import api from '../lib/api';

export type DocumentModule = 'HR' | 'INVENTORY' | 'FINANCE' | 'CRM' | 'REPORTING';

export interface UploadParams {
    venue_id: string;
    module: DocumentModule;
    file: File;
}

export interface ListParams {
    venue_id: string;
    module?: DocumentModule;
}

export interface Document {
    id: string;
    venue_id: string;
    module: DocumentModule;
    filename: string;
    url: string;
    mime_type: string;
    size_bytes: number;
    ocr_text?: string;
    metadata?: /**/any;
    created_at: string;
    updated_at: string;
}

export interface UploadResponse {
    document: Document;
    ocr_text?: string;
}

class DocumentService {
    /**
     * Upload document with OCR
     */
    async upload({ venue_id, module, file }: UploadParams): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('venue_id', venue_id);
        formData.append('module', module);

        const response = await api.post('/documents/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        return response.data;
    }

    /**
     * List documents
     */
    async list({ venue_id, module }: ListParams): Promise<Document[]> {
        const params: Record<string, string> = { venue_id };
        if (module) params.module = module;

        const response = await api.get('/documents', { params });
        return response.data;
    }

    /**
     * Get single document
     */
    async get(documentId: string): Promise<Document> {
        const response = await api.get(`/documents/${documentId}`);
        return response.data;
    }

    /**
     * Delete document
     */
    async delete(documentId: string): Promise<{ success: boolean }> {
        const response = await api.delete(`/documents/${documentId}`);
        return response.data;
    }
}

export default new DocumentService();
