import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { BackendDose, DayOfWeek } from '../services/api';

interface DoseState {
    doses: BackendDose[];
    loading: boolean;
    error: string | null;
    successMessage: string | null;
}

const initialState: DoseState = {
    doses: [], loading: false, error: null, successMessage: null,
};

export const fetchDoses = createAsyncThunk<BackendDose[], void, { rejectValue: string }>(
    'doses/fetchAll', async (_, { rejectWithValue }) => {
        try {
            const res = await api.get<BackendDose[]>('/api/dose/getall');
            return res.data;
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Failed to load doses');
        }
    }
);

export const fetchActiveDoses = createAsyncThunk<BackendDose[], void, { rejectValue: string }>(
    'doses/fetchActive', async (_, { rejectWithValue }) => {
        try {
            const res = await api.get<BackendDose[]>('/api/dose/getactive');
            return res.data;
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Failed to load active doses');
        }
    }
);

export interface AddDosePayload {
    name: string;
    dayOfWeek: DayOfWeek[];
    localTime: string[];
    doseInMilligram: number[];
    medicineId: number;
    startDate?: string;
    endDate?: string;
    simpleDoseIdentifier?: string;
}

function toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function defaultEndDate(startDateStr?: string): string {
    const base = startDateStr ? new Date(startDateStr + 'T00:00:00') : new Date();
    const end = new Date(base);
    end.setFullYear(end.getFullYear() + 1);
    return toDateString(end);
}

export const addDoses = createAsyncThunk<string, AddDosePayload, { rejectValue: string }>(
    'doses/add', async (payload, { rejectWithValue }) => {
        try {
            const body = {
                ...payload,
                startDate: payload.startDate ?? toDateString(new Date()),
                endDate: payload.endDate ?? defaultEndDate(payload.startDate),
            };
            const res = await api.post('/api/dose/add', body);
            return String(res.data);
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Failed to add doses');
        }
    }
);

export interface EditDosePayload {
    id: number;
    name: string;
    dayOfWeek: DayOfWeek;
    localTime: string;
    doseInMilligram: number;
    MedicineId: number;
}

export const editDose = createAsyncThunk<string, EditDosePayload, { rejectValue: string }>(
    'doses/edit', async (payload, { rejectWithValue }) => {
        try {
            const body = {
                name: payload.name,
                dayOfWeek: payload.dayOfWeek,
                localTime: payload.localTime,
                doseInMilligram: payload.doseInMilligram,
                MedicineId: payload.MedicineId,
            };
            const res = await api.post(`/api/dose/edit/${payload.id}`, body);
            return String(res.data);
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Failed to edit dose');
        }
    }
);

export const deleteDose = createAsyncThunk<number, number, { rejectValue: string }>(
    'doses/delete', async (id, { rejectWithValue }) => {
        try {
            await api.delete(`/api/dose/delete/${id}`);
            return id;
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Failed to delete dose');
        }
    }
);

export const massDeleteDoses = createAsyncThunk<string, string, { rejectValue: string }>(
    'doses/massDelete', async (doseSimpleIdentifier, { rejectWithValue }) => {
        try {
            const res = await api.delete(`/api/dose/massdelete/${encodeURIComponent(doseSimpleIdentifier)}`);
            return String(res.data);
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Failed to delete doses');
        }
    }
);

export const deactivateDoses = createAsyncThunk<string, string, { rejectValue: string }>(
    'doses/deactivate', async (doseSimpleIdentifier, { rejectWithValue }) => {
        try {
            const res = await api.get(`/api/dose/deactivate/${encodeURIComponent(doseSimpleIdentifier)}`);
            return String(res.data);
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Failed to deactivate doses');
        }
    }
);

export const searchDoses = createAsyncThunk<BackendDose[], string, { rejectValue: string }>(
    'doses/search', async (term, { rejectWithValue }) => {
        try {
            const res = await api.get<BackendDose[]>(`/api/dose/search/${encodeURIComponent(term)}`);
            return res.data;
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Search failed');
        }
    }
);

type AddPatientDoseArg = { patientId: number; payload: AddDosePayload };

