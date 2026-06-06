import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api, { BackendDose, BackendPastDose } from '../services/api';

export interface FamilyMember {
    username: string;
    displayName: string;
    userId?: number;
    relationshipType?: string;
}

interface FamilyState {
    members: FamilyMember[];
    loading: boolean;
    error: string | null;
    successMessage: string | null;
    memberDoses: BackendDose[] | null;
    memberDosesLoading: boolean;
    memberPastDoses: BackendPastDose[] | null;
    memberPastDosesLoading: boolean;
    familyCode: string | null;
    familyCodeLoading: boolean;
    doctorCode: string | null;
    doctorCodeLoading: boolean;
}

const initialState: FamilyState = {
    members: [],
    loading: false,
    error: null,
    successMessage: null,
    memberDoses: null,
    memberDosesLoading: false,
    memberPastDoses: null,
    memberPastDosesLoading: false,
    familyCode: null,
    familyCodeLoading: false,
    doctorCode: null,
    doctorCodeLoading: false,
};

export const fetchFamilyCode = createAsyncThunk<string, void, { rejectValue: string }>(
    'family/fetchCode',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get<string>('/api/family/getfamilycode');
            return String(res.data);
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Failed to get family code');
        }
    }
);

export const refreshFamilyCode = createAsyncThunk<string, void, { rejectValue: string }>(
    'family/refreshCode',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get<string>('/api/family/refreshfamilycode');
            return String(res.data);
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Failed to refresh family code');
        }
    }
);

export const fetchDoctorCode = createAsyncThunk<string, void, { rejectValue: string }>(
    'family/fetchDoctorCode',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get<string>('/api/protected/patient/getdoctorcode');
            return String(res.data);
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Failed to get doctor code');
        }
    }
);

export const refreshDoctorCode = createAsyncThunk<string, void, { rejectValue: string }>(
    'family/refreshDoctorCode',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get<string>('/api/protected/patient/refreshdoctorcode');
            return String(res.data);
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Failed to refresh doctor code');
        }
    }
);

export const fetchFamilyMembers = createAsyncThunk<FamilyMember[], void, { rejectValue: string }>(
    'family/fetchMembers',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get('/api/family/checkfamily');
            if (res.status === 204 || !res.data) return [];

            const raw = Array.isArray(res.data) ? res.data : [];

            return raw.map((entry: any, index: number) => {
                const user =
                    entry?.relatedUser ??
                    entry?.user ??
                    entry;

                const username: string = user?.username ?? '';
                const rawName: string = user?.name ?? user?.username ?? `Member ${index + 1}`;
                const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
                const userId: number | undefined = user?.id ?? undefined;
                const relationshipType: string | undefined =
                    entry?.relationshipType?.name ?? undefined;

                return { username, displayName, userId, relationshipType };
            });
        } catch (e: any) {
            if (e.response?.status === 204) return [];
            return rejectWithValue(e.response?.data ?? 'Failed to fetch family members');
        }
    }
);

export const addFamilyMember = createAsyncThunk<
    FamilyMember,
    { username: string; familyCode: string; relationship: string },
    { rejectValue: string }
>(
    'family/add',
    async ({ username, familyCode, relationship }, { rejectWithValue }) => {
        try {
            const u = username.toLowerCase().trim();
            const c = familyCode.toUpperCase().trim();
            await api.post('/api/family/add', { username: u, familyCode: c, relationship });
            return { username: u, displayName: u, relationshipType: relationship };
        } catch (e: any) {
            return rejectWithValue(
                typeof e.response?.data === 'string'
                    ? e.response.data
                    : 'Failed to add family member. Check the username and code.'
            );
        }
    }
);

export const removeFamilyMember = createAsyncThunk<string, string, { rejectValue: string }>(
    'family/remove',
    async (username, { rejectWithValue }) => {
        try {
            await api.delete(`/api/family/remove/${encodeURIComponent(username.toLowerCase())}`);
            return username.toLowerCase();
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Failed to remove family member');
        }
    }
);

export const addDoctor = createAsyncThunk<
    void,
    { username: string; doctorCode: string },
    { rejectValue: string }
>(
    'family/addDoctor',
    async ({ username, doctorCode }, { rejectWithValue }) => {
        try {
            const u = username.toLowerCase().trim();
            const c = doctorCode.toUpperCase().trim();
            await api.get(`/api/family/add/doctor/${encodeURIComponent(u)}/${encodeURIComponent(c)}`);
        } catch (e: any) {
            return rejectWithValue(
                typeof e.response?.data === 'string'
                    ? e.response.data
                    : 'Failed to add doctor. Check the username and code.'
            );
        }
    }
);

