/**
 * useShiftService — Stub hook for shift management
 * TODO: Connect to real backend shift API
 */
export function useShiftService() {
    return {
        shifts: [] as any[],
        loading: false,
        error: null as string | null,
        createShift: async (_data: any) => { },
        updateShift: async (_id: string, _data: any) => { },
        deleteShift: async (_id: string) => { },
        fetchShifts: async () => { },
    };
}
