import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type RepeatUnit = 'Hour' | 'Day' | 'Month';

export interface DoseRule {
    id: string;
    amount: string;
    time: string; // "HH:mm" 24h
    repeatValue: number;
    repeatUnit: RepeatUnit;
}

export interface StoredMedication {
    id: string;
    name: string;
    dose: string;
    method: string;
    effects?: string;
    isCustom?: boolean;
    doses: DoseRule[];
    startDate: string; // "YYYY-MM-DD"
    endDate?: string;  // "YYYY-MM-DD"
}

interface MedicationState {
    medications: StoredMedication[];
}

const initialState: MedicationState = { medications: [] };

const medicationSlice = createSlice({
    name: 'medications',
    initialState,
    reducers: {
        addMedication: (state, action: PayloadAction<StoredMedication>) => {
            state.medications.push(action.payload);
        },
        updateMedication: (state, action: PayloadAction<StoredMedication>) => {
            const idx = state.medications.findIndex(m => m.id === action.payload.id);
            if (idx !== -1) state.medications[idx] = action.payload;
        },
        removeMedication: (state, action: PayloadAction<string>) => {
            state.medications = state.medications.filter(m => m.id !== action.payload);
        },
    },
});

export const { addMedication, updateMedication, removeMedication } = medicationSlice.actions;
export default medicationSlice.reducer;