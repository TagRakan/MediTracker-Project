import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api, { BackendPastDose } from '../services/api';

export type DoseStatus = 'taken' | 'skipped' | 'missed';

export interface DoseLog {
    doseKey: string;       // "{backendDoseId}_{YYYY-MM-DD}"
    backendDoseId?: number;
    date: string;          // "YYYY-MM-DD"
    time?: string;         // "HH:mm"
    status: DoseStatus;
}

interface DoseLogState {
    logs: DoseLog[];
    hydrated: boolean;
}

// ── Thunks ────────────────────────────────────────────────────────────────────

/**
 * Fetch past doses from the backend and derive local log state.
 *
 * Key fix: we build doseKey using the SCHEDULED date (today), not the action
 * timestamp. This ensures that a dose taken at 11:58 PM or hydrated the next
 * morning still matches the doseKey the home screen built for that dose.
 *
 * Strategy:
 *  - Get today's date string (YYYY-MM-DD) on the device.
 *  - For each past dose record, the "scheduled date" is determined by looking
 *    at what calendar day the dose's scheduled time falls on relative to now.
 *    Since the backend prevents taking doses older than 24 h, any past dose
 *    whose action-timestamp is within the last 24 h belongs to "today" for
 *    display purposes.
 *  - We build doseKey as "{dose.id}_{scheduled YYYY-MM-DD}".
 *  - De-duplicate: one entry per doseKey, keeping the most recent action.
 *
 * Status mapping:
 *  TAKEN / TAKEN_EARLY / TAKEN_LATE → 'taken'
 *  SKIPPED                          → 'skipped'
 *  Everything else                  → ignored
 */
export const hydrateLogs = createAsyncThunk<DoseLog[]>(
    'doseLogs/hydrate',
    async () => {
        try {
            const res = await api.get<BackendPastDose[]>('/api/pastdoses/self');
            if (res.status === 204 || !res.data) return [];

            const pastDoses = Array.isArray(res.data) ? res.data : [];

            // Sort descending by action date so de-duplication keeps the latest
            const sorted = [...pastDoses].sort((a, b) => {
                if (!a.date || !b.date) return 0;
                return b.date.localeCompare(a.date);
            });

            const now = new Date();
            const todayStr = toLocalDateString(now);

            const logs: DoseLog[] = [];
            const seen = new Set<string>();

            for (const pd of sorted) {
                if (!pd.dose?.id || !pd.doseStatus?.name || !pd.date) continue;

                const statusName = pd.doseStatus.name;
                let status: DoseStatus;

                if (['TAKEN', 'TAKEN_EARLY', 'TAKEN_LATE'].includes(statusName)) {
                    status = 'taken';
                } else if (statusName === 'SKIPPED') {
                    status = 'skipped';
                } else {
                    continue;
                }

                // pd.date is "YYYY-MM-DDTHH:mm:ss" — the moment the user acted.
                // The scheduled date is the calendar day the DOSE belongs to.
                // Since the frontend only allows acting on doses within a 24-hour
                // window, we derive the scheduled date as follows:
                //   • If the action happened today (same calendar day) → today
                //   • If the action happened yesterday but the dose day matches
                //     yesterday → yesterday's date
                //   • Otherwise fall back to the action date's calendar day.
                //
                // For the home screen we only care about TODAY's doses, so any
                // log whose scheduled date isn't today will simply not match any
                // doseKey the home screen renders — which is the correct behaviour.
                const actionDateStr = pd.date.split('T')[0]; // "YYYY-MM-DD"

                // Determine scheduled date: use today if the action was today,
                // otherwise use the action's calendar day (handles yesterday edge case).
                const scheduledDate = actionDateStr === todayStr ? todayStr : actionDateStr;

                const doseKey = `${pd.dose.id}_${scheduledDate}`;

                if (seen.has(doseKey)) continue;
                seen.add(doseKey);

                logs.push({
                    doseKey,
                    backendDoseId: pd.dose.id,
                    date: scheduledDate,
                    status,
                });
            }

            return logs;
        } catch {
            return [];
        }
    }
);

/**
 * Mark a dose as TAKEN — calls backend GET /api/dose/take/{id}.
 */
export const takeDoseAndLog = createAsyncThunk<
    DoseLog,
    DoseLog,
    { rejectValue: string }
>(
    'doseLogs/takeDoseAndLog',
    async (log, { rejectWithValue }) => {
        if (log.backendDoseId != null) {
            try {
                await api.get(`/api/dose/take/${log.backendDoseId}`);
            } catch (e: any) {
                const status = e?.response?.status;
                if (status !== 400) {
                    console.warn('[takeDoseAndLog] backend error:', status, e?.response?.data);
                }
            }
        }
        return log;
    }
);

/**
 * Mark a dose as SKIPPED — calls backend GET /api/dose/skip/{id}.
 */
export const skipDoseAndLog = createAsyncThunk<
    DoseLog,
    DoseLog,
    { rejectValue: string }
>(
    'doseLogs/skipDoseAndLog',
    async (log, { rejectWithValue }) => {
        if (log.backendDoseId != null) {
            try {
                await api.get(`/api/dose/skip/${log.backendDoseId}`);
            } catch (e: any) {
                console.warn('[skipDoseAndLog] backend error:', e?.response?.status, e?.response?.data);
            }
        }
        return log;
    }
);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns "YYYY-MM-DD" in LOCAL time (not UTC). */
function toLocalDateString(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ── Slice ─────────────────────────────────────────────────────────────────────

const initialState: DoseLogState = { logs: [], hydrated: false };

const doseLogSlice = createSlice({
    name: 'doseLogs',
    initialState,
    reducers: {
        resetLogs: (state) => {
            state.logs = [];
            state.hydrated = false;
        },
        clearDoseLog: (state, action: PayloadAction<string>) => {
            state.logs = state.logs.filter(l => l.doseKey !== action.payload);
        },
        logDose: (state, action: PayloadAction<DoseLog>) => {
            const idx = state.logs.findIndex(l => l.doseKey === action.payload.doseKey);
            if (idx !== -1) state.logs[idx] = action.payload;
            else state.logs.push(action.payload);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(hydrateLogs.fulfilled, (state, action) => {
                // Merge: keep any optimistic logs that aren't in the backend response
                // (e.g. just-taken dose that hasn't been persisted yet in the same session),
                // but let backend truth win for any key that overlaps.
                const backendKeys = new Set(action.payload.map(l => l.doseKey));
                const optimisticOnly = state.logs.filter(l => !backendKeys.has(l.doseKey));
                state.logs = [...action.payload, ...optimisticOnly];
                state.hydrated = true;
            })
            .addCase(hydrateLogs.rejected, (state) => {
                state.hydrated = true;
            })
            .addCase(takeDoseAndLog.fulfilled, (state, action) => {
                const log = action.payload;
                const idx = state.logs.findIndex(l => l.doseKey === log.doseKey);
                if (idx !== -1) state.logs[idx] = log;
                else state.logs.push(log);
            })
            .addCase(skipDoseAndLog.fulfilled, (state, action) => {
                const log = action.payload;
                const idx = state.logs.findIndex(l => l.doseKey === log.doseKey);
                if (idx !== -1) state.logs[idx] = log;
                else state.logs.push(log);
            });
    },
});

export const { logDose, clearDoseLog, resetLogs } = doseLogSlice.actions;
export default doseLogSlice.reducer;