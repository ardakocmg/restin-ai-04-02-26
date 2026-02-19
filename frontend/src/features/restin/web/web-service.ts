import api from '../../../lib/api';

interface MenuItemResponse {
    id: string;
    name: string;
    price_cents: number;
    description?: string;
    category_id: string;
    image_url?: string;
}

interface WebSiteConfig {
    sections: Array<{ id: string; type: string; content: Record<string, unknown> }>;
    theme: Record<string, unknown>;
    metadata?: Record<string, string>;
}

/**
 * 🕸️ Web Architect Service (Pillar 2)
 * Handles data fetching and persistence for the Digital Storefront.
 */
export const webBuilderService = {
    /**
     * Fetch active menu items for "Live Menu" section.
     * Uses the existing menuAPI logic but specialized for the builder view.
     */
    getActiveMenuItems: async (venueId: string) => {
        // 1. Get active menu
        const menuRes = await api.get(`/venues/${venueId}/menus/active`);
        if (!menuRes.data) return [];

        // 2. Get categories for this menu
        const categoriesRes = await api.get(`/venues/${venueId}/menu/categories?menu_id=${menuRes.data.id}`);
        const categories = categoriesRes.data;

        // 3. Get items (simplified for builder preview)
        const itemsRes = await api.get(`/venues/${venueId}/menu/items?menu_id=${menuRes.data.id}&include_inactive=false`);
        const items = itemsRes.data;

        // Return structured data for the builder
        return {
            menuName: menuRes.data.name,
            categories: categories,
            items: items.map((item: MenuItemResponse) => ({
                id: item.id,
                name: item.name,
                price: (item.price_cents / 100).toFixed(2),
                description: item.description,
                categoryId: item.category_id,
                image: item.image_url // Assuming image_url exists
            }))
        };
    },

    /**
     * Publish the site configuration.
     * Saves the current builder state to Public Content API.
     */
    publishSite: async (siteConfig: WebSiteConfig) => {
        return api.post('/public-content', {
            type: 'web_builder_config',
            content: siteConfig,
            changelog: 'Published via Web Architect'
        });
    }
};
