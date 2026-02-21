/**
 * useStaffService — Stub hook for staff management
 * NOTE: Connect to real backend staff API
 */
export function useStaffService() {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        staff: [] as unknown[],
        loading: false,
        error: null as string | null,
        fetchStaff: async () => { },
    };
}
