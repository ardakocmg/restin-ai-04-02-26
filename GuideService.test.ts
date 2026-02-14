import { GuideService } from '../GuideService';
import api from '../../lib/api';

// Mock the API client
jest.mock('../../lib/api', () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    defaults: {
        headers: {
            common: {}
        }
    }
}));

describe('GuideService', () => {
    const mockVenueId = 'venue-123';
    const mockGuideId = 'guide-uuid-456';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getGuideByEntity', () => {
        it('should fetch a guide by entity type and ID', async () => {
            const mockGuide = { id: mockGuideId, title: 'Steak Prep' };
            (api.get as jest.Mock).mockResolvedValue({ data: mockGuide });

            const result = await GuideService.getGuideByEntity('menu_item', 'item-789');

            expect(api.get).toHaveBeenCalledWith('/guides/entity/menu_item/item-789');
            expect(result).toEqual(mockGuide);
        });

        it('should return null if guide not found (404)', async () => {
            (api.get as jest.Mock).mockRejectedValue({ response: { status: 404 } });

            const result = await GuideService.getGuideByEntity('menu_item', 'item-999');

            expect(result).toBeNull();
        });
    });

    describe('createGuide', () => {
        it('should create a new guide', async () => {
            const newGuideData = {
                venue_id: mockVenueId,
                entity_type: 'menu_item',
                entity_id: 'item-789',
                guide_kind: 'service',
                steps: []
            };
            const createdGuide = { ...newGuideData, id: mockGuideId };
            (api.post as jest.Mock).mockResolvedValue({ data: createdGuide });

            const result = await GuideService.createGuide(newGuideData);

            expect(api.post).toHaveBeenCalledWith('/guides', newGuideData);
            expect(result).toEqual(createdGuide);
        });
    });

    describe('uploadAsset', () => {
        it('should upload an image asset using FormData', async () => {
            // Create a mock file (simulating a valid PNG image)
            const file = new File(['(⌐■_■)'], 'test-image.png', { type: 'image/png' });
            const mockResponse = {
                id: 'asset-123',
                url: '/uploads/test-image.png'
            };

            (api.post as jest.Mock).mockResolvedValue({ data: mockResponse });

            const result = await GuideService.uploadAsset(file, mockVenueId);

            expect(api.post).toHaveBeenCalledTimes(1);

            // Verify the first argument is the correct endpoint
            expect(api.post.mock.calls[0][0]).toBe('/assets/upload');

            // Verify the second argument is FormData
            const formData = api.post.mock.calls[0][1];
            expect(formData).toBeInstanceOf(FormData);
            expect(formData.get('file')).toBe(file);
            expect(formData.get('venue_id')).toBe(mockVenueId);

            // Verify headers for multipart/form-data
            const config = api.post.mock.calls[0][2];
            expect(config.headers['Content-Type']).toBe('multipart/form-data');

            expect(result).toEqual(mockResponse);
        });
    });

    describe('hasGuide', () => {
        it('should return true if guide exists', async () => {
            (api.get as jest.Mock).mockResolvedValue({ data: { id: mockGuideId } });

            const exists = await GuideService.hasGuide('menu_item', 'item-789');
            expect(exists).toBe(true);
        });

        it('should return false if guide does not exist', async () => {
            (api.get as jest.Mock).mockRejectedValue({ response: { status: 404 } });

            const exists = await GuideService.hasGuide('menu_item', 'item-999');
            expect(exists).toBe(false);
        });
    });

    describe('listGuides', () => {
        it('should list all guides for a venue', async () => {
            const mockGuides = [{ id: 1 }, { id: 2 }];
            (api.get as jest.Mock).mockResolvedValue({ data: mockGuides });

            const result = await GuideService.listGuides(mockVenueId);

            expect(api.get).toHaveBeenCalledWith(`/venues/${mockVenueId}/guides`);
            expect(result).toEqual(mockGuides);
        });
    });

    describe('updateGuide', () => {
        it('should update an existing guide', async () => {
            const updateData = { steps: [{ title: 'New Step' }] };
            const updatedGuide = { id: mockGuideId, ...updateData };
            (api.put as jest.Mock).mockResolvedValue({ data: updatedGuide });

            const result = await GuideService.updateGuide(mockGuideId, updateData);

            expect(api.put).toHaveBeenCalledWith(`/guides/${mockGuideId}`, updateData);
            expect(result).toEqual(updatedGuide);
        });
    });
});