export const addPatientDose = createAsyncThunk<string, AddPatientDoseArg, { rejectValue: string }>(
    'doses/addForPatient',
    async (arg, thunkAPI) => {
        try {
            const p = arg.payload;
            const startDate = p.startDate ?? toDateString(new Date());
            const endDate = p.endDate ?? defaultEndDate(startDate);
            const body = {
                name: p.name,
                dayOfWeek: p.dayOfWeek,
                localTime: p.localTime,
                doseInMilligram: p.doseInMilligram,
                medicineId: p.medicineId,
                startDate,
                endDate,
                simpleDoseIdentifier: p.simpleDoseIdentifier,
            };
            const url = '/api/protected/patient/adddose/' + String(arg.patientId);
            const res = await api.post(url, body);
            return String(res.data);
        } catch (e: any) {
            return thunkAPI.rejectWithValue(e.response?.data ?? 'Failed to add dose for patient');
        }
    }
);

export const editPatientDose = createAsyncThunk<string, EditDosePayload, { rejectValue: string }>(
    'doses/editForPatient',
    async (payload, { rejectWithValue }) => {
        try {
            const body = {
                name: payload.name,
                dayOfWeek: payload.dayOfWeek,
                localTime: payload.localTime,
                doseInMilligram: payload.doseInMilligram,
                MedicineId: payload.MedicineId,
            };
            const res = await api.post(`/api/protected/patient/editdose/${payload.id}`, body);
            return String(res.data);
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Failed to edit patient dose');
        }
    }
);

const doseSlice = createSlice({
    name: 'doses',
    initialState,
    reducers: {
        clearDoseMessages: (s) => { s.error = null; s.successMessage = null; },
        resetDoses: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDoses.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(fetchDoses.fulfilled, (s, a) => { s.loading = false; s.doses = a.payload; })
            .addCase(fetchDoses.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? null; })

            .addCase(fetchActiveDoses.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(fetchActiveDoses.fulfilled, (s, a) => { s.loading = false; s.doses = a.payload; })
            .addCase(fetchActiveDoses.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? null; })

            .addCase(addDoses.pending, (s) => { s.loading = true; s.error = null; s.successMessage = null; })
            .addCase(addDoses.fulfilled, (s, a) => { s.loading = false; s.successMessage = a.payload; })
            .addCase(addDoses.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? null; })

            .addCase(editDose.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(editDose.fulfilled, (s, a) => { s.loading = false; s.successMessage = a.payload; })
            .addCase(editDose.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? null; })

            .addCase(deleteDose.fulfilled, (s, a) => {
                s.doses = s.doses.filter(d => d.id !== a.payload);
                s.successMessage = 'Dose deleted';
            })
            .addCase(deleteDose.rejected, (s, a) => { s.error = a.payload ?? null; })

            .addCase(massDeleteDoses.fulfilled, (s, a) => {
                s.doses = s.doses.filter(d => d.doseSimpleIdentifier !== a.meta.arg);
                s.successMessage = a.payload;
            })
            .addCase(massDeleteDoses.rejected, (s, a) => { s.error = a.payload ?? null; })

            .addCase(deactivateDoses.fulfilled, (s, a) => {
                s.doses = s.doses.map(d =>
                    d.doseSimpleIdentifier === a.meta.arg ? { ...d, isActive: false } : d
                );
                s.successMessage = a.payload;
            })
            .addCase(deactivateDoses.rejected, (s, a) => { s.error = a.payload ?? null; })

            .addCase(addPatientDose.pending, (s) => { s.loading = true; s.error = null; s.successMessage = null; })
            .addCase(addPatientDose.fulfilled, (s, a) => { s.loading = false; s.successMessage = a.payload; })
            .addCase(addPatientDose.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? null; })

            .addCase(editPatientDose.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(editPatientDose.fulfilled, (s, a) => { s.loading = false; s.successMessage = a.payload; })
            .addCase(editPatientDose.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? null; });
    },
});

export const { clearDoseMessages, resetDoses } = doseSlice.actions;
export default doseSlice.reducer;