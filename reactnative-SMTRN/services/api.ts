import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export const BASE_URL = `https://mta-dew3.onrender.com`;

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error?.response?.status;
        console.log('[api] error response:', status, error?.config?.url);

        if (status === 401 || status === 403) {
            await AsyncStorage.multiRemove(['token', 'username', 'name', 'userId', 'roles']);

            try {
                const { store } = await import('../store/store');
                const { clearAuth } = await import('../store/authSlice');
                store.dispatch(clearAuth());
            } catch (_) {}

            router.replace('/login');
        }

        return Promise.reject(error);
    }
);

export default api;

export type DayOfWeek =
    | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY'
    | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export const ALL_DAYS: DayOfWeek[] = [
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
    MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
    FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

export const EFFECTS = [
    'PAIN_NUMBING', 'ANTI_FUNGAL', 'ANTI_BACTERIAL', 'ANTI_VIRAL',
    'RELAXANT', 'STIMULANT', 'BP_REGULATOR',
] as const;

export const SIDE_EFFECTS = [
    'NAUSEA', 'DROWSINESS', 'HEADACHE', 'UPSET_STOMACH', 'INCREASED_HEARTBEAT',
] as const;

export const RESTRICTIONS = [
    'AFTER_EATING', 'BEFORE_EATING', 'NON_PREGNANT_ONLY',
] as const;

export const INGESTION_METHODS = [
    'TRANSDERMAL', 'ORAL', 'RECTAL', 'INTERMUSCULAR_INJECTION',
    'INTERVENOUS_INJECTION', 'TRANSNASAL', 'INHALATION',
] as const;

export const AILMENT_STATUSES = ['ONGOING', 'RECOVERING', 'CURED', 'CHRONIC'] as const;
export type AilmentStatus = typeof AILMENT_STATUSES[number];

export interface BackendMedicine {
    id: number;
    name: string;
    isCustom: boolean | null;
    isProtected: boolean | null;
    effects?: Array<{ id: number; name: string }>;
    restrictions?: Array<{ id: number; name: string }>;
    ingestionMethods?: Array<{ id: number; name: string }>;
    sideEffects?: Array<{ id: number; name: string }>;
}

export interface BackendDose {
    id: number;
    name: string;
    doseDay: DayOfWeek;
    localTime: string;
    doseInMilligram: number;
    startDate: string;
    endDate?: string;
    doseSimpleIdentifier?: string;
    isActive: boolean | null;
    medicine: BackendMedicine;
    addedBy?: {
        id: number;
        username: string;
        name: string;
    };
}

export interface BackendPastDose {
    id: number;
    date: string;
    doseStatus?: {
        id: number;
        name: string;
    };
    dose?: BackendDose;
}

export interface BackendAilmentType {
    id: number;
    name: string;
    ailmentDescription?: string;
    isPhysical?: boolean;
}

export interface BackendAilment {
    id: number;
    ailmentName: string;
    ailmentStatus?: { id: number; name: AilmentStatus };
    ailmentType?: BackendAilmentType;
}

export interface BackendMessage {
    id: number;
    message: string;
    read: boolean;
    timeCreated: string;
}