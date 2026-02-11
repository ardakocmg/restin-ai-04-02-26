import { User } from '../../types';

export interface LoginResponse {
    token?: string;
    accessToken?: string;
    user: User;
    allowedVenueIds?: string[];
    defaultVenueId?: string;
    requires_mfa?: boolean;
    user_id?: string;
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (userData: User, token: string) => void;
    logout: () => void;
    isOwner: () => boolean;
    isManager: () => boolean;
    isStaff: () => boolean;
    isAuthenticated: boolean;
}
