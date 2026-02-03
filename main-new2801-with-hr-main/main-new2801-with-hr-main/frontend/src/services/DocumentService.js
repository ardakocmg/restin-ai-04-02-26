/**
 * Shared Document Service
 * Unified upload for all modules (HR, Inventory, Finance, CRM, Reporting)
 */
import api from "../lib/api";

class DocumentService {
  /**
   * Upload document with OCR
   * @param {string} venueId - Venue ID
   * @param {string} module - Module name (HR, INVENTORY, FINANCE, CRM, REPORTING)
   * @param {File} file - File object
   */
  async upload({ venue_id, module, file }) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("venue_id", venue_id);
    formData.append("module", module);

    const response = await api.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    
    return response.data;
  }

  /**
   * List documents
   * @param {string} venueId - Venue ID
   * @param {string} module - Optional module filter
   */
  async list({ venue_id, module }) {
    const params = { venue_id };
    if (module) params.module = module;
    
    const response = await api.get("/documents", { params });
    return response.data;
  }

  /**
   * Get single document
   * @param {string} documentId - Document ID
   */
  async get(documentId) {
    const response = await api.get(`/documents/${documentId}`);
    return response.data;
  }

  /**
   * Delete document
   * @param {string} documentId - Document ID
   */
  async delete(documentId) {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  }
}

export default new DocumentService();
