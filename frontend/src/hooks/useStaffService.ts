/**
 * useStaffService — Stub hook for staff management
 * TODO: Connect to real backend staff API
 */
export function useStaffService() {
    return {
        staff: [] as any[],
        loading: false,
        error: null as string | null,
        fetchStaff: async () => { },
    };
}
