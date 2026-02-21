/**
 * Unified Accounting Service Hook
 * 
 * Shared data layer for POS config pages (AccountingGroups, TaxSettings, PaymentMethods)
 * and Finance module (AccountingHub, FinanceDashboard).
 */
import { useCallback,useEffect,useState } from 'react';
import api from '../../lib/api';
import { logger } from '../../lib/logger';

export interface AccountingGroup {
    id: string;
    name: string;
    code?: string;
    type: string; // revenue | expense | asset | liability
    parent_id?: string;
    venue_id: string;
}

export interface TaxProfile {
    id: string;
    name: string;
    rate: number;
    code?: string;
    is_default?: boolean;
    venue_id: string;
}

export interface PaymentMethod {
    id: string;
    name: string;
    type: string; // cash | card | mobile | voucher
    enabled: boolean;
    provider?: string;
    venue_id: string;
}

interface UseAccountingServiceOptions {
    venueId: string;
    enabled?: boolean;
}

export function useAccountingService(options: UseAccountingServiceOptions) {
    const { venueId, enabled = true } = options;

    const [accountingGroups, setAccountingGroups] = useState<AccountingGroup[]>([]);
    const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        if (!venueId || !enabled) return;
        setLoading(true);
        setError(null);
        try {
            const [groupsRes, taxRes, paymentsRes] = await Promise.allSettled([
                api.get(`/venues/${venueId}/accounting/groups`),
                api.get(`/venues/${venueId}/accounting/tax-profiles`),
                api.get(`/venues/${venueId}/accounting/payment-methods`),
            ]);

            if (groupsRes.status === 'fulfilled') {
                const data = groupsRes.value.data?.groups || groupsRes.value.data || [];
                setAccountingGroups(Array.isArray(data) ? data : []);
            }
            if (taxRes.status === 'fulfilled') {
                const data = taxRes.value.data?.profiles || taxRes.value.data || [];
                setTaxProfiles(Array.isArray(data) ? data : []);
            }
            if (paymentsRes.status === 'fulfilled') {
                const data = paymentsRes.value.data?.methods || paymentsRes.value.data || [];
                setPaymentMethods(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            logger.error('Failed to fetch accounting data:', err as /**/any);
            setError('Failed to load accounting configuration');
        } finally {
            setLoading(false);
        }
    }, [venueId, enabled]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const saveAccountingGroup = useCallback(
        async (group: Partial<AccountingGroup>) => {
            if (!venueId) return;
            try {
                if (group.id) {
                    await api.put(`/venues/${venueId}/accounting/groups/${group.id}`, group);
                } else {
                    await api.post(`/venues/${venueId}/accounting/groups`, { ...group, venue_id: venueId });
                }
                await fetchAll();
            } catch (err) {
                logger.error('Failed to save accounting group:', err as /**/any);
                throw err;
            }
        },
        [venueId, fetchAll]
    );

    const saveTaxProfile = useCallback(
        async (profile: Partial<TaxProfile>) => {
            if (!venueId) return;
            try {
                if (profile.id) {
                    await api.put(`/venues/${venueId}/accounting/tax-profiles/${profile.id}`, profile);
                } else {
                    await api.post(`/venues/${venueId}/accounting/tax-profiles`, { ...profile, venue_id: venueId });
                }
                await fetchAll();
            } catch (err) {
                logger.error('Failed to save tax profile:', err as /**/any);
                throw err;
            }
        },
        [venueId, fetchAll]
    );

    const savePaymentMethod = useCallback(
        async (method: Partial<PaymentMethod>) => {
            if (!venueId) return;
            try {
                if (method.id) {
                    await api.put(`/venues/${venueId}/accounting/payment-methods/${method.id}`, method);
                } else {
                    await api.post(`/venues/${venueId}/accounting/payment-methods`, { ...method, venue_id: venueId });
                }
                await fetchAll();
            } catch (err) {
                logger.error('Failed to save payment method:', err as /**/any);
                throw err;
            }
        },
        [venueId, fetchAll]
    );

    return {
        accountingGroups,
        taxProfiles,
        paymentMethods,
        loading,
        error,
        refetch: fetchAll,
        saveAccountingGroup,
        saveTaxProfile,
        savePaymentMethod,
    };
}

export default useAccountingService;
