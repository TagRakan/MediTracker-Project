import { AilmentStatus, DayOfWeek } from '../../services/api';

export type PatientTab = 'doses' | 'history' | 'ailments' | 'family';

export interface Patient {
    id: number;
    username: string;
    displayName: string;
}

export interface FamilyAilmentEntry {
    name: string;
    ailments: import('../../services/api').BackendAilment[];
}

export const STATUS_LABELS: Record<AilmentStatus, string> = {
    ONGOING: 'Ongoing',
    RECOVERING: 'Recovering',
    CURED: 'Cured',
    CHRONIC: 'Chronic',
};

export const DAY_SHORT: Record<DayOfWeek, string> = {
    MONDAY: 'Mo', TUESDAY: 'Tu', WEDNESDAY: 'We', THURSDAY: 'Th',
    FRIDAY: 'Fr', SATURDAY: 'Sa', SUNDAY: 'Su',
};

export function statusColor(name: string): string {
    switch (name) {
        case 'TAKEN': return '#16a34a';
        case 'TAKEN_EARLY': return '#2563eb';
        case 'TAKEN_LATE': return '#f97316';
        case 'SKIPPED': return '#94a3b8';
        case 'MISSED': return '#ef4444';
        default: return '#94a3b8';
    }
}

export function statusBg(name: string): string {
    switch (name) {
        case 'TAKEN': return '#dcfce7';
        case 'TAKEN_EARLY': return '#dbeafe';
        case 'TAKEN_LATE': return '#ffedd5';
        case 'SKIPPED': return '#f1f5f9';
        case 'MISSED': return '#fee2e2';
        default: return '#f1f5f9';
    }
}

export function statusLabel(name: string): string { return name.replace(/_/g, ' '); }

export function timeToDate(hhmm: string): Date {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}

export function dateToTimeString(d: Date): string {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:00`;
}