import { BackendDose, DayOfWeek } from '../../services/api';
import { StoredMedication } from '../../store/medicationSlice';

export interface DisplayDose {
    backendId: number;
    doseKey: string;       // "{backendId}_{YYYY-MM-DD}"
    medicineName: string;
    doseName: string;
    time: string;          // "HH:mm" 24h
    displayTime: string;   // "8:00 AM"
    doseInMilligram: number;
    date: string;          // "YYYY-MM-DD"
}

// Used by schedule.tsx for local (stored) medications
export interface ComputedDose {
    doseKey: string;        // "{medicationId}_{doseRuleId}_{YYYY-MM-DD}"
    medicationId: string;
    medicationName: string;
    doseName: string;
    amount: string;
    time: string;           // "HH:mm"
    displayTime: string;
    date: string;           // "YYYY-MM-DD"
}

// JS getDay() → Java DayOfWeek
const JS_DAY_TO_JAVA: DayOfWeek[] = [
    'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
];

export function toDateString(date: Date): string {
    const y = date.getFullYear();
    const mo = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${mo}-${d}`;
}

export function formatTime(hhmm: string): string {
    const [hStr, mStr] = hhmm.split(':');
    let h = parseInt(hStr);
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${mStr} ${suffix}`;
}

// Extract HH:mm from backend "HH:mm:ss"
export function parseBackendTime(localTime: string): string {
    const parts = localTime.split(':');
    return `${parts[0]}:${parts[1]}`;
}

/**
 * Returns true if the dose is more than 24 hours past its scheduled datetime.
 * These doses should be treated as MISSED and cannot be taken or skipped.
 */
export function isPastDeadline(dose: DisplayDose): boolean {
    try {
        const doseDateTime = new Date(`${dose.date}T${dose.time}:00`);
        return Date.now() - doseDateTime.getTime() > 24 * 60 * 60 * 1000;
    } catch {
        return false;
    }
}

export function getDosesForDate(doses: BackendDose[], date: Date): DisplayDose[] {
    const targetDay = JS_DAY_TO_JAVA[date.getDay()];
    const dateStr = toDateString(date);

    return doses
        .filter(dose => {
            if (dose.doseDay !== targetDay) return false;
            if (dose.startDate && dose.startDate > dateStr) return false;
            if (dose.endDate && dose.endDate < dateStr) return false;
            return true;
        })
        .map(dose => {
            const time = parseBackendTime(dose.localTime);
            return {
                backendId: dose.id,
                doseKey: `${dose.id}_${dateStr}`,
                medicineName: dose.medicine?.name ?? dose.name,
                doseName: dose.name,
                time,
                displayTime: formatTime(time),
                doseInMilligram: dose.doseInMilligram,
                date: dateStr,
            };
        })
        .sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Compute doses from locally stored medications (medicationSlice) for a given date.
 */
export function computeDosesForDate(medications: StoredMedication[], date: Date): ComputedDose[] {
    const dateStr = toDateString(date);
    const result: ComputedDose[] = [];

    for (const med of medications) {
        if (med.startDate && med.startDate > dateStr) continue;
        if (med.endDate && med.endDate < dateStr) continue;

        for (const rule of med.doses) {
            const doseKey = `${med.id}_${rule.id}_${dateStr}`;
            result.push({
                doseKey,
                medicationId: med.id,
                medicationName: med.name,
                doseName: rule.id,
                amount: rule.amount,
                time: rule.time,
                displayTime: formatTime(rule.time),
                date: dateStr,
            });
        }
    }

    return result.sort((a, b) => a.time.localeCompare(b.time));
}

export function getCurrentHHMM(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

// Group backend doses by their "name" field
export function groupDosesByName(doses: BackendDose[]): Record<string, BackendDose[]> {
    return doses.reduce<Record<string, BackendDose[]>>((acc, dose) => {
        const key = `${dose.name}__${dose.medicine?.id ?? 0}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(dose);
        return acc;
    }, {});
}

export const DAY_SHORT: Record<DayOfWeek, string> = {
    MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
    FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

export const ORDERED_DAYS: DayOfWeek[] = [
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
];