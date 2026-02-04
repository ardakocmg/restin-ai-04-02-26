import { useState, useEffect } from 'react';
import seedData from '../data/seed-master.json';
import { SeedData } from '../types';

export const useMockData = () => {
    const [data, setData] = useState<SeedData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate async load
        const loadData = async () => {
            try {
                // In a real app, we might fetch this or just use the import
                // For now, we strictly use the imported JSON as the source of truth
                setData(seedData as unknown as SeedData);
            } catch (error) {
                console.error("Failed to load seed data", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    return { data, loading };
};
