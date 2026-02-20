import api from '../lib/api';

export interface GuidePhoto {
  asset_id: string;
  label: 'plating' | 'storage' | 'pack' | 'delivery_note' | 'invoice' | 'other';
  url: string;
  created_at: string;
}

export interface GuideStep {
  step_no: number;
  title: string;
  description: string;
  duration_seconds?: number;
  critical: boolean;
  required_tools: string[];
  station?: string;
}

export interface GuideMeasure {
  line_type: string;
  ref_type: string;
  ref_id?: string;
  name: string;
  qty_value: number;
  qty_unit_input: string;
  qty_unit_canonical: string;
  qty_value_canonical: number;
  unit_dimension: string;
  yield_pct?: number;
  waste_pct?: number;
  notes?: string;
}

export interface GuideDocument {
  id: string;
  venue_id: string;
  entity_type: 'menu_item' | 'inventory_item' | 'recipe' | 'receiving' | 'task_template';
  entity_id: string;
  guide_kind: 'service' | 'prep' | 'storage' | 'receiving' | 'recipe';
  version: number;
  photos: GuidePhoto[];
  steps: GuideStep[];
  measures: GuideMeasure[];
  tags: string[];
  created_at: string;
  updated_at: string;
  updated_by_user_id?: string;
}

export interface Asset {
  id: string;
  venue_id: string;
  type: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  url: string;
  created_at: string;
  created_by: string;
}

class GuideService {
  /**
   * Upload an asset (photo) for guides
   */
  async uploadAsset(venueId: string, file: File): Promise<Asset> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/assets/upload?venue_id=${venueId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * List all guides for a venue
   */
  async listGuides(
    venueId: string,
    filters?: {
      entity_type?: string;
      entity_id?: string;
      guide_kind?: string;
    }
  ): Promise<GuideDocument[]> {
    const params = new URLSearchParams();
    if (filters?.entity_type) params.append('entity_type', filters.entity_type);
    if (filters?.entity_id) params.append('entity_id', filters.entity_id);
    if (filters?.guide_kind) params.append('guide_kind', filters.guide_kind);

    const response = await api.get(`/venues/${venueId}/guides?${params.toString()}`);
    return response.data;
  }

  /**
   * Get a specific guide by ID
   */
  async getGuide(guideId: string): Promise<GuideDocument> {
    const response = await api.get(`/guides/${guideId}`);
    return response.data;
  }

  /**
   * Get guide for a specific entity (menu item, inventory item, etc.)
   */
  async getGuideByEntity(
    entityType: string,
    entityId: string,
    guideKind?: string
  ): Promise<GuideDocument | null> {
    const params = guideKind ? `?guide_kind=${guideKind}` : '';
    const response = await api.get(`/guides/entity/${entityType}/${entityId}${params}`);
    return response.data;
  }

  /**
   * Create a new guide
   */
  async createGuide(data: Partial<GuideDocument>): Promise<GuideDocument> {
    const response = await api.post('/guides', data);
    return response.data;
  }

  /**
   * Update an existing guide
   */
  async updateGuide(guideId: string, data: Partial<GuideDocument>): Promise<void> {
    await api.put(`/guides/${guideId}`, data);
  }

  /**
   * Delete a guide
   */
  async deleteGuide(guideId: string): Promise<void> {
    await api.delete(`/guides/${guideId}`);
  }

  /**
   * Helper: Check if entity has a guide
   */
  async hasGuide(entityType: string, entityId: string, guideKind?: string): Promise<boolean> {
    try {
      const guide = await this.getGuideByEntity(entityType, entityId, guideKind);
      return guide !== null;
    } catch {
      return false;
    }
  }
}

export default new GuideService();
