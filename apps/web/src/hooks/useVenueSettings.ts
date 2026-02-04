import { useState, useEffect } from 'react';

export function useVenueSettings(venueId: string) {
    // Mock settings for now
    const [settings, setSettings] = useState({
        pos: {
            send_checkbox_print: true,
            send_checkbox_kds: true,
            send_checkbox_stock: true
        },
        kds: {
            show_seat: true,
            show_course: true,
            show_round_badge: true
        }
    });
    const [loading, setLoading] = useState(false);

    return { settings, loading };
}