export const checkFamilyDoses = createAsyncThunk<BackendDose[], string, { rejectValue: string }>(
    'family/checkDoses',
    async (username, { rejectWithValue }) => {
        try {
            const res = await api.get<BackendDose[]>(
                `/api/family/checkfamilydose/${encodeURIComponent(username.toLowerCase())}`
            );
            return Array.isArray(res.data) ? res.data : [];
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Failed to load family doses');
        }
    }
);

export const checkFamilyPastDoses = createAsyncThunk<BackendPastDose[], string, { rejectValue: string }>(
    'family/checkPastDoses',
    async (username, { rejectWithValue }) => {
        try {
            const res = await api.get<BackendPastDose[]>(
                `/api/family/checkpastdose/${encodeURIComponent(username.toLowerCase())}`
            );
            return Array.isArray(res.data) ? res.data : [];
        } catch (e: any) {
            return rejectWithValue(e.response?.data ?? 'Failed to load past doses');
        }
    }
);

const familySlice = createSlice({
    name: 'family',
    initialState,
    reducers: {
        clearFamilyMessages: (s) => { s.error = null; s.successMessage = null; },
        clearMemberDoses: (s) => {
            s.memberDoses = null;
            s.memberPastDoses = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchFamilyCode.pending, (s) => { s.familyCodeLoading = true; })
            .addCase(fetchFamilyCode.fulfilled, (s, a) => { s.familyCodeLoading = false; s.familyCode = a.payload; })
            .addCase(fetchFamilyCode.rejected, (s) => { s.familyCodeLoading = false; })

            .addCase(refreshFamilyCode.pending, (s) => { s.familyCodeLoading = true; })
            .addCase(refreshFamilyCode.fulfilled, (s, a) => { s.familyCodeLoading = false; s.familyCode = a.payload; })
            .addCase(refreshFamilyCode.rejected, (s) => { s.familyCodeLoading = false; })

            .addCase(fetchDoctorCode.pending, (s) => { s.doctorCodeLoading = true; })
            .addCase(fetchDoctorCode.fulfilled, (s, a) => { s.doctorCodeLoading = false; s.doctorCode = a.payload; })
            .addCase(fetchDoctorCode.rejected, (s) => { s.doctorCodeLoading = false; })

            .addCase(refreshDoctorCode.pending, (s) => { s.doctorCodeLoading = true; })
            .addCase(refreshDoctorCode.fulfilled, (s, a) => { s.doctorCodeLoading = false; s.doctorCode = a.payload; })
            .addCase(refreshDoctorCode.rejected, (s) => { s.doctorCodeLoading = false; })

            .addCase(fetchFamilyMembers.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(fetchFamilyMembers.fulfilled, (s, a) => { s.loading = false; s.members = a.payload; })
            .addCase(fetchFamilyMembers.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? null; })

            .addCase(addFamilyMember.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(addFamilyMember.fulfilled, (s, a) => {
                s.loading = false;
                if (!s.members.find(m => m.username === a.payload.username)) {
                    s.members.push(a.payload);
                }
                s.successMessage = 'Family member added';
            })
            .addCase(addFamilyMember.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? null; })

            .addCase(removeFamilyMember.fulfilled, (s, a) => {
                s.members = s.members.filter(m => m.username !== a.payload);
                s.successMessage = 'Member removed';
            })
            .addCase(removeFamilyMember.rejected, (s, a) => { s.error = a.payload ?? null; })

            .addCase(addDoctor.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(addDoctor.fulfilled, (s) => { s.loading = false; s.successMessage = 'Doctor added successfully'; })
            .addCase(addDoctor.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? null; })

            .addCase(checkFamilyDoses.pending, (s) => { s.memberDosesLoading = true; s.memberDoses = null; })
            .addCase(checkFamilyDoses.fulfilled, (s, a) => { s.memberDosesLoading = false; s.memberDoses = a.payload; })
            .addCase(checkFamilyDoses.rejected, (s, a) => { s.memberDosesLoading = false; s.error = a.payload ?? null; })

            .addCase(checkFamilyPastDoses.pending, (s) => { s.memberPastDosesLoading = true; s.memberPastDoses = null; })
            .addCase(checkFamilyPastDoses.fulfilled, (s, a) => { s.memberPastDosesLoading = false; s.memberPastDoses = a.payload; })
            .addCase(checkFamilyPastDoses.rejected, (s, a) => { s.memberPastDosesLoading = false; s.error = a.payload ?? null; });
    },
});

export const { clearFamilyMessages, clearMemberDoses } = familySlice.actions;
export default familySlice.reducer;