/**
 * useShiftService — Stub hook for shift management
 * NOTE: Connect to real backend shift API
 */
export function useShiftService() {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        shifts: [] as any[],
        loading: false,
        error: null as string | null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createShift: async (_data: any) => { },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateShift: async (_id: string, _data: any) => { },
        deleteShift: async (_id: string) => { },
        fetchShifts: async () => { },
    };
}
