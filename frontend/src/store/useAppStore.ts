import { create } from 'zustand';

interface AppState {
    organizationId: string | null;
    brandId: string | null;
    branchId: string | null;
    setOrganizationId: (id: string) => void;
    setBrandId: (id: string) => void;
    setBranchId: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
    organizationId: null,
    brandId: null,
    branchId: null,
    setOrganizationId: (id) => set({ organizationId: id }),
    setBrandId: (id) => set({ brandId: id }),
    setBranchId: (id) => set({ branchId: id }),
}));
